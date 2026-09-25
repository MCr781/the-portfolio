# AGENT.md — Operating Handbook for AI Agents

This folder is the complete, self-contained source of **the-portfolio** — a Persian (RTL)
retro-arcade portfolio site. It is **100% static**: no build step, no framework code, no
dependencies to install. Everything that makes the site what it is lives in this folder.

## What you are working with

| Path | Role |
|---|---|
| `index.html` | The whole page. RTL (`dir="rtl" lang="fa"`). One page, no router. |
| `assets/main.js` | The ENTIRE game engine + site behavior in vanilla JS (classic deferred `<script>`, no modules/imports/bundler). HTML5 canvas arcade game lives here. |
| `assets/styles.css` | All styling. Monochrome arcade palette via CSS vars: `--ink #0c0c11`, `--shell-line/text #f2f2f7`, `--shell-muted #8a8a99`. No CSS framework. |
| `assets/fonts/` | `Estedad-VF.woff2` (Persian) + `SpaceMono-*.woff2` (latin / `.mono` UI text). |
| `assets/*.jpg|webp` | Artwork (cartridges, hero, backgrounds). `.webp` variants are the modern swap-ins. |
| `talasho/ ordibehesht/ razan/ yassi/` | Four standalone Persian article pages. |
| `stuff/`, `robots.txt`, `favicon.svg`, `logo.svg` | Support files. |
| `the-portfolio-site.zip` | A snapshot archive of this site (linked by the footer button). |

The footer contains a `▾ DOWNLOAD SITE · ZIP · 7.2MB` button (`.foot-dl` in `index.html`)
linking to `the-portfolio-site.zip`. If you deploy without shipping the zip, remove that
single anchor. When re-zipping, build the archive from the folder's contents and place it
in afterwards — never nest the zip inside itself.

## Conventions you MUST respect

1. **Cache busting**: `index.html` references `assets/styles.css?v=mmNNNN` and
   `assets/main.js?v=mmNNNN`. Whenever you edit `styles.css` or `main.js`, bump **every**
   `mmNNNN` in `index.html` (e.g. `sed -i 's/mm2413/mm2414/g' index.html`). Ship stale
   caches and users see old assets.
2. **RTL discipline**: the document is RTL Persian. Latin/technical strings use
   `class="mono"` + `dir="ltr"`. Keep that separation when adding UI copy.
3. **Debug surface**: with `#fwdebug` in the URL, `main.js` exposes
   `window.__fw.world()` (full world-state snapshot) and `window.__fw.reset()`.
   Use these for instrumentation instead of hacking the game loop blind.
4. **Game state** lives in `localStorage` under `fw-` prefixed keys (e.g. `fw-credits`).
   Clean up any test keys you create.

## How to run / test

Any static file server works — from this folder:

```bash
python3 -m http.server 8000     # or: npx serve .
```

Then open `http://localhost:8000/`. Always test over HTTP, not `file://`.
The game boots into an attract show; pressing **x** skips it, coin/Enter starts WORLD 01.

## Verification standard

Every change must be verified in a real browser before reporting done:
- Page renders fully (no blank screen / error boundary / hydration-style crash)
- Console clean, zero page errors
- Core interactions work: boot → play, world navigation, footer intact
- No horizontal scroll at 390 px mobile width

## Known backlog / polish candidates

- gamepad type detection for on-screen glass glyphs
- hiTable displaced-name flash
- 2-player coin gate
- pre-rendered terrain strip for low-end phones
- boot-card top-pilot name
