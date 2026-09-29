# Talasho — VIP Jewelry Storefront (Phase 1 + Phase 2 teaser)

A luxurious, RTL Persian e-commerce homepage for **Talasho** — a subsidiary of **VIP Barzigar Gold & Jewelry**. Built strictly with HTML5, Tailwind CSS, and Vanilla JS. No CDNs. No frameworks.

## Global page shell

The header and footer designed in `index.html` are maintained as shared partials:

- `assets/partials/site-header.html`
- `assets/partials/site-footer.html`

Run `npm run sync:shell` after changing either partial. Use `npm run check:shell` to verify that every HTML page is synchronized.

## Quick start

```bash
# 1) Install dev deps (only Tailwind + Swiper used as source for local copies)
npm install

# 2) Compile Tailwind → ./assets/css/style.css
npm run build:css

# 3) (Optional) Watch mode during development
npm run watch:css

# 4) Serve locally for visual QA
npm run serve
# → http://localhost:8080
```

Production needs **only** the following files (everything else is dev tooling):

```
index.html
/assets/
  css/style.css           ← compiled Tailwind output (38 KB)
  js/main.js              ← mobile menu + Swiper init + copy-to-clipboard
  js/countdown.js         ← Amazing Offers countdown timer
  js/price-board.js       ← price board demo + window.TALASHO.updatePrices() API
  js/vendor/swiper-bundle.min.js    ← local Swiper bundle
  vendor/swiper-bundle.min.css      ← local Swiper styles
  fonts/Vazirmatn-*.woff2           ← 8 local font files (4 standard + 4 Farsi-Digit)
  images/                           ← logos, campaign image
```

## Tech stack (per backend team's requirements)

| Requirement | Status |
|---|---|
| HTML5 + Tailwind classes + Vanilla JS only | ✅ |
| No CDNs (fonts, Swiper, all local) | ✅ |
| Precise `<!-- LOOP START/END -->` comments for backend injection | ✅ |
| RTL | ✅ (`dir="rtl"` on `<html>`, Swiper `dir: 'rtl'`) |
| Royal purple `#4A154B` + gold `#D4AF37` palette | ✅ |
| 180° different from "Ordibehesht Gold" | ✅ (see DIVERGENCE.md) |

## Page sections (top → bottom)

1. **Utility bar** — phone, parent company badge, Gold Box Phase 2 CTA
2. **Header** — sticky, logo + search + cart + login, mobile menu drawer
3. **Mega menu** — 3-col text + 1 promo image (women's jewelry only)
4. **Hero swiper** — fade effect, 2 slides (Peugeot 206 giveaway + new collection)
5. **Quick-link tiles** — 6 circular category shortcuts (Digikala-style)
6. **Live price board** — floating card, 5 rows (gold, dollar, 2 coins, melted gold)
7. **Category cards** — 4 large rectangular tiles
8. **Campaign banner strip** — 60/40 split (Gold Box Phase 2 launch + insured shipping)
9. **Amazing Offers** — purple strip, gold countdown, 6-product horizontal swiper
10. **Featured products** — 4-col × 2-row grid (8 cards)
11. **VIP Special Offers** — dark purple, coverflow swiper with glassmorphism cards
12. **Discount code banner** — `FIRST10` with copy-to-clipboard
13. **Magazine** — 3-col blog grid
14. **Newsletter** — purple band with email signup
15. **Footer** — 4-column (brand / quick links / contact / social) + bottom bar with static links

## Backend integration points

Every dynamic block is wrapped with start/end comments and individual `<!-- BACKEND: INJECT ... -->` markers. Search the HTML for:

```
<!-- BACKEND: FOREACH ... LOOP START -->
... one item template ...
<!-- BACKEND: FOREACH ... LOOP END -->
```

Loops provided:
- `MAIN-CATEGORY` (mega menu nav row)
- `SUBCATEGORY` (mega menu columns)
- `STATIC-UTILITY-LINK` (utility bar)
- `HERO-SLIDE` (hero swiper)
- `QUICK-LINK` (quick-link tiles)
- `MARKET-PRICE` (live price board rows)
- `CATEGORY-CARD` (large category cards)
- `DISCOUNTED-PRODUCT` (Amazing Offers swiper)
- `FEATURED-PRODUCT` (4-col featured grid)
- `VIP-PRODUCT` (VIP coverflow swiper)
- `BLOG-POST` (magazine grid)
- `FOOTER-QUICK-LINK`, `STATIC-LEGAL-LINK`, `SOCIAL-LINK`, `CERTIFICATION` (footer)

Injectable values include product title, image, old price, final price, discount percent, blog title, contact info, phone, etc.

## Live price board — backend API

`price-board.js` exposes a clean public API:

```js
// Call this from your backend whenever market data updates
window.TALASHO.updatePrices([
  { name: 'طلای ۱۸ عیار (گرم)', current: 4400000, prev: 4350000 },
  { name: 'دلار آزاد',          current: 60000,   prev: 59800 },
  { name: 'تمام سکه امامی',     current: 42500000, prev: 42100000 },
  // ... match by data-price-name attribute
]);
```

The demo random-walk is in the same file — backend team should delete the `setInterval(...)` block at the bottom and keep only the `updatePrices()` function.

## Countdown timer — backend API

The Amazing Offers countdown reads its deadline from the `data-countdown` attribute on the wrapper element. Format: `YYYY-MM-DD HH:MM:SS` (server local time).

Backend can override at runtime:

```js
window.TALASHO = { offersDeadline: '2026-07-21 23:59:59' };
```

## Fonts

Two font families are exposed locally (no Google Fonts):

- **Vazirmatn-FD** — Farsi-Digit variant (Persian numerals ۰-۹). Default body font.
- **Vazirmatn** — Latin-digit variant. Used on price board and any LTR data.

Apply `.font-latin` class to force Latin digits.

## Browser support

Modern evergreen browsers (Chrome 90+, Firefox 88+, Safari 14+). Uses CSS custom properties, backdrop-filter, aspect-ratio, and grid — all standard since 2021.

## Color palette

Defined as CSS variables in `src/input.css` :root. Mirror in `tailwind.config.js`. Royal purple `#4A154B` is dominant; gold `#D4AF37` is accent only.

## License

Proprietary. © Talasho, subsidiary of VIP Barzigar Gold & Jewelry.
