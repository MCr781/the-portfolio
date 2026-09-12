(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  var body = doc.body;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = matchMedia('(pointer: fine)');
  var rsz = null;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function store(key, val) {
    try {
      if (arguments.length === 2) { localStorage.setItem(key, val); return val; }
      return localStorage.getItem(key);
    } catch (e) { return null; }
  }
  function session(key, val) {
    try {
      if (arguments.length === 2) { sessionStorage.setItem(key, val); return val; }
      return sessionStorage.getItem(key);
    } catch (e) { return null; }
  }

  /* ── pointer tracking · single source of truth ──────── */
  /* Browsers only re-run :hover hit-testing on mouse move — never on scroll.
     We therefore track the pointer ourselves and re-resolve the element
     under it on every scroll frame as well. All hover states on this page
     are driven by the .is-hover class this brain toggles. */
  var mx = -9999, my = -9999, pointerSeen = false;
  doc.addEventListener('pointermove', function (e) {
    mx = e.clientX; my = e.clientY; pointerSeen = true;
    queueRefresh();
  }, { passive: true });
  doc.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget && !e.toElement) {
      mx = -9999; my = -9999; pointerSeen = false;
      clearPointerStates();
    }
  });
  window.addEventListener('scroll', queueRefresh, { passive: true });
  window.addEventListener('resize', function () {
    clearTimeout(rsz);
    rsz = setTimeout(function () {
      buildWorld();
      buildControls();
      pxifyAll();
      buildMarquee();
      queueRefresh();
    }, 180);
  }, { passive: true });

  /* ── sound engine (synthesized, opt-in) ─────────────── */
  var soundOn = store('fw-sound') === '1';
  var actx = null;

  function ensureCtx() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    }
    if (actx && actx.state === 'suspended') { actx.resume(); }
  }
  function blip(freq, dur, sweepTo) {
    if (!soundOn || !actx) { return; }
    var t0 = actx.currentTime;
    var osc = actx.createOscillator();
    var gain = actx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (sweepTo) { osc.frequency.linearRampToValueAtTime(sweepTo, t0 + dur / 1000); }
    gain.gain.setValueAtTime(0.06, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur / 1000);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t0);
    osc.stop(t0 + dur / 1000 + 0.02);
  }

  var soundBtn = $('#soundBtn');
  var soundLabel = $('#soundLabel');
  function paintSound() {
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    soundLabel.textContent = soundOn ? 'صدا: روشن' : 'صدا: خاموش';
  }
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    store('fw-sound', soundOn ? '1' : '0');
    if (soundOn) { ensureCtx(); blip(660, 60); }
    paintSound();
  });
  paintSound();

  doc.addEventListener('pointerdown', function () {
    if (soundOn) { ensureCtx(); }
  }, { passive: true });
  doc.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) { blip(880, 90, 440); }
  });

  /* ── THE PIXEL GRID ─────────────────────────────────── */
  /* One art policy for the whole tube. Everything on the loading screen
     and the hero — sky, mountains, ship, Persian headlines, joystick,
     START, JUMP/FIRE, the coin door, the pointer — is drawn at a shared
     internal resolution (game pixels), then scaled up by an integer
     factor with image-rendering: pixelated. Persian display text is
     rendered small on an offscreen canvas and its anti-aliasing is
     quantized to hard steps (full / half / empty), so even the Farsi
     headlines read as hand-placed pixels. No gradients, no blur, no
     rounded domes anywhere: hi-bit pixel art, 2020s standard. */
  var PXG = 4;  /* css px per game pixel (art + display text)      */
  var PXT = 2;  /* css px per text pixel (dense body copy)         */
  function calcGrids() {
    var w = html.clientWidth || 1280;
    var h = html.clientHeight || 800;
    /* Adjust grid multipliers to keep elements readable (min 3 on desktop) */
    var gw = w < 560 ? 2 : (w < 1024 ? 3 : 4);
    /* short tubes step the whole art down a grid instead of letting
       css scale it fractionally (which would break the pixel grid) */
    var gh = h < 860 ? 2 : (h < 960 ? 3 : 4);
    PXG = Math.max(2, Math.min(gw, gh));
    PXT = 2;
  }

  /* deterministic noise — the whole world is a function of position */
  function hash01(n) {
    n = (n << 13) ^ n;
    n = (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff;
    return n / 0x7fffffff;
  }
  function vnoise(x, span) {
    var i = Math.floor(x / span);
    var f = x / span - i;
    var a = hash01(i), b = hash01(i + 1);
    var u = (1 - Math.cos(f * Math.PI)) / 2;
    return a * (1 - u) + b * u;
  }

  /* 4×4 bayer matrix — ordered dithering, the pixel-art way to blend */
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayerAt(x, y) { return BAYER[((y & 3) << 2) + (x & 3)] / 16; }

  /* ── power-on boot · the tube from a cold start ──────── */
  /* The whole loading screen is pixels on #bootfx: power flash, BIOS
     POST, ROM check bar, dithered title card with a spinning coin,
     coin drop, CREDIT 1, PRESS START. The two Persian lines are
     pixel-rendered too (data-px canvases). */
  var bootEl = $('#boot');
  var bootCv = $('#bootfx');
  var bootActive = false;
  function killBoot() {
    if (!bootEl) { return; }
    bootEl.hidden = true;
    bootActive = false;
    html.classList.remove('booting');
    session('fw-booted', '1');
    doc.removeEventListener('keydown', killBoot);
  }
  if (bootEl && !reduced.matches && !session('fw-booted')) {
    html.classList.add('booting');
    bootActive = true;
    requestAnimationFrame(function () { bootEl.classList.add('go'); });
    setTimeout(function () {
      blip(988, 70);
      setTimeout(function () { blip(1319, 110); }, 90);
    }, 1850);
    var lifted = false;
    function liftBoot() {
      if (lifted) { return; }
      lifted = true;
      bootEl.classList.add('lift');
      html.classList.add('awake');
      setTimeout(killBoot, 720);
    }
    setTimeout(liftBoot, 3450);
    bootEl.addEventListener('click', liftBoot);
    doc.addEventListener('keydown', killBoot);
  } else if (bootEl) {
    bootEl.hidden = true;
  }

  /* ── HUD · palette flood · pips · all-clear party ───── */
  var hud = $('.hud');
  var hudIndex = $('.hud-index');
  var hudWorld = $('.hud-world');
  var pips = $$('.pip');
  var visited = {};
  var toast = $('#toast');
  var currentWorld = '';
  var currentName = 'هسته';
  var celebrated = false;

  function nOf(id) { return parseInt(id, 10) - 1; }

  function paintChrome() {
    if (currentWorld === '') {
      hudIndex.textContent = 'CORE 00/04';
    } else {
      hudIndex.textContent = 'WORLD 0' + parseInt(currentWorld, 10) + '/04';
    }
    hudWorld.textContent = currentName;
    pips.forEach(function (p, i) {
      p.classList.toggle('current', currentWorld !== '' && i === nOf(currentWorld));
    });
  }

  function setChrome(worldId, name) {
    currentWorld = worldId;
    if (name) { currentName = name; }
    body.dataset.world = worldId;
    if (!hud.classList.contains('party')) { paintChrome(); }
  }

  function celebrate() {
    if (celebrated) { return; }
    celebrated = true;
    hud.classList.add('party');
    hudIndex.textContent = 'ALL CLEAR';
    hudWorld.textContent = 'هر چهار دنیا فتح شد!';
    pips.forEach(function (p, i) {
      setTimeout(function () { p.classList.add('win'); }, 140 * (i + 1));
    });
    spawnConfetti();
    [523, 659, 784, 1046].forEach(function (f, i) {
      setTimeout(function () { blip(f, 110); }, 130 * i);
    });
    toast.hidden = false;
    toast.classList.add('show');
    setTimeout(function () { toast.hidden = true; toast.classList.remove('show'); }, 4800);
    setTimeout(function () {
      hud.classList.remove('party');
      pips.forEach(function (p) { p.classList.remove('win'); });
      paintChrome();
    }, 3000);
  }

  function spawnConfetti() {
    if (reduced.matches) { return; }
    var colors = ['#d4af37', '#c06ee8', '#2fbda8', '#ed145b', '#f2f2f7'];
    for (var i = 0; i < 26; i++) {
      var bit = doc.createElement('i');
      bit.className = 'confetti-bit';
      bit.setAttribute('aria-hidden', 'true');
      bit.style.background = colors[i % colors.length];
      bit.style.left = 'calc(50% + ' + Math.round(Math.random() * 300 - 150) + 'px)';
      bit.style.setProperty('--cx', Math.round(Math.random() * 240 - 120) + 'px');
      bit.style.setProperty('--cy', '-' + Math.round(30 + Math.random() * 95) + 'px');
      bit.style.animationDelay = Math.round(Math.random() * 280) + 'ms';
      bit.style.animationDuration = Math.round(720 + Math.random() * 480) + 'ms';
      hud.appendChild(bit);
      (function (b) { setTimeout(function () { b.remove(); }, 1700); })(bit);
    }
  }

  var worldSections = $$('.world');
  worldSections.forEach(function (w) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) { return; }
        setChrome(w.dataset.world, w.dataset.name);
        var idx = nOf(w.dataset.world);
        if (!visited[idx]) {
          visited[idx] = true;
          pips[idx].classList.add('visited');
          if (visited[0] && visited[1] && visited[2] && visited[3]) { celebrate(); }
        }
        blip(220, 120);
      });
    }, { threshold: 0.55 });
    io.observe(w);
  });

  $$('.hero, .manifesto, .contact').forEach(function (s) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { setChrome('', 'هسته'); }
      });
    }, { threshold: 0.5 });
    io.observe(s);
  });
  setChrome('', 'هسته');

  /* ── the shared tube ────────────────────────────────── */
  var hero = $('#hero');
  var cv = $('#field');
  var fx = null;
  var bfx = null;
  var world = null;
  var fieldOn = false;
  var heroVisible = true;

  /* night-flight palette — 16-bit arcade sky, neon cyan phosphor, gold matter */
  var PC = {
    bg: '#05050a',
    sky: ['#040410', '#09081e', '#100c30', '#191244', '#241859', '#331f72'],
    star1: '#3f3f63', star2: '#8a8ab4', star3: '#d8d8f2', starG: '#ffd76a', starCyan: '#6ae3ff',
    starRed: '#c8524a',
    /* attract-mode title screen: the peach PRESS START ink of a 1980s
       bezel glass, its hard drop shadow, and the near-black tube back */
    press: '#f09e6c', pressDk: '#4a1d0c', attractBg: '#0b0b0f',
    moon: '#e8e8f8', moonDk: '#9a9ab8', moonRing: 'rgba(216, 216, 242, 0.25)',
    far: '#0d0b1a', mid: '#181230', midEdge: '#2b1f48',
    terr: '#281e44', terrLite: '#3a2e62', terrDim: '#16102b',
    terrHi: '#ffc83b', terrGlint: '#fff9d6',
    ship: '#ffffff', shipSh: '#a4a4b8', cock: '#00f0ff',
    gold: '#ffd76a', goldHi: '#fff4cc', goldLo: '#9e791e', goldDk: '#2b1e0a',
    goldFace: '#ffdf6d', goldDeep: '#ab8420',
    lander: '#42e66c', landerDk: '#1e8538', white: '#ffffff',
    bomb: '#ff3366',
    hum: '#f0f0f8', humSh: '#9292a8',
    bullet: '#00f0ff', bulletGlow: '#0077ff', thr: '#ffc837', thrLo: '#ff6b35',
    boom: ['#ffffff', '#ffe600', '#ff6b35', '#d90429'],
    score: '#ffd76a',
    post: '#a0a0b8', ok: '#50e3c2', coin: '#ffd76a', start: '#ffffff',
    panel: '#0e0c24', panelBd: '#433c63', panelHi: '#564e7a',
    ink: '#03030a', out: '#241c0f',
    shell: '#ffffff', shellDk: '#9292a8', shellOut: '#161622',
    red: '#ff2a6d', redHi: '#ff85a2', redDk: '#990033', redOut: '#380010',
    metal: '#2c2c38', metalHi: '#444456', metalDk: '#161620', metalBd: '#3c3c4c',
    shaft: '#525266', shaftHi: '#787890', shaftDk: '#2e2e3a',
    slate: '#5c5c6b', slateHi: '#9494a8', cueFa: '#9494a8',
    text: '#ffffff', textSub: '#b9b9c6'
  };

  /* 5×7 bitmap font — every latin string on the tube is drawn with it */
  var FONT = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    B: ['11110', '10001', '11110', '10001', '10001', '10001', '11110'],
    C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
    D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
    E: ['11111', '10000', '11110', '10000', '10000', '10000', '11111'],
    F: ['11111', '10000', '11110', '10000', '10000', '10000', '10000'],
    G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
    H: ['10001', '10001', '11111', '10001', '10001', '10001', '10001'],
    I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
    J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
    X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
    '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
    '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
    ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
    '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
    '·': ['00000', '00000', '00100', '00100', '00000', '00000', '00000'],
    '↓': ['00100', '01110', '00100', '00100', '00100', '00100', '00100']
  };

  /* 3×5 micro font — labels that live on small sprites (JUMP, FIRE…) */
  var MFONT = {
    A: ['010', '101', '111', '101', '101'],
    B: ['110', '101', '110', '101', '110'],
    C: ['011', '100', '100', '100', '011'],
    D: ['110', '101', '101', '101', '110'],
    E: ['111', '100', '110', '100', '111'],
    F: ['111', '100', '110', '100', '100'],
    G: ['011', '100', '101', '101', '011'],
    H: ['101', '101', '111', '101', '101'],
    I: ['111', '010', '010', '010', '111'],
    J: ['001', '001', '001', '101', '010'],
    K: ['101', '110', '100', '110', '101'],
    L: ['100', '100', '100', '100', '111'],
    M: ['101', '111', '101', '101', '101'],
    N: ['110', '101', '101', '101', '101'],
    O: ['010', '101', '101', '101', '010'],
    P: ['110', '101', '110', '100', '100'],
    Q: ['010', '101', '101', '110', '011'],
    R: ['110', '101', '110', '110', '101'],
    S: ['011', '100', '010', '001', '110'],
    T: ['111', '010', '010', '010', '010'],
    U: ['101', '101', '101', '101', '111'],
    V: ['101', '101', '101', '101', '010'],
    W: ['101', '101', '101', '111', '101'],
    X: ['101', '101', '010', '101', '101'],
    Y: ['101', '101', '010', '010', '010'],
    Z: ['111', '001', '010', '100', '111'],
    '0': ['010', '101', '101', '101', '010'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['110', '001', '010', '100', '111'],
    '3': ['110', '001', '010', '001', '110'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '110', '001', '110'],
    '6': ['011', '100', '111', '101', '111'],
    '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'],
    '9': ['111', '101', '111', '001', '110']
  };

  function drawText(g, str, x, y, color, scale) {
    scale = scale || 1;
    g.fillStyle = color;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      var rows = FONT[ch];
      if (!rows) { x += 6 * scale; continue; }
      for (var r = 0; r < 7; r++) {
        var line = rows[r];
        for (var c = 0; c < 5; c++) {
          if (line.charAt(c) === '1') {
            g.fillRect(x + c * scale, y + r * scale, scale, scale);
          }
        }
      }
      x += 6 * scale;
    }
  }
  function textW(str, scale) { return str.length * 6 * (scale || 1); }

  function drawMText(g, str, x, y, color) {
    g.fillStyle = color;
    for (var i = 0; i < str.length; i++) {
      var rows = MFONT[str.charAt(i)];
      if (!rows) { x += 4; continue; }
      for (var r = 0; r < 5; r++) {
        var line = rows[r];
        for (var c = 0; c < 3; c++) {
          if (line.charAt(c) === '1') { g.fillRect(x + c, y + r, 1, 1); }
        }
      }
      x += 4;
    }
  }
  function mTextW(str) { return str.length * 4 - 1; }

  /* multi-tone sprites — each char maps to a palette color via legend */
  function drawSpr(g, spr, x, y, legend, flip) {
    var r, c, ch;
    for (r = 0; r < spr.length; r++) {
      var line = spr[r];
      var w = line.length;
      for (c = 0; c < w; c++) {
        ch = line.charAt(c);
        if (ch === '.') { continue; }
        var col = legend[ch];
        if (!col) { continue; }
        g.fillStyle = col;
        g.fillRect(x + (flip ? w - 1 - c : c), y + r, 1, 1);
      }
    }
  }
  function sprW(spr) { return spr[0].length; }

  /* pixel ball — a shaded circle, the pixel-art way to draw domes */
  function pxBall(g, cx, cy, r, tones, squishX) {
    /* tones: {out, hi, base, dk} — hi on the upper-left, dk lower-right */
    var i, dx, dy;
    var rx = squishX || r;
    for (dy = -r; dy <= r; dy++) {
      for (dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        var ex = dx / rx;
        var d = Math.sqrt(ex * ex + (dy / r) * (dy / r));
        if (d > 1.02) { continue; }
        var x = cx + dx, y = cy + dy;
        var col;
        if (d > 0.86) { col = tones.out; }
        else {
          var s = (dx + dy) / (r * 1.35);
          if (s < -0.34) { col = tones.hi; }
          else if (s > 0.30) { col = tones.dk; }
          else { col = tones.base; }
        }
        if (bayerAt(x & 63, y & 63) < 0.22 && d > 0.86) { continue; }
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
  }

  /* pixel oval plate (for shadows and the joystick dust cover) */
  function pxOval(g, cx, cy, rx, ry, color) {
    var dy, hw;
    for (dy = -ry; dy <= ry; dy++) {
      var t = dy / ry;
      hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      if (hw < 0) { hw = 0; }
      g.fillStyle = color;
      g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  }

  /* ── Persian pixel text ─────────────────────────────── */
  /* Farsi has no bitmap font — so display text is rendered small on an
     offscreen canvas and its alpha is quantized to three hard steps
     (full ink / one hand-placed half-tone edge pixel / empty). Scaled up
     on the game grid, headlines read as genuinely pixel-set type: chunky,
     hard-edged, with a single anti-alias tone exactly where a pixel
     artist would put one. The live DOM text folds away for screen
     readers once the pixel twin is mounted. */
  var faScratch = doc.createElement('canvas');
  var faSctx = faScratch.getContext('2d', { willReadFrequently: true });

  function faFontStr(src, weight) {
    return (weight || 700) + ' ' + src + 'px Estedad, Vazirmatn, Tahoma, sans-serif';
  }

  function faWrap(text, src, weight, maxW) {
    faSctx.font = faFontStr(src, weight);
    var lines = [];
    /* a hard break in the source is a hard break on the tube */
    var paras = text.split('\n');
    for (var p = 0; p < paras.length; p++) {
      var words = paras[p].split(' ');
      var cur = '';
      for (var i = 0; i < words.length; i++) {
        var test = cur ? cur + ' ' + words[i] : words[i];
        if (faSctx.measureText(test).width <= maxW || !cur) {
          cur = test;
        } else {
          lines.push(cur);
          cur = words[i];
        }
      }
      if (cur) { lines.push(cur); }
    }
    return lines;
  }

  function quantizeAlpha(img) {
    /* 16-bit hi-clarity alpha quantization: preserves subpixel curves,
       dots, and ligatures while giving edges a crisp 16-bit arcade tone */
    var d = img.data;
    var i, a;
    for (i = 0; i < d.length; i += 4) {
      a = d[i + 3];
      if (a < 32) {
        d[i + 3] = 0;
      } else if (a < 110) {
        d[i + 3] = 110;
      } else if (a < 190) {
        d[i + 3] = 190;
      } else {
        d[i + 3] = 255;
      }
    }
  }

  /* renders text → returns a game-res canvas (transparent, quantized) */
  function pxTextCanvas(text, opts) {
    var src = opts.src || 10;
    var weight = opts.weight || 700;
    var grid = opts.grid || PXG;
    var maxW = opts.maxW || 120;
    var lineH = Math.round(src * 1.5);
    var lines = faWrap(text, src, weight, maxW - 2);
    var w = Math.max(4, Math.min(maxW, Math.ceil(Math.max.apply(null, lines.map(function (l) {
      return faSctx.measureText(l).width;
    })) + 2)));
    /* optional hard drop shadow: one game pixel down-right, drawn
       first so the quantizer crisps both inks together */
    var sh = opts.shadow ? 1 : 0;
    var sw = w + sh;
    var h = lines.length * lineH + 2 + sh;
    faScratch.width = sw;
    faScratch.height = h;
    faSctx.font = faFontStr(src, weight);
    faSctx.direction = 'rtl';
    faSctx.textAlign = 'right';
    faSctx.textBaseline = 'top';
    var i, lx;
    /* marquee lines center one by one: RTL fillText right-aligns inside
       the block, which leaves short lines hanging to the right edge */
    function lineX(line, extra) {
      if (!opts.centerLines) { return w - 1 + extra; }
      var m = faSctx.measureText(line).width;
      return Math.round((w - m) / 2) + m - 1 + extra;
    }
    if (sh) {
      faSctx.fillStyle = opts.shadow;
      for (i = 0; i < lines.length; i++) {
        faSctx.fillText(lines[i], lineX(lines[i], 1), i * lineH + 2);
      }
    }
    faSctx.fillStyle = opts.color || PC.text;
    for (i = 0; i < lines.length; i++) {
      faSctx.fillText(lines[i], lineX(lines[i], 0), i * lineH + 1);
    }
    var img = faSctx.getImageData(0, 0, sw, h);
    quantizeAlpha(img);
    faSctx.putImageData(img, 0, 0);
    /* trim empty top/bottom rows so layouts stay tight */
    var y0 = 0, y1 = h - 1, row, x, has;
    for (row = 0; row < h; row++) {
      has = false;
      for (x = 0; x < sw; x += 1) {
        if (img.data[(row * sw + x) * 4 + 3]) { has = true; break; }
      }
      if (has) { y0 = row; break; }
    }
    for (row = h - 1; row >= 0; row--) {
      has = false;
      for (x = 0; x < sw; x += 1) {
        if (img.data[(row * sw + x) * 4 + 3]) { has = true; break; }
      }
      if (has) { y1 = row; break; }
    }
    var th = Math.max(1, y1 - y0 + 1);
    var out = doc.createElement('canvas');
    out.width = sw;
    out.height = th;
    var og = out.getContext('2d');
    og.imageSmoothingEnabled = false;
    og.drawImage(faScratch, 0, y0, sw, th, 0, 0, sw, th);
    return out;
  }

  /* mounts the pixel twin of a [data-px] element's text */
  var PX_CONF = {
    /* attract-screen marquee: every title line centers on the tube */
    chip:      { src: 7,  weight: 800, color: null, grid: null, chip: true, align: 'center', centerLines: true },
    name:      { src: 16, weight: 900, color: PC.press, shadow: PC.pressDk, align: 'center', centerLines: true },
    statement: { src: 11, weight: 900, color: '#e9e9f2', grid: 'half', align: 'center', centerLines: true },
    para:      { src: 8,  weight: 700, color: PC.textSub, grid: 'half', align: 'center', centerLines: true },
    cuefa:     { src: 9,  weight: 700, color: PC.cueFa, grid: 'half', align: 'center' },
    pstartfa:  { src: 9,  weight: 800, color: PC.gold, grid: 'half', align: 'center', nowrap: true },
    joyfa:     { src: 9,  weight: 800, color: PC.gold, grid: 'half', align: 'center', nowrap: true },
    coinfa:    { src: 9,  weight: 700, color: PC.slateHi, grid: 'half', align: 'start' },
    bootfa:    { src: 8,  weight: 800, color: PC.slateHi, align: 'center' },
    bootskip:  { src: 10, weight: 700, color: PC.slate,   grid: 'half', align: 'center' }
  };

  /* narrow screens: the same pixel twin, set a touch smaller so the
     title screen keeps its rhythm on a phone tube */
  var PX_MOBILE = { chip: 6, name: 12, statement: 9, para: 8, cuefa: 8, coinfa: 8, pstartfa: 8, joyfa: 8, bootfa: 7, bootskip: 9 };

  function accentOf(el) {
    var w = el.closest('[data-world]');
    var acc = getComputedStyle(doc.body).getPropertyValue('--c-accent') || '#d4af37';
    return acc.trim() || '#d4af37';
  }

  function pxifyEl(span) {
    var kind = span.getAttribute('data-px');
    var conf = PX_CONF[kind];
    if (!conf) { return; }
    var host = span.parentElement;
    if (!host) { return; }
    var raw = span.innerHTML != null ? span.innerHTML : (span.textContent || '');
    var text = raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t\r]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim();
    if (!text) { return; }
    var narrow = html.clientWidth < 560;
    if (narrow && PX_MOBILE[kind]) {
      conf = { src: PX_MOBILE[kind], weight: conf.weight, color: conf.color, grid: conf.grid, chip: conf.chip, align: conf.align, centerLines: conf.centerLines };
    }
    var hostW = Math.floor(host.getBoundingClientRect().width);
    if (hostW < 24) { hostW = Math.floor(Math.min(html.clientWidth - 24, 46 * 16)); }
    var grid = conf.grid === 'half' ? PXT : (conf.grid || PXG);
    var maxW = Math.max(16, Math.floor(hostW / grid));
    var opts = {
      src: conf.src,
      weight: conf.weight,
      color: conf.color === null ? accentOf(span) : (conf.color || PC.text),
      maxW: conf.nowrap ? 400 : (conf.chip ? maxW - 4 : maxW),
      centerLines: conf.centerLines
    };
    var out = pxTextCanvas(text, opts);
    var mount = doc.createElement('canvas');
    var mw, mh;
    if (conf.chip) {
      /* the role chip: a notched gold-bordered plate around the text */
      var pad = 3;
      mw = out.width + pad * 2 + 2;
      mh = out.height + pad * 2 + 2;
      mount.width = mw;
      mount.height = mh;
      var mg = mount.getContext('2d');
      mg.fillStyle = conf.color === null ? accentOf(span) : PC.gold;
      /* border plate (notched 2px corners — the site's cut language) */
      mg.fillRect(1, 0, mw - 2, mh);
      mg.fillRect(0, 1, mw, mh - 2);
      mg.fillRect(2, 2, 1, 1); mg.fillRect(mw - 3, 2, 1, 1);
      mg.fillRect(2, mh - 3, 1, 1); mg.fillRect(mw - 3, mh - 3, 1, 1);
      mg.fillStyle = PC.panel;
      mg.fillRect(2, 2, mw - 4, mh - 4);
      mg.fillRect(1, 1, mw - 2, 1);
      mg.fillRect(1, 1, 1, mh - 2);
      mg.imageSmoothingEnabled = false;
      mg.drawImage(out, pad, pad);
    } else {
      /* canvas spans the host; text aligns to the start edge (RTL right)
         or centers — the canvas itself never breaks the column rhythm.
         nowrap captions (key legends) size to their text instead, so a
         two-word label never stacks into two lines */
      var cw = conf.nowrap ? out.width : maxW;
      mount.width = cw;
      mount.height = out.height;
      var g2 = mount.getContext('2d');
      g2.imageSmoothingEnabled = false;
      var dx = conf.nowrap ? 0
        : (conf.align === 'center'
          ? Math.round((maxW - out.width) / 2)
          : Math.max(0, maxW - out.width));
      g2.drawImage(out, dx, 0);
    }
    mount.className = 'pxcv px-mounted';
    if (conf.align === 'center') { mount.style.marginInline = 'auto'; }
    if (conf.nowrap) {
      /* wider than its host? hang out both sides, still centered */
      var cssW = mount.width * (conf.grid === 'half' ? PXT : (conf.grid || PXG));
      if (cssW > hostW) {
        mount.style.marginInline = '0';
        mount.style.marginLeft = Math.round((hostW - cssW) / 2) + 'px';
      }
    }
    mount.style.width = (mount.width * grid) + 'px';
    mount.style.height = (mount.height * grid) + 'px';
    var old = host.querySelector('.px-mounted');
    if (old) { old.remove(); }
    span.classList.add('px-on');
    host.appendChild(mount);
  }

  function pxifyAll() {
    calcGrids();
    $$('[data-px]').forEach(pxifyEl);
    paintCue();
    paintDecal();
    paintCoinLabel();
    paintCredit();
  }

  /* ── the pixel world · a night-flight attract game ──── */
  /* Everything renders at game-pixel resolution onto tiny canvases the
     browser scales with hard edges. The art: a dithered dusk sky in five
     ink bands, a crescent moon, drifting dithered clouds, three parallax
     mountain ridges, a 3-tone gold terrain, chunky multi-tone sprites,
     starburst explosions — one shared world state feeding BOTH screens
     (boot canvas dimmed under the title card, hero canvas with the full
     HUD), so the channel flip hands over a game already in motion. */

  var skyCv = null, vigCv = null, dimCv = null, attractCv = null, flashCvs = [];
  var cloudSprs = [];

  function terrRow(wx, rows) {
    var h = 0.735 + vnoise(wx, 9) * 0.15 + vnoise(wx, 23) * 0.1;
    if (hash01(Math.floor(wx / 61)) > 0.8) { h += vnoise(wx, 5) * 0.13; }
    return Math.round(h * rows);
  }
  function farRow(wx, rows) {
    return Math.round((0.585 + vnoise(wx, 47) * 0.11) * rows);
  }
  function midRow(wx, rows) {
    return Math.round((0.665 + vnoise(wx, 23) * 0.10) * rows);
  }

  /* sprites — 16-bit arcade pixel art maps, chars legend-keyed */
  var SPR_SHIP = [
    '........GGGG........',
    '......GGWWWWGG......',
    '.....GGWWCCCCGG.....',
    '....SGGWWCCCCWWGG...',
    '.SSSSGGWWWWWWWWGGGG.',
    'SSSSSSGGGGGGGGGGGGGG',
    '.SSSSGGWWWWWWWWGGGG.',
    '....SGGWWCCCCWWGG...',
    '.....GGWWCCCCGG.....',
    '......GGWWWWGG......',
    '........GGGG........'
  ];
  var SHIP_LEG = { W: PC.ship, S: PC.shipSh, C: PC.cock, G: PC.gold };
  var SPR_LANDER = [
    '....EEEE....',
    '..EEEEEEEE..',
    '.EECCCCEEEE.',
    'GGGGGGGGGGGG',
    'GGRGGGGGRGGG',
    '.GDDDDDDDDG.',
    '.D.D....D.D.'
  ];
  var SPR_LANDER2 = [
    '....EEEE....',
    '..EEEEEEEE..',
    '.EECCCCEEEE.',
    'GGGGGGGGGGGG',
    'GGRGGGGGRGGG',
    '.GDDDDDDDDG.',
    '..D.D..D.D..'
  ];
  var LANDER_LEG = { E: PC.lander, C: PC.white, G: PC.landerDk, R: PC.red, D: PC.landerDk };
  /* little people, not blobs: skin head, shirt, arms, pants legs —
     stand / mid-stride / arms-up (carried, falling, or cheering) */
  var SPR_HUM = [
    '..SS..',
    '..SS..',
    '.BBBB.',
    'B.BB.B',
    '.BBBB.',
    '..PP..',
    '..P.P.',
    '..W.W.'
  ];
  var SPR_HUM2 = [
    '..SS..',
    '..SS..',
    '.BBBB.',
    'B.BB.B',
    '.BBBB.',
    '..PP..',
    '.P..P.',
    'W....W'
  ];
  var HUM_LEG = { S: PC.press, B: PC.hum, P: PC.slateHi, W: PC.hum };
  var SPR_HUMF = [
    'B.SS.B',
    'B.SS.B',
    '.BBBB.',
    '..BB..',
    '..BB..',
    '..PP..',
    '..P.P.',
    '..W.W.'
  ];

  var POST = [
    ['MMR-84 BIOS 4.0', ''],
    ['CPU 6809 ......... ', 'OK'],
    ['RAM 64K .......... ', 'OK'],
    ['SOUND SN-76489 ... ', 'OK'],
    ['WORLDS 01-04 ..... ', 'OK'],
    ['PLAYER M.M.REZAEE', '']
  ];

  function makeStars(cols, rows) {
    var out = [];
    var n = Math.round(cols * rows / 48);
    for (var i = 0; i < n; i++) {
      out.push({
        x: Math.random() * cols,
        y: Math.floor(Math.random() * Math.max(8, Math.round(rows * 0.68))),
        l: 1 + Math.floor(Math.random() * 3),
        tw: Math.random() * 6.28,
        gold: Math.random() < 0.1,
        red: Math.random() < 0.12
      });
    }
    return out;
  }

  /* pre-rendered sky: five ink bands blended with bayer dithering, a
     crescent moon with craters, and a few glint pixels around it */
  function buildSky(cols, rows) {
    var c = doc.createElement('canvas');
    c.width = cols; c.height = rows;
    var g = c.getContext('2d');
    var fr = [0.26, 0.20, 0.18, 0.18, 0.18];
    var y = 0, bounds = [], i, x, yy;
    for (i = 0; i < fr.length; i++) {
      bounds.push(Math.round((y + fr[i]) * rows));
      y += fr[i];
    }
    for (i = 0; i < PC.sky.length; i++) {
      var y0 = i === 0 ? 0 : bounds[i - 1];
      var y1 = bounds[i];
      g.fillStyle = PC.sky[i];
      g.fillRect(0, y0, cols, y1 - y0);
    }
    /* dithered seams between bands — 3 rows of ordered blending */
    for (i = 0; i < PC.sky.length - 1; i++) {
      var seam = bounds[i];
      for (yy = seam - 2; yy < seam + 2; yy++) {
        if (yy < 0 || yy >= rows) { continue; }
        for (x = 0; x < cols; x++) {
          var t = (yy - (seam - 2)) / 4;
          if (bayerAt(x, yy) < t) {
            g.fillStyle = PC.sky[i + 1];
            g.fillRect(x, yy, 1, 1);
          }
        }
      }
    }
    /* the moon — a crescent with two craters and sparse glints */
    var mcx = Math.round(cols * 0.80), mcy = Math.round(rows * 0.13), mr = Math.max(4, Math.round(rows * 0.035));
    for (var dy = -mr; dy <= mr; dy++) {
      for (var dx = -mr; dx <= mr; dx++) {
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > mr) { continue; }
        var cut = Math.sqrt((dx - mr * 0.45) * (dx - mr * 0.45) + (dy + mr * 0.18) * (dy + mr * 0.18));
        if (cut < mr * 0.86) {
          if (d > mr - 1.4) { g.fillStyle = PC.sky[1]; g.fillRect(mcx + dx, mcy + dy, 1, 1); }
          continue;
        }
        g.fillStyle = d > mr - 1 ? PC.moonDk : PC.moon;
        g.fillRect(mcx + dx, mcy + dy, 1, 1);
      }
    }
    g.fillStyle = PC.moonDk;
    g.fillRect(mcx - 1, mcy - 2, 2, 1);
    g.fillRect(mcx + 1, mcy + 1, 1, 1);
    g.fillStyle = PC.star3;
    g.fillRect(mcx - mr - 3, mcy - mr, 1, 1);
    g.fillRect(mcx + mr + 3, mcy - 2, 1, 1);
    g.fillRect(mcx - mr - 1, mcy + mr + 2, 1, 1);
    return c;
  }

  /* pre-rendered attract sky: one flat near-black tube. The title
     screen wants clean glass — all of its depth comes from stars. */
  function buildAttractSky(cols, rows) {
    var c = doc.createElement('canvas');
    c.width = cols; c.height = rows;
    var g = c.getContext('2d');
    g.fillStyle = PC.attractBg;
    g.fillRect(0, 0, cols, rows);
    return c;
  }

  /* pre-rendered CRT vignette: dithered corner darkening, in-canvas */
  function buildVig(cols, rows) {
    var c = doc.createElement('canvas');
    c.width = cols; c.height = rows;
    var g = c.getContext('2d');
    g.fillStyle = '#040409';
    for (var y = 0; y < rows; y++) {
      var ny = (y / rows) * 2 - 1;
      for (var x = 0; x < cols; x++) {
        var nx = (x / cols) * 2 - 1;
        var d = Math.sqrt(nx * nx * 1.1 + ny * ny * 1.25);
        if (d < 1.16) { continue; }
        var k = (d - 1.16) / 0.55;
        if (k > 1) { k = 1; }
        if (bayerAt(x, y) < k * 0.7) { g.fillRect(x, y, 1, 1); }
      }
    }
    return c;
  }

  /* the boot dim: a 50% dark checker — the classic CRT dim, no alpha */
  function buildDim(cols, rows) {
    var c = doc.createElement('canvas');
    c.width = cols; c.height = rows;
    var g = c.getContext('2d');
    g.fillStyle = '#050510';
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        if (((x + y) & 1) === 0) { g.fillRect(x, y, 1, 1); }
      }
    }
    return c;
  }

  /* gold surge for the coin flash — three dither densities */
  function buildFlash(cols, rows, density) {
    var c = doc.createElement('canvas');
    c.width = cols; c.height = rows;
    var g = c.getContext('2d');
    g.fillStyle = PC.gold;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        if (bayerAt(x, y) < density) { g.fillRect(x, y, 1, 1); }
      }
    }
    return c;
  }

  /* drifting dithered clouds — pre-rendered sprites */
  function buildCloud(w, h, seed) {
    var c = doc.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    for (var y = 0; y < h; y++) {
      var ny = (y - h * 0.42) / (h * 0.42);
      if (y > h * 0.72) { ny = 9; }
      for (var x = 0; x < w; x++) {
        var nx = (x - w / 2) / (w / 2);
        var v = nx * nx * 1.15 + ny * ny * 2.6 + hash01(seed + x * 7 + y * 131) * 0.35;
        if (v < 1) {
          if (v > 0.62 && bayerAt(x, y) > 0.5) { continue; }
          g.fillStyle = '#20203e';
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    return c;
  }

  function buildWorld() {
    if (!cv || !hero) { return; }
    calcGrids();
    var rect = hero.getBoundingClientRect();
    var w = Math.max(160, rect.width);
    var h = Math.max(160, rect.height);
    var cols = Math.ceil(w / PXG);
    var rows = Math.ceil(h / PXG);
    cv.width = cols;
    cv.height = rows;
    fx = cv.getContext('2d');
    if (bootCv && (bootActive || !bootEl.hidden)) {
      bootCv.width = cols;
      bootCv.height = rows;
      bfx = bootCv.getContext('2d');
    }
    skyCv = buildSky(cols, rows);
    attractCv = buildAttractSky(cols, rows);
    vigCv = buildVig(cols, rows);
    dimCv = buildDim(cols, rows);
    flashCvs = [
      buildFlash(cols, rows, 0.22),
      buildFlash(cols, rows, 0.45),
      buildFlash(cols, rows, 0.72)
    ];
    var cw = Math.max(18, Math.round(cols * 0.09));
    cloudSprs = [
      { cv: buildCloud(cw, Math.max(5, Math.round(cw * 0.30)), 11), x: Math.random() * cols, y: Math.round(rows * 0.14), v: 2.2 },
      { cv: buildCloud(Math.round(cw * 1.5), Math.max(6, Math.round(cw * 0.36)), 47), x: Math.random() * cols, y: Math.round(rows * 0.26), v: 4.6 },
      { cv: buildCloud(Math.round(cw * 0.8), Math.max(4, Math.round(cw * 0.26)), 83), x: Math.random() * cols, y: Math.round(rows * 0.38), v: 8.2 }
    ];
    var old = world;
    world = {
      cols: cols, rows: rows, px: PXG,
      worldX: old ? old.worldX : Math.random() * 4096,
      t: old ? old.t : 0,
      bootT0: old ? old.bootT0 : performance.now(),
      stars: makeStars(cols, rows),
      landers: [], bullets: [], bombs: [], booms: [], hums: [],
      ship: {
        /* the demo lane patrols the horizon ridge, well below the
           title block — the ship must never fly through the marquee */
        x: Math.round(cols * 0.3), y: Math.round(rows * 0.60),
        ty: Math.round(rows * 0.60), tyCd: 0,
        hopY: 0, hopV: 0, flipUntil: 0, fireCd: 900
      },
      score: old ? old.score : 0,
      flash: old ? old.flash : 0,
      banner: old ? old.banner : null,
      bombCd: 2600, humCd: 4000
    };
    for (var i = 0; i < 5; i++) {
      world.hums.push({
        wx: world.worldX + 24 + Math.random() * cols * 2.4,
        y: 0, state: 'ground', vy: 0, held: null, ph: Math.random() * 6.28
      });
    }
    faCache = {};
    if (reduced.matches && fx) { renderWorld(fx, 'hero', performance.now()); }
  }

  function spawnLander() {
    var w = world;
    w.landers.push({
      wx: w.worldX + w.cols + 3 + Math.random() * 16,
      /* cruise the gun lane: high enough to be shot, low enough
         to menace the people on the deck */
      base: w.rows * (0.52 + Math.random() * 0.18),
      ph: Math.random() * 6.28,
      drift: -3 - Math.random() * 3,
      state: 'drift', y: 0, gone: false,
      grabCd: 2200 + Math.random() * 6000,
      target: null
    });
    var l = w.landers[w.landers.length - 1];
    l.y = Math.round(l.base);
  }

  function boomAt(sx, sy, n) {
    var w = world;
    w.booms.push({ flash: true, x: sx, y: sy, life: 110, max: 110, vx: 0, vy: 0 });
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28;
      var sp = 7 + Math.random() * 26;
      var life = 340 + Math.random() * 420;
      w.booms.push({
        x: sx, y: sy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5,
        life: life, max: life
      });
    }
  }

  /* the three player verbs — wired to FIRE / JUMP / the joystick */
  function fireShip(user) {
    var w = world;
    if (!w) { return; }
    var S = w.ship;
    /* the bolt leaves the pointy head — whichever way she's facing */
    var dir = S.face || 1;
    var flip = dir < 0;
    var sy = Math.round(S.y + S.hopY) + 5;
    var noseX = flip ? S.x - 2 : S.x + sprW(SPR_SHIP) + 1;
    var best = null, bestD = 1e9;
    for (var k = 0; k < w.landers.length; k++) {
      var L = w.landers[k];
      var lsx = L.wx - w.worldX;
      var ahead = flip ? (lsx < S.x - 6) : (lsx > S.x + 6);
      if (ahead && lsx > -2 && lsx < w.cols + 2 && Math.abs(L.y + 3 - sy) < 15) {
        var d = Math.abs(lsx - S.x);
        if (d < bestD) { bestD = d; best = L; }
      }
    }
    if (best || user) {
      var vx = 92 * dir, vy = 0;
      if (best) {
        var tt = Math.max(0.12, Math.abs(best.wx - w.worldX - S.x) / 92);
        vy = Math.max(-14, Math.min(14, (best.y + 3 - sy) / tt));
      }
      w.bullets.push({ x: noseX, y: sy, vx: vx, vy: vy, dir: dir, gone: false });
      if (user) { blip(1244, 60, 622); }
    }
  }
  function hopShip() {
    if (!world) { return; }
    world.ship.hopV = -36;
  }
  function bankShip(right) {
    var w = world;
    if (!w) { return; }
    w.ship.x = Math.max(6, Math.min(w.cols * 0.62, w.ship.x + (right ? 9 : -9)));
    if (!right) { w.ship.flipUntil = w.t + 650; }
  }

  function stepWorld(dt) {
    var w = world;
    if (!w) { return; }
    var ds = dt / 1000;
    w.t += dt;
    w.worldX += 22 * ds;
    if (w.flash > 0) { w.flash = Math.max(0, w.flash - dt); }
    var i, j;

    /* stars drift left at their layer speed and wrap around */
    for (i = 0; i < w.stars.length; i++) {
      var st = w.stars[i];
      st.x -= (2.2 + st.l * 4.5) * ds;
      if (st.x < -1) {
        st.x += w.cols + 2;
        st.y = Math.floor(Math.random() * Math.max(8, Math.round(w.rows * 0.68)));
      }
    }

    /* clouds drift on their parallax bands */
    for (i = 0; i < cloudSprs.length; i++) {
      var cl = cloudSprs[i];
      cl.x -= cl.v * ds;
      if (cl.x < -cl.cv.width - 2) { cl.x = w.cols + 2; }
    }

    /* landers — spawn, drift, pick up humanoids, lift them away */
    if (w.landers.length < 7 && Math.random() < ds * 1.1) { spawnLander(); }
    for (i = 0; i < w.landers.length; i++) {
      var L = w.landers[i];
      L.wx += L.drift * ds;
      if (L.wx - w.worldX < -8) { L.gone = true; continue; }
      if (L.state === 'drift') {
        L.y = L.base + Math.sin(w.t * 0.0021 + L.ph) * 4;
        L.grabCd -= dt;
        if (L.grabCd <= 0) {
          for (j = 0; j < w.hums.length; j++) {
            var cand = w.hums[j];
            if (cand.state === 'ground' && Math.abs(cand.wx - L.wx) < 26) {
              L.state = 'descend';
              L.target = cand;
              break;
            }
          }
          if (L.state !== 'descend') { L.grabCd = 4000 + Math.random() * 8000; }
        }
      } else if (L.state === 'descend') {
        var tgt = L.target;
        if (!tgt || tgt.state !== 'ground') { L.state = 'drift'; L.grabCd = 6000; }
        else {
          L.wx += (tgt.wx > L.wx ? 1 : -1) * Math.min(Math.abs(tgt.wx - L.wx), 7 * ds);
          var gY = terrRow(Math.round(L.wx), w.rows) - 10;
          L.y += (gY > L.y ? 1 : -1) * Math.min(Math.abs(gY - L.y), 9 * ds);
          if (Math.abs(gY - L.y) < 1.4 && Math.abs(tgt.wx - L.wx) < 1.4) {
            L.state = 'lift';
            tgt.state = 'held';
            tgt.held = L;
          }
        }
      } else if (L.state === 'lift') {
        L.y -= 2.6 * ds;
        if (L.y < w.rows * 0.22) {
          if (L.target) { L.target.gone = true; }
          L.gone = true;
          w.hums.push({
            wx: w.worldX + w.cols * 2 + Math.random() * w.cols,
            y: 0, state: 'ground', vy: 0, held: null, ph: Math.random() * 6.28
          });
        }
      }
    }

    /* bombs fall from landers, home gently, burst on the terrain */
    w.bombCd -= dt;
    if (w.bombCd <= 0 && w.landers.length) {
      w.bombCd = 2400 + Math.random() * 3200;
      var thrower = w.landers[Math.floor(Math.random() * w.landers.length)];
      if (thrower) {
        /* pick the nearest person — bombs are aimed at the people */
        var tgtH = null, td = 1e9;
        for (j = 0; j < w.hums.length; j++) {
          if (w.hums[j].state !== 'ground') { continue; }
          var dd = Math.abs(w.hums[j].wx - thrower.wx);
          if (dd < td) { td = dd; tgtH = w.hums[j]; }
        }
        w.bombs.push({
          x: thrower.wx - w.worldX, y: thrower.y + 7,
          vx: 0, vy: 7, txw: tgtH ? tgtH.wx : null, gone: false
        });
      }
    }
    for (i = 0; i < w.bombs.length; i++) {
      var bo = w.bombs[i];
      bo.vy += 7 * ds;
      if (bo.txw != null) {
        var txs = bo.txw - w.worldX;
        bo.vx += Math.max(-6, Math.min(6, (txs - bo.x) * 0.55)) * ds * 3;
      }
      bo.x += bo.vx * ds;
      bo.y += bo.vy * ds;
      /* a bomb that reaches a person kills them — the old grief */
      for (j = 0; j < w.hums.length; j++) {
        var Hb = w.hums[j];
        if (Hb.gone || Hb.state !== 'ground') { continue; }
        var hxs = Hb.wx - w.worldX;
        if (Math.abs(bo.x - hxs - 2) < 3.5 && Math.abs(bo.y - (Hb.y + 4)) < 5) {
          Hb.gone = true;
          bo.gone = true;
          boomAt(Math.round(hxs + 2), Math.round(Hb.y + 3), 8);
          break;
        }
      }
      if (bo.gone) { continue; }
      var bR = terrRow(Math.round(bo.x + w.worldX), w.rows);
      if (bo.y >= bR - 1) {
        bo.gone = true;
        boomAt(Math.round(bo.x), bR - 1, 5);
      }
    }

    /* ship — hands on the stick? then the attract pilot stands down:
       WASD flies, the wander resumes a beat after the keys go quiet */
    var S = w.ship;
    var mv = 0, mh = 0;
    if (keys.w) { mv -= 1; }
    if (keys.s) { mv += 1; }
    if (keys.a) { mh -= 1; }
    if (keys.d) { mh += 1; }
    if (mv !== 0 || mh !== 0) { S.manualUntil = w.t + 2600; }
    if (mh !== 0) { S.face = mh; }
    if (w.t < (S.manualUntil || 0)) {
      S.x += mh * 70 * ds;
      S.y += mv * 46 * ds;
      if (S.x < 1) { S.x = 1; }
      if (S.x > w.cols - 10) { S.x = w.cols - 10; }
      if (S.y < w.rows * 0.16) { S.y = w.rows * 0.16; }
      var floorY = terrRow(Math.round(S.x + 4), w.rows) - 12;
      if (S.y > floorY) { S.y = floorY; }
    } else {
      S.face = 1;
      S.tyCd -= dt;
      if (S.tyCd <= 0) {
        S.tyCd = 1500 + Math.random() * 1500;
        S.ty = w.rows * (0.56 + Math.random() * 0.10);
      }
      S.y += (S.ty - S.y) * Math.min(1, ds * 1.6);
    }
    if (S.hopV !== 0 || S.hopY !== 0) {
      S.hopY += S.hopV * ds;
      S.hopV += 105 * ds;
      if (S.hopY >= 0) { S.hopY = 0; S.hopV = 0; }
      if (S.hopY < -w.rows * 0.14) { S.hopY = -w.rows * 0.14; S.hopV = Math.max(S.hopV, 0); }
    }
    if (w.t >= (S.manualUntil || 0)) {
      var homeX = w.cols * 0.3 + Math.sin(w.t * 0.00037) * w.cols * 0.05;
      S.x += (homeX - S.x) * Math.min(1, ds * 2.2);
    }
    S.fireCd -= dt;
    /* the auto-gun only fires while the attract pilot is alone; a hand
       on the keys means SPACE is the only trigger */
    if (w.t >= (S.manualUntil || 0) && S.fireCd <= 0) {
      S.fireCd = 620 + Math.random() * 1100;
      fireShip(false);
    }

    /* bullets fly, hit landers, pop starbursts */
    for (i = 0; i < w.bullets.length; i++) {
      var b = w.bullets[i];
      b.x += b.vx * ds;
      b.y += b.vy * ds;
      if (b.x > w.cols + 4 || b.y > w.rows || b.y < 0) { b.gone = true; continue; }
      for (var k = 0; k < w.landers.length; k++) {
        var Ld = w.landers[k];
        if (Ld.gone) { continue; }
        var lsx = Ld.wx - w.worldX;
        if (Math.abs(b.x - (lsx + 4)) < 5 && Math.abs(b.y - (Ld.y + 3)) < 4.5) {
          b.gone = true;
          Ld.gone = true;
          w.score += 150;
          bumpHi(w);
          boomAt(Math.round(lsx + 4), Math.round(Ld.y + 3), 9);
          if (Ld.target && Ld.target.state === 'held') {
            Ld.target.state = 'fall';
            Ld.target.vy = 0;
            Ld.target.held = null;
          }
          break;
        }
      }
    }

    /* humanoids — stand, get carried, or fall back to the ground */
    for (i = 0; i < w.hums.length; i++) {
      var H = w.hums[i];
      if (H.gone) { continue; }
      if (H.state === 'ground') {
        H.y = terrRow(Math.round(H.wx), w.rows) - 8;
      } else if (H.state === 'held' && H.held) {
        H.y = H.held.y + 7;
        H.wx = H.held.wx;
      } else if (H.state === 'fall') {
        H.vy += 30 * ds;
        H.y += H.vy * ds;
        var gY2 = terrRow(Math.round(H.wx), w.rows) - 8;
        if (H.y >= gY2) {
          H.y = gY2;
          H.state = 'ground';
          H.vy = 0;
          H.cheerUntil = w.t + 1600;   /* saved: arms up, one happy hop */
          w.score += 250;
          bumpHi(w);
          boomAt(Math.round(H.wx - w.worldX), Math.round(gY2 + 3), 3);
        }
      }
      if (H.wx - w.worldX < -6) { H.gone = true; }
    }
    w.humCd -= dt;
    if (w.humCd <= 0 && w.hums.length < 5) {
      w.humCd = 5000;
      w.hums.push({
        wx: w.worldX + w.cols + Math.random() * w.cols,
        y: 0, state: 'ground', vy: 0, held: null, ph: Math.random() * 6.28
      });
    }

    /* explosion particles burn out white → gold → orange → red */
    for (i = 0; i < w.booms.length; i++) {
      var p = w.booms[i];
      p.x += p.vx * ds;
      p.y += p.vy * ds;
      p.vy += 3.2 * ds;
      p.life -= dt;
    }

    w.landers = w.landers.filter(function (l) { return !l.gone; });
    w.bullets = w.bullets.filter(function (b) { return !b.gone; });
    w.bombs = w.bombs.filter(function (b) { return !b.gone; });
    w.hums = w.hums.filter(function (h) { return !h.gone; });
    w.booms = w.booms.filter(function (p) { return p.life > 0; });
  }

  /* Persian pixel text cache for in-canvas blits (boot title card) */
  var faCache = {};
  function faCv(text, src, weight, color) {
    var key = text + '|' + src + '|' + weight + '|' + color;
    if (!faCache[key]) {
      faCache[key] = pxTextCanvas(text, { src: src, weight: weight, color: color, maxW: 400 });
    }
    return faCache[key];
  }

  function drawCoinSpr(g, cx, cy, r, spin) {
    /* spin 0..1: full face → edge-on → full face (mirrored) */
    var s = Math.abs(Math.cos(spin * Math.PI * 2));
    var rx = Math.max(1, r * s);
    pxBall(g, cx, cy, r, { out: PC.goldDk, hi: PC.goldHi, base: PC.gold, dk: PC.goldLo }, rx);
    if (s > 0.6) {
      /* minted face: reeded rim ticks, an inner ring, a struck star */
      g.fillStyle = PC.goldDk;
      g.fillRect(cx - 1, cy - 2, 2, 4);
      g.fillRect(cx - Math.round(rx) + 1, cy - 1, 1, 2);
      g.fillRect(cx + Math.round(rx) - 2, cy - 1, 1, 2);
      g.fillStyle = PC.goldLo;
      g.fillRect(cx - 2, cy - 3, 4, 1); g.fillRect(cx - 2, cy + 2, 4, 1);
      g.fillRect(cx - 3, cy - 2, 1, 4); g.fillRect(cx + 2, cy - 2, 1, 4);
      g.fillStyle = PC.goldHi;
      g.fillRect(cx - 1, cy - 1, 1, 1); g.fillRect(cx + 1, cy - 1, 1, 1);
      g.fillRect(cx, cy, 1, 1);
    }
    if (s > 0.85) {
      g.fillStyle = PC.goldHi;
      g.fillRect(cx - 2, cy - 3, 1, 1);
    }
  }

  /* a chunky pixel button face — shared by the START key painter */
  function drawPixelKey(g, x, y, w, h, state, label) {
    var off = state === 2 ? 1 : 2;
    var tones = state === 2
      ? { top: PC.gold, base: PC.goldLo, deep: PC.goldDk }
      : { top: PC.goldFace, base: PC.gold, deep: PC.goldDeep };
    /* hard shadow */
    g.fillStyle = 'rgba(0,0,0,.85)';
    g.fillRect(x + 2, y + off, w, h);
    /* halo when hovered: a 1px gold ring — the pixel glow */
    if (state === 1) {
      g.fillStyle = PC.goldHi;
      g.fillRect(x - 1, y - 1, w + 2, 1);
      g.fillRect(x - 1, y + h, w + 2, 1);
      g.fillRect(x - 1, y, 1, h);
      g.fillRect(x + w, y, 1, h);
    }
    /* notched face: border ring with 2px cut corners */
    g.fillStyle = PC.goldDk;
    g.fillRect(x + 2, y, w - 4, h);
    g.fillRect(x, y + 2, w, h - 4);
    g.fillRect(x + 1, y + 1, w - 2, h - 2);
    g.fillRect(x + 2, y + 2, 1, 1);
    g.fillRect(x + w - 3, y + 2, 1, 1);
    g.fillRect(x + 2, y + h - 3, 1, 1);
    g.fillRect(x + w - 3, y + h - 3, 1, 1);
    /* three-tone face */
    g.fillStyle = tones.top;
    g.fillRect(x + 2, y + 1, w - 4, 2);
    g.fillStyle = tones.base;
    g.fillRect(x + 1, y + 3, w - 2, h - 6);
    g.fillStyle = tones.deep;
    g.fillRect(x + 2, y + h - 3, w - 4, 2);
    /* glint pixels along the top edge */
    g.fillStyle = PC.goldHi;
    for (var gx = x + 3; gx < x + w - 3; gx += 3) { g.fillRect(gx, y + 1, 1, 1); }
    /* side walls — the cap has thickness, it sits IN the panel */
    g.fillStyle = PC.goldDk;
    g.fillRect(x + 1, y + h - 1, w - 2, 1);
    g.fillStyle = PC.out;
    g.fillRect(x + 2, y + h, w - 4, 2);
    /* label — 5×7, engraved: light under-shadow then the dark ink */
    var lx = x + Math.round((w - textW(label)) / 2);
    var ly = y + Math.round((h - 7) / 2) + (state === 2 ? 1 : 0);
    drawText(g, label, lx, ly + 1, PC.goldHi);
    drawText(g, label, lx, ly, PC.goldDk);
    /* power LED — sleeps dark, wakes red on hover/press */
    g.fillStyle = state > 0 ? PC.red : PC.redDk;
    g.fillRect(x + w - 4, y + 3, 2, 2);
    if (state > 0) { g.fillStyle = PC.redHi; g.fillRect(x + w - 4, y + 3, 1, 1); }
  }

  function renderWorld(g, mode, t) {
    var w = world;
    if (!g || !w) { return; }
    var cols = w.cols, rows = w.rows;
    var i;
    g.imageSmoothingEnabled = false;

    /* sky — attract mode keeps clean near-black glass like a title
       screen; boot mode keeps the dithered dusk bands + moon */
    g.drawImage(mode === 'hero' && attractCv ? attractCv : skyCv, 0, 0);

    /* starfield — three parallax depths; odd stars glint gold or red,
       the speckled-glass look of an old attract screen. The title
       screen keeps only a sparse twelfth of them: bezel glass is
       speckled, not snowed. */
    for (i = 0; i < w.stars.length; i++) {
      if (mode === 'hero' && (i % 12) !== 0) { continue; }
      var st = w.stars[i];
      var bright = st.l === 1 ? PC.star1 : (st.l === 2 ? PC.star2 : PC.star3);
      if (st.gold) { bright = PC.starG; }
      else if (st.red) { bright = PC.starRed; }
      if (st.l === 3 && Math.sin(t * 0.004 + st.tw) < -0.55) { continue; }
      g.fillStyle = bright;
      g.fillRect(Math.round(st.x), st.y, 1, 1);
    }

    /* drifting dithered clouds — boot sky only; the attract screen
       keeps its glass clean */
    if (mode !== 'hero') {
      for (i = 0; i < cloudSprs.length; i++) {
        var cl = cloudSprs[i];
        g.drawImage(cl.cv, Math.round(cl.x), cl.y);
      }
    }

    /* attract mode tones: the demo world sinks to near-black so the
       title card owns the glass; boot mode keeps the dusk palette */
    var heroMode = mode === 'hero';
    var TONE = heroMode
      ? { hi: '#241c3c', lite: '#1c1632', base: '#161129', dim: '#0d0a19', glint: PC.goldLo, gThr: 0.982 }
      : { hi: PC.terrHi, lite: PC.terrLite, base: PC.terr, dim: PC.terrDim, glint: PC.terrGlint, gThr: 0.965 };

    /* far mountains — slow silhouette ridge */
    var fx0 = Math.floor(w.worldX * 0.22);
    for (var sx = 0; sx < cols; sx++) {
      var ftr = farRow(fx0 + sx, rows);
      g.fillStyle = heroMode ? '#0e0d17' : PC.far;
      g.fillRect(sx, ftr, 1, rows - ftr);
    }

    /* mid mountains — silhouette with a lit top edge */
    var mx0 = Math.floor(w.worldX * 0.45);
    for (sx = 0; sx < cols; sx++) {
      var mtr = midRow(mx0 + sx, rows);
      g.fillStyle = heroMode ? '#131024' : PC.mid;
      g.fillRect(sx, mtr, 1, rows - mtr);
      if (hash01(mx0 + sx) > 0.5) {
        g.fillStyle = heroMode ? '#1c1832' : PC.midEdge;
        g.fillRect(sx, mtr, 1, 1);
      }
    }

    /* near terrain — the gold-phosphor ground the game plays on */
    var wx0 = Math.floor(w.worldX);
    for (sx = 0; sx < cols; sx++) {
      var wx = wx0 + sx;
      var tr = terrRow(wx, rows);
      var hv = hash01(wx);
      if (hv > TONE.gThr) {
        g.fillStyle = TONE.glint;
        g.fillRect(sx, tr - 1, 1, 1);
      }
      /* attract mode dims the gold phosphor: the demo world stays a
         whisper under the title card, not a headline */
      g.fillStyle = hv > 0.68 ? TONE.hi : (hv > 0.42 ? TONE.lite : TONE.base);
      g.fillRect(sx, tr, 1, 1);
      if (hash01(wx * 7 + 3) > 0.45) {
        g.fillStyle = TONE.dim;
        g.fillRect(sx, tr + 1, 1, 1);
      }
      /* face → dithered fade into deep ground */
      g.fillStyle = TONE.base;
      g.fillRect(sx, tr + 2, 1, 6);
      for (var dRow = 0; dRow < 4; dRow++) {
        var yy = tr + 8 + dRow;
        if (yy >= rows) { break; }
        if (bayerAt(sx, yy) > dRow / 4) { g.fillStyle = TONE.base; } else { g.fillStyle = TONE.dim; }
        g.fillRect(sx, yy, 1, 1);
      }
      g.fillStyle = TONE.dim;
      if (tr + 12 < rows) { g.fillRect(sx, tr + 12, 1, rows - tr - 12); }
    }

    /* humanoids on the mountains */
    var cheering = w.cheerUntil && t < w.cheerUntil;
    for (i = 0; i < w.hums.length; i++) {
      var H = w.hums[i];
      var hx = Math.round(H.wx - w.worldX);
      if (hx < -4 || hx > cols + 4) { continue; }
      var hSpr;
      var selfCheer = t < (H.cheerUntil || 0);
      if (H.state === 'held' || H.state === 'fall' || ((cheering || selfCheer) && H.state === 'ground')) {
        hSpr = SPR_HUMF;   /* arms up: carried off, falling, or thanking */
      } else {
        hSpr = ((Math.floor(w.t / 420) + i) % 2) ? SPR_HUM : SPR_HUM2;
      }
      var hy = Math.round(H.y) - (((cheering || selfCheer) && H.state === 'ground') ? 1 : 0);
      drawSpr(g, hSpr, hx, hy, HUM_LEG);
    }

    /* landers, wobbling on two frames */
    for (i = 0; i < w.landers.length; i++) {
      var L = w.landers[i];
      var lx = Math.round(L.wx - w.worldX);
      if (lx < -10 || lx > cols + 10) { continue; }
      drawSpr(g, (Math.floor(w.t / 260) + i) % 2 ? SPR_LANDER2 : SPR_LANDER, lx, Math.round(L.y), LANDER_LEG);
    }

    /* bombs blink red as they fall */
    if ((Math.floor(t / 130) % 2) === 0) {
      g.fillStyle = PC.bomb;
      for (i = 0; i < w.bombs.length; i++) {
        g.fillRect(Math.round(w.bombs[i].x) - 1, Math.round(w.bombs[i].y), 2, 2);
      }
    }

    /* bullets — 16-bit plasma laser bolts */
    for (i = 0; i < w.bullets.length; i++) {
      var bx = Math.round(w.bullets[i].x);
      var by = Math.round(w.bullets[i].y);
      var bd = w.bullets[i].dir || 1;
      g.fillStyle = PC.bulletGlow;
      g.fillRect(bd > 0 ? bx - 2 : bx - 5, by, 8, 1);
      g.fillStyle = PC.bullet;
      g.fillRect(bd > 0 ? bx - 2 : bx - 2, by, 5, 1);
      g.fillStyle = '#ffffff';
      g.fillRect(bd > 0 ? bx + 2 : bx - 3, by, 2, 1);
    }

    /* the ship + dual thruster flames */
    var S = w.ship;
    /* facing mirrors the hull; a victory roll flips it once more */
    var flip = ((S.face || 1) < 0 ? 1 : 0) ^ (t < (S.flipUntil || 0) ? 1 : 0);
    var shipX = Math.round(S.x);
    var shipY = Math.round(S.y + S.hopY);
    drawSpr(g, SPR_SHIP, shipX, shipY, SHIP_LEG, flip);
    var flameX = flip ? shipX + sprW(SPR_SHIP) : shipX - 1;
    var fPulse = (Math.floor(t / 100) % 2) === 0;
    g.fillStyle = PC.thr;
    g.fillRect(flameX, shipY + 3, fPulse ? 3 : 2, 1);
    g.fillRect(flameX, shipY + 7, fPulse ? 3 : 2, 1);
    g.fillStyle = PC.thrLo;
    g.fillRect(flameX + (flip ? 3 : -2), shipY + 3, 2, 1);
    g.fillRect(flameX + (flip ? 3 : -2), shipY + 7, 2, 1);

    /* starburst explosions, burning out */
    for (i = 0; i < w.booms.length; i++) {
      var p = w.booms[i];
      var fr = 1 - p.life / p.max;
      g.fillStyle = PC.boom[Math.min(3, Math.floor(fr * 4))];
      if (p.flash) {
        /* impact flash: a chunky 4-way cross */
        var px = Math.round(p.x), py = Math.round(p.y);
        g.fillRect(px - 1, py - 1, 3, 3);
        g.fillRect(px - 3, py, 2, 1);
        g.fillRect(px + 2, py, 2, 1);
        g.fillRect(px, py - 3, 1, 2);
        g.fillRect(px, py + 2, 1, 2);
      } else if (p.life > p.max * 0.78) {
        g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
      } else {
        g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
    }

    if (mode === 'hero') {
      /* ── attract chrome — the score row of a 1980s title screen ──
         1P / HIGH SCORE / 2P on two rows of white 5x7, exactly where
         the bezel glass of the old cabinets carried it. The CREDIT
         counter lives on the DOM foot row, beside the decal. */

      /* banner — START was pressed */
      if (w.banner && t < w.banner.until) {
        var bOn = (w.banner.until - t) > 300 ? true : (Math.floor(t / 160) % 2) === 0;
        if (bOn) {
          var bl1 = w.banner.l1, bl2 = w.banner.l2;
          /* a stamped notched plate, so the banner owns its pixels
             instead of fighting the marquee behind it */
          var bw = Math.max(textW(bl1, 2), textW(bl2)) + 16;
          var bx0 = Math.round(cols / 2 - bw / 2);
          var by0 = Math.round(rows * 0.30) - 7;
          var bh0 = 42;
          g.fillStyle = PC.panelBd;
          g.fillRect(bx0 + 2, by0, bw - 4, bh0);
          g.fillRect(bx0, by0 + 2, bw, bh0 - 4);
          g.fillStyle = PC.panel;
          g.fillRect(bx0 + 2, by0 + 2, bw - 4, bh0 - 4);
          g.fillRect(bx0 + 1, by0 + 3, bw - 2, bh0 - 6);
          g.fillRect(bx0 + 3, by0 + 1, bw - 6, bh0 - 2);
          g.fillStyle = PC.panelHi;
          for (var pgx = bx0 + 3; pgx < bx0 + bw - 3; pgx += 3) { g.fillRect(pgx, by0 + 2, 1, 1); }
          drawText(g, bl1, Math.round(cols / 2 - textW(bl1, 2) / 2) + 1, Math.round(rows * 0.30) + 1, PC.goldDk, 2);
          drawText(g, bl1, Math.round(cols / 2 - textW(bl1, 2) / 2), Math.round(rows * 0.30), PC.score, 2);
          drawText(g, bl2, Math.round(cols / 2 - textW(bl2) / 2), Math.round(rows * 0.30) + 20, PC.start, 1);
        }
      }
    } else {
      /* ── boot mode: the same world, dimmed under the title card ── */
      g.drawImage(dimCv, 0, 0);
      var el = t - w.bootT0;

      /* power flash — a white line snaps across the tube */
      if (el >= 0 && el < 560) {
        var pf = el / 560;
        var eOut = 1 - (1 - pf) * (1 - pf);
        var lw = Math.max(2, Math.round(cols * eOut));
        var mx = Math.round(cols / 2 - lw / 2);
        var my = Math.round(rows * 0.5);
        g.fillStyle = '#ffffff';
        g.fillRect(mx, my, lw, 1);
        g.fillStyle = PC.star3;
        g.fillRect(mx, my - 1, lw, 1);
        g.fillRect(mx, my + 1, lw, 1);
      }

      /* POST block, top-left like real hardware */
      for (var pi = 0; pi < POST.length; pi++) {
        if (el > 420 + pi * 130) {
          drawText(g, POST[pi][0], 2, 3 + pi * 9, PC.post);
          if (POST[pi][1]) {
            drawText(g, POST[pi][1], 2 + textW(POST[pi][0]) + 2, 3 + pi * 9, PC.ok);
          }
        }
      }

      /* ROM check bar — cells fill in ordered dither fashion */
      if (el > 400) {
        var cells = 16, cw = 4;
        var bx = 2, by = 60;
        g.fillStyle = PC.panelBd;
        g.fillRect(bx - 1, by - 1, cells * cw + 2, 7);
        g.fillStyle = PC.ink;
        g.fillRect(bx, by, cells * cw, 5);
        var fill = Math.max(0, Math.min(cells, Math.round((el - 500) / 62)));
        for (var ci = 0; ci < fill; ci++) {
          g.fillStyle = (ci % 2 === 0) ? PC.gold : PC.goldLo;
          g.fillRect(bx + ci * cw + 1, by + 1, cw - 2, 3);
        }
      }

      /* the title card — a dithered panel with a spinning coin */
      if (el > 1450) {
        var cardW = Math.min(cols - 8, 200);
        var tScale0 = cardW >= 180 ? 3 : (cardW >= 140 ? 2 : 1);
        var fa = faCv('چهار دنیا', 11, 800, PC.gold);
        var cardH = 24 + tScale0 * 7 + 3 + fa.height + 6;
        var cx = Math.round(cols / 2);
        var cardY = Math.max(72, Math.round(rows * 0.46) - Math.round(cardH / 2));
        var cardX = cx - Math.round(cardW / 2);
        /* dither halo ring around the panel */
        for (var hy = -1; hy <= cardH; hy++) {
          for (var hxx = -1; hxx <= cardW; hxx++) {
            var edge = (hxx === -1 || hxx === cardW || hy === -1 || hy === cardH);
            if (!edge) { continue; }
            if (bayerAt(hxx, hy) < 0.5) {
              g.fillStyle = PC.panel;
              g.fillRect(cardX + hxx, cardY + hy, 1, 1);
            }
          }
        }
        /* notched panel + border */
        g.fillStyle = PC.panelBd;
        g.fillRect(cardX + 2, cardY, cardW - 4, cardH);
        g.fillRect(cardX, cardY + 2, cardW, cardH - 4);
        g.fillRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2);
        g.fillStyle = PC.panel;
        g.fillRect(cardX + 2, cardY + 2, cardW - 4, cardH - 4);
        g.fillRect(cardX + 1, cardY + 3, cardW - 2, cardH - 6);
        g.fillRect(cardX + 3, cardY + 1, cardW - 6, cardH - 2);
        g.fillStyle = PC.panelHi;
        for (var gx2 = cardX + 3; gx2 < cardX + cardW - 3; gx2 += 3) {
          g.fillRect(gx2, cardY + 2, 1, 1);
        }
        /* spinning gold coin */
        var spin = (Math.floor((t - 1450) / 150) % 4) / 4;
        drawCoinSpr(g, cx, cardY + 12, 6, spin + 0.02);
        /* the title — gold with a hard drop shadow */
        var tStr = 'FOUR WORLDS';
        var tw = textW(tStr, tScale0);
        drawText(g, tStr, cx - Math.round(tw / 2) + tScale0, cardY + 24 + tScale0, PC.goldDk, tScale0);
        drawText(g, tStr, cx - Math.round(tw / 2), cardY + 24, PC.goldHi, tScale0);
        /* Persian title under it, pixel-set, inside the card */
        g.drawImage(fa, cx - Math.round(fa.width / 2), cardY + 24 + tScale0 * 7 + 3);
      }

      /* coin slot + INSERT COIN → CREDIT 1 */
      if (el > 2100) {
        var isCredit = el > 2680;
        var label = isCredit ? 'CREDIT 1' : 'INSERT COIN';
        var slotW = 5, slotH = 9;
        var totalW = slotW + 3 + textW(label);
        var bx2 = Math.round(cols / 2 - totalW / 2);
        var by2 = Math.round(rows * 0.72);
        g.fillStyle = PC.ink;
        g.fillRect(bx2, by2, slotW, slotH);
        g.fillStyle = PC.metalBd;
        g.fillRect(bx2, by2, slotW, 1);
        g.fillRect(bx2, by2 + slotH - 1, slotW, 1);
        g.fillRect(bx2, by2, 1, slotH);
        g.fillRect(bx2 + slotW - 1, by2, 1, slotH);
        g.fillStyle = PC.goldLo;
        g.fillRect(bx2 + 2, by2 + 2, 1, slotH - 4);
        if (isCredit || (Math.floor(t / 375) % 2) === 0) {
          drawText(g, label, bx2 + slotW + 3, by2 + 1, PC.coin);
        }
        /* pixel coin dropping into the slot */
        if (el >= 2250 && el < 2650) {
          var cp = Math.min(1, (el - 2250) / 380);
          var cStep = Math.floor(cp * 6) / 6;
          var cy2 = Math.round(by2 - 10 + cStep * (slotH - 1));
          drawCoinSpr(g, bx2 + 2, cy2 + 2, 2.99, 0.02);
        }
      }

      /* PRESS START — big, blinking */
      if (el > 2680 && (Math.floor(t / 450) % 2) === 0) {
        var ps1 = 'PRESS START';
        drawText(g, ps1, Math.round(cols / 2 - textW(ps1, 2) / 2) + 2, Math.round(rows * 0.82) + 2, PC.pressDk, 2);
        drawText(g, ps1, Math.round(cols / 2 - textW(ps1, 2) / 2), Math.round(rows * 0.82), PC.press, 2);
      }
    }

    /* CRT vignette — pre-rendered dither, over the world but UNDER
       the glass text: the score row must never be eaten by it */
    g.drawImage(vigCv, 0, 0);
    if (mode === 'hero') { drawAttractChrome(g, cols, rows, w); }

    /* coin surge — the whole tube glitters gold for a beat (dithered) */
    if (w.flash > 0 && mode === 'hero') {
      var lvl = w.flash > 600 ? 2 : (w.flash > 300 ? 1 : 0);
      g.drawImage(flashCvs[lvl], 0, 0);
    }
  }

  /* the score row of the bezel glass — drawn last, over the vignette,
     so corner dither never eats the 1P / 2P columns; small tubes get
     it at 2x because 1px strokes on a 2px grid read as noise */
  function drawAttractChrome(g, cols, rows, w) {
    var sc = PXG <= 2 ? 2 : 1;
    var y1 = sc === 2 ? 2 : 3;
    var y2 = y1 + 8 * sc;
    var chrome = PC.shell;   /* white glass text, over the vignette */
    drawText(g, '1P', 6, y1, chrome, sc);
    if (sc === 2) { drawText(g, '00', 6, y2, chrome, sc); }
    var hs1 = 'HIGH SCORE';
    var hs2 = pad10(hiScore);
    drawText(g, hs1, Math.round(cols / 2 - textW(hs1, sc) / 2), y1, chrome, sc);
    drawText(g, hs2, Math.round(cols / 2 - textW(hs2, sc) / 2), y2, chrome, sc);
    if (sc === 1) {
      /* wide tubes carry the live run score and the empty 2P slot */
      drawText(g, pad10(w ? w.score : 0), 6, y2, chrome, sc);
      drawText(g, '0000000000', cols - 6 - textW('0000000000', sc), y2, chrome, sc);
    } else {
      drawText(g, '00', cols - 6 - textW('00', sc), y2, chrome, sc);
    }
  }

  if (hero && cv) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(hero);
    buildWorld();
    fieldOn = true;
  }

  /* ── pixel controls · every control is a canvas sprite ── */
  /* Joystick, START key, JUMP/FIRE domes, coin door: painted at sprite
     resolution, scaled by the game grid. Presses shift the sprite one
     game pixel and shrink its hard shadow — the pixel-art way to press.
     Nothing here is a gradient or a blur: tones are flat, shadows are
     hard offsets, highlights are single pixels. */
  var joyBox = $('.joy');
  var joyCv = $('.joy-cv');
  var startBtn = $('#startBtn');
  var startCv = $('.pstart-cv');
  var pbtnEls = $$('.pbtn');
  var coinBtn = $('#coinBtn');
  var coinCv = $('.coin-cv');
  var coinLabel = $('#coinLabel');
  var decalEl = $('#crtDecal');
  var cueCv = $('.cue-cv');

  /* the credit ledger — a coin is a kept promise, not a flash:
     it persists across visits, START spends it, and the sky keeps
     one gold star per credit as a receipt */
  var credits = Math.max(0, Math.min(99, parseInt(store('fw-credits') || '0', 10) || 0));
  /* the cabinet remembers its best day: every kill and every rescued
     human feeds the score, and the score feeds this kept high */
  var hiScore = Math.max(0, parseInt(store('fw-hiscore') || '0', 10) || 0);
  function bumpHi(w) {
    if (w.score > hiScore) {
      hiScore = w.score;
      store('fw-hiscore', '' + hiScore);
    }
  }
  function pad10(n) {
    n = Math.max(0, Math.min(9999999999, Math.floor(n)));
    return ('0000000000' + n).slice(-10);
  }
  function saveCredits() { store('fw-credits', '' + credits); }

  var keys = { w: false, a: false, s: false, d: false };
  var KEYMAP = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd' };
  function manualGun() {
    var w = world;
    if (!w || !w.ship) { return; }
    if (w.ship.fireCd <= 0) {
      w.ship.fireCd = 260;
      fireShip(true);
    }
  }
  addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { return; }
    if (!heroVisible || !world) { return; }
    var k = KEYMAP[e.code];
    if (k) { keys[k] = true; e.preventDefault(); return; }
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) { manualGun(); }
    }
  });
  addEventListener('keyup', function (e) {
    var k = KEYMAP[e.code];
    if (k) { keys[k] = false; }
  });
  addEventListener('blur', function () { keys.w = keys.a = keys.s = keys.d = false; });

  var joyTilt = 0, joyPress = false;
  var startState = 0;   /* 0 idle · 1 hover · 2 press */
  var pbtnState = [0, 0];
  var coinLed = true, coinAnimT0 = -1, coinCredit = false;

  function paintJoy() {
    if (!joyCv) { return; }
    var g = joyCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    joyCv.width = 38; joyCv.height = 36;
    g.clearRect(0, 0, 38, 36);
    /* hard shadow under the dust cover */
    pxOval(g, 19, 31, 15, 6, 'rgba(0,0,0,.85)');
    /* dust-cover dome — two-tone metal with a gold rim on top */
    pxOval(g, 17, 29, 15, 6, PC.metalDk);
    pxOval(g, 17, 28, 15, 6, PC.metal);
    g.fillStyle = PC.metalHi;
    g.fillRect(8, 24, 18, 1);
    g.fillStyle = PC.gold;
    for (var rx = 6; rx < 29; rx += 3) { g.fillRect(rx, 23, 1, 1); }
    /* screws */
    g.fillStyle = PC.ink;
    g.fillRect(5, 28, 2, 2); g.fillRect(27, 28, 2, 2);
    g.fillRect(10, 32, 2, 2); g.fillRect(24, 32, 2, 2);
    /* shaft throat */
    pxOval(g, 17, 26, 6, 3, PC.ink);
    /* the shaft — sheared columns make a true pixel tilt, with a
       rib every third row so the chrome reads as machined */
    var topY = joyPress ? 12 : 11;
    var baseY = 26;
    var k = joyTilt / 3;
    var x, y;
    for (y = topY; y <= baseY; y++) {
      var f = (baseY - y) / (baseY - topY);
      var sx = 17 + Math.round(k * f * 6);
      g.fillStyle = PC.shaftHi; g.fillRect(sx, y, 1, 1);
      g.fillStyle = PC.shaft;   g.fillRect(sx + 1, y, 1, 1);
      g.fillStyle = PC.shaftDk; g.fillRect(sx + 2, y, 1, 1);
      if ((y - topY) % 3 === 1) { g.fillStyle = PC.shaftHi; g.fillRect(sx + 1, y, 1, 1); }
    }
    /* collar at the base, follows the tilt */
    var colX = 17 + Math.round(k * 1.5);
    g.fillStyle = PC.ink;
    g.fillRect(colX - 3, 24, 7, 2);
    g.fillStyle = PC.metalHi;
    g.fillRect(colX - 3, 24, 7, 1);
    /* the ball-top — 3-tone gold, white specular AND a rim-light arc
       along the bottom, the way lit plastic actually looks */
    var bx = 17 + Math.round(k * 6);
    var by = (joyPress ? 9 : 8);
    pxBall(g, bx, by, 6, { out: PC.goldDk, hi: PC.goldHi, base: PC.gold, dk: PC.goldLo });
    g.fillStyle = PC.white;
    g.fillRect(bx - 2, by - 3, 1, 1);
    if (Math.abs(k) < 0.4) { g.fillRect(bx - 1, by - 4, 1, 1); }
    g.fillStyle = PC.goldHi;
    g.fillRect(bx - 3, by + 4, 2, 1); g.fillRect(bx + 2, by + 4, 2, 1);
    g.fillRect(bx - 1, by + 5, 3, 1);
    /* the dust cover flexes against the tilt — rubber, not paint */
    if (k !== 0) {
      g.fillStyle = PC.metalDk;
      g.fillRect(17 - Math.round(k * 3) - 5, 25, 4, 1);
      g.fillRect(17 - Math.round(k * 3) + 12, 25, 4, 1);
    }
    joyCv.style.width = (38 * PXG) + 'px';
    joyCv.style.height = (36 * PXG) + 'px';
  }

  function paintStart() {
    if (!startCv) { return; }
    var g = startCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    startCv.width = 38; startCv.height = 18;
    g.clearRect(0, 0, 38, 18);
    drawPixelKey(g, 2, 2, 34, 12, startState, 'START');
    startCv.style.width = (38 * PXG) + 'px';
    startCv.style.height = (18 * PXG) + 'px';
  }

  function paintPBtns() {
    pbtnEls.forEach(function (el, idx) {
      var cvs = el.querySelector('.pbtn-cv');
      if (!cvs) { return; }
      var red = el.classList.contains('pbtn-red');
      var state = pbtnState[idx] || 0;
      var g = cvs.getContext('2d');
      g.imageSmoothingEnabled = false;
      cvs.width = 26; cvs.height = 26;
      g.clearRect(0, 0, 26, 26);
      var off = state === 2 ? 1 : 2;
      /* hard shadow */
      pxOval(g, 13, 13 + off, 10, 10, 'rgba(0,0,0,.85)');
      /* a machined bezel ring seats the dome in the panel */
      var dy = state === 2 ? 1 : 0;
      pxOval(g, 12, 12 + dy, 11, 11, PC.metalBd);
      pxOval(g, 12, 12 + dy, 10, 10, PC.metalDk);
      g.fillStyle = PC.metalHi;
      g.fillRect(5, 5 + dy, 3, 1); g.fillRect(17, 5 + dy, 3, 1);
      g.fillRect(5, 18 + dy, 3, 1); g.fillRect(17, 18 + dy, 3, 1);
      /* the dome */
      var tones = red
        ? { out: PC.redOut, hi: PC.redHi, base: PC.red, dk: PC.redDk }
        : { out: PC.shellOut, hi: '#ffffff', base: PC.shell, dk: PC.shellDk };
      pxBall(g, 11, 11 + dy, 9, tones);
      /* cross specular — glossy plastic, one hard highlight */
      g.fillStyle = tones.hi;
      g.fillRect(7, 7 + dy, 2, 1); g.fillRect(8, 6 + dy, 1, 2);
      /* pressed: light spills from under the bezel */
      if (state === 2) {
        g.fillStyle = red ? PC.red : PC.shell;
        g.fillRect(3, 21, 4, 1); g.fillRect(19, 21, 4, 1);
        g.fillRect(11, 23, 3, 1);
      }
      /* halo when hovered */
      if (state === 1) {
        g.fillStyle = PC.goldHi;
        g.fillRect(2, 11 + dy, 3, 1); g.fillRect(18, 11 + dy, 3, 1);
        g.fillRect(11, 2 + dy, 1, 3); g.fillRect(11, 18 + dy, 1, 3);
        g.fillRect(4, 5 + dy, 1, 1); g.fillRect(17, 5 + dy, 1, 1);
        g.fillRect(4, 17 + dy, 1, 1); g.fillRect(17, 17 + dy, 1, 1);
      }
      /* micro-font label */
      var label = red ? 'FIRE' : 'JUMP';
      drawMText(g, label, 11 - Math.round(mTextW(label) / 2), 9 + dy, red ? PC.redOut : PC.shellOut);
      cvs.style.width = (26 * PXG) + 'px';
      cvs.style.height = (26 * PXG) + 'px';
    });
  }

  function paintCoin() {
    if (!coinCv) { return; }
    var g = coinCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    coinCv.width = 26; coinCv.height = 27;
    g.clearRect(0, 0, 26, 27);
    /* hard shadow */
    g.fillStyle = 'rgba(0,0,0,.85)';
    g.fillRect(4, 3, 22, 24);
    /* the plate — notched, two-tone metal */
    g.fillStyle = PC.metalBd;
    g.fillRect(4, 1, 20, 23);
    g.fillRect(2, 3, 24, 19);
    g.fillStyle = PC.metal;
    g.fillRect(4, 3, 18, 19);
    g.fillRect(3, 3, 20, 19);
    g.fillStyle = PC.metalDk;
    g.fillRect(3, 20, 22, 3);
    g.fillStyle = PC.metalHi;
    for (var gx = 5; gx < 23; gx += 3) { g.fillRect(gx, 2, 1, 1); }
    /* brushed-metal rows across the plate */
    g.fillStyle = PC.metalHi;
    g.fillRect(5, 5, 6, 1); g.fillRect(15, 9, 6, 1); g.fillRect(6, 14, 5, 1);
    g.fillRect(14, 19, 7, 1); g.fillRect(5, 21, 4, 1);
    /* door screws in the corners */
    g.fillStyle = PC.ink;
    g.fillRect(4, 3, 1, 1); g.fillRect(21, 3, 1, 1);
    g.fillRect(4, 20, 1, 1); g.fillRect(21, 20, 1, 1);
    g.fillStyle = PC.metalHi;
    g.fillRect(4, 3, 1, 1);
    /* the LED breathes a one-pixel halo when lit */
    if (coinLed) {
      g.fillStyle = 'rgba(255, 215, 106, 0.35)';
      g.fillRect(18, 3, 4, 2); g.fillRect(19, 2, 2, 4);
    }
    /* two slot cuts with a gold glint */
    var sx;
    for (sx = 0; sx < 2; sx++) {
      var x0 = 7 + sx * 7;
      g.fillStyle = PC.ink;
      g.fillRect(x0, 6, 4, 12);
      g.fillStyle = PC.metalBd;
      g.fillRect(x0, 6, 4, 1); g.fillRect(x0, 17, 4, 1);
      g.fillRect(x0, 6, 1, 12); g.fillRect(x0 + 3, 6, 1, 12);
      g.fillStyle = PC.goldLo;
      g.fillRect(x0 + 2, 7, 1, 10);
      g.fillStyle = PC.gold;
      g.fillRect(x0 + 2, 7, 1, 2);
    }
    /* the LED */
    g.fillStyle = coinLed ? PC.gold : PC.goldDk;
    g.fillRect(19, 3, 2, 2);
    if (coinLed) { g.fillStyle = PC.goldHi; g.fillRect(19, 3, 1, 1); }
    /* coin drop animation — a pixel coin falling into the left slot */
    if (coinAnimT0 >= 0) {
      var cp = Math.min(1, (performance.now() - coinAnimT0) / 480);
      if (cp >= 1) {
        coinAnimT0 = -1;
      } else {
        var cStep = Math.floor(cp * 6) / 6;
        var cy = Math.round(2 + cStep * 14);
        drawCoinSpr(g, 9, cy, 2.99, 0.02);
      }
    }
    coinCv.style.width = (26 * PXG) + 'px';
    coinCv.style.height = (27 * PXG) + 'px';
  }

  function setCoinCredit(on) {
    coinCredit = on;
    if (coinLabel) { coinLabel.dataset.credit = on ? '1' : ''; }
    paintCoinLabel();
    paintCredit();
  }

  function paintCoinLabel() {
    if (!coinLabel) { return; }
    var nn = credits < 10 ? '0' + credits : '' + credits;
    var text = coinCredit ? 'THANK YOU' : (credits > 0 ? 'CREDIT ' + nn : 'INSERT COIN');
    var color = coinCredit || credits > 0 ? PC.gold : PC.slateHi;
    var W = textW(text) + 1;
    var H = 9;
    var mount = coinLabel.querySelector('canvas') || doc.createElement('canvas');
    mount.width = W; mount.height = H;
    var g = mount.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    drawText(g, text, 1, 1, color);
    mount.className = 'pxcv';
    mount.style.width = (W * PXT) + 'px';
    mount.style.height = (H * PXT) + 'px';
    if (!mount.parentNode) { coinLabel.textContent = ''; coinLabel.appendChild(mount); }
  }

  /* the CREDIT counter — bottom-right of the glass, like the reference
     attract screen; goes live (00 → 01) while a coin is in the door */
  var creditLabel = $('#creditLabel');
  function paintCredit() {
    if (!creditLabel) { return; }
    var nn = credits < 10 ? '0' + credits : '' + credits;
    var text = 'CREDIT ' + nn;
    var color = credits > 0 || coinCredit ? PC.gold : PC.shell;
    var W = textW(text) + 1;
    var H = 9;
    var mount = creditLabel.querySelector('canvas') || doc.createElement('canvas');
    mount.width = W; mount.height = H;
    var g = mount.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    drawText(g, text, 1, 1, color);
    mount.className = 'pxcv';
    mount.style.width = (W * PXT) + 'px';
    mount.style.height = (H * PXT) + 'px';
    if (!mount.parentNode) { creditLabel.textContent = ''; creditLabel.appendChild(mount); }
  }

  function paintDecal() {
    if (!decalEl) { return; }
    var text = decalEl.dataset.text || deccalText(decalEl);
    decalEl.dataset.text = text;
    /* narrow tubes: the short decal leaves the right corner of the
       foot row free for the CREDIT counter */
    if (html.clientWidth < 380) { text = 'MMR-84'; }
    else if (html.clientWidth < 520) { text = 'MMR-84 · 4 WORLDS'; }
    var W = textW(text) + 1;
    var mount = decalEl.querySelector('canvas') || doc.createElement('canvas');
    mount.width = W; mount.height = 9;
    var g = mount.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, 9);
    drawText(g, text, 1, 1, PC.slate);
    mount.className = 'pxcv';
    mount.style.width = (W * PXT) + 'px';
    mount.style.height = (9 * PXT) + 'px';
    if (!mount.parentNode) { decalEl.textContent = ''; decalEl.appendChild(mount); }
  }
  function deccalText(el) { return (el.textContent || '').trim(); }

  /* the cue: the attract screen's heartbeat — a big blinking peach
     PRESS START with a hard drop shadow, and under it the steady white
     INSERT COIN TO CONTINUE, straight off the 1980s bezel glass */
  var cueSubCv = $('.cue-sub');
  function paintCue() {
    if (!cueCv) { return; }
    var g = cueCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    /* 3x only on tall tubes: the marquee must never squeeze the deck */
    var sc = (PXG >= 4 && html.clientHeight >= 1040) ? 3 : 2;
    var str = 'PRESS START';
    var W = textW(str, sc) + sc + 2;
    var H = 7 * sc + sc + 2;
    cueCv.width = W; cueCv.height = H;
    g.clearRect(0, 0, W, H);
    drawText(g, str, 1 + sc, 1 + sc, PC.pressDk, sc);
    drawText(g, str, 1, 1, PC.press, sc);
    cueCv.style.width = (W * PXG) + 'px';
    cueCv.style.height = (H * PXG) + 'px';
    if (!cueSubCv) { return; }
    var sg = cueSubCv.getContext('2d');
    sg.imageSmoothingEnabled = false;
    var sub = 'INSERT COIN TO CONTINUE';
    var SW = mTextW(sub) + 2;
    var SH = 7;
    cueSubCv.width = SW; cueSubCv.height = SH;
    sg.clearRect(0, 0, SW, SH);
    drawMText(sg, sub, 1, 1, PC.shell);
    cueSubCv.style.width = (SW * PXG) + 'px';
    cueSubCv.style.height = (SH * PXG) + 'px';
  }

  function buildControls() {
    calcGrids();
    paintJoy();
    paintStart();
    paintPBtns();
    paintCoin();
    paintCoinLabel();
    paintCredit();
    paintDecal();
    paintCue();
  }

  /* ── cursor sprite · a pixel arrow on the same grid ─── */
  var cursor = $('#cursor');
  var cursorTag = $('#cursorTag');
  var useCursor = finePointer.matches && !reduced.matches && cursor;
  var cxx = -100, cyy = -100;
  var CURSOR_SCALE = 2;

  var CUR_ARROW = [
    '#.......',
    '##......',
    '###.....',
    '####....',
    '#####...',
    '######..',
    '#######.',
    '########',
    '#####...',
    '#.###...',
    '#..##...',
    '...##...',
    '...##...'
  ];

  function paintCursor(mode) {
    if (!cursor) { return; }
    var cvs = cursor.querySelector('.cursor-cv');
    if (!cvs) { return; }
    var g = cvs.getContext('2d');
    g.imageSmoothingEnabled = false;
    cvs.width = 11; cvs.height = 15;
    g.clearRect(0, 0, 11, 15);
    var body = mode === 'hover' || mode === 'enter' ? PC.gold : PC.shell;
    if (mode === 'enter') {
      /* crosshair — gold, centered on the pointer */
      var cx = 5, cyy2 = 7;
      g.fillStyle = PC.ink;
      g.fillRect(cx - 1, cyy2 - 1, 3, 3);
      g.fillRect(cx - 5, cyy2, 3, 1); g.fillRect(cx + 3, cyy2, 3, 1);
      g.fillRect(cx, cyy2 - 5, 1, 3); g.fillRect(cx, cyy2 + 3, 1, 3);
      g.fillStyle = body;
      g.fillRect(cx, cyy2, 1, 1);
      g.fillRect(cx - 4, cyy2, 2, 1); g.fillRect(cx + 3, cyy2, 2, 1);
      g.fillRect(cx, cyy2 - 4, 1, 2); g.fillRect(cx, cyy2 + 3, 1, 2);
      g.fillRect(cx - 2, cyy2 - 2, 1, 1); g.fillRect(cx + 2, cyy2 + 2, 1, 1);
      g.fillRect(cx + 2, cyy2 - 2, 1, 1); g.fillRect(cx - 2, cyy2 + 2, 1, 1);
    } else {
      /* arrow — hard dark shadow, then the body */
      drawSpr(g, CUR_ARROW, 2, 2, { '#': PC.ink });
      drawSpr(g, CUR_ARROW, 1, 1, { '#': body });
      if (mode === 'flash') {
        g.fillStyle = PC.shell;
        g.fillRect(9, 0, 2, 1); g.fillRect(10, 1, 1, 2);
      }
    }
    cvs.style.width = (11 * CURSOR_SCALE) + 'px';
    cvs.style.height = (15 * CURSOR_SCALE) + 'px';
  }

  function paintCursorTag() {
    if (!cursorTag) { return; }
    var text = 'ENTER';
    var W = mTextW(text) + 5;
    var H = 9;
    cursorTag.width = W; cursorTag.height = H;
    var g = cursorTag.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = PC.shell;
    g.fillRect(1, 0, W - 2, H);
    g.fillRect(0, 1, W, H - 2);
    g.fillStyle = PC.ink;
    g.fillRect(2, 2, W - 4, H - 4);
    drawMText(g, text, 3, 3, PC.shell);
    cursorTag.style.width = (W * CURSOR_SCALE) + 'px';
    cursorTag.style.height = (H * CURSOR_SCALE) + 'px';
  }

  if (useCursor) {
    html.classList.add('has-cursor');
    paintCursor('idle');
    paintCursorTag();
    doc.addEventListener('pointerdown', function () {
      cursor.classList.add('is-flash');
      paintCursor('flash');
      setTimeout(function () { cursor.classList.remove('is-flash'); paintCursor('idle'); }, 110);
    }, { passive: true });
  }

  /* ── belt · seamless JS loop, pixel-snapped ─────────── */
  var marquee = $('.marquee');
  var mtrack = $('.marquee-track');
  var mseq = mtrack ? mtrack.children[0] : null;
  var seqW = 0, mpos = 0, mPaused = false, marqueeOn = false;

  function buildMarquee() {
    if (!marquee || !mseq || !mtrack) { return; }
    for (var i = mtrack.children.length - 1; i >= 1; i--) {
      mtrack.children[i].remove();
    }
    seqW = Math.round(mseq.getBoundingClientRect().width);
    if (seqW <= 0) { marqueeOn = false; return; }
    var vw = html.clientWidth;
    var copies = Math.max(2, Math.ceil((vw + seqW) / seqW));
    for (var j = 1; j < copies; j++) {
      var c = mseq.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      mtrack.appendChild(c);
    }
    mpos = ((mpos % seqW) + seqW) % seqW;
    marqueeOn = !reduced.matches;
  }
  if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) {
    doc.fonts.ready.then(function () { buildMarquee(); });
  }

  /* ── hover brain · scroll-aware, arcade-steppy ──────── */
  var gates = $$('.btn-gate').map(function (g) {
    return { el: g, label: $('.btn-label', g), press: false };
  });
  var cartList = $$('.cartridge');
  var artCarts = $$('.world-art').map(function (a) {
    return { art: a, cart: $('.cartridge', a) };
  }).filter(function (o) { return !!o.cart; });
  var hoverTarget = null;
  var lastBlipAt = 0;
  var refreshQueued = false;
  var prevStartHover = false, prevCoinHover = false;

  function queueRefresh() {
    if (refreshQueued) { return; }
    refreshQueued = true;
    requestAnimationFrame(function () {
      refreshQueued = false;
      refreshPointer();
    });
  }

  function snapFlash(el) {
    if (reduced.matches || !el) { return; }
    el.classList.remove('snap');
    void el.offsetWidth;
    el.classList.add('snap');
    setTimeout(function () { el.classList.remove('snap'); }, 380);
  }

  function refreshPointer() {
    if (!pointerSeen) { return; }
    var el = doc.elementFromPoint(mx, my);
    var cart = el ? el.closest('.cartridge') : null;
    var link = el ? el.closest('a, button') : null;
    var art = el ? el.closest('.world-art') : null;
    var inMarquee = !!(el && el.closest('.marquee'));

    if (useCursor) {
      var wasEnter = cursor.classList.contains('is-enter');
      var wasHover = cursor.classList.contains('is-hover');
      cursor.classList.toggle('is-enter', !!cart);
      cursor.classList.toggle('is-hover', !!link && !cart);
      cursorTag.classList.toggle('show', !!cart);
      if ((!!cart) !== wasEnter || ((!!link && !cart)) !== wasHover) {
        paintCursor(cart ? 'enter' : (link ? 'hover' : 'idle'));
      }
    }
    soundBtn.classList.toggle('is-hover', soundBtn === link);
    if (startBtn) {
      startBtn.classList.toggle('is-hover', startBtn === link);
      var sh = startBtn === link;
      if (sh !== prevStartHover) {
        prevStartHover = sh;
        startState = sh ? 1 : 0;
        paintStart();
      }
    }
    if (coinBtn) {
      coinBtn.classList.toggle('is-hover', coinBtn === link);
    }

    var target = cart || link;
    if (target !== hoverTarget) {
      hoverTarget = target;
      var now = Date.now();
      if (target && now - lastBlipAt > 90) { lastBlipAt = now; blip(660, 40); }
    }

    cartList.forEach(function (c) {
      var on = c === cart;
      if (on) {
        if (!c.classList.contains('is-hover')) { c.classList.add('is-hover'); snapFlash(c); }
      } else if (c.classList.contains('is-hover')) {
        c.classList.remove('is-hover');
        c.classList.remove('snap');
      }
    });

    gates.forEach(function (g) {
      var on = g.el === link;
      if (on) {
        if (!g.el.classList.contains('is-hover')) { g.el.classList.add('is-hover'); snapFlash(g.el); }
      } else if (g.el.classList.contains('is-hover')) {
        g.el.classList.remove('is-hover');
        g.el.classList.remove('snap');
      }
    });

    mPaused = inMarquee;

    if (finePointer.matches && !reduced.matches) {
      artCarts.forEach(function (o) {
        if (o.art === art) {
          var r = o.art.getBoundingClientRect();
          var rx = ((my - r.top) / r.height - 0.5) * -10;
          var ry = ((mx - r.left) / r.width - 0.5) * 10;
          rx = Math.max(-5, Math.min(5, Math.round(rx / 2.5) * 2.5));
          ry = Math.max(-5, Math.min(5, Math.round(ry / 2.5) * 2.5));
          o.cart.classList.add('tilting');
          o.cart.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
        } else if (o.cart.classList.contains('tilting')) {
          o.cart.classList.remove('tilting');
          o.cart.style.transform = '';
        }
      });

      gates.forEach(function (g) {
        var on = g.el === link;
        if (on && !g.press) {
          var r = g.el.getBoundingClientRect();
          var ox = Math.round(Math.max(-6, Math.min(6, (mx - (r.left + r.width / 2)) * 0.12)));
          var oy = Math.round(Math.max(-6, Math.min(6, (my - (r.top + r.height / 2)) * 0.12)));
          g.el.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
          if (g.label) { g.label.style.transform = 'translate(' + (-ox * 0.35) + 'px,' + (-oy * 0.35) + 'px)'; }
        } else if (!on && g.el.style.transform) {
          g.el.style.transform = '';
          if (g.label) { g.label.style.transform = ''; }
        }
      });
    } else {
      gates.forEach(function (g) {
        if (g.el.style.transform) {
          g.el.style.transform = '';
          if (g.label) { g.label.style.transform = ''; }
        }
      });
    }
  }

  function clearPointerStates() {
    hoverTarget = null;
    mPaused = false;
    cartList.forEach(function (c) { c.classList.remove('is-hover'); c.classList.remove('snap'); });
    artCarts.forEach(function (o) {
      o.cart.classList.remove('tilting');
      o.cart.style.transform = '';
    });
    gates.forEach(function (g) {
      g.el.classList.remove('is-hover');
      g.el.classList.remove('snap');
      g.el.style.transform = '';
      if (g.label) { g.label.style.transform = ''; }
    });
    soundBtn.classList.remove('is-hover');
    if (startBtn) { startBtn.classList.remove('is-hover'); prevStartHover = false; startState = 0; paintStart(); }
    if (coinBtn) { coinBtn.classList.remove('is-hover'); }
    if (useCursor) {
      cursor.classList.remove('is-hover');
      cursor.classList.remove('is-enter');
      cursorTag.classList.remove('show');
      paintCursor('idle');
    }
  }

  /* press wiring — inline magnet yields to the :active press */
  gates.forEach(function (g) {
    g.el.addEventListener('pointerdown', function () {
      g.press = true;
      g.el.style.transform = '';
      if (g.label) { g.label.style.transform = ''; }
    });
    g.el.addEventListener('pointerleave', function () { g.press = false; });
  });
  doc.addEventListener('pointerup', function () {
    var had = false;
    gates.forEach(function (g) { if (g.press) { g.press = false; had = true; } });
    if (had) { queueRefresh(); }
  }, { passive: true });
  doc.addEventListener('pointercancel', function () {
    gates.forEach(function (g) { g.press = false; });
  }, { passive: true });

  /* ── on-screen controls · START / coin / joystick ──── */
  if (startBtn) {
    startBtn.addEventListener('pointerdown', function () {
      startState = 2;
      paintStart();
    });
    var releaseStart = function () {
      startState = startBtn.classList.contains('is-hover') ? 1 : 0;
      paintStart();
    };
    startBtn.addEventListener('pointerup', releaseStart);
    startBtn.addEventListener('pointerleave', releaseStart);
    startBtn.addEventListener('click', function () {
      /* a kept coin is spent on the way in; without one, entry is
         still free — the cabinet just remembers who tipped it */
      var spent = credits > 0;
      if (spent) { credits -= 1; saveCredits(); paintCredit(); }
      if (world) {
        world.banner = {
          l1: 'WORLD 01',
          l2: spent ? 'GOOD LUCK!' : 'FREE PLAY!',
          until: performance.now() + 1600
        };
      }
      var w1 = $('.w01');
      if (w1 && w1.scrollIntoView) {
        w1.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  var coinReset = null;
  if (coinBtn) {
    coinBtn.addEventListener('click', function () {
      coinAnimT0 = performance.now();
      coinLed = true;
      paintCoin();
      credits = Math.min(99, credits + 1);
      saveCredits();
      setCoinCredit(true);
      clearTimeout(coinReset);
      coinReset = setTimeout(function () {
        setCoinCredit(false);
      }, 1900);
      /* the world answers the coin: the tube surges gold, the little
         people throw their arms up, the ship rolls, and one permanent
         gold star joins the sky — a receipt you can see from space */
      if (world) {
        world.flash = 900;
        world.cheerUntil = world.t + 2200;
        world.ship.flipUntil = world.t + 700;
        world.banner = { l1: 'THANK YOU', l2: 'PLAYER 1', until: performance.now() + 1700 };
        world.stars.push({
          x: Math.random() * world.cols,
          y: Math.floor(Math.random() * Math.max(8, Math.round(world.rows * 0.5))),
          l: 3, tw: Math.random() * 6.28, gold: true, red: false
        });
      }
      paintCredit();
      blip(988, 70);
      setTimeout(function () { blip(1319, 110); }, 90);
    });
  }

  if (joyBox) {
    joyBox.addEventListener('pointerdown', function (e) {
      var r = joyBox.getBoundingClientRect();
      var right = (e.clientX - r.left) > r.width / 2;
      joyTilt = right ? 3 : -3;
      joyPress = true;
      paintJoy();
      bankShip(right);
      blip(190, 110, 90);
      setTimeout(function () {
        joyPress = false;
        joyTilt = 0;
        paintJoy();
      }, 430);
    });
  }

  pbtnEls.forEach(function (b, idx) {
    b.addEventListener('pointerdown', function () {
      pbtnState[idx] = 2;
      paintPBtns();
      if (b.classList.contains('pbtn-red')) {
        fireShip(true);   /* FIRE actually fires */
      } else {
        hopShip();        /* JUMP hops the ship */
      }
      blip(740, 60);
      setTimeout(function () {
        pbtnState[idx] = 0;
        paintPBtns();
      }, 240);
    });
  });

  /* ── master animation loop ──────────────────────────── */
  var lastT = 0;
  var ledLast = 0;
  var bannerWas = false;
  var joyWigglePhase = 0, joyWiggleLast = 0;
  var JOY_WIGGLE = [0, 0, 1, 2, 1, 0, 0, -1, -2, -1, 0, 0, 0, 0, 0, 0];
  var coinRepaintLast = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    var dt = lastT ? Math.min(t - lastT, 64) : 16;
    lastT = t;
    if (doc.hidden) { return; }
    if (useCursor) {
      cxx += (mx - cxx) * 0.16;
      cyy += (my - cyy) * 0.16;
      cursor.style.transform = 'translate3d(' + cxx + 'px,' + cyy + 'px,0)';
      if (cursorTag.classList.contains('show')) {
        cursorTag.style.transform = 'translate3d(' + (cxx + 18) + 'px,' + (cyy + 22) + 'px,0)';
      }
    }
    if (marqueeOn && seqW > 0) {
      if (!mPaused) { mpos += dt * 0.058; }
      if (mpos >= seqW) { mpos -= seqW; }
      mtrack.style.transform = 'translate3d(-' + Math.round(mpos) + 'px,0,0)';
    }
    /* coin door: LED blink + drop animation */
    if (coinCv) {
      var needRepaint = false;
      if (t - ledLast > 620) {
        ledLast = t;
        coinLed = !coinLed;
        needRepaint = true;
      }
      if (coinAnimT0 >= 0) {
        needRepaint = true;
        if (t - coinRepaintLast > 60) { coinRepaintLast = t; }
      }
      if (needRepaint) { paintCoin(); }
    }
    /* joystick attract wiggle — stepped, never while pressed */
    if (joyCv && !joyPress && !reduced.matches) {
      if (t - joyWiggleLast > 260) {
        joyWiggleLast = t;
        joyWigglePhase = (joyWigglePhase + 1) % JOY_WIGGLE.length;
        var nt = JOY_WIGGLE[joyWigglePhase];
        if (nt !== joyTilt) {
          joyTilt = nt;
          paintJoy();
        }
      }
    }
    if (fieldOn && !reduced.matches && world && (heroVisible || bootActive)) {
      stepWorld(dt);
    }
    /* while a banner stamp is up, the attract copy yields the glass —
       the cabinet never talks over itself */
    var bannerOn = !!(world && world.banner && t < world.banner.until);
    if (bannerOn !== bannerWas) {
      bannerWas = bannerOn;
      html.classList.toggle('banner-on', bannerOn);
    }
    if (world && heroVisible && fx) { renderWorld(fx, 'hero', t); }
    if (world && bootActive && bfx) { renderWorld(bfx, 'boot', t); }
  }
  requestAnimationFrame(loop);

  /* ── konami console + modal ─────────────────────────── */
  var modal = $('#modal');
  var modalClose = $('#modalClose');
  var lastFocus = null;
  var KSEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var kpos = 0;

  function openModal() {
    lastFocus = doc.activeElement;
    modal.hidden = false;
    modalClose.focus();
    blip(880, 90, 440);
  }
  function closeModal() {
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  modalClose.addEventListener('click', closeModal);
  $('[data-close]').addEventListener('click', closeModal);

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) { closeModal(); return; }
    if (!modal.hidden && e.key === 'Tab') { e.preventDefault(); modalClose.focus(); return; }
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === KSEQ[kpos]) {
      kpos += 1;
      if (kpos === KSEQ.length) { kpos = 0; openModal(); }
    } else {
      kpos = (k === KSEQ[0]) ? 1 : 0;
    }
  });

  var taps = 0, tapReset = null;
  var footHint = $('#footHint');
  if (footHint) {
    footHint.addEventListener('pointerup', function () {
      taps += 1;
      clearTimeout(tapReset);
      tapReset = setTimeout(function () { taps = 0; }, 2500);
      if (taps >= 7) { taps = 0; openModal(); }
    });
  }

  /* ── ignition ───────────────────────────────────────── */
  /* controls paint immediately (no fonts needed); pixel text waits for
     Estedad so the quantized glyphs match the real metrics */
  buildControls();
  if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) {
    doc.fonts.ready.then(function () {
      pxifyAll();
      buildMarquee();
    });
    setTimeout(pxifyAll, 900);
  } else {
    pxifyAll();
  }
})();
