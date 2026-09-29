/* ════════════════════════════════════════════════════════════════════════════
   Service Worker — قلک طلای اردیبهشت
   ────────────────────────────────────────────────────────────────────────────
   Strategy:
   • Navigation requests (HTML pages): network-first, fall back to cache, then
     offline page. This ensures users always see fresh UI when online, but can
     still open the app offline.
   • Static assets (CSS/JS/fonts/icons/images): stale-while-revalidate. Fast
     from cache, refreshed in background.
   • Cross-origin requests: pass through to network (no caching).
   • On activate: clean up old cache versions.
   • On message 'SKIP_WAITING': skipWaiting so updates apply on next reload.
   ════════════════════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'ordibehesht-gold-v6';
const OFFLINE_URL = '/offline.html';

/* Critical assets to pre-cache during install so the app shell + offline page
   work even on first offline visit. */
const PRECACHE_URLS = [
  '/',
  '/index.htm',
  '/gold/index.html',
  '/gold/buy.html',
  '/gold/sell.html',
  '/gold/transactions.html',
  '/gold/rates.html',
  '/gold/withdraw.html',
  '/gold/bank-account.html',
  '/gold/physical.html',
  '/gold/missions.html',
  '/gold/invite.html',
  '/gold/vaults.html',
  '/gold/login.html',
  '/gold/otp.html',
  '/gold/register.html',
  '/gold/setup-success.html',
  '/gold/receipt.html',
  '/gold/payment-result.html',
  '/gold/profile.html',
  OFFLINE_URL,
  '/css/style.css',
  '/css/gold-trading.css',
  '/css/auth.css',
  '/css/vendor/boxicons.min.css',
  '/js/script.js',
  '/js/gold-trading.js',
  '/js/auth.js',
  '/js/sw-register.js',
  '/lib/jquery/jquery.min.js',
  '/lib/htmx/htmx.min.js',
  '/fonts/PeydaWeb-Regular.woff',
  '/fonts/PeydaWeb-Bold.woff',
  '/fonts/boxicons.woff2',
  '/fonts/boxicons.woff',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/brand-mark.svg',
  '/icons/brand-logo.svg'
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
