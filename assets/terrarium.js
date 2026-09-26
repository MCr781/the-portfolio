/* ═════════════════════════════════════════════════════════════════
   terrarium.js — every world is somebody's home.
   Each .world section gets a resident creature that LIVES in it:
   it wakes when you arrive, promenades along the bottom corridor,
   leaps for the checker rim — hanging in mid-air just under the
   glass, never above it: the section is their whole world — and
   performs one signature trick that belongs to its world alone.

   World 01 · طلای اردیبهشت  →  «سکه» Sekkeh, a living 18-karat
   coin: waddles with dust puffs, melts into a shimmering gold
   puddle (طلای آب‌شده) and slides away, feeds nuggets into the
   cartridge slot like it's its own قلک, flips to flash the «۱۸»
   mint mark on its back, and watches your pointer with big eyes.

   World 02 · طلاشو  →  «الماس» Almas, a flawless brilliant-cut
   diamond. The world's copy opens with "دنیای دوم، ویترین است"
   — this world IS a shop window, so its resident is the exhibit:
   lowered in by the vitrine light for her debut, prancing on
   glint dust, splitting that light into a rainbow fan (شکستِ نور)
   that pools on the floor, spinning on her point like a
   jewelry-box ballerina (her pavilion hides the hearts-and-arrows
   heart), receiving a tiny gold crown, dropping a pearl into the
   cartridge slot, holding a diva's pose in mid-air just under the
   checker rim — inside her vitrine, always — curtsying to the
   gate, and sleeping on a velvet cushion.

   World 03 · رازان  →  «نقشه» Naghsh, a living blueprint scroll.
   Razan is a consulting engineering firm — every tower in its
   gallery lived on paper first, so the resident is the drawing
   itself, printed in the section's own teal ink. It arrives as
   five scattered paper pieces (the world's logo assembles from
   five pieces too), unrolls to greet you, drafts ghost buildings
   on the floor — the gallery's tower, villa and river, line by
   line, in its own teal — pulls a mini-roll of plans out of its
   curl and posts it into the cartridge slot like sending
   drawings to the archive, receives the review stamp the world
   presses onto its paper (leaving the check-mark seal), hangs
   under the rim dropping a plumb line to measure its own world,
   rolls over to show the floor plan on its back, and when it
   sleeps its top curl flops down over its eyes like a blanket
   while the tower's windows go dark.

   World 04 · یاسی شو  →  «یاس» Yas, a living jasmine sprout.
   The world is named for the یاس کرمان charity it serves, and
   its copy says it best: here the website "فقط ویترین نیست؛
   ابزار کار یک خیریه‌ی واقعی است" — a real charity's working
   tool, where many small hands build and complete real
   projects. So the last resident is the world's own namesake:
   a jasmine that GROWS — metal, stone and paper made way for
   something alive. It sprouts out of the section's own soil
   for its debut, plants the kindness garden (باغ مهربانی) —
   seeds drop, sprouts rise, little blooms open one by one, and
   a raspberry heart (the world's own accent) floats up when
   the row is complete — plucks one of its own petals and posts
   it through the cartridge slot like a donation with a
   receipt, waters itself from a rose-pink can that pops out of
   the soil, basks under the night sky while fireflies drift
   through its world, bows to the world's gate, leaps for the
   rim to smell the night air — and when it sleeps its petals
   fold closed, the way a jasmine closes at night, and open
   again at dawn.

   Pure canvas, zero dependencies, pointer-events: none.
   Respects prefers-reduced-motion. Ticks only while on screen —
   scroll away and it curls up under a rain of pixel Zzz.
   ═════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var doc = document;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var reducedOn = reduced.matches;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeIn(t) { return t * t; }
  function weighted(cands) {
    var sum = 0, i;
    for (i = 0; i < cands.length; i++) sum += cands[i][0];
    var r = Math.random() * sum;
    for (i = 0; i < cands.length; i++) { r -= cands[i][0]; if (r <= 0) return cands[i][1]; }
    return cands[cands.length - 1][1];
  }

  /* ── mint palette — struck from World 01's own gold ─────────── */
  var INK      = '#241c0f';
  var GOLD     = '#d4af37';
  var GOLD_HI  = '#f2dc82';
  var GOLD_LO  = '#a37c17';
  var GOLD_DK  = '#8a6a14';
  var CHEEK    = '#cf8a2e';

  /* ── the coin's body, prerendered once per scale ──────────────
     a pixel-perfect disc: ink outline, light crescent at ten
     o'clock, deep crescent at four, milled ring on the lower rim,
     and two fixed glint pixels — the die-stamp of the mint. */
  function makeCoinSprite(r, sc) {
    var size = (r * 2 + 4) * sc;
    var cv = doc.createElement('canvas');
    cv.width = size; cv.height = size;
    var g = cv.getContext('2d');
    var c = size / 2;
    for (var j = -r; j <= r; j++) {
      for (var i = -r; i <= r; i++) {
        var d = Math.sqrt(i * i + j * j);
        if (d > r + 0.35) continue;
        var col;
        if (d > r - 0.75) col = INK;
        else {
          var s = (i + j) / r;
          if (s < -0.62) col = GOLD_HI;
          else if (s > 0.66) col = GOLD_LO;
          else col = GOLD;
          if (d > r - 2.6 && d < r - 1.6 && s > 0.1) col = GOLD_DK;
        }
        g.fillStyle = col;
        g.fillRect(Math.round(c + i * sc - sc / 2), Math.round(c + j * sc - sc / 2), sc, sc);
      }
    }
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(c - r * 0.52 * sc), Math.round(c - r * 0.62 * sc), sc, sc);
    g.fillRect(Math.round(c - r * 0.36 * sc), Math.round(c - r * 0.76 * sc), sc, sc);
    return cv;
  }

  /* Persian «۱۸» — the mint mark on Sekkeh's back face. ۱ hooks
     left at the shoulder, ۸ is a pixel lambda. Four rows each. */
  var D1 = ['.X', 'XX', '.X', '.X'];
  var D8 = ['X..X', 'X..X', 'X..X', '.XX.'];

  function makeDigitsSprite(cell) {
    var w = (2 + 1 + 4) * cell, h = 4 * cell;
    var cv = doc.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d');
    g.fillStyle = GOLD_HI;
    var sets = [D1, D8], x = 0, i, j, rows;
    for (var k = 0; k < 2; k++) {
      rows = sets[k];
      for (j = 0; j < rows.length; j++)
        for (i = 0; i < rows[j].length; i++)
          if (rows[j].charAt(i) === 'X') g.fillRect(x + i * cell, j * cell, cell, cell);
      x += (rows[0].length + 1) * cell;
    }
    return cv;
  }

  /* ── particles — the terrarium's weather ────────────────────── */
  function Particles() { this.list = []; }
  Particles.prototype.spawn = function (type, x, y, o) {
    o = o || {};
    var p = { type: type, x: x, y: y, t: 0, life: o.life || 1, vx: o.vx || 0, vy: o.vy || 0, s: o.s || 1, txt: o.txt || '' };
    if (type === 'dust')  { p.vx = rand(-16, 16); p.vy = rand(-26, -8);  p.life = rand(.3, .5);  p.s = rand(1.5, 2.5); }
    if (type === 'gdust') { p.vx = rand(-14, 14); p.vy = rand(-24, -6); p.life = rand(.35, .6); }
    if (type === 'spark') { p.vx = rand(-22, 22); p.vy = rand(-52, -12); p.vy -= o.up || 0; p.g = 110; p.life = rand(.5, .9); }
    if (type === 'drip')  { p.vx = rand(-6, 6);   p.vy = rand(14, 30);   p.g = 130; p.life = rand(.4, .7); }
    if (type === 'z')     { p.vx = rand(-4, 4);   p.vy = -13;           p.life = rand(1.4, 1.8); if (o.col) p.col = o.col; }
    if (type === 'petal') { p.vx = rand(-9, 9);   p.vy = rand(9, 17);   p.life = rand(1.5, 2.2); p.ph = rand(0, 6.28); p.fq = rand(2, 3.2); }
    if (type === 'heart') { p.vx = rand(-2, 2);   p.vy = -15;           p.life = 1.7; }
    if (type === 'drop')  { p.vx = rand(-4, 4);   p.vy = rand(12, 26);  p.g = 150; p.life = rand(.45, .7); }
    if (type === 'scent') { p.vx = rand(-6, 6);   p.vy = rand(-15, -9); p.life = rand(1.1, 1.6); }
    if (type === 'fly')   { p.vx = rand(-6, 6);   p.vy = rand(-4, 4);   p.life = o.life || 4.5; p.ph = rand(0, 6.28); }
    if (type === 'bang')  { p.life = .95; }
    if (type === 'tag18') { p.life = 1.25; }
    if (type === 'hi')    { p.life = 2.1; }
    if (type === 'flash') { p.life = .3; }
    this.list.push(p);
  };
  Particles.prototype.tick = function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var p = this.list[i];
      p.t += dt;
      if (p.t >= p.life) { this.list.splice(i, 1); continue; }
      if (p.g) p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'fly') { p.x += Math.sin(p.t * 1.3 + p.ph) * 9 * dt; p.y += Math.cos(p.t * .9 + p.ph) * 6 * dt; }
      if (p.type === 'petal') p.x += Math.sin(p.t * p.fq + p.ph) * 11 * dt;
    }
  };
  Particles.prototype.render = function (g) {
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      var a = 1 - easeIn(p.t / p.life);
      var x = Math.round(p.x), y = Math.round(p.y);
      if (p.type === 'dust') {
        g.fillStyle = INK; g.globalAlpha = .3 * a;
        g.fillRect(x, y, p.s, p.s);
      } else if (p.type === 'gdust') {
        /* a glint of dust — the vitrine's sparkle, a plus-shaped twinkle */
        g.globalAlpha = .9 * a;
        g.fillStyle = ((p.t * 26 | 0) % 2) ? '#bcd9f2' : '#ffffff';
        g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
      } else if (p.type === 'spark') {
        g.globalAlpha = a; g.fillStyle = (p.t * 20 | 0) % 2 ? GOLD_HI : '#ffffff';
        g.fillRect(x - 1, y - 3, 2, 6); g.fillRect(x - 3, y - 1, 6, 2);
      } else if (p.type === 'drip') {
        g.globalAlpha = a; g.fillStyle = GOLD;
        g.fillRect(x, y, 2, 3);
      } else if (p.type === 'z') {
        /* a chunky pixel Z, drifting up like a thought */
        g.globalAlpha = a * .85; g.fillStyle = p.col || GOLD_LO;
        g.fillRect(x, y, 6, 2); g.fillRect(x + 2, y + 2, 2, 2); g.fillRect(x, y + 4, 6, 2);
      } else if (p.type === 'petal') {
        /* a loosened petal — sways down like a paper scrap */
        g.globalAlpha = .95 * a;
        g.fillStyle = '#f6f2ff';
        g.fillRect(x - 1, y, ((p.t * p.fq * 2 | 0) % 2) ? 3 : 1, 2);
        g.globalAlpha = .5 * a;
        g.fillStyle = '#cfc4ee';
        g.fillRect(x - 1, y + 2, 2, 1);
      } else if (p.type === 'heart') {
        /* the world's own raspberry — one finished kindness */
        g.globalAlpha = a;
        g.fillStyle = '#ed145b';
        g.fillRect(x - 3, y - 2, 2, 2); g.fillRect(x + 1, y - 2, 2, 2);
        g.fillRect(x - 3, y - 1, 6, 2);
        g.fillRect(x - 2, y + 1, 4, 1);
        g.fillRect(x - 1, y + 2, 2, 1);
        g.globalAlpha = .7 * a;
        g.fillStyle = '#ff6aa5';
        g.fillRect(x - 2, y - 2, 1, 1);
      } else if (p.type === 'drop') {
        g.globalAlpha = a; g.fillStyle = '#bcd9f2';
        g.fillRect(x, y, 2, 3);
      } else if (p.type === 'scent') {
        /* jasmine fragrance — a soft lavender twinkle rising */
        g.globalAlpha = .8 * a;
        g.fillStyle = ((p.t * 18 | 0) % 2) ? '#ffffff' : '#dcd2ff';
        g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
      } else if (p.type === 'fly') {
        /* a firefly of the night garden */
        var fl2 = .45 + .4 * Math.sin(p.t * 6 + p.ph);
        g.globalAlpha = fl2 * a;
        g.fillStyle = '#ffe9a8';
        g.fillRect(x, y, 2, 2);
        if (Math.sin(p.t * 6 + p.ph) > .82) { g.globalAlpha = .4 * a; g.fillRect(x - 2, y, 6, 2); g.fillRect(x, y - 2, 2, 6); }
      } else if (p.type === 'flash') {
        g.globalAlpha = .45 * a; g.fillStyle = GOLD_HI;
        g.fillRect(x, y, p.s, 8);
        g.globalAlpha = .25 * a; g.fillStyle = '#ffffff';
        g.fillRect(x, y, p.s, 3);
      } else if (p.type === 'bang' || p.type === 'tag18' || p.type === 'hi') {
        drawBubble(g, p, a);
      }
      g.globalAlpha = 1;
    }
  };
  /* pixel speech capsules: «!», the mint tag «۱۸», and the
     resident's name tag — all hard-cornered, arcade-honest */
  function drawBubble(g, p, a) {
    var x = Math.round(p.x), y = Math.round(p.y);
    var pop = p.t < .12 ? p.t / .12 : 1;
    var w, h;
    g.save();
    g.globalAlpha = a;
    g.translate(x, y);
    g.scale(pop, pop);
    if (p.type === 'bang') {
      w = 7; h = 11;
      g.fillStyle = INK;
      g.fillRect(-w / 2, -h, w, h);
      g.fillRect(-1, 1, 3, 2);
      g.fillStyle = GOLD_HI;
      g.fillRect(-1, -h + 2, 2, 5);
      g.fillRect(-1, -3, 2, 2);
    } else if (p.type === 'tag18') {
      w = 20; h = 14;
      g.fillStyle = INK;
      g.fillRect(-w / 2, -h - 4, w, h);
      g.fillRect(-2, -h - 4 + h, 3, 2);
      g.restore(); g.save();
      g.globalAlpha = a;
      g.translate(x, y);
      g.scale(pop, pop);
      g.drawImage(TAG18, -8, -h - 2, 16, 10);
    } else if (p.type === 'hi') {
      g.font = '700 13px Estedad, Vazirmatn, sans-serif';
      var tw = g.measureText(p.txt).width;
      w = Math.ceil(tw) + 14; h = 21;
      g.fillStyle = INK;
      g.fillRect(-w / 2, -h - 6, w, h);
      g.fillRect(-2, -h - 6 + h, 3, 2);
      g.fillStyle = p.col || GOLD_HI;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(p.txt, 0, -h - 6 + h / 2 + 1);
    }
    g.restore();
  }

  var TAG18 = null;   /* built lazily at cell=2 for the flip tag */

  /* ═════════════════════════════════════════════════════════════
     the terrarium engine — one canvas per world, a creature in it
     ═════════════════════════════════════════════════════════════ */
  function Terrarium(section, factory) {
    var self = this;
    this.sec = section;
    this.cv = doc.createElement('canvas');
    this.cv.setAttribute('aria-hidden', 'true');
    section.appendChild(this.cv);
    this.g = this.cv.getContext('2d');
    this.TOP = 80;                        /* headroom above the border strip */
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    this.awake = false;
    this.dormant = false;
    this.started = false;
    this.time = 0;
    this.ev = null;
    this.tap = null;
    this.px = -1e4; this.py = -1e4; this.pSeen = false;
    this.snooze = 0; this.sleeper = false; this.vis = false; this.rmT = 0;
    this.parts = new Particles();
    this.reduced = reducedOn;
    this.mobile = false;

    this.brain = factory(this);

    this.measure();
    this.sizeCanvas();

    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(function () { self.onResize(); });
      this.ro.observe(section);
    } else {
      window.addEventListener('resize', function () { self.onResize(); }, { passive: true });
    }

    this.io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (ents) {
      for (var k = 0; k < ents.length; k++) {
        var en = ents[k];
        /* wake fires ONCE per arrival — threshold crossings re-enter,
           and a wake replay mid-trick used to cancel the show */
        if (en.isIntersecting && en.intersectionRatio >= 0.12) {
          if (!self.vis) { self.vis = true; self.requestWake(); }
        } else if (!en.isIntersecting || en.intersectionRatio < 0.04) {
          self.vis = false;
          self.sleep();
        }
      }
    }, { threshold: [0, 0.04, 0.12, 0.5] }) : null;
    if (this.io) this.io.observe(section);
    else this.requestWake();

    section.addEventListener('pointermove', function (e) { self.ev = e; }, { passive: true });
    section.addEventListener('pointerdown', function (e) {
      self.tap = self.toLocal(e);
      if (self.sleeper && self.dormant) {
        /* a nap frozen mid-frame — restart the loop so the tap can land */
        self.dormant = false;
        if (!self.awake) { self.awake = true; self.startLoop(); }
        if (!self.snooze) self.snooze = 1.9;
      }
    }, { passive: true });
    /* a pointer that left is a pointer that's gone — no ghost stares,
       no phantom startles at a spot nobody is at anymore */
    section.addEventListener('pointerleave', function () {
      self.px = -1e4; self.py = -1e4; self.pSeen = false; self.ev = null;
    }, { passive: true });

    var onReduced = function (m) { self.reduced = m.matches; self.brain.onMotion(m.matches); };
    if (reduced.addEventListener) reduced.addEventListener('change', onReduced);
    else if (reduced.addListener) reduced.addListener(onReduced);

    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { self.measure(); });
  }

  Terrarium.prototype.toLocal = function (e) {
    var r = this.sec.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top + this.TOP };
  };

  Terrarium.prototype.measure = function () {
    var rect = this.sec.getBoundingClientRect();
    var sTop = this.TOP;   /* geometry lives in CANVAS space: canvas y = section y + TOP */
    var rel = function (el) {
      if (!el) return null;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return {
        x: r.left - rect.left, y: r.top - rect.top + sTop,
        w: r.width, h: r.height,
        cx: r.left - rect.left + r.width / 2,
        cy: r.top - rect.top + r.height / 2 + sTop
      };
    };
    this.geo = {
      cart: rel(this.sec.querySelector('.cartridge')),
      slot: rel(this.sec.querySelector('.cart-slot')),
      text: rel(this.sec.querySelector('.world-text')),
      cta:  rel(this.sec.querySelector('.world-cta'))
    };
  };

  Terrarium.prototype.sizeCanvas = function () {
    var w = this.sec.clientWidth, h = this.sec.clientHeight;
    var cv = this.cv, dpr = this.dpr;
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round((h + this.TOP) * dpr));
    cv.style.position = 'absolute';
    cv.style.top = (-this.TOP) + 'px';
    cv.style.left = '0';
    cv.style.width = w + 'px';
    cv.style.height = (h + this.TOP) + 'px';
    cv.style.pointerEvents = 'none';
    cv.style.zIndex = '2';
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.g.imageSmoothingEnabled = false;
    this.W = w; this.H = h;
    this.mobile = w < 640;
  };

  Terrarium.prototype.onResize = function () {
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 2);   /* browser zoom changes DPR */
    this.measure();
    this.sizeCanvas();
    this.brain.onResize();
  };

  Terrarium.prototype.requestWake = function () {
    this.started = true;
    if (this.sleeper) {
      /* she's mid-nap — let the visitor actually CATCH the sleeping
         act before she stirs: the Zzz keep drifting for a moment,
         then she wakes with a stretch. A tap wakes her instantly. */
      this.dormant = false;
      if (!this.awake) { this.awake = true; this.startLoop(); }
      if (!this.snooze) this.snooze = 1.9;
      return;
    }
    this.dormant = false;
    this.brain.wake();
    if (!this.awake) {
      this.awake = true;
      this.startLoop();
    }
  };

  Terrarium.prototype.sleep = function () {
    if (this.started) {
      this.sleeper = true;
      this.brain.sleep();
    }
  };

  /* the loop — a per-instance closure so `this` stays honest */
  Terrarium.prototype.startLoop = function () {
    var self = this;
    var last = performance.now();
    var frame = function (now) {
      if (!self.awake || self.dormant) { self.awake = false; return; }
      var dt = clamp((now - last) / 1000, 0.001, 0.05);
      last = now;
      self.time += dt;
      if (self.ev) {
        var p = self.toLocal(self.ev);
        self.px = p.x; self.py = p.y; self.pSeen = true;
        self.ev = null;
      }
      if (!self.frozen) { self.brain.tick(dt); self.parts.tick(dt); }
      if (self.snooze) {
        self.snooze -= dt;
        if (self.snooze <= 0) { self.snooze = 0; self.sleeper = false; self.brain.wake(); }
      }
      self.rmT -= dt;
      if (self.rmT <= 0) { self.rmT = .25; self.measure(); }   /* cartridges tilt under hover — keep the aim honest */
      self.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  Terrarium.prototype.render = function () {
    var g = this.g;
    g.clearRect(0, 0, this.W, this.H + this.TOP);
    this.brain.render(g);
    this.parts.render(g);
  };

/* ═════════════════════════════════════════════════════════════
   WORLD 01 — «سکه» Sekkeh, a living 18-karat coin.
   The world's copy calls the digital piggy bank "the beating
   heart of this world" — so its resident is the coin itself:
   it waddles its floor corridor, melts into molten gold
   (طلای آب‌شده) and slides off, feeds nuggets into the
   cartridge slot like it's its own قلک, flips to flash the
   «۱۸» mint mark, bows to the world's gate, and patrols its
   ceiling — one huge rim leap that hangs in mid-air just under
   the checker border, head never leaving its own terrarium.
   ═════════════════════════════════════════════════════════════ */
function makeSekkeh(T) {
  var R = 10;                       /* disc radius, in cells */
  var SC = T.mobile ? 2 : 3;        /* device px per cell    */
  var body = makeCoinSprite(R, SC);
  var TAG = makeDigitsSprite(2);
  var BH = body.height;             /* square sprite incl. margin */
  var LH = 2 * SC;                  /* leg height, device px */

  var st = {
    started: false,
    mode: 'boot', t: 0, dur: 1,
    x: 60, y: 0, plat: 'floor',
    face: 1, tilt: 0, sx: 1, sy: 1,
    spin: 0,                        /* flip rotation, radians */
    air: false, jump: null,
    tx: 0, walkPh: 0, after: 'idle',
    blink: 0, blinking: false, bt: 0, blinkT: rand(2.5, 5),
    lookX: 0, lookY: 0, glance: null, wide: 0, happy: 0,
    cool: {},
    melt: null, nugget: null, patT: 0,
    introDone: false, zT: 0
  };

  function groundY() { return T.H - 12; }
  /* the glass ceiling: the head never pokes above the section's own
     top edge — 2px shy of the checker rim's underside. This is THE
     invariant of the terrarium: the resident is always inside it. */
  function topLim() { return T.TOP + 16 + LH + R * 2 * SC * st.sy; }
  /* feet height for the rim leap's hang: head just under the rim */
  function hangY() { return T.TOP + 17 + LH + R * 2 * SC; }
  function headY() { return st.y - LH - R * 2 * SC * st.sy; }
  function ok(k, cd) { return T.time - (st.cool[k] || -99) > cd; }
  function blocked(x) {
    var g = T.geo;
    if (g.text && x > g.text.x - 34 && x < g.text.x + g.text.w + 34) return true;
    if (g.cta  && x > g.cta.x - 30 && x < g.cta.x + g.cta.w + 30) return true;
    return false;
  }
  function restSpot(notX) {
    var g = T.geo, W = T.W;
    var cands = [36, W - 36];
    if (g.cart) cands.push(g.cart.x - 30, g.cart.x + g.cart.w + 30);
    if (g.slot) cands.push(g.slot.cx - 34, g.slot.cx + 34);
    if (g.cta) {
      if (g.cta.x > 70) cands.push(g.cta.x - 34);
      if (g.cta.x + g.cta.w < W - 70) cands.push(g.cta.x + g.cta.w + 34);
    }
    if (g.text) {
      var gapL, gapR;
      if (g.text.x > W / 2) { gapL = 30; gapR = g.text.x - 20; }
      else { gapL = g.text.x + g.text.w + 20; gapR = W - 30; }
      if (gapR - gapL > 90) cands.push((gapL + gapR) / 2);
    }
    cands.push(rand(40, W - 40));
    for (var tries = 10; tries > 0; tries--) {
      var x = pick(cands);
      if (notX != null && Math.abs(x - notX) < 70) continue;
      if (blocked(x)) continue;
      return clamp(x, 30, W - 30);
    }
    return notX != null ? (notX < W / 2 ? W - 50 : 50) : W / 2;
  }
  /* everyday strolls stay local — short walks mean more decisions
     per minute, so the tricks actually get their stage time */
  function nearSpot(notX) {
    var tx = clamp(st.x + pick([-1, 1]) * rand(150, 340), 40, T.W - 40);
    if (blocked(tx)) tx = clamp(st.x - pick([-1, 1]) * rand(150, 340), 40, T.W - 40);
    if (blocked(tx)) tx = restSpot(notX);
    return tx;
  }

  /* ── motion helpers ─────────────────────────────────────────── */
  function setJump(o) {
    st.jump = { t: 0, dur: o.dur || .4, x0: st.x, x1: o.x1, y0: st.y, y1: o.y1, h: o.h || 0, ez: o.ez || null, landed: o.landed, plat: o.plat || st.plat, after: o.after || null };
    st.face = o.x1 >= st.x ? 1 : -1;
  }
  function setMode(m, dur) { st.mode = m; st.t = 0; st.dur = dur || 1; }
  function goIdle() { st.tilt = 0; setMode('idle', rand(.6, 1.5)); }
  function goWalk(tx, after) {
    st.tx = clamp(tx, 30, T.W - 30);
    st.after = after || 'idle';
    st.jump = null; st.air = false;   /* a walk owns the body — no in-flight jump may keep steering it */
    st.plat = 'floor';
    st.y = groundY();   /* reconcile feet to the platform — no sky-walks */
    st.face = st.tx >= st.x ? 1 : -1;
    setMode('walk');
    T.parts.spawn('dust', st.x - st.face * 6, groundY() - 2);
  }

  /* ── the trick list ─────────────────────────────────────────── */
  function startMelt(tx) {
    st.melt = { ph: 'crouch', t: 0, tx: tx != null ? tx : restSpot(st.x), dripped: false };
    setMode('melt');
  }
  function goMelt() {
    st.cool.melt = T.time;
    var tx = restSpot(st.x);
    /* a deliberate act: stroll to the spot first, then liquefy THERE */
    if (Math.abs(tx - st.x) < 40) startMelt(tx);
    else goWalk(tx, 'meltGo');
  }
  function goDeposit() {
    st.cool.deposit = T.time;
    var slot = T.geo.slot;
    if (!slot) return;
    var sxp = Math.abs(slot.cx - 36) > 30 && !blocked(slot.cx - 36) ? slot.cx - 36 : slot.cx + 36;
    goWalk(clamp(sxp, 30, T.W - 30), 'deposit');
  }
  function goBow() {
    st.cool.bow = T.time;
    setMode('bow');
    st.bowT = 0;
  }
  function goPatrol() {
    st.cool.patrol = T.time;
    goWalk(clamp(st.x + rand(-110, 110), 50, T.W - 50), 'patrolUp');
  }
  function goFlip() {
    st.cool.flip = T.time;
    st.melt = null; st.dep = null;          /* an interrupt tears the props down */
    st.sx = 1; st.sy = 1; st.tilt = 0;
    setMode('flip');
    st.flipT = 0;
  }
  function goStartle() {
    st.cool.startle = T.time;
    var dir = st.x < T.px ? -1 : 1;
    var tx = st.x + dir * rand(56, 88);
    if (Math.abs(tx - st.x) < 20) tx = st.x - dir * 60;
    tx = clamp(tx, 30, T.W - 30);
    T.parts.spawn('bang', st.x, headY() - 10);
    st.wide = 1.1;
    st.happy = 0;
    st.tilt = 0;
    setJump({ x1: tx, y1: T.H - 12, h: 30, dur: .42, plat: 'floor', after: goIdle });
    setMode('startle');
  }
  function choose() {
    var c;
    if (T.reduced) { goIdle(); return; }
    if (!st.firstAct) {
      /* the grand entrance: first act is always a promenade */
      st.firstAct = true;
      goWalk(restSpot(st.x));
      return;
    }
    c = [[14, function () { goWalk(nearSpot(st.x)); }]];
    c.push([7, function () { goIdle(); }]);
    c.push([7, function () { setMode('polish'); st.polT = 0; }]);
    c.push([7, function () { setMode('jig'); st.jigT = 0; }]);
    if (ok('melt', 9)) c.push([20, goMelt]);
    if (ok('deposit', 13) && T.geo.slot) c.push([15, goDeposit]);
    if (ok('bow', 20) && T.geo.cta) c.push([10, goBow]);
    if (ok('patrol', 12)) c.push([17, goPatrol]);
    weighted(c)();
  }

  /* ── arrival dispatch (walk → what comes next) ──────────────── */
  function dispatch(name) {
    if (name === 'idle') { goIdle(); return; }
    if (name === 'meltGo') { startMelt(st.tx); return; }
    if (name === 'deposit') {
      var slot = T.geo.slot;
      if (!slot) { goIdle(); return; }
      st.dep = { ph: 'pick', t: 0 };
      st.happy = 2;
      setMode('deposit');
      return;
    }
    if (name === 'bow') { setMode('bow'); st.bowT = 0; return; }
    if (name === 'patrolUp') {
      /* the rim leap: one huge show-jump at the ceiling of its own
         world — launch, float just under the checker rim to survey
         the territory, then drop back to the floor elsewhere.
         (The old choreography landed ON the rim, which hoisted most
         of the body into the section above — that's a jailbreak.) */
      setMode('patrol');
      st.patPh = 'up';
      st.wide = .9;
      st.lookY = -2;
      setJump({ x1: st.x + pick([-1, 1]) * rand(6, 18), y1: hangY(), h: 0, dur: .52, ez: 'out', plat: 'floor', landed: false, after: function () {
        st.patPh = 'hang';
        st.patT = 0;
        st.hangY = st.y;
      } });
      return;
    }
    goIdle();
  }

  /* ── per-tick ───────────────────────────────────────────────── */
  function tick(dt) {
    st.t += dt;
    if (st.happy > 0) st.happy -= dt;
    if (st.wide > 0) st.wide -= dt;

    /* blinking — the universal sign of being alive.
       Sleepers keep their eyes shut: the nap pauses this machine. */
    if (st.mode !== 'zzz') {
      if (!st.blinking) {
        st.blinkT -= dt;
        if (st.blinkT <= 0) { st.blinking = true; st.bt = 0; }
      } else {
        st.bt += dt;
        st.blink = st.bt < .13 ? 1 : 0;
        if (st.bt >= .13) { st.blinking = false; st.blinkT = rand(2.6, 5.4); }
      }
    }

    /* pupils: watch the pointer when it's near, honor a glance */
    st.lookX = lerp(st.lookX, 0, dt * 4);
    st.lookY = lerp(st.lookY, 0, dt * 4);
    if (st.glance) {
      st.glance.t -= dt;
      var gd = Math.max(1, Math.abs(st.glance.dx) + Math.abs(st.glance.dy));
      st.lookX = st.glance.dx / gd * 2.4;
      st.lookY = st.glance.dy / gd * 2;
      if (st.glance.t <= 0) st.glance = null;
    } else if (T.pSeen && st.mode !== 'startle') {
      var hx = st.x, hy = headY();
      var dd = Math.hypot(T.px - hx, T.py - hy);
      if (dd < 280) {
        st.lookX = clamp((T.px - hx) / 40, -1, 1) * 2.2;
        st.lookY = clamp((T.py - hy) / 40, -1, 1) * 2;
      }
    }

    /* scripted jumps own the body while airborne */
    if (st.jump) {
      var j = st.jump;
      j.t += dt;
      var k = clamp(j.t / j.dur, 0, 1);
      st.x = lerp(j.x0, j.x1, easeOut(k));
      var ky = j.ez === 'out' ? easeOut(k) : (j.ez === 'in' ? easeIn(k) : k);
      st.y = lerp(j.y0, j.y1, ky) - Math.sin(k * Math.PI) * j.h;
      if (st.y < topLim()) st.y = topLim();   /* the glass ceiling holds, every frame */
      st.air = true;
      st.walkPh += dt * 14;
      if (k >= 1) {
        st.jump = null; st.air = false; st.y = j.y1; st.plat = j.plat;
        if (j.landed !== false) T.parts.spawn('dust', st.x - 5, st.y - 1);
        if (j.landed !== false) T.parts.spawn('dust', st.x + 5, st.y - 1);
        var af = j.after; j.after = null;
        if (af) af();
      }
      tapCheck();
      return;
    }

    var m = st.mode;
    if (m === 'idle') {
      if (st.t >= st.dur) choose();
    } else if (m === 'wake') {
      var k2 = clamp(st.t / .7, 0, 1);
      if (k2 < .4) { st.sy = lerp(.8, 1.12, easeOut(k2 / .4)); st.sx = lerp(1.12, .92, k2 / .4); }
      else { st.sy = lerp(1.12, 1, easeOut((k2 - .4) / .6)); st.sx = lerp(.92, 1, (k2 - .4) / .6); }
      if (st.t >= .7) {
        st.sx = 1; st.sy = 1;
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'سکه' });
        }
        goIdle();
      }
    } else if (m === 'walk') {
      var spd = (T.mobile ? 46 : 62) * dt;
      var dx = st.tx - st.x;
      if (Math.abs(dx) <= spd) {
        st.x = st.tx;
        dispatch(st.after);
      } else {
        st.x += (dx > 0 ? spd : -spd);
        st.face = dx > 0 ? 1 : -1;
        st.walkPh += dt * 11;
      }
    } else if (m === 'melt') {
      meltTick(dt);
    } else if (m === 'deposit') {
      depTick(dt);
    } else if (m === 'flip') {
      flipTick(dt);
    } else if (m === 'bow') {
      st.bowT += dt;
      var kb = clamp(st.bowT / 1.6, 0, 1);
      st.tilt = st.face * .27 * Math.pow(Math.sin(kb * Math.PI * 2), 2);
      st.lookX = st.face * 2; st.lookY = 2;
      if (st.bowT >= 1.6) { st.tilt = 0; goIdle(); }
    } else if (m === 'polish') {
      st.polT += dt;
      st.tilt = Math.sin(st.polT * 9) * .06;
      st.blink = 1;
      st.happy = .5;
      if (st.polT > .35 && !st.polS) { st.polS = 0; }
      st.polS = (st.polS || 0) + dt;
      if (st.polS > .42) { st.polS = 0; T.parts.spawn('spark', st.x + st.face * 5 * SC * .5, st.y - LH - R * SC, { up: 10 }); }
      if (st.polT >= 1.35) { st.tilt = 0; st.blink = 0; goIdle(); }
    } else if (m === 'jig') {
      st.jigT += dt;
      if (!st.jigHop && (st.jigT > .05)) {
        st.jigHop = true;
        setJump({ x1: st.x, y1: groundY(), h: 9, dur: .26, after: function () {
          st.tilt = (st.jigN || 0) % 2 ? -.11 : .11;
          st.jigN = (st.jigN || 0) + 1;
          if ((st.jigN || 0) < 3) { st.jigHop = false; st.jigT = 0; }
          else { st.tilt = 0; st.jigN = 0; goIdle(); }
        } });
      }
    } else if (m === 'patrol') {
      patrolTick(dt);
    } else if (m === 'zzz') {
      st.zT += dt;
      if (st.zT > .55 && !T.reduced) {
        st.zT = 0;
        T.parts.spawn('z', st.x + st.face * 8, headY() - 4);
      }
      if (st.t > 1.4 && !T.snooze) { T.dormant = true; return; }
    } else if (m === 'startle') {
      /* body owned by the jump; nothing else to do here */
    }

    /* pointer startle reflex — but never mid-trick, never reduced */
    var busy = (m === 'melt' || m === 'deposit' || m === 'flip' || m === 'zzz' || m === 'startle');
    if (!busy && !T.reduced && !st.jump && T.pSeen && ok('startle', 5)) {
      var px = T.px, py = T.py;
      if (Math.hypot(px - st.x, py - (st.y - R * SC)) < 64) goStartle();
    }

    tapCheck();
  }

  /* taps: flip on the coin itself, a curious glance elsewhere */
  function tapCheck() {
    if (!T.tap) return;
    var t = T.tap;
    T.tap = null;
    var near = Math.hypot(t.x - st.x, t.y - (st.y - R * SC)) < 52;
    if (near) {
      if (st.mode === 'zzz') { wakeNow(); return; }
      if (st.mode === 'melt' && st.melt && (st.melt.ph === 'puddle' || st.melt.ph === 'slide' || st.melt.ph === 'gather')) {
        st.melt.ph = 'pop'; st.melt.t = 0; return;
      }
      /* mid-show? a tap just delights — never yanks the body down */
      if (st.mode === 'patrol') { st.happy = Math.max(st.happy, 1.5); return; }
      if (st.mode !== 'flip' && ok('flip', 2.2) && !st.jump) { goFlip(); return; }
    }
    if (!st.glance) {
      st.glance = { dx: t.x - st.x, dy: t.y - headY(), t: .9 };
    }
  }

  /* ── melt: طلای آب‌شده — the signature ─────────────────────── */
  function meltTick(dt) {
    var M = st.melt;
    M.t += dt;
    if (M.ph === 'crouch') {
      st.sy = lerp(1, .8, M.t / .3);
      st.sx = lerp(1, 1.12, M.t / .3);
      st.blink = 1;
      if (M.t >= .3) { M.ph = 'collapse'; M.t = 0; }
    } else if (M.ph === 'collapse') {
      var kc = clamp(M.t / .55, 0, 1);
      st.sy = lerp(.8, .13, easeIn(kc));
      st.sx = lerp(1.12, 1.5, kc);
      if (!M.d1 && kc > .3) { M.d1 = 1; T.parts.spawn('drip', st.x - 8, st.y - 10); T.parts.spawn('drip', st.x + 9, st.y - 6); }
      if (!M.d2 && kc > .7) { M.d2 = 1; T.parts.spawn('drip', st.x + 2, st.y - 4); }
      if (kc >= 1) { M.ph = 'puddle'; M.t = 0; st.sx = 1; st.sy = 1; }
    } else if (M.ph === 'puddle') {
      st.blink = 0;
      if (M.t >= .55) {
        M.ph = 'slide'; M.t = 0;
        st.face = M.tx >= st.x ? 1 : -1;
      }
    } else if (M.ph === 'slide') {
      var spd = 46 * dt;
      var dx = M.tx - st.x;
      if (Math.abs(dx) <= spd) { st.x = M.tx; M.ph = 'gather'; M.t = 0; }
      else st.x += (dx > 0 ? spd : -spd);
    } else if (M.ph === 'gather') {
      if (M.t >= .45) { M.ph = 'pop'; M.t = 0; }
    } else if (M.ph === 'pop') {
      var kp = clamp(M.t / .4, 0, 1);
      st.sy = kp < .6 ? lerp(.25, 1.18, easeOut(kp / .6)) : lerp(1.18, 1, easeOut((kp - .6) / .4));
      st.sx = kp < .6 ? lerp(1.35, .94, easeOut(kp / .6)) : lerp(.94, 1, (kp - .6) / .4);
      if (kp < .2 && !M.popped) {
        M.popped = true;
        for (var i = 0; i < 6; i++) T.parts.spawn('spark', st.x + rand(-14, 14), st.y - rand(6, 30), { up: 14 });
      }
      if (kp >= 1) {
        st.sx = 1; st.sy = 1; st.melt = null;
        st.happy = 2;
        goIdle();
      }
    }
  }

  /* ── deposit: a nugget into the cartridge slot (its قلک) ────── */
  function depTick(dt) {
    var D = st.dep, slot = T.geo.slot;
    D.t += dt;
    if (D.ph === 'pick') {
      st.sy = lerp(1, .88, Math.min(1, D.t / .2));
      if (D.t > .12 && !D.nug) {
        D.nug = { ph: 'rise', t: 0 };
      }
      if (D.nug && D.nug.ph === 'rise') D.nug.t += dt;
      if (D.t >= .35) { D.ph = 'toss'; D.t = 0; D.nug = { ph: 'fly', t: 0 }; }
    } else if (D.ph === 'toss') {
      st.sy = lerp(.88, 1.04, D.t / .5);
      var kt = clamp(D.t / .5, 0, 1);
      D.nug.t = kt;
      if (kt >= 1) {
        D.ph = 'pat'; D.t = 0;
        st.sy = 1;
        var sc2 = SC;
        for (var i = 0; i < 5; i++) T.parts.spawn('spark', slot.cx + rand(-8, 8), slot.cy + rand(-4, 4), { up: 8 });
        T.parts.spawn('flash', slot.x, slot.y, { s: slot.w, life: .3 });
        st.happy = 2.5;
      }
    } else if (D.ph === 'pat') {
      st.tilt = Math.sin(D.t * 10) * .09;
      if (D.t >= .6) {
        D.ph = 'hop'; D.t = 0; st.tilt = 0;
        setJump({ x1: st.x, y1: groundY(), h: 12, dur: .32, after: goIdle });
        st.dep = null;
      }
    }
  }

  /* ── flip: show the mint mark ───────────────────────────────── */
  function flipTick(dt) {
    var f = st.flipT += dt;
    if (f < .16) { st.sy = lerp(1, .8, f / .16); st.sx = lerp(1, 1.12, f / .16); }
    else if (f < .71) {
      var k = (f - .16) / .55;
      st.spin = k * Math.PI * 2;
      st.y = groundY() - Math.sin(k * Math.PI) * 14;
      st.air = true;
      st.sx = 1; st.sy = 1;
    } else if (f < .9) {
      st.spin = 0; st.air = false;
      st.y = groundY();
      var kl = (f - .71) / .19;
      st.sy = lerp(.86, 1, kl); st.sx = lerp(1.1, 1, kl);
    } else {
      st.spin = 0; st.sx = 1; st.sy = 1;
      if (!st.flipped) {
        st.flipped = true;
        T.parts.spawn('tag18', st.x, headY() - 12);
        T.parts.spawn('spark', st.x - 12, st.y - 20, { up: 10 });
        T.parts.spawn('spark', st.x + 12, st.y - 26, { up: 10 });
        st.happy = 2;
      }
      if (f >= 1.1) { st.flipped = false; goIdle(); }
    }
  }

  /* ── patrol: the hang under the rim, then the drop ───────────── */
  function patrolTick(dt) {
    if (st.patPh === 'hang') {
      st.patT += dt;
      st.air = true;
      st.y = Math.max(st.hangY, topLim()) + 2 + Math.sin(st.patT * 9) * 2;
      st.lookX = Math.sin(st.patT * 4.2) * 2.2;
      st.lookY = -1.4;
      if (Math.random() < dt * 3) T.parts.spawn('spark', st.x + rand(-10, 10), st.y - R * 2 * SC - 4, { up: 6 });
      if (st.patT > .55) {
        var dir = pick([-1, 1]);
        var tx = clamp(st.x + dir * rand(90, 170), 30, T.W - 30);
        if (blocked(tx)) tx = st.x;
        st.patPh = 'down';
        st.air = false;
        st.lookY = 0;
        setJump({ x1: tx, y1: groundY(), h: 0, dur: .48, ez: 'in', plat: 'floor', after: goIdle });
      }
    }
  }

  function wakeNow() {
    T.snooze = 0; T.sleeper = false;
    if (T.reduced) { goIdle(); return; }
    setMode('wake');
  }

  /* ── the body ───────────────────────────────────────────────── */
  function render(g) {
    var gy = groundY();
    var melted = st.mode === 'melt' && st.melt &&
      (st.melt.ph === 'puddle' || st.melt.ph === 'slide' || st.melt.ph === 'gather');

    if (!melted) {
      var airH = Math.max(0, gy - st.y);
      var sw = R * 2.2 * SC * st.sx * clamp(1 - airH / 130, .5, 1);
      g.globalAlpha = clamp(.17 - airH * .0007, .05, .17);
      g.fillStyle = INK;
      g.fillRect(Math.round(st.x - sw / 2), Math.round(gy - 2), Math.round(sw), 3);
      g.globalAlpha = 1;
    }

    if (melted) drawPuddle(g);
    else {
      if (st.dep && st.dep.nug && st.dep.nug.ph === 'rise') drawNugget(g, true);
      drawBody(g);
      if (st.dep && st.dep.nug && st.dep.nug.ph === 'fly') drawNugget(g, false);
    }
  }

  function drawBody(g) {
    var legH = st.air ? LH * .6 : LH;
    var bob = (st.mode === 'walk' || st.air) ? Math.abs(Math.sin(st.walkPh)) * SC * .4 : 0;
    var rx = R * SC * st.sx, ry = R * SC * st.sy;
    var cx = st.x;
    var bodyBottom = st.y - legH - bob;
    var cy = bodyBottom - ry;

    /* legs — stubby, alternate while waddling, tucked in air */
    g.fillStyle = INK;
    var liftA = 0, liftB = 0;
    if (st.air) { liftA = SC * .5; liftB = SC * .5; }
    else if (st.mode === 'walk') {
      liftA = Math.max(0, Math.sin(st.walkPh)) * SC * .7;
      liftB = Math.max(0, -Math.sin(st.walkPh)) * SC * .7;
    }
    var lx1 = Math.round(cx - 4.2 * SC), lx2 = Math.round(cx + 3.2 * SC);
    var wLeg = Math.max(2, SC);
    g.fillRect(lx1, Math.round(bodyBottom), wLeg, Math.round(st.y - liftA - bodyBottom));
    g.fillRect(lx2, Math.round(bodyBottom), wLeg, Math.round(st.y - liftB - bodyBottom));

    g.save();
    g.translate(Math.round(cx), Math.round(cy));
    g.rotate(st.tilt);
    g.imageSmoothingEnabled = false;
    var spinC = st.spin ? Math.cos(st.spin) : 1;
    var w = BH * st.sx, h = BH * st.sy;
    if (st.spin) w = Math.max(8, BH * Math.abs(spinC));
    g.drawImage(body, -w / 2, -h / 2, w, h);

    if (st.spin && spinC < 0) {
      /* the back face: the «۱۸» mint mark — squeezed with the sliver */
      var dw = TAG.width * (w / BH), dh = TAG.height * st.sy;
      g.drawImage(TAG, -dw / 2, -dh / 2 - SC * .3, dw, dh);
    } else {
      drawFace(g);
    }
    g.restore();
  }

  function drawFace(g) {
    var s = SC;
    var sx = st.sx, sy = st.sy;
    var ex = 3.1 * s * sx;
    var ey = -1.7 * s * sy;
    var ew = Math.max(2, 1.9 * s * sx);
    var ehBase = 3.1 * s * (st.wide > 0 ? 1.3 : 1) * (1 - st.blink * .92);
    var eh = Math.max(2, ehBase * sy);
    g.fillStyle = INK;
    g.fillRect(-ex - ew / 2, ey - eh / 2, ew, eh);
    g.fillRect(ex - ew / 2, ey - eh / 2, ew, eh);
    if (!st.blink && st.wide <= 0) {
      g.fillStyle = '#ffffff';
      g.fillRect(-ex - ew * .1, ey - eh * .34, Math.max(1, s * .7), Math.max(1, s * .7));
      g.fillRect(ex - ew * .1, ey - eh * .34, Math.max(1, s * .7), Math.max(1, s * .7));
    }
    /* cheeks */
    g.globalAlpha = .65;
    g.fillStyle = CHEEK;
    g.fillRect(-5.6 * s * sx, .6 * s * sy, 1.5 * s, 1.1 * s);
    g.fillRect(4.1 * s * sx, .6 * s * sy, 1.5 * s, 1.1 * s);
    g.globalAlpha = 1;
    /* mouth */
    g.fillStyle = INK;
    if (st.happy > 0) {
      g.fillRect(-2 * s * sx, 1.7 * s * sy, 1.1 * s, .9 * s);
      g.fillRect(-.5 * s * sx, 2.3 * s * sy, 1.1 * s, .9 * s);
      g.fillRect(1 * s * sx, 1.7 * s * sy, 1.1 * s, .9 * s);
    } else {
      g.fillRect(-1 * s * sx, 2.1 * s * sy, 2 * s, Math.max(1.5, .7 * s));
    }
  }

  function drawPuddle(g) {
    var M = st.melt;
    var gy = groundY();
    var pw = 26 * SC;                     /* full spread — wider than the coin */
    if (M.ph === 'puddle') pw *= easeOut(clamp(M.t / .5, 0, 1));
    if (M.ph === 'gather') pw *= lerp(1, .3, clamp(M.t / .45, 0, 1));
    pw *= 1 + .05 * Math.sin(T.time * 6.3);
    var rows = [.6, .86, 1, .93, .6];
    var rh = (3.6 * SC) / rows.length;
    var topY = gy - rows.length * rh;
    for (var r = 0; r < rows.length; r++) {
      var w = pw * rows[r];
      var y = topY + r * rh;
      g.fillStyle = INK;
      g.fillRect(Math.round(st.x - w / 2 - 1), Math.round(y - 1), Math.round(w + 2), Math.round(rh + 2));
      var col = (r >= 1 && r < rows.length - 1) ? GOLD : (r === 0 ? '#e5c85c' : GOLD_LO);
      g.fillStyle = col;
      g.fillRect(Math.round(st.x - w / 2), Math.round(y), Math.round(w), Math.round(rh));
    }
    /* shimmer cells — the puddle is alive */
    for (var i = 0; i < 3; i++) {
      if (Math.sin(T.time * 7 + i * 2.1) > .55) {
        g.fillStyle = '#ffffff';
        g.fillRect(Math.round(st.x + Math.sin(i * 2.7 + T.time) * pw * .3), Math.round(topY + 1), 2, 2);
      }
    }
    /* a tiny contented face rides the puddle */
    var fy = topY + rh * 1.1;
    var ec = 2.6 * SC * .55;
    var eyeH = st.blink ? 1.5 : SC * 1.2;
    g.fillStyle = INK;
    g.fillRect(st.x - 2.6 * SC - ec / 2, fy, ec, eyeH);
    g.fillRect(st.x + 2.6 * SC - ec / 2, fy, ec, eyeH);
    var mw = Math.max(2, SC * .8);
    g.fillRect(st.x - 2.2 * SC, fy + eyeH + 1.5, mw, 1.8);
    g.fillRect(st.x - mw / 2, fy + eyeH + 3, mw, 1.8);
    g.fillRect(st.x + 2.2 * SC - mw, fy + eyeH + 1.5, mw, 1.8);
  }

  function drawNugget(g, behind) {
    var D = st.dep, slot = T.geo.slot;
    if (!D || !D.nug || !slot) return;
    var u = SC;
    var fromX = st.x + st.face * 3 * u;
    var fromY = st.y - LH - 5.5 * u;
    var x, y;
    if (D.nug.ph === 'rise') {
      var k = clamp(D.nug.t / .23, 0, 1);
      x = fromX;
      y = lerp(st.y + 4, fromY, easeOut(k));
      if (behind) { g.globalAlpha = .95; }
    } else {
      var kt = clamp(D.nug.t, 0, 1);
      x = lerp(fromX, slot.cx, kt);
      y = lerp(fromY, slot.cy, kt) - Math.sin(kt * Math.PI) * 26;
    }
    g.fillStyle = INK;
    g.fillRect(Math.round(x - 2 * u / 2 - 1), Math.round(y - 1), Math.round(2 * u + 2), Math.round(1.5 * u + 2));
    g.fillStyle = GOLD;
    g.fillRect(Math.round(x - u), Math.round(y - .75 * u), Math.round(2 * u), Math.round(1.5 * u));
    g.fillStyle = GOLD_HI;
    g.fillRect(Math.round(x - u), Math.round(y - .75 * u), Math.round(u * .7), Math.round(u * .5));
    g.globalAlpha = 1;
  }

  /* ── brain API ──────────────────────────────────────────────── */
  return {
    tick: tick,
    render: render,
    wake: function () {
      T.dormant = false;
      st.blink = 0; st.blinking = false; st.blinkT = rand(1, 2);
      st.happy = 1.2;                        /* contented to see you */
      if (!st.started) {
        st.started = true;
        st.plat = 'floor';
        st.y = groundY();
        var g = T.geo, x0 = null;
        if (g.cart) {
          var c1 = g.cart.cx + g.cart.w / 2 + 56, c2 = g.cart.cx - g.cart.w / 2 - 56;
          if (!blocked(c1) && c1 < T.W - 40) x0 = c1;
          else if (!blocked(c2) && c2 > 40) x0 = c2;
        }
        if (x0 == null) x0 = !blocked(T.W / 2) ? T.W / 2 : (T.W - 60);
        st.x = clamp(x0, 40, T.W - 40);
        st.face = (g.cart && st.x > g.cart.cx) ? -1 : 1;
      } else {
        st.plat = 'floor';
        st.y = groundY();
      }
      if (T.reduced) {
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'سکه' });
        }
        goIdle();
        return;
      }
      setMode('wake');
    },
    sleep: function () {
      if (st.mode === 'zzz') return;
      st.jump = null; st.air = false;
      st.melt = null; st.dep = null;
      st.sx = .94; st.sy = .92; st.blink = 1; st.tilt = 0; st.spin = 0;
      st.y = groundY();   /* naps happen on the ground, never mid-air */
      setMode('zzz');
      st.zT = 0;
    },
    onResize: function () {
      var ns = T.mobile ? 2 : 3;
      if (ns !== SC) {
        SC = ns;
        body = makeCoinSprite(R, SC);
        TAG = makeDigitsSprite(2);
        BH = body.height;
        LH = 2 * SC;
      }
      st.x = clamp(st.x, 30, T.W - 30);
      if (st.mode !== 'zzz' && st.mode !== 'boot') st.y = groundY();
      if (st.mode === 'melt') { st.melt = null; st.sx = 1; st.sy = 1; goIdle(); }
    },
    onMotion: function (red) {
      if (red) {
        st.jump = null; st.melt = null; st.dep = null;
        st.tilt = 0; st.spin = 0; st.sx = 1; st.sy = 1;
        goIdle();
      }
    },
    force: function (what) {
      if (what === 'freeze') { T.frozen = true; return; }
      if (what === 'thaw') { T.frozen = false; return; }
      if (what === 'st') return { mode: st.mode, ph: st.melt ? st.melt.ph : (st.dep ? st.dep.ph : st.patPh), x: Math.round(st.x), y: Math.round(st.y), plat: st.plat, face: st.face };
      if (what === 'melt') { goMelt(); }
      else if (what === 'deposit') {
        var slot = T.geo.slot;
        if (!slot) return;
        var sxp = Math.abs(slot.cx - 36) > 30 && !blocked(slot.cx - 36) ? slot.cx - 36 : slot.cx + 36;
        goWalk(clamp(sxp, 30, T.W - 30), 'deposit');
      }
      else if (what === 'flip') goFlip();
      else if (what === 'patrol') goPatrol();
      else if (what === 'bow') {
        var cta = T.geo.cta;
        if (!cta) return;
        var bx = cta.x > 70 ? cta.x - 30 : cta.x + cta.w + 30;
        goWalk(clamp(bx, 30, T.W - 30), 'bow');
      }
      else if (what === 'walk') goWalk(restSpot(st.x));
      else if (what === 'startle') { T.pSeen = true; goStartle(); }
      else if (what === 'jig') { setMode('jig'); st.jigT = 0; st.jigHop = false; }
      else if (what === 'polish') { setMode('polish'); st.polT = 0; }
      /* warps — freeze a mid-trick frame for inspection */
      else if (what === 'warp:melt') { st.jump = null; st.air = false; st.plat = 'floor'; st.y = groundY('floor'); st.sx = 1; st.sy = 1; st.melt = { ph: 'puddle', t: .3, tx: st.x }; setMode('melt'); }
      else if (what === 'warp:toss') { st.jump = null; st.plat = 'floor'; st.y = groundY('floor'); st.mode = 'deposit'; st.dep = { ph: 'toss', t: .25, nug: { ph: 'fly', t: .5 } }; }
      else if (what === 'warp:spin') {
        st.jump = null; st.mode = 'flip'; st.flipT = .44; st.melt = null; st.dep = null;
        var ks = (.44 - .16) / .55;
        st.spin = ks * Math.PI * 2;
        st.plat = 'floor'; st.y = groundY('floor') - Math.sin(ks * Math.PI) * 14;
        st.air = true; st.sx = 1; st.sy = 1;
      }
      else if (what === 'warp:hang') { st.jump = null; st.melt = null; st.dep = null; st.plat = 'floor'; st.y = hangY(); st.hangY = st.y; st.mode = 'patrol'; st.patPh = 'hang'; st.patT = .2; }
    }
  };
}

/* ═════════════════════════════════════════════════════════════
   WORLD 02 — «الماس» Almas, the flawless diamond of طلاشو.
   The world's copy opens with "دنیای دوم، ویترین است" — this
   world IS a shop window, so its resident is the exhibit: a
   brilliant-cut diamond set in a royal-purple vitrine.
   She is lowered in by the vitrine light for her debut, prances
   on glint dust, splits that light into a rainbow fan
   (شکستِ نور) that pools on the floor, spins on her point like
   a jewelry-box ballerina — her pavilion hides the
   hearts-and-arrows heart every brilliant cut keeps on its
   back face — receives a tiny gold crown, adds a pearl to the
   world's collection through the cartridge slot, poses in
   mid-air just under the checker rim as her runway moment
   (inside the vitrine, always), curtsies to the world's gate,
   lets a band of light glide across her facets, and sleeps on
   a velvet cushion under pixel Zzz.
   ═════════════════════════════════════════════════════════════ */
function makeAlmas(T) {
  var HW = 9;                       /* half width at the girdle, cells */
  var CR = 5;                       /* crown rows */
  var PV = 8;                       /* pavilion rows */
  var SC = T.mobile ? 2 : 3;        /* device px per cell */

  /* palette — struck from World 02's own vitrine */
  var INK   = '#2a0c2c';            /* the section's own shadow ink */
  var DIAM  = '#e6eef8';
  var D_HI  = '#ffffff';
  var D_MID = '#cfdcec';
  var D_LO  = '#b6c4d8';
  var D_DK  = '#95a5bf';
  var ICE   = '#bcd9f2';            /* the cool flash facet under the table */
  var CHEEK = '#e9a9c4';
  var CGOLD = '#d4af37';            /* the brand's gold — her crown */
  var CGOLD_HI = '#f2dc82';
  var ROSE  = '#e05c8a';            /* hearts-and-arrows heart + crown ruby */
  var VELVET = '#5b3a7e';
  var VELVET_HI = '#7a4fa8';
  var RAINBOW = ['#ff6b81', '#ffb35c', '#ffe45c', '#7fe3a0', '#6bb8ff', '#b28aff'];

  /* ── the gem's body, prerendered once per scale ───────────────
     a brilliant cut, front view: table on top, a full girdle
     band, the pavilion falling to the culet. Facets are column
     bands that follow the profile — light from the left, a cool
     ice core down the crown, a bright arrow column down the
     pavilion, and two fixed glints stamped on the table. */
  function makeGemSprite(hw, cr, pv, sc, sil) {
    var W = hw * 2 + 1, H = cr + pv + 1;
    var cx = hw, pad = 2;
    var cv = doc.createElement('canvas');
    cv.width = (W + pad * 2) * sc;
    cv.height = (H + pad * 2) * sc;
    var g = cv.getContext('2d');
    function halfW(j) {
      if (j < 0 || j >= H) return -1;
      if (j < cr) return 3.4 + (hw - 3.4) * (j / (cr - .9));
      if (j === cr) return hw;
      return hw * (1 - (j - cr) / pv);
    }
    function facet(j, r) {
      if (j < cr) {
        if (r < -.62) return D_HI;
        if (r < -.18) return DIAM;
        if (r < .3) return ICE;
        if (r < .68) return D_MID;
        return D_LO;
      }
      if (Math.abs(r) < .16) return D_MID;   /* the arrow column */
      if (r < -.55) return D_MID;
      if (r > .58) return D_DK;
      return D_LO;
    }
    for (var j = 0; j < H; j++) {
      var hwj = halfW(j);
      if (hwj < 0) continue;
      for (var i = 0; i < W; i++) {
        var dx = i - cx;
        if (Math.abs(dx) > hwj) continue;
        var col;
        if (j === cr) col = sil ? '#ffffff' : INK;   /* the girdle band */
        else {
          var nUp = j > 0 ? Math.abs(dx) <= halfW(j - 1) : false;
          var nDn = j < H - 1 ? Math.abs(dx) <= halfW(j + 1) : false;
          var nL = Math.abs(dx - 1) <= hwj;
          var nR = Math.abs(dx + 1) <= hwj;
          if (!nUp || !nDn || !nL || !nR) col = sil ? '#ffffff' : INK;
          else col = sil ? '#ffffff' : facet(j, dx / hwj);
        }
        g.fillStyle = col;
        g.fillRect((pad + i) * sc, (pad + j) * sc, sc, sc);
      }
    }
    if (!sil) {
      g.fillStyle = '#ffffff';   /* two fixed table glints — the die stamp */
      g.fillRect((pad + cx - 3) * sc, (pad + 1) * sc, sc, sc);
      g.fillRect((pad + cx - 2) * sc, (pad) * sc, sc, sc);
    }
    return cv;
  }

  /* her crown — three points, a ruby, the brand's gold */
  var CROWN_MAP = ['C...C...C', 'CC..C..CC', 'CCCCRCCCC', 'CHHHHHHHC', 'CCCCCCCCC'];
  function makeCrownSprite(sc) {
    var cell = Math.max(2, Math.round(sc * .8));
    var cv = doc.createElement('canvas');
    cv.width = 9 * cell + 2; cv.height = 5 * cell + 2;
    var g = cv.getContext('2d');
    var cols = { C: CGOLD, H: CGOLD_HI, R: ROSE };
    for (var j = 0; j < CROWN_MAP.length; j++)
      for (var i = 0; i < 9; i++) {
        var ch = CROWN_MAP[j].charAt(i);
        if (ch === '.') continue;
        g.fillStyle = cols[ch];
        g.fillRect(i * cell + 1, j * cell + 1, cell, cell);
      }
    return cv;
  }

  var body = makeGemSprite(HW, CR, PV, SC, false);
  var shine = makeGemSprite(HW, CR, PV, SC, true);   /* silhouette for the glimmer */
  var CROWN = makeCrownSprite(SC);
  var BW = body.width, BH = body.height;
  var LH = 2 * SC;                  /* leg height, device px */
  var glimCv = doc.createElement('canvas');
  glimCv.width = BW; glimCv.height = BH;
  var glimG = glimCv.getContext('2d');

  var st = {
    started: false,
    mode: 'boot', t: 0, dur: 1,
    x: 60, y: 0, plat: 'floor',
    face: 1, tilt: 0, sx: 1, sy: 1,
    spin: 0, air: false, jump: null,
    tx: 0, walkPh: 0, after: 'idle',
    blink: 0, blinking: false, bt: 0, blinkT: rand(2.5, 5),
    lookX: 0, lookY: 0, glance: null, wide: 0, happy: 0,
    cool: {},
    prism: null, pearl: null, crownA: null, glim: null,
    cushion: 0, introDone: false, zT: 0
  };

  function groundY() { return T.H - 12; }
  /* the glass ceiling: the head never pokes above the section's own
     top edge — 2px shy of the checker rim's underside. This is THE
     invariant of the terrarium: the resident is always inside it. */
  function topLim() { return T.TOP + 16 + LH + BH * st.sy; }
  /* feet height for the rim leap's hang: head just under the rim */
  function hangY() { return T.TOP + 17 + LH + BH; }
  function headY() { return st.y - LH - BH * st.sy; }
  function ok(k, cd) { return T.time - (st.cool[k] || -99) > cd; }
  function blocked(x) {
    var g = T.geo;
    if (g.text && x > g.text.x - 34 && x < g.text.x + g.text.w + 34) return true;
    if (g.cta  && x > g.cta.x - 30 && x < g.cta.x + g.cta.w + 30) return true;
    return false;
  }
  function restSpot(notX) {
    var g = T.geo, W = T.W;
    var cands = [36, W - 36];
    if (g.cart) cands.push(g.cart.x - 30, g.cart.x + g.cart.w + 30);
    if (g.slot) cands.push(g.slot.cx - 34, g.slot.cx + 34);
    if (g.cta) {
      if (g.cta.x > 70) cands.push(g.cta.x - 34);
      if (g.cta.x + g.cta.w < W - 70) cands.push(g.cta.x + g.cta.w + 34);
    }
    if (g.text) {
      var gapL, gapR;
      if (g.text.x > W / 2) { gapL = 30; gapR = g.text.x - 20; }
      else { gapL = g.text.x + g.text.w + 20; gapR = W - 30; }
      if (gapR - gapL > 90) cands.push((gapL + gapR) / 2);
    }
    cands.push(rand(40, W - 40));
    for (var tries = 10; tries > 0; tries--) {
      var x = pick(cands);
      if (notX != null && Math.abs(x - notX) < 70) continue;
      if (blocked(x)) continue;
      return clamp(x, 30, W - 30);
    }
    return notX != null ? (notX < W / 2 ? W - 50 : 50) : W / 2;
  }
  /* everyday strolls stay local — short walks mean more decisions
     per minute, so the tricks actually get their stage time */
  function nearSpot(notX) {
    var tx = clamp(st.x + pick([-1, 1]) * rand(150, 340), 40, T.W - 40);
    if (blocked(tx)) tx = clamp(st.x - pick([-1, 1]) * rand(150, 340), 40, T.W - 40);
    if (blocked(tx)) tx = restSpot(notX);
    return tx;
  }

  /* ── motion helpers ─────────────────────────────────────────── */
  function setJump(o) {
    st.jump = { t: 0, dur: o.dur || .4, x0: st.x, x1: o.x1, y0: st.y, y1: o.y1, h: o.h || 0, ez: o.ez || null, landed: o.landed, plat: o.plat || st.plat, after: o.after || null };
    st.face = o.x1 >= st.x ? 1 : -1;
  }
  function setMode(m, dur) { st.mode = m; st.t = 0; st.dur = dur || 1; }
  function goIdle() { st.tilt = 0; setMode('idle', rand(.6, 1.5)); }
  function goWalk(tx, after) {
    st.tx = clamp(tx, 30, T.W - 30);
    st.after = after || 'idle';
    st.jump = null; st.air = false;   /* a walk owns the body — no in-flight jump may keep steering it */
    st.plat = 'floor';
    st.y = groundY();   /* reconcile feet to the platform — no sky-walks */
    st.face = st.tx >= st.x ? 1 : -1;
    setMode('walk');
    T.parts.spawn('gdust', st.x - st.face * 6, groundY() - 2);
  }

  /* ── the trick list ─────────────────────────────────────────── */
  function goPrism() { st.cool.prism = T.time; st.prism = { t: 0, lit: false }; setMode('prism'); }
  function goSpin() {
    st.cool.spin = T.time;
    st.prism = null; st.pearl = null; st.crownA = null;   /* an interrupt tears the props down */
    st.glim = null; st.tilt = 0;
    st.spinT = 0; st.spin = 0; st.sparked = 0; st.sparked2 = 0;
    st.sx = 1; st.sy = 1;
    setMode('spin');
  }
  function goCrown() { st.cool.crownA = T.time; st.crownA = { ph: 'descend', t: 0, cy: 0, a: 1 }; setMode('crown'); }
  function goPearl() {
    st.cool.pearl = T.time;
    var slot = T.geo.slot;
    if (!slot) return;
    var sxp = Math.abs(slot.cx - 36) > 30 && !blocked(slot.cx - 36) ? slot.cx - 36 : slot.cx + 36;
    goWalk(clamp(sxp, 30, T.W - 30), 'pearl');
  }
  function goCatwalk() { st.cool.catwalk = T.time; goWalk(clamp(st.x + rand(-110, 110), 50, T.W - 50), 'catwalkUp'); }
  function goCurtsy() {
    st.cool.curtsy = T.time;
    var cta = T.geo.cta;
    if (!cta) { goIdle(); return; }
    var bx = cta.x > 70 ? cta.x - 30 : cta.x + cta.w + 30;
    goWalk(clamp(bx, 30, T.W - 30), 'curtsy');
  }
  function goGlim() { st.cool.glim = T.time; st.glim = { t: 0, s: 0 }; setMode('glim'); }
  function goStartle() {
    st.cool.startle = T.time;
    var dir = st.x < T.px ? -1 : 1;
    var tx = st.x + dir * rand(56, 88);
    if (Math.abs(tx - st.x) < 20) tx = st.x - dir * 60;
    tx = clamp(tx, 30, T.W - 30);
    T.parts.spawn('bang', st.x, headY() - 10);
    st.wide = 1.1;
    st.happy = 0;
    st.glim = null; st.tilt = 0;
    for (var i = 0; i < 4; i++) T.parts.spawn('gdust', st.x + rand(-10, 10), st.y - rand(4, 20));
    setJump({ x1: tx, y1: T.H - 12, h: 30, dur: .42, plat: 'floor', after: goIdle });
    setMode('startle');
  }
  function choose() {
    var c;
    if (T.reduced) { goIdle(); return; }
    if (!st.firstAct) {
      st.firstAct = true;
      goWalk(restSpot(st.x));
      return;
    }
    c = [[13, function () { goWalk(nearSpot(st.x)); }]];
    c.push([6, function () { goIdle(); }]);
    c.push([8, goGlim]);
    if (ok('spin', 7)) c.push([10, goSpin]);
    if (ok('prism', 10)) c.push([18, goPrism]);
    if (ok('pearl', 14) && T.geo.slot) c.push([13, goPearl]);
    if (ok('crownA', 18)) c.push([10, goCrown]);
    if (ok('catwalk', 13)) c.push([16, goCatwalk]);
    if (ok('curtsy', 22) && T.geo.cta) c.push([9, goCurtsy]);
    weighted(c)();
  }

  /* ── arrival dispatch (walk → what comes next) ──────────────── */
  function dispatch(name) {
    if (name === 'idle') { goIdle(); return; }
    if (name === 'pearl') {
      var slot = T.geo.slot;
      if (!slot) { goIdle(); return; }
      st.pearl = { ph: 'pick', t: 0, pearl: null };
      st.happy = 1.5;
      setMode('pearl');
      return;
    }
    if (name === 'catwalkUp') {
      /* the rim leap, diva edition: one huge show-jump at the ceiling
         of her own vitrine — launch, a runway pose in mid-air just
         under the checker rim, then drop back to the floor elsewhere.
         (Strutting ON the rim hoisted most of her into the section
         above — that's a jailbreak, and a diva never leaves the
         vitrine.) */
      setMode('catwalk');
      st.patPh = 'up';
      st.wide = .8;
      st.lookY = -2;
      setJump({ x1: st.x + pick([-1, 1]) * rand(6, 18), y1: hangY(), h: 0, dur: .55, ez: 'out', plat: 'floor', landed: false, after: function () {
        st.patPh = 'poseAir';
        st.patT = 0;
        st.hangY = st.y;
      } });
      return;
    }
    if (name === 'curtsy') { setMode('curtsy'); st.curT = 0; st.curS = 0; return; }
    goIdle();
  }

  /* ── per-tick ───────────────────────────────────────────────── */
  function tick(dt) {
    st.t += dt;
    if (st.happy > 0) st.happy -= dt;
    if (st.wide > 0) st.wide -= dt;
    if (st.mode !== 'zzz' && st.cushion > 0) st.cushion = Math.max(0, st.cushion - dt * 3);

    /* blinking — the universal sign of being alive.
       Sleepers keep their eyes shut: the nap pauses this machine. */
    if (st.mode !== 'zzz') {
      if (!st.blinking) {
        st.blinkT -= dt;
        if (st.blinkT <= 0) { st.blinking = true; st.bt = 0; }
      } else {
        st.bt += dt;
        st.blink = st.bt < .13 ? 1 : 0;
        if (st.bt >= .13) { st.blinking = false; st.blinkT = rand(2.6, 5.4); }
      }
    }

    /* pupils: watch the pointer when it's near, honor a glance */
    st.lookX = lerp(st.lookX, 0, dt * 4);
    st.lookY = lerp(st.lookY, 0, dt * 4);
    if (st.glance) {
      st.glance.t -= dt;
      var gd = Math.max(1, Math.abs(st.glance.dx) + Math.abs(st.glance.dy));
      st.lookX = st.glance.dx / gd * 2.4;
      st.lookY = st.glance.dy / gd * 2;
      if (st.glance.t <= 0) st.glance = null;
    } else if (T.pSeen && st.mode !== 'startle' && st.mode !== 'prism') {
      var hx = st.x, hy = headY();
      var dd = Math.hypot(T.px - hx, T.py - hy);
      if (dd < 280) {
        st.lookX = clamp((T.px - hx) / 40, -1, 1) * 2.2;
        st.lookY = clamp((T.py - hy) / 40, -1, 1) * 2;
      }
    }

    /* scripted jumps own the body while airborne */
    if (st.jump) {
      var j = st.jump;
      j.t += dt;
      var k = clamp(j.t / j.dur, 0, 1);
      st.x = lerp(j.x0, j.x1, easeOut(k));
      var ky = j.ez === 'out' ? easeOut(k) : (j.ez === 'in' ? easeIn(k) : k);
      st.y = lerp(j.y0, j.y1, ky) - Math.sin(k * Math.PI) * j.h;
      if (st.y < topLim()) st.y = topLim();   /* the glass ceiling holds, every frame */
      st.air = true;
      st.walkPh += dt * 14;
      if (k >= 1) {
        st.jump = null; st.air = false; st.y = j.y1; st.plat = j.plat;
        if (j.landed !== false) T.parts.spawn('gdust', st.x - 5, st.y - 1);
        if (j.landed !== false) T.parts.spawn('gdust', st.x + 5, st.y - 1);
        var af = j.after; j.after = null;
        if (af) af();
      }
      tapCheck();
      return;
    }

    var m = st.mode;
    if (m === 'idle') {
      if (st.t >= st.dur) choose();
    } else if (m === 'wake') {
      var k2 = clamp(st.t / .7, 0, 1);
      if (k2 < .4) { st.sy = lerp(.8, 1.12, easeOut(k2 / .4)); st.sx = lerp(1.12, .92, k2 / .4); }
      else { st.sy = lerp(1.12, 1, easeOut((k2 - .4) / .6)); st.sx = lerp(.92, 1, (k2 - .4) / .6); }
      if (st.t >= .7) {
        st.sx = 1; st.sy = 1;
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'الماس', col: '#eef4ff' });
        }
        goIdle();
      }
    } else if (m === 'debut') {
      debutTick(dt);
    } else if (m === 'walk') {
      var spd = (T.mobile ? 46 : 60) * dt;
      var dx = st.tx - st.x;
      if (Math.abs(dx) <= spd) {
        st.x = st.tx;
        dispatch(st.after);
      } else {
        st.x += (dx > 0 ? spd : -spd);
        st.face = dx > 0 ? 1 : -1;
        st.walkPh += dt * 13;
        if (Math.random() < dt * 2.2) T.parts.spawn('gdust', st.x - st.face * 6, groundY() - 2);
      }
    } else if (m === 'prism') {
      prismTick(dt);
    } else if (m === 'spin') {
      spinTick(dt);
    } else if (m === 'crown') {
      crownTick(dt);
    } else if (m === 'pearl') {
      pearlTick(dt);
    } else if (m === 'catwalk') {
      catwalkTick(dt);
    } else if (m === 'curtsy') {
      curtsyTick(dt);
    } else if (m === 'glim') {
      glimTick(dt);
    } else if (m === 'zzz') {
      st.zT += dt;
      st.cushion = Math.min(1, st.cushion + dt * 2.2);
      if (st.zT > .55 && !T.reduced) {
        st.zT = 0;
        T.parts.spawn('z', st.x + st.face * 8, headY() - 4);
      }
      if (st.t > 1.4 && !T.snooze) { T.dormant = true; return; }
    } else if (m === 'startle') {
      /* body owned by the jump; nothing else to do here */
    }

    /* pointer startle reflex — but never mid-trick, never reduced */
    var busy = (m === 'prism' || m === 'pearl' || m === 'crown' || m === 'spin' || m === 'zzz' || m === 'startle');
    if (!busy && !T.reduced && !st.jump && T.pSeen && ok('startle', 5)) {
      var px = T.px, py = T.py;
      if (Math.hypot(px - st.x, py - (st.y - BH * .45)) < 64) goStartle();
    }

    tapCheck();
  }

  /* taps: a spin on the gem herself, a curious glance elsewhere */
  function tapCheck() {
    if (!T.tap) return;
    var t = T.tap;
    T.tap = null;
    var near = Math.hypot(t.x - st.x, t.y - (st.y - BH * .5)) < 54;
    if (near) {
      if (st.mode === 'zzz') { wakeNow(); return; }
      /* mid-show? a tap just delights — never yanks the body down */
      if (st.mode === 'catwalk') { st.happy = Math.max(st.happy, 1.5); return; }
      if (st.mode !== 'spin' && st.mode !== 'prism' && ok('spin', 2.4) && !st.jump) { goSpin(); return; }
    }
    if (!st.glance) {
      st.glance = { dx: t.x - st.x, dy: t.y - headY(), t: .9 };
    }
  }

  /* ── debut: lowered in by the vitrine light ─────────────────── */
  function debutTick(dt) {
    var k = clamp(st.t / .55, 0, 1);
    if (!st.debL) {
      st.y = lerp(st.debY0, groundY(), easeIn(k));
      st.air = true;
      if (k >= 1) {
        st.debL = true;
        st.air = false;
        st.y = groundY();
        st.sx = 1.15; st.sy = .8;
        for (var q = 0; q < 7; q++) T.parts.spawn('gdust', st.x + rand(-16, 16), st.y - rand(0, 8));
        T.parts.spawn('dust', st.x - 8, st.y - 2);
        T.parts.spawn('dust', st.x + 8, st.y - 2);
      }
    } else {
      var t2 = st.t - .55;
      var kr = easeOut(clamp(t2 / .45, 0, 1));
      st.sy = lerp(.8, 1, kr);
      st.sx = lerp(1.15, 1, kr);
      st.tilt = Math.sin(t2 * 18) * .1 * (1 - kr);
      if (t2 >= .5) {
        st.tilt = 0; st.sx = 1; st.sy = 1;
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'الماس', col: '#eef4ff' });
        }
        goIdle();
      }
    }
  }

  /* ── prism: شکستِ نور — the signature ───────────────────────── */
  function prismTick(dt) {
    var P = st.prism;
    P.t += dt;
    if (P.t < .42) {
      /* the vitrine light descends to find her — she looks up */
      st.lookY = -2;
      st.lookX = 0;
      st.wide = .3;
    } else if (!P.lit) {
      P.lit = true;
      st.blink = 1;
      st.happy = 2.5;
      for (var i = 0; i < 6; i++) T.parts.spawn('gdust', st.x + rand(-18, 18), headY() + rand(2, 12));
      T.parts.spawn('spark', st.x - 8, headY() + 4, { up: 8 });
      T.parts.spawn('spark', st.x + 9, headY() + 8, { up: 8 });
    }
    if (P.lit) {
      st.happy = 2.2;
      st.blink = 1;
      st.tilt = Math.sin((P.t - .42) * 2.4) * .07;
      if (Math.random() < dt * 5) T.parts.spawn('gdust', st.x + rand(-24, 24), st.y - rand(10, 46));
    }
    if (P.t >= 3.1) {
      st.prism = null;
      st.tilt = 0; st.blink = 0;
      goIdle();
    }
  }

  /* ── spin: the jewelry-box ballerina, on her point ──────────── */
  function spinTick(dt) {
    var t = st.spinT += dt;
    if (t < .16) {
      st.sy = lerp(1, .84, t / .16); st.sx = lerp(1, 1.1, t / .16);
    } else if (t < .3) {
      var kr = (t - .16) / .14;
      st.sy = lerp(.84, 1, kr); st.sx = lerp(1.1, 1, kr);
      st.y = groundY() - kr * 3.5 * SC;
      st.air = true;
    } else if (t < 1.7) {
      st.y = groundY() - 3.5 * SC;
      st.spin += dt * 11;
      st.air = true;
      st.sparked -= dt;
      if (st.sparked <= 0) {
        st.sparked = .13;
        var a2 = rand(0, Math.PI * 2);
        T.parts.spawn('gdust', st.x + Math.cos(a2) * 4.5 * SC, st.y - BH * .5 + Math.sin(a2) * 3 * SC);
      }
    } else if (t < 1.86) {
      var kl = clamp((t - 1.7) / .155, 0, 1);   /* completes inside the phase — no dead frame at the boundary */
      st.y = lerp(groundY() - 3.5 * SC, groundY(), kl);
      if (kl >= 1) {
        st.air = false; st.spin = 0;
        st.sy = .86; st.sx = 1.1;
        T.parts.spawn('dust', st.x - 5, st.y - 1);
        T.parts.spawn('dust', st.x + 5, st.y - 1);
      }
    } else {
      /* the landing curtsy, then let her go — the release must stay
         reachable no matter how the frames straddle the boundary */
      var kc = clamp((t - 1.86) / .6, 0, 1);
      var s = Math.sin(kc * Math.PI);
      st.sy = lerp(.86, 1, kc); st.sx = lerp(1.1, 1, kc);
      st.tilt = st.face * .2 * s;
      if (kc >= .45 && !st.sparked2) {
        st.sparked2 = 1;
        st.happy = 2;
        for (var i2 = 0; i2 < 3; i2++) T.parts.spawn('gdust', st.x + rand(-14, 14), headY() - rand(2, 10));
      }
      if (t >= 2.46) {
        st.tilt = 0; st.sx = 1; st.sy = 1; st.y = groundY();
        st.spin = 0; st.air = false;
        st.sparked2 = 0;
        goIdle();
      }
    }
  }

  /* ── crown: the boutique's tribute to its finest jewel ──────── */
  function crownTick(dt) {
    var C = st.crownA;
    C.t += dt;
    var topY = headY() + 1;             /* the seat: her table */
    if (C.ph === 'descend') {
      var k = easeOut(clamp(C.t / .85, 0, 1));
      C.cy = lerp(topY - 86, topY, k);
      st.lookY = -2;
      if (k >= 1) {
        C.ph = 'wear'; C.t = 0;
        st.happy = 2.5;
        for (var i = 0; i < 4; i++) T.parts.spawn('gdust', st.x + rand(-10, 10), topY - rand(0, 8));
      }
    } else if (C.ph === 'wear') {
      C.cy = topY + Math.sin(C.t * 5) * .8;
      st.happy = 1.6;
      st.tilt = Math.sin(C.t * 7) * .045;
      if (C.t > .2 && !C.s1) {
        C.s1 = 1;
        T.parts.spawn('spark', st.x - 9, topY - 4, { up: 10 });
        T.parts.spawn('spark', st.x + 9, topY - 4, { up: 10 });
      }
      if (C.t >= 1.6) { C.ph = 'lift'; C.t = 0; }
    } else if (C.ph === 'lift') {
      var k2 = clamp(C.t / .8, 0, 1);
      C.cy = topY - easeIn(k2) * 60;
      C.a = 1 - k2 * .8;
      if (Math.random() < dt * 6) T.parts.spawn('gdust', st.x + rand(-8, 8), C.cy - rand(0, 6));
      if (k2 >= 1) {
        st.crownA = null;
        st.tilt = 0;
        goIdle();
      }
    }
  }

  /* ── pearl: adding to the world's collection, via the slot ──── */
  function pearlTick(dt) {
    var D = st.pearl, slot = T.geo.slot;
    D.t += dt;
    if (D.ph === 'pick') {
      st.sy = lerp(1, .88, Math.min(1, D.t / .2));
      st.lookY = 2;
      if (D.t > .12 && !D.pearl) D.pearl = { ph: 'rise', t: 0 };
      if (D.pearl && D.pearl.ph === 'rise') D.pearl.t += dt;
      if (D.t >= .38) { D.ph = 'toss'; D.t = 0; D.pearl = { ph: 'fly', t: 0 }; }
    } else if (D.ph === 'toss') {
      st.sy = lerp(.88, 1.04, D.t / .55);
      var kt = clamp(D.t / .55, 0, 1);
      D.pearl.t = kt;
      if (kt >= 1) {
        D.ph = 'admire'; D.t = 0;
        st.sy = 1;
        for (var i = 0; i < 4; i++) T.parts.spawn('gdust', slot.cx + rand(-8, 8), slot.cy + rand(-4, 4));
        T.parts.spawn('flash', slot.x, slot.y, { s: slot.w, life: .3 });
        T.parts.spawn('spark', slot.cx, slot.cy, { up: 8 });
        st.happy = 2.5;
      }
    } else if (D.ph === 'admire') {
      st.lookY = -2;
      st.happy = 1.5;
      if (D.t >= .55) {
        D.ph = 'hop'; D.t = 0;
        setJump({ x1: st.x, y1: groundY(), h: 11, dur: .3, after: goIdle });
        st.pearl = null;
      }
    }
  }

  /* ── catwalk: the pose in mid-air under the rim, then the drop ── */
  function catwalkTick(dt) {
    if (st.patPh === 'poseAir') {
      st.patT += dt;
      st.air = true;
      st.y = Math.max(st.hangY, topLim()) + 2.5 + Math.sin(st.patT * 8) * 2.5;
      st.tilt = Math.sin(st.patT * 5) * .14;
      st.happy = 1.2;
      st.lookX = st.face * 2.2;
      if (Math.random() < dt * 4) T.parts.spawn('gdust', st.x + rand(-14, 14), st.y - rand(6, 40));
      if (st.patT > .6) {
        st.tilt = 0;
        var dir = pick([-1, 1]);
        var tx = clamp(st.x + dir * rand(90, 170), 30, T.W - 30);
        if (blocked(tx)) tx = st.x;
        st.patPh = 'down';
        st.air = false;
        st.lookY = 0;
        setJump({ x1: tx, y1: groundY(), h: 0, dur: .48, ez: 'in', plat: 'floor', after: goIdle });
      }
    }
  }

  /* ── curtsy: for the world's gate ───────────────────────────── */
  function curtsyTick(dt) {
    st.curT += dt;
    var k = clamp(st.curT / 1.9, 0, 1);
    var s = Math.min(1, Math.sin(k * Math.PI) * 1.7);
    st.tilt = st.face * .22 * s;
    st.sy = 1 - .1 * s;
    st.sx = 1 + .05 * s;
    st.lookY = 1.5 * s;
    if (k > .3 && !st.curS) {
      st.curS = 1;
      T.parts.spawn('gdust', st.x - st.face * 10, st.y - 6);
    }
    if (k >= 1) {
      st.tilt = 0; st.sx = 1; st.sy = 1; st.curS = 0;
      st.happy = 1.8;
      goIdle();
    }
  }

  /* ── glim: a band of light glides across her facets ─────────── */
  function glimTick(dt) {
    st.glim.t += dt;
    st.blink = 1;
    st.happy = .8;
    st.tilt = Math.sin(st.glim.t * 8) * .05;
    if (st.glim.t > .2 && !st.glim.s) {
      st.glim.s = 1;
      T.parts.spawn('gdust', st.x + st.face * 8, headY() + 6);
    }
    if (st.glim.t >= .95) {
      st.glim = null;
      st.tilt = 0; st.blink = 0;
      goIdle();
    }
  }

  function wakeNow() {
    T.snooze = 0; T.sleeper = false;
    if (T.reduced) { goIdle(); return; }
    setMode('wake');
  }

  /* ── the body ───────────────────────────────────────────────── */
  function render(g) {
    var gy = groundY();

    /* the rainbow fan lives behind everything */
    if (st.prism) drawRays(g);

    if (st.cushion > .02) drawCushion(g);

    var airH = Math.max(0, gy - st.y);
    var sw = BW * .78 * st.sx * clamp(1 - airH / 130, .5, 1);
    g.globalAlpha = clamp(.15 - airH * .0007, .05, .15);
    g.fillStyle = INK;
    g.fillRect(Math.round(st.x - sw / 2), Math.round(gy - 2), Math.round(sw), 3);
    g.globalAlpha = 1;

    if (st.pearl && st.pearl.pearl && st.pearl.pearl.ph === 'rise') drawPearl(g, true);
    drawBody(g);
    if (st.pearl && st.pearl.pearl && st.pearl.pearl.ph === 'fly') drawPearl(g, false);
    if (st.crownA) drawCrown(g);
    if (st.glim) drawGlimBand(g);
  }

  function drawBody(g) {
    var legH = st.air ? LH * .55 : LH;
    var bob = (st.mode === 'walk' || st.mode === 'catwalk') ? Math.abs(Math.sin(st.walkPh)) * SC * .38 : 0;
    var cx = st.x;
    var bodyBottom = st.y - legH - bob;
    var cy = bodyBottom - (BH * st.sy) / 2 + 2 * SC;

    /* legs — dainty, close-set, higher lift than the coin's waddle */
    g.fillStyle = INK;
    var liftA = 0, liftB = 0;
    if (st.air) { liftA = SC * .5; liftB = SC * .5; }
    else if (st.mode === 'walk' || st.mode === 'catwalk') {
      liftA = Math.max(0, Math.sin(st.walkPh)) * SC * .9;
      liftB = Math.max(0, -Math.sin(st.walkPh)) * SC * .9;
    }
    var lx1 = Math.round(cx - 2.9 * SC), lx2 = Math.round(cx + 1.9 * SC);
    var wLeg = Math.max(2, SC);
    g.fillRect(lx1, Math.round(bodyBottom), wLeg, Math.round(st.y - liftA - bodyBottom));
    g.fillRect(lx2, Math.round(bodyBottom), wLeg, Math.round(st.y - liftB - bodyBottom));

    g.save();
    g.translate(Math.round(cx), Math.round(cy));
    g.rotate(st.tilt);
    g.imageSmoothingEnabled = false;
    var spinC = st.spin ? Math.cos(st.spin) : 1;
    var w = BW * st.sx, h = BH * st.sy;
    if (st.spin) w = Math.max(8, BW * Math.abs(spinC));
    g.drawImage(body, -w / 2, -h / 2, w, h);

    if (st.spin && spinC < 0) {
      /* the back face: the hearts-and-arrows heart — squeezed with the sliver */
      var c = 1.4 * SC * (w / BW);
      var x0 = -2.5 * c, y0 = -2.2 * c;
      g.fillStyle = ROSE;
      g.fillRect(x0 + c, y0, c, c);
      g.fillRect(x0 + 3 * c, y0, c, c);
      g.fillRect(x0, y0 + c, 5 * c, c);
      g.fillRect(x0 + c, y0 + 2 * c, 3 * c, c);
      g.fillRect(x0 + 2 * c, y0 + 3 * c, c, c);
      g.fillStyle = '#ffffff';
      g.fillRect(x0 + c, y0 + c, Math.max(1, c * .6), Math.max(1, c * .6));
    } else {
      drawFace(g);
    }
    g.restore();
  }

  function drawFace(g) {
    var s = SC;
    var sx = st.sx, sy = st.sy;
    var ex = 3.2 * s * sx;
    var ey = -3.3 * s * sy;                 /* eyes sit up in the crown */
    var ew = Math.max(2, 1.7 * s * sx);
    var ehBase = 3 * s * (st.wide > 0 ? 1.28 : 1) * (1 - st.blink * .92);
    var eh = Math.max(2, ehBase * sy);
    g.fillStyle = INK;
    g.fillRect(-ex - ew / 2, ey - eh / 2, ew, eh);
    g.fillRect(ex - ew / 2, ey - eh / 2, ew, eh);
    /* lashes — two pixels sweeping outward; the diva's tell */
    if (!st.blink) {
      var lw = Math.max(1, s * .55);
      g.fillRect(-ex - ew / 2 - lw * 1.5, ey - eh * .72, lw, lw);
      g.fillRect(-ex - ew / 2 - lw * 2.4, ey - eh * .28, lw, lw);
      g.fillRect(ex + ew / 2 + lw * .5, ey - eh * .72, lw, lw);
      g.fillRect(ex + ew / 2 + lw * 1.4, ey - eh * .28, lw, lw);
    }
    if (!st.blink && st.wide <= 0) {
      g.fillStyle = '#ffffff';
      g.fillRect(-ex - ew * .12, ey - eh * .36, Math.max(1, s * .6), Math.max(1, s * .6));
      g.fillRect(ex - ew * .12, ey - eh * .36, Math.max(1, s * .6), Math.max(1, s * .6));
    }
    /* blush */
    g.globalAlpha = .6;
    g.fillStyle = CHEEK;
    g.fillRect(-5 * s * sx, -1.4 * s * sy, 1.5 * s, 1.1 * s);
    g.fillRect(3.5 * s * sx, -1.4 * s * sy, 1.5 * s, 1.1 * s);
    g.globalAlpha = 1;
    /* mouth */
    g.fillStyle = INK;
    if (st.happy > 0) {
      g.fillRect(-2 * s * sx, .7 * s * sy, 1.1 * s, .9 * s);
      g.fillRect(-.5 * s * sx, 1.3 * s * sy, 1.1 * s, .9 * s);
      g.fillRect(1 * s * sx, .7 * s * sy, 1.1 * s, .9 * s);
    } else {
      g.fillRect(-1 * s * sx, 1 * s * sy, 2 * s, Math.max(1.5, .7 * s));
    }
  }

  /* ── the vitrine light finds her, and she splits it ─────────── */
  function drawRays(g) {
    var P = st.prism;
    var gy = groundY();
    var cx = st.x, cy = st.y - LH - BH * .52;
    if (P.t < .42) {
      /* the light beam descending to meet her table */
      var k = easeOut(P.t / .42);
      var by = lerp(cy - 84, cy - BH * .3, k);
      g.globalAlpha = .18;
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(cx) - 1, Math.round(cy - 90), 2, Math.round(by - (cy - 90)));
      g.globalAlpha = .85;
      g.fillRect(Math.round(cx + Math.sin(T.time * 9) * 2) - 1, Math.round(by) - 3, 2, 5);
      g.globalAlpha = 1;
      return;
    }
    var life = P.t - .42;
    var env = life < .35 ? easeOut(life / .35) : (life > 2.15 ? clamp(1 - (life - 2.15) / .55, 0, 1) : 1);
    var sway = Math.sin(life * 1.6) * .3;
    var n = RAINBOW.length;
    for (var i = 0; i < n; i++) {
      var ang = Math.PI / 2 + ((i / (n - 1)) - .5) * 1.5 + sway * .5;
      var col = RAINBOW[i];
      var ca = Math.cos(ang), sa = Math.sin(ang);
      var len = 158 + 30 * Math.sin(i * 2.1 + T.time * 2.4);
      var step = 3.4;
      for (var d = 8; d < len; d += step) {
        var f = d / len;
        if ((((i * 7) + (d / step | 0) + (T.time * 16 | 0)) % 3) < 2) {
          g.globalAlpha = env * (1 - f) * .55;
          g.fillStyle = col;
          g.fillRect(Math.round(cx + ca * d - 1), Math.round(cy + sa * d - 1), 2, 2);
        }
      }
      /* each ray that reaches the floor pools into a stripe */
      if (sa > .3) {
        var tHit = (gy - cy) / sa;
        if (tHit < len) {
          var hx = cx + ca * tHit;
          g.globalAlpha = env * .36;
          g.fillStyle = col;
          g.fillRect(Math.round(hx - 13), Math.round(gy - 3), 26, 3);
          g.globalAlpha = env * .48;
          g.fillRect(Math.round(hx - 6), Math.round(gy - 3), 12, 3);
        }
      }
    }
    /* the source glint at her table */
    g.globalAlpha = env * .9;
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(cx) - 1, Math.round(cy - BH * .42), 2, 2);
    g.globalAlpha = 1;
  }

  /* ── the velvet cushion she sleeps on ───────────────────────── */
  function drawCushion(g) {
    var gy = groundY();
    var w = 15 * SC;
    var rows = [.7, 1, .92, .55];
    var rh = (2.6 * SC) / rows.length;
    var topY = gy - rows.length * rh + 1;
    g.globalAlpha = st.cushion * .92;
    for (var r = 0; r < rows.length; r++) {
      var w2 = w * rows[r];
      var y = topY + r * rh;
      g.fillStyle = INK;
      g.fillRect(Math.round(st.x - w2 / 2 - 1), Math.round(y - 1), Math.round(w2 + 2), Math.round(rh + 2));
      g.fillStyle = r === 0 ? VELVET_HI : VELVET;
      g.fillRect(Math.round(st.x - w2 / 2), Math.round(y), Math.round(w2), Math.round(rh));
    }
    /* gold tassels at both ends */
    g.fillStyle = CGOLD;
    g.fillRect(Math.round(st.x - w / 2 - 2), Math.round(topY + rh * 1.2), 2, 2);
    g.fillRect(Math.round(st.x + w / 2), Math.round(topY + rh * 1.2), 2, 2);
    g.globalAlpha = 1;
  }

  function drawPearl(g, behind) {
    var D = st.pearl, slot = T.geo.slot;
    if (!D || !D.pearl || !slot) return;
    var u = SC;
    var fromX = st.x + st.face * 2.6 * u;
    var fromY = st.y - LH - 5 * u;
    var x, y;
    if (D.pearl.ph === 'rise') {
      var k = clamp(D.pearl.t / .24, 0, 1);
      x = fromX;
      y = lerp(st.y + 4, fromY, easeOut(k));
      if (behind) g.globalAlpha = .95;
    } else {
      var kt = clamp(D.pearl.t, 0, 1);
      x = lerp(fromX, slot.cx, kt);
      y = lerp(fromY, slot.cy, kt) - Math.sin(kt * Math.PI) * 30;
    }
    var r = 1.4 * u;
    g.fillStyle = INK;
    g.fillRect(Math.round(x - r - 1), Math.round(y - r - 1), Math.round(r * 2 + 2), Math.round(r * 2 + 2));
    g.fillStyle = '#f4f6fa';
    g.fillRect(Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
    g.fillStyle = D_LO;
    g.fillRect(Math.round(x - r), Math.round(y), Math.round(r * 2), Math.round(r));
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(x - r + .5), Math.round(y - r + .5), Math.max(1, u * .6), Math.max(1, u * .6));
    g.globalAlpha = 1;
  }

  function drawCrown(g) {
    var C = st.crownA;
    if (!C) return;
    g.save();
    g.globalAlpha = C.a != null ? C.a : 1;
    g.imageSmoothingEnabled = false;
    g.translate(Math.round(st.x), Math.round(C.cy));
    g.rotate(Math.sin(T.time * 3) * .04);
    g.drawImage(CROWN, -CROWN.width / 2, -CROWN.height + SC);
    g.restore();
    g.globalAlpha = 1;
  }

  /* the glimmer: a white band swept through her silhouette */
  function drawGlimBand(g) {
    var t = clamp(st.glim.t / .95, 0, 1);
    g.save();
    g.translate(Math.round(st.x), Math.round(st.y - LH - (BH * st.sy) / 2 + 2 * SC));
    g.rotate(st.tilt);
    glimG.setTransform(1, 0, 0, 1, 0, 0);
    glimG.globalCompositeOperation = 'source-over';
    glimG.clearRect(0, 0, BW, BH);
    glimG.drawImage(shine, 0, 0);
    glimG.globalCompositeOperation = 'source-in';
    var bx = lerp(-BW * .7, BW * .7, t);
    glimG.fillStyle = '#ffffff';
    glimG.fillRect(bx - 2.5 * SC, 0, 5 * SC, BH);
    glimG.globalCompositeOperation = 'source-over';
    g.globalAlpha = .55 * Math.sin(t * Math.PI);
    g.imageSmoothingEnabled = false;
    g.drawImage(glimCv, -BW / 2, -BH / 2);
    g.restore();
    g.globalAlpha = 1;
  }

  /* ── brain API ──────────────────────────────────────────────── */
  return {
    tick: tick,
    render: render,
    wake: function () {
      T.dormant = false;
      st.blink = 0; st.blinking = false; st.blinkT = rand(1, 2);
      st.happy = 1.2;                        /* contented to see you */
      if (!st.started) {
        st.started = true;
        st.plat = 'floor';
        var g = T.geo, x0 = null;
        if (g.cart) {
          var c1 = g.cart.cx + g.cart.w / 2 + 56, c2 = g.cart.cx - g.cart.w / 2 - 56;
          if (!blocked(c1) && c1 < T.W - 40) x0 = c1;
          else if (!blocked(c2) && c2 > 40) x0 = c2;
        }
        if (x0 == null) x0 = !blocked(T.W / 2) ? T.W / 2 : (T.W - 60);
        st.x = clamp(x0, 40, T.W - 40);
        st.face = (g.cart && st.x > g.cart.cx) ? -1 : 1;
        st.y = groundY();
        if (!T.reduced) {
          /* the debut: lowered onto the floor by the vitrine light */
          st.debY0 = groundY() - Math.min(96, T.H * .3);
          st.y = st.debY0;
          st.debL = false;
          setMode('debut');
          return;
        }
      } else {
        st.plat = 'floor';
        st.y = groundY();
      }
      if (T.reduced) {
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'الماس', col: '#eef4ff' });
        }
        goIdle();
        return;
      }
      setMode('wake');
    },
    sleep: function () {
      if (st.mode === 'zzz') return;
      st.jump = null; st.air = false;
      st.prism = null; st.pearl = null; st.crownA = null; st.glim = null;
      st.sx = .94; st.sy = .92; st.blink = 1; st.tilt = 0; st.spin = 0;
      st.y = groundY();   /* naps happen on the ground, never mid-air */
      setMode('zzz');
      st.zT = 0;
    },
    onResize: function () {
      var ns = T.mobile ? 2 : 3;
      if (ns !== SC) {
        SC = ns;
        body = makeGemSprite(HW, CR, PV, SC, false);
        shine = makeGemSprite(HW, CR, PV, SC, true);
        CROWN = makeCrownSprite(SC);
        BW = body.width; BH = body.height;
        LH = 2 * SC;
        glimCv.width = BW; glimCv.height = BH;
      }
      st.x = clamp(st.x, 30, T.W - 30);
      if (st.mode !== 'zzz' && st.mode !== 'boot') st.y = groundY();
      if (st.mode === 'prism') { st.prism = null; st.tilt = 0; st.blink = 0; goIdle(); }
      if (st.mode === 'glim') { st.glim = null; st.tilt = 0; st.blink = 0; goIdle(); }
    },
    onMotion: function (red) {
      if (red) {
        st.jump = null; st.prism = null; st.pearl = null; st.crownA = null; st.glim = null;
        st.tilt = 0; st.spin = 0; st.sx = 1; st.sy = 1;
        goIdle();
      }
    },
    force: function (what) {
      if (what === 'freeze') { T.frozen = true; return; }
      if (what === 'thaw') { T.frozen = false; return; }
      if (what === 'st') return {
        mode: st.mode,
        ph: st.prism ? (st.prism.lit ? 'lit' : 'seek') : (st.crownA ? st.crownA.ph : (st.pearl ? st.pearl.ph : st.patPh)),
        x: Math.round(st.x), y: Math.round(st.y), plat: st.plat, face: st.face, spin: st.spin ? 1 : 0
      };
      if (what === 'prism') goPrism();
      else if (what === 'spin') goSpin();
      else if (what === 'crown') goCrown();
      else if (what === 'pearl') {
        var slot = T.geo.slot;
        if (!slot) return;
        var sxp = Math.abs(slot.cx - 36) > 30 && !blocked(slot.cx - 36) ? slot.cx - 36 : slot.cx + 36;
        goWalk(clamp(sxp, 30, T.W - 30), 'pearl');
      }
      else if (what === 'catwalk') goCatwalk();
      else if (what === 'curtsy') {
        var cta = T.geo.cta;
        if (!cta) return;
        var bx = cta.x > 70 ? cta.x - 30 : cta.x + cta.w + 30;
        goWalk(clamp(bx, 30, T.W - 30), 'curtsy');
      }
      else if (what === 'glim') goGlim();
      else if (what === 'walk') goWalk(restSpot(st.x));
      else if (what === 'startle') { T.pSeen = true; goStartle(); }
      /* warps — freeze a mid-trick frame for inspection */
      else if (what === 'warp:rays') {
        st.jump = null; st.air = false; st.plat = 'floor';
        st.y = groundY('floor'); st.sx = 1; st.sy = 1; st.spin = 0;
        st.pearl = null; st.crownA = null; st.glim = null;
        st.prism = { t: 1.4, lit: true };
        setMode('prism');
      }
      else if (what === 'warp:spin') {
        st.jump = null; st.mode = 'spin'; st.spinT = .9; st.spin = 4.4;
        st.prism = null; st.pearl = null; st.crownA = null; st.glim = null;
        st.air = true; st.y = groundY() - 3.5 * SC; st.sx = 1; st.sy = 1;
      }
      else if (what === 'warp:crown') {
        st.jump = null; st.mode = 'crown'; st.spin = 0;
        st.prism = null; st.pearl = null; st.glim = null;
        var topY2 = headY() + 1;
        st.crownA = { ph: 'wear', t: .5, cy: topY2, a: 1, s1: 1 };
      }
      else if (what === 'warp:poseAir') {
        st.jump = null; st.spin = 0;
        st.prism = null; st.pearl = null; st.crownA = null; st.glim = null;
        st.plat = 'floor'; st.y = hangY(); st.hangY = st.y;
        st.mode = 'catwalk'; st.patPh = 'poseAir'; st.patT = .2;
      }
      else if (what === 'warp:pearl') {
        st.jump = null; st.plat = 'floor'; st.y = groundY('floor'); st.spin = 0;
        st.mode = 'pearl'; st.prism = null; st.crownA = null; st.glim = null;
        st.pearl = { ph: 'toss', t: .28, pearl: { ph: 'fly', t: .5 } };
      }
      else if (what === 'warp:cushion') {
        st.jump = null; st.air = false; st.spin = 0; st.plat = 'floor';
        st.y = groundY('floor');
        st.prism = null; st.pearl = null; st.crownA = null; st.glim = null;
        st.cushion = 1; st.sx = .94; st.sy = .92; st.blink = 1;
        setMode('zzz'); st.zT = 0;
      }
      else if (what === 'warp:debut') {
        st.jump = null; st.air = true; st.plat = 'floor'; st.spin = 0;
        st.debY0 = groundY() - 96; st.y = st.debY0; st.debL = false;
        st.prism = null; st.pearl = null; st.crownA = null; st.glim = null;
        st.sx = 1; st.sy = 1; st.tilt = 0;
        setMode('debut');
      }
      else if (what === 'warp:glint') {
        st.jump = null; st.air = false; st.spin = 0;
        st.prism = null; st.pearl = null; st.crownA = null;
        st.mode = 'glim'; st.glim = { t: .45, s: 1 };
      }
    }
  };
}

/* ═════════════════════════════════════════════════════════════
   WORLD 03 — «نقشه» Naghsh, the living blueprint of رازان.
   Razan is a consulting engineering firm whose gallery builds
   towers, villas and a river — every one of them lived on
   paper first. So this world's resident is the drawing itself:
   a blueprint scroll printed in the section's own teal ink,
   rolled at the top, drawn over with the tower from the project
   gallery, a face where the annotations would be, and a title
   block at its foot. It assembles from five paper pieces (the
   world's logo enters the same way), drafts ghost buildings on
   the floor with a pen, posts a mini-roll of plans into the
   cartridge slot, receives the review stamp (the check-mark
   seal stays on its paper), surveys its world with a plumb
   line from just under the rim, rolls over to flash the floor
   plan on its back, and sleeps with its curl pulled down over
   its eyes — lights out on the little tower.
   ═════════════════════════════════════════════════════════════ */
function makeNaghsh(T) {
  var ROWS = 24;                    /* roll rows 0-3, paper rows 4-23 */
  var SC = T.mobile ? 2 : 3;        /* device px per cell */

  /* palette — mixed from World 03's own drafting table */
  var INK   = '#10302d';            /* the section's own shadow ink */
  var TEAL  = '#028c85';            /* the firm's ink — the accent */
  var TEAL_HI = '#2fb3ab';
  var TEAL_DK = '#026e68';
  var ROLL_HI = '#57cfc7';
  var PAPER = '#eef4f4';            /* the section's own paper */
  var DIM   = '#4fa9a3';            /* faint drafting marks */
  var CHEEK = '#f2cf9b';            /* warm sand, on teal */

  /* ── the scroll body, prerendered once per scale ─────────────
     a roll of blueprint paper: the rolled tube up top, the flat
     sheet below carrying the tower's line-art, four windows
     (baked dim — the lights are drawn live), faint drafting
     dots, and the title block at the foot. */
  function makeScrollSprite(sc) {
    var W = 19, pad = 2;            /* the roll's lip overhangs the sheet */
    var cv = doc.createElement('canvas');
    cv.width = (W + pad * 2) * sc;
    cv.height = (ROWS + pad * 2) * sc;
    var g = cv.getContext('2d');
    function px(x, y, col) { g.fillStyle = col; g.fillRect((pad + x) * sc, (pad + y) * sc, sc, sc); }
    function row(y, x0, x1, col) { for (var x = x0; x <= x1; x++) px(x, y, col); }
    /* the rolled tube — light on the left, the rolled tail's
       shadow on the right, ink crease where it meets the sheet */
    row(0, 0, 18, INK);
    row(1, 0, 18, INK); row(1, 1, 17, ROLL_HI);
    row(2, 0, 18, INK); row(2, 1, 17, TEAL); row(2, 13, 17, TEAL_DK);
    row(3, 0, 18, INK);
    /* the flat sheet */
    for (var j = 4; j <= 22; j++) {
      row(j, 0, 18, INK);
      row(j, 1, 17, TEAL);
      row(j, 1, 2, TEAL_HI);
      row(j, 16, 17, TEAL_DK);
    }
    row(23, 0, 18, INK);
    /* the tower from the gallery — line-art in paper white */
    px(9, 5, PAPER);                                     /* antenna   */
    row(6, 8, 10, PAPER);                                /* the cap   */
    row(7, 7, 11, PAPER); row(8, 7, 11, PAPER);          /* 5 wide    */
    row(9, 6, 12, PAPER); row(10, 6, 12, PAPER);         /* 7 wide    */
    row(11, 5, 13, PAPER); row(12, 5, 13, PAPER); row(13, 5, 13, PAPER);  /* 9 wide */
    /* windows — baked dim; the live lights glow over them */
    px(8, 7, TEAL_DK); px(10, 7, TEAL_DK);
    px(8, 10, TEAL_DK); px(10, 10, TEAL_DK);
    /* faint drafting dots — the sheet's grid */
    px(3, 15, DIM); px(15, 15, DIM); px(3, 19, DIM); px(15, 19, DIM);
    px(9, 19, DIM);
    /* the title block at the foot — every razan drawing has one */
    row(20, 2, 16, DIM); row(22, 2, 16, DIM);
    px(2, 21, DIM); px(16, 21, DIM);
    row(21, 4, 9, DIM); row(21, 11, 14, DIM);
    return cv;
  }

  /* the review seal the world presses onto its paper */
  var SEAL_MAP = [
    '.XXXXXXXXX.',
    'X.........X',
    'X.........X',
    'X..X...X..X',
    'X...X.X...X',
    'X....X....X',
    'X.........X',
    'X.........X',
    '.XXXXXXXXX.'];
  function makeSealSprite(sc) {
    var cell = Math.max(2, sc - 1);
    var cv = doc.createElement('canvas');
    cv.width = 11 * cell + 2; cv.height = 9 * cell + 2;
    var g = cv.getContext('2d');
    g.fillStyle = PAPER;
    for (var j = 0; j < SEAL_MAP.length; j++)
      for (var i = 0; i < 11; i++)
        if (SEAL_MAP[j].charAt(i) === 'X') g.fillRect(i * cell + 1, j * cell + 1, cell, cell);
    return cv;
  }

  var body = makeScrollSprite(SC);
  var SEAL = makeSealSprite(SC);
  var BW = body.width, BH = body.height;
  var LH = 2 * SC;                  /* leg height, device px */

  var st = {
    started: false,
    mode: 'boot', t: 0, dur: 1,
    x: 60, y: 0, plat: 'floor',
    face: 1, tilt: 0, sx: 1, sy: 1,
    spin: 0, air: false, jump: null,
    tx: 0, walkPh: 0, after: 'idle',
    blink: 0, blinking: false, bt: 0, blinkT: rand(2.5, 5),
    lookX: 0, lookY: 0, glance: null, wide: 0, happy: 0,
    cool: {},
    draft: null, draftN: 0, sub: null, stampA: null, sealA: 0,
    assemble: null, curl: 0,
    rollT: 0, rolled: false, flT: 0, flS: 0, flS2: 0, gT: 0, gS: 0,
    introDone: false, zT: 0, patPh: null, patT: 0, hangY: 0
  };

  function groundY() { return T.H - 12; }
  /* the glass ceiling: the head never pokes above the section's own
     top edge — 2px shy of the checker rim's underside. This is THE
     invariant of the terrarium: the resident is always inside it. */
  function topLim() { return T.TOP + 16 + LH + BH * st.sy; }
  /* feet height for the rim leap's hang: head just under the rim */
  function hangY() { return T.TOP + 17 + LH + BH; }
  function headY() { return st.y - LH - BH * st.sy; }
  function ok(k, cd) { return T.time - (st.cool[k] || -99) > cd; }
  function blocked(x) {
    var g = T.geo;
    if (g.text && x > g.text.x - 34 && x < g.text.x + g.text.w + 34) return true;
    if (g.cta  && x > g.cta.x - 30 && x < g.cta.x + g.cta.w + 30) return true;
    return false;
  }
  function restSpot(notX) {
    var g = T.geo, W = T.W;
    var cands = [36, W - 36];
    if (g.cart) cands.push(g.cart.x - 30, g.cart.x + g.cart.w + 30);
    if (g.slot) cands.push(g.slot.cx - 34, g.slot.cx + 34);
    if (g.cta) {
      if (g.cta.x > 70) cands.push(g.cta.x - 34);
      if (g.cta.x + g.cta.w < W - 70) cands.push(g.cta.x + g.cta.w + 34);
    }
    if (g.text) {
      var gapL, gapR;
      if (g.text.x > W / 2) { gapL = 30; gapR = g.text.x - 20; }
      else { gapL = g.text.x + g.text.w + 20; gapR = W - 30; }
      if (gapR - gapL > 90) cands.push((gapL + gapR) / 2);
    }
    cands.push(rand(40, W - 40));
    for (var tries = 10; tries > 0; tries--) {
      var x = pick(cands);
      if (notX != null && Math.abs(x - notX) < 70) continue;
      if (blocked(x)) continue;
      return clamp(x, 30, W - 30);
    }
    return notX != null ? (notX < W / 2 ? W - 50 : 50) : W / 2;
  }
  /* everyday strolls stay local — short walks mean more decisions
     per minute, so the tricks actually get their stage time */
  function nearSpot(notX) {
    var tx = clamp(st.x + pick([-1, 1]) * rand(150, 340), 40, T.W - 40);
    if (blocked(tx)) tx = clamp(st.x - pick([-1, 1]) * rand(150, 340), 40, T.W - 40);
    if (blocked(tx)) tx = restSpot(notX);
    return tx;
  }

  /* ── motion helpers ─────────────────────────────────────────── */
  function setJump(o) {
    st.jump = { t: 0, dur: o.dur || .4, x0: st.x, x1: o.x1, y0: st.y, y1: o.y1, h: o.h || 0, ez: o.ez || null, landed: o.landed, plat: o.plat || st.plat, after: o.after || null };
    st.face = o.x1 >= st.x ? 1 : -1;
  }
  function setMode(m, dur) { st.mode = m; st.t = 0; st.dur = dur || 1; }
  function goIdle() { st.tilt = 0; setMode('idle', rand(.6, 1.5)); }
  function goWalk(tx, after) {
    st.tx = clamp(tx, 30, T.W - 30);
    st.after = after || 'idle';
    st.jump = null; st.air = false;   /* a walk owns the body — no in-flight jump may keep steering it */
    st.plat = 'floor';
    st.y = groundY();   /* reconcile feet to the platform — no sky-walks */
    st.face = st.tx >= st.x ? 1 : -1;
    setMode('walk');
    T.parts.spawn('dust', st.x - st.face * 6, groundY() - 2);
  }
  /* an interrupt tears the props down — no frozen pens, stamps,
     plumb lines or half-drawn buildings left hanging */
  function teardown() {
    st.draft = null; st.sub = null; st.stampA = null;
    st.assemble = null;
    st.sx = 1; st.sy = 1; st.tilt = 0; st.spin = 0;
  }

  /* ── the trick list ─────────────────────────────────────────── */
  function goDraft() {
    st.cool.draft = T.time;
    teardown();
    var dx = pick([-1, 1]) * rand(60, 100);
    var bx = clamp(st.x + dx, 34, T.W - 34);
    if (blocked(bx)) bx = clamp(st.x - dx, 34, T.W - 34);
    if (blocked(bx)) bx = clamp(st.x + st.face * 55, 34, T.W - 34);
    st.draft = { t: 0, n: st.draftN % 3, bx: bx, lit: 0, k2: 0 };
    st.draftN++;
    st.face = bx >= st.x ? 1 : -1;
    setMode('draft');
  }
  function goSubmit() {
    st.cool.submit = T.time;
    var slot = T.geo.slot;
    if (!slot) return;
    var sxp = Math.abs(slot.cx - 36) > 30 && !blocked(slot.cx - 36) ? slot.cx - 36 : slot.cx + 36;
    goWalk(clamp(sxp, 30, T.W - 30), 'submit');
  }
  function goStamp() {
    st.cool.stampA = T.time;
    teardown();
    st.stampA = { ph: 'descend', t: 0, cy: 0 };
    setMode('stamp');
  }
  function goPlumb() {
    st.cool.plumb = T.time;
    goWalk(clamp(st.x + rand(-110, 110), 50, T.W - 50), 'plumbUp');
  }
  function goRoll() {
    st.cool.roll = T.time;
    teardown();
    setMode('roll');
    st.rollT = 0;
  }
  function goGreet() {
    st.cool.greet = T.time;
    var cta = T.geo.cta;
    if (!cta) { goIdle(); return; }
    var bx = cta.x > 70 ? cta.x - 30 : cta.x + cta.w + 30;
    goWalk(clamp(bx, 30, T.W - 30), 'greet');
  }
  function goFlutter() {
    st.cool.flutter = T.time;
    st.flT = 0;
    setMode('flutter');
  }
  function goStartle() {
    st.cool.startle = T.time;
    var dir = st.x < T.px ? -1 : 1;
    var tx = st.x + dir * rand(56, 88);
    if (Math.abs(tx - st.x) < 20) tx = st.x - dir * 60;
    tx = clamp(tx, 30, T.W - 30);
    T.parts.spawn('bang', st.x, headY() - 10);
    st.wide = 1.1;
    st.happy = 0;
    teardown();
    for (var i = 0; i < 4; i++) T.parts.spawn('dust', st.x + rand(-12, 12), st.y - rand(4, 24));
    setJump({ x1: tx, y1: T.H - 12, h: 30, dur: .42, plat: 'floor', after: goIdle });
    setMode('startle');
  }
  function choose() {
    var c;
    if (T.reduced) { goIdle(); return; }
    if (!st.firstAct) {
      st.firstAct = true;
      goWalk(restSpot(st.x));
      return;
    }
    c = [[13, function () { goWalk(nearSpot(st.x)); }]];
    c.push([6, function () { goIdle(); }]);
    c.push([7, goFlutter]);
    if (ok('roll', 6)) c.push([8, goRoll]);
    if (ok('draft', 10)) c.push([18, goDraft]);
    if (ok('submit', 13) && T.geo.slot) c.push([12, goSubmit]);
    if (ok('stampA', 17)) c.push([10, goStamp]);
    if (ok('plumb', 12)) c.push([16, goPlumb]);
    if (ok('greet', 20) && T.geo.cta) c.push([9, goGreet]);
    weighted(c)();
  }

  /* ── arrival dispatch (walk → what comes next) ──────────────── */
  function dispatch(name) {
    if (name === 'idle') { goIdle(); return; }
    if (name === 'submit') {
      var slot = T.geo.slot;
      if (!slot) { goIdle(); return; }
      st.sub = { ph: 'pick', t: 0 };
      st.happy = 1.5;
      setMode('submit');
      return;
    }
    if (name === 'plumbUp') {
      /* the rim leap, surveyor edition: launch, hang just under the
         checker rim, drop the plumb line to measure the world's own
         height, then gravity takes the surveyor back down.
         (Landing ON the rim hoisted most of the body into the
         section above — that's a jailbreak.) */
      setMode('plumb');
      st.patPh = 'up';
      st.wide = .8;
      st.lookY = -2;
      setJump({ x1: st.x + pick([-1, 1]) * rand(6, 18), y1: hangY(), h: 0, dur: .52, ez: 'out', plat: 'floor', landed: false, after: function () {
        st.patPh = 'hang';
        st.patT = 0;
        st.hangY = st.y;
        st.plumb = { t: 0 };
      } });
      return;
    }
    if (name === 'greet') { setMode('greet'); st.gT = 0; return; }
    goIdle();
  }

  /* ── per-tick ───────────────────────────────────────────────── */
  function tick(dt) {
    st.t += dt;
    if (st.happy > 0) st.happy -= dt;
    if (st.wide > 0) st.wide -= dt;
    if (st.mode !== 'zzz' && st.curl > 0) st.curl = Math.max(0, st.curl - dt * 3);
    if (st.stampA == null && st.sealA > 0) st.sealA = Math.max(0, st.sealA - dt * .55);

    /* blinking — the universal sign of being alive.
       Sleepers keep their eyes shut: the nap pauses this machine. */
    if (st.mode !== 'zzz') {
      if (!st.blinking) {
        st.blinkT -= dt;
        if (st.blinkT <= 0) { st.blinking = true; st.bt = 0; }
      } else {
        st.bt += dt;
        st.blink = st.bt < .13 ? 1 : 0;
        if (st.bt >= .13) { st.blinking = false; st.blinkT = rand(2.6, 5.4); }
      }
    }

    /* pupils: watch the pointer when it's near, honor a glance */
    st.lookX = lerp(st.lookX, 0, dt * 4);
    st.lookY = lerp(st.lookY, 0, dt * 4);
    if (st.glance) {
      st.glance.t -= dt;
      var gd = Math.max(1, Math.abs(st.glance.dx) + Math.abs(st.glance.dy));
      st.lookX = st.glance.dx / gd * 2.4;
      st.lookY = st.glance.dy / gd * 2;
      if (st.glance.t <= 0) st.glance = null;
    } else if (T.pSeen && st.mode !== 'startle' && st.mode !== 'draft') {
      var hx = st.x, hy = headY();
      var dd = Math.hypot(T.px - hx, T.py - hy);
      if (dd < 280) {
        st.lookX = clamp((T.px - hx) / 40, -1, 1) * 2.2;
        st.lookY = clamp((T.py - hy) / 40, -1, 1) * 2;
      }
    }

    /* scripted jumps own the body while airborne */
    if (st.jump) {
      var j = st.jump;
      j.t += dt;
      var k = clamp(j.t / j.dur, 0, 1);
      st.x = lerp(j.x0, j.x1, easeOut(k));
      var ky = j.ez === 'out' ? easeOut(k) : (j.ez === 'in' ? easeIn(k) : k);
      st.y = lerp(j.y0, j.y1, ky) - Math.sin(k * Math.PI) * j.h;
      if (st.y < topLim()) st.y = topLim();   /* the glass ceiling holds, every frame */
      st.air = true;
      st.walkPh += dt * 14;
      if (k >= 1) {
        st.jump = null; st.air = false; st.y = j.y1; st.plat = j.plat;
        if (j.landed !== false) T.parts.spawn('dust', st.x - 5, st.y - 1);
        if (j.landed !== false) T.parts.spawn('dust', st.x + 5, st.y - 1);
        var af = j.after; j.after = null;
        if (af) af();
      }
      tapCheck();
      return;
    }

    var m = st.mode;
    if (m === 'idle') {
      if (st.t >= st.dur) choose();
    } else if (m === 'wake') {
      var k2 = clamp(st.t / .7, 0, 1);
      if (k2 < .4) { st.sy = lerp(.8, 1.12, easeOut(k2 / .4)); st.sx = lerp(1.12, .92, k2 / .4); }
      else { st.sy = lerp(1.12, 1, easeOut((k2 - .4) / .6)); st.sx = lerp(.92, 1, (k2 - .4) / .6); }
      if (st.t >= .7) {
        st.sx = 1; st.sy = 1;
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'نقشه', col: '#d9f2ef' });
        }
        goIdle();
      }
    } else if (m === 'debut') {
      debutTick(dt);
    } else if (m === 'walk') {
      var spd = (T.mobile ? 46 : 60) * dt;
      var dx = st.tx - st.x;
      if (Math.abs(dx) <= spd) {
        st.x = st.tx;
        dispatch(st.after);
      } else {
        st.x += (dx > 0 ? spd : -spd);
        st.face = dx > 0 ? 1 : -1;
        st.walkPh += dt * 12;
        if (Math.random() < dt * 1.8) T.parts.spawn('dust', st.x - st.face * 6, groundY() - 2);
      }
    } else if (m === 'draft') {
      draftTick(dt);
    } else if (m === 'submit') {
      subTick(dt);
    } else if (m === 'stamp') {
      stampTick(dt);
    } else if (m === 'plumb') {
      plumbTick(dt);
    } else if (m === 'roll') {
      rollTick(dt);
    } else if (m === 'greet') {
      greetTick(dt);
    } else if (m === 'flutter') {
      st.flT += dt;
      /* a page caught by a breeze — the paper ruffles in place */
      st.tilt = Math.sin(st.flT * 26) * .075 * (1 - st.flT / 1.1);
      st.sx = 1 + Math.sin(st.flT * 22) * .04 * (1 - st.flT / 1.1);
      st.blink = 1;
      if (st.flT > .18 && !st.flS) { st.flS = 1; T.parts.spawn('dust', st.x + st.face * 10, st.y - 30); }
      if (st.flT > .5 && !st.flS2) { st.flS2 = 1; T.parts.spawn('dust', st.x - st.face * 12, st.y - 44); }
      if (st.flT >= 1.05) {
        st.tilt = 0; st.sx = 1; st.blink = 0; st.flS = 0; st.flS2 = 0;
        goIdle();
      }
    } else if (m === 'zzz') {
      st.zT += dt;
      st.curl = Math.min(1, st.curl + dt * 2.1);
      if (st.zT > .55 && !T.reduced) {
        st.zT = 0;
        T.parts.spawn('z', st.x + st.face * 8, headY() - 4);
      }
      if (st.t > 1.4 && !T.snooze) { T.dormant = true; return; }
    } else if (m === 'startle') {
      /* body owned by the jump; nothing else to do here */
    }

    /* pointer startle reflex — but never mid-trick, never reduced */
    var busy = (m === 'draft' || m === 'submit' || m === 'stamp' || m === 'plumb' || m === 'roll' || m === 'debut' || m === 'zzz' || m === 'startle');
    if (!busy && !T.reduced && !st.jump && T.pSeen && ok('startle', 5)) {
      var px = T.px, py = T.py;
      if (Math.hypot(px - st.x, py - (st.y - BH * .45)) < 64) goStartle();
    }

    tapCheck();
  }

  /* taps: a roll on the scroll itself, a curious glance elsewhere */
  function tapCheck() {
    if (!T.tap) return;
    var t = T.tap;
    T.tap = null;
    var near = Math.hypot(t.x - st.x, t.y - (st.y - BH * .5)) < 54;
    if (near) {
      if (st.mode === 'zzz') { wakeNow(); return; }
      /* mid-show? a tap just delights — never yanks the body down */
      if (st.mode === 'plumb' || st.mode === 'draft' || st.mode === 'stamp') { st.happy = Math.max(st.happy, 1.5); return; }
      if (st.mode !== 'roll' && ok('roll', 2.4) && !st.jump) { goRoll(); return; }
    }
    if (!st.glance) {
      st.glance = { dx: t.x - st.x, dy: t.y - headY(), t: .9 };
    }
  }

  /* ── debut: five paper pieces assemble the scroll ───────────── */
  function debutTick(dt) {
    var A = st.assemble;
    A.t += dt;
    if (A.ph === 'fly') {
      /* the pieces fly in — landed pieces keep k frozen at 1 */
      var allIn = true;
      for (var i = 0; i < A.pieces.length; i++) {
        var p = A.pieces[i];
        var kt = clamp((A.t - p.delay) / p.dur, 0, 1);
        p.k = kt;
        if (kt < 1) allIn = false;
        else if (!p.landed) {
          p.landed = true;
          T.parts.spawn('dust', p.x1, groundY() - 2);
        }
      }
      if (allIn) { A.ph = 'pile'; A.t = 0; }
    } else if (A.ph === 'pile') {
      if (A.t >= .3) {
        A.ph = 'unroll'; A.t = 0;
        for (var q = 0; q < 7; q++) T.parts.spawn('dust', st.x + rand(-18, 18), groundY() - rand(0, 10));
      }
    } else if (A.ph === 'unroll') {
      var ku = clamp(A.t / .55, 0, 1);
      if (ku < .55) {
        var e1 = easeOut(ku / .55);
        st.sy = lerp(.22, 1.16, e1); st.sx = lerp(1.3, .9, e1);
        st.tilt = Math.sin(ku * 14) * .12;
      } else {
        var e2 = easeOut((ku - .55) / .45);
        st.sy = lerp(1.16, 1, e2); st.sx = lerp(.9, 1, e2);
        st.tilt = lerp(Math.sin(ku * 14) * .12, 0, e2);
      }
      if (ku >= 1) {
        st.sx = 1; st.sy = 1; st.tilt = 0;
        st.assemble = null;
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'نقشه', col: '#d9f2ef' });
        }
        st.happy = 2.2;
        goIdle();
      }
    }
  }

  /* ── draft: the pencil, the guides, and a ghost building ────── */
  /* the gallery's three projects, as the pen draws them:
     polylines in cell units, origin at the site's ground center */
  function draftStrokes(v, u) {
    var s;
    if (v === 0) {          /* برج تجاری تهران — the stepped tower */
      s = [
        [[-4.5, 0], [-4.5, -2], [-3.5, -2], [-3.5, -4], [-2.5, -4], [-2.5, -6], [-1.5, -6], [-1.5, -8]],
        [[4.5, 0], [4.5, -2], [3.5, -2], [3.5, -4], [2.5, -4], [2.5, -6], [1.5, -6], [1.5, -8]],
        [[-4.5, 0], [4.5, 0]],
        [[0, -8], [0, -9.5]],
        [[-1, 0], [-1, -1.6], [1, -1.6], [1, 0]],
        [[-1.4, -3.2], [-.4, -3.2]], [[.4, -4.6], [1.4, -4.6]],
        [[-1.4, -5.8], [-.4, -5.8]], [[.4, -6.8], [1.4, -6.8]]
      ];
    } else if (v === 1) {   /* ویلای کنار رودخانه — the villa */
      s = [
        [[-7.5, 0], [7.5, 0]],
        [[-6.5, 0], [-6.5, -3]],
        [[6.5, 0], [6.5, -3]],
        [[-7.5, -3], [0, -5.5], [7.5, -3]],
        [[-1.5, 0], [-1.5, -2], [.5, -2], [.5, 0]],
        [[-4.8, -1], [-2.8, -1], [-2.8, -2.2], [-4.8, -2.2], [-4.8, -1]],
        [[3, -3], [3, -4.6], [4.2, -4.6], [4.2, -3.6]]
      ];
    } else {                /* رودخانه — the river and its bridge */
      s = [];
      var w, x;
      for (w = 0; w < 3; w++) {
        var line = [];
        for (x = -14; x <= 14; x += 3.5)
          line.push([x, -w * 2.2 + (((x / 3.5) | 0) % 2 ? -1.1 : 0)]);
        s.push(line);
      }
      var arc = [];
      for (x = 0; x <= 8; x++) {
        var tt = x / 8;
        arc.push([-5 + 10 * tt, -Math.sin(tt * Math.PI) * 4.2]);
      }
      s.push(arc);
    }
    var out = [], i, q;
    for (i = 0; i < s.length; i++) {
      var pl = [];
      for (q = 0; q < s[i].length; q++) pl.push([s[i][q][0] * u, s[i][q][1] * u]);
      out.push(pl);
    }
    return out;
  }
  function drawPoly(g, pl, x0, y0, col, alpha) {
    g.globalAlpha = alpha;
    g.fillStyle = col;
    for (var i = 0; i < pl.length - 1; i++) {
      var x1 = pl[i][0], y1 = pl[i][1], x2 = pl[i + 1][0], y2 = pl[i + 1][1];
      var n = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))));
      for (var d = 0; d <= n; d++)
        g.fillRect(Math.round(x0 + lerp(x1, x2, d / n)) - 1, Math.round(y0 + lerp(y1, y2, d / n)) - 1, 2, 2);
    }
    g.globalAlpha = 1;
  }
  function draftTick(dt) {
    var D = st.draft;
    D.t += dt;
    var gy = groundY();
    if (D.t < .42) {
      /* the pen comes out, the surveyor studies the site */
      st.sy = lerp(1, .93, Math.min(1, D.t / .3));
      st.sx = lerp(1, 1.05, Math.min(1, D.t / .3));
      st.lookY = 2; st.lookX = st.face * 1.6;
    } else if (D.t >= .42 && !D.lit) {
      D.lit = 1;
      st.sy = 1; st.sx = 1;
    }
    if (D.lit) {
      /* guides, then the strokes, then the blink, then the dust */
      var kt = D.t - .42;
      var strokes = draftStrokes(D.n, SC);
      var tBuild = strokes.length * .16;
      D.k2 = clamp(kt / tBuild, 0, 1);
      if (kt >= tBuild + .5 && !D.pop) {
        D.pop = 1;
        st.happy = 2.4;
        var top = 0, i, q;
        for (i = 0; i < strokes.length; i++)
          for (q = 0; q < strokes[i].length; q++) top = Math.min(top, strokes[i][q][1]);
        for (i = 0; i < 7; i++) T.parts.spawn('gdust', D.bx + rand(-16, 16), gy + top + rand(-4, 10));
      }
      if (kt >= tBuild + 1.05) {
        st.draft = null;
        st.sy = 1; st.sx = 1;
        goIdle();
      }
    }
  }

  /* ── submit: a mini-roll of plans, posted to the archive ────── */
  function subTick(dt) {
    var D = st.sub, slot = T.geo.slot;
    D.t += dt;
    if (D.ph === 'pick') {
      st.sy = lerp(1, .88, Math.min(1, D.t / .2));
      st.lookY = 2;
      if (D.t > .12 && !D.roll) D.roll = { ph: 'rise', t: 0 };
      if (D.roll && D.roll.ph === 'rise') D.roll.t += dt;
      if (D.t >= .38) { D.ph = 'toss'; D.t = 0; D.roll = { ph: 'fly', t: 0 }; }
    } else if (D.ph === 'toss') {
      st.sy = lerp(.88, 1.04, D.t / .55);
      var kt = clamp(D.t / .55, 0, 1);
      D.roll.t = kt;
      if (kt >= 1) {
        D.ph = 'admire'; D.t = 0;
        st.sy = 1;
        for (var i = 0; i < 4; i++) T.parts.spawn('gdust', slot.cx + rand(-8, 8), slot.cy + rand(-4, 4));
        T.parts.spawn('flash', slot.x, slot.y, { s: slot.w, life: .3 });
        T.parts.spawn('spark', slot.cx, slot.cy, { up: 8 });
        st.happy = 2.5;
      }
    } else if (D.ph === 'admire') {
      st.lookY = -2;
      st.happy = 1.5;
      if (D.t >= .55) {
        D.ph = 'hop'; D.t = 0;
        setJump({ x1: st.x, y1: groundY(), h: 11, dur: .3, after: goIdle });
        st.sub = null;
      }
    }
  }

  /* ── stamp: the world reviews the drawing ───────────────────── */
  function stampTick(dt) {
    var C = st.stampA;
    C.t += dt;
    var seatY = headY() + BH * .34;    /* seats on the paper's chest */
    if (C.ph === 'descend') {
      var k = easeIn(clamp(C.t / .55, 0, 1));
      C.cy = lerp(seatY - 76, seatY, k);
      st.lookY = -2;
      if (k >= 1) {
        C.ph = 'press'; C.t = 0;
        st.sy = .84; st.sx = 1.14;
        st.sealA = 1;
        for (var i = 0; i < 4; i++) T.parts.spawn('gdust', st.x + rand(-14, 14), C.cy + rand(-2, 6));
        T.parts.spawn('dust', st.x - 10, C.cy + 6);
        T.parts.spawn('dust', st.x + 10, C.cy + 6);
      }
    } else if (C.ph === 'press') {
      st.sy = lerp(.84, 1, Math.min(1, C.t / .3));
      st.sx = lerp(1.14, 1, Math.min(1, C.t / .3));
      st.happy = 2.5;
      if (C.t >= .22) { C.ph = 'lift'; C.t = 0; }
    } else if (C.ph === 'lift') {
      var k2 = clamp(C.t / .55, 0, 1);
      C.cy = seatY - easeOut(k2) * 66;
      st.tilt = Math.sin(C.t * 16) * .05 * (1 - k2);
      if (k2 >= 1) {
        st.stampA = null;
        st.tilt = 0;
        goIdle();
      }
    }
  }

  /* ── plumb: the surveyor measures its own world ─────────────── */
  function plumbTick(dt) {
    if (st.patPh === 'hang') {
      st.patT += dt;
      st.air = true;
      st.y = Math.max(st.hangY, topLim()) + 2 + Math.sin(st.patT * 9) * 2;
      st.lookX = Math.sin(st.patT * 4.2) * 2.2;
      st.lookY = -1.4;
      st.plumb.t += dt;
      if (Math.random() < dt * 2.5) T.parts.spawn('dust', st.x + rand(-10, 10), st.y - BH - 4);
      if (st.patT > 1.15) {
        var dir = pick([-1, 1]);
        var tx = clamp(st.x + dir * rand(90, 170), 30, T.W - 30);
        if (blocked(tx)) tx = st.x;
        st.patPh = 'down';
        st.air = false;
        st.lookY = 0;
        st.plumb = null;
        setJump({ x1: tx, y1: groundY(), h: 0, dur: .48, ez: 'in', plat: 'floor', after: goIdle });
      }
    }
  }

  /* ── roll: over it goes — the floor plan is on the back ─────── */
  function rollTick(dt) {
    var f = st.rollT += dt;
    if (f < .16) { st.sy = lerp(1, .8, f / .16); st.sx = lerp(1, 1.12, f / .16); }
    else if (f < .71) {
      var k = (f - .16) / .55;
      st.spin = k * Math.PI * 2;
      st.y = groundY() - Math.sin(k * Math.PI) * 14;
      st.air = true;
      st.sx = 1; st.sy = 1;
    } else if (f < .9) {
      st.spin = 0; st.air = false;
      st.y = groundY();
      var kl = (f - .71) / .19;
      st.sy = lerp(.86, 1, kl); st.sx = lerp(1.1, 1, kl);
    } else {
      st.spin = 0; st.sx = 1; st.sy = 1;
      if (!st.rolled) {
        st.rolled = true;
        T.parts.spawn('gdust', st.x - 12, st.y - 22);
        T.parts.spawn('gdust', st.x + 12, st.y - 28);
        T.parts.spawn('gdust', st.x, st.y - 44);
        st.happy = 2;
      }
      if (f >= 1.1) { st.rolled = false; goIdle(); }
    }
  }

  /* ── greet: unroll a little taller for the world's gate ─────── */
  function greetTick(dt) {
    st.gT += dt;
    var k = clamp(st.gT / 1.7, 0, 1);
    if (k < .45) {
      var e1 = easeOut(k / .45);
      st.sy = lerp(1, 1.11, e1); st.sx = lerp(1, .95, e1);
      st.lookY = -2 * e1;
    } else {
      var e2 = easeOut((k - .45) / .55);
      st.sy = lerp(1.11, .93, e2); st.sx = lerp(.95, 1.04, e2);
      st.tilt = st.face * .14 * Math.sin(e2 * Math.PI);
      st.lookY = lerp(-2, 1.5, e2);
      if (e2 > .3 && !st.gS) { st.gS = 1; T.parts.spawn('dust', st.x - st.face * 10, st.y - 6); }
    }
    if (k >= 1) {
      st.sy = 1; st.sx = 1; st.tilt = 0; st.gS = 0;
      st.happy = 1.8;
      goIdle();
    }
  }

  function wakeNow() {
    T.snooze = 0; T.sleeper = false;
    if (T.reduced) { goIdle(); return; }
    setMode('wake');
  }

  /* ── the body ───────────────────────────────────────────────── */
  function render(g) {
    var gy = groundY();

    /* the ghost building and its guides live behind everything */
    if (st.draft) drawSite(g);

    var airH = Math.max(0, gy - st.y);
    var sw = BW * .72 * st.sx * clamp(1 - airH / 130, .5, 1);
    g.globalAlpha = clamp(.15 - airH * .0007, .05, .15);
    g.fillStyle = INK;
    g.fillRect(Math.round(st.x - sw / 2), Math.round(gy - 2), Math.round(sw), 3);
    g.globalAlpha = 1;

    if (st.assemble && st.assemble.ph !== 'unroll') drawPieces(g);
    else drawBody(g);

    if (st.sub && st.sub.roll) drawMiniRoll(g);
    if (st.draft) drawPencil(g);
    if (st.stampA) drawStamp(g);
    if (st.patPh === 'hang' && st.plumb) drawPlumb(g);
  }

  function drawBody(g) {
    var legH = st.air ? LH * .55 : LH;
    var bob = (st.mode === 'walk') ? Math.abs(Math.sin(st.walkPh)) * SC * .38 : 0;
    var cx = st.x;
    var bodyBottom = st.y - legH - bob;
    var cy = bodyBottom - (BH * st.sy) / 2 + 2 * SC;

    /* legs — a wide-set, official stance under the wide sheet */
    g.fillStyle = INK;
    var liftA = 0, liftB = 0;
    if (st.air) { liftA = SC * .5; liftB = SC * .5; }
    else if (st.mode === 'walk') {
      liftA = Math.max(0, Math.sin(st.walkPh)) * SC * .7;
      liftB = Math.max(0, -Math.sin(st.walkPh)) * SC * .7;
    }
    var lx1 = Math.round(cx - 4.6 * SC), lx2 = Math.round(cx + 3.6 * SC);
    var wLeg = Math.max(2, SC);
    g.fillRect(lx1, Math.round(bodyBottom), wLeg, Math.round(st.y - liftA - bodyBottom));
    g.fillRect(lx2, Math.round(bodyBottom), wLeg, Math.round(st.y - liftB - bodyBottom));

    g.save();
    g.translate(Math.round(cx), Math.round(cy));
    g.rotate(st.tilt);
    g.imageSmoothingEnabled = false;
    var spinC = st.spin ? Math.cos(st.spin) : 1;
    var w = BW * st.sx, h = BH * st.sy;
    if (st.spin) w = Math.max(8, BW * Math.abs(spinC));
    g.drawImage(body, -w / 2, -h / 2, w, h);

    if (st.spin && spinC < 0) {
      /* the back face: the floor plan of a real project — walls,
         door gaps, the whole building seen from above */
      var c = Math.max(1, SC * (w / BW));
      var pw = 10 * c, ph = 8 * c;
      var x0 = -pw / 2, y0 = -ph / 2;
      g.fillStyle = PAPER;
      g.fillRect(x0, y0, pw, Math.max(1, c));                  /* top wall    */
      g.fillRect(x0, y0 + ph - c, pw, Math.max(1, c));         /* bottom wall */
      g.fillRect(x0, y0, Math.max(1, c), ph);                  /* left wall   */
      g.fillRect(x0 + pw - c, y0, Math.max(1, c), ph);         /* right wall  */
      g.fillRect(x0 + 4 * c, y0, Math.max(1, c), ph * .55);    /* inner wall  */
      g.fillRect(x0 + 4 * c, y0 + ph * .75, Math.max(1, c), ph * .25);   /* its door */
      g.fillRect(x0 + 4 * c, y0 + 2 * c, pw - 5 * c, Math.max(1, c));    /* corridor */
    } else {
      drawTowerLights(g, w / BW, h / BH);
      drawFace(g);
      if (st.sealA > 0) {
        /* the review seal, slapped on across the title block —
           where real drawings get approved */
        g.save();
        g.rotate(-.14);
        var sh = 8.2 * SC, sw2 = sh * (11 / 9);
        g.globalAlpha = Math.min(1, st.sealA) * .92;
        g.drawImage(SEAL, -sw2 / 2, 7.2 * SC - sh / 2, sw2, sh);
        g.restore();
        g.globalAlpha = 1;
      }
      if (st.curl > .02) drawCurl(g);
    }
    g.restore();
  }

  /* the tower's windows, lit two at a time — dark when it naps */
  function drawTowerLights(g, kx, ky) {
    if (st.mode === 'zzz') return;
    var on = Math.sin(T.time * 1.6) > 0;
    g.fillStyle = '#ffffff';
    g.globalAlpha = .88;
    var u = SC;
    var wx = [[8, 7], [10, 7], [8, 10], [10, 10]];
    for (var i = 0; i < 4; i++) {
      var lit = (i < 2) === on;
      if (!lit) continue;
      /* cell → body-local px: the sheet's art centers on cell 9 */
      var lx = (wx[i][0] - 9) * u * kx;
      var ly = (wx[i][1] - 12) * u * ky;
      g.fillRect(Math.round(lx), Math.round(ly), Math.max(1, u * kx), Math.max(1, u * ky));
    }
    g.globalAlpha = 1;
  }

  /* the curl: asleep, the roll unrolls its paper down over the
     eyes like a blanket — tower, face and all — as it dozes */
  function drawCurl(g) {
    var k = st.curl;
    var u = SC;
    var w = 17 * u;                        /* the sheet's width */
    var y0 = -10.5 * u;                    /* just under the roll's crease */
    var hMax = 16.2 * u;                   /* down past the eyes (row 15.5) */
    var h = hMax * k;
    if (h < u) return;
    g.fillStyle = INK;
    g.fillRect(-w / 2 - u, y0 - u * .5, w + 2 * u, h + u);
    g.fillStyle = TEAL_DK;
    g.fillRect(-w / 2, y0, w, h);
    /* the rolled edge catches the light */
    g.fillStyle = ROLL_HI;
    g.fillRect(-w / 2, y0 + h - u * .7, w, Math.max(1, u * .7));
    /* the crease the curl leaves on the paper below */
    g.fillStyle = INK;
    g.globalAlpha = .3;
    g.fillRect(-w / 2 + u, y0 + h + u * .7, w - 2 * u, Math.max(1, u * .4));
    g.globalAlpha = 1;
  }

  function drawFace(g) {
    var s = SC;
    var sx = st.sx, sy = st.sy;
    var ex = 3.4 * s * sx;
    var ey = 3.5 * s * sy;                  /* low on the sheet, under the tower */
    var ew = Math.max(2, 1.8 * s * sx);
    var ehBase = 3 * s * (st.wide > 0 ? 1.28 : 1) * (1 - st.blink * .92);
    var eh = Math.max(2, ehBase * sy);
    g.fillStyle = INK;
    g.fillRect(-ex - ew / 2, ey - eh / 2, ew, eh);
    g.fillRect(ex - ew / 2, ey - eh / 2, ew, eh);
    if (!st.blink && st.wide <= 0) {
      g.fillStyle = '#ffffff';
      g.fillRect(-ex - ew * .12, ey - eh * .36, Math.max(1, s * .6), Math.max(1, s * .6));
      g.fillRect(ex - ew * .12, ey - eh * .36, Math.max(1, s * .6), Math.max(1, s * .6));
    }
    /* cheeks — warm sand on the teal sheet */
    g.globalAlpha = .6;
    g.fillStyle = CHEEK;
    g.fillRect(-5.2 * s * sx, ey + 1.3 * s, 1.5 * s, 1.1 * s);
    g.fillRect(3.7 * s * sx, ey + 1.3 * s, 1.5 * s, 1.1 * s);
    g.globalAlpha = 1;
    /* mouth */
    g.fillStyle = INK;
    if (st.happy > 0) {
      g.fillRect(-2 * s * sx, ey + 2.1 * s, 1.1 * s, .9 * s);
      g.fillRect(-.5 * s * sx, ey + 2.7 * s, 1.1 * s, .9 * s);
      g.fillRect(1 * s * sx, ey + 2.1 * s, 1.1 * s, .9 * s);
    } else {
      g.fillRect(-1 * s * sx, ey + 2.3 * s, 2 * s, Math.max(1.5, .7 * s));
    }
  }

  /* ── the debut pieces: five sheets of the world's own paper ─── */
  function drawPieces(g) {
    var A = st.assemble;
    if (!A || !A.pieces) return;
    var flash = A.ph === 'pile' && A.t > .18;
    for (var i = 0; i < A.pieces.length; i++) {
      var p = A.pieces[i];
      if (p.k == null) continue;
      var e = easeOut(p.k);
      var x = lerp(p.x0, p.x1, e), y = lerp(p.y0, p.y1, e);
      g.globalAlpha = clamp(p.k * 3, 0, 1) * (flash ? .4 + .6 * Math.abs(Math.sin(A.t * 30)) : 1);
      g.fillStyle = INK;
      g.fillRect(Math.round(x - p.w / 2) - 1, Math.round(y - p.h / 2) - 1, Math.round(p.w) + 2, Math.round(p.h) + 2);
      g.fillStyle = p.col;
      g.fillRect(Math.round(x - p.w / 2), Math.round(y - p.h / 2), Math.round(p.w), Math.round(p.h));
      if (p.hi) {
        g.fillStyle = PAPER;
        g.fillRect(Math.round(x - p.w / 2) + 1, Math.round(y - p.h / 2) + 1, Math.max(1, Math.round(p.w * .3)), 1);
      }
    }
    g.globalAlpha = 1;
  }

  /* ── the pen Naghsh drafts with ─────────────────────────────── */
  function drawPencil(g) {
    var D = st.draft;
    if (!D || D.t <= .15) return;   /* out at .15s, gone when the draft clears */
    var px2 = st.x + st.face * 7.6 * SC;
    var py = st.y - 9.5 * SC + Math.sin(T.time * 11) * 1.6;
    g.save();
    g.translate(Math.round(px2), Math.round(py));
    g.rotate(-.62 * st.face);
    var u = SC;
    g.fillStyle = INK;
    g.fillRect(-1.5 * u, -6 * u, 3 * u, 12 * u);
    g.fillStyle = PAPER;
    g.fillRect(-u, -5.4 * u, 2 * u, 9.6 * u);
    g.fillStyle = TEAL;
    g.fillRect(-u, -2.2 * u, 2 * u, 1.4 * u);
    g.fillStyle = INK;
    g.fillRect(-.7 * u, 4.2 * u, 1.4 * u, 2.2 * u);   /* the nib */
    g.fillStyle = '#d9f2ef';
    g.fillRect(-u, -5.4 * u, 2 * u, 1.2 * u);         /* the highlight */
    g.restore();
  }

  /* ── the drafting site: guides on the floor, then the ghost ── */
  function drawSite(g) {
    var D = st.draft;
    var gy = groundY();
    if (D.t < .42) return;
    var kt = D.t - .42;
    var strokes = draftStrokes(D.n, SC);
    var tBuild = strokes.length * .16;

    /* the guide dashes — where the building will stand */
    var gk = clamp(kt / .4, 0, 1);
    var gw = (D.n === 1 ? 16 : D.n === 2 ? 30 : 10) * SC;
    var dash = 4, gap = 3, per = dash + gap;
    var nD = Math.floor((gw * gk) / per);
    g.globalAlpha = .4;
    g.fillStyle = INK;
    for (var i = 0; i < nD; i++) {
      g.fillRect(Math.round(D.bx - gw / 2 + i * per), Math.round(gy - 1), dash, 2);
      g.fillRect(Math.round(D.bx - gw / 2 + i * per), Math.round(gy - 5), 2, 2);
    }
    g.globalAlpha = 1;

    /* the strokes, bottom-up, one every .16s */
    var built = clamp(kt / tBuild, 0, 1) * strokes.length;
    var blink = kt > tBuild ? .55 + .45 * Math.abs(Math.sin((kt - tBuild) * 12)) : 1;
    var fade = kt > tBuild + .55 ? clamp(1 - (kt - tBuild - .55) / .5, 0, 1) : 1;
    for (var s = 0; s < strokes.length; s++) {
      var vis = built - s;
      if (vis <= 0) continue;
      var pl = strokes[s];
      if (vis < 1) {
        /* the stroke currently being drawn — partial */
        var cut = Math.max(1, Math.floor((pl.length - 1) * vis));
        drawPoly(g, pl.slice(0, cut + 1), D.bx, gy, TEAL, .9 * fade);
      } else {
        drawPoly(g, pl, D.bx, gy, TEAL, blink * fade);
      }
    }
  }

  /* ── the plumb line, dropped from the surveyor's hang ───────── */
  function drawPlumb(g) {
    var P = st.plumb;
    var gy = groundY();
    var from = st.y + LH * .55;
    var full = gy - from - 3;
    var len;
    if (P.t < .35) len = full * easeOut(P.t / .35);
    else if (P.t < .85) len = full;
    else len = full * clamp(1 - (P.t - .85) / .3, 0, 1);
    if (len <= 2) return;
    var swing = P.t > .3 && P.t < .9 ? Math.sin(T.time * 3.1) * 1.6 * (len / full) : 0;
    /* dashed line */
    g.fillStyle = INK;
    g.globalAlpha = .55;
    var y = from;
    while (y < from + len - 4) {
      g.fillRect(Math.round(st.x + swing * ((y - from) / len)) - 1, Math.round(y), 2, 3);
      y += 6;
    }
    /* the height ticks — the world, measured */
    g.globalAlpha = .35;
    for (var ty = from + 12; ty < from + len - 6; ty += 16)
      g.fillRect(Math.round(st.x + swing * ((ty - from) / len)) + 1, Math.round(ty), 3, 1);
    g.globalAlpha = 1;
    /* the bob */
    var bx = st.x + swing, by = from + len;
    g.fillStyle = INK;
    g.fillRect(Math.round(bx - 2.5), Math.round(by - 3), 5, 6);
    g.fillStyle = TEAL;
    g.fillRect(Math.round(bx - 1.5), Math.round(by - 2), 3, 4);
    g.fillStyle = ROLL_HI;
    g.fillRect(Math.round(bx - 1.5), Math.round(by - 2), 3, 1);
  }

  /* ── the mini-roll of plans, pulled from the curl ───────────── */
  function drawMiniRoll(g) {
    var D = st.sub, slot = T.geo.slot;
    if (!D || !D.roll || !slot) return;
    var u = SC;
    var fromX = st.x + st.face * 2.4 * u;
    var fromY = st.y - LH - BH * .42;
    var x, y, rot = 0;
    if (D.roll.ph === 'rise') {
      var k = clamp(D.roll.t / .24, 0, 1);
      x = fromX;
      y = lerp(st.y + 4, fromY, easeOut(k));
    } else {
      var kt = clamp(D.roll.t, 0, 1);
      x = lerp(fromX, slot.cx, kt);
      y = lerp(fromY, slot.cy, kt) - Math.sin(kt * Math.PI) * 30;
      rot = st.face * kt * 1.1;
    }
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.rotate(rot);
    g.fillStyle = INK;
    g.fillRect(-2.4 * u, -3.2 * u, 4.8 * u, 6.4 * u);
    g.fillStyle = TEAL;
    g.fillRect(-2 * u, -2.8 * u, 4 * u, 5.6 * u);
    g.fillStyle = PAPER;
    g.fillRect(-2 * u, -u, 4 * u, 2 * u);          /* the sheet's edge peeking */
    g.fillStyle = TEAL_HI;
    g.fillRect(-2 * u, -2.8 * u, 4 * u, u * .7);
    g.restore();
  }

  /* ── the review stamp — the world's tribute to its drawing ──── */
  function drawStamp(g) {
    var C = st.stampA;
    if (!C) return;
    var seatY = headY() + BH * .34;
    g.save();
    g.translate(Math.round(st.x + 2), Math.round(C.cy));
    g.rotate(Math.sin(T.time * 7) * .05 * (C.ph === 'descend' ? 1 : .3));
    var u = SC;
    /* the handle */
    g.fillStyle = INK;
    g.fillRect(-6 * u, -14 * u, 12 * u, 4 * u);
    g.fillStyle = PAPER;
    g.fillRect(-5 * u, -13.2 * u, 10 * u, 2.4 * u);
    g.fillStyle = INK;
    g.fillRect(-2.4 * u, -10 * u, 4.8 * u, 3.4 * u);
    /* the block — ink pad side down */
    g.fillStyle = INK;
    g.fillRect(-11 * u, -6.6 * u, 22 * u, 6.6 * u);
    g.fillStyle = PAPER;
    g.fillRect(-10 * u, -5.6 * u, 20 * u, 4.6 * u);
    g.fillStyle = TEAL;                            /* the inked face */
    g.fillRect(-10 * u, -2 * u, 20 * u, 2 * u);
    g.restore();
  }

  /* ── brain API ──────────────────────────────────────────────── */
  return {
    tick: tick,
    render: render,
    wake: function () {
      T.dormant = false;
      st.blink = 0; st.blinking = false; st.blinkT = rand(1, 2);
      st.happy = 1.2;                        /* contented to see you */
      if (!st.started) {
        st.started = true;
        st.plat = 'floor';
        var g = T.geo, x0 = null;
        if (g.cart) {
          var c1 = g.cart.cx + g.cart.w / 2 + 56, c2 = g.cart.cx - g.cart.w / 2 - 56;
          if (!blocked(c1) && c1 < T.W - 40) x0 = c1;
          else if (!blocked(c2) && c2 > 40) x0 = c2;
        }
        if (x0 == null) x0 = !blocked(T.W / 2) ? T.W / 2 : (T.W - 60);
        st.x = clamp(x0, 40, T.W - 40);
        st.face = (g.cart && st.x > g.cart.cx) ? -1 : 1;
        st.y = groundY();
        if (!T.reduced) {
          /* the debut: five sheets fly in, assemble, and unroll */
          var pieces = [], src = [
            [-130, -96], [130, -96], [-74, -2], [74, -2], [0, -150]];
          var cols = [TEAL, TEAL_HI, TEAL_DK, ROLL_HI, TEAL];
          for (var i = 0; i < 5; i++) {
            pieces.push({
              x0: clamp(st.x + src[i][0], 10, T.W - 10),
              y0: clamp(groundY() + src[i][1], T.TOP + 20, groundY() - 4),
              x1: st.x + rand(-5, 5),
              y1: groundY() - rand(3, 15),
              w: (3 + (i % 2)) * SC, h: (2 + (i % 3 === 0 ? 1 : 0)) * SC,
              col: cols[i], hi: i % 2 === 0,
              delay: i * .13, dur: .55, k: null, landed: false
            });
          }
          st.assemble = { ph: 'fly', t: 0, pieces: pieces };
          setMode('debut');
          return;
        }
      } else {
        st.plat = 'floor';
        st.y = groundY();
      }
      if (T.reduced) {
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'نقشه', col: '#d9f2ef' });
        }
        goIdle();
        return;
      }
      setMode('wake');
    },
    sleep: function () {
      if (st.mode === 'zzz') return;
      st.jump = null; st.air = false;
      st.draft = null; st.sub = null; st.stampA = null;
      st.assemble = null; st.plumb = null; st.patPh = null;
      st.sx = .94; st.sy = .92; st.blink = 1; st.tilt = 0; st.spin = 0;
      st.y = groundY();   /* naps happen on the ground, never mid-air */
      setMode('zzz');
      st.zT = 0;
    },
    onResize: function () {
      var ns = T.mobile ? 2 : 3;
      if (ns !== SC) {
        SC = ns;
        body = makeScrollSprite(SC);
        SEAL = makeSealSprite(SC);
        BW = body.width; BH = body.height;
        LH = 2 * SC;
      }
      st.x = clamp(st.x, 30, T.W - 30);
      if (st.mode !== 'zzz' && st.mode !== 'boot') st.y = groundY();
      if (st.mode === 'draft') { st.draft = null; st.tilt = 0; st.blink = 0; goIdle(); }
      if (st.mode === 'stamp') { st.stampA = null; st.tilt = 0; goIdle(); }
    },
    onMotion: function (red) {
      if (red) {
        st.jump = null; st.draft = null; st.sub = null; st.stampA = null;
        st.assemble = null; st.plumb = null; st.patPh = null;
        st.tilt = 0; st.spin = 0; st.sx = 1; st.sy = 1;
        goIdle();
      }
    },
    force: function (what) {
      if (what === 'freeze') { T.frozen = true; return; }
      if (what === 'thaw') { T.frozen = false; return; }
      if (what === 'st') return {
        mode: st.mode,
        ph: st.draft ? (st.draft.lit ? 'draw' : 'pen') : (st.assemble ? st.assemble.ph : (st.sub ? st.sub.ph : (st.stampA ? st.stampA.ph : st.patPh))),
        x: Math.round(st.x), y: Math.round(st.y), plat: st.plat, face: st.face, spin: st.spin ? 1 : 0
      };
      if (what === 'draft') goDraft();
      else if (what === 'submit') {
        var slot = T.geo.slot;
        if (!slot) return;
        var sxp = Math.abs(slot.cx - 36) > 30 && !blocked(slot.cx - 36) ? slot.cx - 36 : slot.cx + 36;
        goWalk(clamp(sxp, 30, T.W - 30), 'submit');
      }
      else if (what === 'stamp') goStamp();
      else if (what === 'plumb') goPlumb();
      else if (what === 'roll') goRoll();
      else if (what === 'flutter') goFlutter();
      else if (what === 'greet') {
        var cta = T.geo.cta;
        if (!cta) return;
        var bx = cta.x > 70 ? cta.x - 30 : cta.x + cta.w + 30;
        goWalk(clamp(bx, 30, T.W - 30), 'greet');
      }
      else if (what === 'walk') goWalk(restSpot(st.x));
      else if (what === 'startle') { T.pSeen = true; goStartle(); }
      /* warps — freeze a mid-trick frame for inspection */
      else if (what === 'warp:assemble') {
        teardown();
        st.jump = null; st.air = false; st.plat = 'floor';
        st.y = groundY(); st.sx = 1; st.sy = 1;
        var pieces = [], src = [[-130, -96], [130, -96], [-74, -2], [74, -2], [0, -150]];
        for (var i2 = 0; i2 < 5; i2++) {
          pieces.push({
            x0: clamp(st.x + src[i2][0], 10, T.W - 10),
            y0: clamp(groundY() + src[i2][1], T.TOP + 20, groundY() - 4),
            x1: st.x + rand(-5, 5), y1: groundY() - rand(3, 15),
            w: (3 + (i2 % 2)) * SC, h: (2 + (i2 % 3 === 0 ? 1 : 0)) * SC,
            col: [TEAL, TEAL_HI, TEAL_DK, ROLL_HI, TEAL][i2], hi: i2 % 2 === 0,
            delay: i2 * .13, dur: .55, k: i2 < 3 ? 1 : .55, landed: i2 < 3
          });
        }
        st.assemble = { ph: 'fly', t: .55, pieces: pieces };
        setMode('debut');
      }
      else if (what === 'warp:draft') {
        teardown();
        st.jump = null; st.plat = 'floor'; st.y = groundY();
        st.draft = { t: 1.2, n: 0, bx: clamp(st.x + 70, 34, T.W - 34), lit: 1, k2: .5 };
        st.face = 1;
        setMode('draft');
      }
      else if (what === 'warp:stamp') {
        teardown();
        st.jump = null; st.plat = 'floor'; st.y = groundY();
        var seatY = headY() + BH * .34;
        st.stampA = { ph: 'press', t: .1, cy: seatY };
        st.sealA = 1;
        st.sy = .84; st.sx = 1.14;
        setMode('stamp');
      }
      else if (what === 'warp:plumb') {
        teardown();
        st.jump = null; st.spin = 0;
        st.plat = 'floor'; st.y = hangY(); st.hangY = st.y;
        st.mode = 'plumb'; st.patPh = 'hang'; st.patT = .5;
        st.plumb = { t: .5 };
      }
      else if (what === 'warp:submit') {
        teardown();
        st.jump = null; st.plat = 'floor'; st.y = groundY(); st.spin = 0;
        st.mode = 'submit';
        st.sub = { ph: 'toss', t: .28, roll: { ph: 'fly', t: .5 } };
      }
      else if (what === 'warp:curl') {
        teardown();
        st.jump = null; st.air = false; st.spin = 0; st.plat = 'floor';
        st.y = groundY();
        st.curl = 1; st.sx = .94; st.sy = .92; st.blink = 1;
        setMode('zzz'); st.zT = 0;
      }
      else if (what === 'warp:roll') {
        teardown();
        st.jump = null; st.mode = 'roll'; st.rollT = .44;
        var ks = (.44 - .16) / .55;
        st.spin = ks * Math.PI * 2;
        st.plat = 'floor'; st.y = groundY() - Math.sin(ks * Math.PI) * 14;
        st.air = true; st.sx = 1; st.sy = 1;
      }
    }
  };
}

/* ═════════════════════════════════════════════════════════════
   WORLD 04 — «یاس» Yas, a living jasmine sprout.
   Named for the یاس کرمان charity the platform serves: many
   small hands, one growing garden. It plants the kindness
   garden (باغ مهربانی), posts a petal through the cartridge
   slot like a donation, waters itself from a rose-pink can,
   basks under fireflies, and folds its petals closed to sleep.
   ═════════════════════════════════════════════════════════════ */
function makeYas(T) {
  var SC = T.mobile ? 2 : 3;        /* device px per cell */

  /* palette — mixed from the section's own night garden */
  var INK    = '#1b0f55';           /* the section's own shadow */
  var PETAL  = '#f6f2ff';           /* the section's own text — the bloom */
  var PET_HI = '#ffffff';
  var PET_SH = '#cfc4ee';
  var GOLD   = '#e8c74d';           /* the bloom's heart — W01's gold, inherited */
  var GOLD_HI= '#ffe9a8';
  var GOLD_D2= '#c79b2a';
  var STEM   = '#4caf7d';           /* moonlit green */
  var STEM_HI= '#8fdcae';
  var STEM_DK= '#2e7a55';
  var ROSE   = '#ed145b';           /* the world's own accent — cheeks, heart, can */
  var ROSE_HI= '#ff6aa5';
  var SOIL   = '#241566';
  var SOIL_HI= '#3b2a86';

  /* ── the stem, prerendered once per scale ─────────────────────
     10 cells wide (the stem is 3), 12 tall: ink edges, moonlit
     green core lit from the left, two leaves reaching up. */
  function makeStemSprite(sc) {
    var W = 10, ROWS = 12, pad = 2;
    var cv = doc.createElement('canvas');
    cv.width = (W + pad * 2) * sc; cv.height = (ROWS + pad * 2) * sc;
    var g = cv.getContext('2d');
    function px(x, y, col) { g.fillStyle = col; g.fillRect((pad + x) * sc, (pad + y) * sc, sc, sc); }
    function row(y, x0, x1, col) { for (var x = x0; x <= x1; x++) px(x, y, col); }
    for (var j = 0; j < ROWS; j++) {
      px(3, j, INK); px(7, j, INK);
      row(j, 4, 5, STEM); px(6, j, STEM_DK);
      if (j < ROWS - 1) px(4, j, STEM_HI);
    }
    /* left leaf — reaching up-left, rows 3..6 */
    px(1, 3, INK); px(2, 3, INK);
    px(0, 4, INK); px(1, 4, STEM_HI); px(2, 4, STEM_HI); px(3, 4, INK);
    px(0, 5, INK); px(1, 5, STEM); px(2, 5, STEM); px(3, 5, INK);
    px(1, 6, INK); px(2, 6, STEM_DK); px(3, 6, INK);
    /* right leaf — reaching up-right, rows 6..9 */
    px(8, 6, INK); px(9, 6, INK);
    px(6, 7, INK); px(7, 7, STEM); px(8, 7, STEM_HI); px(9, 7, INK);
    px(6, 8, INK); px(7, 8, STEM); px(8, 8, STEM_DK); px(9, 8, INK);
    px(7, 9, INK); px(8, 9, INK);
    return cv;
  }

  /* ── the bloom, prerendered at three spreads ──────────────────
     a TRUE five-petal jasmine, not a circle with lines: five
     plump petals, each with its own ink outline, a moonlit
     crescent up-left and lavender shade down-right (the two
     underside petals stay duskier), a deep fold between every
     pair of petals, and the jasmine cleft — a little nick —
     cut into every petal tip. The gold heart sits in the middle
     and the green calyx wraps the bloom where it drinks from
     the stem. bud = a folded white tube wrapped in sepals. */
  function makeHeadSprite(r, crease, discR, sepal, sc) {
    var R = Math.ceil(r) + 2;
    var cv = doc.createElement('canvas');
    cv.width = R * 2 * sc; cv.height = R * 2 * sc;
    var g = cv.getContext('2d');
    var c = R * sc;
    var PA   = [-90, -18, 54, 126, 198];   /* where each petal heart sits */
    var SEAM = [-54, 18, 90, 162, 234];    /* the folds between petals */
    var RD, PR, CORE, rx, ry, inside;
    if (sepal) {
      rx = r * .78; ry = r * 1.06;         /* the bud — taller than wide */
      inside = function (x, y) { return (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1; };
    } else {
      /* petal discs: hearts at .56r from center, tips reach exactly r,
         dips between petals at ~.75r — the scalloped flower edge */
      RD = r * .56; PR = r * .44; CORE = r * .42;
      inside = function (x, y) {
        var d = Math.sqrt(x * x + y * y);
        if (d <= CORE) return true;
        for (var q = 0; q < 5; q++) {
          var a = PA[q] * Math.PI / 180;
          var dx = x - RD * Math.cos(a), dy = y - RD * Math.sin(a);
          if (dx * dx + dy * dy <= PR * PR) return true;
        }
        return false;
      };
    }
    function angDiff(a, b) { return Math.abs(((a - b) % 360 + 540) % 360 - 180); }
    for (var j = -R; j <= R; j++) {
      for (var i = -R; i <= R; i++) {
        if (!inside(i, j)) continue;
        var col;
        /* the ink outline — where the neighbors run out */
        if (!inside(i - 1, j) || !inside(i + 1, j) ||
            !inside(i, j - 1) || !inside(i, j + 1) ||
            !inside(i + 1, j + 1)) col = INK;   /* extra ink on the shadow side */
        else if (sepal) {
          /* the folded bud: white tube, soft creases, green wrap */
          var sLine = ry * .30 - (Math.abs(i) < .7 ? ry * .14 : 0);  /* center sepal rises */
          if (j > sLine) col = (j > ry * .68 || i > .9) ? STEM_DK : ((i < -.9 && j < ry * .55) ? STEM_HI : STEM);
          else if (Math.abs(Math.abs(i) - rx * .42) < rx * .09 && j > -ry * .5) col = PET_SH;
          else if (i < -rx * .52) col = PET_HI;
          else if (i > rx * .45) col = PET_SH;
          else col = PETAL;
        } else {
          var d = Math.sqrt(i * i + j * j);
          var a2 = Math.atan2(j, i) * 180 / Math.PI;
          /* the green calyx where the bloom meets the stem */
          if (r >= 4 && j > r * .64 && Math.abs(i) < (j > r * .74 ? r * .32 : r * .26)) {
            col = (j > r * .78 || Math.abs(i) > r * .17) ? STEM_DK : STEM;
            if (i < -r * .17 && j < r * .76) col = STEM_HI;
          }
          /* the gold heart */
          else if (discR > 0 && d < discR) col = (i + j) < -.4 ? GOLD_HI : ((i + j) > 1.1 ? GOLD_D2 : GOLD);
          else {
            /* which petal owns this pixel */
            var q2, best = 0, bd = 1e9;
            for (q2 = 0; q2 < 5; q2++) {
              var ad = angDiff(a2, PA[q2]);
              if (ad < bd) { bd = ad; best = q2; }
            }
            var pa = PA[best] * Math.PI / 180;
            var px2 = i - RD * Math.cos(pa), py2 = j - RD * Math.sin(pa);
            var pl = Math.sqrt(px2 * px2 + py2 * py2) || 1;
            var t = (px2 / pl) * -.62 + (py2 / pl) * -.79;   /* moonlight from up-left */
            var low = Math.sin(pa) > .3;                     /* the two underside petals */
            if (crease > 0 && r >= 3.5 && d >= r - 1.25 && bd < 8) col = INK;   /* the cleft */
            else if (crease > 0) {
              var sm = 99, sq = -1;
              for (q2 = 0; q2 < 5; q2++) {
                var d3 = angDiff(a2, SEAM[q2]);
                if (d3 < sm) { sm = d3; sq = q2; }
              }
              /* the 90° fold is skipped — the calyx already parts the
                 two underside petals there, right under the mouth */
              if (sm < 10 && sq !== 2 && d > discR + .75 && d < r - .9) col = INK;
              else col = t > (low ? .5 : .34) ? PET_HI : (t < (low ? -.18 : -.42) ? PET_SH : PETAL);
            }
            else col = t > (low ? .5 : .34) ? PET_HI : (t < (low ? -.18 : -.42) ? PET_SH : PETAL);
          }
        }
        g.fillStyle = col;
        g.fillRect(Math.round(c + i * sc - sc / 2), Math.round(c + j * sc - sc / 2), sc, sc);
      }
    }
    return cv;
  }

  /* the rose-pink watering can — spout baked pointing left, so
     it waters the flower whenever it stands on its right */
  function makeCanSprite(sc) {
    var W = 9, H = 8, pad = 1;
    var cv = doc.createElement('canvas');
    cv.width = (W + pad * 2) * sc; cv.height = (H + pad * 2) * sc;
    var g = cv.getContext('2d');
    function px(x, y, col) { g.fillStyle = col; g.fillRect((pad + x) * sc, (pad + y) * sc, sc, sc); }
    px(0, 3, INK); px(0, 4, INK);
    px(1, 3, INK); px(1, 4, ROSE_HI); px(1, 5, INK);
    var i, j;
    for (j = 2; j <= 6; j++) {
      px(2, j, INK); px(7, j, INK);
      for (i = 3; i <= 6; i++) px(i, j, j === 2 ? ROSE_HI : ROSE);
    }
    for (i = 2; i <= 7; i++) px(i, 7, INK);
    px(3, 1, INK); px(4, 0, INK); px(5, 0, INK); px(6, 1, INK);
    px(4, 1, INK); px(5, 1, INK);
    return cv;
  }

  var stemC, headBloom, headHalf, headBud, miniC, canC;
  function buildSprites() {
    stemC = makeStemSprite(SC);
    headBloom = makeHeadSprite(6, 1.6, 1.9, false, SC);
    headHalf  = makeHeadSprite(4.8, .7, 1.2, false, SC);
    headBud   = makeHeadSprite(3.4, 0, 0, true, SC);
    miniC     = makeHeadSprite(1.9, .5, .7, false, SC);
    canC      = makeCanSprite(SC);
  }
  buildSprites();
  var LH = 2 * SC;                  /* root-leg height, device px */
  var STEM_H = 12 * SC;             /* usable stem rows, device px */

  var st = {
    started: false,
    mode: 'boot', t: 0, dur: 1,
    x: 60, y: 0, plat: 'floor',
    face: 1, tilt: 0, sway: 0, sx: 1, sy: 1,
    bloom: 0,                       /* 0 bud · 1 half · 2 full bloom */
    air: false, jump: null,
    tx: 0, walkPh: 0, after: 'idle',
    blink: 0, blinking: false, bt: 0, blinkT: rand(2.5, 5),
    lookX: 0, lookY: 0, glance: null, wide: 0, happy: 0,
    cool: {},
    garden: null, can: null, pet: null, grow: null,
    patPh: null, patT: 0, hangY: 0, bT: 0,
    introDone: false, zT: 0
  };

  function groundY() { return T.H - 12; }
  /* the glass ceiling: the flower top never pokes above the
     section's own top edge — 2px shy of the checker rim. THE
     invariant of the terrarium: the resident is always inside. */
  /* 8.6 cells = 2.6 (head center) + 6.0 (petal tip) — the budget
     the glass ceiling is enforcing, matched to the real bloom */
  function topLim() { return T.TOP + 16 + LH + (STEM_H + 8.6 * SC) * st.sy; }
  function hangY() { return T.TOP + 17 + LH + (STEM_H + 8.6 * SC); }
  function headY() { return st.y - LH - (STEM_H + 8.6 * SC) * st.sy; }
  function headCY() { return st.y - LH - (STEM_H + 2.6 * SC) * st.sy; }
  function midY() { return st.y - LH - STEM_H * .7; }
  function ok(k, cd) { return T.time - (st.cool[k] || -99) > cd; }
  function blocked(x) {
    var g = T.geo;
    if (g.text && x > g.text.x - 34 && x < g.text.x + g.text.w + 34) return true;
    if (g.cta  && x > g.cta.x - 30 && x < g.cta.x + g.cta.w + 30) return true;
    return false;
  }
  function restSpot(notX) {
    var g = T.geo, W = T.W;
    var cands = [36, W - 36];
    if (g.cart) cands.push(g.cart.x - 30, g.cart.x + g.cart.w + 30);
    if (g.slot) cands.push(g.slot.cx - 34, g.slot.cx + 34);
    if (g.cta) {
      if (g.cta.x > 70) cands.push(g.cta.x - 34);
      if (g.cta.x + g.cta.w < W - 70) cands.push(g.cta.x + g.cta.w + 34);
    }
    if (g.text) {
      var gapL, gapR;
      if (g.text.x > W / 2) { gapL = 30; gapR = g.text.x - 20; }
      else { gapL = g.text.x + g.text.w + 20; gapR = W - 30; }
      if (gapR - gapL > 90) cands.push((gapL + gapR) / 2);
    }
    cands.push(rand(40, W - 40));
    for (var tries = 10; tries > 0; tries--) {
      var x = pick(cands);
      if (notX != null && Math.abs(x - notX) < 70) continue;
      if (blocked(x)) continue;
      return clamp(x, 30, W - 30);
    }
    return notX != null ? (notX < W / 2 ? W - 50 : 50) : W / 2;
  }
  /* everyday strolls stay local — short walks mean more decisions
     per minute, so the tricks actually get their stage time */
  function nearSpot(notX) {
    var tx = clamp(st.x + pick([-1, 1]) * rand(150, 340), 40, T.W - 40);
    if (blocked(tx)) tx = clamp(st.x - pick([-1, 1]) * rand(150, 340), 40, T.W - 40);
    if (blocked(tx)) tx = restSpot(notX);
    return tx;
  }

  /* ── motion helpers ─────────────────────────────────────────── */
  function setJump(o) {
    st.jump = { t: 0, dur: o.dur || .4, x0: st.x, x1: o.x1, y0: st.y, y1: o.y1, h: o.h || 0, ez: o.ez || null, landed: o.landed, plat: o.plat || st.plat, after: o.after || null };
    st.face = o.x1 >= st.x ? 1 : -1;
  }
  function setMode(m, dur) { st.mode = m; st.t = 0; st.dur = dur || 1; }
  function goIdle() { st.tilt = 0; setMode('idle', rand(.6, 1.5)); }
  function goWalk(tx, after) {
    st.tx = clamp(tx, 30, T.W - 30);
    st.after = after || 'idle';
    st.jump = null; st.air = false;   /* a walk owns the body — no in-flight jump may keep steering it */
    st.plat = 'floor';
    st.y = groundY();   /* reconcile feet to the platform — no sky-walks */
    st.face = st.tx >= st.x ? 1 : -1;
    setMode('walk');
    T.parts.spawn('dust', st.x - st.face * 6, groundY() - 2);
  }
  /* an interrupt tears the props down — no frozen cans, petals,
     gardens or half-grown soil left hanging */
  function teardown() {
    st.garden = null; st.can = null; st.pet = null; st.grow = null;
    st.sx = 1; st.sy = 1; st.tilt = 0;
  }

  /* ── the trick list ─────────────────────────────────────────── */
  /* the kindness garden (باغ مهربانی): five mounds, five seeds,
     five little blooms — many small hands, one growing garden. */
  function gardenSpot() {
    var g = T.geo, W = T.W, cands = [], i, x;
    if (g.text) {
      if (g.text.x > W / 2) { if (g.text.x - 90 > 40) cands.push((40 + g.text.x - 40) / 2); }
      else if (g.text.x + g.text.w + 90 < W - 40) cands.push((g.text.x + g.text.w + 40 + W - 40) / 2);
    }
    cands.push(W / 2, W * .25, W * .75, 80, W - 80);
    /* nearest good ground first — no marathon walks before the show */
    cands.sort(function (a, b) { return Math.abs(a - st.x) - Math.abs(b - st.x); });
    for (i = 0; i < cands.length; i++) {
      var good = true;
      for (x = cands[i] - 34; x <= cands[i] + 34; x += 17)
        if (blocked(x)) { good = false; break; }
      if (good) return clamp(cands[i], 60, W - 60);
    }
    return null;
  }
  function goGarden() {
    st.cool.garden = T.time;
    teardown();
    var cx = gardenSpot();
    if (cx == null) { goIdle(); return; }
    var xs = [], i;
    for (i = 0; i < 5; i++) xs.push(clamp(cx + (i - 2) * 16, 30, T.W - 30));
    st.garden = { ph: 'plant', t: 0, i: -1, dir: 1, xs: xs,
                  m: [0, 0, 0, 0, 0], s: [0, 0, 0, 0, 0], pop: [0, 0, 0, 0, 0],
                  seed: null, heart: 0, fade: 0 };
    goWalk(clamp(xs[0] - 12, 30, T.W - 30), 'gardenGo');
  }
  function gardenHop() {
    var G = st.garden;
    if (!G || G.ph !== 'plant') return;
    G.i++;
    if (G.i >= G.xs.length) { G.ph = 'grow'; G.t = 0; st.face = G.dir; return; }
    var standX = clamp(G.xs[G.i] - G.dir * 11, 30, T.W - 30);
    st.face = standX >= st.x ? 1 : -1;
    setJump({ x1: standX, y1: groundY(), h: 7, dur: .3, after: function () {
      var GG = st.garden;
      if (!GG || GG.ph !== 'plant') return;
      st.face = GG.dir;
      GG.seed = { x0: st.x + GG.dir * 2, y0: headCY() + SC, x1: GG.xs[GG.i], y1: groundY() - 6, t: 0 };
    } });
  }
  function goCan() {
    st.cool.can = T.time;
    teardown();
    st.face = blocked(st.x + 60) ? -1 : (blocked(st.x - 60) ? 1 : pick([-1, 1]));
    st.can = { ph: 'summon', t: 0, k: 0, pour: 0, acc: 0, scT: 0 };
    setMode('can');
    T.parts.spawn('dust', st.x + st.face * 9 * SC, groundY() - 3);
  }
  function goPetal() {
    st.cool.petal = T.time;
    var slot = T.geo.slot;
    if (!slot) return;
    var sxp = Math.abs(slot.cx - 36) > 30 && !blocked(slot.cx - 36) ? slot.cx - 36 : slot.cx + 36;
    goWalk(clamp(sxp, 30, T.W - 30), 'petalGo');
  }
  function goBask() {
    st.cool.bask = T.time;
    teardown();
    st.bT = 0;
    setMode('bask');
  }
  function goGreet() {
    st.cool.greet = T.time;
    var cta = T.geo.cta;
    if (!cta) { goIdle(); return; }
    var bx = cta.x > 70 ? cta.x - 30 : cta.x + cta.w + 30;
    goWalk(clamp(bx, 30, T.W - 30), 'greet');
  }
  function goLeap() {
    st.cool.leap = T.time;
    goWalk(clamp(st.x + rand(-110, 110), 50, T.W - 50), 'leapUp');
  }
  function goSway() {
    st.cool.sway = T.time;
    st.sT = 0; st.sS = 0; st.sS2 = 0;
    setMode('sway');
  }
  function goJig() {
    st.cool.jig = T.time;
    setMode('jig'); st.jigT = 0; st.jigHop = false; st.jigN = 0;
  }
  function goShiver() {
    st.cool.shiver = T.time;
    st.shT = 0; st.shS = 0; st.shS2 = 0;
    setMode('shiver');
  }
  function goStartle() {
    st.cool.startle = T.time;
    var dir = st.x < T.px ? -1 : 1;
    var tx = st.x + dir * rand(56, 88);
    if (Math.abs(tx - st.x) < 20) tx = st.x - dir * 60;
    tx = clamp(tx, 30, T.W - 30);
    T.parts.spawn('bang', st.x, headY() - 10);
    st.wide = 1.1;
    st.happy = 0;
    teardown();
    st.patPh = null;
    var i;
    for (i = 0; i < 3; i++) T.parts.spawn('petal', st.x + rand(-8, 8), st.y - rand(40, 66));
    for (i = 0; i < 4; i++) T.parts.spawn('dust', st.x + rand(-12, 12), st.y - rand(4, 24));
    setJump({ x1: tx, y1: T.H - 12, h: 30, dur: .42, plat: 'floor', after: goIdle });
    setMode('startle');
  }
  function choose() {
    var c;
    if (T.reduced) { goIdle(); return; }
    if (!st.firstAct) {
      st.firstAct = true;
      goWalk(restSpot(st.x));
      return;
    }
    c = [[13, function () { goWalk(nearSpot(st.x)); }]];
    c.push([6, function () { goIdle(); }]);
    c.push([7, goSway]);
    c.push([5, goJig]);
    if (ok('garden', 14) && gardenSpot() != null) c.push([16, goGarden]);
    if (ok('can', 11)) c.push([9, goCan]);
    if (ok('petal', 13) && T.geo.slot) c.push([12, goPetal]);
    if (ok('bask', 9)) c.push([8, goBask]);
    if (ok('greet', 20) && T.geo.cta) c.push([9, goGreet]);
    if (ok('leap', 12)) c.push([16, goLeap]);
    weighted(c)();
  }

  /* ── arrival dispatch (walk → what comes next) ──────────────── */
  function dispatch(name) {
    if (name === 'idle') { goIdle(); return; }
    if (name === 'gardenGo') {
      var Gg = st.garden;
      if (!Gg) { goIdle(); return; }
      setMode('garden');   /* the plant phase owns the brain — hops + seed arcs run in gardenTick */
      gardenHop();
      return;
    }
    if (name === 'petalGo') {
      var slot = T.geo.slot;
      if (!slot) { goIdle(); return; }
      st.pet = { ph: 'pluck', t: 0, x: 0, y: 0, sx: 0, sy: 0 };
      st.happy = 1.5;
      st.face = slot.cx >= st.x ? 1 : -1;
      setMode('petal');
      return;
    }
    if (name === 'greet') { setMode('greet'); st.gT = 0; st.gS = 0; return; }
    if (name === 'leapUp') {
      /* the rim leap, night-air edition: launch, hang just under
         the checker rim to smell the night, then gravity takes
         the flower back down to a new spot.
         (Landing ON the rim hoisted residents into the section
         above — that's a jailbreak.) */
      setMode('leap');
      st.patPh = 'up';
      st.wide = .8;
      st.lookY = -2;
      setJump({ x1: st.x + pick([-1, 1]) * rand(6, 18), y1: hangY(), h: 0, dur: .52, ez: 'out', plat: 'floor', landed: false, after: function () {
        st.patPh = 'hang';
        st.patT = 0;
        st.hangY = st.y;
      } });
      return;
    }
    goIdle();
  }

  /* ── per-tick ───────────────────────────────────────────────── */
  function tick(dt) {
    st.t += dt;
    if (st.happy > 0) st.happy -= dt;
    if (st.wide > 0) st.wide -= dt;

    /* a flower is never quite still — it sways with the night air */
    if (st.mode !== 'zzz' && !T.reduced) st.sway = Math.sin(T.time * 1.7) * .032;
    else st.sway *= .85;

    /* blinking — the universal sign of being alive.
       Sleepers keep their eyes shut: the nap pauses this machine. */
    if (st.mode !== 'zzz') {
      if (!st.blinking) {
        st.blinkT -= dt;
        if (st.blinkT <= 0) { st.blinking = true; st.bt = 0; }
      } else {
        st.bt += dt;
        st.blink = st.bt < .13 ? 1 : 0;
        if (st.bt >= .13) { st.blinking = false; st.blinkT = rand(2.6, 5.4); }
      }
    }

    /* pupils: watch the pointer when it's near, honor a glance */
    st.lookX = lerp(st.lookX, 0, dt * 4);
    st.lookY = lerp(st.lookY, 0, dt * 4);
    if (st.glance) {
      st.glance.t -= dt;
      var gd = Math.max(1, Math.abs(st.glance.dx) + Math.abs(st.glance.dy));
      st.lookX = st.glance.dx / gd * 2.4;
      st.lookY = st.glance.dy / gd * 2;
      if (st.glance.t <= 0) st.glance = null;
    } else if (T.pSeen && st.mode !== 'startle' && st.mode !== 'garden' &&
               st.mode !== 'can' && st.mode !== 'petal' && st.mode !== 'bask' && st.mode !== 'grow') {
      var hx = st.x, hy = headCY();
      var dd = Math.hypot(T.px - hx, T.py - hy);
      if (dd < 280) {
        st.lookX = clamp((T.px - hx) / 40, -1, 1) * 2.2;
        st.lookY = clamp((T.py - hy) / 40, -1, 1) * 2;
      }
    }

    /* scripted jumps own the body while airborne */
    if (st.jump) {
      var j = st.jump;
      j.t += dt;
      var k = clamp(j.t / j.dur, 0, 1);
      st.x = lerp(j.x0, j.x1, easeOut(k));
      var ky = j.ez === 'out' ? easeOut(k) : (j.ez === 'in' ? easeIn(k) : k);
      st.y = lerp(j.y0, j.y1, ky) - Math.sin(k * Math.PI) * j.h;
      if (st.y < topLim()) st.y = topLim();   /* the glass ceiling holds, every frame */
      st.air = true;
      st.walkPh += dt * 14;
      if (k >= 1) {
        st.jump = null; st.air = false; st.y = j.y1; st.plat = j.plat;
        if (j.landed !== false) T.parts.spawn('dust', st.x - 5, st.y - 1);
        if (j.landed !== false) T.parts.spawn('dust', st.x + 5, st.y - 1);
        var af = j.after; j.after = null;
        if (af) af();
      }
      tapCheck();
      return;
    }

    var m = st.mode;
    if (m === 'idle') {
      if (st.t >= st.dur) choose();
    } else if (m === 'wake') {
      /* dawn: the petals open while she stretches */
      st.bloom = clamp(st.t / .45, 0, 1) * 2;
      var k2 = clamp(st.t / .7, 0, 1);
      if (k2 < .4) { st.sy = lerp(.8, 1.12, easeOut(k2 / .4)); st.sx = lerp(1.12, .92, k2 / .4); }
      else { st.sy = lerp(1.12, 1, easeOut((k2 - .4) / .6)); st.sx = lerp(.92, 1, (k2 - .4) / .6); }
      if (st.t >= .7) {
        st.sx = 1; st.sy = 1; st.bloom = 2;
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'یاس', col: '#f3efff' });
        }
        goIdle();
      }
    } else if (m === 'grow') {
      growTick(dt);
    } else if (m === 'walk') {
      var spd = (T.mobile ? 46 : 60) * dt;
      var dx = st.tx - st.x;
      if (Math.abs(dx) <= spd) {
        st.x = st.tx;
        dispatch(st.after);
      } else {
        st.x += (dx > 0 ? spd : -spd);
        st.face = dx > 0 ? 1 : -1;
        st.walkPh += dt * 12;
        if (Math.random() < dt * 1.8) T.parts.spawn('dust', st.x - st.face * 6, groundY() - 2);
      }
    } else if (m === 'garden') {
      gardenTick(dt);
    } else if (m === 'can') {
      canTick(dt);
    } else if (m === 'petal') {
      petalTick(dt);
    } else if (m === 'bask') {
      baskTick(dt);
    } else if (m === 'greet') {
      greetTick(dt);
    } else if (m === 'leap') {
      patrolTick(dt);
    } else if (m === 'sway') {
      /* a breeze through the leaves */
      st.sT += dt;
      st.tilt = Math.sin(st.sT * 17) * .085 * (1 - st.sT / 1.15);
      st.sx = 1 + Math.sin(st.sT * 15) * .03 * (1 - st.sT / 1.15);
      st.blink = 1;
      if (st.sT > .18 && !st.sS) { st.sS = 1; T.parts.spawn('petal', st.x + st.face * 10, headCY() - 4 * SC); }
      if (st.sT > .55 && !st.sS2) { st.sS2 = 1; T.parts.spawn('petal', st.x - st.face * 12, headCY()); }
      if (st.sT >= 1.1) {
        st.tilt = 0; st.sx = 1; st.blink = 0;
        goIdle();
      }
    } else if (m === 'jig') {
      st.jigT += dt;
      if (!st.jigHop && (st.jigT > .05)) {
        st.jigHop = true;
        setJump({ x1: st.x, y1: groundY(), h: 9, dur: .26, after: function () {
          st.tilt = (st.jigN || 0) % 2 ? -.11 : .11;
          st.jigN = (st.jigN || 0) + 1;
          if ((st.jigN || 0) < 3) { st.jigHop = false; st.jigT = 0; }
          else { st.tilt = 0; st.jigN = 0; goIdle(); }
        } });
      }
    } else if (m === 'shiver') {
      /* a delighted shiver — petals flutter loose */
      st.shT += dt;
      st.tilt = Math.sin(st.shT * 30) * .11 * (1 - st.shT / .55);
      st.happy = 1.6;
      if (st.shT > .04 && !st.shS) { st.shS = 1; T.parts.spawn('petal', st.x + 6, headCY() - 2 * SC); }
      if (st.shT > .16 && !st.shS2) { st.shS2 = 1; T.parts.spawn('petal', st.x - 8, headCY()); }
      if (st.shT >= .55) { st.tilt = 0; goIdle(); }
    } else if (m === 'zzz') {
      /* nyctinasty — a jasmine folds its petals for the night */
      st.zT += dt;
      st.bloom = Math.max(0, st.bloom - dt * 2.4);
      if (st.zT > .55 && !T.reduced) {
        st.zT = 0;
        T.parts.spawn('z', st.x + st.face * 8, headY() - 4, { col: '#cfc4ee' });
      }
      if (st.t > 1.4 && !T.snooze) { T.dormant = true; return; }
    } else if (m === 'startle') {
      /* body owned by the jump; nothing else to do here */
    }

    /* fireflies — the night garden's weather, drifting through */
    if (m !== 'zzz' && !T.reduced && Math.random() < dt * .22 && countFly() < 3) {
      T.parts.spawn('fly', clamp(st.x + rand(-130, 130), 30, T.W - 30), groundY() - rand(16, 64));
    }

    /* pointer startle reflex — but never mid-trick, never reduced */
    var busy = (m === 'garden' || m === 'can' || m === 'petal' || m === 'bask' ||
                m === 'grow' || m === 'leap' || m === 'zzz' || m === 'startle');
    if (!busy && !T.reduced && !st.jump && T.pSeen && ok('startle', 5)) {
      var px = T.px, py = T.py;
      if (Math.hypot(px - st.x, py - midY()) < 64) goStartle();
    }

    tapCheck();
  }
  function countFly() {
    var n = 0;
    for (var i = 0; i < T.parts.list.length; i++) if (T.parts.list[i].type === 'fly') n++;
    return n;
  }

  /* taps: a shiver on the flower itself, a curious glance elsewhere */
  function tapCheck() {
    if (!T.tap) return;
    var t = T.tap;
    T.tap = null;
    var near = Math.hypot(t.x - st.x, t.y - midY()) < 56;
    if (near) {
      if (st.mode === 'zzz') { wakeNow(); return; }
      /* mid-show? a tap just delights — never yanks the body down */
      if (st.mode === 'garden' || st.mode === 'can' || st.mode === 'petal' ||
          st.mode === 'bask' || st.mode === 'grow' || st.mode === 'leap') { st.happy = Math.max(st.happy, 1.5); return; }
      if (st.mode !== 'shiver' && ok('shiver', 2.2) && !st.jump) { goShiver(); return; }
    }
    if (!st.glance) {
      st.glance = { dx: t.x - st.x, dy: t.y - headCY(), t: .9 };
    }
  }

  /* ── garden: seeds, sprouts, and one finished kindness ───────── */
  function gardenTick(dt) {
    var G = st.garden;
    G.t += dt;
    if (G.ph === 'plant') {
      st.happy = Math.max(st.happy, .6);
      st.lookX = G.dir * 1.6; st.lookY = 1;
      if (G.seed) {
        G.seed.t += dt * 3.4;
        if (G.seed.t >= 1) {
          G.m[G.i] = .01;          /* the mound rises where the seed lands */
          G.seed = null;
          gardenHop();
        }
      }
      for (var mi = 0; mi < 5; mi++)
        if (G.m[mi] > 0 && G.m[mi] < 1) G.m[mi] = Math.min(1, G.m[mi] + dt * 5);
    } else if (G.ph === 'grow') {
      var done = true, i;
      for (i = 0; i < G.xs.length; i++) {
        if (G.t > .45 * i && G.s[i] < 1) {
          G.s[i] = Math.min(1, G.s[i] + dt * 1.6);
          if (G.s[i] >= 1 && !G.pop[i]) {
            G.pop[i] = 1;
            T.parts.spawn('scent', G.xs[i] + rand(-4, 4), groundY() - 27);
            T.parts.spawn('spark', G.xs[i], groundY() - 25, { up: 6 });
          }
        }
        if (G.s[i] < 1) done = false;
      }
      if (done && !G.heart) {
        G.heart = 1;
        var cxs = (G.xs[0] + G.xs[G.xs.length - 1]) / 2;
        T.parts.spawn('heart', cxs, groundY() - 46);
        T.parts.spawn('scent', cxs - 11, groundY() - 40);
        T.parts.spawn('scent', cxs + 13, groundY() - 44);
        st.happy = 2.6;
        G.ph = 'admire'; G.t = 0;
      }
    } else if (G.ph === 'admire') {
      st.lookX = Math.sin(G.t * 3) * 2;
      st.lookY = 1.2;
      if (G.t > 1.3) { G.ph = 'fade'; G.t = 0; }
    } else if (G.ph === 'fade') {
      G.fade = Math.min(1, G.fade + dt / 1.3);
      if (G.fade >= 1) { st.garden = null; goIdle(); }
    }
  }

  /* ── can: the rose-pink can pops out of the soil and waters her ── */
  function canTick(dt) {
    var C = st.can;
    C.t += dt;
    if (C.ph === 'summon') {
      C.k = Math.min(1, C.k + dt * 2.8);
      if (C.k >= 1) { C.ph = 'hold'; C.t = 0; }
    } else if (C.ph === 'hold') {
      if (C.t > .28) { C.ph = 'pour'; C.t = 0; }
    } else if (C.ph === 'pour') {
      C.pour = Math.min(1, C.pour + dt * 4);
      if (C.t < 1.15) {
        C.acc += dt;
        if (C.acc > .06) {
          C.acc = 0;
          var tipX = st.x + st.face * (9 * SC - 4.5 * SC);
          T.parts.spawn('drop', tipX - st.face * 2, headCY() + 2.4 * SC, { vx: -st.face * rand(6, 15) });
        }
      }
      C.scT += dt;
      if (C.scT > .4) {
        C.scT = 0;
        T.parts.spawn('scent', st.x + rand(-8, 8), headY() + 2 * SC);
      }
      st.happy = Math.max(st.happy, .8);
      if (C.t > 1.5) { C.ph = 'stow'; C.t = 0; }
    } else if (C.ph === 'stow') {
      C.pour = Math.max(0, C.pour - dt * 4);
      C.k = Math.max(0, C.k - dt * 2.6);
      if (C.k <= 0) {
        T.parts.spawn('dust', st.x + st.face * 9 * SC, groundY() - 3);
        st.can = null;
        st.happy = 1.8;
        goIdle();
      }
    }
  }

  /* ── petal: one of her own petals, posted like a donation ────── */
  function petalTick(dt) {
    var P = st.pet, slot = T.geo.slot;
    P.t += dt;
    if (P.ph === 'pluck') {
      st.tilt = st.face * .2 * Math.min(1, P.t / .2);
      st.lookX = st.face * 1.8; st.lookY = 1.6;
      var k = clamp(P.t / .25, 0, 1);
      P.x = st.x + st.face * (2 + 4 * k) * 1;
      P.y = headCY() + SC - 8 * SC * k * .55;
      if (P.t > .3) {
        P.ph = 'toss'; P.t = 0;
        P.sx = P.x; P.sy = P.y;
      }
    } else if (P.ph === 'toss') {
      st.tilt = st.face * .2;
      var kt = clamp(P.t / .5, 0, 1);
      P.x = lerp(P.sx, slot.cx, kt);
      P.y = lerp(P.sy, slot.cy, kt) - Math.sin(kt * Math.PI) * 26;
      if (kt >= 1) {
        P.ph = 'pat'; P.t = 0;
        var i;
        for (i = 0; i < 5; i++) T.parts.spawn('spark', slot.cx + rand(-8, 8), slot.cy + rand(-4, 4), { up: 8 });
        T.parts.spawn('flash', slot.x, slot.y, { s: slot.w, life: .3 });
        st.happy = 2.5;
      }
    } else if (P.ph === 'pat') {
      st.tilt = st.face * .2 * Math.max(0, 1 - P.t * 2);
      st.tilt += Math.sin(P.t * 10) * .09 * Math.min(1, P.t * 3);
      if (P.t >= .6) {
        st.tilt = 0;
        setJump({ x1: st.x, y1: groundY(), h: 12, dur: .32, after: goIdle });
        st.pet = null;
      }
    }
  }

  /* ── bask: face up in the moonlight, petals glowing ──────────── */
  function baskTick(dt) {
    var B = st.bT += dt;
    st.tilt = -st.face * .13 * easeOut(Math.min(1, B / .6));
    st.lookY = -2.2;
    st.lookX = 0;
    if ((B * 2.6 | 0) !== ((B - dt) * 2.6 | 0))
      T.parts.spawn('scent', st.x + rand(-10, 10), headY() + rand(0, 3 * SC));
    if (B > 2.5) {
      st.tilt = 0;
      st.happy = 1.8;
      goIdle();
    }
  }

  /* ── greet: the bloom-bow to the world's gate ────────────────── */
  function greetTick(dt) {
    st.gT += dt;
    var kb = clamp(st.gT / 1.7, 0, 1);
    st.tilt = st.face * .3 * Math.pow(Math.sin(kb * Math.PI * 2), 2);
    st.lookX = st.face * 2; st.lookY = 2;
    if (st.tilt > .24 && !st.gS) {
      st.gS = 1;
      T.parts.spawn('scent', st.x + st.face * 8, headY() + 2 * SC);
    }
    if (st.gT >= 1.7) { st.tilt = 0; goIdle(); }
  }

  /* ── leap: the hang under the rim, then the drop ─────────────── */
  function patrolTick(dt) {
    if (st.patPh === 'hang') {
      st.patT += dt;
      st.air = true;
      st.y = Math.max(st.hangY, topLim()) + 2 + Math.sin(st.patT * 9) * 2;
      st.lookX = Math.sin(st.patT * 4.2) * 2.2;
      st.lookY = -1.4;
      if (Math.random() < dt * 2) T.parts.spawn('scent', st.x + rand(-10, 10), st.y - (STEM_H + 8.6 * SC) - 4);
      if (st.patT > .55) {
        var dir = pick([-1, 1]);
        var tx = clamp(st.x + dir * rand(90, 170), 30, T.W - 30);
        if (blocked(tx)) tx = st.x;
        st.patPh = 'down';
        st.air = false;
        st.lookY = 0;
        setJump({ x1: tx, y1: groundY(), h: 0, dur: .48, ez: 'in', plat: 'floor', after: goIdle });
      }
    }
  }

  /* ── grow: the debut — she sprouts out of the section's soil ─── */
  function growTick(dt) {
    var G = st.grow;
    G.t += dt;
    if (G.ph === 'mound') {
      G.k = Math.min(1, G.k + dt * 2.2);
      if (G.t > .05 && !G.d1) {
        G.d1 = 1;
        T.parts.spawn('dust', st.x - 10, groundY() - 2);
        T.parts.spawn('dust', st.x + 10, groundY() - 2);
      }
      if (G.t > .5) { G.ph = 'sprout'; G.t = 0; }
    } else if (G.ph === 'sprout') {
      var k2 = clamp(G.t / .8, 0, 1);
      if (k2 < .55) {
        var e1 = easeOut(k2 / .55);
        st.sy = lerp(.1, 1.16, e1); st.sx = lerp(.8, .94, e1);
        st.tilt = Math.sin(k2 * 14) * .1;
      } else {
        var e2 = easeOut((k2 - .55) / .45);
        st.sy = lerp(1.16, 1, e2); st.sx = lerp(.94, 1, e2);
        st.tilt = lerp(Math.sin(k2 * 14) * .1, 0, e2);
      }
      if (k2 >= 1) { st.sx = 1; st.sy = 1; st.tilt = 0; G.ph = 'bud'; G.t = 0; }
    } else if (G.ph === 'bud') {
      st.tilt = Math.sin(G.t * 5) * .05;
      if (G.t > .45) { st.tilt = 0; G.ph = 'bloom'; G.t = 0; }
    } else if (G.ph === 'bloom') {
      st.bloom = clamp(G.t / .9, 0, 1) * 2;
      if (G.t > .25 && !G.b1) { G.b1 = 1; burst(3); }
      if (G.t > .55 && !G.b2) { G.b2 = 1; burst(4); }
      if (G.t > .85 && !G.b3) { G.b3 = 1; burst(4); }
      if (G.t >= 1) {
        st.bloom = 2;
        st.grow = null;
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'یاس', col: '#f3efff' });
        }
        st.happy = 2.4;
        goIdle();
      }
    }
  }
  function burst(n) {
    for (var i = 0; i < n; i++) T.parts.spawn('spark', st.x + rand(-12, 12), st.y - rand(46, 70), { up: 8 });
    T.parts.spawn('scent', st.x + rand(-10, 10), headY());
  }

  function wakeNow() {
    T.snooze = 0; T.sleeper = false;
    if (T.reduced) { goIdle(); return; }
    setMode('wake');
  }

  /* ── the body ───────────────────────────────────────────────── */
  function render(g) {
    var gy = groundY();
    /* shadow */
    var airH = Math.max(0, gy - st.y);
    var sw = 11 * SC * st.sx * clamp(1 - airH / 130, .5, 1);
    g.globalAlpha = clamp(.17 - airH * .0007, .05, .17);
    g.fillStyle = INK;
    g.fillRect(Math.round(st.x - sw / 2), Math.round(gy - 2), Math.round(sw), 3);
    g.globalAlpha = 1;

    if (st.garden) drawGarden(g);
    if (st.grow) drawGrowSoil(g);
    drawBody(g);
    if (st.can) drawCan(g);
    if (st.pet) drawPetalProp(g);
  }

  function drawBody(g) {
    var legH = st.air ? LH * .6 : LH;
    var bob = (st.mode === 'walk' || st.air) ? Math.abs(Math.sin(st.walkPh)) * SC * .4 : 0;
    var baseY = st.y - legH - bob;

    /* roots — two stubby toes, planted (they never rotate) */
    g.fillStyle = INK;
    var liftA = 0, liftB = 0;
    if (st.air) { liftA = SC * .5; liftB = SC * .5; }
    else if (st.mode === 'walk') {
      liftA = Math.max(0, Math.sin(st.walkPh)) * SC * .7;
      liftB = Math.max(0, -Math.sin(st.walkPh)) * SC * .7;
    }
    var lx1 = Math.round(st.x - 4 * SC), lx2 = Math.round(st.x + 3 * SC);
    var wLeg = Math.max(2, SC);
    g.fillRect(lx1, Math.round(baseY), wLeg, Math.round(st.y - liftA - baseY));
    g.fillRect(lx2, Math.round(baseY), wLeg, Math.round(st.y - liftB - baseY));

    /* the whole plant pivots gently at the soil, like grass in wind */
    g.save();
    g.translate(Math.round(st.x), Math.round(baseY));
    g.rotate(st.tilt + st.sway);
    g.imageSmoothingEnabled = false;
    var bw = stemC.width, bh = stemC.height;
    g.drawImage(stemC, Math.round(-bw / 2 * st.sx), Math.round(-(STEM_H + 2 * SC) * st.sy),
                Math.round(bw * st.sx), Math.round(bh * st.sy));
    var head = st.bloom < .5 ? headBud : (st.bloom < 1.5 ? headHalf : headBloom);
    var hw = head.width, hh = head.height;
    var hcy = -(STEM_H + 2.6 * SC) * st.sy;
    if (st.mode === 'bask') {
      /* the moon does the lighting tonight */
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = .1 + .07 * Math.sin(T.time * 5);
      g.drawImage(head, Math.round(-hw / 2 * st.sx), Math.round(hcy - hh / 2 * st.sy), Math.round(hw * st.sx), Math.round(hh * st.sy));
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    g.drawImage(head, Math.round(-hw / 2 * st.sx), Math.round(hcy - hh / 2 * st.sy), Math.round(hw * st.sx), Math.round(hh * st.sy));
    drawFace(g, hcy);
    g.restore();
  }

  function drawFace(g, hcy) {
    var s = SC, sx = st.sx, sy = st.sy;
    var bud = st.bloom < .5;
    var ex = (bud ? 1.5 : 2.3) * s * sx;
    var ey = hcy - .4 * s * sy;
    var ew = Math.max(2, (bud ? 1.2 : 1.7) * s * sx);
    var ehBase = (bud ? 2.2 : 3.1) * s * (st.wide > 0 ? 1.25 : 1) * (1 - st.blink * .92);
    var eh = Math.max(2, ehBase * sy);
    g.fillStyle = INK;
    g.fillRect(-ex - ew / 2, ey - eh / 2, ew, eh);
    g.fillRect(ex - ew / 2, ey - eh / 2, ew, eh);
    if (!st.blink && st.wide <= 0) {
      g.fillStyle = '#ffffff';
      g.fillRect(-ex - ew * .1, ey - eh * .34, Math.max(1, s * .7), Math.max(1, s * .7));
      g.fillRect(ex - ew * .1, ey - eh * .34, Math.max(1, s * .7), Math.max(1, s * .7));
    }
    /* cheeks — the world's own rose */
    g.globalAlpha = .55;
    g.fillStyle = ROSE;
    var chy = hcy + 1.3 * s * sy;
    g.fillRect(Math.round(-(ex + 2 * s) * sx), Math.round(chy), Math.round(1.6 * s), Math.round(1.1 * s));
    g.fillRect(Math.round((ex + .4 * s) * sx), Math.round(chy), Math.round(1.6 * s), Math.round(1.1 * s));
    g.globalAlpha = 1;
    /* mouth */
    g.fillStyle = INK;
    var my = hcy + 2.1 * s * sy;
    if (st.happy > 0) {
      g.fillRect(Math.round(-1.6 * s * sx), Math.round(my), Math.round(1.1 * s), Math.round(.9 * s));
      g.fillRect(Math.round(-.4 * s * sx), Math.round(my + .7 * s * sy), Math.round(1.1 * s), Math.round(.9 * s));
      g.fillRect(Math.round(.8 * s * sx), Math.round(my), Math.round(1.1 * s), Math.round(.9 * s));
    } else {
      g.fillRect(Math.round(-1 * s * sx), Math.round(my), Math.round(2 * s), Math.round(Math.max(1.5, .7 * s)));
    }
  }

  /* ── garden props: mounds, sprouts, mini blooms ─────────────── */
  function drawGarden(g) {
    var G = st.garden;
    if (G.fade >= 1) return;
    g.globalAlpha = 1 - G.fade;
    for (var i = 0; i < G.xs.length; i++) drawMoundSprout(g, G.xs[i], G.m[i], G.s[i]);
    if (G.seed && G.seed.t < 1) {
      var kt = clamp(G.seed.t, 0, 1);
      var sx2 = lerp(G.seed.x0, G.seed.x1, kt);
      var sy2 = lerp(G.seed.y0, G.seed.y1, kt) - Math.sin(kt * Math.PI) * 14;
      g.fillStyle = INK;
      g.fillRect(Math.round(sx2 - 2), Math.round(sy2 - 1), 4, 3);
      g.fillStyle = GOLD;
      g.fillRect(Math.round(sx2 - 1), Math.round(sy2 - 1), 2, 2);
    }
    g.globalAlpha = 1;
  }
  function drawMoundSprout(g, x, m, s) {
    var u = SC, gy = groundY() - 1;
    if (m > 0) {
      /* a dark mound of the section's own soil */
      var mw = 8 * u * m, rows = [.5, .85, 1], rh = (2.4 * u * m) / rows.length;
      var y0 = gy - rows.length * rh;
      for (var r = 0; r < rows.length; r++) {
        var w = mw * rows[r];
        g.fillStyle = INK;
        g.fillRect(Math.round(x - w / 2 - 1), Math.round(y0 + r * rh - 1), Math.round(w + 2), Math.round(rh + 1));
        g.fillStyle = r === 0 ? SOIL_HI : SOIL;
        g.fillRect(Math.round(x - w / 2), Math.round(y0 + r * rh), Math.round(w), Math.round(rh));
      }
    }
    if (s > 0) {
      var kk = easeOut(clamp(s, 0, 1));
      var sh = 3.2 * u * kk;
      var topY = gy - 2.4 * u * m - sh;
      g.fillStyle = INK;
      g.fillRect(Math.round(x - u), Math.round(topY) - 1, 2 * u + 2, Math.round(sh) + 2);
      g.fillStyle = STEM;
      g.fillRect(Math.round(x - u + 1), Math.round(topY), 2 * u, Math.round(sh));
      g.fillStyle = STEM_HI;
      g.fillRect(Math.round(x - u + 1), Math.round(topY), Math.max(1, u * .8), Math.round(sh));
      if (kk > .55) {
        var kb = clamp((kk - .55) / .45, 0, 1);
        var d2 = miniC.width * (.3 + .7 * easeOut(kb));
        g.drawImage(miniC, Math.round(x - d2 / 2), Math.round(topY - d2 + 2 * u), Math.round(d2), Math.round(d2));
      }
    }
  }

  /* ── the debut's soil mound, settling away as she grows ─────── */
  function drawGrowSoil(g) {
    var G = st.grow;
    if (!G || G.ph === 'bloom') return;
    var u = SC;
    var k = G.ph === 'mound' ? G.k : Math.max(0, .8 - G.t * 1.1);
    if (k <= 0) return;
    var mw = 12 * u * k, rows = [.4, .75, 1], rh = (3 * u * k) / rows.length;
    var gy = groundY() - 1;
    var y0 = gy - rows.length * rh;
    for (var r = 0; r < rows.length; r++) {
      var w = mw * rows[r];
      g.fillStyle = INK;
      g.fillRect(Math.round(st.x - w / 2 - 1), Math.round(y0 + r * rh - 1), Math.round(w + 2), Math.round(rh + 1));
      g.fillStyle = r === 0 ? SOIL_HI : SOIL;
      g.fillRect(Math.round(st.x - w / 2), Math.round(y0 + r * rh), Math.round(w), Math.round(rh));
    }
  }

  /* ── the rose-pink can ──────────────────────────────────────── */
  function drawCan(g) {
    var C = st.can;
    if (!C || C.k <= 0) return;
    var cx = st.x + st.face * 9 * SC;
    var cy = headCY() + 1.5 * SC + (1 - C.k) * 16;
    g.save();
    g.translate(Math.round(cx), Math.round(cy));
    g.rotate(st.face * .5 * C.pour);
    if (st.face < 0) g.scale(-1, 1);      /* spout faces the flower */
    var w = canC.width, h = canC.height;
    g.imageSmoothingEnabled = false;
    g.drawImage(canC, Math.round(-w / 2), Math.round(-h / 2), w, h);
    g.restore();
  }

  /* ── the offered petal, mid-flight — twin lobes and the cleft ── */
  function drawPetalProp(g) {
    var P = st.pet;
    if (!P || P.ph === 'pluck' && P.t < .05) return;
    var x = Math.round(P.x), y = Math.round(P.y);
    g.fillStyle = INK;
    g.fillRect(x - 3, y - 3, 2, 1); g.fillRect(x + 2, y - 3, 2, 1);   /* twin tips */
    g.fillRect(x - 3, y - 2, 7, 4);                                    /* body */
    g.fillRect(x - 1, y + 2, 3, 1);                                    /* rounded base */
    g.fillStyle = PETAL;
    g.fillRect(x - 2, y - 2, 2, 1); g.fillRect(x + 1, y - 2, 2, 1);   /* the cleft shows */
    g.fillRect(x - 2, y - 1, 5, 2);
    g.fillRect(x - 1, y + 1, 3, 1);
    g.fillStyle = PET_HI;
    g.fillRect(x - 2, y - 1, 1, 2);
    g.fillStyle = PET_SH;
    g.fillRect(x + 1, y, 2, 1);
  }

  /* ── brain API ──────────────────────────────────────────────── */
  return {
    tick: tick,
    render: render,
    wake: function () {
      T.dormant = false;
      st.blink = 0; st.blinking = false; st.blinkT = rand(1, 2);
      st.happy = 1.2;                        /* contented to see you */
      if (!st.started) {
        st.started = true;
        st.plat = 'floor';
        var g = T.geo, x0 = null;
        if (g.cart) {
          var c1 = g.cart.cx + g.cart.w / 2 + 56, c2 = g.cart.cx - g.cart.w / 2 - 56;
          if (!blocked(c1) && c1 < T.W - 40) x0 = c1;
          else if (!blocked(c2) && c2 > 40) x0 = c2;
        }
        if (x0 == null) x0 = !blocked(T.W / 2) ? T.W / 2 : (T.W - 60);
        st.x = clamp(x0, 40, T.W - 40);
        st.face = (g.cart && st.x > g.cart.cx) ? -1 : 1;
        st.y = groundY();
        if (!T.reduced) {
          /* the debut: a mound rises, she sprouts out of the soil,
             her bud sways once, and the petals open */
          st.grow = { ph: 'mound', t: 0, k: 0 };
          setMode('grow');
          return;
        }
      } else {
        st.plat = 'floor';
        st.y = groundY();
      }
      if (T.reduced) {
        if (!st.introDone) {
          st.introDone = true;
          T.parts.spawn('hi', st.x, headY() - 12, { txt: 'یاس', col: '#f3efff' });
        }
        st.bloom = 2;
        goIdle();
        return;
      }
      setMode('wake');
    },
    sleep: function () {
      if (st.mode === 'zzz') return;
      st.jump = null; st.air = false;
      teardown(); st.grow = null;
      st.patPh = null;
      st.sx = .94; st.sy = .92; st.blink = 1; st.tilt = 0;
      st.y = groundY();   /* naps happen on the ground, never mid-air */
      setMode('zzz');
      st.zT = 0;
    },
    onResize: function () {
      var ns = T.mobile ? 2 : 3;
      if (ns !== SC) {
        SC = ns;
        buildSprites();
        LH = 2 * SC;
        STEM_H = 12 * SC;
      }
      st.x = clamp(st.x, 30, T.W - 30);
      if (st.mode !== 'zzz' && st.mode !== 'boot') st.y = groundY();
      if (st.mode === 'garden' || st.mode === 'can' || st.mode === 'petal' ||
          st.mode === 'bask' || st.mode === 'grow') {
        teardown();
        st.patPh = null;
        goIdle();
      }
    },
    onMotion: function (red) {
      if (red) {
        st.jump = null; teardown(); st.patPh = null;
        st.tilt = 0; st.sx = 1; st.sy = 1; st.sway = 0;
        goIdle();
      }
    },
    force: function (what) {
      if (what === 'freeze') { T.frozen = true; return; }
      if (what === 'thaw') { T.frozen = false; return; }
      if (what === 'st') return {
        mode: st.mode,
        ph: st.garden ? st.garden.ph : (st.can ? st.can.ph : (st.pet ? st.pet.ph : (st.grow ? st.grow.ph : st.patPh))),
        x: Math.round(st.x), y: Math.round(st.y), plat: st.plat, face: st.face,
        bloom: Math.round(st.bloom)
      };
      if (what === 'garden') goGarden();
      else if (what === 'can') goCan();
      else if (what === 'petal') goPetal();
      else if (what === 'bask') goBask();
      else if (what === 'leap') goLeap();
      else if (what === 'greet') {
        var cta = T.geo.cta;
        if (!cta) return;
        var bx = cta.x > 70 ? cta.x - 30 : cta.x + cta.w + 30;
        goWalk(clamp(bx, 30, T.W - 30), 'greet');
      }
      else if (what === 'sway') goSway();
      else if (what === 'jig') goJig();
      else if (what === 'shiver') goShiver();
      else if (what === 'walk') goWalk(restSpot(st.x));
      else if (what === 'startle') { T.pSeen = true; goStartle(); }
      /* warps — freeze a mid-trick frame for inspection */
      else if (what === 'warp:garden') {
        teardown();
        st.jump = null; st.air = false; st.plat = 'floor';
        st.y = groundY(); st.sx = 1; st.sy = 1; st.bloom = 2;
        var xs = [], i;
        for (i = 0; i < 5; i++) xs.push(clamp(st.x + 60 + (i - 2) * 16, 30, T.W - 30));
        st.garden = { ph: 'grow', t: .8, i: 4, dir: 1, xs: xs,
                      m: [1, 1, 1, 1, 1], s: [.9, .7, .5, .3, .1], pop: [1, 1, 1, 0, 0],
                      seed: null, heart: 0, fade: 0 };
        st.face = 1;
        setMode('garden');
      }
      else if (what === 'warp:petal') {
        teardown();
        st.jump = null; st.plat = 'floor'; st.y = groundY(); st.bloom = 2;
        var slot = T.geo.slot;
        if (!slot) return;
        st.face = slot.cx >= st.x ? 1 : -1;
        st.mode = 'petal';
        st.pet = { ph: 'toss', t: .25, x: 0, y: 0, sx: st.x + st.face * 6, sy: headCY() - 2 * SC };
      }
      else if (what === 'warp:can') {
        teardown();
        st.jump = null; st.plat = 'floor'; st.y = groundY(); st.bloom = 2;
        st.face = blocked(st.x + 60) ? -1 : 1;
        st.mode = 'can';
        st.can = { ph: 'pour', t: .5, k: 1, pour: .6, acc: 0, scT: 0 };
      }
      else if (what === 'warp:hang') {
        teardown();
        st.jump = null; st.plat = 'floor'; st.bloom = 2;
        st.y = hangY(); st.hangY = st.y;
        st.mode = 'leap'; st.patPh = 'hang'; st.patT = .3;
      }
      else if (what === 'warp:bud') {
        teardown();
        st.jump = null; st.air = false; st.plat = 'floor';
        st.y = groundY();
        st.bloom = 0; st.sx = .94; st.sy = .92; st.blink = 1;
        setMode('zzz'); st.zT = 0;
      }
      else if (what === 'warp:bask') {
        teardown();
        st.jump = null; st.plat = 'floor'; st.y = groundY(); st.bloom = 2;
        st.mode = 'bask'; st.bT = 1;
      }
      else if (what === 'warp:grow') {
        teardown();
        st.jump = null; st.air = false; st.plat = 'floor';
        st.y = groundY();
        st.bloom = 0; st.sx = 1; st.sy = 1;
        st.grow = { ph: 'sprout', t: .4 };
        setMode('grow');
      }
    }
  };
}

/* ═════════════════════════════════════════════════════════════
   registry — one resident per world, each in its own response.
   World 01's coin opened the door, World 02's diamond moved in
   second, World 03's blueprint unrolled third, and World 04's
   jasmine blooms last: the garden is complete.
   ═════════════════════════════════════════════════════════════ */
var SPECIES = { '01': makeSekkeh, '02': makeAlmas, '03': makeNaghsh, '04': makeYas };

function init() {
  if (!doc.querySelector('.world')) return;
  TAG18 = makeDigitsSprite(2);
  var tanks = [];
  var worlds = doc.querySelectorAll('.world');
  for (var i = 0; i < worlds.length; i++) {
    var factory = SPECIES[worlds[i].getAttribute('data-world')];
    if (!factory) continue;
    try { tanks.push(new Terrarium(worlds[i], factory)); } catch (e) { /* the home stays habitable */ }
  }
  /* quiet debug hatch — force a trick to watch it happen.
     Ships disabled; add ?terrdebug to the URL to lift the hatch. */
  if (location.search.indexOf('terrdebug') !== -1) {
    window.__terr = {
      tanks: tanks,
      force: function (id, what) {
        for (var i = 0; i < tanks.length; i++)
          if (tanks[i].sec.getAttribute('data-world') === id) return tanks[i].brain.force(what);
      }
    };
  }
}

if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
else init();

})();
