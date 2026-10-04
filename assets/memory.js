/* assets/memory.js · the memory cabinet
   ------------------------------------------------------------------
   The Konami line used to open a dialog box and hand out two coins.
   That was a polite nothing. This is what the code was actually for.

   It reboots the tube. A machine that does not exist wakes up: the
   degauss coil lets go with a shove you feel in your teeth, the
   picture blooms open out of a single bright line, and a 1989 arcade
   BIOS counts its own memory out loud — every 16K block a tick, the
   way the old ones did, because you learned to read a machine by how
   long it hesitated. Then the tube goes quiet, says four Persian
   lines to you, and puts a name plate on the glass.

   Three letters to ten, typed the way the old machines made you type
   them. When you lock it in, the cabinet keeps it: from then on the
   BIOS greets you by name before the picture has even finished
   loading, and your initials sit on the wall for whoever stands here
   next.

   Nothing here is a second art language. The 5x7 font, the 3x5 micro
   type, the Persian quantizer, the palette, the gold cup and the
   ordered-dither vignette are all borrowed from main.js through
   window.__fw_gfx — the same hand, painting the same glass. Keys are
   swallowed in the capture phase so the cabinet underneath never sees
   them. prefers-reduced-motion drops the flash, the ripple and the
   roll, and keeps every word. */

(function () {
  'use strict';

  var doc = document;
  var win = window;
  var html = doc.documentElement;
  var GFX = win.__fw_gfx;
  var SYN = win.__fw_synth;

  var host = doc.getElementById('memo');
  var cv = doc.getElementById('memoCv');
  var live = doc.getElementById('memoLive');
  var footHi = doc.getElementById('footHi');
  if (!host || !cv || !GFX || !SYN) { return; }

  var mqReduce = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var mqFine = win.matchMedia ? win.matchMedia('(hover: hover) and (pointer: fine)') : null;
  function still() { return !!(mqReduce && mqReduce.matches); }
  function keysWork() { return !!(mqFine && mqFine.matches); }

  var PC = GFX.pc;

  /* ── state ────────────────────────────────────────────── */
  var g = null;
  var G = 4, cols = 0, rows = 0;
  var sc = null, scg = null;        /* scratch: composed, not yet on the glass */
  var vig = null;                   /* pre-rendered ordered-dither vignette */
  var ghost = null, gg = null;      /* phosphor smear: the frame before this one */
  var on = false, phase = 'off', pt = 0, raf = 0, last = 0, downFrom = 'wall';
  var postT = 0, faCache = {}, beeped = -1, plan = null;
  var typed = '', wall = [], gave = '', known = '', prevFocus = null, hum = null;
  var keyCells = [], queued = false, runs = 0;

  /* ── copy ─────────────────────────────────────────────── */
  /* the POST block. kind: 0 silent, 1 a count tick, 2 the OK chirp.
     the four RAM lines are the elastic ones — on a short tube the plan
     thins them out rather than letting the block run off the glass. */
  var BIOS = [
    ['MMR-84 MEMORY BIOS 4.0', '', 0],
    ['(C) 1989 TEHRAN NOOR ELECTRONIC', '', 0],
    ['', '', 0],
    ['CPU 6809  AT 2.0 MHZ', 'OK', 2],
    ['MAIN RAM', '0000K', 1],
    ['MAIN RAM', '16384K', 1],
    ['MAIN RAM', '32768K', 1],
    ['MAIN RAM', '49152K', 1],
    ['MAIN RAM', '65536K OK', 2],
    ['WORK RAM', '0256K OK', 2],
    ['VIDEO RAM', '4096K OK', 2],
    ['SOUND  SN-76489', 'OK', 2],
    ['DIP  1P  2C  6C', 'NO COIN NO ENTRY', 0],
    ['ROM SUM DE8A4F', 'OK', 2],
    ['', '', 0],
    ['BOOTING MEMORY CABINET', '', 0]
  ];

  var VERSE = [
    'یک روز، همین‌جا ایستاده بودی.',
    'یک سکه داشتی. همین بس بود.',
    'و یک دکمه را یاد گرفتی.',
    'حالا نامت را می‌نویسی تا یادت نرود.'
  ];
  var WALL_FA = 'دیوارِ سالن';
  var PLATE_FA = 'با حروف کلید نامت را روی دیوار بگذار';
  var PAD_FA = 'با صفحه‌کلیدِ روی صفحه نامت را بنویس';
  var LOCK_HINT = 'ENTER LOCK   ·   ESC LEAVE';
  var GIFT_FA = 'کابینت، تو را به یاد می‌دارد';
  var NAME_FA = 'نامت ماند';
  var BLANK_FA = 'بی‌نام هم می‌ماند';

  var MAXNAME = 10;
  /* the machine is allowed to think for a moment — a POST screen that
     hurries is not a POST screen. every phase takes a keypress too, so
     an impatient hand is never trapped. T_BLOOM is short on purpose:
     the BIOS has to already be typing while the picture is still
     opening, or the best moment on the whole tube opens onto black. */
  var T_WAKE = 1150, T_BLOOM = 230, T_TYPE = 14, T_VERSE = 36, T_GIFT = 7600, T_DOWN = 950;

  /* the letter pad, for when there is no keyboard in front of the
     machine at all. four rows, ten wide, the last one short. */
  var PAD = [
    'ABCDEFGHIJ',
    'KLMNOPQRST',
    'UVWXYZ0123',
    '456789'
  ];
  var PAD_TAIL = ['BK', 'OK'];

  /* an original phrase for the sound chip: a falling minor idea on a
     square lead over a triangle bass. not a theme from anywhere —
     this is the melody the cabinet hums while it waits for a name. */
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(nm) {
    var m = /^([A-G])([#b]?)(-?\d+)$/.exec(nm);
    if (!m) { return 440; }
    var midi = parseInt(m[3], 10) * 12 + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  var LEAD = [
    ['D5', 0.00, 0.20], ['A5', 0.20, 0.20], ['F5', 0.40, 0.20], ['E5', 0.60, 0.42],
    ['D5', 1.02, 0.20], ['F5', 1.22, 0.20], ['A5', 1.42, 0.62], ['G5', 2.04, 0.20],
    ['F5', 2.24, 0.20], ['E5', 2.44, 0.20], ['D5', 2.64, 0.84],
    ['C5', 3.48, 0.20], ['D5', 3.68, 0.20], ['F5', 3.88, 0.20], ['E5', 4.08, 0.42],
    ['D5', 4.50, 1.10]
  ];
  var BASS = [
    ['D3', 0.00], ['D3', 0.62], ['A2', 1.02], ['A2', 1.64], ['A#2', 2.04], ['A#2', 2.66],
    ['A2', 3.48], ['F2', 4.08], ['D3', 4.50]
  ];
  function playPhrase(at) {
    if (!SYN.on()) { return; }
    var i;
    for (i = 0; i < LEAD.length; i++) {
      SYN.tone({ f: hz(LEAD[i][0]), d: LEAD[i][2], v: 0.042, at: at + LEAD[i][1] });
    }
    for (i = 0; i < BASS.length; i++) {
      SYN.tone({ f: hz(BASS[i][0]), d: 0.5, v: 0.03, type: 'triangle', at: at + BASS[i][1] });
    }
  }

  /* ── the mains hum: 50Hz and its third harmonic, the two sounds a
     switched-on tube never stops making ── */
  function humOn() {
    var A = SYN.ctx(), M = SYN.master();
    if (!A || !M || hum || !SYN.on()) { return; }
    var o1 = A.createOscillator(), o2 = A.createOscillator();
    var gn = A.createGain(), lp = A.createBiquadFilter();
    o1.type = 'sine'; o1.frequency.value = 50;
    o2.type = 'sine'; o2.frequency.value = 150;
    lp.type = 'lowpass'; lp.frequency.value = 420;
    gn.gain.setValueAtTime(0.0001, A.currentTime);
    gn.gain.linearRampToValueAtTime(0.02, A.currentTime + 1.1);
    o1.connect(lp); o2.connect(lp); lp.connect(gn); gn.connect(M);
    o1.start(); o2.start();
    hum = { o1: o1, o2: o2, gn: gn };
  }
  function humOff() {
    var A = SYN.ctx(), h = hum;
    hum = null;
    if (!h || !A) { return; }
    try {
      h.gn.gain.cancelScheduledValues(A.currentTime);
      h.gn.gain.setValueAtTime(Math.max(0.0001, h.gn.gain.value), A.currentTime);
      h.gn.gain.linearRampToValueAtTime(0.0001, A.currentTime + 0.35);
      h.o1.stop(A.currentTime + 0.4);
      h.o2.stop(A.currentTime + 0.4);
    } catch (e) { /* the tube was already off */ }
  }

  /* ── little helpers ───────────────────────────────────── */
  var FA_DIG = '۰۱۲۳۴۵۶۷۸۹';
  function fa(n) {
    return String(n).replace(/[0-9]/g, function (d) { return FA_DIG[+d]; });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  /* Every glyph goes to the scratch, never to the glass: present()
     blits the scratch over the visible canvas, so anything drawn
     straight to `g` is wiped a frame later.

     And every string is linted once against the 5x7 font before it is
     drawn. drawText advances six pixels for a glyph it cannot find and
     draws nothing, so a lowercase sentence or a persian digit renders
     as a hole in the layout — silently, and only visible if you look
     at the screen. One warning per string is worth the six lines. */
  var linted = {};
  function txt(s, x, y, col, k) {
    if (!linted[s]) {
      linted[s] = 1;
      var miss = '', i;
      for (i = 0; i < s.length; i++) {
        if (s.charAt(i) !== ' ' && !GFX.font[s.charAt(i)]) { miss += s.charAt(i); }
      }
      if (miss && win.console && win.console.warn) {
        win.console.warn('[memory] the 5x7 font has no glyph for "' + miss + '" — "' +
          s + '" will come out with holes in it. upper-case it, or send it through faCv().');
      }
    }
    GFX.drawText(scg, s, Math.round(x), Math.round(y), col, k || 1);
  }
  function tw(s, k) { return GFX.textW(s, k || 1); }
  function ctr(s, y, col, k) { txt(s, (cols - tw(s, k)) / 2, y, col, k); }
  function ctrR(s, y, col, k) { txt(s, cols - 6 - tw(s, k), y, col, k); }
  function say(msg) { if (live) { live.textContent = msg; } }
  function blink(ms) { return Math.floor(performance.now() / (ms || 380)) % 2 === 0; }

  function sget(k) { try { return win.localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { win.localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function jget(k, d) {
    try {
      var v = JSON.parse(sget(k));
      return v === null || v === undefined ? d : v;
    } catch (e) { return d; }
  }
  /* the Jalali year, to the day. only the year is ever shown, so the
     Nowruz boundary is all this needs to get right: the Solar Hijri
     year runs 621 behind the Gregorian one, stepping forward on
     Nowruz. 2026 is 1405, and it is 1404 until the 21st of March. */
  function jalaliYear(d) {
    var y = d.getFullYear(), m = d.getMonth() + 1;
    return y - 621 - ((m < 3 || (m === 3 && d.getDate() < 21)) ? 1 : 0);
  }

  /* ── persian pixel type: rasterized through the site's own
     quantizer, once per string per size, then cached ── */
  function faCv(str, src, color) {
    var key = str + '|' + src + '|' + color;
    var c = faCache[key];
    if (!c) {
      c = GFX.pxText(str, { src: src, weight: 800, color: color, maxW: cols - 6, centerLines: true });
      faCache[key] = c;
    }
    return c;
  }
  /* the largest size that still lands on a single row, so a reveal can
     be a typewriter and never a wipe */
  function fitSrc(str, want, color) {
    for (var i = 0; i < 4; i++) {
      var s = want - i;
      if (s < 7) { break; }
      var c = faCv(str, s, color);
      if (c.height <= Math.round(s * 1.6)) { return s; }
    }
    return 7;
  }
  /* the 5x7 font is latin-only — it has no persian digits, and
     drawText skips what it cannot find, so a fa() number inside a
     drawText string comes out as a hole in the sentence. persian
     numerals therefore always go through faCv/pxText, never through
     txt(). anything drawn with txt() keeps ascii digits. */
  function faMid(c, y) { return Math.round((cols - c.width) / 2); }
  /* a persian numeral, right-aligned to `xr`, baseline-ish aligned
     to a 5x7 row at `y` */
  function faNum(xr, y, n, src, color) {
    var c = faCv(fa(n), src || 8, color || PC.slate);
    scg.drawImage(c, Math.round(xr - c.width), y);
    return c.height;
  }

  /* ── the tube itself ──────────────────────────────────── */
  function layout() {
    var w = win.innerWidth, h = win.innerHeight;
    var gw = w < 560 ? 2 : (w < 1024 ? 3 : 4);
    var gh = h < 860 ? 2 : (h < 960 ? 3 : 4);
    G = Math.max(2, Math.min(gw, gh));
    cols = Math.max(72, Math.ceil(w / G));
    rows = Math.max(56, Math.ceil(h / G));
    cv.width = cols; cv.height = rows;
    if (!g) { g = cv.getContext('2d'); }
    if (!sc) { sc = doc.createElement('canvas'); }
    sc.width = cols; sc.height = rows;
    scg = sc.getContext('2d');
    if (!ghost) { ghost = doc.createElement('canvas'); }
    ghost.width = cols; ghost.height = rows;
    gg = ghost.getContext('2d');
    faCache = {};
    buildVig();
    plan = planBios();
  }
  /* corner dither at ~0.92 density fading to nothing by the inner
     third — the same measure main.js uses, so the two tubes match */
  function buildVig() {
    var c = doc.createElement('canvas');
    c.width = cols; c.height = rows;
    var v = c.getContext('2d');
    var img = v.createImageData(cols, rows), d = img.data;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var nx = (x / cols - 0.5) * 2, ny = (y / rows - 0.5) * 2;
        var dd = Math.sqrt(nx * nx * 1.1 + ny * ny * 1.25);
        var k = (dd - 1.14) / 0.52;
        if (k > 0 && GFX.bayer(x, y) < k * 0.92) {
          var i = (y * cols + x) * 4;
          d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255;
        }
      }
    }
    v.putImageData(img, 0, 0);
    vig = c;
  }

  /* ── phase plumbing ───────────────────────────────────── */
  function setPhase(p) {
    /* switching off folds up whatever was on the glass. remember what
       that was, or the collapse animates an empty screen — a real
       tube collapses the picture it was actually showing. */
    if (p === 'down') { downFrom = phase; }
    phase = p;
    pt = 0;
    last = 0;
    if (p === 'post') { say('در حال روشن شدن کابینت.'); }
    else if (p === 'verse') { say('یک روز، همین‌جا ایستاده بودی. یک سکه داشتی. همین بس بود.'); }
    else if (p === 'wall') { say('نامت را روی دیوار سالن بنویس. با کلید Enter تأیید کن.'); }
    else if (p === 'gift') { say(gave ? 'نامت ماند. کابینت، تو را به یاد می‌دارد.' : 'بی‌نام هم می‌ماند.'); }
  }

  /* the POST plan is built once per layout, not once per frame — it
     used to re-slice sixteen arrays sixty times a second */
  function planBios() {
    var lh = rows < 250 ? 8 : 9;
    var lines = BIOS.slice();
    /* the memory ladder is the elastic part. drop its middle steps,
       highest index first so the ones still queued stay valid, and
       keep 0000K and the final OK: those two are worth keeping. */
    var soft = [], i;
    for (i = 0; i < lines.length; i++) { if (lines[i][2] === 1) { soft.push(i); } }
    soft.shift();
    soft.pop();
    while (soft.length && 3 + lines.length * lh > rows - 46) {
      lines.splice(soft.pop(), 1);
    }
    var chars = 0;
    for (i = 0; i < lines.length; i++) {
      lines[i] = lines[i].slice();
      chars += lines[i][0].length + lines[i][1].length + 1;
    }
    return { lh: lh, lines: lines, chars: chars, bottom: 3 + lines.length * lh };
  }

  /* ── the POST screen ──────────────────────────────────── */
  function drawPost() {
    var n = Math.min(plan.chars, Math.floor(postT / T_TYPE));
    var left = n, fin = 0, acc = 0, i, ln, take, y;

    for (i = 0; i < plan.lines.length; i++) {
      acc += plan.lines[i][0].length + plan.lines[i][1].length + 1;
      if (n >= acc) { fin = i + 1; }
    }
    for (i = 0; i < plan.lines.length; i++) {
      ln = plan.lines[i];
      take = clamp(left, 0, ln[0].length + ln[1].length);
      if (take > 0) {
        y = 3 + i * plan.lh;
        var boot = ln[0].indexOf('BOOTING') === 0;
        txt(ln[0].slice(0, Math.min(ln[0].length, take)), 3, y, boot ? PC.gold : PC.post);
        var st = ln[1].slice(0, Math.min(ln[1].length, take - ln[0].length));
        if (st) { ctrR(st, y, ln[2] === 2 ? PC.ok : PC.goldLo); }
      }
      left -= ln[0].length + ln[1].length + 1;
      if (left < 0) { break; }
    }
    /* one tick per finished line: the machine counting itself out */
    if (fin !== beeped) {
      beeped = fin;
      ln = plan.lines[fin - 1];
      if (ln && ln[0]) {
        if (ln[2] === 2) { win.__fw_sfx('memoOk'); }
        else if (ln[2] === 1) { win.__fw_sfx('memoTick'); }
      }
    }
    /* the ROM bar — sixteen cells, filling in step with the text. it
       waits for the first character: an empty outlined bar floating in
       a black tube reads as a loading bar for nothing */
    if (n > 0 && plan.bottom + 12 < rows) {
      var bx = 3, by = plan.bottom + 6, cells = 16;
      var cw = Math.max(3, Math.min(5, Math.floor((cols - 8) / cells)));
      scg.fillStyle = PC.panelBd;
      scg.fillRect(bx - 1, by - 1, cells * cw + 2, 7);
      scg.fillStyle = PC.ink;
      scg.fillRect(bx, by, cells * cw, 5);
      var fill = Math.round(clamp(n / plan.chars, 0, 1) * cells);
      for (i = 0; i < fill; i++) {
        scg.fillStyle = i % 2 === 0 ? PC.gold : PC.goldLo;
        scg.fillRect(bx + i * cw + 1, by + 1, cw - 2, 3);
      }
    }
    /* and then the marquee, and the only word that matters. it hangs
       under the POST block rather than off the bottom of the glass,
       so a short tube loses the blank lines before it loses the name */
    if (n >= plan.chars) {
      var mq = plan.bottom + Math.max(8, Math.round(rows * 0.08));
      if (mq + 30 < rows) {
        var k = cols >= 300 ? 2 : 1;
        ctr('MEMORY CABINET', mq, PC.gold, k);
        var fs = fitSrc('کابینتِ خاطره', cols >= 300 ? 11 : 9, PC.gold);
        var fc = faCv('کابینتِ خاطره', fs, PC.gold);
        scg.drawImage(fc, faMid(fc), mq + k * 7 + 3);
        var ps = mq + k * 7 + 3 + fc.height + 6;
        if (blink(450) && ps + 7 <= rows) { ctr('PRESS ANY KEY', ps, PC.press); }
        /* and if you have been here before, the tube says so. it kept
           your name; it kept the count too. */
        if (known && ps + 16 <= rows) {
          ctr('WELCOME BACK, ' + known, ps + 9, PC.goldLo);
        }
      }
    }
  }

  /* ── four lines, said quietly ─────────────────────────── */
  function drawVerse() {
    var src = fitSrc(VERSE[3], cols >= 300 ? 10 : 9, PC.gold);
    /* persian wants air: at 1.5 the ascenders of one line sit on the
       descenders of the next */
    var lh = Math.round(src * 1.6) + 9;
    var n = Math.floor(pt / T_VERSE);
    var total = 0, i;
    for (i = 0; i < VERSE.length; i++) { total += VERSE[i].length + 2; }
    var left = n;
    /* centred as a block, a little above the middle: the eye lands on
       it before the prompt at the bottom */
    var blockH = VERSE.length * lh;
    var y0 = Math.round(rows * 0.44 - blockH / 2);
    var y = y0;
    for (i = 0; i < VERSE.length; i++) {
      var s = VERSE[i];
      var take = clamp(left, 0, s.length);
      if (take > 0) {
        var c = faCv(s, src, i === VERSE.length - 1 ? PC.gold : '#e9e9f2');
        var cx = faMid(c);
        scg.drawImage(c, cx, y);
        /* the caret stands just left of the last letter and blinks:
           the tube is still typing */
        if (take < s.length || blink(380)) {
          scg.fillStyle = PC.goldHi;
          scg.fillRect(clamp(cx + c.width - Math.round(take / s.length * c.width) - 4, 2, cols - 5), y, 3, c.height);
        }
      }
      y += lh;
      left -= s.length + 2;
      if (left < 0) { break; }
    }
    if (n > total) {
      /* the rule belongs to the verse, not to the foot of the tube —
         parked at a fixed fraction it left a void between them */
      var rule = Math.min(rows - 26, y0 + blockH + Math.round(rows * 0.06));
      scg.fillStyle = PC.panelBd;
      scg.fillRect(Math.round(cols * 0.2), rule, Math.round(cols * 0.6), 1);
      if (blink(500)) { ctr('PRESS ANY KEY', rule + 7, PC.press); }
    }
  }

  /* ── panels ───────────────────────────────────────────── */
  /* notch() draws the notched plate every screen on this cabinet is
     built from. it is not called frame(): frame() is the loop below,
     and two functions by one name in one scope is a bug waiting for
     a slow afternoon. */
  function notch(x, y, w, h) {
    scg.fillStyle = PC.panelBd;
    scg.fillRect(x + 2, y, w - 4, h);
    scg.fillRect(x, y + 2, w, h - 4);
    scg.fillRect(x + 1, y + 1, w - 2, h - 2);
    scg.fillStyle = PC.panel;
    scg.fillRect(x + 2, y + 2, w - 4, h - 4);
    scg.fillRect(x + 1, y + 3, w - 2, h - 6);
    scg.fillRect(x + 3, y + 1, w - 6, h - 2);
    scg.fillStyle = PC.panelHi;
    for (var gx = x + 3; gx < x + w - 3; gx += 3) { scg.fillRect(gx, y + 2, 1, 1); }
  }
  function plate(x, y, w, h) {
    notch(x, y, w, h);
    scg.fillStyle = PC.goldLo;
    scg.fillRect(x + 1, y + h - 1, w - 2, 1);
  }

  /* ── the wall ─────────────────────────────────────────── */
  function drawWall() {
    var i;
    var hs = cols >= 300 ? 2 : 1;
    var listW = Math.min(cols - 10, 132);
    var lx = Math.round((cols - listW) / 2);
    /* the list is as tall as it needs to be: an empty wall with six
       empty rows reserved looks like a bug, not like headroom */
    var nRows = clamp(wall.length || 1, 1, 6);
    var pad = keysWork() ? null : { cw: clamp(Math.floor((cols - 2) / 10) - 2, 8, 13), gap: 2, rows: 4 };
    var wsrc = fitSrc(WALL_FA, cols >= 300 ? 10 : 8, PC.goldLo);
    var wc = faCv(WALL_FA, wsrc, PC.goldLo);
    var hf = keysWork() ? PLATE_FA : PAD_FA;
    var hs2 = fitSrc(hf, cols >= 300 ? 9 : 7, PC.cueFa);
    var hc = faCv(hf, hs2, PC.cueFa);
    var padH = pad ? 4 * (pad.cw - 2) + 3 * pad.gap + 6 : 0;

    /* lay the whole plate out first, then start it where it looks like
       it belongs: centred, not pinned under the top edge with half the
       tube left empty underneath */
    var headH = hs * 7 + 4 + wc.height + 6;
    /* 12 for the header row, 1 for the rule, 4 to clear it, 9 a name:
       the panel has to be tall enough to hold the names it promises */
    var listH = 17 + nRows * 9;
    var plateGap = 8, plateH = 15;
    var hintH = 12 + hc.height + (keysWork() ? 11 : 0) + 5;
    var total = headH + listH + plateGap + plateH + hintH + padH;
    var y = Math.max(6, Math.round((rows - total) / 2));

    ctr('THE WALL', y, PC.gold, hs);
    y += hs * 7 + 4;
    scg.drawImage(wc, faMid(wc), y);
    y += wc.height + 6;

    notch(lx, y, listW, listH);
    txt('NO', lx + 5, y + 3, PC.slateHi);
    txt('PILOT', lx + 24, y + 3, PC.slateHi);
    txt('YEAR', lx + listW - 5 - tw('YEAR'), y + 3, PC.slateHi);
    scg.fillStyle = PC.panelBd;
    scg.fillRect(lx + 3, y + 11, listW - 6, 1);

    if (!wall.length) {
      txt('NO PILOTS YET', (cols - tw('NO PILOTS YET')) / 2, y + 16, PC.slate);
    }
    for (i = 0; i < Math.min(nRows, wall.length); i++) {
      var e = wall[i];
      var ry = y + 16 + i * 9;
      var fresh = e.n === gave;
      var ink = fresh ? (blink(330) ? PC.gold : PC.goldLo) : PC.text;
      txt(pad2(i + 1), lx + 5, ry, PC.slateHi);
      txt(e.n, lx + 24, ry, ink);
      faNum(lx + listW - 5, ry - 1, e.y, 8, fresh ? PC.gold : PC.slate);
      /* the reigning name keeps the same gold cup the BEST PILOTS
         board hands out — one cabinet, one trophy */
      if (i === 0 && GFX.sprites.trophy) {
        GFX.spr(scg, GFX.sprites.trophy, lx + 24 + tw(e.n) + 4, ry - 1,
          GFX.legends.trophy, false, 1);
      }
    }

    /* the plate: your name, one letter at a time */
    var pw = Math.min(cols - 10, 116), px = Math.round((cols - pw) / 2);
    var py = y + listH + plateGap;
    plate(px, py, pw, plateH);
    var show = typed.slice(0, Math.max(3, Math.floor((pw - 10) / 6)));
    for (i = 0; i < show.length; i++) {
      txt(show.charAt(i), px + 5 + i * 6, py + 4, PC.gold);
    }
    if (blink(380) && typed.length < MAXNAME) {
      scg.fillStyle = PC.goldHi;
      scg.fillRect(px + 5 + show.length * 6, py + 4, 5, 7);
    }

    y = py + plateH + 4;
    /* ascii digits on purpose — see faNum */
    ctr('TYPE YOUR NAME  ·  ' + MAXNAME + ' CHARS MAX', y, PC.cueFa);
    y += 12;
    scg.drawImage(hc, faMid(hc), y);
    if (keysWork()) {
      ctr(LOCK_HINT, y + hc.height + 4, PC.slate);
    } else {
      drawPad(y + hc.height + 5);
    }
  }

  /* the letter pad — only drawn when there is no real keyboard in
     front of the machine, which on a phone means there is not */
  function drawPad(y) {
    var gap = 2;
    var cw = clamp(Math.floor((cols - 2) / 10) - gap, 8, 13), ch = 11;
    var px = Math.round((cols - (10 * (cw + gap) - gap)) / 2);
    var rowsPad = PAD.concat([PAD_TAIL]);
    keyCells = [];
    for (var r = 0; r < rowsPad.length; r++) {
      var keys = rowsPad[r];
      for (var c = 0; c < keys.length; c++) {
        var kx = px + c * (cw + gap), ky = y + r * (ch + gap);
        if (kx < 0 || kx + cw > cols) { continue; }
        var lab = keys[c];
        keyCells.push({ x: kx, y: ky, w: cw, h: ch, k: lab });
        scg.fillStyle = PC.panelBd;
        scg.fillRect(kx, ky, cw, ch);
        scg.fillStyle = PC.panel;
        scg.fillRect(kx + 1, ky + 1, cw - 2, ch - 2);
        scg.fillStyle = PC.panelHi;
        scg.fillRect(kx + 1, ky + 1, cw - 2, 1);
        if (lab.length === 1) {
          txt(lab, kx + Math.round((cw - 5) / 2), ky + 2, PC.text);
        } else {
          GFX.drawMText(scg, lab, kx + Math.round((cw - (lab.length * 4 - 1)) / 2), ky + 3,
            lab === 'OK' ? PC.gold : PC.text, 1);
        }
      }
    }
  }

  /* ── the gift ─────────────────────────────────────────── */
  /* every string handed to txt()/ctr() must be UPPERCASE: the 5x7 font
     holds A-Z and nothing else, and drawText skips a glyph it cannot
     find while still advancing six pixels for it. a lowercase sentence
     therefore renders as nothing at all, silently — the worst kind of
     bug this file can have, and the reason the year went through the
     persian rasterizer while the numerals could not. */
  function drawGift() {
    var i;
    var big = gave || '- - -';
    var small = [gave ? 'FREE PLAY  10:00' : 'AN EMPTY CHAIR', 'CREDIT  03'];
    var headH = (cols >= 300 ? 2 : 1) * 7 + 8;
    var nameFc = faCv(gave ? NAME_FA : BLANK_FA, fitSrc(gave ? NAME_FA : BLANK_FA, cols >= 300 ? 10 : 8, PC.goldLo), PC.goldLo);
    var yc = faCv('بازیکن ۱ · ' + fa(jalaliYear(new Date())), 8, PC.textSub);
    var cueFc = faCv(GIFT_FA, fitSrc(GIFT_FA, cols >= 300 ? 9 : 7, PC.cueFa), PC.cueFa);
    var cups = !!(gave && GFX.sprites.trophy);
    /* the card is measured from the pieces, then laid out with a
       running cursor — nothing is placed by a hand-typed offset, so
       nothing can land on top of anything else */
    var nameH = 14, gap = 6;
    var cardH = 8 + nameH + gap + yc.height + gap + small.length * 9 + 8;
    var note = gave ? 'THE CABINET WILL REMEMBER YOU' : 'THE WALL KEEPS A CHAIR FOR YOU';
    /* PRESS ANY KEY is pinned to the foot of the tube, so it is not
       part of the block being centred */
    var total = headH + nameFc.height + 10 + cardH + 10 + 7 + 10 + cueFc.height;
    var y = Math.max(8, Math.round((rows - total) / 2));

    ctr(gave ? 'NAME ACCEPTED' : 'NO NAME? ALLOWED', y, PC.gold, cols >= 300 ? 2 : 1);
    y += headH;
    scg.drawImage(nameFc, faMid(nameFc), y);
    y += nameFc.height + 10;

    var bw = Math.min(cols - 8, 132), bx = Math.round((cols - bw) / 2);
    notch(bx, y, bw, cardH);
    txt(big, bx + Math.round((bw - tw(big, 2)) / 2), y + 8, PC.gold, 2);
    /* the cups flank the name, and only when the name leaves them room */
    if (cups && bw >= 118 && tw(big, 2) <= bw - 56) {
      GFX.spr(scg, GFX.sprites.trophy, bx + 5, y + 6, GFX.legends.trophy, false, 2);
      GFX.spr(scg, GFX.sprites.trophy, bx + bw - 23, y + 6, GFX.legends.trophy, true, 2);
    }
    var cy = y + 8 + nameH + gap;
    scg.drawImage(yc, bx + Math.round((bw - yc.width) / 2), cy);
    cy += yc.height + gap;
    for (i = 0; i < small.length; i++) {
      txt(small[i], bx + Math.round((bw - tw(small[i])) / 2), cy, PC.textSub);
      cy += 9;
    }

    y += cardH + 10;
    ctr(note, y, PC.cueFa);
    y += 7 + 10;
    scg.drawImage(cueFc, faMid(cueFc), y);
    if (blink(500)) { ctr('PRESS ANY KEY', rows - 20, PC.press); }
  }

  /* ── compose ──────────────────────────────────────────── */
  function compose() {
    scg.imageSmoothingEnabled = false;
    scg.globalAlpha = 1;
    scg.fillStyle = PC.attractBg;
    scg.fillRect(0, 0, cols, rows);
    /* during the power-down, keep drawing the screen we came from */
    var p = phase === 'down' ? downFrom : phase;
    if (p === 'wake' || p === 'post') {
      drawPost();
    } else if (p === 'verse') {
      drawVerse();
    } else if (p === 'wall') {
      drawWall();
    } else if (p === 'gift') {
      drawGift();
    }
    scg.drawImage(vig, 0, 0);
  }

  /* ── the glass: bloom, ripple, smear ──────────────────── */
  function present(t) {
    var open = 1, ripple = 0, flash = 0, smear = 0;
    if (phase === 'wake') {
      var k = clamp(pt / T_WAKE, 0, 1);
      open = k < 0.07 ? 0.004 : Math.pow(clamp((k - 0.07) / 0.48, 0, 1), 0.55);
      ripple = still() ? 0 : Math.max(0, 1 - k / 0.7);
      flash = still() ? 0 : Math.max(0, 0.85 - k * 6);
      smear = 0.4;
    } else if (phase === 'down') {
      var k2 = clamp(pt / T_DOWN, 0, 1);
      open = Math.pow(1 - k2, 1.9);
      ripple = still() ? 0 : Math.max(0, 1 - k2 * 1.4);
      flash = still() ? 0 : (k2 < 0.09 ? 0.5 : 0);
      smear = 0.4;
    }
    /* the phosphor smear is for MOVING pictures only. held still on a
       hard 5x7 glyph, a decayed copy of the last frame is not
       persistence, it is a double exposure — every letter grows a
       second, fainter self and the whole screen reads as a bad
       tracking adjustment. the site already has scanlines, an
       aperture grille and a rolling band for the static look. */

    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1;
    g.fillStyle = '#000000';
    g.fillRect(0, 0, cols, rows);

    /* the frame before this one, half faded. on a phosphor tube the
       picture does not vanish, it decays — this is the whole reason a
       CRT looks alive and a screenshot never will. */
    if (smear > 0 && pt > 0) {
      g.globalAlpha = smear;
      g.drawImage(ghost, 0, 0);
      g.globalAlpha = 1;
    }

    if (open >= 0.999) {
      g.drawImage(sc, 0, 0);
    } else {
      /* the picture blooms open out of one bright line: rows scale
         about the middle, integer, no half-pixel anywhere */
      var cy = Math.round(rows * 0.5);
      for (var y = 0; y < rows; y++) {
        var sy = cy + Math.round((y - cy) / open);
        if (sy < 0 || sy >= rows) { continue; }
        var xo = ripple > 0 ? Math.round(Math.sin(sy * 0.55 + t * 0.02) * ripple * 3.4) : 0;
        g.drawImage(sc, 0, sy, cols, 1, xo, y, cols, 1);
      }
      if (open < 0.5) {
        g.fillStyle = PC.star3;
        g.fillRect(0, Math.max(0, cy - Math.round(cy * open)), cols, 1);
        g.fillRect(0, Math.min(rows - 1, cy + Math.round((rows - cy) * open)), cols, 1);
      }
    }

    if (flash > 0) {
      g.globalAlpha = flash;
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, cols, rows);
      g.globalAlpha = 1;
    }

    /* keep the smear buffer exactly one frame behind */
    gg.globalAlpha = 1;
    gg.clearRect(0, 0, cols, rows);
    gg.drawImage(cv, 0, 0);
  }

  /* ── the loop ─────────────────────────────────────────── */
  function frame(t) {
    if (!on) { return; }
    raf = win.requestAnimationFrame(frame);
    var dt = last ? Math.min(64, Math.max(0, t - last)) : 16;
    last = t;
    pt += dt;
    /* postT is its own clock: the BIOS starts talking once the tube has
       finished blooming open, and it never rewinds when the wake hands
       over to the POST screen — the text does not stutter backwards */
    if (phase === 'wake') {
      if (pt > T_BLOOM) { postT += dt; }
      if (pt >= T_WAKE) { setPhase('post'); }
    } else if (phase === 'post') {
      postT += dt;
      if (postT > plan.chars * T_TYPE + 900) { setPhase('verse'); }
    } else if (phase === 'verse') {
      var total = 0;
      for (var i = 0; i < VERSE.length; i++) { total += VERSE[i].length + 2; }
      if (pt > total * T_VERSE + 1800) { setPhase('wall'); }
    } else if (phase === 'gift') {
      if (pt > T_GIFT) { setPhase('down'); }
    } else if (phase === 'down') {
      if (pt > T_DOWN) { leave(); return; }
    }
    compose();
    present(t);
  }

  /* ── input ────────────────────────────────────────────── */
  function norm(ch) {
    if (!ch) { return ''; }
    if (ch >= 'a' && ch <= 'z') { return ch.toUpperCase(); }
    if ((ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) { return ch; }
    return '';
  }
  function push(ch) {
    if (!ch || typed.length >= MAXNAME) { return; }
    typed += ch;
    win.__fw_sfx('memoKey');
  }
  function back() {
    if (!typed.length) { return; }
    typed = typed.slice(0, -1);
    win.__fw_sfx('memoKey');
  }
  function lockName() {
    var nm = typed.replace(/[^A-Z0-9]/g, '');
    if (!nm) { return false; }
    gave = nm;
    wall.unshift({ n: nm, y: jalaliYear(new Date()) });
    if (wall.length > 24) { wall.length = 24; }
    sset('fw-memo-name', nm);
    sset('fw-memo-wall', JSON.stringify(wall));
    if (win.__fw_memoGift) { win.__fw_memoGift(nm, runs); }
    paintFootHi(nm);
    playPhrase(0.05);
    setTimeout(function () { win.__fw_sfx('hiScore'); }, 260);
    setPhase('gift');
    return true;
  }
  function leaveName() {
    gave = '';
    if (win.__fw_memoGift) { win.__fw_memoGift('', runs); }
    setPhase('down');
  }

  function onKey(e) {
    if (!on) { return; }
    /* swallow everything: the cabinet underneath must never see a key
       while the memory tube owns the glass */
    e.preventDefault();
    e.stopPropagation();
    if (phase === 'down') { return; }
    /* escape walks backwards down the sequence: it skips the machine
       thinking, then it lets you walk away from the plate. it never
       throws you out of the tube from the first blink — if you meant
       to leave, you press it twice. */
    if (e.key === 'Escape') {
      if (phase === 'gift') { setPhase('down'); }
      else if (phase === 'wall') { leaveName(); }
      else { setPhase('wall'); }
      return;
    }
    if (e.key !== 'Enter') {
      if (phase === 'wall') {
        if (e.key === 'Backspace') { back(); }
        else if (e.key.length === 1) { push(norm(e.key)); }
      } else if (phase === 'post' || phase === 'verse') {
        /* impatient hands are welcome: any key turns the page */
        setPhase(phase === 'post' ? 'verse' : 'wall');
      }
      return;
    }
    if (phase === 'wake') { setPhase('post'); }
    else if (phase === 'post') { setPhase('verse'); }
    else if (phase === 'verse') { setPhase('wall'); }
    else if (phase === 'wall') { if (typed.length) { lockName(); } }
    else if (phase === 'gift') { if (pt > 600) { setPhase('down'); } }
  }
  function onPad(e) {
    if (!on || phase !== 'wall' || keysWork()) { return; }
    var r = host.getBoundingClientRect();
    var mx = (e.clientX - r.left) / r.width * cols;
    var my = (e.clientY - r.top) / r.height * rows;
    for (var i = 0; i < keyCells.length; i++) {
      var c = keyCells[i];
      if (mx >= c.x && mx < c.x + c.w && my >= c.y && my < c.y + c.h) {
        if (c.k === 'BK') { back(); }
        else if (c.k === 'OK') { if (typed.length) { lockName(); } }
        else { push(c.k); }
        return;
      }
    }
  }
  function onWheel(e) { if (on) { e.preventDefault(); } }

  /* ── the foot of the page learns your name ────────────── */
  function paintFootHi(nm) {
    if (!footHi) { return; }
    if (!nm) { footHi.hidden = true; return; }
    footHi.hidden = false;
    footHi.textContent = 'THE TUBE REMEMBERS  ' + nm;
  }

  /* ── enter / leave ────────────────────────────────────── */
  function enter() {
    if (on) { return true; }
    layout();
    on = true;
    prevFocus = doc.activeElement;
    host.hidden = false;
    html.classList.add('memo-on');
    if (win.__fw_memoHold) { win.__fw_memoHold(true); }
    if (host.focus) { host.focus(); }

    runs = (jget('fw-memo-runs', 0) | 0) + 1;
    sset('fw-memo-runs', String(runs));
    wall = jget('fw-memo-wall', []);
    if (!wall || !wall.length) { wall = []; }
    known = (sget('fw-memo-name') || '').slice(0, MAXNAME);
    typed = '';
    gave = '';
    postT = 0;
    setPhase('wake');
    humOn();
    if (!still()) { win.__fw_sfx('memoDegauss'); }
    playPhrase(0.6);
    raf = win.requestAnimationFrame(frame);
    return true;
  }

  function leave() {
    if (!on) { return; }
    on = false;
    win.cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    humOff();
    host.hidden = true;
    html.classList.remove('memo-on');
    if (win.__fw_memoHold) { win.__fw_memoHold(false); }
    if (prevFocus && prevFocus.focus) { prevFocus.focus(); }
    prevFocus = null;
    faCache = {};
    keyCells = [];
    if (live) { live.textContent = ''; }
  }

  /* Estedad lands late; persian cannot be rasterized before it is
     measured, so the tube waits a beat rather than painting a
     fallback and then reflowing under the visitor's eyes */
  function fontsThen(fn) {
    if (!doc.fonts || !doc.fonts.load) { fn(); return; }
    var done = false;
    function go() { if (!done) { done = true; fn(); } }
    try { doc.fonts.load('800 12px Estedad').then(go, go); } catch (e) { go(); }
    setTimeout(go, 1500);
  }

  win.addEventListener('keydown', onKey, true);
  host.addEventListener('pointerdown', onPad);
  host.addEventListener('wheel', onWheel, { passive: false });
  host.addEventListener('touchmove', function (e) { if (on) { e.preventDefault(); } }, { passive: false });

  var rz = 0;
  win.addEventListener('resize', function () {
    if (!on) { return; }
    clearTimeout(rz);
    rz = setTimeout(layout, 180);
  });

  win.__fw_memo = {
    enter: function () {
      if (queued) { return true; }
      queued = true;
      fontsThen(function () { queued = false; enter(); });
      return true;
    },
    leave: leave,
    isOn: function () { return on; },
    /* which screen the tube is on right now. the only way to drive this
       from a test: the phase clock advances on clamped frame deltas, so
       it does not track wall time and nothing can be sampled from
       outside reliably. freeze the rAF chain against these instead. */
    phase: function () { return phase; },
    elapsed: function () { return pt; },
    postT: function () { return postT; },
    chars: function () { return plan ? plan.chars : -1; },
    grid: function () { return cols + 'x' + rows; }
  };

  paintFootHi(sget('fw-memo-name') || '');
})();
