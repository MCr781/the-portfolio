/* ════════════════════════════════════════════════════════════════════════════
   Service Worker — طلاشو (Talasho)
   ────────────────────────────────────────────────────────────────────────────
   NOTE ON PLACEMENT:
   This file lives at the repo ROOT (not in /pwa/) because a service worker's
   default scope is the directory it's served from. /sw.js at root controls
   the entire site (scope '/'). Putting it in /pwa/sw.js would require the
   server to send `Service-Worker-Allowed: /` header on that path — which
   GitHub Pages and many static hosts do not. Root placement works everywhere
   with zero config.

   All OTHER PWA assets (manifest, sw-register.js, offline.html, icons) live
   under /pwa/. Only this one file is at root, for the scope reason above.

   ────────────────────────────────────────────────────────────────────────────
   Strategy (ported from tala repo's battle-tested pattern):
   • Navigation requests (HTML pages): network-first, fall back to cache, then
     offline page. Users see fresh UI when online, can still open the app offline.
   • Static assets (CSS/JS/fonts/icons/images): stale-while-revalidate. Fast
     from cache, refreshed in background.
   • Cross-origin requests: pass through to network (no caching).
   • On activate: clean up old cache versions.
   • On message 'SKIP_WAITING': skipWaiting so updates apply on next reload.
   ════════════════════════════════════════════════════════════════════════════ */

/* ⚠️ BACKEND TEAM: Bump this version string EVERY TIME you ship changes to any
   precached asset (CSS, JS, fonts, images, HTML). The SW uses it to detect
   that the cache is stale — on activate, all caches with a different version
   are deleted, which forces users to fetch the fresh assets on next load.
   If you forget to bump this, users will keep seeing the old cached version
   for up to 24h (Cache API has no TTL).
   Example bump: 'talasho-v1' → 'talasho-v2' → 'talasho-v3' ... */
const CACHE_VERSION = 'talasho-v28';
const OFFLINE_URL = '/pwa/offline.html';

/* Critical assets to pre-cache during install so the app shell + offline page
   work even on first offline visit. List mirrors talasho's actual asset tree.
   Phase H: updated with all new pages from Phases B-G. */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/wallet/index.html',           /* PWA start_url — wallet/milli-gold landing */
  '/wallet/rates.html',           /* Phase B: نرخ‌نامه */
  '/wallet/login.html',           /* Phase C: unified auth */
  '/wallet/profile.html',         /* Phase D: user profile + Gold Box */
  '/products.html',               /* Phase E: product archive */
  '/cart.html',                   /* Phase I: cart */
  '/checkout.html',               /* Phase I: checkout */
  '/checkout-result.html',        /* Phase I: payment result */
  '/product/tear-tennis-gold-ring.html', /* Phase E: sample product detail */
  '/blog.html',                   /* Phase F: blog archive */
  '/blog/gold-investment-for-beginners.html', /* Phase F: sample blog post */
  '/about.html',                  /* Phase G: about */
  '/contact.html',                /* Phase G: contact */
  '/terms.html',                  /* Phase G: terms */
  OFFLINE_URL,
  '/pwa/manifest.webmanifest',
  '/pwa/js/sw-register.js',
  /* Compiled Tailwind output + Swiper (local, no CDN) */
  '/assets/css/style.css',
  '/assets/vendor/swiper-bundle.min.css',
  /* Page behaviour scripts */
  '/assets/js/main.js',
  '/assets/js/price-board.js',
  '/assets/js/countdown.js',
  '/assets/js/product-icons.js',
  '/assets/js/vendor/swiper-bundle.min.js',
  /* Vazirmatn fonts — Persian-digit (FD) is the default body font */
  '/assets/fonts/Vazirmatn-FD-Regular.woff2',
  '/assets/fonts/Vazirmatn-FD-Bold.woff2',
  '/assets/fonts/Vazirmatn-FD-Medium.woff2',
  '/assets/fonts/Vazirmatn-Regular.woff2',
  '/assets/fonts/Vazirmatn-Bold.woff2',
  '/assets/fonts/Vazirmatn-Medium.woff2',
  /* Brand logos used by the page */
  '/assets/images/White-Logo.png',
  '/assets/images/Purple-Logo.png',
  /* PWA icons (so install + offline page render correctly) */
  '/pwa/icons/icon-192.png',
  '/pwa/icons/icon-512.png',
  '/pwa/icons/apple-touch-icon.png',
  '/pwa/icons/favicon.ico'
];

/* ── Install: pre-cache critical assets ── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) {
        // addAll fails atomically if any single request fails; use individual
        // puts so a missing optional asset doesn't break install.
        return Promise.all(
          PRECACHE_URLS.map(function (url) {
            return cache.add(url).catch(function (err) {
              console.warn('[SW] precache miss:', url, err.message);
            });
          })
        );
      })
      .then(function () {
        // Take over immediately so the SW activates on this load.
        return self.skipWaiting();
      })
  );
});

/* ── Activate: clean old caches + claim clients ── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) { return k !== CACHE_VERSION; })
            .map(function (k) {
              console.log('[SW] deleting old cache:', k);
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

/* ── Fetch: route by request type ── */
self.addEventListener('fetch', function (event) {
  const req = event.request;

  // Only handle GET; let the browser handle POST/PUT/etc.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin: pass through, don't cache.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation (HTML page request): network-first → cache → offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          // Clone & cache the fresh page.
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(req, clone).catch(function () {});
          });
          return res;
        })
        .catch(function () {
          // Network failed — try cache, then offline page.
          return caches.match(req).then(function (cached) {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then(function (cached) {
      const networkFetch = fetch(req)
        .then(function (res) {
          // Only cache successful, same-origin, basic responses.
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(function (cache) {
              cache.put(req, clone).catch(function () {});
            });
          }
          return res;
        })
        .catch(function () {
          // Network failed — if no cache either, return nothing (browser will
          // show its own error for the asset).
          return cached;
        });

      // Return cached immediately if available, otherwise wait for network.
      return cached || networkFetch;
    })
  );
});

/* ── Message handler: allow page to trigger skipWaiting ── */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
