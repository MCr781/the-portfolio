/* ════════════════════════════════════════════════════════════════════════════
   sw-register.js — Talasho Service Worker registration helper
   ────────────────────────────────────────────────────────────────────────────
   Lives at /pwa/js/sw-register.js (not at root) because its location doesn't
   affect SW scope — only the SW file's location does. The SW itself lives at
   /sw.js (root) for the scope reason documented in sw.js.

   Loaded as a regular script (not module) on every page that wants PWA
   behaviour. Registers /sw.js, listens for updates, and triggers reload when
   a new SW takes over.

   Pattern ported verbatim from tala repo's js/sw-register.js.
   ════════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Wait for window load so SW registration never competes with first paint.
  window.addEventListener('load', function () {
    // SW lives at site root (/sw.js) so it can control scope '/'.
    var swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl, { scope: '/' })
      .then(function (registration) {
        // Update found: a new SW is being installed.
        registration.addEventListener('updatefound', function () {
          var installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', function () {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New SW installed & waiting → tell it to skip waiting so the
                // user gets the new version on next reload. We also nudge the
                // user with a soft reload (no auto-reload to avoid losing form
                // state).
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
                console.log('[PWA] New version available — will activate on next reload.');
              } else {
                // First install: SW now controls the page.
                console.log('[PWA] App is ready for offline use.');
              }
            }
          });
        });
      })
      .catch(function (err) {
        console.warn('[PWA] SW registration failed:', err);
      });

    // When a new controller takes over (after skipWaiting), reload once so the
    // user gets the new HTML/CSS/JS.
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });

  // ── Capture install prompt for later use ──
  // We don't show a custom install button in Step 1, but we stash the event
  // so future steps can surface an "Add to Home Screen" CTA.
  window.__deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__deferredInstallPrompt = e;
    document.dispatchEvent(new CustomEvent('pwa:installable'));
  });

  window.addEventListener('appinstalled', function () {
    window.__deferredInstallPrompt = null;
    console.log('[PWA] App installed.');
  });
})();
