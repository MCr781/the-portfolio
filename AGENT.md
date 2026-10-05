# AGENT.md — Operating Handbook for AI Agents

This folder is the complete, self-contained source of **the-portfolio** — a Persian (RTL)
retro-arcade portfolio site. It is **100% static**: no build step, no framework code, no
dependencies to install. Everything that makes the site what it is lives in this folder.

## What you are working with

| Path | Role |
|---|---|
| `index.html` | The whole page. RTL (`dir="rtl" lang="fa"`). One page, no router. |
| `assets/main.js` | The ENTIRE game engine + site behavior in vanilla JS (classic deferred `<script>`, no modules/imports/bundler). HTML5 canvas arcade game lives here. |
| `assets/memory.js` | The memory cabinet — what the Konami code does. Loaded after `main.js`; paints with the fonts/palette/sprites `main.js` hands it through `window.__fw_gfx`. If this file is missing the code falls back to the old two-credit dialog, so it must stay last. |
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
   `window.__fw.post()` returns the boot BIOS block as it currently reads — that
   is how you check the cabinet learned a returning visitor's name.
4. **Game state** lives in `localStorage` under `fw-` prefixed keys (e.g. `fw-credits`).
   Clean up any test keys you create. The memory cabinet adds `fw-memo-name`,
   `fw-memo-wall` and `fw-memo-runs`; they are the visitor's, not yours — never
   seed them with test values.
5. **Cartridge label type stays small.** The 7-9px micro-type on the cartridge
   (`.cart-label-sys`, `.cart-label-ver`, `.cart-seal`, `.screen-url`) is the art —
   it is a fake 1980s NES label and shrinking it is what makes it read as one.
   Do not "fix" it for legibility. Affordances get 44px targets and readable
   text (`.view-tab-btn`, `.hero-explore-cta`, `.btn-cart-enter`,
   `.ambient-gesture-hint`, `.pstart`, `.hud-sound`); illustration does not.

## The Konami code

`↑↑↓↓←→←→BA` (or seven taps on the footer hint) calls `window.__fw_memo.enter()`.
It freezes the sim (`__fw_memoHold`), takes the whole viewport as its own tube, and
walks: degauss → power-on bloom → a 1989 BIOS POST counting its memory aloud → four
Persian lines → a name plate → the gift. Every phase takes a keypress, so nothing
traps an impatient visitor. `__fw_memoGift(name)` is the only thing that writes back
into the game: credits, paid play, and `POST[5]`, which is why the boot screen
greets a returning visitor by name.

Two rules if you touch it:
- keys are swallowed in the **capture** phase on `window`, so the cabinet
  underneath never sees them — do not move that listener to the bubble phase
- every CRT layer in `.memo` needs `z-index: 1`. The canvas is opaque; a scanline
  sheet on the element background paints *under* it and disappears

### Drawing into it — three traps, all of them silent

1. **The 5×7 font is uppercase-only.** `drawText` advances six pixels for a glyph
   it cannot find and draws nothing, so a lowercase sentence or a Persian digit
   comes out as a hole in the layout. Every string passed to `txt()`/`ctr()` must be
   uppercase ASCII; Persian — including Persian numerals — goes through
   `faCv()`/`pxText()`. `txt()` lints each string once against the font and warns,
   so this fails loudly now.
2. **Draw into `scg` (the scratch), never `g`.** `present()` blits the scratch over
   the visible canvas every frame; anything drawn straight to the glass is erased
   a frame later.
3. **Don't smear a still picture.** The phosphor trail is for moving frames only
   (wake and power-down). Held on a hard 5×7 glyph it is not persistence, it is a
   double exposure, and every letter grows a second fainter self.

### Looking at it

There is no browser here, so drive headless Edge over raw CDP and **freeze the rAF
chain** rather than sleeping: the phase clock advances on clamped frame deltas and
does not track wall time (headless rAF runs unthrottled, ~40× fast), so no amount
of polling will land on a given frame. `__fw_memo` exposes `phase()`, `elapsed()`,
`postT()`, `chars()` and `grid()` to arm exactly that. Note `postT` leads `elapsed`
by `T_WAKE` — POST's own `elapsed()` never passes ~3900ms.

Two more things headless gets wrong: it reports `prefers-reduced-motion: reduce`
(which disables the boot card entirely), and screenshots of a 3px pixel grid moiré
badly when downscaled. Trust `getImageData` over the framebuffer, not the PNG.

## Responsiveness

The tube is a fixed stack of parts, so the responsive work is mostly about
**height**, not width. Bands live at the end of `styles.css` and are deliberately
ordered *after* the width blocks: on a 844×390 tube both match and height wins,
because height is the scarcer resource.

| Band | What it does |
|---|---|
| `max-height: 760px` | tighter hero padding, deck gap and scale (0.9), hides the cue and cast caption |
| `max-height: 640px` | aggressive: deck scale 0.7, deck back to a single row, paragraph and control captions hidden, decal hidden, hero allowed to grow and scroll rather than clip |
| `max-width: 1100px` | cartridge pull-tab tucks flush instead of hanging 34px off the edge |
| `max-width: 860px` | worlds to one column, phone deck, cartridge 19rem |

The hero's vertical rhythm runs through `--hero-pad-top`/`--hero-pad-bottom`/
`--hero-deck-gap`/`--hero-deck-scale` on `.hero`. `.coin-row` is absolutely
positioned and reads `--hero-pad-bottom` — it used to carry its own clamp, so
every band that compressed the hero left the coin door stranded on top of the
deck.

Four traps worth knowing:
- **`transform: scale()` shrinks painted tap targets.** A `min-height: 44px` at
  scale .9 is a 39px button. The bands divide it back out with
  `calc(46px / var(--hero-deck-scale))` — 46, not 44, because exact division
  lands on 44 and sub-pixel rounding drops it just under.
- **The pull-tab's `::before` hit-zone is scrollable overflow.** It reached 40px
  past a tab that already hung 34px off the cartridge, inside a deliberately
  `overflow:visible` parent — ~74px into a viewport with ~22px of slack. That
  was the whole of the site's horizontal scroll, hidden by `body{overflow-x:clip}`.
- **`.world-inner` needs `minmax(0, …)` tracks.** Grid items default to
  `min-width: auto`, so one wide child widens the track past the viewport.
- **`overflow-x: clip` + `overflow-y: visible` is a legal pairing** (`clip` does
  not force the other axis to `auto`, unlike `hidden`) and is how the ≤640px band
  stops cropping horizontally while still letting the hero scroll vertically.

### Measuring it

Drive headless Edge over raw CDP at each size and assert, don't eyeball:
`scrollWidth === clientWidth`, hero height ≤ viewport, every `button`/`a`/
`[role=button]` ≥ 44×44, and the lightbox's `scrollHeight === clientHeight` with
the thumbnail strip above the fold. Three measurement traps:

- headless reports a **fine pointer**, so `html.has-cursor` is set and the parked
  `.cursor` (translated to about −10000px) registers as a huge overflow. Hide it.
- `.marquee` overflows by design — exclude it.
- don't hide `#boot` directly to get past the intro: that skips `liftBoot()`, so
  `html.awake` never lands and the whole hero copy sits at opacity 0. Remove
  `booting`, add `awake`, and force `opacity:1` on the hero rows instead.

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
