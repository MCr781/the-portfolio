# Talasho — Categories Card Mobile Harmony Fix (v2)

## Problem
On mobile (≤1023px), the categories card and prize banner sat side by side
with the same height, but the categories card didn't "make sense":
- At 390px: tiles were cramped / cut off (not enough space)
- At 768–1023px: awkward empty space at the bottom of the card

## Fix — breakpoint-aware density model

The card has a FIXED height matching the prize banner (220px mobile / 360px
tablet). The grid inside now adapts its column count + tile size at each
breakpoint to FILL that height cleanly:

| Breakpoint          | Grid         | Tiles visible | Tile size  | Scroll? |
|---------------------|--------------|---------------|------------|---------|
| Mobile (<768px)     | 2 cols × 3r  | 6 visible     | 40px circle| Yes (y) |
| Tablet (768–1023px) | 4 cols × 3r  | 12 (all)      | 64px circle| No      |
| Desktop (≥1024px)   | 12 cols × 1r | 12 (all)      | 64px circle| No      |

## Files changed

1. `index.html` (lines ~745–805)
   - Updated grid classes: `grid-cols-2 md:grid-cols-4 lg:grid-cols-12`
   - Updated container: `overflow-y-auto md:overflow-visible`
   - Added `md:p-4` and `md:gap-y-4` for proper tablet padding
   - Updated documentation comments

2. `src/input.css` (lines ~339–384)
   - Split the old `@media (max-width: 1023px)` block into two:
     - `@media (max-width: 767px)` — mobile compact (40px circles)
     - `@media (min-width: 768px) and (max-width: 1023px)` — tablet mode
       (uses desktop-default 64px circles, only documents the gap tuning)

3. `assets/css/style.css`
   - Recompiled via `npm run build:css` (Tailwind v3.4)

## How to apply

Option A — Full file replacement:
  Copy all 3 files over your existing ones, replacing them.

Option B — Git apply:
  From your repo root:
    cp path/to/extracted/index.html ./index.html
    cp path/to/extracted/src/input.css ./src/input.css
    cp path/to/extracted/assets/css/style.css ./assets/css/style.css

Then verify locally:
  npm run serve  →  http://localhost:8080
  Test at widths: 390px, 768px, 1023px, 1440px

## Screenshots
See the `screenshots/` folder for visual verification at each breakpoint.
