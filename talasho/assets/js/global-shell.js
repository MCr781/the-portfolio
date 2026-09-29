(function () {
  'use strict';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  onReady(function () {
    var toggle = document.getElementById('globalMobileMenuToggle');
    var close = document.getElementById('globalMobileMenuClose');
    var menu = document.getElementById('globalMobileMenu');
    var overlay = document.getElementById('globalMobileMenuOverlay');

    function openMenu() {
      if (!menu || !overlay) return;
      menu.classList.remove('translate-x-full', 'rtl:translate-x-full');
      menu.classList.add('translate-x-0');
      overlay.classList.remove('hidden', 'opacity-0');
      overlay.classList.add('opacity-100');
      menu.setAttribute('aria-hidden', 'false');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      if (!menu || !overlay) return;
      menu.classList.add('translate-x-full', 'rtl:translate-x-full');
      menu.classList.remove('translate-x-0');
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      menu.setAttribute('aria-hidden', 'true');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      window.setTimeout(function () {
        overlay.classList.add('hidden');
      }, 300);
      document.body.style.overflow = '';
    }

    if (toggle) toggle.addEventListener('click', openMenu);
    if (close) close.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    // Any element (e.g. the Categories tab in the shared bottom nav) can open
    // the same mobile drawer.
    document
      .querySelectorAll('.js-open-mobile-menu')
      .forEach(function (btn) {
        btn.addEventListener('click', openMenu);
      });

    // Highlight the active tab of the shared bottom nav from the current URL.
    // Resolving each link against the document base (link.pathname) keeps the
    // comparison correct for pages in subdirectories and on any host scheme.
    function stripIndex(path) {
      return path.replace(/\/index\.html$/, '').replace(/\/+$/, '');
    }
    var current = stripIndex(window.location.pathname);
    document
      .querySelectorAll('.bottom-nav a[href]')
      .forEach(function (link) {
        if (stripIndex(link.pathname) === current) {
          link.classList.add('text-primary-600');
          link.classList.remove('text-content-muted');
        }
      });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });
  });
})();
