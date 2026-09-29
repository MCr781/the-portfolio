# Talasho PWA — Phase 1-B (v1)

**Version:** phase-1b-v1
**Date:** 2026-07-19
**Scope:** PWA foundation — icons + manifest + service worker + offline page.
**Status:** Ready to wire into `index.html` (Part 1-C, pending).

---

## What's in this zip

```
/sw.js                          ← service worker (root, for scope '/')
/pwa/
  manifest.webmanifest          ← app identity, icons, shortcuts
  offline.html                  ← offline fallback page
  BACKEND_NOTES.md              ← critical integration notes for backend team
  icons/
    icon-192.png                ← standard, transparent bg, Purple-Logo
    icon-512.png                ← standard, transparent bg, Purple-Logo
    icon-maskable-192.png       ← maskable, solid #4A154B, White-Logo
    icon-maskable-512.png       ← maskable, solid #4A154B, White-Logo
    apple-touch-icon.png        ← iOS, white rounded square, Purple-Logo
    favicon-32.png              ← browser tab icon
    favicon-16.png              ← browser tab icon (small)
    favicon.ico                 ← multi-resolution (16/32/48)
  js/
    sw-register.js              ← registers /sw.js, handles updates
```

## How to install (in your local talasho repo)

1. Extract this zip **at the repo root** so the paths line up:
   ```bash
   cd /path/to/talasho
   unzip talasho-pwa-phase-1b-v1.zip
   ```
   After extraction you should see `/sw.js` and `/pwa/` next to your existing `index.html`.

2. The PWA is **not yet wired in** — `index.html` is unchanged. Part 1-C (next phase) will add the `<link rel="manifest">`, `<meta name="theme-color">`, apple meta tags, icon links, and `<script src="/pwa/js/sw-register.js">` to the `<head>` of `index.html`. Zero body changes.

3. To preview the offline page standalone (before 1-C lands):
   ```bash
   cd talasho
   python3 -m http.server 8080
   # then open http://localhost:8080/pwa/offline.html
   ```

4. To verify the SW works (after 1-C lands):
   - Open Chrome DevTools → Application → Service Workers
   - You should see `sw.js` registered with scope `/`
   - Toggle "Offline" in DevTools → Network, then reload → offline page appears

## What's pending (Part 1-C)

The only remaining step to make the PWA fully active is wiring it into `index.html`'s `<head>`:
- `<link rel="manifest" href="/pwa/manifest.webmanifest">`
- `<meta name="theme-color" content="#4A154B">` (already present, will be kept)
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- `<meta name="apple-mobile-web-app-title" content="طلاشو">`
- `<link rel="icon" type="image/x-icon" href="/pwa/icons/favicon.ico">`
- `<link rel="icon" type="image/png" sizes="32x32" href="/pwa/icons/favicon-32.png">`
- `<link rel="icon" type="image/png" sizes="16x16" href="/pwa/icons/favicon-16.png">`
- `<link rel="apple-touch-icon" href="/pwa/icons/apple-touch-icon.png">`
- `<script src="/pwa/js/sw-register.js"></script>`

No `<body>` changes. A diff will be provided to prove it.

## See also

- `BACKEND_NOTES.md` in `/pwa/` — critical integration notes for the backend team
- Worklog at `/home/z/my-project/worklog.md` — full build history
