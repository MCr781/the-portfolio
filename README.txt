FOUR WORLDS HUB — محمد‌مهدی رضائی
====================================

A complete static site. Zero image assets, zero build step, zero dependencies —
every visual (loading screen, hero, pixel-art world, controls, cursor) is drawn
at runtime with Canvas + JavaScript + CSS.

CONTENTS
--------
index.html              The hub: pixel-art BIOS boot screen + arcade hero
                        (attract-mode title screen: 1P/HIGH SCORE/2P row,
                        blinking PRESS START + INSERT COIN TO CONTINUE,
                        speckled starfield over a dim Defender-style demo
                        world, CREDIT counter, joystick, START, JUMP/FIRE,
                        coin door) + the four world gateways
assets/styles.css       All styling (fonts embedded via assets/fonts)
assets/main.js          Game engine, pixel renderers, interactions
assets/fonts/           Estedad (Persian) + Space Mono (woff2)
ordibehesht/            World 01 preview page  (gold shop + digital piggy bank)
talasho/                World 02 preview page  (jewelry boutique)
razan/                  World 03 preview page  (consulting engineering firm)
yassi/                  World 04 preview page  (charity platform)
favicon.svg             Site icon

HOW TO VIEW LOCALLY
-------------------
Just open index.html in any modern browser (Chrome, Firefox, Edge, Safari).
Everything works from the file system — fonts, boot sequence, animations,
sounds (opt-in via the sound button), and all links.

HOW TO HOST
-----------
Upload the contents of this folder to any static host (GitHub Pages, Netlify,
Vercel, Cloudflare Pages, plain nginx/Apache...). No server code required.
For quick local serving with a real URL:

    python3 -m http.server 8080      # then open http://localhost:8080

NOTES
-----
- The four world pages are PREVIEW cards for the gateways. In your real
  deployment they can be replaced by the actual live sites (the hub links
  to these four folders; replace their index.html or point the hub's
  <a href> links at your live URLs).
- The hub links are relative, so the site works from any sub-path, not
  only a domain root.
- Sound is synthesized with the Web Audio API and is OFF by default;
  toggle it with the sound button.
