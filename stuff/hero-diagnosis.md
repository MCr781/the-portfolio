# HERO DIAGNOSIS — attract-mode title screen
_بعد از بازطراحی hero به سبک attract screen (رجوع: `stuff/press-start.jpg`)_
Date: 2026-09-12 · branch `arena/01a096f7-the-portfolio` · commit `b04b2fd`

## 0. What the hero is now
An arcade **attract screen**, top to bottom:

| zone | element | carrier |
|---|---|---|
| top glass | `1P 00 · HIGH SCORE 1234567890 · 2P 00` (white 5×7, two rows) | `#field` canvas |
| sky | near-black `#0b0b0f`, sparse speckle stars (1/12 of the dusk-sky density) with gold + red glints, CRT vignette | `#field` canvas |
| horizon | the Defender demo world sunk to near-black tones — ship, landers, humanoids still live, as demo play under a title card | `#field` canvas |
| marquee | role chip → peach pixel name (hard 1px drop shadow) → small white statement subline → dim paragraph, all centered | DOM + `[data-px]` pixel twins |
| heartbeat | blinking peach `PRESS START` (scale 3 on tall tubes, 2 otherwise) + steady white `INSERT COIN TO CONTINUE` (micro-font) | `.cue-cv` / `.cue-sub` |
| hardware | joystick · START · JUMP/FIRE · coin door (unchanged sprites) | deck canvases |
| bottom glass | decal centered + **live `CREDIT 00 → 01`** at the right corner while a coin is in the door | `.hero-foot` |

Verification method: no browser exists in this sandbox, so the canvas art was
replayed through a Node software-2D harness (`.verify/harness.js`, outside the
repo) at 1280×800, 1280×1000 and 360×740; DOM geometry was checked arithmetically
per breakpoint (vertical budgets listed in §2).

---

## 1. Findings — fixed during this pass
1. **HUD clutter vs. attract feel** — the old hero-mode HUD (1UP/score/HI/FREE PLAY +
   life sprites + radar band) fought the title-card hierarchy. Replaced with the
   reference score row; radar palette + `SPR_LIFE`/`LIFE_LEG`/`SPR_ARROW` removed.
2. **Starfield density** — 2 375 stars at 1280×800 read as snow, not speckled glass
   (reference ≈ 0.09 % ink coverage vs. our 0.26 %×9 px-per-star). Attract mode now
   draws every 12th star → ink coverage within ~1.4× of the reference.
3. **Demo world too loud** — gold phosphor terrain + purple ridges out-shouted the
   marquee. Attract tones (`TONE` map) sink everything to `#0e0d17…#241c3c`.
4. **CREDIT/decal collision on narrow tubes** — CREDIT 00 (right corner) overlapped
   the centered decal below ~520 px. Decal now shortens (`MMR-84 · 4 WORLDS` < 520 px,
   `MMR-84` < 380 px); worst case 320 px: 98 + 110 = 208 css ≤ 294 available. ✔
5. **Vertical squeeze from the new marquee** — 3× PRESS START (104 css px) + taller
   cue would overflow 900 px tubes. Statement moved to the half-grid (144 → 38 css px,
   and it now reads like the reference subline), and 3× cue is gated to
   `PXG ≥ 4 && clientHeight ≥ 1040`.
6. **Top-chrome clearance** — the canvas score row occupies css y 12–72 (PXG 4);
   `.hero` padding-top raised to `clamp(4rem, 8.5vh, 5.2rem)` and both responsive
   overrides patched (3.6rem / 3.4rem) so the centered chip never touches it.

## 2. Findings — open at write-time (ranked)
> _W1 and W2 were **resolved** in the visual-audit pass that followed — see
> §5 V4–V6: the scale hack is removed and the tube no longer clips. Kept
> here for the record._

### W1 · `transform: scale(0.85)` breaks the pixel grid — medium
`@media (max-height: 850px)` scales `.hero-inner/.hero-deck/.coin-row` by 0.85.
Non-integer scaling of `image-rendering: pixelated` canvases produces uneven
pixel steps — exactly what the art policy forbids. Fix when convenient: replace
with grid-step downsizes (repaint at `PXG−1`) instead of a CSS transform.

### W2 · vertical budget is clamp-and-pray — medium
`.hero` is locked to `100svh; overflow: hidden`; if the stack ever exceeds the
tube, the foot row is clipped, not scrollable. Current worst cases (computed):
1280×900 → ≈ 892 css ✔ · 1024×940 → ≈ 922 ✔ · 360×667 → ≈ 659 ✔ (via the 0.85
media, which is W1). Margins are thin at 900 px; any new hero line must pay rent.
Suggested rent: move `.hero-para` out of the fold (it is the cheapest 124 css px).

### W3 · ~2.7 MB of unreferenced images — medium
`assets/hero_bg.jpg`, `assets/press_start_bg.jpg`, `assets/loading_badge.jpg`
are referenced by nothing (HTML/CSS/JS greps clean), while README still claims
“zero image assets”. Either delete them or put them to work; the four cartridge
JPGs (~3.9 MB) *are* used and could be WebP-ified for ~−70 %.

### W4 · dead code left behind — low
`SPR_HUMF` (pre-existing, never drawn), `PC.starCyan`, `PC.moonRing` unused.
Harmless; sweep when touching the sprite sheet.

### W5 · `w.score` is now invisible — low
The sim still accrues score but attract chrome shows the canonical `1P 00`.
Either wire `1P` to the demo score (fun, “demo play” authenticity) or stop
accruing it. Deliberately left as-is: the reference screen shows zeros.

## 3. Checks that pass (keep them)
- **Photosensitivity**: cue blink = 1.15 s steps(2) ≈ 0.87 Hz « 3 Hz WCAG 2.3.1;
  `prefers-reduced-motion` kills blink, boot flicker, scanline roll, and the boot
  sequence itself. WCAG 2.2.2 satisfied via the reduced-motion path.
- **Contrast on `#05050a`**: paragraph `#b9b9c6` ≈ 9.6:1 · statement `#e9e9f2` ≈ 15:1 ·
  cue-fa `#9494a8` ≈ 6.3:1 · chrome row `#ffffff` = 21:1. Decal `#5c5c6b` ≈ 3.3:1 but
  is `aria-hidden` ornament.
- **AT/SEO**: `[data-px]` pixel-twin pattern keeps real Persian text for screen
  readers and crawlers; every new canvas sits inside `aria-hidden` containers;
  START/coin remain real `<button>`s with `aria-label`s (keyboard path intact).
- **Perf shape**: rAF loop gates `stepWorld`/`renderWorld` on hero visibility and
  `document.hidden`; attract mode is *cheaper* than the old HUD (radar band gone);
  coin door repaints only on LED ticks. Hot spot unchanged: the per-column terrain
  fillRect storm (~6–8 k rect/frame at PXG 3–4) — pre-renderable to an offscreen
  strip if a future profile demands it.
- **Units**: `100svh` (correct for iOS chrome), integer grid multiples everywhere
  (W1 resolved: no fractional scaling anywhere), RTL page with deliberate LTR hardware islands (`direction: ltr` deck,
  `dir="ltr"` glass text).
- **Resize**: single debounced handler rebuilds world + controls + pixel twins +
  cue + credit + decal; `faCache` invalidated. No leak path found.

## 4. Suggested next beats (not done)
1. Repaint-at-smaller-grid instead of `scale(0.85)` (kills W1).
2. WebP/AVIF the cartridge JPGs; delete or use the three orphan images (W3).
3. Wire `1P` to the demo score after first coin (W5) — attract → “game played”.
4. Pre-rendered terrain strip if mobile profiling ever complains (§3 perf).

---

## 5. VISUAL AUDIT — looking at the hero with real eyes
Method: no sandbox browser existed, so one was built — `@sparticuz/chromium`
(Lambda build, npm-tarballled binary) + three stub NSS/NSPR shared libs
(symbol-versioned, malloc-family made real; plain HTTP never touches NSS) +
puppeteer-core. Screenshots at 1280×1000 / 1280×800 / 1440×900 / 1024×768 /
1366×768 / 390×844 with DOM-rect probes (`hero_*` children vs `.hud` vs
viewport). Shots live in `.verify/shots/` (outside the repo).

### What the eyes caught (all fixed)
- **V1 · muddy brown PRESS START.** `steps(2)` on a 1↔0 keyframe pair yields
  quarter-frames at 50 % opacity — the peach ink dimmed to brown half the
  cycle. Now `step-end`: hard on/off like real attract glass; off-frame keeps
  the white subline, exactly like the cabinet.
- **V2 · hanging second lines.** RTL `fillText` right-aligns inside the pixel
  canvas, so centered blocks carried right-ragged short lines (name line 2,
  statement line 2, chip). `centerLines` in `pxTextCanvas` centers each line
  by its own measure; the marquee now stacks symmetric.
- **V3 · ship flying through the paragraph.** The demo lane wandered
  0.30–0.54 of the tube — straight through the title block. Lane moved to
  0.56–0.66 (horizon patrol); the ship now passes *behind* deck hardware,
  which reads as cabinet depth, not collision.
- **V4 · the fixed world-HUD ate the foot row.** `.hud` is a fixed ~60 px
  strip; the hero's old 8–13 px bottom padding parked decal + CREDIT +
  coin door *underneath* it on every desktop tube (pre-existing bug, invisible
  without eyes). Hero bottom padding is now `clamp(4.2rem, 7vh, 5rem)` and
  probes confirm foot-bottom < hud-top at all six sizes.
- **V5 · phone foot collision.** At 390 px the centered decal and the right
  CREDIT overlapped by ~32 px. Decal (ornament, `aria-hidden`) hides ≤ 560 px;
  CREDIT goes static + auto-margin and owns the corner.
- **V6 · below-the-fold clipping at 768/800.** The `scale(0.85)` media (W1)
  shrank *visual* boxes but not *layout* boxes — flex overflow pushed coin
  door + foot off-tube while leaving phantom gaps. The scale hack is **gone**;
  short tubes step the whole art down one grid (`calcGrids` gh band 860) and
  `.hero` is `min-height: 100svh` (grows a hair instead of clipping). Measured:
  hero-bottom == viewport-height and zero scroll at all six tubes.

### Verified by eye after fixes
tall/desk/wide/mid/lap/phone: score row clears the chip; marquee symmetric;
blink hard-cuts; INSERT COIN TO CONTINUE steady; deck + coin door + decal +
CREDIT all above the HUD strip; starfield speckle matches the reference ink;
demo world whispers at the horizon. Composition = the press-start.jpg feeling,
in Persian, on a living cabinet.

### §6 · Work order pass (six points, eyes-on verified)

1. **Chrome legibility** — the 1P/2P + HIGH SCORE row now draws *after* the
   vignette (`drawAttractChrome`), and at PXG≤2 it renders at scale 2 (a 32-game-px
   band ≈64 css), so corner dither and 1-px-on-2-px-grid mush can no longer eat it.
2. **Hardware craft** — joystick ball gets a rim-light arc + ribbed shaft +
   two-tier screwed base; START key gets side walls, an engraved (shadow-then-ink)
   label and a power LED; JUMP/FIRE domes sit in machined bezel rings with a cross
   specular and press spill-light; the coin door gets brushed rows, corner screws
   and an LED halo; the coin sprite gets reeded rim ticks, an inner ring and a
   struck star.
3. **The coin means something** — credits are a ledger kept in localStorage
   (`fw-credits`). Inserting a coin: gold surge, THANK YOU / PLAYER 1 stamp on a
   notched plate, the little people cheer (arms-up frame + hop), the ship rolls,
   one permanent gold star joins the sky, and the bezel + door read CREDIT NN.
   START spends a credit (GOOD LUCK!) or plays free (FREE PLAY!). While any banner
   stamp is up the attract copy steps off the glass (`html.banner-on`, visibility
   — the awake fade animation outranks opacity in the cascade).
4. **Nose-fired bolts** — bullets spawn at the pointy head (direction-aware) and
   render head-first.
5. **Landers** — cruise band raised to rows 0.52–0.70 so they share the ship's gun
   lane; bombs home onto the nearest ground humanoid and kill on contact; the
   descend → grab → lift steal pipeline now visibly reads because the humanoids
   are human-shaped.
6. **Humanoids** — new 6×8 sprites (head, shoulders, arms, legs, walk stride,
   arms-up cheer/fall frames) with skin/shirt/pants legs.
