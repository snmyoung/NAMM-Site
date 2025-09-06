/* =========================================================
   NAMM POP-UP — site.js (Vanilla JS)
   Author: Nicole + Alex
   Purpose: Shared behavior for all pages

   CONTENTS (search for SECTION headings):
     0) CONFIG & HELPERS
     1) BOOT / DOM READY
     2) NAVBAR: active link, collapse on click
     3) ACCESSIBILITY: skip link, focus management
     4) SMOOTH SCROLL: anchors + reduced motion support
     5) FORMS: validation, honeypot, Formspree AJAX, Netlify default
     6) IMAGES: lazy loading + logo fallback
     7) UTILITIES: footer year, back-to-top (optional), small helpers
========================================================= */


/* ================================
   0) CONFIG & HELPERS
   - small switches + utility functions
=================================== */

// ---- CONFIG SWITCHES (safe defaults) ----
const CONFIG = {
  enableBackToTop: true,     // floating button after scroll
  smoothScrollOffsetPx: 80,  // offset for sticky navbar height
  ajaxFormspree: true,       // do AJAX submit for Formspree forms (no page reload)
  rememberNameEmail: false,  // save name/email in localStorage (off by default)
  fadeInImages: true         // fade-in when images enter viewport
};

// ---- Reduced motion: respect user preference ----
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Query helpers ----
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---- Smooth scroll to an element (with navbar offset) ----
function smoothScrollTo(target) {
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const absoluteTop = window.pageYOffset + rect.top;
  const offset = CONFIG.smoothScrollOffsetPx || 0;
  const top = Math.max(absoluteTop - offset, 0);

  if (prefersReducedMotion) {
    window.scrollTo(0, top);
  } else {
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

// ---- Create an element with classes ----
function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text) n.textContent = text;
  return n;
}


/* ================================
   1) BOOT / DOM READY
   - run once DOM is loaded
=================================== */
document.addEventListener('DOMContentLoaded', () => {
  // (A) Footer year
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // (B) Navbar behavior
  initNavbarActiveLink();
  initNavbarCollapseOnClick();

  // (C) Accessibility helpers
  initSkipLinkFocus();

  // (D) Smooth scrolling for in-page anchors
  initAnchorSmoothScroll();

  // (E) Forms
  initFormValidation();      // Bootstrap validation + honeypot
  initFormspreeAjax();       // AJAX for Formspree (if enabled)

  // (F) Images
  initLazyImages();
  initLogoFallbacks();

  // (G) Optional utilities
  if (CONFIG.enableBackToTop) initBackToTop();
});


/* ================================
   2) NAVBAR
   - highlight current page
   - collapse mobile menu when a link is clicked
=================================== */

// Mark the current page link as active (based on filename)
function initNavbarActiveLink() {
  const path = window.location.pathname;
  const file = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  // nav links may appear in multiple pages; match by href ending
  $$('.navbar .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    // treat index.html and '' as same
    const filename = href.substring(href.lastIndexOf('/') + 1) || 'index.html';
    if (filename === file) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

// Collapse the mobile menu when a nav link is tapped/clicked
function initNavbarCollapseOnClick() {
  const collapseEl = $('#nav'); // .navbar-collapse id="nav"
  if (!collapseEl) return;

  // Bootstrap 5 Collapse helper (available because Bootstrap bundle is loaded)
  const getCollapse = () => {
    // create or get existing instance
    return bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
  };

  $$('.navbar .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (collapseEl.classList.contains('show')) {
        getCollapse().hide();
      }
    });
  });
}


/* ================================
   3) ACCESSIBILITY
   - Skip link should move focus into main content
=================================== */

function initSkipLinkFocus() {
  const skip = $('.skip-link');
  const main = $('#main') || $('main');
  if (!skip || !main) return;

  skip.addEventListener('click', (e) => {
    // Allow default jump, then set focus to main heading or main itself
    setTimeout(() => {
      // Prefer the first heading inside main
      const firstHeading = $('h1, h2, [role="heading"]', main) || main;
      firstHeading.setAttribute('tabindex', '-1');
      firstHeading.focus({ preventScroll: true });
      // Optionally remove tabindex after focus
      setTimeout(() => firstHeading.removeAttribute('tabindex'), 1000);
    }, 0);
  });
}


/* ================================
   4) SMOOTH SCROLL
   - For #hash links (like #committee)
=================================== */

function initAnchorSmoothScroll() {
  // Click handler for in-page anchors
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      // ignore just "#" (no target)
      if (!hash || hash === '#') return;

      const target = document.getElementById(hash.slice(1));
      if (target) {
        e.preventDefault();
        smoothScrollTo(target);
        // Update URL without jumping
        history.pushState(null, '', hash);
      }
    });
  });

  // If the page loads with a hash (direct link), scroll to it with offset
  if (window.location.hash) {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) {
      // small delay to allow layout to settle
      setTimeout(() => smoothScrollTo(target), 50);
    }
  }
}


/* ================================
   5) FORMS
   - Validation (Bootstrap)
   - Honeypot block
   - Formspree AJAX (optional)
   - Netlify: let browser submit normally
=================================== */

// Add Bootstrap validation (prevents submit if invalid)
function initFormValidation() {
  const forms = $$('.needs-validation');
  forms.forEach(form => {
    form.addEventListener('submit', (evt) => {
      // Honeypot trap: if a hidden "bot-field" has content, stop.
      const bot = form.querySelector('input[name="bot-field"]');
      if (bot && bot.value.trim() !== '') {
        evt.preventDefault();
        evt.stopPropagation();
        return;
      }

      if (!form.checkValidity()) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
}

// Intercept Formspree forms and submit via fetch (to stay on the page)
function initFormspreeAjax() {
  if (!CONFIG.ajaxFormspree) return;

  // Target forms that have Formspree action
  const formspreeForms = $$('form[action*="formspree.io"]');
  formspreeForms.forEach(form => {
    form.addEventListener('submit', async (evt) => {
      // Respect our validation: if invalid, let validation handler block it
      if (!form.checkValidity()) return;

      // If valid, do AJAX instead of full page reload
      evt.preventDefault();

      // Find/Make a status area under the form
      let status = form.nextElementSibling;
      if (!status || !status.classList || !status.classList.contains('form-status')) {
        status = el('div', 'form-status mt-2');
        form.parentNode.insertBefore(status, form.nextSibling);
      }

      // Submit button UX: disable during submit
      const submitBtn = form.querySelector('button[type="submit"], .btn[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Sending…';
      }

      try {
        const data = new FormData(form);
        // Optional remember fields
        if (CONFIG.rememberNameEmail) {
          const name = data.get('name') || data.get('vendor-name') || data.get('volunteer-name');
          const email = data.get('email') || data.get('volunteer-email');
          if (name)  localStorage.setItem('namm_name', name);
          if (email) localStorage.setItem('namm_email', email);
        }

        const res = await fetch(form.action, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          status.innerHTML = '<div class="alert alert-success mt-2" role="status"><i class="fa-solid fa-circle-check me-2"></i>Thanks! Your submission was received.</div>';
          form.reset();
          form.classList.remove('was-validated');
        } else {
          status.innerHTML = '<div class="alert alert-danger mt-2" role="status"><i class="fa-solid fa-triangle-exclamation me-2"></i>Sorry, something went wrong. Please try again.</div>';
        }
      } catch (err) {
        status.innerHTML = '<div class="alert alert-danger mt-2" role="status"><i class="fa-solid fa-plug-circle-xmark me-2"></i>Network error. Please try again.</div>';
      } finally {
        if (submitBtn && origText) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      }
    });
  });

  // Optional prefill from localStorage
  if (CONFIG.rememberNameEmail) {
    const namePref = localStorage.getItem('namm_name');
    const emailPref = localStorage.getItem('namm_email');
    if (namePref)  $$('input[name="name"], input[name="vendor-name"], input[name="volunteer-name"]').forEach(i => i.value ||= namePref);
    if (emailPref) $$('input[name="email"], input[name="volunteer-email"]').forEach(i => i.value ||= emailPref);
  }
}


/* ================================
   6) IMAGES
   - Lazy loading + fade-in
   - Committee/Vendor logo fallback
=================================== */

function initLazyImages() {
  // Add loading="lazy" to normal images (hero/logo above the fold can stay eager)
  $$('img').forEach(img => {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
  });

  if (!CONFIG.fadeInImages || prefersReducedMotion) return;

  // Fade-in images as they appear
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('img-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { rootMargin: '100px' })
    : null;

  if (observer) {
    $$('img').forEach(img => {
      img.classList.add('img-hidden'); // start hidden; CSS can fade to visible
      observer.observe(img);
    });
  }
}

function initLogoFallbacks() {
  // If a logo image fails, swap to a placeholder
  const placeholder = 'images/placeholder-logo.png';
  $$('img').forEach(img => {
    img.addEventListener('error', () => {
      if (img.dataset.fallbackApplied) return; // avoid loops
      img.dataset.fallbackApplied = '1';
      img.src = placeholder;
      img.alt = (img.alt || 'Logo') + ' (placeholder)';
    });
  });
}


/* ================================
   7) UTILITIES
   - Back to top button (optional)
   - (room for future utilities)
=================================== */

function initBackToTop() {
  // create floating button
  const btn = el('button', 'back-to-top', '↑');
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', 'Back to top');

  // minimal inline style so it works even without extra CSS
  Object.assign(btn.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    width: '44px',
    height: '44px',
    borderRadius: '999px',
    border: '2px solid #D4AF37',
    background: '#0b1f1f',
    color: '#fff',
    fontWeight: '900',
    boxShadow: '0 8px 20px rgba(0,0,0,.35)',
    cursor: 'pointer',
    opacity: '0',
    visibility: 'hidden',
    transition: prefersReducedMotion ? 'none' : 'opacity .2s ease, visibility .2s ease',
    zIndex: '999'
  });

  document.body.appendChild(btn);

  const show = () => { btn.style.opacity = '1'; btn.style.visibility = 'visible'; };
  const hide = () => { btn.style.opacity = '0'; btn.style.visibility = 'hidden'; };

  const onScroll = () => {
    if (window.pageYOffset > 400) show(); else hide();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  btn.addEventListener('click', () => {
    if (prefersReducedMotion) window.scrollTo(0, 0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ===== End of site.js ===== */
