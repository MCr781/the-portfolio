# Talasho PWA — Backend Team Notes

**Critical integration points the backend team must know about.**
Read this before deploying changes to the PWA layer.

---

## 1. Bump `CACHE_VERSION` in `/sw.js` on every asset change

Location: `/sw.js`, line ~33

```js
const CACHE_VERSION = 'talasho-v1';
```

**Rule:** Every time you ship a change to ANY precached asset (CSS, JS, fonts, images, HTML, icons), bump this string. Example: `'talasho-v1'` → `'talasho-v2'`.

**Why:** The service worker uses this string as the cache key. On `activate`, all caches whose name does NOT match the current `CACHE_VERSION` are deleted. If you forget to bump, users will keep seeing the old cached version of your assets for up to 24 hours (the Cache API has no built-in TTL).

**How to verify:** After deploying, open Chrome DevTools → Application → Cache Storage. You should see a single cache named `talasho-v<N>` matching your bumped version. Old caches should be gone within one page reload.

---

## 2. Update `PRECACHE_URLS` in `/sw.js` when adding critical assets

Location: `/sw.js`, lines ~38–63

This array lists the assets that get pre-cached during SW `install` so the app shell + offline page work on first offline visit. If you add a new critical asset to the page (e.g., a new hero image, a new font weight, a new JS module that the offline page depends on), add its URL to this list.

**Non-critical assets** (e.g., product images, blog thumbnails) do NOT need to be in this list — they will be cached on-demand by the `stale-while-revalidate` strategy the first time they're requested.

**Failure mode if you skip this:** A user who installs the PWA and immediately goes offline won't see the new asset. They'll see it after going online once.

---

## 3. Manifest `shortcuts` URLs point to the wallet app

Location: `/pwa/manifest.webmanifest`, `shortcuts` array (lines ~54–91)

The 4 app shortcuts point to the wallet app (Phase 2):
- `/wallet/index.html?action=buy` — خرید طلا
- `/wallet/index.html?action=sell` — فروش طلا
- `/wallet/index.html#gold-rates` — نرخ طلا (scrolls to price board section)
- `/wallet/index.html#wallet` — کیف پول (scrolls to wallet section, if present)

**Action required:** When the wallet app grows beyond a homepage (Phase 3+), the `?action=buy` and `?action=sell` query params should trigger the buy/sell UI on the wallet page. For now (Phase 2), the wallet homepage is a public landing page — these shortcuts just open the homepage. The `#gold-rates` anchor DOES exist on the wallet homepage (the live price board section has `id="gold-rates"`).

If you change the shortcut URLs, also bump `CACHE_VERSION` (see #1 above) so the new manifest is fetched.

---

## 4. `theme_color` is hardcoded in two places — keep them in sync

- `/pwa/manifest.webmanifest` → `"theme_color": "#4A154B"`
- `/index.html` (existing) → `<meta name="theme-color" content="#4A154B">`
- `/pwa/offline.html` → `<meta name="theme-color" content="#4A154B">`

If you ever rebrand (e.g., to milli.gold's deepOcean teal), update all three. The Android address bar tint and the iOS status bar style both read from this value.

---

## 5. `start_url` points to the wallet app, `scope` is site root

- `"start_url": "/wallet/index.html"` ← Phase 2: changed from `/index.html`
- `"scope": "/"`

The PWA, when installed, opens the **wallet app** at `/wallet/index.html` (the milli.gold-style gold investment landing page). The scope stays `/` so the SW can control both the wallet app AND the main storefront at `/index.html` — users can navigate between them within the installed PWA.

If you ever move the wallet app (e.g., to `/app/`), update `start_url` accordingly.

---

## 6. The service worker file MUST live at `/sw.js` (root)

Do NOT move `/sw.js` into `/pwa/` without also configuring your server to send the `Service-Worker-Allowed: /` response header on that path. A service worker's default scope is the directory it's served from — `/pwa/sw.js` would only control `/pwa/*`, not the whole site. GitHub Pages and most static hosts do not allow custom headers, which is why we placed `sw.js` at root.

If you're on a host that DOES allow custom headers (Netlify, Vercel, nginx), you may move `sw.js` to `/pwa/sw.js` and add this header:
```
Service-Worker-Allowed: /
```
Then update `sw-register.js` line ~23 to point to `/pwa/sw.js`.

---

## 7. Offline page is fully self-contained

`/pwa/offline.html` has all CSS inline and uses Vazirmatn-FD fonts loaded from `/assets/fonts/` (which the SW precaches). It will render correctly even on a hard offline first-visit. The only external dependency is `/assets/images/White-Logo.png` — also precached.

If you change the brand logo, update both:
- `<img src="/assets/images/White-Logo.png">` in `/pwa/offline.html` (line ~285)
- The precache entry in `/sw.js` (already covers both `White-Logo.png` and `Purple-Logo.png`)

---

## 8. SW registration is deferred to `window.load`

`/pwa/js/sw-register.js` registers the SW only after the page's `load` event fires. This is intentional — it ensures SW registration never competes with first paint. Do not change this to register earlier; you'll hurt first-paint performance.

---

## 9. Tailwind config now scans `/pwa/**/*.html`

**File:** `tailwind.config.js` (line ~10 — added `"./pwa/**/*.html"` to `content` array)

This was added so PWA HTML files can use Tailwind utility classes (e.g., `bg-primary-500`, `text-gold-500`, `rounded-xl`). Before this change, only classes used in `index.html` and `assets/js/**/*.js` were emitted into `assets/css/style.css`.

**Important:** Whenever you add or modify a Tailwind class in any `/pwa/*.html` file, you MUST recompile the stylesheet:

```bash
npm run build:css
```

Then bump `CACHE_VERSION` in `/sw.js` (see note #1) because `assets/css/style.css` changed.

**Why this doesn't affect the main site:** Tailwind only *adds* classes to the compiled CSS when it scans more files — it never removes classes that are already in use. The existing `index.html` will render identically before and after this change. Verified: `style.css` grew from 70,062 → 70,348 bytes (+286 bytes for the extra utility classes the offline page uses).

---

## 10. Offline page uses relative paths (consistent with main site)

All asset references in `/pwa/offline.html` are relative paths:
- `../assets/css/style.css` — main stylesheet
- `../assets/fonts/Vazirmatn-FD-*.woff2` — fonts
- `../assets/images/White-Logo.png` — hero logo
- `./manifest.webmanifest` — PWA manifest
- `./icons/*` — PWA icons

This matches the existing talasho convention (`./assets/...` in `index.html`) and works with both `file://` and HTTP protocols. **Caveat:** if the SW serves the offline page in response to a failed navigation to a deep URL (e.g., `/products/category/foo.html`), the relative paths would resolve from that deep URL. In practice this is a non-issue because:
- The SW uses network-first for navigations, so the actual page HTML gets cached on first online visit.
- The offline fallback only triggers when the user tries to visit a URL they've NEVER visited before AND they're offline.
- The current talasho site has no deep URLs (everything is at `/index.html`).

If/when deep URLs are added, consider switching the offline page to root-relative paths (`/assets/...`) for bulletproof behavior.

---

## 11. Wallet app at `/wallet/` (Phase 2)

A new wallet app lives at `/wallet/index.html` — a milli.gold-style gold investment landing page. Key points for the backend team:

**Front-end only:** All CTAs are visual placeholders. The ورود/عضویت button, خرید طلا / فروش طلا buttons, and form inputs have `data-backend-hook` attributes that the backend team should wire up. Search the HTML for `data-backend-hook=` to find all integration points.

**Live price board:** Uses the existing `/assets/js/price-board.js` with a mock random-walk (updates every 5s with small random changes). To wire real prices, call:
```js
window.TALASHO.updatePrices([
  { name: 'طلای ۱۸ عیار (گرم)', current: 4400000, prev: 4350000 },
  { name: 'دلار آزاد',          current: 60000,   prev: 59800 },
  // ... match by data-price-name attribute
]);
```
Then delete the `setInterval(...)` mock block at the bottom of the inline script on `/wallet/index.html`.

**Tailwind content array:** `/wallet/**/*.html` was added to `tailwind.config.js` so utility classes used in wallet HTML get emitted into `style.css`. Recompile with `npm run build:css` after any class change.

**PWA start_url:** The manifest now points to `/wallet/index.html` — when users install the PWA, it opens the wallet app, not the storefront.

**Navigation between storefront and wallet:** Both `/index.html` (storefront) and `/wallet/index.html` (wallet) are within the SW's scope `/`. Users can navigate between them via links. The wallet header has a link to the storefront, and the storefront (Phase 3+) will have a link to the wallet.

---

## TL;DR for backend

| When you... | You must... |
|---|---|
| Ship any change to CSS/JS/fonts/images/HTML/icons | Bump `CACHE_VERSION` in `/sw.js` |
| Add a new critical asset to the page | Add its URL to `PRECACHE_URLS` in `/sw.js` |
| Wire real auth/buy/sell on the wallet app | Search `/wallet/index.html` for `data-backend-hook=` attributes |
| Wire real gold prices on the wallet app | Call `window.TALASHO.updatePrices([...])` and delete the mock setInterval |
| Rebrand (change theme color) | Update `theme_color` in manifest + `<meta name="theme-color">` in index.html + offline.html |
| Move `sw.js` to a different path | Read note #6 above carefully |
| **Add or change a Tailwind class in any `/pwa/*.html` or `/wallet/*.html`** | **Run `npm run build:css` then bump `CACHE_VERSION`** |
