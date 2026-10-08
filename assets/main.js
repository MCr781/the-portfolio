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
      refreshThumbColumns();
      queueRefresh();
    }, 180);
  }, { passive: true });

  /* ── THE SOUND CHIP · a loving SN-76489 spirit ──────── */
  /* Three tone voices and a swept-noise channel on one master bus —
     the architecture of the old boards. Every effect is a small
     score of micro-notes scheduled on the audio clock (never on the
     frame clock), so chains stay sample-accurate even mid-firefight.
     Square leads with hard envelopes, a triangle for warmth, noise
     through a falling lowpass for bursts. Opt-in, always. */
  var soundOn = store('fw-sound') !== '0';
  var actx = null;
  var master = null;

  var audioBuffers = {};
  var bossMusicSource = null;
  var bossGain = null;

  function b64ToBuf(b64) {
    var bin = window.atob(b64);
    var len = bin.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) { bytes[i] = bin.charCodeAt(i); }
    return bytes.buffer;
  }

  function loadAudioSample(key, url, cb) {
    if (audioBuffers[key]) { if (cb) cb(); return; }
    if (!actx) { ensureCtx(); }
    if (!actx) { return; }
    if (window.__AUDIO_DATA && window.__AUDIO_DATA[key]) {
      try {
        var buf = b64ToBuf(window.__AUDIO_DATA[key]);
        actx.decodeAudioData(buf, function (decoded) {
          audioBuffers[key] = decoded;
          if (cb) cb();
        }, function () {});
        return;
      } catch (e) {}
    }
    try {
      fetch(url)
        .then(function (res) { return res.arrayBuffer(); })
        .then(function (buf) { return actx.decodeAudioData(buf); })
        .then(function (decoded) {
          audioBuffers[key] = decoded;
          if (cb) cb();
        })
        .catch(function () {});
    } catch (e) {}
  }

  function preloadSamples() {
    if (!actx) { return; }
    loadAudioSample('mario', 'assets/audio/smb_theme_cameo.mp3');
    loadAudioSample('powerup', 'assets/audio/smb_powerup.mp3');
    loadAudioSample('coin', 'assets/audio/smb_coin.mp3');
    loadAudioSample('boss', 'assets/audio/ost_boss.mp3');
    loadAudioSample('boom', 'assets/audio/arcade_explosion.mp3');
  }

  function playSample(key, vol, loop, rate) {
    if (!soundOn) { return null; }
    if (!actx) { ensureCtx(); }
    if (!actx) { return null; }
    if (actx.state === 'suspended') {
      try { actx.resume(); } catch (e) {}
    }
    if (!audioBuffers[key]) {
      var sampleUrl = 'assets/audio/' + (key === 'mario' ? 'smb_theme_cameo.mp3' : (key === 'powerup' ? 'smb_powerup.mp3' : (key === 'coin' ? 'smb_coin.mp3' : (key === 'boom' ? 'arcade_explosion.mp3' : 'ost_boss.mp3'))));
      loadAudioSample(key, sampleUrl);
      return null;
    }
    try {
      var src = actx.createBufferSource();
      src.buffer = audioBuffers[key];
      src.loop = !!loop;
      if (rate) { src.playbackRate.value = rate; }
      var g = actx.createGain();
      g.gain.value = (vol == null ? 1 : vol);
      src.connect(g);
      g.connect(master);
      src.start(actx.currentTime);
      return { src: src, gain: g };
    } catch (e) { return null; }
  }

  function startBossMusic() {
    if (!soundOn || bossMusicSource) { return; }
    if (!actx) { ensureCtx(); }
    if (!actx) { return; }
    if (actx.state === 'suspended') {
      try { actx.resume(); } catch (e) {}
    }
    if (!audioBuffers['boss']) {
      loadAudioSample('boss', 'assets/audio/ost_boss.mp3', function () {
        if (!bossMusicSource && soundOn && world && world.mother && world.mother.state !== 'dying') {
          startBossMusic();
        }
      });
      return;
    }
    try {
      bossMusicSource = actx.createBufferSource();
      bossMusicSource.buffer = audioBuffers['boss'];
      bossMusicSource.loop = true;
      bossGain = actx.createGain();
      bossGain.gain.setValueAtTime(0.001, actx.currentTime);
      bossGain.gain.linearRampToValueAtTime(0.14, actx.currentTime + 0.4);
      bossMusicSource.connect(bossGain);
      bossGain.connect(master);
      bossMusicSource.start(actx.currentTime);
    } catch (e) { bossMusicSource = null; bossGain = null; }
  }

  function stopBossMusic(fadeMs) {
    if (!bossMusicSource) { return; }
    try {
      if (bossGain && actx && fadeMs) {
        bossGain.gain.linearRampToValueAtTime(0.001, actx.currentTime + (fadeMs / 1000));
        var bsrc = bossMusicSource;
        setTimeout(function () {
          try { bsrc.stop(); } catch (e) {}
        }, fadeMs);
      } else {
        bossMusicSource.stop();
      }
    } catch (e) {}
    bossMusicSource = null;
    bossGain = null;
  }

  function ensureCtx() {
    if (!actx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          actx = new AC();
          master = actx.createGain();
          master.gain.value = 0.5;
          var comp = actx.createDynamicsCompressor();   /* squares never bite */
          comp.threshold.value = -16; comp.knee.value = 22; comp.ratio.value = 5;
          master.connect(comp);
          comp.connect(actx.destination);
          preloadSamples();
        }
      } catch (e) { actx = null; }
    }
    if (actx && actx.state === 'suspended') {
      try { actx.resume(); preloadSamples(); } catch (e) {}
    }
  }

  /* Delicate 2-note retro arcade bubble explosion (50ms) */
  function playArcadeExplosion(vol, pitchScale) {
    if (!soundOn || !actx) { return; }
    if (actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
    var p = pitchScale || (0.98 + Math.random() * 0.08);
    var v = (vol == null ? 0.15 : vol);
    if (playSample('boom', v, false, p)) {
      return;
    }
    /* Fallback 2-note short retro arcade explosion bubble pop: Note 1 (1320Hz -> 1180Hz) + Note 2 (880Hz -> 580Hz) */
    tone({ f: 1320 * p, f1: 1180 * p, d: 0.016, v: v * 0.65, type: 'sine' });
    tone({ f: 880 * p, f1: 580 * p, d: 0.035, v: v * 0.75, at: 0.015, type: 'sine', exp: true });
    tone({ f: 880 * p, f1: 580 * p, d: 0.030, v: v * 0.15, at: 0.015, type: 'triangle', exp: true });
  }

  /* the legacy voice — kept for the small ui ticks */
  function blip(freq, dur, sweepTo) {
    tone({ f: freq, f1: sweepTo, d: dur / 1000, v: 0.055, exp: true });
  }

  /* one scheduled micro-note on the chip */
  function tone(o) {
    if (!soundOn) { return; }
    if (!actx) { ensureCtx(); }
    if (!actx) { return; }
    if (actx.state === 'suspended') {
      try { actx.resume(); } catch (e) {}
    }
    var t0 = actx.currentTime + (o.at || 0);
    var d = Math.max(0.01, o.d || 0.1);
    var osc = actx.createOscillator();
    var g = actx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(Math.max(20, o.f), t0);
    if (o.f1) {
      if (o.exp) { osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + d); }
      else { osc.frequency.linearRampToValueAtTime(Math.max(20, o.f1), t0 + d); }
    }
    var v = o.v || 0.06;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (o.a || 0.004));
    if (o.sustain) {
      g.gain.linearRampToValueAtTime(v * 0.45, t0 + o.sustain);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    osc.connect(g);
    if (o.lp) {
      var f = actx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.lp;
      g.connect(f); f.connect(master);
    } else {
      g.connect(master);
    }
    osc.start(t0);
    osc.stop(t0 + d + 0.03);
  }

  /* one scheduled slice of white noise through a swept filter */
  function noiseHit(o) {
    if (!soundOn) { return; }
    if (!actx) { ensureCtx(); }
    if (!actx) { return; }
    if (actx.state === 'suspended') {
      try { actx.resume(); } catch (e) {}
    }
    var t0 = actx.currentTime + (o.at || 0);
    var d = Math.max(0.03, o.d || 0.2);
    var buf = actx.createBuffer(1, Math.ceil(actx.sampleRate * d), actx.sampleRate);
    var ch = buf.getChannelData(0);
    for (var i = 0; i < ch.length; i++) { ch[i] = Math.random() * 2 - 1; }
    var src = actx.createBufferSource();
    src.buffer = buf;
    var f = actx.createBiquadFilter();
    f.type = o.hp ? 'highpass' : 'lowpass';
    f.frequency.setValueAtTime(o.f || 2400, t0);
    if (o.f1) { f.frequency.exponentialRampToValueAtTime(Math.max(40, o.f1), t0 + d); }
    f.Q.value = o.q || 0.8;
    var g = actx.createGain();
    var v = o.v || 0.09;
    g.gain.setValueAtTime(o.a ? 0.0001 : v, t0);
    if (o.a) { g.gain.linearRampToValueAtTime(v, t0 + o.a); }
    if (o.sustain) {
      g.gain.linearRampToValueAtTime(v * 0.45, t0 + o.sustain);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
    src.stop(t0 + d + 0.02);
  }

  /* ── the score book · every event gets its own little piece ── */
  var SFX = {
    coin: function () {
      noiseHit({ f: 4800, hp: true, d: 0.04, v: 0.04 });
      if (!playSample('coin', 0.32)) {
        tone({ f: 988, d: 0.085, v: 0.075 });
        tone({ f: 1319, d: 0.42, v: 0.075, at: 0.083 });
        tone({ f: 2637, d: 0.34, v: 0.02, at: 0.09, type: 'triangle' });
      }
    },
    fire: function () {
      tone({ f: 960, f1: 130, d: 0.085, v: 0.05, exp: true });
      noiseHit({ f: 4200, hp: true, d: 0.035, v: 0.028 });
    },
    laser: function () {
      /* the gift: a cleaner, meaner lance — saw plus its fifth */
      tone({ f: 1480, f1: 240, d: 0.1, v: 0.045, type: 'sawtooth', exp: true });
      tone({ f: 2220, f1: 360, d: 0.09, v: 0.02, type: 'sawtooth', exp: true });
      noiseHit({ f: 5200, hp: true, d: 0.05, v: 0.03 });
    },
    boomS: function () {
      /* Crisp 2-note retro bubble explosion for mutants */
      playArcadeExplosion(0.14, 1.10 + Math.random() * 0.06);
    },
    boomL: function () {
      /* Cascading delicate bubble pops for ship destruction */
      playArcadeExplosion(0.22, 0.95);
      setTimeout(function () { playArcadeExplosion(0.17, 1.10); }, 35);
      setTimeout(function () { playArcadeExplosion(0.13, 1.25); }, 70);
      noiseHit({ f: 900, f1: 80, d: 0.22, v: 0.04, at: 0.03 });
    },
    boomLander: function () {
      /* Delicate 2-note retro arcade bubble explosion (50ms) */
      playArcadeExplosion(0.15, 0.98 + Math.random() * 0.08);
    },
    bombDrop: function () {
      /* Releasing of bombs is silent per user request to avoid overwhelming repetitive whistling */
    },
    blastPenetrator: function () {
      tone({ f: 110, f1: 32, d: 0.28, v: 0.08, type: 'sine', exp: true });
      noiseHit({ f: 450, f1: 80, d: 0.32, v: 0.09 });
    },
    blastHeavy: function () {
      noiseHit({ f: 2200, f1: 350, d: 0.25, v: 0.09 });
      tone({ f: 180, f1: 42, d: 0.20, v: 0.07, type: 'triangle', exp: true });
      noiseHit({ f: 800, f1: 120, d: 0.30, v: 0.07, at: 0.05 });
    },
    blastIncendiary: function () {
      noiseHit({ f: 3600, f1: 800, d: 0.26, v: 0.07 });
      tone({ f: 220, f1: 330, d: 0.24, v: 0.045, type: 'sawtooth' });
    },
    humanScream: function () {
      tone({ f: 880, f1: 180, d: 0.22, v: 0.05, type: 'square', exp: true });
      tone({ f: 440, f1: 220, d: 0.18, v: 0.035, type: 'sawtooth', at: 0.04 });
    },
    humanFall: function () {
      tone({ f: 1600, f1: 600, d: 0.35, v: 0.03, type: 'sine', exp: true });
    },
    chainTick: function () {
      /* Silent: streaks award score multipliers without irritating escalating pitch */
    },
    thruster: function () {
      noiseHit({ f: 380, f1: 140, d: 0.06, v: 0.025 });
    },
    bossRam: function () {
      tone({ f: 90, f1: 40, d: 0.35, v: 0.09, type: 'sawtooth', exp: true });
      noiseHit({ f: 1800, f1: 220, d: 0.4, v: 0.12 });
    },
    switchOff: function () {
      blip(180, 35, 60);
      noiseHit({ f: 600, f1: 140, d: 0.03, v: 0.03 });
    },
    startClick: function () {
      tone({ f: 1100, f1: 220, d: 0.035, v: 0.05, type: 'square', exp: true });
    },
    cartSnap: function () {
      tone({ f: 820, d: 0.035, v: 0.04, type: 'square' });
      noiseHit({ f: 2800, hp: true, d: 0.025, v: 0.03 });
    },
    cartFlip: function () {
      tone({ f: 480, f1: 960, d: 0.08, v: 0.045, type: 'triangle' });
      noiseHit({ f: 2800, hp: true, d: 0.035, v: 0.03 });
    },
    exploreSlide: function () {
      tone({ f: 440, f1: 220, d: 0.35, v: 0.045, type: 'triangle', exp: true });
      tone({ f: 880, f1: 440, d: 0.28, v: 0.025, type: 'sine', exp: true, at: 0.05 });
      noiseHit({ f: 1400, f1: 200, d: 0.3, v: 0.035 });
    },
    shutterClose: function () {
      tone({ f: 440, f1: 220, d: 0.05, v: 0.04, exp: true });
      noiseHit({ f: 1200, f1: 400, d: 0.04, v: 0.03 });
    },
    /* ── terrarium creature voices ── */
    sekkehWake: function () {
      tone({ f: 1318.5, f1: 1975.5, d: 0.07, v: 0.035, type: 'sine' });
    },
    sekkehFlip: function () {
      tone({ f: 2400, f1: 3600, d: 0.11, v: 0.035, type: 'triangle' });
      tone({ f: 4800, d: 0.06, v: 0.015, at: 0.05 });
    },
    sekkehMelt: function () {
      tone({ f: 330, f1: 440, d: 0.25, v: 0.03, type: 'sine' });
      tone({ f: 220, f1: 165, d: 0.3, v: 0.025, type: 'triangle', at: 0.1 });
    },
    sekkehDeposit: function () {
      tone({ f: 1760, d: 0.05, v: 0.035 });
      tone({ f: 2637, d: 0.08, v: 0.025, at: 0.04 });
    },
    almasPrism: function () {
      var notes = [1318.5, 1567.98, 1975.5, 2637];
      for (var pi = 0; pi < notes.length; pi++) {
        tone({ f: notes[pi], d: 0.09, v: 0.025, type: 'sine', at: pi * 0.04 });
      }
    },
    almasSpin: function () {
      var bells = [1046.5, 1318.5, 1567.98, 2093];
      for (var bi = 0; bi < bells.length; bi++) {
        tone({ f: bells[bi], d: 0.12, v: 0.025, type: 'triangle', at: bi * 0.07 });
      }
    },
    almasPearl: function () {
      tone({ f: 2093, f1: 3136, d: 0.08, v: 0.03, type: 'sine' });
    },
    almasCrown: function () {
      tone({ f: 1567.98, d: 0.08, v: 0.03, type: 'sine' });
      tone({ f: 2093, d: 0.15, v: 0.03, at: 0.06 });
    },
    naghshDraft: function () {
      noiseHit({ f: 3200, hp: true, d: 0.03, v: 0.025 });
      tone({ f: 440, d: 0.025, v: 0.02, at: 0.02 });
    },
    naghshStamp: function () {
      tone({ f: 120, f1: 45, d: 0.15, v: 0.06, type: 'triangle', exp: true });
      noiseHit({ f: 600, f1: 120, d: 0.12, v: 0.05 });
    },
    naghshSubmit: function () {
      tone({ f: 554, f1: 880, d: 0.1, v: 0.03, type: 'triangle' });
    },
    naghshPlumb: function () {
      tone({ f: 660, d: 0.04, v: 0.025, type: 'sine' });
    },
    yasBloom: function () {
      tone({ f: 523.25, f1: 783.99, d: 0.22, v: 0.035, type: 'triangle' });
      tone({ f: 1046.5, d: 0.18, v: 0.02, type: 'sine', at: 0.08 });
    },
    yasWater: function () {
      noiseHit({ f: 1800, f1: 3200, hp: true, d: 0.25, v: 0.03 });
    },
    yasPetal: function () {
      tone({ f: 783.99, f1: 1046.5, d: 0.12, v: 0.03, type: 'triangle' });
    },
    yasBask: function () {
      tone({ f: 880, d: 0.25, v: 0.025, type: 'sine' });
      tone({ f: 1318.5, d: 0.25, v: 0.02, type: 'sine', at: 0.12 });
    },
    catchChirp: function () {
      tone({ f: 920, f1: 1560, d: 0.09, v: 0.05 });
    },
    beamProbe: function () {
      tone({ f: 660, f1: 520, d: 0.08, v: 0.04 });
    },
    beamReach: function () {
      tone({ f: 196, f1: 349, d: 0.42, v: 0.045, type: 'triangle' });
      tone({ f: 99, f1: 176, d: 0.42, v: 0.03, type: 'sine', at: 0.02 });
    },
    liftCreak: function () {
      tone({ f: 140, f1: 88, d: 0.24, v: 0.045 });
      tone({ f: 70, d: 0.2, v: 0.03, type: 'triangle', at: 0.05 });
    },
    mutCharge: function () {
      /* the wrongness begins: two detuned squares climb together */
      tone({ f: 150, f1: 420, d: 0.45, v: 0.045 });
      tone({ f: 155, f1: 435, d: 0.45, v: 0.04 });
      tone({ f: 75, f1: 210, d: 0.45, v: 0.035, type: 'triangle' });
    },
    mutDissolve: function () {
      noiseHit({ f: 1200, f1: 5200, hp: true, d: 0.32, v: 0.055 });
      tone({ f: 1150, f1: 260, d: 0.32, v: 0.042, exp: true });
    },
    mutReform: function () {
      tone({ f: 260, f1: 1240, d: 0.3, v: 0.048 });
      noiseHit({ f: 5200, f1: 900, d: 0.22, v: 0.05 });
    },
    mutBurst: function () {
      /* the stolen soul screams its new name */
      tone({ f: 830, f1: 175, d: 0.32, v: 0.065, type: 'sawtooth', exp: true });
      tone({ f: 842, f1: 168, d: 0.32, v: 0.05, type: 'sawtooth', exp: true });
      noiseHit({ f: 2600, f1: 240, d: 0.24, v: 0.1, at: 0.01 });
      tone({ f: 60, f1: 38, d: 0.2, v: 0.05, type: 'sine', exp: true, at: 0.02 });
    },
    toss: function () {
      /* the underhand boing */
      tone({ f: 210, f1: 540, d: 0.1, v: 0.05 });
      tone({ f: 540, f1: 310, d: 0.13, v: 0.045, at: 0.095 });
    },
    powerup: function () {
      if (!playSample('powerup', 0.32)) {
        var run = [523.25, 659.26, 783.99, 1046.5, 1318.5, 1567.98, 2093, 2637, 3135.96];
        for (var i = 0; i < run.length; i++) {
          tone({ f: run[i], d: i === run.length - 1 ? 0.26 : 0.052, v: 0.055, at: i * 0.048 });
          tone({ f: run[i] / 2, d: 0.05, v: 0.02, type: 'triangle', at: i * 0.048 });
        }
      }
    },
    oneUp: function () {
      var seq = [659.26, 783.99, 1318.5, 1046.5, 1174.66, 1567.98];
      for (var i = 0; i < seq.length; i++) { tone({ f: seq[i], d: 0.11, v: 0.055, at: i * 0.088 }); }
    },
    mario: function () {
      /* authentic 1985 Super Mario Bros overworld theme */
      if (!playSample('mario', 0.30)) {
        var lead = [
          [659.26, 0.00, 0.10], [659.26, 0.15, 0.10], [659.26, 0.36, 0.10],
          [523.25, 0.51, 0.10], [659.26, 0.66, 0.10], [783.99, 0.96, 0.20],
          [392.00, 1.41, 0.20],
          [523.25, 1.86, 0.22], [392.00, 2.16, 0.14], [329.63, 2.46, 0.22],
          [440.00, 2.76, 0.14], [493.88, 3.06, 0.14], [466.16, 3.36, 0.10],
          [440.00, 3.51, 0.14], [392.00, 3.81, 0.18], [659.26, 4.05, 0.18],
          [783.99, 4.29, 0.18], [880.00, 4.53, 0.18], [698.46, 4.83, 0.14],
          [783.99, 5.04, 0.14], [659.26, 5.34, 0.18], [523.25, 5.58, 0.14],
          [587.33, 5.76, 0.14], [493.88, 5.94, 0.20]
        ];
        var bass = [
          [130.81, 0.00], [130.81, 0.30], [130.81, 0.60], [98.00, 0.90],
          [130.81, 1.41], [98.00, 1.65],
          [130.81, 1.86], [98.00, 2.16], [164.81, 2.46], [220.00, 2.76],
          [246.94, 3.06], [233.08, 3.36], [220.00, 3.51], [196.00, 3.81]
        ];
        for (var sq = 0; sq < lead.length; sq++) {
          tone({ f: lead[sq][0], d: lead[sq][2], v: 0.06, at: lead[sq][1] });
        }
        for (var tr = 0; tr < bass.length; tr++) {
          tone({ f: bass[tr][0], d: 0.14, v: 0.038, type: 'triangle', at: bass[tr][1] });
        }
      }
    },
    rescue: function () {
      tone({ f: 1046.5, f1: 1568, d: 0.12, v: 0.05 });
      tone({ f: 2093, d: 0.1, v: 0.025, type: 'triangle', at: 0.11 });
    },
    ready: function () {
      tone({ f: 440, f1: 554, d: 0.08, v: 0.022, type: 'triangle' });
    },
    portal: function () {
      tone({ f: 90, f1: 720, d: 0.85, v: 0.055, type: 'sine' });
      tone({ f: 720, f1: 90, d: 0.85, v: 0.03, type: 'triangle', at: 0.05 });
      noiseHit({ f: 420, f1: 4200, d: 0.8, v: 0.04 });
    },
    /* ── the memory cabinet · the Konami tube's own voices ── */
    memoKey: function () {
      /* a key on an old keyboard: two tones an octave apart, so short
         it reads as a clack rather than a note */
      tone({ f: 1180, d: 0.024, v: 0.05 });
      tone({ f: 2360, d: 0.014, v: 0.014, at: 0.004 });
      noiseHit({ f: 2800, d: 0.018, v: 0.024, hp: true });
    },
    memoTick: function () {
      /* the BIOS talking to itself while it counts its memory */
      tone({ f: 880, d: 0.03, v: 0.03 });
    },
    memoOk: function () {
      tone({ f: 1318.5, d: 0.07, v: 0.04 });
      tone({ f: 1975.5, d: 0.05, v: 0.014, type: 'triangle', at: 0.03 });
    },
    memoDegauss: function () {
      /* the coil letting go: a low shove, a mains sag, and the buzz */
      noiseHit({ f: 340, f1: 55, d: 0.6, v: 0.13 });
      tone({ f: 62, f1: 41, d: 0.55, v: 0.07, type: 'sine', exp: true });
      tone({ f: 124, f1: 82, d: 0.44, v: 0.018, type: 'triangle', at: 0.02 });
    },
    gameover: function () {
      /* the walk-down every continue taught us to dread */
      var seq = [[329.63, 0], [261.63, 0.2], [220, 0.4], [174.61, 0.62]];
      for (var i = 0; i < seq.length; i++) {
        tone({ f: seq[i][0], d: 0.19, v: 0.055, at: seq[i][1] });
        tone({ f: seq[i][0] / 2, d: 0.19, v: 0.028, type: 'triangle', at: seq[i][1] });
      }
      tone({ f: 87.31, f1: 43.65, d: 0.6, v: 0.06, type: 'sine', exp: true, at: 0.86 });
      noiseHit({ f: 1200, f1: 120, d: 0.4, v: 0.05, at: 0.86 });
    },
    mother: function () {
      tone({ f: 65, f1: 50, d: 0.62, v: 0.09, type: 'sine' });
      tone({ f: 52, f1: 39, d: 0.72, v: 0.07, type: 'sine', at: 0.24 });
      noiseHit({ f: 220, f1: 80, d: 0.7, v: 0.05, at: 0.1 });
    },
    motherHit: function () {
      tone({ f: 1900, d: 0.045, v: 0.05 });
      tone({ f: 640, f1: 190, d: 0.09, v: 0.05, exp: true });
      noiseHit({ f: 2600, hp: true, d: 0.07, v: 0.055 });
    },
    motherDown: function () {
      stopBossMusic();
      SFX.boomL();
      SFX.oneUp();
      noiseHit({ f: 1600, f1: 100, d: 0.9, v: 0.09, at: 0.12 });
    },
    bossAlarm: function () {
      tone({ f: 440, d: 0.11, v: 0.07, type: 'sawtooth' });
      tone({ f: 330, d: 0.11, v: 0.07, type: 'sawtooth', at: 0.13 });
      tone({ f: 440, d: 0.11, v: 0.07, type: 'sawtooth', at: 0.26 });
    },
    bossTurret: function () {
      tone({ f: 880, f1: 240, d: 0.075, v: 0.045, exp: true });
    },
    bossLaser: function () {
      tone({ f: 110, f1: 55, d: 0.65, v: 0.08, type: 'sawtooth' });
      noiseHit({ f: 900, f1: 140, d: 0.55, v: 0.065, at: 0.08 });
    },
    bossShieldBreak: function () {
      tone({ f: 1400, f1: 280, d: 0.35, v: 0.08, exp: true });
      noiseHit({ f: 3000, hp: true, d: 0.45, v: 0.075 });
    },
    hiScore: function () {
      tone({ f: 783.99, d: 0.12, v: 0.055 });
      tone({ f: 987.77, d: 0.12, v: 0.055, at: 0.13 });
      tone({ f: 1318.5, d: 0.26, v: 0.055, at: 0.27 });
      tone({ f: 1567.98, d: 0.2, v: 0.03, type: 'triangle', at: 0.4 });
    },
    perfect: function () {
      /* the sector clears and every soul still stands: a small gold
         fanfare, the kind a cabinet plays when it likes you */
      var seq = [[523.25, 0], [659.26, 0.09], [783.99, 0.18], [1046.5, 0.30]];
      for (var i = 0; i < seq.length; i++) {
        tone({ f: seq[i][0], d: 0.16, v: 0.055, at: seq[i][1] });
      }
      tone({ f: 1567.98, d: 0.32, v: 0.045, at: 0.42 });
      tone({ f: 783.99, d: 0.32, v: 0.025, type: 'triangle', at: 0.42 });
    },
    rankup: function () {
      /* the ladder rung snaps in: two rising runs, the second a
         fourth above the first — the cabinet promoting you out loud */
      var a = [523.25, 659.26, 783.99];
      for (var i = 0; i < a.length; i++) {
        tone({ f: a[i], d: 0.09, v: 0.055, at: i * 0.075 });
        tone({ f: a[i] / 2, d: 0.08, v: 0.025, type: 'triangle', at: i * 0.075 });
      }
      var b = [1046.5, 1318.5, 1567.98];
      for (var j = 0; j < b.length; j++) {
        tone({ f: b[j], d: j === b.length - 1 ? 0.3 : 0.09, v: 0.055, at: 0.26 + j * 0.075 });
        tone({ f: b[j] / 2, d: 0.09, v: 0.025, type: 'triangle', at: 0.26 + j * 0.075 });
      }
    },
    defstar: function () {
      /* the chair nobody sits in twice: the DEFENDER ascension —
         two rising runs climb to a summit chord that hangs in the
         air while the star burst scatters across the glass. Where
         rankup is a rung snapping in, this is the whole ladder
         singing at once. */
      var l1 = [392, 523.25, 659.26, 783.99];
      for (var i = 0; i < l1.length; i++) {
        tone({ f: l1[i], d: 0.085, v: 0.05, at: i * 0.07 });
        tone({ f: l1[i] / 2, d: 0.08, v: 0.022, type: 'triangle', at: i * 0.07 });
      }
      var l2 = [783.99, 1046.5, 1318.5];
      for (var j = 0; j < l2.length; j++) {
        tone({ f: l2[j], d: 0.085, v: 0.055, at: 0.30 + j * 0.07 });
      }
      tone({ f: 1567.98, d: 0.55, v: 0.055, at: 0.53 });
      tone({ f: 1046.5, d: 0.55, v: 0.035, type: 'triangle', at: 0.53 });
      tone({ f: 2093, d: 0.42, v: 0.026, at: 0.62 });
      tone({ f: 523.25, d: 0.62, v: 0.03, type: 'triangle', at: 0.53 });
    },
    rare: function () {
      /* a keeper's secret: two quick glitter runs, up, then higher */
      var up = [783.99, 987.77, 1174.66, 1567.98];
      for (var i = 0; i < up.length; i++) { tone({ f: up[i], d: 0.07, v: 0.05, at: i * 0.062 }); }
      for (var j = 0; j < up.length; j++) {
        tone({ f: up[j] * 1.335, d: 0.07, v: 0.035, at: 0.30 + j * 0.055, type: 'triangle' });
      }
    }
  };
  function sfx(name, arg) { if (SFX[name]) { SFX[name](arg); } }
  window.__fw_sfx = function (name, arg) { sfx(name, arg); };
  window.__fw_audioBuffers = function () { return audioBuffers; };

  /* ── the keepers' voices ── every resident answers the hand in
     their own timbre: the ingot warm and low, the ruby a crystal
     ping, the robot a two-step square, the jasmine a soft hush */
  var KEEPER_VOICE = {
    ingot: function () {
      tone({ f: 196, f1: 294, d: 0.09, v: 0.055 });
      tone({ f: 392, d: 0.06, v: 0.02, type: 'triangle', at: 0.05 });
    },
    gem: function () {
      tone({ f: 1318.5, f1: 1975.5, d: 0.1, v: 0.04, type: 'sine' });
      tone({ f: 2637, d: 0.07, v: 0.014, type: 'triangle', at: 0.03 });
    },
    bolt: function () {
      tone({ f: 440, d: 0.045, v: 0.05 });
      tone({ f: 554, d: 0.05, v: 0.05, at: 0.05 });
    },
    bloom: function () {
      tone({ f: 523.25, f1: 783.99, d: 0.12, v: 0.042, type: 'triangle' });
    }
  };
  function keeperVoice(kind) {
    if (KEEPER_VOICE[kind]) { KEEPER_VOICE[kind](); }
    else { blip(660, 70, 1180); }
  }

  var soundBtn = $('#soundBtn');
  var soundLabel = $('#soundLabel');
  function paintSound() {
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    soundLabel.textContent = soundOn ? 'صدا: روشن' : 'صدا: خاموش';
    /* the deck rocker is the same state, wearing hardware: keep the
       two faces in agreement whichever one the hand flips */
    if (typeof sndDeckBtn !== 'undefined' && sndDeckBtn) {
      sndDeckBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      sndDeckBtn.setAttribute('aria-label', soundOn ? 'خاموش کردن صدای دستگاه' : 'روشن کردن صدای دستگاه');
      paintSndDeck();
    }
  }
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    store('fw-sound', soundOn ? '1' : '0');
    if (soundOn) { ensureCtx(); blip(660, 60); }
    else { sfx('switchOff'); stopBossMusic(); }
    paintSound();
  });
  paintSound();

  function unlockAudio() {
    if (soundOn) { ensureCtx(); }
  }
  ['keydown', 'pointerdown', 'mousedown', 'touchstart', 'click'].forEach(function (ev) {
    window.addEventListener(ev, unlockAudio, { passive: true });
  });
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
  var COIN_ART_K = 1; /* coin-door art ceiling; set by calcGrids   */
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
    /* The coin door is CHROME, not a control, and it was being sized like
       a control — raw grid multiples. At PXG 4 that is a 104x108px object
       in the corner of a 1080p monitor, and because the row owns a band
       wherever it cannot share the foot's line, it was taking 112px out of
       the play field: the stick's base ended up level with the coin slot.

       So it gets a ceiling,        and the ceiling is the band it has to live in.
       A phone gives it 60px (it owns the strip's row outright). On the
       desktop it SHARES the foot's line, whose band is the foot's own
       44px — a door taller than that pokes up past the foot's top edge and
       into the control deck above it, which is exactly what an overlay at
       PXG 4 did when the art was unscaled. At PXG 2 the art is 54px and
       the phone cap does not bind, so handsets are untouched.

       The SOUND rocker shares that factor: it is the same chrome in the
       same row, and left on the raw grid it was 68px tall at PXG 4 — the
       row is as tall as its tallest child, so capping only the coin left
       the row 68px anyway and it still poked into the deck. */
    COIN_ART_K = Math.min(1, (w <= 860 ? 60 : 40) / (27 * PXG));
    /* Two things css cannot work out on its own, published here because
       this is already the one place that runs on load, on resize and on
       the scrolled-away refresh — and both were wrong before.

       --hero-deck-max: the deck's controls are canvas art sized to the
       game grid and then scaled by --hero-ctl, so their PAINTED size is
       (game px * PXG * scale). PXG steps 2 -> 3 -> 4 with the viewport,
       which means a flat 1.45 turned a 174px stick on a 1280x900 tube
       into a 232px one at 1920x1000 — the deck had quietly become
       PYGANTIC exactly where the screen was widest. A media query cannot
       see PXG (it depends on width AND height), so the ceiling is
       computed here instead: 4.35 / PXG pins the stick at 174px, the
       size that reads correctly, at every grid step. */
    html.style.setProperty('--hero-deck-max', (4.35 / PXG).toFixed(4));

    /* --hud-h: the strip is position:fixed at EVERY width and the hero's
       bottom band, the coin door and the foot are all anchored against
       this number. It was a hand-written 42px from when the strip was a
       thin text bar; it is really ~61px (44px min-height switch + 3px
       border + .45rem padding either side), so every desktop width
       under-reserved by ~19px and the foot row rode under the strip.
       A hardcoded number goes stale the moment the strip's contents
       change, and this one already had. Measure it instead — one rect
       read per rebuild, never per frame. */
    var hudEl = doc.querySelector('.hud');
    if (hudEl) {
      var hh = Math.round(hudEl.getBoundingClientRect().height);
      if (hh > 0) { html.style.setProperty('--hud-h', hh + 'px'); }
    }

    /* --coin-row-h / --hero-foot-h: the phone band floats the deck, the
       coin door and the foot as three overlays stacked up from the strip,
       and the deck's offset was a hand-picked 68px — a guess that assumed
       the band below the deck was never taller than it. It is: the coin
       row grows with the grid (58px at PXG 2, 85px once its Persian
       caption wraps to two lines at PXG 3), and past 68 it reached UP into
       the stick's own base. The foot and the coin row deliberately share
       one band — left half and right half — so the deck has to clear
       whichever of the two is taller. Measure both, take the max in css. */
    ['.coin-row', '.hero-foot'].forEach(function (sel) {
      var el = doc.querySelector(sel);
      if (!el) { return; }
      var bh = Math.round(el.getBoundingClientRect().height);
      if (bh > 0) {
        html.style.setProperty(sel === '.coin-row' ? '--coin-row-h' : '--hero-foot-h', bh + 'px');
      }
    });
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
  /* round 12 · the last door you walked through: a run made after
     visiting a world belongs to that world's gate — each door keeps
     its own record alongside the cabinet's global one */
  var lastWorld = '';
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
    if (worldId) { lastWorld = worldId; }
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
    if (toast) {
      toast.hidden = false;
      toast.classList.add('show');
      setTimeout(function () { toast.hidden = true; toast.classList.remove('show'); }, 4800);
    }
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

  /* ── the theme follows the scroll, deterministically ────
     This used to be seven separate IntersectionObservers — four for the
     worlds, three for the core sections — all sharing
     rootMargin:'-20% 0px -25% 0px' and threshold:0.08.

     The fatal detail was that 0.08 has no 0 beside it. Blink fires a
     callback on the DOWNWARD crossing 0.0801 -> 0.0799 with
     isIntersecting still true, so the `if (!en.isIntersecting) return`
     guard never rejected it: every section re-asserted its own theme on
     the way out, and with no threshold 0 the theme was never cleared —
     it was simply stomped by whichever out-crossing happened to run
     last. With no ordering between the four observers, last-wins.

     Measured on equal 84svh sections, a world showed its OWN theme for
     about 41vh and then the PREVIOUS world's theme for the rest of it.
     And because `.hero` sat in the reset group, CORE gold stomped the
     tube while you were already inside world 02 — the NEXT section's
     theme. Two more aggravators: the sections are not equal height
     (content-driven, min-height 84svh), so the window moved per
     section, and svh is measured against a vh-derived band, so on a
     phone it drifted live as the toolbar collapsed.
     `.security-banner` was a <div> in NEITHER observer list, so the
     theme froze at whatever the last crossing wrote for its whole height.

     One pass, one rule: the theme belongs to whichever section straddles
     the MIDPOINT of the screen. No thresholds to fall between, no
     observers to race, and setChrome fires only on an actual change —
     which also fixes the double `blip` per world pass and the stale
     `currentWorld` that was being captured as `w.runWorld`, sending a
     run's high score into the wrong world's localStorage bucket. */
  var THEME_SECTIONS = $$('.hero, .world, .security-banner, .manifesto, .contact, .footer');
  var themeOwner = null;
  var syncThemeQueued = false;

  function themeCandidateAt() {
    var focus = (window.innerHeight || doc.documentElement.clientHeight || 0) / 2;
    var best = null, bestNear = null, bestNearD = Infinity;
    for (var i = 0; i < THEME_SECTIONS.length; i++) {
      var el = THEME_SECTIONS[i];
      if (!el) { continue; }
      var r = el.getBoundingClientRect();
      if (!r.height) { continue; }
      /* straddles the midpoint → it owns the theme */
      if (r.top <= focus && r.bottom > focus) { best = el; }
      /* otherwise remember the nearest edge, for a midpoint that lands
         in a gap between two sections or in overscroll */
      var d = focus < r.top ? r.top - focus : (focus > r.bottom ? focus - r.bottom : 0);
      if (d < bestNearD) { bestNearD = d; bestNear = el; }
    }
    return best || bestNear || THEME_SECTIONS[0];
  }

  function syncTheme() {
    var el = themeCandidateAt();
    if (!el || el === themeOwner) { return; }   /* only act on a real change */
    themeOwner = el;
    var wid = el.dataset ? (el.dataset.world || '') : '';
    setChrome(wid, wid ? el.dataset.name : 'هسته');
    if (wid) {
      var idx = nOf(wid);
      if (!visited[idx]) {
        visited[idx] = true;
        pips[idx].classList.add('visited');
        if (visited[0] && visited[1] && visited[2] && visited[3]) { celebrate(); }
      }
    }
    blip(220, 120);
  }
  if (window.addEventListener) {
    window.addEventListener('scroll', function () {
      if (syncThemeQueued) { return; }
      syncThemeQueued = true;
      requestAnimationFrame(function () { syncThemeQueued = false; syncTheme(); });
    }, { passive: true });
    window.addEventListener('resize', function () {
      /* a reflow can move a boundary under the midpoint without any
         scroll at all — an orientation flip is the obvious one */
      if (syncThemeQueued) { return; }
      syncThemeQueued = true;
      requestAnimationFrame(function () { syncThemeQueued = false; syncTheme(); });
    }, { passive: true });
  }
  syncTheme();

  /* ── the shared tube ────────────────────────────────── */
  var hero = $('#hero');
  var cv = $('#field');
  var fx = null;
  var bfx = null;
  var world = null;
  var fieldOn = false;
  var heroVisible = true;
  /* round 4 · two pilots share one deck: after every run the tube is
     promised to the other player — the classic alternation of a
     two-player cabinet, and the idle 2P slot finally wakes up */
  var curPlayer = 1;
  var pScores = { 1: 0, 2: 0 };
  var pPlayed = { 1: false, 2: false };   /* each pilot who has finished a run this match */
  var hiEntry = null;   /* the initials ceremony lives here while open */

  /* night-flight palette — 16-bit arcade sky, neon cyan phosphor, gold matter.
     Every color was chosen with love: the warmth of a CRT's phosphor glow,
     the depth of a midnight sky seen through bezel glass, the gold of a
     coin that just dropped into the slot. */
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
    /* explosion lifecycle: white → gold → orange → crimson — the color
       chain every firework in the old machines followed */
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
    '9': ['111', '101', '111', '001', '110'],
    '+': ['000', '010', '111', '010', '000']
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

  function drawMText(g, str, x, y, color, scale) {
    scale = scale || 1;
    g.fillStyle = color;
    for (var i = 0; i < str.length; i++) {
      var rows = MFONT[str.charAt(i)];
      if (!rows) { x += 4 * scale; continue; }
      for (var r = 0; r < 5; r++) {
        var line = rows[r];
        for (var c = 0; c < 3; c++) {
          if (line.charAt(c) === '1') { g.fillRect(x + c * scale, y + r * scale, scale, scale); }
        }
      }
      x += 4 * scale;
    }
  }
  function mTextW(str) { return str.length * 4 - 1; }

  /* multi-tone sprites — each char maps to a palette color via legend.
     sc scales the sprite in whole game-pixels (the plumber walks in big) */
  function drawSpr(g, spr, x, y, legend, flip, sc) {
    var r, c, ch;
    sc = sc || 1;
    for (r = 0; r < spr.length; r++) {
      var line = spr[r];
      var w = line.length;
      for (c = 0; c < w; c++) {
        ch = line.charAt(c);
        if (ch === '.') { continue; }
        var col = legend[ch];
        if (!col) { continue; }
        g.fillStyle = col;
        g.fillRect(x + (flip ? w - 1 - c : c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function sprW(spr) { return spr[0].length; }
  /* drawSpr, but only columns c0..c1 — how a hull materialises out
     of a portal: from the spine outward */
  function drawSprClip(g, spr, x, y, legend, flip, c0, c1) {
    var r, c, ch;
    for (r = 0; r < spr.length; r++) {
      var line = spr[r];
      var w = line.length;
      for (c = c0; c <= c1 && c < w; c++) {
        ch = line.charAt(c);
        if (ch === '.') { continue; }
        var col = legend[ch];
        if (!col) { continue; }
        g.fillStyle = col;
        g.fillRect(x + (flip ? w - 1 - c : c), y + r, 1, 1);
      }
    }
  }
  /* drawSpr, but only rows r0..r1 — how a soul un-writes from the
     feet up, and how a mutant writes itself in from the crown down */
  function drawSprRowClip(g, spr, x, y, legend, r0, r1) {
    var r, c, ch;
    for (r = Math.max(0, r0); r <= r1 && r < spr.length; r++) {
      var line = spr[r];
      for (c = 0; c < line.length; c++) {
        ch = line.charAt(c);
        if (ch === '.') { continue; }
        var col = legend[ch];
        if (!col) { continue; }
        g.fillStyle = col;
        g.fillRect(x + c, y + r, 1, 1);
      }
    }
  }

  /* ── animated sprite sheets preloader & hardware blitter ── */
  var SPR_SHEETS = {
    ship: { img: null, loaded: false, cols: 6, rows: 8, cellW: 195, cellH: 85 },
    mario: { img: null, loaded: false, cols: 6, rows: 3, cellW: 108, cellH: 160 },
    mother: { img: null, loaded: false, cols: 6, rows: 6, cellW: 228, cellH: 120 }
  };
  function initSprSheets() {
    if (typeof Image === 'undefined') { return; }
    function loadSheet(key, src) {
      var im = new Image();
      im.onload = function () {
        SPR_SHEETS[key].img = im;
        SPR_SHEETS[key].loaded = true;
      };
      im.src = src;
    }
    loadSheet('ship', 'assets/spr_ship.webp?v=mm2526');
    loadSheet('mario', 'assets/spr_mario.webp?v=mm2526');
    loadSheet('mother', 'assets/spr_mother.webp?v=mm2526');
  }
  initSprSheets();

  function drawSheetFrame(g, key, frameIdx, x, y, destW, destH, flip, alpha) {
    var S = SPR_SHEETS[key];
    if (!S || !S.loaded || !S.img) { return false; }
    var col = frameIdx % S.cols;
    var row = Math.floor(frameIdx / S.cols);
    var sx = col * S.cellW;
    var sy = row * S.cellH;
    g.save();
    if (alpha !== undefined && alpha < 1) { g.globalAlpha = Math.max(0, alpha); }
    if (flip) {
      g.translate(Math.round(x + destW), Math.round(y));
      g.scale(-1, 1);
      g.drawImage(S.img, sx, sy, S.cellW, S.cellH, 0, 0, destW, destH);
    } else {
      g.drawImage(S.img, sx, sy, S.cellW, S.cellH, Math.round(x), Math.round(y), destW, destH);
    }
    g.restore();
    return true;
  }

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
    chip:      { src: 7,  weight: 800, color: null, grid: null, chip: true, align: 'center', centerLines: true, nowrap: true },
    name:      { src: 16, weight: 900, color: PC.press, shadow: PC.pressDk, align: 'center', centerLines: true, nowrap: true },
    statement: { src: 11, weight: 900, color: '#e9e9f2', grid: 'half', align: 'center', centerLines: true },
    para:      { src: 8,  weight: 700, color: PC.textSub, grid: 'half', align: 'center', centerLines: true },
    cuefa:     { src: 9,  weight: 700, color: PC.cueFa, grid: 'half', align: 'center' },
    pstartfa:  { src: 9,  weight: 800, color: PC.gold, grid: 'half', align: 'center', nowrap: true },
    joyfa:     { src: 9,  weight: 800, color: PC.gold, grid: 'half', align: 'center', nowrap: true },
    firefa:    { src: 9,  weight: 800, color: PC.gold, grid: 'half', align: 'center', nowrap: true },
    specfa:    { src: 9,  weight: 800, color: PC.gold, grid: 'half', align: 'center', nowrap: true },
    coinfa:    { src: 9,  weight: 700, color: PC.slateHi, grid: 'half', align: 'start' },
    bootfa:    { src: 8,  weight: 800, color: PC.slateHi, align: 'center' },
    bootskip:  { src: 10, weight: 700, color: PC.slate,   grid: 'half', align: 'center' }
  };

  /* narrow screens: the same pixel twin, set a touch smaller so the
     title screen keeps its rhythm on a phone tube */
  var PX_MOBILE = { chip: 6, name: 12, statement: 9, para: 8, cuefa: 8, coinfa: 8, pstartfa: 8, joyfa: 8, firefa: 8, specfa: 8, bootfa: 7, bootskip: 9 };

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
      conf = { src: PX_MOBILE[kind], weight: conf.weight, color: conf.color, grid: conf.grid, chip: conf.chip, align: conf.align, centerLines: conf.centerLines, nowrap: conf.nowrap };
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
    /* font-swap heal: the first world build can run against pre-font
       metrics (a taller marquee), leaving the terrain below the fold.
       If the hero's real height has drifted since the build, rebuild. */
    if (hero && world && !reduced.matches) {
      var dh = Math.abs(hero.getBoundingClientRect().height - (world.cssH || 0));
      if (dh > 8) { buildWorld(); }
    }
  }

  /* ── the pixel world · a night-flight attract game ──── */
  /* Everything renders at game-pixel resolution onto tiny canvases the
     browser scales with hard edges. The art: a dithered dusk sky in five
     ink bands, a crescent moon, drifting dithered clouds, three parallax
     mountain ridges, a 3-tone gold terrain, chunky multi-tone sprites,
     starburst explosions — one shared world state feeding BOTH screens
     (boot canvas dimmed under the title card, hero canvas with the full
     HUD), so the channel flip hands over a game already in motion. */

  var skyCv = null, vigCv = null, dimCv = null, attractCv = null, flashCvs = [], doomCv = null;
  var cloudSprs = [];

  function baseTerrRow(wx, rows) {
    /* A landscape needs a silhouette, not television-static. The long
       wave makes a recognisable horizon; the two quieter voices add old,
       weathered shelves. Quantising to two pixels gives the ridge the
       deliberate, hand-stepped contour of a cabinet backdrop. */
    var h = 0.715 + Math.sin(wx * 0.018) * 0.052 +
      Math.sin(wx * 0.047 + 1.7) * 0.018 + vnoise(wx, 71) * 0.024;
    if (hash01(Math.floor(wx / 97)) > 0.82) { h += vnoise(wx, 19) * 0.026; }
    /* smooth soft-knee curvature avoiding abrupt flat-top shelf clamping */
    if (h > 0.81) { h = 0.81 + (h - 0.81) * 0.38; }
    if (h < 0.67) { h = 0.67 - (0.67 - h) * 0.38; }
    h = Math.max(0.655, Math.min(0.838, h));
    return Math.round((h * rows) / 2) * 2;
  }

  function terrRow(wx, rows) {
    var b = baseTerrRow(wx, groundRows(rows));
    var w = typeof world !== 'undefined' ? world : null;
    if (!w || !w.craters || !w.craters.length) { return b; }
    var dy = 0, lip = 0;
    for (var i = 0; i < w.craters.length; i++) {
      var c = w.craters[i];
      var dx = Math.abs(wx - c.wx);
      if (dx <= c.radius) {
        var p = dx / c.radius;
        var cd = 0;
        if (c.kind === 'penetrator') {
          cd = c.depth * Math.exp(-Math.pow(p * 2.2, 2));
        } else if (c.kind === 'incendiary') {
          var jg = 1 + Math.sin(wx * 0.9) * 0.22;
          cd = c.depth * jg * (1 - Math.pow(p, 1.4));
        } else {
          cd = c.depth * (1 - p * p);
        }
        if (cd > dy) { dy = cd; }
      } else if (dx <= c.radius + 3 && c.lip > 0) {
        var lp = (c.radius + 3 - dx) / 3 * c.lip;
        if (lp > lip) { lip = lp; }
      }
    }
    return Math.round(b + dy - lip);
  }
function farRow(wx, rows) {
     /* slow silhouette ridge — the mountains beyond the mountains,
        painted in deep indigo with a single lit edge */
     return Math.round((0.57 + vnoise(wx, 47) * 0.12 + vnoise(wx, 101) * 0.04) * groundRows(rows));
   }
   function midRow(wx, rows) {
     /* mid ridge — a gentler silhouette with a warm lit top edge */
     return Math.round((0.65 + vnoise(wx, 23) * 0.11 + vnoise(wx, 53) * 0.03) * groundRows(rows));
   }

  /* sprites — 16-bit arcade pixel art maps, chars legend-keyed */
/* the player craft — an original late-80s interceptor: a long white
       arrow, glass-blue cockpit, brass wing roots and a low graphite keel.
       It is deliberately asymmetric in its tiny markings (a pilot's red
       panel, a single canopy glint) but balanced in silhouette, so it reads
       as a beloved machine rather than a pile of coloured squares. */
    var SPR_SHIP = [
      '...................gGG........',
      '..............GGGGWWWWGG......',
      '..........gGWWWWWcCcWWWWGG....',
      '......GGWWWWWWCCCCCCWWWWWWWG..',
      '..EEEDDWWWWSSSSCCCCCCSSWWWWWWN',
      '..EEDDWGGWWWWWWWWWWWWWWGGWWWWN',
      '.EEDDWGGGGWWWWWWWWWWGGGGWWWWN.',
      '..EEEDWWRRRRSSSSSSSSSSSSRRRWN.',
      '....DDDDDDDDDDDDDDDDDDDDDDD...',
      '..E..DD..E........E..DD..E....',
      '...E....................E.....',
      '..............................'
    ];
    var SHIP_LEG = { W: PC.ship, S: PC.shipSh, C: PC.cock, c: '#e0ffff', G: PC.gold, g: '#c99b3f', D: '#343446', R: PC.red, E: PC.thrLo, N: '#00f0ff' };
    /* the powered hull: the mushroom's promise worn on the outside —
       gold plating, white-hot trim, an ember of an engine */
    var SHIP_LEG_SUPER = { W: PC.gold, S: '#e8b84b', C: '#e6f7ff', c: '#ffffff', G: '#ffffff', g: '#ff8a3d', D: '#7a5a16', R: '#ffffff', E: '#ffcc66', N: '#ffffff' };
  /* scout lander — a compact beetle-shaped skiff, with a real canopy,
     red sensor slit, armoured skirt and a two-frame landing gait. */
  var SPR_LANDER = [
    '.....EEE.....',
    '...EEWWWEE...',
    '.EEWWCWWWWEE.',
    'EEWDDRRRDDWEE',
    'EGGGGGGGGGGGE',
    '.EGGGGGGGGGE.',
    '..E..GGG..E..'
  ];
  var SPR_LANDER2 = [
    '.....EEE.....',
    '...EEWWWEE...',
    '.EEWWCWWWWEE.',
    'EEWDDRRRDDWEE',
    'EGGGGGGGGGGGE',
    '.EGGGGGGGGGE.',
    '.E...GGG...E.'
  ];
  var LANDER_LEG = { E: PC.lander, C: '#bffff7', W: PC.white, G: PC.landerDk, R: PC.red, D: '#145b42' };
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
  var HUM_WHITE = { S: '#ffffff', B: '#ffffff', P: '#ffffff', W: '#ffffff' };
/* the guest — a hand-drawn arcade homage, not a borrowed sprite sheet.
       Cap, nose, moustache, blue workwear and broad boots are separated by
       real shadow colours, giving him a warm character at a 2px scale. */
    var SPR_MARIO = [
      '.....rrrr.....',
      '...rrRRRRrr...',
      '...rRRRRRRr...',
      '...FFHHFFF....',
      '..FFHFFHFF....',
      '..FHHHMFHF....',
      '...FFFFFF.....',
      '...RRBBBBR....',
      '..RRBBBBBBR...',
      '..RBBYBBYBR...',
      '...BBBBBBB....',
      '...BB...BB....',
      '..HH.....HH...',
      '..HHH...HHH...',
      '..............'
    ];
    var SPR_MARIO2 = [
      '.....rrrr.....',
      '...rrRRRRrr...',
      '...rRRRRRRr...',
      '...FFHHFFF....',
      '..FFHFFHFF....',
      '..FHHHMFHF....',
      '...FFFFFF.....',
      '...RRBBBBR....',
      '..RRBBBBBBR...',
      '..RBBYBBYBR...',
      '...BBBBBBB....',
      '....BB..BB....',
      '...HH....HH...',
      '..HHH......HH.',
      '..............'
    ];
    var MARIO_LEG = { R: '#e43b3b', r: '#a92532', F: '#ffcf9e', H: '#5b3213', B: '#2f6fd0', M: '#4a2a12', Y: '#ffd76a' };
  var SPR_SHROOM = [
    '..RRRR..',
    '.RRRRRR.',
    'RRWRRWRR',
    'RRRRRRRR',
    'RRWRRWRR',
    '.WWWWWW.',
    '.WWSSWW.',
    '..WWWW..'
  ];
  var SHROOM_LEG = { R: '#e43b3b', W: '#f7ecd2', S: '#cfae7e' };
  /* tractor lander — a proper flying saucer. Its lower turbine is painted
     separately below, where its vanes can genuinely rotate at game speed. */
  var SPR_LANDER_T = [
    '......WWW......',
    '....WWCCCWW....',
    '...WCCCCCCCW...',
    '.PPWWWWWWWWWPP.',
    'PPDDGGGGGGGDDPP',
    '.PDDDDDDDDDDDP.',
    '...............',
    '...............',
    '...............'
  ];
  var SPR_LANDER_T2 = [
    '......WWW......',
    '....WWCCCWW....',
    '...WCCCCCCCW...',
    '.PPWWWWWWWWWPP.',
    'PPDDGGGGGGGDDPP',
    '.PDDDDDDDDDDDP.',
    '...............',
    '...............',
    '...............'
  ];
  var LANDER_LEG_T = { P: '#ff5aa8', W: '#ffffff', G: '#c06ee8', D: '#6c1e50', E: '#ffcb8f', C: '#f2e2ff' };
  /* Classic UFO lower skirt spin: 3D rotating saucer base with vertical panels
     and perimeter light columns sliding horizontally around the vertical axis. */
  function drawTractorRotor(g, cx, y, t) {
    // Tapered dark purple hull base (#321340)
    g.fillStyle = '#321340';
    g.fillRect(cx - 5, y, 11, 1);
    g.fillRect(cx - 4, y + 1, 9, 1);
    g.fillRect(cx - 3, y + 2, 7, 1);
    g.fillRect(cx - 2, y + 3, 5, 1);

    // Dark magenta rim shading (#6c1e50)
    g.fillStyle = '#6c1e50';
    g.fillRect(cx - 5, y, 1, 1);
    g.fillRect(cx + 5, y, 1, 1);
    g.fillRect(cx - 4, y + 1, 1, 1);
    g.fillRect(cx + 4, y + 1, 1, 1);
    g.fillRect(cx - 3, y + 2, 1, 1);
    g.fillRect(cx + 3, y + 2, 1, 1);
    g.fillRect(cx - 2, y + 3, 1, 1);
    g.fillRect(cx + 2, y + 3, 1, 1);

    // Pink rim accent tips on upper corners (#ff5aa8)
    g.fillStyle = '#ff5aa8';
    g.fillRect(cx - 5, y, 1, 1);
    g.fillRect(cx + 5, y, 1, 1);

    // Horizontal 3D UFO skirt rotation: 4 light bands orbiting around vertical Y axis
    var theta = t * 0.0075;
    var R_top = 4.0;
    var R_mid = 3.2;
    var R_bot = 2.2;

    for (var k = 0; k < 4; k++) {
      var angle = theta + (k * Math.PI / 2);
      var z = Math.cos(angle);
      if (z > -0.2) { // Visible on front face of UFO
        var xTop = Math.round(R_top * Math.sin(angle));
        var xMid = Math.round(R_mid * Math.sin(angle));
        var xBot = Math.round(R_bot * Math.sin(angle));

        // Depth shading: front-facing columns glow bright white/cyan, side columns peach/lavender
        var col;
        if (z > 0.72) {
          col = '#ffffff';
        } else if (z > 0.35) {
          col = '#ffcb8f';
        } else {
          col = '#c06ee8';
        }

        g.fillStyle = col;
        if (Math.abs(xTop) <= 4) { g.fillRect(cx + xTop, y, 1, 1); }
        if (Math.abs(xMid) <= 3) { g.fillRect(cx + xMid, y + 1, 1, 1); }
        if (Math.abs(xBot) <= 2) { g.fillRect(cx + xBot, y + 2, 1, 1); }
      }
    }

    // Central bottom emitter orifice (y+3)
    var corePulse = (Math.floor(t / 80) % 2 === 0);
    g.fillStyle = corePulse ? '#ffffff' : '#f2e2ff';
    g.fillRect(cx - 1, y + 3, 3, 1);
    g.fillStyle = '#ff5aa8';
    g.fillRect(cx, y + 3, 1, 1);
  }
  var BEAM_C1 = '#c06ee8', BEAM_C2 = '#f2e2ff';
  /* the mutant: a stolen soul comes back wrong — redrawn broader and
     meaner, white wing-tips spread two pixels wider in clean mirrored
     step, an angry red brow over white eyes, too many legs. Both flutter
     frames carry the same weight, always turning toward you */
  var SPR_MUTANT = [
    '.W........W.',
    'WWRD.RR.DRWW',
    'DWRRRRRRRRWD',
    'DRWWRRRRWWRD',
    'DRRRRRRRRRRD',
    '.DRRRRRRRRD.',
    '..DR.DD.RD..',
    '.D..D..D..D.',
    'D...D..D...D'
  ];
  var SPR_MUTANT2 = [
    '.W........W.',
    'WWRD.RR.DRWW',
    'DWRRRRRRRRWD',
    'DRWWRRRRWWRD',
    'DRRRRRRRRRRD',
    '.DRRRRRRRRD.',
    '..DD.RR.DD..',
    'D..D....D..D',
    '..DD....DD..'
  ];
  var MUT_LEG = { R: PC.red, D: PC.redDk, W: '#ffffff' };
  var MUT_WHITE = { R: '#ff85a2', D: '#ffffff', W: '#ffffff' };
/* the mothership — an original 34×14 cathedral of steel, made to fit the
       encounter box exactly.  Her crescent shoulders, gold signal band and
       central red optic make one unmistakable silhouette before the player
       even sees the beam. */
    var SPR_MOTHER = [
      '............DDDDDDDDDD..........',
      '.........DDTTTTTTTTTTDD.........',
      '......DDTTTWWTTTTTTWWTTTDD......',
      '....DDTTTTTTTTTTTTTTTTTTTTDD....',
      '..GGTTTTTTTTTTTTTTTTTTTTTTTTGG..',
      '.DTTTTTWWTTTTRRRRRRTTTTWWTTTTTD.',
      'DTTTTTTTTTTTRRRRRRTTTTTTTTTTTTD.',
      '.DDTTGGTTTTTTTDDDDTTTTTTTGGTTDD.',
      '..DTTTTTTTTTTTDDDDTTTTTTTTTTTD..',
      '...DTTTTTTTTTTTDDTTTTTTTTTTTD...',
      '.EE.DDDTTTTTTTDDDDTTTTTTTDDD.EE.',
      '.EE..DDDDTTTTTTTTTTTTDDDD..EE...',
      '....E......DDDDDDDDDD......E....',
      '............DDDDDDDD............'
    ];
    var MOTHER_LEG = { D: '#14655c', T: '#2fbfae', W: '#ffffff', R: PC.red, G: PC.gold, E: '#ff8a3d' };
    var MOTHER_DRAW_W = 144;
    var MOTHER_DRAW_H = 76;
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

  /* the fallen planet's wash — red dither, heavy at the ridge, thin
     as it climbs: the terrain smoulders while the sky is lost */
  function buildDoom(cols, rows) {
    var c = doc.createElement('canvas');
    c.width = cols; c.height = rows;
    var g = c.getContext('2d');
    g.fillStyle = PC.red;
    var top = Math.round(rows * 0.52);
    for (var y = top; y < rows; y++) {
      var fall = (y - top) / (rows - top);   /* 0 at the horizon → 1 at the floor */
      var density = 0.06 + fall * fall * 0.30;
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

  /* ── the play area the controls do not own ───────────────
     On a phone the control deck is absolutely positioned over the foot
     of the tube, so its bottom edge and top edge are both real: measured
     68px of the ship can fly behind the deck at 844x390. Guessing a band
     in CSS cannot work, because the deck's height depends on PXG, on
     --hero-deck-scale and on which band won — so measure it instead.

     Returns a row count to LIFT the landscape by. terrRow/farRow/midRow
     all return (constant x rows), so handing them a smaller row count
     raises the ground, the ridges behind it, and everything standing on
     it as one piece — and the terrain loop then fills solid from the new
     ground line all the way to the bottom edge, which puts solid ground
     under the player's thumbs instead of sky. That reads as deliberate
     rather than as a control panel floating in mid-air. */
  function deckBandRows(fieldCssH, rows, px) {
    if (!hero || !window.getComputedStyle) { return 0; }
    var deck = hero.querySelector('.hero-deck');
    if (!deck) { return 0; }
    var cs = window.getComputedStyle(deck);
    /* in normal flow the deck is content, not an overlay — nothing to
       reserve (this is every desktop width) */
    if (cs.position !== 'absolute') { return 0; }
    var hr = hero.getBoundingClientRect();
    var dr = deck.getBoundingClientRect();
    if (!dr.height) { return 0; }
    var deckTop = dr.top - hr.top;          /* the deck's top edge, from the glass top */
    if (!(deckTop > 0) || !(deckTop < fieldCssH)) { return 0; }

    /* Size the band for the WORST terrain, not the terrain under the
       ship right now: baseTerrRow clamps h to 0.838, and a run must not
       walk into a band that only existed this second. Solving
         (TERR_MAX * (rows - B) - SHIP_H) * px == deckTop
       gives the smallest B that clears the deck at the highest ridge the
       generator can ever produce. On a tall phone that is ~48 rows; on a
       landscape tube, where the deck really does sit in the flight path,
       it is ~69. And when the ground already clears the deck the answer
       is 0, so the sky is never eaten for nothing. */
    var TERR_MAX = 0.838, SHIP_H = 11, MARGIN = 8;   /* rows of air above the thumbs */
    var need = Math.ceil((deckTop / px + SHIP_H + MARGIN) / TERR_MAX);
    var band = rows - need;
    if (band <= 0) { return 0; }
    /* Lift the ground by the shortfall, not by the whole band. `need` is
       the row count at which the flight floor exactly meets the deck's
       top edge, so raising the ground to `need` is all it takes; adding
       any more sky is slack the sky did not ask for.

       The ceiling has to clear the shortest landscape tube by a couple of
       rows, though: at 740x360 the flight floor wants 62 and a flat third
       of 180 was 61, which left the ship's belly 10px inside the
       controls. Past a third, though, the tube stops being a flight game
       and becomes a trench — so the cap stays and the deck scale buys the
       rows instead (see the max-height:640px + max-width:860px band). */
    return Math.max(0, Math.min(rows - need, Math.round(rows * 0.37)));
  }
  /* every ground-line function funnels through here, so the whole
     landscape lifts by one number and stays internally consistent */
  function groundRows(rows) {
    var g = world && typeof world.groundRows === 'number' ? world.groundRows : null;
    if (g == null) { return rows; }
    return Math.max(8, Math.min(rows, g));
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
    doomCv = buildDoom(cols, rows);
    var cw = Math.max(18, Math.round(cols * 0.09));
    cloudSprs = [
      { cv: buildCloud(cw, Math.max(5, Math.round(cw * 0.30)), 11), x: Math.random() * cols, y: Math.round(rows * 0.14), v: 2.2 },
      { cv: buildCloud(Math.round(cw * 1.5), Math.max(6, Math.round(cw * 0.36)), 47), x: Math.random() * cols, y: Math.round(rows * 0.26), v: 4.6 },
      { cv: buildCloud(Math.round(cw * 0.8), Math.max(4, Math.round(cw * 0.26)), 83), x: Math.random() * cols, y: Math.round(rows * 0.38), v: 8.2 }
    ];
    var old = world;
    world = {
      cols: cols, rows: rows, px: PXG, cssH: h, cssW: w,
      /* how much of the tube's foot the control deck owns. 0 when the
         deck is in normal flow (every desktop size). On a phone the deck
         is absolutely positioned over the bottom of the glass, so on a
         short tube the ship could fly straight down into the controls —
         measured 68px of overlap at 844x390. deckTopPx is kept so the
         resize guard can tell when the deck has moved under us. */
      groundRows: rows - deckBandRows(rect.height, rows, PXG),
      deckTopPx: (function () {
        var dk2 = hero && hero.querySelector('.hero-deck');
        if (!dk2) { return -1; }
        return dk2.getBoundingClientRect().top - rect.top;
      })(),
      /* Is this a compact tube? The tube's SHAPE decides the art, not its
         column count. A 844x390 landscape phone is 422 columns wide —
         plenty — but only 195 rows tall, and height is the resource the
         sky runs out of; keying the hull on columns kept the desktop
         52x23 ship there, 23 rows of 195 against desktop's 23 of 300.
         These are the two breakpoints the stylesheet already uses for the
         phone layout, so the art follows the same line as the chrome. */
      compact: html.clientWidth <= 860 || html.clientHeight <= 640,
      worldX: old ? old.worldX : Math.random() * 4096,
      t: old ? old.t : 0,
      bootT0: old ? old.bootT0 : performance.now(),
      stars: makeStars(cols, rows),
      landers: [], bullets: [], bombs: [], booms: [], hums: [],
      ship: {
        /* the demo lane patrols the central dogfight airspace */
        x: Math.round(cols * 0.3), y: Math.round(rows * 0.40),
        ty: Math.round(rows * 0.40), tyCd: 0,
        hopY: 0, hopV: 0, flipUntil: 0, fireCd: 900
      },
      score: old ? old.score : 0,
      flash: old ? old.flash : 0,
      banner: old ? old.banner : null,
      bombCd: 2600, humCd: 4000,
      rings: [], scorch: [], craters: old ? old.craters : [], shake: 0, embers: [], emberCd: 0,
      shipDead: false, shipDeadAt: 0, portal: null,
      kills: 0, laserUntil: 0, mario: null,
      mutants: old ? old.mutants : [],
      meteor: null,
      padSeen: old ? (old.padSeen || 0) : 0,
      /* round 3: the mothership fly-by, the chain multiplier, the
         high-score ceremony and the score pops */
      mother: old ? old.mother : null,
      motherCd: old ? old.motherCd : 24000 + Math.random() * 30000,
      chain: old ? (old.chain || 0) : 0,
      chainUntil: old ? (old.chainUntil || 0) : 0,
      hiBeaten: old ? !!old.hiBeaten : false,
      hiFlashUntil: old ? (old.hiFlashUntil || 0) : 0,
      pops: old ? old.pops : [],
      /* round 11: celebration sparks — the DEFENDER star scatters */
      sparks: old ? (old.sparks || []) : [],
      /* round 4: whose run this is, and what it has to beat */
      nextPlayer: old ? (old.nextPlayer || 2) : 2,
      humanRun: old ? !!old.humanRun : false,
      /* round 14: the run's door survives a rebuild (a resize mid-run
         used to erase the patronage while humanRun lived on) */
      runWorld: old ? old.runWorld : undefined,
      hiAtRunStart: old ? (old.hiAtRunStart || 0) : 0,
      runStartT: old ? (old.runStartT || 0) : 0,
      /* round 7: the sky answers skill — SECTOR escalation */
      sector: old ? (old.sector || 1) : 1,
      sectorKills: old ? (old.sectorKills || 0) : 0,
      /* round 9: the glass counts out loud, and the sector keeps
         score of the souls it lost — perfect sectors pay in gold */
      dispScore: old ? (old.dispScore != null ? old.dispScore : (old.score || 0)) : 0,
      humsLost: old ? (old.humsLost || 0) : 0,
      sectorLostMark: old ? (old.sectorLostMark || 0) : 0,
      /* round 8: Defender's endgame — the planet can fall */
      planetFall: old ? !!old.planetFall : false,
      zeroHumsT: old ? (old.zeroHumsT || 0) : 0,
      /* round 10: the run's rank — the ladder rung this run has
         earned so far; a fresh coin puts every pilot back on ROOKIE */
      rankTier: old ? (old.rankTier || 1) : 1,
      rankShown: old ? (old.rankShown || 0) : 0
    };
    if (!old) { world.motherCd = sectorTune(world).motherBase + Math.random() * 30000; }
    for (var i = 0; i < 9; i++) {
      world.hums.push({
        wx: world.worldX + 24 + Math.random() * cols * 2.4,
        y: 0, state: 'ground', vy: 0, held: null, targetedBy: null, ph: Math.random() * 6.28
      });
    }
    faCache = {};
    if (reduced.matches && fx) { renderWorld(fx, 'hero', performance.now()); }
  }

  function spawnLander() {
    var w = world;
    /* cruise the central airspace: well clear of the mountain ridge,
       centered between the mothership's high patrol and the deck */
    spawnLanderAt(w.cols + 3 + Math.random() * 16,
                  w.rows * (0.32 + Math.random() * 0.14));
  }
  function spawnLanderAt(sx, sy) {
    var w = world;
    /* two breeds: grunts dive down and grab with their own hull;
       the advanced kind hovers off and reels a soul up with a beam */
    var tn = sectorTune(w);
    var adv = Math.random() < tn.adv;
    var nph = Math.random() * 6.28;
    w.landers.push({
      wx: w.worldX + sx,
      base: sy,
      ph: nph,
      drift: (-3 - Math.random() * 3) * tn.drift,
      type: adv ? 'tractor' : 'grunt',
      state: 'drift',
      /* born on the bob: no 4 px pop on the first drift frame */
      y: Math.round(sy + Math.sin(w.t * 0.0021 + nph) * 4),
      gone: false,
      grabCd: 2200 + Math.random() * 6000,
      target: null
    });
  }

  /* ── sheet sprites: an integer DESTINATION box, never a scale ──
     Only the sheet paths can be adapted at all. drawSpr multiplies by
     an integer `sc` and every map-drawn sprite already sits at sc=1, so
     landers, tractors, mutants and the humanoids have no integer route
     to a smaller size without new pixel art — which is exactly why the
     adaptation is scoped to the ship and the cameo.

     The hull was a flat 52x23 into a 195x85 cell, so it took 12.2% of a
     427-column desktop arena but 26.7% of a 195-column phone — 104 CSS px
     on a 390px tube. Worse, its own map fallback (the 30x12 SPR_SHIP)
     draws smaller than the sheet, so the two paths already disagreed by
     1.73x. 32 is the smallest integer that keeps a 195px-wide cell
     legible while cutting the share by 39%, and it is aspect-exact.
     40 is the current compact size: 32 was the floor set by the sheet's
     resample limit, but the VERTICAL share on a tall phone was only 3.3%
     against desktop's 7.7% — the hull was undersized where it had the
     most room, which is why 40 (0.205 resample, aspect-exact at
     40 / (195/85) = 17.4 -> 17) reads as a better fit rather than a
     regression toward the 52.

     Render-only. Every gameplay dimension reads the 30x12 map — bolt nose
     and collision via sprW(SPR_SHIP), the terrain kill via S.y + 11, and
     the movement clamps off `cols` — so no hitbox, firing point or
     movement bound can move. As a bonus it shrinks a pre-existing
     unfairness: at 52 wide the art was 73% wider than its own hitbox;
     at 32 it nearly matches the 30-wide box. */
  function shipDest(w) {
    return (w && w.compact) ? { w: 40, h: 17 } : { w: 52, h: 23 };
  }
  /* the cameo has no collision at all — it is the four-kill gift walking
     in — so its destination box is free to shrink on a compact tube */
  function marioDest(w) {
    return (w && w.compact) ? { w: 22, h: 33 } : { w: 28, h: 42 };
  }
  /* offsets and flourishes are sized off the hull, so they follow it:
     scaled by the same ratio keeps the nose on the same game pixel at
     every destination size, and every result stays an integer */
  function shipScaleOf(dw) { return dw / 52; }

  /* The dreadnought is sized to her arena, not to the source art.
     She was a flat 144x76 in GAME pixels, and a phone's arena is only
     160 columns wide against a desktop's 427 — so on a phone she spanned
     90% of the screen and her battle patrol, which runs between 10 and
     cols - mw - 10, collapsed to FOUR columns of travel. The ship is 27
     wide. You could not get past her, and you could not get above her
     either: the ship's ceiling is rows*0.16 and her base is rows*0.16,
     so her belly sat at rows*0.16 + 76. The gun fires horizontally only,
     so the fight is unavoidably "stand beside her and shoot" — the room
     to do that is the whole fight.

     Bounding her by WIDTH alone was not enough. Height is the other
     axis, and on a short tube the sky is a strip: between the ship's
     ceiling (rows*0.16) and the highest ridge (0.655 * groundRows - 11)
     there were only 38 rows on a 390px-tall landscape phone, so a 75-row
     hull put her belly 43 rows UNDERGROUND — half buried in the
     mountain, turrets firing into dirt. She is bounded by that strip
     too, and keeps her 144:76 aspect so the art is never squashed. */
  function motherSize(w) {
    var cols = w.cols, rows = w.rows;
    var gr = typeof w.groundRows === 'number' ? w.groundRows : rows;
    /* the strip of sky she must live inside */
    var air = Math.floor((0.655 * gr - 11) - rows * 0.16);
    var byWidth = Math.round(cols * 0.34);
    /* she may not eat more than ~62% of the sky or she IS the floor */
    var bySky = air > 12 ? Math.round(air * 0.62 * 144 / 76) : 40;
    var mw = Math.max(40, Math.min(144, byWidth, bySky));
    return { w: mw, h: Math.max(20, Math.round(mw * 76 / 144)), air: air };
  }
  /* the offsets that used to be typed as literal pixels, expressed as
     fractions of her hull so they stay on the ship when she shrinks */
  function motherTrim(mw, mh) {
    return {
      tX: Math.max(10, Math.round(mw * 0.19)),   /* ventral turret inset */
      tY: Math.max(8, Math.round(mh * 0.21)),    /* turret drop below hull */
      edge: Math.max(6, Math.round(mw * 0.11)),  /* smoke/spark inset */
      inner: Math.max(8, Math.round(mw * 0.15)),
      burst: Math.max(14, Math.round(mw * 0.28)),
      burstIn: Math.max(8, Math.round(mw * 0.14)),
      beamW: Math.max(3, Math.round(mw * 0.042)),
      beamLen: Math.max(12, Math.round(mw * 0.17)),
      /* the drawn turret bodies. These were 7x5 / 5x3 / 3x3 in absolute
         game pixels, which on a 54-column phone hull was 13% of her length
         against 5% on a 144-column desktop one — two rectangles and a
         square, blown up and swallowing the art. Floors keep them legible
         when she is small. */
      turW: Math.max(4, Math.round(mw * 0.049)),
      turH: Math.max(3, Math.round(mh * 0.066)),
      muz: Math.max(2, Math.round(mw * 0.021)),
      /* how far the muzzle sits off the turret pivot */
      muzOut: Math.max(3, Math.round(mw * 0.035)),
      aura: Math.max(3, Math.round(mw * 0.042))   /* ion-shield bubble */
    };
  }

  /* the dreadnought mothership boss: an armored flagship with two-stage
     health (ion shield + armor core), arena-locking standoff, twin aimed
     plasma turrets, ventral particle death ray, multi-bomb barrages, and
     an epic cascading destruction ceremony. */
  function spawnMother(w) {
    var dir = Math.random() < 0.5 ? -1 : 1;
    var base = Math.round(w.rows * 0.16 + Math.random() * w.rows * 0.04);
    var sz = motherSize(w);
    var mw = sz.w, mh = sz.h;
    /* On an arena too narrow to honour the 10-column standoff, drop the
       margin rather than invert the bounds — the old code let maxSx fall
       BELOW minSx (160 - 144 - 10 = 6 against a min of 10) which made
       her teleport between two crossing thresholds. */
    var margin = Math.min(10, Math.max(2, Math.floor((w.cols - mw) / 4)));
    w.mother = {
      w: mw, h: mh,
      sx: dir < 0 ? w.cols + 15 : -mw - 15,
      base: base, y: base, ph: Math.random() * 6.28,
      vx: 65 * dir,
      dir: dir,
      margin: margin,
      state: 'enter', /* 'enter' -> 'battle' -> 'dying' */
      hp: 24, maxHp: 24,
      shield: 16, maxShield: 16,
      hitFlash: 0, shieldFlash: 0,
      dropCd: 4000, dropFlash: 0,
      turretCd: 1800,
      beamCd: 5500, beamState: 'idle', beamT: 0, beamX: 0,
      bombsCd: 4500,
      sparkCd: 0, smokeCd: 0,
      bolts: [],
      dieT: 0
    };
    w.bossWarning = 2400;
    sfx('bossAlarm');
    sfx('mother');
    startBossMusic();
  }

  function hitMother(M, hx, hy) {
    var w = world;
    if (!w || !M || M.state === 'dying') { return; }
    M.hitFlash = 120;
    if (M.shield > 0) {
      M.shield -= 1;
      M.shieldFlash = 160;
      boomAt(Math.round(hx), Math.round(hy), 3);
      if (M.shield <= 0) {
        sfx('bossShieldBreak');
        w.rings.push({ x: Math.round(M.sx + M.w / 2), y: Math.round(M.y + M.h / 2), r: 4, life: 600, max: 600 });
        w.shake = 350;
        popAt(w, Math.round(M.sx + M.w / 2 - 20), Math.round(M.y - 8), 'SHIELD BROKEN!');
      } else {
        sfx('motherHit');
        popAt(w, Math.round(hx), Math.round(hy) - 6, 'CLINK');
      }
      return;
    }
    M.hp -= 1;
    if (M.hp <= 0) {
      M.hp = 0;
      M.state = 'dying';
      M.dieT = 2500;
      w.shake = 750;
      sfx('boomL');
      stopBossMusic(2400);
      popAt(w, Math.round(M.sx + M.w / 2 - 16), Math.round(M.y), 'CRITICAL!');
    } else {
      boomAt(Math.round(hx), Math.round(hy), 6);
      sfx('motherHit');
    }
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

  /* every kill feeds the chain: consecutive kills inside the window
     multiply the payout — ×1, ×1, ×1, then ×2, ×2, ×2, then ×3 …
     cap ×9. A streak is a skill, not a habit: it cools. */
  /* the sky answers skill: every fourteen kills the cabinet raises
     the SECTOR — more landers, faster cruise, hungrier tractor breeds,
     a mother who visits sooner. The old games never said it in words;
     they said it in pressure, and stamped a card on the glass. */
  var SECTOR_KILLS = 14;
  var SECTOR_LINES = { 2: 'THEY FIGHT BACK', 3: 'NO MERCY', 4: 'THE SKY BURNS', 5: 'DEEP SPACE', 6: 'FINAL FRONTIER' };
  /* the same arena-relative population cap for the souls: nine souls in
     a 160-column sky was a crowd, nine in a 427-column sky is a scene */
  function humCap(w) {
    var arena = Math.max(0.30, Math.min(1, (w && w.cols ? w.cols : 427) / 427));
    return Math.max(4, Math.round(9 * arena));
  }
  function sectorTune(w) {
    var s = ((w && w.sector) || 1) - 1;
    /* The reference arena is 427 columns wide (a 1280px tube at PXG 3).
       A phone's is 160 — 2.7x narrower — so an absolute cap and spawn
       rate put the SAME swarm into a third of the sky: measured on a
       390x844 tube the density was 2.2x desktop's, on top of the boss
       filling 74% of the screen. Scale the population to the room it
       has to fly in, with floors so a small tube is never empty.
       The player's own speed is deliberately NOT scaled — a thumb wants
       a ship that answers instantly. */
    var arena = w ? Math.max(0.30, Math.min(1, (w.cols || 427) / 427)) : 1;
    var capBase = 7 + Math.min(3, s);
    var rateBase = 1.1 + Math.min(1.2, s * 0.3);
    return {
      cap: Math.max(3, Math.round(capBase * arena)),            /* landers allowed aloft */
      rate: Math.max(0.7, rateBase * arena),                     /* spawn pressure */
      adv: 0.38 + Math.min(0.27, s * 0.07),                   /* tractor-breed ratio */
      drift: 1 + Math.min(0.5, s * 0.12),                     /* lander cruise speed */
      motherBase: Math.max(16000, 24000 - s * 3000),          /* her first visit */
      motherNext: Math.max(20000, 50000 - s * 7000),          /* between crossings */
      /* round 8: the guns learn the sector too — deeper sectors drop
         shells sooner, drop them faster, and steer them harder */
      bombCd: Math.max(1250, 2400 - s * 170),                 /* base gap between drops */
      bombRnd: Math.max(1600, 3200 - s * 230),                /* randomness window */
      bombV: 1 + Math.min(0.45, s * 0.07),                    /* shell fall speed */
      aim: 1 + Math.min(0.55, s * 0.09)                       /* homing sharpness */
    };
  }
  function sectorLine(n) { return SECTOR_LINES[n] || 'DEEP SPACE'; }
  function awardKill(w, base, killBonus) {
    w.chain = Math.min(9, (w.chain || 0) + 1);
    w.chainUntil = w.t + 2400;
    w.kills = (w.kills || 0) + (killBonus || 1);
    /* the dome charges in secret: the fourth kill gets a small chime */
    if ((w.kills || 0) === 4 && !w.mario) { sfx('ready'); }
    /* the sector ladder: every fourteen kills the pressure climbs */
    w.sectorKills = (w.sectorKills || 0) + (killBonus || 1);
    if (w.sectorKills >= SECTOR_KILLS && w.sector < 9) {
      /* the perfect check happens the instant the sector turns:
         did any soul go missing while this sector lived? */
      var keptAll = (w.humsLost || 0) === (w.sectorLostMark || 0);
      w.sectorLostMark = w.humsLost || 0;
      w.sectorKills = 0;
      w.sector = (w.sector || 1) + 1;
      w.banner = {
        l1: 'SECTOR ' + (w.sector < 10 ? '0' + w.sector : w.sector),
        l2: sectorLine(w.sector),
        until: performance.now() + 2300
      };
      blip(392, 90, 220);
      setTimeout(function () { blip(523, 90, 220); }, 100);
      setTimeout(function () { blip(659, 150, 220); }, 200);
      if (keptAll) {
        /* PERFECT: not one humanoid lost to this sector. The cabinet
           waits for the sector banner to bow out, then pays gold */
        var wRef = w;
        setTimeout(function () {
          if (world !== wRef || wRef.shipDead) { return; }
          wRef.score += 1000;
          bumpHi(wRef);
          wRef.banner = {
            l1: 'PERFECT',
            l2: '+1000  ALL SOULS KEPT',
            until: performance.now() + 2400
          };
          popAt(wRef, Math.round(wRef.cols / 2), Math.round(wRef.rows * 0.30), '+1000');
          sfx('perfect');
          perfectBrag = performance.now() + 90000;   /* the cabinet remembers */
        }, 2400);
      }
    }
    var mult = 1 + Math.floor((w.chain - 1) / 3);
    var pts = base * mult;
    w.score += pts;
    bumpHi(w);
    return pts;
  }
  /* score pops: a gold chip that climbs out of the wreck and fades —
     the cabinet telling you the shot was worth it */
  function popAt(w, sx, sy, str) {
    w.pops.push({ x: sx, y: sy, str: str, t0: w.t });
    if (w.pops.length > 8) { w.pops.shift(); }
  }
  /* round 11: the star burst — the summit of the ladder scatters a
     ring of gold and white sparks across the glass. Pixel motion:
     the ring expands in quantized steps and each spark dies as a
     four-point twinkle, never a smooth fade. */
  function starBurst(w, sx, sy) {
    var cols = ['#ffd76a', '#ffffff', '#ab8420', '#fff4cc'];
    for (var i = 0; i < 18; i++) {
      var an = (i / 18) * 6.28 + 0.13;
      var sp = 16 + (i % 3) * 11;
      w.sparks.push({
        x: sx, y: sy,
        vx: Math.cos(an) * sp, vy: Math.sin(an) * sp * 0.72,
        t0: w.t, life: 780 + (i % 4) * 130,
        col: cols[i % cols.length]
      });
    }
    /* round 13: the summit answers itself — half a beat later a second
       ring ignites from the same point, slower and wider and whiter,
       the afterglow a real firework leaves hanging in the sky. The
       delay is just a future t0: the mover and painter skip sparks
       that have not ignited yet. */
    for (var j = 0; j < 12; j++) {
      var an2 = (j / 12) * 6.28 + 0.39;
      var sp2 = 7 + (j % 3) * 5;
      w.sparks.push({
        x: sx, y: sy,
        vx: Math.cos(an2) * sp2, vy: Math.sin(an2) * sp2 * 0.72,
        t0: w.t + 340, life: 940 + (j % 4) * 150,
        col: (j % 3 === 0) ? '#ffd76a' : '#ffffff'
      });
    }
    /* round 14: the badge rains — half a beat after the afterglow,
       ten embers drip off the rank star at the alert row and slide
       down the glass, the summit's own confetti catching up with the
       pilot. The chrome seats the badge near the right edge only on
       a wide glass (the narrow law keeps the badge off a phone), so
       the rain is born only where the star actually hangs. */
    var scB = PXG <= 2 ? 2 : 1;
    if (10 + 141 * scB <= w.cols) {
      var xB = w.cols - 5 - Math.round(21 * scB);
      var yB = 2 + 15 * scB + 3;
      for (var r3 = 0; r3 < 10; r3++) {
        w.sparks.push({
          x: xB - 14 + (r3 % 5) * 7,
          y: yB + (r3 >= 5 ? 3 : 0),
          vx: (r3 % 2 ? 1 : -1) * (2 + (r3 % 3)),
          vy: 6 + (r3 % 4) * 4,
          t0: w.t + 680 + (r3 % 5) * 55,
          life: 900 + (r3 % 4) * 120,
          col: (r3 % 3 === 0) ? '#ffd76a' : '#fff4cc'
        });
      }
    }
    if (w.sparks.length > 64) { w.sparks.splice(0, w.sparks.length - 64); }
  }
  /* the cabinet in your hands: dual-rumble where the hardware has it
     (Chrome's vibrationActuator on gamepads) — silent elsewhere */
  function rumble(strong, weak, ms) {
    try {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) {
        var p = pads[i];
        if (p && p.vibrationActuator && p.vibrationActuator.playEffect) {
          p.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0, duration: ms,
            strongMagnitude: strong, weakMagnitude: weak
          });
        }
      }
    } catch (e) { /* no rumble, no grief */ }
  }

  /* a bomb's burst is impact damage: a shock ring, a scorch on the
     ridge, and everyone caught in the radius is gone — not just the
     one soul the shell touched */
  function blastAt(sx, sy, kind) {
    var w = world;
    if (!w) { return; }
    kind = kind || 'heavy';
    var wx = Math.round(sx + w.worldX);

    if (!w.craters) { w.craters = []; }
    var cRad = 13, cDep = 9, cLip = 2;
    var boomN = 22, ringR = 3, ringLife = 560;

    if (kind === 'penetrator') {
      sfx('blastPenetrator');
      cRad = 5; cDep = 18; cLip = 1;
      boomN = 18; ringR = 1; ringLife = 340;
      w.shake = Math.max(w.shake, 180);
    } else if (kind === 'incendiary') {
      sfx('blastIncendiary');
      cRad = 9; cDep = 6; cLip = 1.5;
      boomN = 12; ringR = 2; ringLife = 520;
      w.shake = Math.max(w.shake, 150);
      for (var emi = 0; emi < 6; emi++) {
        w.embers.push({
          x: sx + (Math.random() - 0.5) * 16,
          y: sy - Math.random() * 4,
          vy: 8 + Math.random() * 14,
          life: 800 + Math.random() * 900,
          max: 1700
        });
      }
    } else {
      sfx('blastHeavy');
      w.shake = Math.max(w.shake, 260);
    }

    w.craters.push({
      wx: wx,
      kind: kind,
      radius: cRad,
      depth: cDep,
      lip: cLip,
      created: w.t
    });
    if (w.craters.length > 35) { w.craters.shift(); }

    boomAt(sx, sy, boomN);
    w.rings.push({ x: sx, y: sy, r: ringR, life: ringLife, max: ringLife });
    w.scorch.push({ x: sx, y: sy, ttl: 9000, kind: kind });
    for (var j = 0; j < w.hums.length; j++) {
      var H = w.hums[j];
      if (H.gone || H.state !== 'ground') { continue; }
      var hx = H.wx - w.worldX;
      if (Math.abs(hx + 2 - sx) < (cRad + 2) && Math.abs(H.y + 4 - sy) < (cDep + 6)) {
        H.gone = true;
        sfx('humanScream');
        w.humsLost = (w.humsLost || 0) + 1;
        boomAt(Math.round(hx + 2), Math.round(H.y + 3), 6);
      }
    }
  }

  /* shooting a mutant is worth its grief: five hundred and a charge */
  function killMutant(mu) {
    var w = world;
    if (!w || mu.gone) { return; }
    mu.gone = true;
    var mpts = awardKill(w, 500);
    popAt(w, Math.round(mu.wx - w.worldX), Math.round(mu.y) - 2, '+' + mpts);
    boomAt(Math.round(mu.wx - w.worldX + 5), Math.round(mu.y + 3), 12);
    w.rings.push({ x: mu.wx - w.worldX + 5, y: mu.y + 3, r: 1, life: 360, max: 360 });
    sfx('boomS');
  }

  /* four kills charge the special; the button calls the plumber,
     the plumber brings the mushroom, the mushroom brings the beam */
  function fireSpecial() {
    var w = world;
    if (!w || w.shipDead || w.portal || w.mario) { return; }
    if ((w.kills || 0) < 4 || w.t < (w.laserUntil || 0)) { return; }
    w.kills = 0;
    /* the guest walks in along the visible lane, stops short of the
       ship, and lobs the mushroom in a high arc — no teleporting */
    w.mario = { t0: w.t, x: -14, y: Math.round(w.rows * 0.50), toss: 0, give: 0, p: 0, sx: 0, sy: 0 };
    pbtnState[0] = 2;
    paintPBtns();
    setTimeout(function () { pbtnState[0] = 0; paintPBtns(); }, 240);
    sfx('mario');   /* the overworld fanfare carries him in */
  }

  /* the wreck: enhanced visuals — shock rings, shake, staged fires,
     and the bezel demanding the next coin */
  function killShip(L) {
    var w = world;
    var S = w.ship;
    stopBossMusic(500);
    if (L) { L.gone = true; boomAt(Math.round(L.wx - w.worldX + 4), Math.round(L.y + 3), 12); }
    w.shipDead = true;
    w.shipDeadAt = w.t;
    /* the run is over: the score is kept for its pilot and the deck
       is promised to the other player — the cabinet alternates */
    if (w.humanRun) {
      pScores[curPlayer] = w.score;
      pPlayed[curPlayer] = true;
    }
    w.nextPlayer = curPlayer === 1 ? 2 : 1;
    /* the plate owns the glass: the idle show stands down at once */
    closeAttractShow();
    attractIdleMs = 0;
    /* a human who beat a kept record signs the glass before anything
       else happens: three letters, the oldest arcade ritual */
    if (w.humanRun && w.score > 0 && w.score > (w.hiAtRunStart || 0) && !hiEntry) {
      hiEntry = { letters: hiName.split(''), idx: 0, locked: 0, idle: 0, pt: 0, score: w.score };
      paintGoPlate();
    }
    w.ds1 = w.ds2 = w.ds3 = 0;
    w.shake = 750;
    w.flash = 520;
    /* the crash you feel before you read it: one long pulse, and the
       cab falls silent for exactly as long as a heart skips */
    if (typeof navigator !== 'undefined' && navigator.vibrate) { navigator.vibrate([40, 60, 90]); }
    boomAt(Math.round(S.x + 15), Math.round(S.y + 6), 34);
    w.rings.push({ x: S.x + 15, y: S.y + 6, r: 2, life: 620, max: 620 });
    w.rings.push({ x: S.x + 15, y: S.y + 6, r: 1, life: 430, max: 430 });
    /* the machine's farewell: the full walk-down arrangement once the
       wreck has settled — the oldest sad phrase on the glass */
    if (w.humanRun) {
      setTimeout(function () { sfx('gameover'); }, 780);
      w.banner = { l1: 'GAME OVER', l2: 'INSERT COIN', until: 1e15, keepText: true, dim: true };
      playT = 0; coinGrace = 0;
      html.classList.remove('coin-hidden');
      paintCredit(); paintCoinLabel();
    }
    sfx('boomL');
    rumble(1, 0.55, 420);   /* the pad gasps with her */
  }

  /* the unibeam: one strike of the infinite lance — every hull in the
     lane ahead is cut down, every bomb in the path is vaporised. The
     beam itself is rendered in renderWorld; this is its bite. */
  function beamStrike() {
    var w = world;
    if (!w || w.shipDead) { return; }
    var S = w.ship;
    var dir = S.face || 1;
    var flip = dir < 0;
    var muzzX = flip ? Math.round(S.x) - 2 : Math.round(S.x) + sprW(SPR_SHIP) + 1;
    var sy = Math.round(S.y + S.hopY) + 5;
    var scanX = muzzX;
    var limX = flip ? -3 : w.cols + 3;
    var hitX = limX;
    while (flip ? scanX > limX : scanX < limX) {
      var trW = terrRow(Math.floor(w.worldX) + scanX, w.rows);
      if (sy >= trW - 1) { hitX = scanX; break; }
      scanX += flip ? -2 : 2;
    }
    for (var k = w.landers.length - 1; k >= 0; k--) {
      var L = w.landers[k];
      if (L.gone) { continue; }
      var lsx = L.wx - w.worldX;
      var ahead = dir > 0 ? (lsx > S.x + 2 && lsx < hitX) : (lsx < S.x + sprW(SPR_SHIP) && lsx > hitX);
      if (ahead && lsx > -8 && lsx < w.cols + 8 && Math.abs(L.y + 3 - sy) < 6) {
        L.gone = true;
        sfx('boomLander');
        var bpts = awardKill(w, L.type === 'tractor' ? 300 : 150);
        popAt(w, Math.round(lsx), Math.round(L.y) - 2, '+' + bpts);
        boomAt(Math.round(lsx + 5), Math.round(L.y + 3), 9);
        if (L.target) {
          if (L.target.targetedBy === L) { L.target.targetedBy = null; }
          if (L.target.state === 'held' || L.target.state === 'pulled') {
            L.target.state = 'fall';
            L.target.vy = 0;
            L.target.held = null;
            sfx('humanFall');
          }
          L.target = null;
        }
      }
    }
    for (var b2 = w.bombs.length - 1; b2 >= 0; b2--) {
      var bo2 = w.bombs[b2];
      var ahead2 = dir > 0 ? (bo2.x > S.x && bo2.x < hitX) : (bo2.x < S.x + sprW(SPR_SHIP) && bo2.x > hitX);
      if (ahead2 && Math.abs(bo2.y - sy) < 5) {
        bo2.gone = true;
        boomAt(Math.round(bo2.x), Math.round(bo2.y), 6);
      }
    }
    for (var m3 = w.mutants.length - 1; m3 >= 0; m3--) {
      var mu3 = w.mutants[m3];
      if (mu3.gone) { continue; }
      var mx3 = mu3.wx - w.worldX;
      var ahead3 = dir > 0 ? (mx3 > S.x && mx3 < hitX) : (mx3 < S.x + sprW(SPR_SHIP) && mx3 > hitX);
      if (ahead3 && Math.abs(mu3.y + 3 - sy) < 6) { killMutant(mu3); }
    }
    if (w.mother && w.mother.state !== 'dying') {
      var moB = w.mother;
      var moBX = moB.sx;
      var mwB = moB.w || 144, mhB = moB.h || 76;
      var aheadM = dir > 0 ? (moBX + mwB > S.x && moBX < hitX) : (moBX < S.x + sprW(SPR_SHIP) && moBX + mwB > hitX);
      if (aheadM && moBX > -mwB && moBX < w.cols + mwB && sy >= moB.y + 4 && sy <= moB.y + mhB - 4) {
        hitMother(moB, Math.max(moB.sx + 8, Math.min(moB.sx + mwB - 8, hitX)), sy);
      }
    }
  }

  /* the three player verbs — wired to FIRE / JUMP / the joystick */
  function fireShip(user) {
    var w = world;
    if (!w) { return; }
    var S = w.ship;
    S.lastFire = w.t;
    /* while the gift burns, the gun IS the beam: one continuous lance,
       zero-length bolts — the FIRE dome and SPACE pull the same beam */
    if (w.t < (w.laserUntil || 0)) {
      w.beamUntil = w.t + 240;
      beamStrike();
      if (user) { sfx('laser'); }
      return;
    }
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
      w.bullets.push({
        x: noseX, y: sy, vx: vx, vy: vy, dir: dir, gone: false,
        laser: false
      });
      if (user) { sfx('fire'); }
    }
  }
  function hopShip() {
    if (!world || world.shipDead) { return; }
    world.ship.hopV = -36;
    pbtnState[0] = 2;
    paintPBtns();
    setTimeout(function () { pbtnState[0] = 0; paintPBtns(); }, 240);
  }
  /* The old touch stick used this: it teleported the ship nine columns
     per tap, which is a nudge, not flight. joyApply() writes `keys`
     instead, and the sim does the moving — so this is only the sound
     and the flip cue now, and nothing calls it during a run. */
  function bankShip(right) {
    var w = world;
    if (!w) { return; }
    w.ship.x = Math.max(6, Math.min(w.cols * 0.62, w.ship.x + (right ? 9 : -9)));
    if (!right) { w.ship.flipUntil = w.t + 650; }
    sfx('thruster');
  }

  function stepWorld(dt) {
    var w = world;
    if (!w) { return; }
    var ds = dt / 1000;
    w.t += dt;
    w.worldX += 22 * ds;
    /* the odometer: the glass counts toward its truth instead of
       snapping — a Defender cabinet never simply shows a number,
       it performs it. Gold while the roll is still running. */
    if (w.dispScore == null) { w.dispScore = w.score || 0; }
    if (w.dispScore !== w.score) {
      var sDiff = w.score - w.dispScore;
      var sStep = Math.abs(sDiff) > 300 ? Math.ceil(Math.abs(sDiff) / 14) : 2;
      w.dispScore += (sDiff > 0 ? 1 : -1) * Math.min(Math.abs(sDiff), sStep);
    }
    if (w.flash > 0) { w.flash = Math.max(0, w.flash - dt); }
    bossMusicReconcile(w, dt);
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

    /* a shooting star now and then — the sky is alive tonight */
    if (!w.meteor && Math.random() < ds * 0.14) {
      w.meteor = {
        x: w.cols * (0.25 + Math.random() * 0.75),
        y: Math.random() * w.rows * 0.28,
        vx: -(46 + Math.random() * 54),
        vy: 10 + Math.random() * 14,
        life: 1100
      };
    }
    if (w.meteor) {
      var mt = w.meteor;
      mt.x += mt.vx * ds;
      mt.y += mt.vy * ds;
      mt.life -= dt;
      if (mt.life <= 0 || mt.x < -8 || mt.y > w.rows * 0.5) { w.meteor = null; }
    }

    /* the chain is a streak, not a habit: cool it down when the
       window burns out */
    if ((w.chain || 0) > 0 && w.t > (w.chainUntil || 0)) { w.chain = 0; }

    /* the dreadnought mothership boss: arena lock, twin plasma turrets,
       ventral particle death ray, multi-bomb barrages, and staged meltdown */
    if (w.bossWarning > 0) { w.bossWarning -= dt; }
    if (!w.mother) {
      w.motherCd -= dt;
      if (w.motherCd <= 0 && !w.shipDead) { spawnMother(w); }
    } else {
      var Mo = w.mother;
      var mw = Mo.w || 144, mh = Mo.h || 76;
      /* every literal that used to assume a 144-wide hull, derived once */
      var MTR = motherTrim(mw, mh);
      if (Mo.hitFlash > 0) { Mo.hitFlash -= dt; }
      if (Mo.shieldFlash > 0) { Mo.shieldFlash -= dt; }
      if (Mo.dropFlash > 0) { Mo.dropFlash -= dt; }

      if (Mo.state === 'dying') {
        Mo.dieT -= dt;
        Mo.sparkCd = (Mo.sparkCd || 0) - dt;
        if (Mo.sparkCd <= 0) {
          Mo.sparkCd = 90 + Math.random() * 80;
          var exX = Math.round(Mo.sx + MTR.edge + Math.random() * Math.max(2, mw - MTR.edge * 2));
          var exY = Math.round(Mo.y + mh * 0.1 + Math.random() * mh * 0.7);
          boomAt(exX, exY, 14);
          sfx('motherHit');
          w.shake = 300;
        }
        if (Mo.dieT <= 0) {
          var cx = Math.round(Mo.sx + mw / 2);
          var cy = Math.round(Mo.y + mh / 2);
          var pts = awardKill(w, 5000, 5);
          w.mother = null;
          w.motherCd = 60000 + Math.random() * 35000;
          boomAt(cx, cy, 55);
          boomAt(cx - MTR.burst, cy, 35);
          boomAt(cx + MTR.burst, cy, 35);
          boomAt(cx, cy - MTR.burstIn, 30);
          boomAt(cx, cy + MTR.burstIn, 30);
          w.rings.push({ x: cx, y: cy, r: 4, life: 850, max: 850 });
          w.rings.push({ x: cx, y: cy, r: 2, life: 650, max: 650 });
          w.flash = 800;
          w.shake = 1000;
          w.cheerUntil = w.t + 4500;
          popAt(w, cx - MTR.burst, cy - 10, '+' + pts + ' BOSS DEFEATED!');
          rumble(1, 1.0, 850);
          sfx('motherDown');
          sfx('defstar');
          stopBossMusic();
          for (var bi = 0; bi < w.bombs.length; bi++) {
            w.bombs[bi].gone = true;
            boomAt(Math.round(w.bombs[bi].x), Math.round(w.bombs[bi].y), 3);
          }
        }
      } else {
        var phase3 = Mo.hp <= 10;
        var phase2 = Mo.shield <= 0 && !phase3;
        var spdMult = phase3 ? 1.45 : (phase2 ? 1.2 : 1.0);

        if (Mo.state === 'enter') {
          Mo.sx += Mo.vx * ds;
          if (Mo.dir > 0 ? (Mo.sx >= w.cols * 0.08) : (Mo.sx <= w.cols * 0.92 - mw)) {
            Mo.state = 'battle';
            Mo.vx = 22 * Mo.dir;
          }
        } else {
          /* arena lock standoff — patrol smoothly across upper sky.
             The standoff is her own margin, not a literal 10: on a
             160-column arena a fixed 10 plus a 144-wide hull inverted
             the two bounds (maxSx 6 < minSx 10) and she flickered
             between them instead of patrolling. */
          Mo.sx += Mo.vx * spdMult * ds;
          var mg = typeof Mo.margin === 'number' ? Mo.margin : 10;
          var minSx = mg;
          var maxSx = w.cols - mw - mg;
          if (maxSx <= minSx) { maxSx = minSx; }   /* one slot: she holds station */
          if (Mo.sx <= minSx) {
            Mo.sx = minSx;
            Mo.vx = Math.abs(Mo.vx);
            Mo.dir = 1;
          } else if (Mo.sx >= maxSx) {
            Mo.sx = maxSx;
            Mo.vx = -Math.abs(Mo.vx);
            Mo.dir = -1;
          }
        }

        Mo.y = Mo.base + Math.sin(w.t * (phase3 ? 0.0036 : 0.0016) + Mo.ph) * (phase3 ? 14 : 7);

        /* Phase 3 Meltdown FX */
        if (phase3) {
          if (bossMusicSource && bossMusicSource.playbackRate && bossMusicSource.playbackRate.value !== 1.15) {
            try { bossMusicSource.playbackRate.value = 1.15; } catch (e) {}
          }
          Mo.smokeCd = (Mo.smokeCd || 0) - dt;
          if (Mo.smokeCd <= 0) {
            Mo.smokeCd = 120 + Math.random() * 90;
            var smkX = Math.round(Mo.sx + (Mo.dir < 0 ? mw - MTR.edge : MTR.edge) + (Math.random() - 0.5) * (mw * 0.14));
            var smkY = Math.round(Mo.y + mh * 0.45 + (Math.random() - 0.5) * 12);
            boomAt(smkX, smkY, 2);
          }
          Mo.sparkCd = (Mo.sparkCd || 0) - dt;
          if (Mo.sparkCd <= 0) {
            Mo.sparkCd = 350 + Math.random() * 240;
            var spkX = Math.round(Mo.sx + MTR.inner + Math.random() * Math.max(2, mw - MTR.inner * 2));
            var spkY = Math.round(Mo.y + mh * 0.16 + Math.random() * mh * 0.6);
            boomAt(spkX, spkY, 4);
            blip(140, 60, 160);
          }
        }

        /* Twin Ventral Turrets Attack — inset by her own hull fractions,
           so both muzzles stay on the ship when she is a phone-sized
           boss and neither ends up hanging in the sky beside her. */
        Mo.turretCd -= dt;
        if (Mo.turretCd <= 0) {
          Mo.turretCd = phase3 ? 1100 + Math.random() * 600 : (phase2 ? 1600 + Math.random() * 700 : 2200 + Math.random() * 800);
          var tX1 = Mo.sx + MTR.tX, tY1 = Mo.y + mh - MTR.tY;
          var tX2 = Mo.sx + mw - MTR.tX, tY2 = Mo.y + mh - MTR.tY;
          var pX = w.ship.x + 15, pY = w.ship.y + 6;
          var dX1 = pX - tX1, dY1 = pY - tY1;
          var dist1 = Math.sqrt(dX1 * dX1 + dY1 * dY1) || 1;
          var dX2 = pX - tX2, dY2 = pY - tY2;
          var dist2 = Math.sqrt(dX2 * dX2 + dY2 * dY2) || 1;
          var bSpd = phase3 ? 9.5 : 7.5;
          if (!Mo.bolts) { Mo.bolts = []; }
          Mo.bolts.push({ x: tX1, y: tY1, vx: (dX1 / dist1) * bSpd, vy: Math.max(3, (dY1 / dist1) * bSpd), life: 3200 });
          Mo.bolts.push({ x: tX2, y: tY2, vx: (dX2 / dist2) * bSpd, vy: Math.max(3, (dY2 / dist2) * bSpd), life: 3200 });
          sfx('bossTurret');
        }

        /* Ventral Particle Death Ray (Phase 2 & 3) */
        if (phase2 || phase3) {
          Mo.beamCd -= dt;
          if (Mo.beamState === 'idle' && Mo.beamCd <= 0) {
            Mo.beamState = 'charge';
            Mo.beamT = 1100;
            Mo.beamX = Math.round(Mo.sx + mw / 2);
            blip(880, 140, 200);
          } else if (Mo.beamState === 'charge') {
            Mo.beamT -= dt;
            Mo.beamX = Math.round(Mo.sx + mw / 2);
            if (Mo.beamT <= 0) {
              Mo.beamState = 'fire';
              Mo.beamT = 900;
              sfx('bossLaser');
              w.shake = 450;
            }
          } else if (Mo.beamState === 'fire') {
            Mo.beamT -= dt;
            Mo.beamX = Math.round(Mo.sx + mw / 2);
            if (!w.shipDead && !w.portal && w.t >= (w.invUntil || 0)) {
              if (Math.abs(w.ship.x + 15 - Mo.beamX) < 14 && (w.ship.y + 6) >= Mo.y + mh - 10) {
                killShip(null);
              }
            }
            var bTerrY = terrRow(Math.round(Mo.beamX + w.worldX), w.rows);
            if (Math.random() < 0.6) {
              boomAt(Mo.beamX + Math.round((Math.random() - 0.5) * 8), bTerrY - 2, 2);
            }
            if (Mo.beamT <= 0) {
              Mo.beamState = 'idle';
              Mo.beamCd = phase3 ? 4200 + Math.random() * 2000 : 6500 + Math.random() * 2500;
            }
          }
        }

        /* Bomb Barrages */
        Mo.bombsCd = (Mo.bombsCd || 4500) - dt;
        if (Mo.bombsCd <= 0) {
          Mo.bombsCd = phase3 ? 3000 + Math.random() * 1500 : (phase2 ? 4500 + Math.random() * 1800 : 6000 + Math.random() * 2200);
          var bCenX = Mo.sx + Math.round(mw / 2);
          var bCenY = Mo.y + mh - 8;
          if (phase3) {
            w.bombs.push({ x: bCenX - 35, y: bCenY, vx: -3, vy: 5, kind: 'incendiary', noHoming: true, gone: false });
            w.bombs.push({ x: bCenX, y: bCenY + 2, vx: 0, vy: 6, kind: 'incendiary', noHoming: true, gone: false });
            w.bombs.push({ x: bCenX + 35, y: bCenY, vx: 3, vy: 5, kind: 'incendiary', noHoming: true, gone: false });
          } else if (phase2) {
            w.bombs.push({ x: bCenX - 30, y: bCenY, vx: -2.5, vy: 6, kind: 'heavy', noHoming: true, gone: false });
            w.bombs.push({ x: bCenX, y: bCenY + 2, vx: 0, vy: 9, kind: 'penetrator', noHoming: true, gone: false });
            w.bombs.push({ x: bCenX + 30, y: bCenY, vx: 2.5, vy: 6, kind: 'incendiary', noHoming: true, gone: false });
          } else {
            w.bombs.push({ x: bCenX, y: bCenY, vx: (Math.random() - 0.5) * 3, vy: 6.5, kind: 'heavy', noHoming: true, gone: false });
          }
        }

        /* Escort Deployment */
        Mo.dropCd -= dt;
        if (Mo.dropCd <= 0 && w.landers.length < 8) {
          Mo.dropCd = phase3 ? 3500 + Math.random() * 1500 : 5000 + Math.random() * 2000;
          spawnLanderAt(Mo.sx + Math.round(mw / 2), Mo.y + mh - 6);
          Mo.dropFlash = 350;
          blip(196, 120, 98);
        }

        /* Turret Bolts Simulation */
        if (Mo.bolts && Mo.bolts.length) {
          for (var bi = Mo.bolts.length - 1; bi >= 0; bi--) {
            var blt = Mo.bolts[bi];
            blt.x += blt.vx * ds;
            blt.y += blt.vy * ds;
            blt.life -= dt;
            var bltTerr = terrRow(Math.round(blt.x + w.worldX), w.rows);
            if (blt.life <= 0 || blt.x < -20 || blt.x > w.cols + 20 || blt.y > bltTerr || blt.y < 0) {
              if (blt.y >= bltTerr) { boomAt(Math.round(blt.x), Math.round(bltTerr), 2); }
              Mo.bolts.splice(bi, 1);
              continue;
            }
            if (!w.shipDead && !w.portal && w.t >= (w.invUntil || 0)) {
              if (Math.abs(blt.x - (w.ship.x + 15)) < 11 && Math.abs(blt.y - (w.ship.y + w.ship.hopY + 6)) < 8) {
                boomAt(Math.round(blt.x), Math.round(blt.y), 6);
                Mo.bolts.splice(bi, 1);
                killShip(null);
              }
            }
          }
        }

        /* Player Ship Ramming Collision */
        if (Mo.state !== 'dying' && !w.shipDead && !w.portal && w.t >= (w.invUntil || 0)) {
          var pBoxL = w.ship.x + 4, pBoxR = w.ship.x + 26;
          var pBoxT = w.ship.y + w.ship.hopY + 2, pBoxB = w.ship.y + w.ship.hopY + 10;
          var mBoxL = Mo.sx + 8, mBoxR = Mo.sx + mw - 8;
          var mBoxT = Mo.y + 6, mBoxB = Mo.y + mh - 8;
          if (pBoxR > mBoxL && pBoxL < mBoxR && pBoxB > mBoxT && pBoxT < mBoxB) {
            boomAt(Math.round(w.ship.x + 15), Math.round(w.ship.y + 6), 18);
            popAt(w, Math.round(w.ship.x), Math.round(w.ship.y - 6), 'RAMMED!');
            killShip(null);
          }
        }
      }
    }

    /* landers — spawn, drift, pick up humanoids, lift them away.
       the SECTOR decides how many the sky can hold and how fast
       they arrive: pressure by the numbers, not by the hand */
    var tune = sectorTune(w);
    if (w.landers.length < tune.cap && Math.random() < ds * tune.rate) { spawnLander(); }
    for (i = 0; i < w.landers.length; i++) {
      var L = w.landers[i];
      L.wx += L.drift * ds;
      if (L.wx - w.worldX < -8) {
        if (L.target) {
          if (L.target.targetedBy === L) { L.target.targetedBy = null; }
          if (L.target.state === 'held' || L.target.state === 'pulled') {
            L.target.state = 'fall';
            L.target.vy = 0;
            L.target.held = null;
          }
          L.target = null;
        }
        L.gone = true;
        continue;
      }
      var lsx0 = L.wx - w.worldX;
      if (!w.shipDead && !w.portal && w.t >= (w.invUntil || 0) &&
          Math.abs(lsx0 + 7 - (w.ship.x + 15)) < 15 &&
          Math.abs(L.y + 4 - (w.ship.y + w.ship.hopY + 6)) < 7) {
        killShip(L);
        continue;
      }
      if (L.state === 'drift') {
        /* drift is a steady bob — nobody jinks here. A sky that
           sidesteps bullets turns every shot into a coin flip, so
           the ships hold their line and take their medicine. */
        var bobY = L.base + Math.sin(w.t * 0.0021 + L.ph) * 4;
        if (L.rey) {
          /* returning from an aborted dive or a dead beam: climb
             back into the lane at an honest pace, never snap */
          var rstep = 90 * ds;
          if (Math.abs(L.rey) <= rstep) { L.rey = 0; }
          else { L.rey -= (L.rey > 0 ? rstep : -rstep); }
        }
        L.y = bobY + (L.rey || 0);
        L.grabCd -= dt;
        if (L.grabCd <= 0) {
          for (j = 0; j < w.hums.length; j++) {
            var cand = w.hums[j];
            if (cand.state !== 'ground') { continue; }
            if (cand.targetedBy && cand.targetedBy !== L && !cand.targetedBy.gone) { continue; }
            if (L.type === 'tractor') {
              /* the advanced ship claims a soul within reach, then
                 begins the ceremony: glide over, settle, reach */
              var cd2 = Math.abs(cand.wx - L.wx);
              if (cd2 < 110) {
                cand.targetedBy = L;
                L.state = 'beam';
                L.target = cand;
                L.hoverUntil = 0;
                L.reachAt = 0;
                L.laneY = 0;
                /* the dive to the settle lane: brisk from high up,
                   gentle from near — never a plummet */
                L.descV = Math.max(30, Math.min(70, (L.y - (cand.y - 75)) / 2.5));
                break;
              }
            } else if (Math.abs(cand.wx - L.wx) < 26) {
              cand.targetedBy = L;
              L.state = 'descend';
              L.target = cand;
              break;
            }
          }
          if (L.state !== 'descend' && L.state !== 'beam') { L.grabCd = 4000 + Math.random() * 8000; }
        }
      } else if (L.state === 'beam') {
        /* the tractor beam is a ceremony, not a snatch: glide over
           the mark and down to the settle lane, hover one beat, then
           reach down with the light. The soul is only caught when the
           column finally touches it, and the pull is patient. If the
           mark is lost, the beam dies and the soul falls */
        var tg = L.target;
        if (!tg || tg.gone || tg.targetedBy !== L || (tg.state !== 'ground' && tg.state !== 'pulled')) {
          L.rey = L.y - (L.base + Math.sin(w.t * 0.0021 + L.ph) * 4);
          L.state = 'drift';
          L.grabCd = 5000 + Math.random() * 4000;
          L.hoverUntil = 0; L.reachAt = 0; L.laneY = 0;
          if (tg && tg.targetedBy === L) {
            tg.targetedBy = null;
            if (tg.state === 'pulled') { tg.state = 'fall'; tg.vy = 0; tg.held = null; sfx('humanFall'); }
          }
          L.target = null;
        } else if (tg.state === 'ground') {
          /* the approach: slide over the mark and down to the lane */
          var adx = tg.wx - L.wx;
          var ady = (tg.y - 75) - L.y;   /* the settle lane: 74 px over the crown */
          if (Math.abs(adx) > 3 || Math.abs(ady) > 2) {
            if (Math.abs(adx) > 3) { L.wx += (adx > 0 ? 1 : -1) * Math.min(Math.abs(adx), 34 * ds); }
            if (ady > 2) { L.y += Math.min(ady, (L.descV || 30) * ds); }
            else if (ady < -2) { L.y -= Math.min(-ady, 24 * ds); }
          } else {
            /* settled: hold the lane with a nervous hover tremble */
            L.wx = tg.wx;
            if (!L.laneY) { L.laneY = L.y; }
            L.y = L.laneY + Math.sin(w.t * 0.003 + L.ph) * 2.5;
            if (!L.hoverUntil) { L.hoverUntil = w.t + 500; blip(660, 70, 520); }
            if (w.t >= L.hoverUntil) {
              if (!L.reachAt) { L.reachAt = w.t; blip(196, 420, 349); }
              /* the light crawls down at 110 px/s — you can watch it come */
              if (L.y + 9 + (w.t - L.reachAt) * 0.11 >= tg.y - 1) {
                tg.state = 'pulled';
                tg.vy = 0;
                tg.held = L;
                blip(920, 80, 1560);   /* the catch chirp */
              }
            }
          }
        } else {
          /* reeling: the soul rides straight up its own column of
             light — 30 px/s, a pull you can race. The step is capped
             so a stalled frame can never yank the soul */
          tg.wx = L.wx + 3;   /* centred in the light */
          tg.y -= Math.min(30 * ds, 3);
          var gYt = terrRow(Math.round(tg.wx), w.rows) - 8;
          if (tg.y > gYt) { tg.y = gYt; }
          if (tg.y <= L.y + 9) { tg.state = 'held'; tg.held = L; L.state = 'lift'; sfx('liftCreak'); }
        }
      } else if (L.state === 'descend') {
        var tgt = L.target;
        if (!tgt || tgt.gone || tgt.targetedBy !== L || tgt.state !== 'ground') {
          /* the mark was lost mid-dive: climb home instead of
             teleporting back to the lane */
          L.rey = L.y - (L.base + Math.sin(w.t * 0.0021 + L.ph) * 4);
          L.state = 'drift';
          L.grabCd = 6000;
          if (tgt && tgt.targetedBy === L) { tgt.targetedBy = null; }
          L.target = null;
        }
        else {
          L.wx += (tgt.wx > L.wx ? 1 : -1) * Math.min(Math.abs(tgt.wx - L.wx), 7 * ds);
          var gY = terrRow(Math.round(L.wx), w.rows) - 10;
          L.y += (gY > L.y ? 1 : -1) * Math.min(Math.abs(gY - L.y), 9 * ds);
          if (Math.abs(gY - L.y) < 1.4 && Math.abs(tgt.wx - L.wx) < 1.4) {
            L.state = 'lift';
            tgt.state = 'held';
            tgt.held = L;
            sfx('liftCreak');
          }
        }
      } else if (L.state === 'lift') {
        var tgL = L.target;
        if (!tgL || tgL.gone || tgL.state !== 'held' || tgL.held !== L) {
          L.rey = L.y - (L.base + Math.sin(w.t * 0.0021 + L.ph) * 4);
          L.state = 'drift';
          L.grabCd = 6000;
          if (tgL && tgL.targetedBy === L) { tgL.targetedBy = null; }
          L.target = null;
        } else {
          /* a lift you can watch — and interrupt. The climb is labored:
             the hull wobbles harder the higher it gets, dragging its
             freight, and the stolen soul kicks in its grip */
          L.y -= 40 * ds;
          L.liftWob = Math.min(1, (L.liftWob || 0) + ds * 0.5);
          if (L.y < w.rows * 0.26) {
            /* high enough. The ceremony begins: the lander kills its
               drift and hangs in the sky with its catch */
            L.state = 'transmute';
            L.tmAt = w.t;
            L.tmStage = 0;
            L.tmY = L.y;
            L.liftWob = 0;
            sfx('mutCharge');
          }
        }
      } else if (L.state === 'transmute') {
        /* THE CEREMONY — three beats, about a second and a half:
           charge — the soul strobes, violet sparks spiral inward,
                     the lander trembles under the strain
           dissolve — the soul un-writes itself from the feet up,
                      raining motes of light back to the ground
           reform  — the mutant writes itself in from the crown down,
                     red on white, then tears loose with a shockwave */
        var tgT = L.target;
        if (!tgT || tgT.gone || tgT.state !== 'held' || tgT.held !== L) {
          /* the mark was lost mid-ceremony: climb home, alone */
          L.rey = L.y - (L.base + Math.sin(w.t * 0.0021 + L.ph) * 4);
          L.state = 'drift';
          L.grabCd = 6000;
          L.tmAt = 0; L.tmStage = 0;
          if (tgT && tgT.targetedBy === L) { tgT.targetedBy = null; }
          L.target = null;
        } else {
          var ageT = w.t - L.tmAt;
          L.y = L.tmY + Math.sin(w.t * 0.021) * 1.2;
          if (ageT < 450) {
            L.tmStage = 0;
          } else if (ageT < 950) {
            if (L.tmStage < 1) { L.tmStage = 1; sfx('mutDissolve'); }
          } else if (ageT < 1500) {
            if (L.tmStage < 2) { L.tmStage = 2; sfx('mutReform'); }
          } else {
            /* the burst: Defender's law fulfilled — the soul and ship fuse
               into a mutant */
            var actMuts = 0;
            for (var am = 0; am < w.mutants.length; am++) { if (!w.mutants[am].gone) { actMuts++; } }
            if (actMuts < 6) {
              w.mutants.push({
                wx: L.wx, y: Math.max(8, Math.round(L.y + 4)),
                ph: Math.random() * 6.28, gone: false
              });
            }
            sfx('mutBurst');
            boomAt(Math.round(L.wx - w.worldX + 5), Math.round(L.y + 6), 12);
            w.rings.push({ x: L.wx - w.worldX + 5, y: L.y + 6, r: 1, life: 420, max: 420 });
            w.rings.push({ x: L.wx - w.worldX + 5, y: L.y + 6, r: 2, life: 560, max: 560 });
            w.shake = Math.max(w.shake, 220);
            tgT.targetedBy = null;
            tgT.held = null;
            tgT.gone = true;
            w.humsLost = (w.humsLost || 0) + 1;
            L.gone = true;
            w.hums.push({
              wx: w.worldX + w.cols * 2 + Math.random() * w.cols,
              y: 0, state: 'ground', vy: 0, held: null, targetedBy: null, ph: Math.random() * 6.28
            });
          }
        }
      }
      if (!L.gone) {
        var trL = Math.min(
          terrRow(Math.round(L.wx - 6), w.rows),
          Math.min(terrRow(Math.round(L.wx), w.rows), terrRow(Math.round(L.wx + 6), w.rows))
        );
        if (L.y > trL - 10) { L.y = trL - 10; }
      }
    }

    /* bombs fall from landers, home gently, burst on the terrain.
       The cadence is the sector's: deep space throws sooner, throws
       faster, and its shells steer like they mean it */
    w.bombCd -= dt;
    if (w.bombCd <= 0 && w.landers.length) {
      var btune = sectorTune(w);
      w.bombCd = btune.bombCd + Math.random() * btune.bombRnd;
      var thrower = w.landers[Math.floor(Math.random() * w.landers.length)];
      if (thrower) {
        /* pick the nearest person — only if they are visible ON-SCREEN within range */
        var tgtH = null, td = 100;
        for (j = 0; j < w.hums.length; j++) {
          if (w.hums[j].state !== 'ground') { continue; }
          var hxs0 = w.hums[j].wx - w.worldX;
          if (hxs0 < 12 || hxs0 > w.cols - 12) { continue; }
          var dd = Math.abs(w.hums[j].wx - thrower.wx);
          if (dd < td) { td = dd; tgtH = w.hums[j]; }
        }
        var bKind = 'heavy';
        var rndB = Math.random();
        if (thrower.type === 'tractor') {
          bKind = rndB < 0.5 ? 'heavy' : 'penetrator';
        } else {
          bKind = rndB < 0.45 ? 'incendiary' : (rndB < 0.85 ? 'heavy' : 'penetrator');
        }
        var vyMult = bKind === 'penetrator' ? 1.45 : (bKind === 'incendiary' ? 0.9 : 1.0);
        w.bombs.push({
          x: thrower.wx - w.worldX, y: thrower.y + 7,
          vx: (Math.random() - 0.5) * 4,
          vy: 7 * btune.bombV * vyMult,
          tgt: tgtH || null,
          kind: bKind,
          gone: false
        });
      }
    }
    var bTune = sectorTune(w);
    var bAim = bTune.aim;
    for (i = 0; i < w.bombs.length; i++) {
      var bo = w.bombs[i];
      var bKind = bo.kind || 'heavy';
      bo.vy += 7 * bTune.bombV * ds;

      if (!bo.noHoming) {
        if (bo.txw != null) {
          var txs = bo.txw - w.worldX;
          if (txs >= 10 && txs <= w.cols - 10) {
            bo.vx += Math.max(-4 * bAim, Math.min(4 * bAim, (txs - bo.x) * 0.4)) * ds * 2;
          }
        }
        /* the aim: re-pick if the mark dies, flees, or moves off-screen */
        if (bo.tgt) {
          if (bo.tgt.gone || bo.tgt.state !== 'ground') {
            bo.tgt = null;
          } else {
            var txsCur = bo.tgt.wx - w.worldX;
            if (txsCur < 10 || txsCur > w.cols - 10) { bo.tgt = null; }
          }
        }
        if (!bo.tgt) {
          var nb2 = null, nd2 = 80;
          for (j = 0; j < w.hums.length; j++) {
            var Hg = w.hums[j];
            if (Hg.gone || Hg.state !== 'ground') { continue; }
            var hxScr = Hg.wx - w.worldX;
            if (hxScr < 12 || hxScr > w.cols - 12) { continue; }
            var dg2 = Math.abs(hxScr - bo.x);
            if (dg2 < nd2) { nd2 = dg2; nb2 = Hg; }
          }
          bo.tgt = nb2;
        }
        if (bo.tgt) {
          var txs2 = bo.tgt.wx - w.worldX;
          var steerForce = Math.max(-5 * bAim, Math.min(5 * bAim, (txs2 - bo.x) * 0.5));
          bo.vx += steerForce * ds * 2.2;
        }
      }

      /* strictly clamp horizontal velocity so bombs drop into terrain, not off-screen */
      var maxVx = bKind === 'penetrator' ? 1.8 : (bKind === 'incendiary' ? 4.0 : 3.5);
      bo.vx = Math.max(-maxVx, Math.min(maxVx, bo.vx));

      bo.x += bo.vx * ds;
      bo.y += bo.vy * ds;

      /* despawn if drifting off left or right screen edges */
      if (bo.x < -24 || bo.x > w.cols + 24) { bo.gone = true; continue; }
      /* a bomb that reaches a person bursts — and the burst has a
         radius: impact damage, not a single-tag kill */
      for (j = 0; j < w.hums.length; j++) {
        var Hb = w.hums[j];
        if (Hb.gone || Hb.state !== 'ground') { continue; }
        var hxs = Hb.wx - w.worldX;
        if (Math.abs(bo.x - hxs - 2) < 3.5 && Math.abs(bo.y - (Hb.y + 4)) < 5) {
          bo.gone = true;
          blastAt(Math.round(hxs + 2), Math.round(Hb.y + 4), bo.kind);
          break;
        }
      }
      if (bo.gone) { continue; }
      if (!w.shipDead && !w.portal && w.t >= (w.invUntil || 0) &&
          Math.abs(bo.x - (w.ship.x + 15)) < 12 && Math.abs(bo.y - (w.ship.y + w.ship.hopY + 6)) < 7) {
        bo.gone = true;
        blastAt(Math.round(bo.x), Math.round(bo.y), bo.kind);
        killShip(null);
        continue;
      }
      var bR = terrRow(Math.round(bo.x + w.worldX), w.rows);
      if (bo.y >= bR - 1) {
        bo.gone = true;
        blastAt(Math.round(bo.x), bR - 1, bo.kind);
      }
    }

    /* ship — hands on the stick? then the attract pilot stands down:
       WASD flies, the wander resumes a beat after the keys go quiet */
    var S = w.ship;
    if (w.shipDead) {
      /* the wreck dies in stages — fires along the hull, then silence.
         NO ghost: no thrust, no drift, no bullets from a dead gun. */
      var stg = w.t - w.shipDeadAt;
      if (stg > 200 && !w.ds1) { w.ds1 = 1; boomAt(Math.round(S.x + 8), Math.round(S.y + 4), 10); }
      if (stg > 430 && !w.ds2) { w.ds2 = 1; boomAt(Math.round(S.x + 20), Math.round(S.y + 6), 8); }
      if (stg > 720 && !w.ds3) { w.ds3 = 1; boomAt(Math.round(S.x + 14), Math.round(S.y + 2), 6); }
      /* attract continue: if no hand has touched the deck for a while,
         the show must go on — the demo pilot re-enters via a portal
         (never while the glass waits for a signature) */
      if (!hiEntry && !w.portal && w.t - w.shipDeadAt > 3400 && w.t - (w.lastManualAt || 0) > 4500) {
        w.shipDead = false;
        w.ds1 = w.ds2 = w.ds3 = 0;
        w.portal = { t0: w.t };
        w.banner = null;
        /* the hand that left has left: the revived pilot is the demo
           again — its runs must never feed the players' ledger, and
           the ladder it climbed goes back on the rack */
        w.humanRun = false;
        w.rankTier = 1;
        blip(196, 160, 392);
      }
    }
    if (w.mario) {
      var M = w.mario;
      if (w.shipDead) {
        w.mario = null;   /* no gift for a wreck */
      } else if (!M.give) {
        var goalX = Math.max(2, S.x - 18);
        if (M.x < goalX - 1) {
          M.x = Math.min(goalX, M.x + 46 * ds);   /* the guest hustles */
        } else if (!M.toss) {
          M.toss = w.t;
          sfx('toss');
        }
        if (M.toss) {
          /* the mushroom flies a real arc: it tracks the ship's LIVE
              position, rises, falls into the hull — never a teleport */
          M.p = Math.min(1, (w.t - M.toss) / 720);
          var handX = M.x + 9, handY = M.y + 5;
          M.sx = handX + ((S.x + 6) - handX) * M.p;
          M.sy = handY + ((S.y + S.hopY + 4) - handY) * M.p - Math.sin(M.p * Math.PI) * 14;
          if (M.p >= 1) {
            M.give = w.t;
            w.laserUntil = w.t + 30000;
            w.beamUntil = 0;
            boomAt(Math.round(S.x + 6), Math.round(S.y + S.hopY + 4), 10);
            w.rings.push({ x: S.x + 6, y: S.y + 5, r: 1, life: 420, max: 420 });
            w.rings.push({ x: S.x + 6, y: S.y + 5, r: 2, life: 620, max: 620 });
            sfx('powerup');   /* the mushroom keeps its promise */
          }
        }
      } else {
        M.x -= 54 * ds;   /* bows out — the beam is yours now */
      }
      if (M.x < -18 || (M.give && w.t - M.give > 1800)) { w.mario = null; }
    }
    if (w.portal && w.t - w.portal.t0 >= 1500) {
      w.portal = null;
      w.invUntil = w.t + 3000;   /* three seconds of grace, blinking */
      boomAt(Math.round(S.x + 4), Math.round(S.y + 5), 10);
      w.rings.push({ x: S.x + 4, y: S.y + 5, r: 2, life: 420, max: 420 });
    }
    if (!w.shipDead) {
      var mv = 0, mh = 0;
      if (keys.w || padKeys.w) { mv -= 1; }
      if (keys.s || padKeys.s) { mv += 1; }
      if (keys.a || padKeys.a) { mh -= 1; }
      if (keys.d || padKeys.d) { mh += 1; }
      if (w.portal) { mv = 0; mh = 0; }   /* the gate holds her still */
      if (mv !== 0 || mh !== 0) { S.manualUntil = w.t + 2600; }
      if (mh !== 0) {
        if (S.face !== mh) { sfx('thruster'); }
        S.face = mh;
      }
      if (w.t < (S.manualUntil || 0)) {
        S.x += mh * 70 * ds;
        S.y += mv * 46 * ds;
        if (S.x < 1) { S.x = 1; }
        if (S.x > w.cols - 10) { S.x = w.cols - 10; }
        if (S.y < w.rows * 0.16) { S.y = w.rows * 0.16; }
        /* the ground is real: sample the ridge in WORLD space (the old
            code fed screen x into a world-space function, so the floor
            lied). Flying into the terrain kills her — no sliding on it */
        if (!w.portal && w.t >= (w.invUntil || 0)) {
          var trBack = terrRow(Math.floor(w.worldX) + Math.round(S.x + 4), w.rows);
          var trMid  = terrRow(Math.floor(w.worldX) + Math.round(S.x + 15), w.rows);
          var trFront = terrRow(Math.floor(w.worldX) + Math.round(S.x + 26), w.rows);
          var trMin = Math.min(trBack, Math.min(trMid, trFront));
          if (S.y + 11 >= trMin) { killShip(null); }
        }
      } else {
        S.face = 1;
        S.tyCd -= dt;
        if (S.tyCd <= 0) {
          S.tyCd = 1500 + Math.random() * 1500;
          S.ty = w.rows * (0.36 + Math.random() * 0.12);
        }
        S.y += (S.ty - S.y) * Math.min(1, ds * 1.6);
        /* the demo pilot never dies by mountain: a soft floor, sampled
           where the terrain actually lives */
        var floorBack = terrRow(Math.floor(w.worldX) + Math.round(S.x + 4), w.rows) - 11;
        var floorMid  = terrRow(Math.floor(w.worldX) + Math.round(S.x + 15), w.rows) - 11;
        var floorFront = terrRow(Math.floor(w.worldX) + Math.round(S.x + 26), w.rows) - 11;
        var floorY = Math.min(floorBack, Math.min(floorMid, floorFront));
        if (S.y > floorY) { S.y = floorY; }
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
      var laserOn = w.t < (w.laserUntil || 0);
      if (laserOn) {
        /* the unibeam: while the gift burns, holding SPACE — or the
           attract pilot alone — keeps ONE infinite lance lit */
        var wantBeam = !w.portal && (keys.space || padFire || w.t >= (S.manualUntil || 0));
        if (wantBeam) {
          if ((w.beamUntil || 0) < w.t) { w.beamUntil = w.t + 90; }
          if (S.fireCd <= 0) {
            S.fireCd = 170;
            w.beamUntil = w.t + 240;
            beamStrike();
            sfx((keys.space || padFire) ? 'laser' : 'fire');
          }
        } else {
          w.beamUntil = 0;
        }
      } else if ((keys.space || padFire) && !w.portal && S.fireCd <= 0) {
        /* a held SPACE (or pad A) rides the cooldown: consecutive shots */
        S.fireCd = 260;
        fireShip(true);
      } else if (!w.portal && !(keys.space || padFire) && w.t >= (S.manualUntil || 0) && S.fireCd <= 0) {
        /* the auto-gun only fires while the attract pilot is alone; a
           hand on the keys means SPACE is the only trigger */
        S.fireCd = 620 + Math.random() * 1100;
        fireShip(false);
      }
    }

    /* bullets fly, hit terrain, hit landers, pop starbursts */
    for (i = 0; i < w.bullets.length; i++) {
      var b = w.bullets[i];
      b.x += b.vx * ds;
      b.y += b.vy * ds;
      if (b.x > w.cols + 4 || b.x < -6 || b.y > w.rows || b.y < 0) { b.gone = true; continue; }
      /* the ground eats shots — the terrain is solid, in world space */
      var trB = terrRow(Math.floor(w.worldX) + Math.round(b.x), w.rows);
      if (b.y >= trB - 1) {
        b.gone = true;
        boomAt(Math.round(b.x), trB - 1, 4);
        continue;
      }
      for (var k = 0; k < w.landers.length; k++) {
        var Ld = w.landers[k];
        if (Ld.gone) { continue; }
        var lsx = Ld.wx - w.worldX;
        if (Math.abs(b.x - (lsx + 4)) < 5 && Math.abs(b.y - (Ld.y + 3)) < 4.5) {
          if (!b.laser) { b.gone = true; }   /* lasers punch through */
          Ld.gone = true;
          var lpts = awardKill(w, Ld.type === 'tractor' ? 300 : 150);
          popAt(w, Math.round(lsx), Math.round(Ld.y) - 2, '+' + lpts);
          boomAt(Math.round(lsx + 4), Math.round(Ld.y + 3), 9);
          sfx('boomLander');
          if (Ld.target) {
            if (Ld.target.targetedBy === Ld) { Ld.target.targetedBy = null; }
            if (Ld.target.state === 'held' || Ld.target.state === 'pulled') {
              Ld.target.state = 'fall';
              Ld.target.vy = 0;
              Ld.target.held = null;
              sfx('humanFall');
            }
            Ld.target = null;
          }
          break;
        }
      }
      /* mutants take hits too — and pay five hundred */
      if (!b.gone) {
        for (var m2 = 0; m2 < w.mutants.length; m2++) {
          var muB = w.mutants[m2];
          if (muB.gone) { continue; }
          var mxB = muB.wx - w.worldX;
          if (Math.abs(b.x - (mxB + 5)) < 6 && Math.abs(b.y - (muB.y + 3)) < 5) {
            if (!b.laser) { b.gone = true; }
            killMutant(muB);
            break;
          }
        }
      }
         /* the dreadnought boss takes hits: box test against her 144x76 hull */
         if (!b.gone && w.mother && w.mother.state !== 'dying') {
           var MoX = Math.round(w.mother.sx);
           var MoY = Math.round(w.mother.y);
           var mwH = w.mother.w || 144, mhH = w.mother.h || 76;
           if (b.x >= MoX + 4 && b.x <= MoX + mwH - 4 && b.y >= MoY + 4 && b.y <= MoY + mhH - 4) {
             if (!b.laser) { b.gone = true; }
             hitMother(w.mother, b.x, b.y);
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
      } else if (H.state === 'pulled') {
        /* the beam owns the ride; if its ship dies mid-pull, drop */
        if (!H.held || H.held.gone) { H.state = 'fall'; H.vy = 0; H.held = null; sfx('humanFall'); }
      } else if (H.state === 'fall') {
        H.vy += 30 * ds;
        H.y += H.vy * ds;
        var gY2 = terrRow(Math.round(H.wx), w.rows) - 8;
        if (H.y >= gY2) {
          H.y = gY2;
          H.state = 'ground';
          H.vy = 0;
          H.held = null;
          H.targetedBy = null;
          H.cheerUntil = w.t + 1600;   /* saved: arms up, one happy hop */
          sfx('rescue');
          w.score += 250;
          bumpHi(w);
          boomAt(Math.round(H.wx - w.worldX), Math.round(gY2 + 3), 3);
        }
      }
      if (H.wx - w.worldX < -6) {
        if (H.targetedBy && H.targetedBy.target === H) {
          H.targetedBy.target = null;
        }
        H.targetedBy = null;
        H.held = null;
        H.gone = true;
        w.humsLost = (w.humsLost || 0) + 1;
      }
    }

    /* mutants — the stolen souls, hunting the ship that failed them */
    for (i = 0; i < w.mutants.length; i++) {
      var mu = w.mutants[i];
      if (mu.gone) { continue; }
      var mux = mu.wx - w.worldX;
      var dxm = (S.x + 15) - (mux + 5);
      var dym = (S.y + S.hopY + 6) - (mu.y + 4);
      mu.wx += Math.max(-42, Math.min(42, dxm)) * ds;
      mu.y += Math.max(-30, Math.min(30, dym)) * ds + Math.sin(w.t * 0.006 + mu.ph) * 8 * ds;
      var trM = Math.min(
        terrRow(Math.round(mu.wx - 5), w.rows),
        Math.min(terrRow(Math.round(mu.wx), w.rows), terrRow(Math.round(mu.wx + 5), w.rows))
      );
      if (mu.y > trM - 9) { mu.y = trM - 9; }
      if (mu.y < 6) { mu.y = 6; }
      if (!w.shipDead && !w.portal && w.t >= (w.invUntil || 0) &&
          Math.abs(mux + 5 - (S.x + 15)) < 15 && Math.abs(mu.y + 4 - (S.y + S.hopY + 6)) < 7) {
        killShip(null);
      }
      if (mux < -12) { mu.gone = true; }
    }
    w.humCd -= dt;
    /* ── THE PLANET FALLS · Defender's endgame ───────── */
    /* When the last soul is gone the cabinet finally loses its
       temper: nobody new walks in, the ridge burns, and every
       lander aloft turns at once. The planet is reborn only when
       the last stolen soul pays. (As long as ONE soul lives, the
       trickle continues like it always did.) */
    var liveHums2 = 0;
    for (i = 0; i < w.hums.length; i++) { if (!w.hums[i].gone) { liveHums2++; } }
    var liveMuts = 0;
    for (i = 0; i < w.mutants.length; i++) { if (!w.mutants[i].gone) { liveMuts++; } }
    /* while the planet is fallen — or fully lost — the sky holds
       its gate: no new soul walks into an empty world */
    if (w.humCd <= 0 && w.hums.length < humCap(w) && !w.planetFall && liveHums2 > 0) {
      w.humCd = 4200;
      w.hums.push({
        wx: w.worldX + w.cols + Math.random() * w.cols,
        y: 0, state: 'ground', vy: 0, held: null, targetedBy: null, ph: Math.random() * 6.28
      });
    }
    if (!w.planetFall) {
      if (liveHums2 === 0 && w.landers.length > 0 && !w.shipDead) {
        w.zeroHumsT = (w.zeroHumsT || 0) + dt;
        if (w.zeroHumsT >= 5000) {
          var conv = 0;
          for (i = w.landers.length - 1; i >= 0; i--) {
            var Lf = w.landers[i];
            if (Lf.target && Lf.target.targetedBy === Lf) {
              Lf.target.targetedBy = null;
              Lf.target.held = null;
            }
            Lf.target = null;
            w.mutants.push({
              wx: Lf.wx, y: Lf.y, ph: Math.random() * 6.28, gone: false
            });
            boomAt(Math.round(Lf.wx - w.worldX), Math.round(Lf.y + 4), 8);
            Lf.gone = true;
            conv++;
          }
          if (conv > 0) {
            w.planetFall = true;
            w.zeroHumsT = 0;
            w.flash = 700;
            w.shake = 700;
            rumble(1, 0.9, 700);
            w.banner = {
              l1: 'THE PLANET FALLS',
              l2: 'THEY TURN FURIOUS',
              until: performance.now() + 2600
            };
            blip(392, 300, 196);
            setTimeout(function () { blip(262, 300, 131); }, 340);
            setTimeout(function () { blip(98, 520, 55); }, 700);
          }
        }
      } else {
        w.zeroHumsT = 0;
      }
    } else if (liveMuts === 0) {
      /* the last stolen soul paid: the planet is reborn, the little
         people walk out of the gate cheering, nine strong */
      w.planetFall = false;
      w.zeroHumsT = 0;
      w.hums = [];
      for (i = 0; i < 9; i++) {
        w.hums.push({
          wx: w.worldX + 24 + Math.random() * w.cols * 2.4,
          y: 0, state: 'ground', vy: 0, held: null, targetedBy: null, ph: Math.random() * 6.28
        });
      }
      w.humCd = 4200;
      w.cheerUntil = w.t + 3000;
      w.flash = 900;
      w.banner = {
        l1: 'PLANET RESTORED',
        l2: 'THE SKY IS QUIET',
        until: performance.now() + 2600
      };
      blip(392, 110);
      setTimeout(function () { blip(523, 110); }, 120);
      setTimeout(function () { blip(659, 110); }, 240);
      setTimeout(function () { blip(784, 220); }, 360);
    }

    for (i = 0; i < w.rings.length; i++) {
      w.rings[i].r += 26 * ds;
      w.rings[i].life -= dt;
    }
    w.rings = w.rings.filter(function (r) { return r.life > 0; });
    /* round 11: the celebration sparks fly out and gutter */
    for (i = w.sparks.length - 1; i >= 0; i--) {
      var spk = w.sparks[i];
      if (w.t - spk.t0 > spk.life) { w.sparks.splice(i, 1); continue; }
      if (w.t < spk.t0) { continue; }   /* round 13: not ignited yet */
      spk.x += spk.vx * ds;
      spk.y += spk.vy * ds;
      spk.vy += 4 * ds;   /* the faintest falling wish */
    }
    /* the fallen world's ridge sheds embers: hot pixels rise off the
       scar, slow, and gutter out — the sim's own campfire */
    if (w.planetFall) {
      w.emberCd -= dt;
      if (w.emberCd <= 0) {
        w.emberCd = 130 + Math.random() * 170;
        var ex = Math.random() * w.cols;
        w.embers.push({
          x: ex, y: terrRow(Math.round(ex), w.rows) + 1,
          vy: 8 + Math.random() * 10, life: 900 + Math.random() * 700
        });
      }
    }
    for (i = 0; i < w.embers.length; i++) {
      var ems = w.embers[i];
      ems.y -= ems.vy * ds * 0.06;
      ems.x += Math.sin((w.t + i * 613) * 0.004) * 0.08 * ds;
      ems.life -= dt;
    }
    w.embers = w.embers.filter(function (em2) { return em2.life > 0; });
    for (i = 0; i < w.scorch.length; i++) { w.scorch[i].ttl -= dt; }
    w.scorch = w.scorch.filter(function (sc2) { return sc2.ttl > 0; });
    if (w.shake > 0) { w.shake = Math.max(0, w.shake - dt); }

    /* the paid clock: coins buy seconds; the slot sleeps while it
       runs and wakes the moment the last second burns */
    if (playT > 0) {
      var prevSec = Math.ceil(playT / 1000);
      playT = Math.max(0, playT - dt);
      if (playT === 0) {
        html.classList.remove('coin-hidden');
        paintCredit(); paintCoinLabel();
      } else {
        if (Math.ceil(playT / 1000) !== prevSec) { paintCredit(); }
        var g0 = coinGrace;
        coinGrace = Math.max(0, coinGrace - dt);
        if (g0 > 0 && coinGrace === 0) { html.classList.add('coin-hidden'); }
      }
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
    w.mutants = w.mutants.filter(function (m) { return !m.gone; });
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
    g.save();
    if (w.shake > 0) {
      var shk = w.shake / 750;
      g.translate(Math.round((Math.random() * 2 - 1) * 3 * shk),
                  Math.round((Math.random() * 2 - 1) * 2 * shk));
    }

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

    /* a shooting star — white head, gold dithering tail, gone fast */
    if (mode === 'hero' && w.meteor) {
      var mtR = w.meteor;
      var hxR = Math.round(mtR.x), hyR = Math.round(mtR.y);
      g.fillStyle = '#ffffff';
      g.fillRect(hxR, hyR, 2, 1);
      g.fillStyle = PC.starG;
      g.fillRect(hxR + 2, hyR - 1, 2, 1);
      g.fillRect(hxR + 4, hyR - 2, 1, 1);
      g.fillStyle = PC.star2;
      g.fillRect(hxR + 5, hyR - 3, 1, 1);
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
       title card owns the glass; boot mode keeps the dusk palette.
       While the planet is fallen the near ridge abandons gold for a
       red-lit scar — the ground itself remembers what was taken */
    var heroMode = mode === 'hero';
    var isFall = !!w.planetFall;
    var PAL = !isFall
      ? {
          crestSpec:  '#ffffff',  /* diamond specular glint */
          crestHi:    '#fff2a8',  /* bright phosphor gold */
          crestBase:  '#f5b041',  /* rich amber gold */
          crestLo:    '#d97706',  /* deep solar gold */
          mossHi:     '#34d399',  /* subtle emerald bio-moss tips */
          mossLo:     '#059669',
          strataHi:   '#92400e',  /* warm copper sandstone */
          strataBase: '#78350f',  /* rich umber loam */
          strataLo:   '#451a03',  /* deep terracotta */
          rockHi:     '#4c1d63',  /* cosmic purple basalt */
          rockBase:   '#311440',
          rockDim:    '#1c0c24',
          bedrock:    '#0f0714',  /* deep cavern mantle */
          goldVein:   '#ffd700',  /* raw gold ore */
          goldSh:     '#b45309',
          cyanGem:    '#00f0ff',  /* glowing cyan crystal */
          cyanSh:     '#008099',
          amethyst:   '#c084fc',  /* glowing amethyst geode */
          amethystSh: '#7e22ce'
        }
      : {
          crestSpec:  '#ffffff',
          crestHi:    '#fed7aa',
          crestBase:  '#f97316',
          crestLo:    '#ea580c',
          mossHi:     '#c2410c',
          mossLo:     '#9a3412',
          strataHi:   '#7c2d12',
          strataBase: '#5c1d0a',
          strataLo:   '#451a03',
          rockHi:     '#431407',
          rockBase:   '#2c0b0e',
          rockDim:    '#1a0608',
          bedrock:    '#0e0304',
          goldVein:   '#ff4500',
          goldSh:     '#7c2d12',
          cyanGem:    '#ffaa00',
          cyanSh:     '#9a3412',
          amethyst:   '#ef4444',
          amethystSh: '#450a0a'
        };

    /* far mountains — slow silhouette ridge */
    var fx0 = Math.floor(w.worldX * 0.22);
    for (var sx = 0; sx < cols; sx++) {
      var ftr = farRow(fx0 + sx, rows);
      g.fillStyle = heroMode ? '#0b0918' : PC.far;
      g.fillRect(sx, ftr, 1, rows - ftr);
      if (hash01(fx0 + sx) > 0.45) {
        g.fillStyle = heroMode ? '#16122e' : PC.mid;
        g.fillRect(sx, ftr, 1, 1);
      }
    }

    /* mid mountains — silhouette with a lit top edge */
    var mx0 = Math.floor(w.worldX * 0.45);
    for (sx = 0; sx < cols; sx++) {
      var mtr = midRow(mx0 + sx, rows);
      g.fillStyle = heroMode ? '#131024' : PC.mid;
      g.fillRect(sx, mtr, 1, rows - mtr);
      if (hash01(mx0 + sx) > 0.4) {
        g.fillStyle = heroMode ? '#251c3e' : PC.midEdge;
        g.fillRect(sx, mtr, 1, 1);
      }
    }

    /* near terrain — rich 16-bit arcade pixel art ground */
    var wx0 = Math.floor(w.worldX);

    /* Pass 1: Geological strata & subterranean bedrock with run-length batching */
    for (sx = 0; sx < cols; sx++) {
      var wx = wx0 + sx;
      var tr = terrRow(wx, rows);
      var hv = hash01(wx);
      var sWave1 = Math.sin(wx * 0.045 + 1.2) * 2.2 + vnoise(wx, 29) * 2.8;
      var sWave2 = Math.sin(wx * 0.024 + 3.1) * 3.2 + vnoise(wx, 47) * 3.5;
      var sWave3 = Math.sin(wx * 0.013 + 0.5) * 4.2 + vnoise(wx, 73) * 4.0;

      var nearCrater = null;
      var cDist = 999;
      if (w.craters && w.craters.length) {
        for (var ci = 0; ci < w.craters.length; ci++) {
          var cCand = w.craters[ci];
          var cdx = Math.abs(wx - cCand.wx);
          if (cdx <= cCand.radius && cdx < cDist) {
            cDist = cdx;
            nearCrater = cCand;
          }
        }
      }

      var curCol = null, runStart = tr;
      for (var sy = tr; sy < rows; sy++) {
        var depth = sy - tr;
        var pCol;

        if (nearCrater && depth < (nearCrater.kind === 'penetrator' ? 18 : 6)) {
          if (nearCrater.kind === 'incendiary') {
            if (depth === 0) {
              pCol = (wx + Math.floor(t / 110)) % 3 === 0 ? '#fbbf24' : '#ea580c';
            } else if (depth === 1) {
              pCol = (wx % 2 === 0) ? '#ea580c' : '#9a3412';
            } else {
              pCol = '#451a03';
            }
          } else if (nearCrater.kind === 'penetrator') {
            if (depth >= 13 && depth <= 17) {
              pCol = (wx % 2 === 0) ? PAL.goldVein : PAL.cyanGem;
            } else if (depth < 6) {
              pCol = '#09080d';
            } else {
              pCol = bayerAt(sx, sy) > 0.4 ? '#181524' : '#09080d';
            }
          } else {
            if (depth === 0) {
              pCol = hv > 0.5 ? '#47415e' : '#262338';
            } else if (depth <= 2) {
              pCol = '#1a1727';
            } else {
              pCol = bayerAt(sx, sy) > 0.3 ? '#262338' : '#14121f';
            }
          }
        } else if (depth === 0) {
          pCol = hv > 0.88 ? PAL.crestSpec : (hv > 0.40 ? PAL.crestHi : (hv > 0.18 ? PAL.crestBase : PAL.crestLo));
        } else if (depth === 1) {
          pCol = hv > 0.72 ? PAL.crestHi : (hv > 0.35 ? PAL.crestBase : (hv > 0.12 ? PAL.crestLo : PAL.strataHi));
        } else if (depth === 2 || depth === 3) {
          var mCut = bayerAt(sx, sy);
          pCol = (hv > 0.65 && mCut > 0.4) ? PAL.crestLo : (mCut > 0.3 ? PAL.strataHi : PAL.strataBase);
        } else if (depth < 12) {
          var bPos = depth - 4 + sWave1;
          if (bPos >= 2.0 && bPos <= 4.2) {
            pCol = bayerAt(sx, sy) > 0.25 ? PAL.strataHi : PAL.strataBase;
          } else if (bPos >= 6.5 && bPos <= 8.5) {
            pCol = PAL.strataLo;
          } else {
            pCol = bayerAt(sx, sy) > (depth - 4) / 9.0 ? PAL.strataBase : PAL.strataLo;
          }
          if (hash01(wx * 13 + depth * 19) > 0.95) { pCol = PAL.goldVein; }
        } else if (depth < 28) {
          var bPos2 = depth - 12 + sWave2;
          var isGold = (bPos2 >= 2.2 && bPos2 <= 4.0) && (hash01(wx * 5 + 7) > 0.60);
          var isCyan = (bPos2 >= 7.5 && bPos2 <= 9.2) && (hash01(wx * 3 + 19) > 0.64);
          var isAmeth = (bPos2 >= 13.0 && bPos2 <= 14.8) && (hash01(wx * 7 + 41) > 0.70);
          if (isGold) { pCol = bayerAt(sx, sy) > 0.3 ? PAL.goldVein : PAL.goldSh; }
          else if (isCyan) { pCol = bayerAt(sx, sy) > 0.25 ? PAL.cyanGem : PAL.cyanSh; }
          else if (isAmeth) { pCol = bayerAt(sx, sy) > 0.3 ? PAL.amethyst : PAL.amethystSh; }
          else if (bPos2 >= 5.0 && bPos2 <= 6.8) { pCol = PAL.rockHi; }
          else { pCol = bayerAt(sx, sy) > (depth - 12) / 16.0 ? PAL.rockBase : PAL.rockDim; }
        } else {
          var tDeep = Math.min(1.0, (depth - 28) / 36.0);
          var cellX = Math.floor(wx / 22);
          var cellY = Math.floor(depth / 16);
          var fSeed = hash01(cellX * 97 + cellY * 31);
          var rX = (wx % 22) - 11;
          var rY = (depth % 16) - 8;
          var dist = rX * rX + rY * rY;
          if (fSeed > 0.95 && dist <= 14) {
            pCol = dist <= 3 ? ((wx + depth) % 2 === 0 ? PAL.cyanGem : PAL.crestHi) : (bayerAt(sx, sy) > 0.4 ? '#64748b' : PAL.rockHi);
          } else if (fSeed > 0.90 && dist <= 10) {
            pCol = bayerAt(sx, sy) > 0.35 ? PAL.goldVein : PAL.goldSh;
          } else {
            pCol = bayerAt(sx, sy) > tDeep ? PAL.rockDim : PAL.bedrock;
          }
        }

        if (pCol !== curCol) {
          if (curCol !== null) {
            g.fillStyle = curCol;
            g.fillRect(sx, runStart, 1, sy - runStart);
          }
          curCol = pCol;
          runStart = sy;
        }
      }
      if (curCol !== null && runStart < rows) {
        g.fillStyle = curCol;
        g.fillRect(sx, runStart, 1, rows - runStart);
      }
    }

    /* Pass 2: Landmark Surface Props & Animated Flora */
    var colOccupied = 0;
    for (sx = 3; sx < cols - 8; sx++) {
      if (colOccupied > 0) { colOccupied--; continue; }
      var wxP = wx0 + sx;
      var trP = terrRow(wxP, rows);
      var trNext = terrRow(wxP + 1, rows);
      var slope = Math.abs(trNext - trP);
      var pSeed = hash01(wxP * 37 + 11);

      /* 1. Ancient Runic Obelisk / Monolith (width 6, height 13) */
      if (pSeed > 0.982 && slope <= 2) {
        colOccupied = 8;
        var pulse = Math.sin(t * 0.004 + wxP);
        var glyphCol = pulse > 0 ? PAL.cyanGem : PAL.crestHi;
        for (var dy = 0; dy < 13; dy++) {
          var py = trP - 13 + dy;
          var curW = dy < 2 ? 2 : (dy < 5 ? 4 : 6);
          var startX = sx + Math.floor((6 - curW) / 2);
          for (var px = startX; px < startX + curW; px++) {
            var bCol;
            if (px === startX) { bCol = '#94a3b8'; }
            else if (px === startX + curW - 1) { bCol = '#334155'; }
            else if ((dy === 4 || dy === 7 || dy === 10) && px === startX + 1) { bCol = glyphCol; }
            else { bCol = '#64748b'; }
            g.fillStyle = bCol;
            g.fillRect(px, py, 1, 1);
          }
        }
        for (var px2 = sx - 1; px2 < sx + 7; px2++) {
          g.fillStyle = PAL.crestBase;
          g.fillRect(px2, trP - 1, 1, 1);
        }
      }
      /* 2. Bioluminescent Crystal Cluster (width 6, height 9) */
      else if (pSeed > 0.965 && slope <= 2) {
        colOccupied = 6;
        var cType = hash01(wxP * 17) > 0.5;
        var cHi = cType ? PAL.cyanGem : PAL.amethyst;
        var cSh = cType ? PAL.cyanSh : PAL.amethystSh;
        for (var dy2 = 0; dy2 < 9; dy2++) {
          g.fillStyle = dy2 === 0 ? PAL.crestSpec : cHi;
          g.fillRect(sx + 2, trP - 9 + dy2, 1, 1);
          g.fillStyle = cSh;
          g.fillRect(sx + 3, trP - 9 + dy2, 1, 1);
        }
        for (var dy3 = 0; dy3 < 6; dy3++) {
          g.fillStyle = cHi;
          g.fillRect(sx, trP - 6 + dy3, 1, 1);
          g.fillStyle = cSh;
          g.fillRect(sx + 1, trP - 6 + dy3, 1, 1);
        }
        g.fillStyle = cHi;
        g.fillRect(sx + 4, trP - 4, 1, 4);
        if ((Math.floor(t * 0.003 + wxP) % 3) === 0) {
          g.fillStyle = '#ffffff';
          g.fillRect(sx + 2, trP - 10, 1, 1);
          g.fillRect(sx + 1, trP - 9, 3, 1);
        }
      }
      /* 3. Glowing Spore Mushroom Colony */
      else if (pSeed > 0.948 && slope <= 2) {
        colOccupied = 5;
        var mCap = hash01(wxP * 7) > 0.5 ? '#f43f5e' : '#ec4899';
        g.fillStyle = mCap;
        g.fillRect(sx, trP - 4, 4, 1);
        g.fillRect(sx - 1, trP - 3, 6, 1);
        g.fillStyle = '#be185d';
        g.fillRect(sx - 1, trP - 2, 6, 1);
        g.fillStyle = '#ffffff';
        g.fillRect(sx, trP - 4, 1, 1);
        g.fillRect(sx + 3, trP - 3, 1, 1);
        g.fillStyle = '#fdf4ff';
        g.fillRect(sx + 1, trP - 2, 1, 2);
        g.fillStyle = '#cbd5e1';
        g.fillRect(sx + 2, trP - 2, 1, 2);
        g.fillStyle = mCap;
        g.fillRect(sx + 4, trP - 2, 1, 1);
        g.fillStyle = '#fdf4ff';
        g.fillRect(sx + 4, trP - 1, 1, 1);
      }
      /* 4. Chunky 3D Pixel Boulder */
      else if (pSeed > 0.925) {
        colOccupied = 4;
        g.fillStyle = PAL.crestHi;
        g.fillRect(sx, trP - 3, 3, 1);
        g.fillStyle = '#94a3b8';
        g.fillRect(sx - 1, trP - 2, 1, 1);
        g.fillStyle = '#64748b';
        g.fillRect(sx, trP - 2, 2, 1);
        g.fillStyle = '#334155';
        g.fillRect(sx + 2, trP - 2, 1, 1);
        g.fillStyle = '#1e293b';
        g.fillRect(sx - 1, trP - 1, 4, 1);
      }
      /* 5. Cosmic Wildflower Blossom */
      else if (pSeed > 0.900) {
        var fCol = hash01(wxP * 19) > 0.5 ? '#f59e0b' : '#38bdf8';
        g.fillStyle = fCol;
        g.fillRect(sx, trP - 3, 1, 1);
        g.fillRect(sx - 1, trP - 2, 3, 1);
        g.fillStyle = '#ffffff';
        g.fillRect(sx, trP - 2, 1, 1);
        g.fillStyle = PAL.crestLo;
        g.fillRect(sx, trP - 1, 1, 1);
      }
      /* 6. Wind-Swaying Phosphor Grass & Fern Tufts */
      else if (pSeed > 0.810) {
        var sway = Math.round(Math.sin(t * 0.003 + wxP * 0.18));
        g.fillStyle = PAL.crestBase;
        g.fillRect(sx, trP - 1, 1, 2);
        g.fillStyle = PAL.mossHi;
        g.fillRect(sx - 1 + sway, trP - 3, 1, 2);
        g.fillStyle = PAL.crestHi;
        g.fillRect(sx + 1 + sway, trP - 4, 1, 3);
      }
      /* 7. Floating Ridge Bio-Spores & Fireflies */
      if (hash01(wxP * 43) > 0.955) {
        var flyY = trP - 3 - Math.floor(Math.abs(Math.sin(t * 0.003 + wxP * 0.4)) * 8);
        var flyCol = (Math.floor(t * 0.004 + wxP) % 2 === 0) ? PAL.crestSpec : PAL.cyanGem;
        g.fillStyle = flyCol;
        g.fillRect(sx, flyY, 1, 1);
      }
    }

    /* embers off the fallen world's ridge — hot pixels climbing off
       the scar and fading. Spawned by the sim, drawn here, gone fast */
    for (i = 0; i < w.embers.length; i++) {
      var em = w.embers[i];
      g.fillStyle = (em.life / em.max) > 0.55 ? PC.redHi : PC.goldLo;
      g.fillRect(Math.round(em.x), Math.round(em.y), 1, 1);
      if ((i + Math.floor(w.t / 90)) % 7 !== 0) {
        g.fillStyle = (em.life / em.max) > 0.55 ? PC.red : '#5a3a16';
        g.fillRect(Math.round(em.x), Math.round(em.y) + 1, 1, 1);
      }
    }

    /* impact damage leaves its signature: scorched ridge and a
       shock ring still walking outward */
    for (i = 0; i < w.scorch.length; i++) {
      var scd = w.scorch[i];
      g.fillStyle = scd.ttl > 6000 ? '#050408' : 'rgba(5,4,8,.6)';
      g.fillRect(Math.round(scd.x) - 3, Math.round(scd.y), 7, 1);
      g.fillRect(Math.round(scd.x) - 2, Math.round(scd.y) + 1, 5, 1);
      g.fillRect(Math.round(scd.x) - 1, Math.round(scd.y) - 1, 3, 1);
    }
    for (i = 0; i < w.rings.length; i++) {
      var rg = w.rings[i];
      var ra = rg.life / rg.max;
      g.fillStyle = ra > 0.6 ? PC.white : (ra > 0.3 ? PC.score : PC.starRed);
      for (var rk = 0; rk < 14; rk++) {
        var ran = rk / 14 * 6.28;
        g.fillRect(Math.round(rg.x + Math.cos(ran) * rg.r),
                   Math.round(rg.y + Math.sin(ran) * rg.r * 0.7), 1, 1);
      }
    }

    /* humanoids on the mountains */
    var cheering = w.cheerUntil && t < w.cheerUntil;
    for (i = 0; i < w.hums.length; i++) {
      var H = w.hums[i];
      var hx = Math.round(H.wx - w.worldX);
      if (hx < -4 || hx > cols + 4) { continue; }
      var hSpr;
      var selfCheer = t < (H.cheerUntil || 0);
      if (H.held && H.held.state === 'transmute') {
        /* the ceremony owns this soul: it strobes in the charge, then
           the dissolve clip takes over (drawn with the lander below) */
        var ageH = w.t - H.held.tmAt;
        if (ageH >= 450) { continue; }
        drawSpr(g, SPR_HUMF, hx, Math.round(H.y), HUM_LEG);
        if (Math.floor(w.t / 80) % 2) { drawSpr(g, SPR_HUMF, hx, Math.round(H.y), HUM_WHITE); }
        continue;
      } else if ((H.state === 'held' && H.held && H.held.state === 'lift')) {
        /* carried off and kicking: a panic wiggle on the way up */
        hSpr = (Math.floor(w.t / 140) % 2) ? SPR_HUM2 : SPR_HUM;
      } else if (H.state === 'held' || H.state === 'fall' || H.state === 'pulled' || ((cheering || selfCheer) && H.state === 'ground')) {
        hSpr = SPR_HUMF;   /* arms up: carried off, beamed, falling, or thanking */
      } else {
        hSpr = ((Math.floor(w.t / 420) + i) % 2) ? SPR_HUM : SPR_HUM2;
      }
      var hy = Math.round(H.y) - (((cheering || selfCheer) && H.state === 'ground') ? 1 : 0);
      drawSpr(g, hSpr, hx, hy, HUM_LEG);
    }

    /* the dreadnought mothership boss — 144x76 flagship with ion shield dome,
       rotational ventral turrets, particle death ray, and staged damage fx */
    if (w.mother) {
      var MoR = w.mother;
      var mw = MoR.w || 144, mh = MoR.h || 76;
      /* every literal that used to assume a 144-wide hull, derived once —
         hull offsets AND the drawn turret bodies */
      var TRR = motherTrim(mw, mh);
      var moRX = Math.round(MoR.sx);
      if (moRX > -mw - 20 && moRX < cols + mw + 20) {
        var moRY = Math.round(MoR.y);
        var phase3 = MoR.hp <= 10;
        var phase2 = MoR.shield <= 0 && !phase3;

        /* 1. Ventral Death Ray */
        if (MoR.beamState === 'charge') {
          var bmX = Math.round(MoR.beamX || (moRX + mw / 2));
          var tGround = terrRow(bmX + w.worldX, rows);
          g.save();
          g.strokeStyle = (Math.floor(t / 40) % 2) ? '#ef4444' : '#fbbf24';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(bmX, moRY + mh - 8);
          g.lineTo(bmX, tGround);
          g.stroke();
          g.fillStyle = '#ef4444';
          g.fillRect(bmX - 4, tGround - 2, 9, 2);
          g.fillRect(bmX - 1, tGround - 5, 3, 7);
          g.restore();
        } else if (MoR.beamState === 'fire') {
          var bmX = Math.round(MoR.beamX || (moRX + mw / 2));
          var tGround = terrRow(bmX + w.worldX, rows);
          g.save();
          /* outer plasma corona */
          g.fillStyle = (Math.floor(t / 30) % 2) ? 'rgba(56, 189, 248, 0.42)' : 'rgba(192, 132, 252, 0.42)';
          g.fillRect(bmX - 7, moRY + mh - 10, 15, tGround - (moRY + mh - 10));
          /* inner intense beam core */
          g.fillStyle = '#38bdf8';
          g.fillRect(bmX - 3, moRY + mh - 10, 7, tGround - (moRY + mh - 10));
          g.fillStyle = '#ffffff';
          g.fillRect(bmX - 1, moRY + mh - 10, 3, tGround - (moRY + mh - 10));
          /* ground splash */
          for (var spk = 0; spk < 6; spk++) {
            var spkOff = Math.sin(t * 0.05 + spk) * 12;
            g.fillStyle = (spk % 2 === 0) ? '#ffffff' : '#38bdf8';
            g.fillRect(bmX + Math.round(spkOff), tGround - 2 - (spk * 2) % 6, 2, 2);
          }
          g.restore();
        }

        /* 2. Escort Deployment beam column — width and reach follow her hull,
           so a phone-sized boss does not throw a 6px lance as wide as
           a third of her own length */
        if (MoR.dropFlash > 0) {
          for (var dfy = moRY + mh; dfy < moRY + mh + TRR.beamLen; dfy++) {
            var dfp = (dfy + Math.floor(t / 70)) % 6;
            g.fillStyle = dfp < 4 ? BEAM_C1 : BEAM_C2;
            g.fillRect(moRX + Math.floor(mw / 2) - (TRR.beamW >> 1), dfy, TRR.beamW, 1);
          }
        }

        /* 3. Dreadnought Hull — drawn at whatever size the arena asked
           for (motherSize); the sheet frame takes the destination box,
           so the art scales with her. */
        var moFrame = Math.floor(t / (phase3 ? 35 : 70)) % 36;
        var drewMother = drawSheetFrame(g, 'mother', moFrame, moRX, moRY, mw, mh, 0);
        if (!drewMother) {
          drawSpr(g, SPR_MOTHER, moRX + 8, moRY + 6, MOTHER_LEG, 0, 4);
        }



        /* 5. Ion Shield Barrier Aura */
        if (MoR.shield > 0) {
          g.save();
          var shAlpha = MoR.shieldFlash > 0 ? 0.75 : 0.35 + Math.sin(t * 0.008) * 0.12;
          g.strokeStyle = MoR.shieldFlash > 0 ? '#ffffff' : '#38bdf8';
          g.lineWidth = MoR.shieldFlash > 0 ? 2 : 1;
          g.globalAlpha = shAlpha;
          g.beginPath();
          g.ellipse(moRX + mw / 2, moRY + mh / 2, mw / 2 + TRR.aura, mh / 2 + TRR.aura, 0, 0, Math.PI * 2);
          g.stroke();
          if (Math.floor(t / 60) % 2 === 0) {
            g.strokeStyle = '#818cf8';
            g.stroke();
          }
          g.restore();
        }

        /* 6. Ventral Turrets — drawn where the SIMULATION fires from.
           This used to be hardcoded to moRX + 28 while stepWorld aimed
           from MTR.tX (12 on a phone hull), so on a compact tube the
           turret you could see was not the one shooting at you. */
        var pX = w.ship.x + 15, pY = w.ship.y + 6;
        var tPos = [
          { x: moRX + TRR.tX, y: moRY + mh - TRR.tY },
          { x: moRX + mw - TRR.tX, y: moRY + mh - TRR.tY }
        ];
        for (var ti = 0; ti < tPos.length; ti++) {
          var tp = tPos[ti];
          var ang = Math.atan2(pY - tp.y, pX - tp.x);
          g.fillStyle = '#1e293b';
          g.fillRect(tp.x - (TRR.turW >> 1), tp.y - (TRR.turH >> 1), TRR.turW, TRR.turH);
          g.fillStyle = '#64748b';
          g.fillRect(tp.x - (TRR.turW >> 1) + 1, tp.y - (TRR.turH >> 1), TRR.turW - 2, TRR.turH - 2);
          var bx = Math.round(tp.x + Math.cos(ang) * TRR.muzOut);
          var by = Math.round(tp.y + Math.sin(ang) * TRR.muzOut);
          g.fillStyle = (MoR.turretCd < 300 && Math.floor(t / 50) % 2) ? '#ef4444' : '#94a3b8';
          g.fillRect(bx - (TRR.muz >> 1), by - (TRR.muz >> 1), TRR.muz, TRR.muz);
        }

        /* 7. Turret Bolts in Flight */
        if (MoR.bolts && MoR.bolts.length) {
          for (var bi = 0; bi < MoR.bolts.length; bi++) {
            var bObj = MoR.bolts[bi];
            var bpx = Math.round(bObj.x), bpy = Math.round(bObj.y);
            g.fillStyle = (Math.floor(t / 40) % 2) ? '#f43f5e' : '#fbbf24';
            g.fillRect(bpx - 1, bpy - 1, 3, 3);
            g.fillStyle = '#ffffff';
            g.fillRect(bpx, bpy, 1, 1);
            g.fillStyle = 'rgba(244, 63, 94, 0.4)';
            g.fillRect(Math.round(bpx - bObj.vx * 0.35), Math.round(bpy - bObj.vy * 0.35), 2, 2);
          }
        }

        /* 8. Meltdown Smoke & Engine Fires (Phase 3) */
        if (phase3) {
          g.fillStyle = (Math.floor(t / 50) % 2) ? '#ea580c' : '#fbbf24';
          g.fillRect(moRX + (MoR.dir < 0 ? mw - 8 : 4), moRY + 24, 4, 4);
          g.fillRect(moRX + (MoR.dir < 0 ? mw - 14 : 10), moRY + 36, 4, 3);
        }
      }
    }

    /* landers — grunts wobble on two frames; the advanced tractor
       ship hangs a dithered beam column that pours out of its belly
       emitters, flares white-hot at the throat, and lets go when the
       ceremony is done with it */
    for (i = 0; i < w.landers.length; i++) {
      var L = w.landers[i];
      var lx = Math.round(L.wx - w.worldX);
      if (lx < -14 || lx > cols + 14) { continue; }
      var tractor = L.type === 'tractor';
      var lxDraw = L.state === 'transmute' ? lx + Math.round(Math.sin(w.t * 0.033) * 1.2) : lx;
      var beamOn = tractor && L.target && !L.target.gone &&
        (L.state === 'beam' || (L.state === 'transmute' && (w.t - L.tmAt) < 1500));
      if (beamOn) {
        var by0 = Math.round(L.y) + (tractor ? 10 : 8);       /* out of the belly emitters */
        var bcx = lxDraw + 7;
        var crown = Math.max(0, Math.round(L.target.y) - 1);
        var by1;
        if (L.state === 'transmute') {
          /* the tether holds through charge and dissolve, then lets go */
          var ageB = w.t - L.tmAt;
          by1 = ageB < 950 ? crown
            : Math.max(by0, crown - Math.round((ageB - 950) * 0.22));
        } else if (L.reachAt) {
          by1 = Math.min(crown, by0 + Math.round((w.t - L.reachAt) * 0.11));
        } else {
          /* not reached for yet: the belly idles dark. The column is
             born IN the hull the moment the reach begins — the glide
             and the hover beat must never parade a half-length beam
             hanging mid-air below a hull that hasn't reached */
          by1 = by0 - 1;
        }
        for (var byy = by0; byy <= by1; byy++) {
          if (byy <= by0 + 2) {
            /* the throat of the beam: wider, hotter at the hull */
            g.fillStyle = BEAM_C1;
            g.fillRect(bcx - 1, byy, 3, 1);
            g.fillStyle = BEAM_C2;
            g.fillRect(bcx - 2, byy, 1, 1);
            g.fillRect(bcx + 2, byy, 1, 1);
            if (byy === by0) {
              g.fillStyle = '#ffffff';
              g.fillRect(bcx - 1, byy, 3, 1);
            }
            continue;
          }
          var phB = (byy + Math.floor(w.t / 70)) % 6;
          if (phB < 4) {
            g.fillStyle = BEAM_C1;
            g.fillRect(bcx - 1, byy, 3, 1);
          } else if (phB === 4) {
            g.fillStyle = BEAM_C1;
            g.fillRect(bcx, byy, 1, 1);
          } else {
            g.fillStyle = BEAM_C2;
            g.fillRect(bcx - 2, byy, 1, 1);
            g.fillRect(bcx + 2, byy, 1, 1);
          }
        }
        if (L.state === 'beam' && L.target.state === 'pulled' && by1 >= crown - 1) {
          g.fillStyle = (Math.floor(w.t / 90) % 2) ? '#ffffff' : BEAM_C2;
          g.fillRect(bcx - 1, crown - 1, 3, 1);
        }
      }
      var spr2 = tractor
        ? ((Math.floor(w.t / 260) + i) % 2 ? SPR_LANDER_T2 : SPR_LANDER_T)
        : ((Math.floor(w.t / 260) + i) % 2 ? SPR_LANDER2 : SPR_LANDER);
      var tmAge = L.state === 'transmute' ? (w.t - L.tmAt) : 0;
      if (L.state === 'transmute' && tmAge >= 950) {
        if (Math.floor(w.t / 60) % 2) {
          drawSpr(g, spr2, lxDraw, Math.round(L.y), tractor ? LANDER_LEG_T : LANDER_LEG);
        }
      } else {
        drawSpr(g, spr2, lxDraw, Math.round(L.y), tractor ? LANDER_LEG_T : LANDER_LEG);
      }
      if (tractor && (L.state !== 'transmute' || tmAge < 950)) {
        drawTractorRotor(g, lxDraw + 7, Math.round(L.y) + 6, w.t);
      }
      if (beamOn && L.state === 'beam' && !L.reachAt && L.hoverUntil && L.target.state === 'ground') {
        /* the settle beat: the emitter warms before the reach — a single
           violet glint beating INSIDE the belly, born in the hull */
        g.fillStyle = (Math.floor(w.t / 97) % 2) ? '#ffffff' : BEAM_C2;
        g.fillRect(bcx - 1, by0, 1, 1);
        g.fillRect(bcx + 1, by0, 1, 1);
      }
    }

    /* the transmutation ceremonies — inward sparks, the dissolve's
       falling motes, and the mutant writing itself in, white-hot */
    for (i = 0; i < w.landers.length; i++) {
      var Lz = w.landers[i];
      if (Lz.state !== 'transmute' || !Lz.target || Lz.target.gone) { continue; }
      var tzx = Math.round(Lz.wx - w.worldX);
      var tzy = Math.round(Lz.y + 7);
      var ageZ = w.t - Lz.tmAt;
      if (ageZ < 450) {
        /* charge: violet sparks spiral inward and tighten on the soul */
        var zp = ageZ / 450;
        for (var zk = 0; zk < 8; zk++) {
          var za = zk / 8 * 6.28 + w.t * 0.012;
          var zr = Math.round(14 * (1 - zp) + 2);
          g.fillStyle = zk % 2 ? BEAM_C1 : '#ffffff';
          g.fillRect(tzx + 3 + Math.round(Math.cos(za) * zr),
                     tzy + 3 + Math.round(Math.sin(za) * zr), 1, 1);
        }
      } else if (ageZ < 950) {
        /* dissolve: the soul un-writes from the feet up, raining light */
        var zd = Math.min(8, Math.floor((ageZ - 450) / 500 * 9));
        drawSprRowClip(g, SPR_HUMF, tzx, tzy, HUM_LEG, 0, 7 - zd);
        for (var zm = 0; zm < 3; zm++) {
          g.fillStyle = zm ? BEAM_C2 : '#ffffff';
          g.fillRect(tzx + 1 + zm * 2, tzy + 8 - zd + Math.floor((ageZ * 0.06 + zm * 5) % 9), 1, 1);
        }
      } else {
        /* reform: red rows grow from the crown down, flashing white */
        var zr2 = Math.min(9, Math.floor((ageZ - 950) / 550 * 10));
        drawSprRowClip(g, SPR_MUTANT, tzx - 2, tzy - 1, MUT_LEG, 0, zr2);
        if (Math.floor(w.t / 60) % 2) {
          drawSprRowClip(g, SPR_MUTANT, tzx - 2, tzy - 1, MUT_WHITE, 0, zr2);
        }
      }
    }

    /* mutants — red two-frame flutter, always turning toward you */
    for (i = 0; i < w.mutants.length; i++) {
      var muR = w.mutants[i];
      var mxR = Math.round(muR.wx - w.worldX);
      if (mxR < -12 || mxR > cols + 12) { continue; }
      drawSpr(g, (Math.floor(t / 140) + i) % 2 ? SPR_MUTANT2 : SPR_MUTANT, mxR, Math.round(muR.y), MUT_LEG);
    }

    /* bombs — distinct, high-fidelity pixel-art for all 3 variations */
    for (i = 0; i < w.bombs.length; i++) {
      var bo = w.bombs[i];
      var bx = Math.round(bo.x);
      var by = Math.round(bo.y);
      if (bx < -10 || bx > cols + 10 || by < -10 || by > rows + 10) { continue; }
      var bKind = bo.kind || 'heavy';

      if (bKind === 'penetrator') {
        /* 1. Kinetic Dart / Bunker-Buster:
           Needle tip (white), titanium hull with fins, rocket thruster fire tail */
        var flColor = (Math.floor(t / 40) % 2) ? '#fbbf24' : '#ef4444';
        g.fillStyle = flColor;
        g.fillRect(bx, by - 4, 1, 2);
        g.fillStyle = '#f97316';
        g.fillRect(bx, by - 2, 1, 1);
        g.fillStyle = '#475569';
        g.fillRect(bx - 1, by - 1, 3, 1);
        g.fillStyle = '#94a3b8';
        g.fillRect(bx, by, 1, 3);
        g.fillStyle = '#e2e8f0';
        g.fillRect(bx, by + 3, 1, 1);
      } else if (bKind === 'incendiary') {
        /* 2. Thermite Canister:
           Tumbling bronze canister leaking molten flame droplets */
        var rotFrame = Math.floor((t * 0.01 + i) % 4);
        g.fillStyle = '#78350f';
        if (rotFrame === 0 || rotFrame === 2) {
          g.fillRect(bx - 1, by - 1, 3, 3);
          g.fillStyle = '#f59e0b';
          g.fillRect(bx, by - 1, 1, 3);
        } else {
          g.fillRect(bx - 1, by - 1, 3, 2);
          g.fillStyle = '#f59e0b';
          g.fillRect(bx - 1, by, 3, 1);
        }
        g.fillStyle = (Math.floor(t / 60) % 2) ? '#ea580c' : '#fbbf24';
        g.fillRect(bx, by - 3, 1, 1);
        if (Math.floor(t / 80) % 2) {
          g.fillStyle = '#ef4444';
          g.fillRect(bx + (rotFrame % 2 ? 1 : -1), by - 4, 1, 1);
        }
      } else {
        /* 3. Heavy Plasma Breaker:
           Pulsing cross-flare core with rotating satellite energy motes */
        var pulse = (Math.floor(t / 90) % 2);
        g.fillStyle = pulse ? '#c084fc' : '#e11d48';
        g.fillRect(bx, by - 2, 1, 5);
        g.fillRect(bx - 2, by, 5, 1);
        g.fillStyle = pulse ? '#ffffff' : '#f472b6';
        g.fillRect(bx - 1, by - 1, 3, 3);
        g.fillStyle = '#ffffff';
        g.fillRect(bx, by, 1, 1);
        var orbA = t * 0.016 + i;
        g.fillStyle = '#38bdf8';
        g.fillRect(bx + Math.round(Math.cos(orbA) * 3), by + Math.round(Math.sin(orbA) * 3), 1, 1);
        g.fillRect(bx - Math.round(Math.cos(orbA) * 3), by - Math.round(Math.sin(orbA) * 3), 1, 1);
      }
    }

    /* bullets — green plasma laser bolts matching the ship sprite */
    for (i = 0; i < w.bullets.length; i++) {
      var bx = Math.round(w.bullets[i].x);
      var by = Math.round(w.bullets[i].y);
      var bd = w.bullets[i].dir || 1;
      g.fillStyle = '#22b332';
      g.fillRect(bd > 0 ? bx - 2 : bx - 5, by, 8, 1);
      g.fillStyle = '#47d84d';
      g.fillRect(bd > 0 ? bx - 2 : bx - 2, by, 5, 1);
      g.fillStyle = '#c4f092';
      g.fillRect(bd > 0 ? bx : bx - 2, by, 3, 1);
      g.fillStyle = '#ffffff';
      g.fillRect(bd > 0 ? bx + 2 : bx - 3, by, 1, 1);
    }

    /* the unibeam — a literal infinite lance: nose to sky's edge (or
       the first mountain it meets), white core, cyan sheath. */
    if (w.t < (w.beamUntil || 0) && !w.shipDead && !w.portal) {
      var Sb = w.ship;
      var dirB = (Sb.face || 1) < 0 ? -1 : 1;
      var flipB = dirB < 0;
      var muzzX = flipB ? Math.round(Sb.x) - 2 : Math.round(Sb.x) + sprW(SPR_SHIP) + 1;
      var beamY = Math.round(Sb.y + Sb.hopY) + 5;
      var scanX = muzzX;
      var limX = flipB ? -3 : cols + 3;
      var hitX = limX;
      while (flipB ? scanX > limX : scanX < limX) {
        var trW = terrRow(Math.floor(w.worldX) + scanX, rows);
        if (beamY >= trW - 1) { hitX = scanX; break; }
        scanX += flipB ? -3 : 3;
      }
      var lenB = Math.abs(hitX - muzzX);
      var x0B = flipB ? hitX : muzzX;
      var hot = (Math.floor(t / 60) % 2) === 0;
      g.fillStyle = PC.bulletGlow;
      g.fillRect(x0B, beamY - 2, lenB, 5);
      g.fillStyle = PC.bullet;
      g.fillRect(x0B, beamY - 1, lenB, 3);
      g.fillStyle = '#ffffff';
      g.fillRect(x0B, beamY, lenB, 1);
      /* dithered sparks along both edges of the sheath */
      for (var esp = 0; esp < lenB; esp += 2) {
        if (bayerAt(x0B + esp, beamY - 3) > 0.45) {
          g.fillStyle = hot ? '#ffffff' : PC.bulletGlow;
          g.fillRect(x0B + esp, beamY - 3, 1, 1);
          g.fillRect(x0B + esp, beamY + 3, 1, 1);
        }
      }
      /* a hot spark where the lance meets sky or stone */
      g.fillStyle = '#ffffff';
      g.fillRect(hitX - 1, beamY - 2, 3, 5);
      g.fillStyle = PC.goldHi;
      g.fillRect(hitX - 2, beamY - 1, 1, 3);
      g.fillRect(hitX + 2, beamY - 1, 1, 3);
      if (hot) {
        g.fillStyle = PC.boom[3];
        g.fillRect(hitX, beamY - 3, 1, 1);
        g.fillRect(hitX, beamY + 3, 1, 1);
      }
    }

    /* the ship + dual thruster flames — or her wreck, or her portal */
    var S = w.ship;
    if (w.shipDead) {
      /* the wreck: smoke for a beat, then NOTHING. The hull is gone,
         the engines are dark — a dead ship leaks no thrust and no
         bullets. The ghost of the old build is retired. */
      var stg2 = t - (w.shipDeadAt || 0);
      if (stg2 < 720) {
        var smk = Math.floor(t / 130) % 6;
        g.fillStyle = PC.slate;
        g.fillRect(Math.round(S.x + 4) + (smk % 2), Math.round(S.y + 3) - smk, 1, 1);
        g.fillStyle = PC.slateHi;
        g.fillRect(Math.round(S.x + 5) - (smk % 2), Math.round(S.y + 4) - Math.floor(smk / 2), 1, 1);
      }
    } else if (w.portal) {
      /* the gate: dithered beam, a spinning ring, and the hull
         materialising from the spine outward */
      var age = w.t - w.portal.t0;
      var px = Math.round(S.x), py = Math.round(S.y);
      g.fillStyle = (Math.floor(t / 90) % 2) ? PC.bulletGlow : PC.gold;
      for (var pr = py - 7; pr < py + 16; pr++) {
        if (((pr + Math.floor(t / 60)) % 2) === 0) {
          g.fillRect(px + 3, pr, 1, 1);
          g.fillRect(px + 6, pr, 1, 1);
        }
      }
      var rr2 = 3 + (Math.floor(age / 120) % 5);
      g.fillStyle = PC.bulletGlow;
      for (var pk = 0; pk < 14; pk++) {
        var pa = pk / 14 * 6.28 + t * 0.004;
        g.fillRect(px + 4 + Math.round(Math.cos(pa) * rr2),
                   py + 5 + Math.round(Math.sin(pa) * (rr2 - 1)), 1, 1);
      }
      var half = Math.min(4, Math.floor(age / 1500 * 4) + 1);
      /* same destination box as the live hull, or she materialises at one
         size and flies at another */
      var PD = shipDest(w), psk = shipScaleOf(PD.w);
      var drewPortalShip = drawSheetFrame(g, 'ship', 0, px - Math.round(8 * psk),
                                          py - Math.round(6 * (PD.h / 23)),
                                          PD.w, PD.h, 0, Math.min(1, age / 1500));
      if (!drewPortalShip) {
        drawSprClip(g, SPR_SHIP, px, py, SHIP_LEG, 0, 4 - half, 3 + half);
      }
    } else {
      /* facing mirrors the hull; a victory roll flips it once more */
      var flip = ((S.face || 1) < 0 ? 1 : 0) ^ (t < (S.flipUntil || 0) ? 1 : 0);
      var shipX = Math.round(S.x);
      var shipY = Math.round(S.y + S.hopY);
      var inv = t < (w.invUntil || 0);
      var superOn = w.t < (w.laserUntil || 0);
      if (inv) {
        /* a walking shield ring of cyan sparks around her */
        g.fillStyle = (Math.floor(t / 120) % 2) ? PC.bulletGlow : PC.white;
        for (var ik = 0; ik < 10; ik++) {
          var ia = ik / 10 * 6.28 + t * 0.006;
          g.fillRect(shipX + 4 + Math.round(Math.cos(ia) * 8),
                     shipY + 5 + Math.round(Math.sin(ia) * 7), 1, 1);
        }
      }
      var shipDrawn = false;
      if (!inv || (Math.floor(t / 110) % 2) === 0) {
        var shipFrame = 0;
        if (superOn && w.t < (w.beamUntil || 0)) {
          /* heavy super beam: 14 frames cycling fast */
          shipFrame = 30 + (Math.floor(t / 40) % 14);
        } else if (superOn) {
          /* special is active/charged: show charging rings on beak */
          shipFrame = 20 + (Math.floor(t / 60) % 10);
        } else if (w.t - (S.lastFire || 0) < 260) {
          /* active laser fire burst: 10 frames */
          shipFrame = 10 + (Math.floor(t / 50) % 10);
        } else {
          /* clean idle hover: 10 frames engine flicker with clean beak */
          shipFrame = Math.floor(t / 80) % 10;
        }
/* the destination box and every offset sized off it — on a compact tube
           the hull is 32x14 instead of 52x23, and these follow it so the
           nose lands on the same game pixel either way */
        var SD = shipDest(w), ssk = shipScaleOf(SD.w);
        var drawShipX = flip ? shipX - Math.round(14 * ssk) : shipX - Math.round(8 * ssk);
        var drawShipY = shipY - Math.round(6 * (SD.h / 23));
        shipDrawn = drawSheetFrame(g, 'ship', shipFrame, drawShipX, drawShipY, SD.w, SD.h, flip);

        if (superOn) {
          /* the gift shows: gold hull, white-hot trim, a pulsing halo
             and golden sparks trailing the engines — the ship wears the
             mushroom's promise on the outside too */
          if (Math.floor(t / 200) % 2) {
            g.fillStyle = PC.goldHi;
            for (var hk = 0; hk < 12; hk++) {
              var ha = hk / 12 * 6.28 + t * 0.005;
              g.fillRect(shipX + Math.round(10 * ssk) + Math.round(Math.cos(ha) * 13 * ssk),
                         shipY + 5 + Math.round(Math.sin(ha) * 9 * (SD.h / 23)), 1, 1);
}
          }
          for (var sk2 = 0; sk2 < 3; sk2++) {
            var sph = ((t * 0.0011) + sk2 * 0.33) % 1;
            g.fillStyle = sk2 === 1 ? PC.bulletGlow : PC.gold;
            g.fillRect(flip ? shipX + sprW(SPR_SHIP) + 2 + Math.round(sph * 12 * ssk)
                            : shipX - 3 - Math.round(sph * 12 * ssk),
                       shipY + 5 + Math.round(Math.sin(sph * 6.28 + sk2 * 2.1) * 2), 1, 1);
          }
        }
        if (!shipDrawn) {
          drawSpr(g, SPR_SHIP, shipX, shipY, superOn ? SHIP_LEG_SUPER : SHIP_LEG, flip);
          /* Nose tip plasma flare & canopy specular shine */
          var nosePx = flip ? shipX : shipX + 29;
          g.fillStyle = (Math.floor(t / 130) % 2) ? '#ffffff' : '#00f0ff';
          g.fillRect(nosePx, shipY + 5, 1, 1);
        }
      }
      if (!shipDrawn && (!inv || (Math.floor(t / 110) % 2) === 0)) {
        /* the exhaust: a four-stage arcade flame — white-hot root,
           gold body, orange transition, ember tip — breathing through
           a 3-phase flicker, so she looks alive even holding still.
           Two nozzle rows, each with a slightly offset flicker, so
           the twin engines feel like two living things */
        var flameX = flip ? shipX + sprW(SPR_SHIP) : shipX - 1;
        var exhPh = Math.floor(t / 90) % 3;
        var exhLen = exhPh === 0 ? 7 : (exhPh === 1 ? 5 : 6);
        for (var exhR = 0; exhR < 2; exhR++) {
          var exhY = shipY + (exhR === 0 ? 3 : 8);
          var exhX0 = flip ? flameX : flameX - exhLen + 1;
          g.fillStyle = PC.thrLo;
          g.fillRect(exhX0, exhY, exhLen, 1);
          g.fillStyle = PC.thr;
          g.fillRect(flip ? exhX0 : exhX0 + 1, exhY, exhLen - 2, 1);
          g.fillStyle = PC.goldHi;
          g.fillRect(flip ? exhX0 : exhX0 + 1, exhY, 2, 1);
          g.fillStyle = '#ffffff';
          g.fillRect(flip ? exhX0 : exhX0 + 1, exhY, 1, 1);
          /* ember glow: a single dim pixel at the flame tip */
          if (exhLen > 5) {
            g.fillStyle = PC.redHi;
            g.fillRect(flip ? exhX0 + exhLen : exhX0 - 1, exhY, 1, 1);
          }
        }
      }
    }
    if (w.mario) {
      /* the guest is BIG now: animated plumber with 16-frame walk cycle + victory punch */
      var M2 = w.mario;
      var mx2 = Math.round(M2.x), my2 = Math.round(M2.y);
      var mFlip = M2.give ? 1 : 0;
      var marioFrame = (M2.toss && !M2.give) ? 16 : (Math.floor(t / 70) % 16);
      /* the cameo had no collision at all, so its box is free to shrink on
         a compact tube; the offset rides the same ratio as the hull */
      var MD = marioDest(w), msk = MD.w / 28;
      var drewMario = drawSheetFrame(g, 'mario', marioFrame, mx2,
                                     my2 - Math.round(12 * msk), MD.w, MD.h, mFlip);
      if (!drewMario) {
        drawSpr(g, (Math.floor(t / 150) % 2) ? SPR_MARIO2 : SPR_MARIO, mx2, my2, MARIO_LEG, mFlip, 2);
      }
      if (M2.toss && !M2.give) {
        drawSpr(g, SPR_SHROOM, Math.round(M2.sx), Math.round(M2.sy), SHROOM_LEG,
                (Math.floor(t / 120) % 2) ? 1 : 0, (w && w.compact) ? 1 : 2);
      }
    }

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

    /* score pops — gold chips climbing out of the wreckage, blinking
       out like the counter of an old machine */
    for (i = w.pops.length - 1; i >= 0; i--) {
      var Pp = w.pops[i];
      var ageP = w.t - Pp.t0;
      if (ageP > 850) { w.pops.splice(i, 1); continue; }
      if (ageP > 620 && (Math.floor(w.t / 80) % 2) === 0) { continue; }
      drawMText(g, Pp.str, Math.round(Pp.x), Math.round(Pp.y - ageP * 0.016), PC.gold, 2);
    }

    /* round 11: celebration sparks — each one a four-point twinkle
       that shrinks to a pixel and blinks out; stepped, never faded */
    for (i = w.sparks.length - 1; i >= 0; i--) {
      var SP = w.sparks[i];
      var ageS = w.t - SP.t0;
      if (ageS < 0) { continue; }   /* round 13: the second ring waits */
      var lf = ageS / SP.life;
      if (lf >= 1) { w.sparks.splice(i, 1); continue; }
      if (lf > 0.78 && (Math.floor(w.t / 70) % 2) === 0) { continue; }
      g.fillStyle = SP.col;
      var sxp = Math.round(SP.x), syp = Math.round(SP.y);
      if (lf < 0.42) {
        g.fillRect(sxp - 1, syp, 3, 1);
        g.fillRect(sxp, syp - 1, 1, 3);
      } else {
        g.fillRect(sxp, syp, 1, 1);
      }
    }

    if (mode === 'hero') {
      /* ── attract chrome — the score row of a 1980s title screen ──
         1P / HIGH SCORE / 2P on two rows of white 5x7, exactly where
         the bezel glass of the old cabinets carried it. The CREDIT
         counter lives on the DOM foot row, beside the decal. */

      /* banner — START was pressed. The GAME OVER stamp (dim) is a DOM
         plate mounted ON the glass above the marquee — it never draws
         here, behind the copy it must sit over */
      if (w.banner && !w.banner.dim && t < w.banner.until) {
        var bOn = (w.banner.until - t) > 300 ? true : (Math.floor(t / 160) % 2) === 0;
        if (bOn) {
          var bl1 = w.banner.l1, bl2 = w.banner.l2;
          /* a stamped notched plate, so the banner owns its pixels
             instead of fighting the marquee behind it */
          var bw = Math.max(textW(bl1, 2), textW(bl2)) + 16;
          var bx0 = Math.round(cols / 2 - bw / 2);
          var by0 = Math.round(rows * 0.30) - 7;
          var bh0 = 42;
          if (w.banner.dim) { g.globalAlpha = 0.82; }
          g.fillStyle = PC.panelBd;
          g.fillRect(bx0 + 2, by0, bw - 4, bh0);
          g.fillRect(bx0, by0 + 2, bw, bh0 - 4);
          g.fillStyle = PC.panel;
          g.fillRect(bx0 + 2, by0 + 2, bw - 4, bh0 - 4);
          g.fillRect(bx0 + 1, by0 + 3, bw - 2, bh0 - 6);
          g.fillRect(bx0 + 3, by0 + 1, bw - 6, bh0 - 2);
          g.fillStyle = PC.panelHi;
          for (var pgx = bx0 + 3; pgx < bx0 + bw - 3; pgx += 3) { g.fillRect(pgx, by0 + 2, 1, 1); }
          g.globalAlpha = 1;
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

      /* POST block, top-left like real hardware. The SOUND line is
         honest: mute the cabinet and the BIOS says MUTE, dim — the
         boot screen reports the hardware the way it actually is */
      for (var pi = 0; pi < POST.length; pi++) {
        if (el > 420 + pi * 130) {
          drawText(g, POST[pi][0], 2, 3 + pi * 9, PC.post);
          if (POST[pi][1]) {
            var isSnd = pi === 3;
            var stOk = isSnd ? soundOn : true;
            drawText(g, isSnd ? (stOk ? 'OK' : 'MUTE') : POST[pi][1],
              2 + textW(POST[pi][0]) + 2, 3 + pi * 9, isSnd && !stOk ? PC.slate : PC.ok);
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
        /* the kept champion rides the title card: the cabinet greets
           its best pilot before the first coin drops */
        var showChamp = hiScore > 0 && cardW >= 140;
        var champStr = showChamp ? ('BEST ' + hiName + ' ' + hiScore) : '';
        var cardH = 24 + tScale0 * 7 + 3 + fa.height + 6 + (showChamp ? 9 : 0);
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
        /* the champion's line — micro type under the Persian title,
           between the cups: BEST AAA 40300 */
        if (showChamp) {
          var chW = mTextW(champStr);
          drawMText(g, champStr, cx - Math.round(chW / 2), cardY + 24 + tScale0 * 7 + 3 + fa.height + 4, PC.score, 1);
        }
        /* the cabinet keeps one face: the champion's cup flanks the
           Persian title here exactly as it stands on the BEST PILOTS
           board — same 9×9 gold, same legend. A title card that
           promises the podium the cabinet can actually pay. */
        if (cardW >= 140) {
          var faY = cardY + 24 + tScale0 * 7 + 3;
          var tyT = Math.max(cardY + 4, Math.min(cardY + cardH - 22, faY + Math.round((fa.height - 18) / 2)));
          var twT = 18, padT2 = 12;
          drawSpr(g, SPR_TROPHY, cardX + padT2, tyT, TROPHY_LEG, false, 2);
          drawSpr(g, SPR_TROPHY, cardX + cardW - padT2 - twT, tyT, TROPHY_LEG, true, 2);
        }
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

    g.restore();
    /* the fallen planet: the ridge smoulders — a slow red pulse,
       strongest at the floor, breathing on the sim's own clock.
       Drawn with the world, UNDER the glass chrome and the idle
       show: the card replaces the page, the burn is part of it */
    if (w.planetFall && mode === 'hero' && doomCv) {
      g.globalAlpha = 0.55 + Math.sin(w.t * 0.004) * 0.3;
      g.drawImage(doomCv, 0, 0);
      g.globalAlpha = 1;
    }
    /* CRT vignette — pre-rendered dither, over the world but UNDER
       the glass text: the score row must never be eaten by it */
    g.drawImage(vigCv, 0, 0);
    if (mode === 'hero') { drawAttractChrome(g, cols, rows, w, t); }
    /* the idle show draws last: its wash + card sit over everything
       on the tube (the DOM copy has receded via html.attract-show) */
    if (mode === 'hero' && attractShow) { drawAttractCard(g, cols, rows, t); }

    /* coin surge — the whole tube glitters gold for a beat (dithered) */
    if (!paused && w.flash > 0 && mode === 'hero') {
      var lvl = w.flash > 600 ? 2 : (w.flash > 300 ? 1 : 0);
      g.drawImage(flashCvs[lvl], 0, 0);
    }
  }

  /* the score row of the bezel glass — drawn last, over the vignette,
     so corner dither never eats the 1P / 2P columns; small tubes get
     it at 2x because 1px strokes on a 2px grid read as noise */
  function drawAttractChrome(g, cols, rows, w, t) {
    /* micro type on the glass: present, crisp, and out of the
       marquee's way — half the footprint of the old 5×7 row */
    /* The same compact-tube rule the hull uses. A landscape phone is 422
       columns wide — past both old tests — so this read false at 844x390
       and the glass row drew at 2x on a 390px-tall tube, where CHAIN and
       the shield bar printed through each other and the mothership's
       shield line. Height is the scarce resource here, so ask about it. */
    var isMobileTube = cols < 320 || !!(w && w.compact) || (html && html.clientWidth < 640);
    var sc = isMobileTube ? 1 : (PXG <= 2 ? 2 : 1);
    var y1 = 2;
    var y2 = y1 + 7 * sc;
    var chrome = PC.shell;   /* white glass text, over the vignette */
    function mW(str) { return (str.length * 4 - 1) * sc; }
    /* PAUSE: the sim holds its breath — the glass blinks it (the sim's
       own clock is frozen, so the blink runs on the wall clock) */
    if (paused && (Math.floor(performance.now() / 480) % 2) === 0) {
      var pauseScale = 2;
      var pauseW = (5 * 4 - 1) * pauseScale; /* 38px at scale 2 */
      var pauseH = 5 * pauseScale;           /* 10px at scale 2 */
      var pauseY = Math.round(rows * 0.58);
      if (cueSubCv && cv) {
        var rSub = cueSubCv.getBoundingClientRect();
        var rCv = cv.getBoundingClientRect();
        if (rSub && rCv && rSub.bottom > rCv.top) {
          pauseY = Math.round((rSub.bottom - rCv.top) / PXG) + 5;
        }
      }
      /* …but never INSIDE the control deck. Hanging the word off the cue
         subtitle looks right until the subtitle itself descends into the
         deck band on a short tube, and then the overlay prints straight
         through START's own caption — which is what it did at 861x680.
         The deck is the one thing on the glass a thumb is aiming at, so
         the overlay yields to it: measure the deck's top edge in game
         rows and lift the word above it. */
      var deckEl = doc.querySelector('.hero-deck');
      if (deckEl && cv) {
        var rDeck = deckEl.getBoundingClientRect();
        var rCv2 = cv.getBoundingClientRect();
        if (rDeck.height > 0 && rCv2.height > 0 && rDeck.bottom > rCv2.top) {
          var deckTop = Math.round((rDeck.top - rCv2.top) / PXG);
          if (pauseY + pauseH > deckTop - 2) {
            pauseY = Math.max(2, deckTop - 2 - pauseH);
          }
        }
      }
      var pauseX = Math.round(cols / 2 - pauseW / 2);
      drawMText(g, 'PAUSE', pauseX + 1, pauseY + 1, PC.goldDk, pauseScale);
      drawMText(g, 'PAUSE', pauseX, pauseY, PC.gold, pauseScale);
    }
    drawMText(g, '1P', 5, y1, curPlayer === 1 ? PC.gold : chrome, sc);
    if (sc === 2 && !w) { drawMText(g, '00', 5, y2, chrome, sc); }   /* attract placeholder */
    var hs1 = 'HIGH SCORE';
    drawMText(g, hs1, Math.round(cols / 2 - mW(hs1) / 2), y1, chrome, sc);
    /* the narrow-glass law: three ten-digit columns can never share
       one row on a phone — they collided for real (the champion's
       line ran straight through both odometers). So a short tube
       seats TWO pilots only: the live odometer on the left, and the
       champion's name + true score right-aligned where 2P used to
       sit. A phone never had a second joystick anyway. */
    var tubeW = mW('0000000000');
    var narrow = 5 + tubeW + 12 * sc + tubeW + 12 * sc + tubeW + 5 > cols;
    if (narrow) {
      var champLine = hiName + ' ' + (hiScore > 0 ? String(hiScore) : '0');
      var s1w = w ? pad10(w.dispScore != null ? w.dispScore : w.score) : '00';
      var xChamp = cols - 5 - mW(champLine);
      if (xChamp < 5 + mW(s1w) + 4 * sc) {
        champLine = hiScore > 0 ? String(hiScore) : '0';   /* name dropped first */
        xChamp = cols - 5 - mW(champLine);
        if (xChamp < 5 + mW(s1w) + 4 * sc) { xChamp = 5 + mW(s1w) + 4 * sc; }
      }
      drawMText(g, champLine, xChamp, y2, chrome, sc);
    } else {
      var hs2 = hiName + ' ' + pad10(hiScore);
      drawMText(g, hs2, Math.round(cols / 2 - mW(hs2) / 2), y2, chrome, sc);
      drawMText(g, '2P', cols - 5 - mW('2P'), y1, curPlayer === 2 ? PC.gold : chrome, sc);
    }
    /* EVERY meter lives on the top glass now — the one band that is
       always visible. The old bottom row died behind the fixed HUD
       strip and deep terrain: SPEC, alerts and all now sit in the
       third glass row, under the score. */
    var y3 = isMobileTube ? (y2 + 9 * sc) : (y2 + 8 * sc);
    var showCombatHud = playT > 0 || !isMobileTube || !!(w && (w.humanRun || w.mother));
    if (w && showCombatHud) {
      var laserOn = w.t < (w.laserUntil || 0);
      /* SPEC — four charge pips: gold while charging, cyan while the
         gift burns, READY blinking at full */
      drawMText(g, 'SPEC', 5, y3, chrome, sc);
      var x0 = 5 + mW('SPEC') + 4 * sc;
      var seg2 = laserOn
        ? Math.ceil(((w.laserUntil - w.t) / 30000) * 4)
        : Math.min(4, w.kills || 0);
      for (var sp2 = 0; sp2 < 4; sp2++) {
        g.fillStyle = sp2 < seg2 ? (laserOn ? PC.bulletGlow : PC.gold) : PC.slate;
        g.fillRect(x0 + sp2 * 5 * sc, y3, 3 * sc, 5 * sc);
      }
      /* the chain: a gold ×N beside the charge while the streak lives */
      if ((w.chain || 0) >= 2 && w.t < (w.chainUntil || 0)) {
        var chainStr = 'CHAIN X' + w.chain;
        var fadeC = (w.chainUntil - w.t) < 600 && (Math.floor(w.t / 90) % 2) === 0;
        if (!fadeC) { drawMText(g, chainStr, x0 + 24 * sc, y3, PC.gold, sc); }
      }
      if (!laserOn && (w.kills || 0) >= 4) {
        var xReady = x0 + 24 * sc + 31 * sc + 4 * sc;
        if ((Math.floor(w.t / 300) % 2) === 0) {
          drawMText(g, 'READY', xReady, y3, PC.gold, sc);
        }
      }
      /* the ceremony: a beaten record blinks gold, dead center */
      if (w.hiBeaten && w.t < (w.hiFlashUntil || 0) && (Math.floor(w.t / 320) % 2) === 0) {
        var nhs = 'NEW HIGH SCORE';
        drawMText(g, nhs, Math.round(cols / 2 - mW(nhs) / 2), y3, PC.gold, sc);
      }
      /* the alert stack grows leftward from the right edge */
      var rightEdge = cols - 5;
      /* the people come first: when the deck runs out of souls the
         glass warns in red — blinking DANGER while any remain,
         a steady ALL LOST when the deck is empty of them */
      var liveHums = 0;
      for (var hchk = 0; hchk < w.hums.length; hchk++) { if (!w.hums[hchk].gone) { liveHums++; } }
      if (liveHums === 0) {
        drawMText(g, 'ALL LOST', rightEdge - mW('ALL LOST'), y3, PC.red, sc);
        rightEdge -= mW('ALL LOST') + 4 * sc;
      } else if (liveHums <= 2 && (Math.floor(w.t / 380) % 2) === 0) {
        drawMText(g, 'DANGER', rightEdge - mW('DANGER'), y3, PC.red, sc);
        rightEdge -= mW('DANGER') + 4 * sc;
      }
      if (w.mutants && w.mutants.length) {
        if ((Math.floor(w.t / 320) % 2) === 0) {
          drawMText(g, 'MUTANT', rightEdge - mW('MUTANT'), y3, PC.red, sc);
        }
        rightEdge -= mW('MUTANT') + 4 * sc;
      }
      /* the dreadnought mothership is in the sky: FLAGSHIP alert blinks */
      if (w.mother) {
        if ((Math.floor(w.t / (w.mother.hp <= 10 ? 150 : 300)) % 2) === 0) {
          drawMText(g, 'FLAGSHIP', rightEdge - mW('FLAGSHIP'), y3, w.mother.hp <= 10 ? PC.redHi : (w.mother.shield > 0 ? '#38bdf8' : '#f59e0b'), sc);
        }
        rightEdge -= mW('FLAGSHIP') + 4 * sc;
      }
      /* dedicated Boss Health Bar (Shield + Core Armor) — always rendered when boss is in active battle */
      if (w.mother && w.mother.state !== 'dying') {
        var MoH = w.mother;
        var barW = isMobileTube ? Math.min(120, cols - 24) : Math.min(160, cols - 40);
        var barH = isMobileTube ? 4 : 5;
        var barX = Math.round(cols / 2 - barW / 2);
        /* The title gets its OWN row on every width. It used to sit at
           y3 + 1 on desktop — and y3 is the row the combat and attract
           labels are drawn on (MUTANT, FLAGSHIP, CHAIN, COMET), so
           "DREADNOUGHT SHIELDED" printed straight through "CHAIN" at
           861px wide. The phone branch already stacked it at y3 + 9; the
           desktop branch was the outlier, and the narrow-desktop band is
           exactly where the two collided. */
        var titleY = Math.round(y3 + 9);
        var barY = Math.round(titleY + 7);
        if (barY < rows * 0.35) {
          g.save();
          var bTitle = MoH.hp <= 10 ? '◆ DREADNOUGHT CRITICAL ◆' : (MoH.shield > 0 ? '◆ DREADNOUGHT SHIELDED ◆' : '◆ DREADNOUGHT CORE EXPOSED ◆');
          var tCol = MoH.hp <= 10 ? PC.redHi : (MoH.shield > 0 ? '#38bdf8' : '#f59e0b');
          drawMText(g, bTitle, Math.round(cols / 2 - mW(bTitle) / 2), titleY, tCol, 1);

          /* Frame */
          g.fillStyle = '#090d16';
          g.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
          g.fillStyle = '#334155';
          g.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

          /* Hull Armor Bar (Back layer) */
          var hpRatio = Math.max(0, Math.min(1, MoH.hp / (MoH.maxHp || 24)));
          var hpFillW = Math.round(barW * hpRatio);
          var hpCol = MoH.hp <= 10 ? '#ef4444' : '#f59e0b';
          g.fillStyle = '#450a0a';
          g.fillRect(barX, barY, barW, barH);
          g.fillStyle = hpCol;
          g.fillRect(barX, barY, hpFillW, barH);

          /* Shield Bar (Overlaid on top when active) */
          if (MoH.shield > 0) {
            var shRatio = Math.max(0, Math.min(1, MoH.shield / (MoH.maxShield || 16)));
            var shFillW = Math.round(barW * shRatio);
            g.fillStyle = 'rgba(56, 189, 248, 0.88)';
            g.fillRect(barX, barY, shFillW, barH);
            var shimX = barX + (Math.floor(t * 0.18) % Math.max(1, shFillW));
            g.fillStyle = '#ffffff';
            g.fillRect(shimX, barY, 2, barH);
          }

          g.restore();
        }
      }
      /* Boss Warning Banner */
      if (w.bossWarning > 0) {
        var warnAlpha = Math.min(1, w.bossWarning / 400);
        g.save();
        g.globalAlpha = warnAlpha;
        var midY = Math.round(rows * 0.32);
        for (var stx = 0; stx < cols; stx += 16) {
          var stCol = ((stx + Math.floor(t / 50) * 8) % 32 < 16) ? '#dc2626' : '#18181b';
          g.fillStyle = stCol;
          g.fillRect(stx, midY - 14, 16, 3);
          g.fillRect(stx, midY + 15, 16, 3);
        }
        g.fillStyle = 'rgba(15, 23, 42, 0.90)';
        g.fillRect(0, midY - 11, cols, 26);
        var warnCol = (Math.floor(t / 100) % 2 === 0) ? '#fef08a' : '#ef4444';
        var wTxt1 = '▲▲▲ WARNING ▲▲▲';
        var wTxt2 = 'FLAGSHIP DREADNOUGHT APPROACHING';
        drawMText(g, wTxt1, Math.round(cols / 2 - mW(wTxt1) / 2), midY - 6, warnCol, 1);
        drawMText(g, wTxt2, Math.round(cols / 2 - mW(wTxt2) / 2), midY + 4, '#ffffff', 1);
        g.restore();
      }
      /* a real stick on the bus: the glass names the hand flying the
         ship — STICK, DPAD, or plain PAD before either speaks */
      if (padConnected || (w.padSeen && w.t - w.padSeen < 2000)) {
        var padHot = w.padSeen && w.t - w.padSeen < 2000;
        var padWord = padCtl === 'dpad' ? 'DPAD' : (padCtl === 'stick' ? 'STICK' : 'PAD');
        drawMText(g, padWord, rightEdge - mW(padWord), y3, padHot ? PC.gold : PC.slateHi, sc);
      }
      /* round 10 · you wear your ladder while you fly: the run's rank
         rides the alert row as gold chevrons (or the lone star), as
         far right as the alerts and the pad allow. It waits for a
         rung (ROOKIE draws nothing), and stands down only where the
         tube is too narrow to seat it — the same law that keeps the
         champion off a phone's glass. */
      if ((w.rankTier || 1) >= 2 && !narrow) {
        var rTier = Math.min(6, w.rankTier);
        var rTxt = RANK_TITLES[rTier - 1];
        var rBadgeW = (rTier >= 6 ? 7 : rTier * 6 - 1) * sc;
        var rW = rBadgeW + 4 * sc + mW(rTxt);
        /* the left edge the meters can reach: SPEC, CHAIN, READY */
        var rMinLeft = x0 + 24 * sc + 31 * sc + 4 * sc + mW('READY') + 6 * sc;
        var rBx = rightEdge - rW;
        if (rBx - 6 * sc >= rMinLeft) {
          rightEdge -= rW + 4 * sc;
          if (rTier >= 6) {
            drawSpr(g, SPR_STAR, rBx, y3 - Math.round(sc * 0.5), STAR_LEG, false, sc);
          } else {
            for (var rb = 0; rb < rTier; rb++) { drawSpr(g, SPR_CHEV, rBx + rb * 6 * sc, y3 + sc, CHEV_LEG, false, sc); }
          }
          drawMText(g, rTxt, rBx + rBadgeW + 4 * sc, y3, PC.slateHi, sc);
        }
      }
    }
    if (w) {
      /* during play BOTH tubes carry full ten-digit counters — the
         live pilot reads the odometer, which glows gold while the
         number is still counting toward its truth. Small tubes used
         to sit this out with a placeholder; a cabinet never hides
         your score from you. (A narrow tube keeps one odometer —
         the champion owns the other column.) */
      var s1 = curPlayer === 1 ? (w.dispScore != null ? w.dispScore : w.score) : (pScores[1] || 0);
      var s2 = curPlayer === 2 ? (w.dispScore != null ? w.dispScore : w.score) : (pScores[2] || 0);
      var roll1 = curPlayer === 1 && w.dispScore != null && w.dispScore !== w.score;
      var roll2 = curPlayer === 2 && w.dispScore != null && w.dispScore !== w.score;
      drawMText(g, pad10(s1), 5, y2, roll1 ? PC.gold : chrome, sc);
      if (!narrow) { drawMText(g, pad10(s2), cols - 5 - mW('0000000000'), y2, roll2 ? PC.gold : chrome, sc); }
    } else if (sc === 1) {
      /* wide tubes in attract: the idle pilots' kept scores */
      var s1i = curPlayer === 1 ? 0 : (pScores[1] || 0);
      var s2i = curPlayer === 2 ? 0 : (pScores[2] || 0);
      drawMText(g, pad10(s1i), 5, y2, chrome, sc);
      if (!narrow) { drawMText(g, pad10(s2i), cols - 5 - mW('0000000000'), y2, chrome, sc); }
    } else if (!narrow) {
      drawMText(g, '00', cols - 5 - mW('00'), y2, chrome, sc);
    }
  }

  /* #fwdebug opens a service hatch: the death/continue/portal loop
     is testable without winning a fight against a lander */
  if (typeof location !== 'undefined' && /fwdebug/.test(location.hash || '')) {
    window.__fw = {
      world: function () { return world; },
      actx: function () { return actx; },
      soundOn: function () { return soundOn; },
      hasBossMusic: function () { return !!bossMusicSource; },
      audioBuffers: function () { return audioBuffers; },
      kill: function () { killShip(null); },
      coin: function () { if (coinBtn) { coinBtn.click(); } },
      charge: function (n) { if (world) { world.kills = n; paintPBtns(); } },
      special: function () { fireSpecial(); },
      mother: function () { if (world && !world.mother && !world.shipDead) { spawnMother(world); } return world ? world.mother : null; },
      bossHit: function () { if (world && world.mother) { hitMother(world.mother, world.mother.sx + 40, world.mother.y + 20); } },
      bossDefeat: function () { if (world && world.mother) { world.mother.shield = 0; world.mother.hp = 1; hitMother(world.mother, world.mother.sx + 40, world.mother.y + 20); } },
      sector: function (n) {
        if (!world) { return; }
        world.sector = Math.max(1, Math.min(9, n | 0));
        world.sectorKills = 0;
        world.banner = {
          l1: 'SECTOR ' + (world.sector < 10 ? '0' + world.sector : world.sector),
          l2: sectorLine(world.sector),
          until: performance.now() + 2300
        };
      },
      /* round 8 hatches: force the planet's fall (the trigger needs
         zero live souls, at least one lander, and a spent timer —
         this primes all three so the next live frame fires it) and
         reap the mutants so the restoration can pay */
      fall: function () {
        if (!world || world.shipDead) { return 'need a live ship'; }
        var i;
        for (i = 0; i < world.hums.length; i++) { world.hums[i].gone = true; }
        if (!world.landers.filter(function (l) { return !l.gone; }).length) {
          world.landers.push({
            wx: world.worldX + world.cols * 0.6, y: Math.round(world.rows * 0.3),
            state: 'drift', ph: 0, gone: false, target: null
          });
        }
        world.zeroHumsT = 4900;
        return 'primed';
      },
      fallState: function () {
        return world ? {
          planetFall: !!world.planetFall, zeroHumsT: Math.round(world.zeroHumsT || 0),
          hums: world.hums ? world.hums.filter(function (h) { return !h.gone; }).length : 0,
          landers: world.landers ? world.landers.filter(function (l) { return !l.gone; }).length : 0,
          mutants: world.mutants ? world.mutants.filter(function (m) { return !m.gone; }).length : 0
        } : null;
      },
      reapMutants: function () {
        if (!world || !world.mutants.length) { return 'no mutants'; }
        world.mutants.forEach(function (m) {
          if (!m.gone) { boomAt(Math.round(m.wx - world.worldX), Math.round(m.y + 3), 10); m.gone = true; }
        });
        return 'reaped';
      },
      pause: function () { togglePause(); },
      isPaused: function () { return paused; },
      spawnLander: function () { spawnLander(); },
      blastAt: function (sx, sy, kind) { blastAt(sx, sy, kind); },
      craters: function () { return world ? (world.craters || []) : []; },
      terrRow: function (wx) { return terrRow(wx, world ? world.rows : 400); },
      /* round 5 hatches: force the idle show, read the ledger,
         wound the mother into rage, read the players' ledger */
      show: function (k) { openAttractShow(k); },
      showState: function () { return { idle: Math.round(attractIdleMs), show: attractShow ? attractShow.kind : null, next: attractNextKind }; },
      table: function () { return hiTable; },
      rage: function () { if (world && world.mother) { world.mother.shield = 0; world.mother.hp = 8; } },
      brag: function () { perfectBrag = performance.now() + 90000; },
      /* round 10 hatches: cross the next rank rung by hand, and read
         the ladder (this run's tier + the machine's kept best) */
      promote: function () {
        if (!world || world.shipDead) { return 'need a live ship'; }
        var TH = [5000, 15000, 30000, 60000, 100000];
        var next = 100000;
        for (var i = 0; i < TH.length; i++) { if (world.score < TH[i]) { next = TH[i]; break; } }
        if (!world.humanRun) { world.hiAtRunStart = hiScore; }
        world.humanRun = true;
        world.score = next + 10;
        world.dispScore = next + 10;
        return bumpHi(world) || 'score set to ' + world.score;
      },
      rank: function () {
        var rec = world && world.runWorld ? worldRec(world.runWorld) : null;
        return {
          run: world ? (world.rankTier || 1) : 0,
          best: bestRankTier,
          stored: parseInt(store('fw-best-rank') || '1', 10) || 1,
          patron: (world && world.runWorld) || '',
          gate: rec
        };
      },
      plate: function () { return { p1: pScores[1], p2: pScores[2], d1: !!pPlayed[1], d2: !!pPlayed[2], cur: curPlayer }; },
      sign: function () {
        if (world && world.shipDead) {
          world.humanRun = true;
          world.hiAtRunStart = 0;
          /* the real path captures the run's score on the entry — the
             hatch must too, or the signature commits as 0 and never
             earns its chair */
          hiEntry = { letters: ['A', 'A', 'A'], idx: 0, locked: 0, idle: 0, pt: 0, score: world.score || 0 };
          paintGoPlate();
        }
      },
      who: function () { return curPlayer; },
      /* the boot BIOS block as it currently reads. memory.js rewrites
         line 6 when a visitor locks a name into the wall, and the boot
         card is the only place that line is ever seen — so this is how
         you check the cabinet really did learn the name */
      post: function () { return POST.map(function (r) { return r[0] + (r[1] ? '  ' + r[1] : ''); }); },
      entry: function () { return hiEntry ? { idx: hiEntry.idx, locked: hiEntry.locked, letters: hiEntry.letters.join('') } : null; },
      entryKey: function (c) { entryKey(c); },
      commit: function () { commitHiEntry(); },
      /* round 12: the hatch map, printed — round 13 groups it by
         family, four short tables under gold headers, so finding
         the hatch you half-remember is one glance, not a scroll */
      help: function () {
        var G = [
          ['WORLD', {
            world: 'live world state (score, sector, ship, hums…)',
            kill: 'kill every lander on the glass',
            coin: 'drop a coin in the door',
            charge: 'prime the SPEC laser',
            special: 'fire the special',
            mother: 'spawn the mothership',
            sector: 'force the next sector',
            rage: 'wound the mothership into rage',
            fall: 'force the planet-fall endgame',
            fallState: 'read the endgame ledger',
            reapMutants: 'detonate every mutant'
          }],
          ['SHOWS', {
            show: "force an idle show: 'table' | 'board' | 'gates' | 'howto' | 'cast'",
            showState: 'read the idle show clock',
            table: 'the BEST PILOTS ledger',
            brag: 'light the FLAWLESS brag line for 90s'
          }],
          ['RANKS', {
            promote: 'cross the next rank rung by hand',
            rank: 'read the rank ladder + the patron gate record',
            plate: 'read both pilots\u2019 scores'
          }],
          ['SERVICE', {
            pause: 'flip the service switch (P)',
            sign: 'open the HIGH SCORE signature',
            who: 'whose hand owns the deck',
            entry: 'read the signing ceremony',
            entryKey: 'feed the signing a key code',
            commit: 'lock the signature in'
          }]
        ];
        if (typeof console !== 'undefined' && console.table) {
          for (var gi3 = 0; gi3 < G.length; gi3++) {
            console.log('%c\u2550\u2550 ' + G[gi3][0] + ' \u2550\u2550', 'color:#ffd76a;letter-spacing:2px');
            console.table(G[gi3][1]);
          }
        }
        var flat = {};
        for (var g4 = 0; g4 < G.length; g4++) {
          for (var k4 in G[g4][1]) { flat[k4] = G[g4][1][k4]; }
        }
        return flat;
      }
    };
  }
  /* the GAME OVER stamp, mounted on the glass as DOM so it sits ABOVE
     the introduction paragraph (the tube canvas lives behind the copy
     by design) — the paragraph recedes, the plate owns the glass */
  var goCv = $('.go-cv');
  function paintGoPlate() {
    if (!goCv) { return; }
    var g = goCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (hiEntry) { paintEntryFace(g); return; }
    var bl1 = 'GAME OVER', blRevive = 'PRESS ANY KEY TO REVIVE';
    /* the champion: when both pilots of the match have finished a
       run, the plate crowns the winner — the classic two-coin feud */
    var champ = null, c1 = 0, c2 = 0;
    if (world && world.shipDead && world.humanRun && pPlayed[1] && pPlayed[2]) {
      c1 = pScores[1] || 0;
      c2 = pScores[2] || 0;
      champ = c1 === c2 ? 0 : (c1 > c2 ? 1 : 2);
    }
    /* the handover hint: the deck is promised to the other pilot —
       START gives it to them (a coin instead keeps the same pilot) */
    var bl3 = (world && world.shipDead && world.humanRun &&
               world.nextPlayer && world.nextPlayer !== curPlayer)
      ? 'PLAYER ' + world.nextPlayer + ' UP' : null;
    var bl4 = champ === null ? null
      : (champ === 0 ? 'DRAW GAME' : 'PLAYER ' + champ + ' WINS');
    var bl5 = champ === null ? null
      : 'P1 ' + pad7(c1) + ' · P2 ' + pad7(c2);
    /* the pilot rank: the machine rates the run it just watched —
       a row of gold chevrons and a title under the continue prompt */
    var liveScore = (champ === null && world && world.dispScore != null &&
                     world.dispScore < world.score)
      ? world.dispScore : (world ? (world.score || 0) : 0);
    var rank = (champ === null && world && world.shipDead && world.humanRun)
      ? pilotRank(liveScore) : null;
    var rankBadgeW = rank ? (rank.tier >= 6 ? 7 : rank.tier * 6 - 1) : 0;
    var rankText = rank ? 'RANK ' + rank.t : '';
    var rw = rank ? (rankBadgeW + 4 + textW(rankText)) : 0;
    var bw = Math.max(textW(bl1, 2), textW(blRevive), bl5 ? textW(bl5) : 0, rw) + 24;
    var bh0 = bl4 ? 88 : (bl3 && rank ? 88 : (bl3 || rank ? 78 : 66));
    goCv.width = bw; goCv.height = bh0;
    goCv.className = 'go-cv pxcv';
    g.clearRect(0, 0, bw, bh0);
    /* the same notched plate the tube stamps — same pixels, new mount */
    g.fillStyle = PC.panelBd;
    g.fillRect(2, 0, bw - 4, bh0);
    g.fillRect(0, 2, bw, bh0 - 4);
    g.fillStyle = PC.panel;
    g.fillRect(2, 2, bw - 4, bh0 - 4);
    g.fillRect(1, 3, bw - 2, bh0 - 6);
    g.fillRect(3, 1, bw - 6, bh0 - 2);
    g.fillStyle = PC.panelHi;
    for (var pgx = 3; pgx < bw - 3; pgx += 3) { g.fillRect(pgx, 2, 1, 1); }
    drawText(g, bl1, Math.round(bw / 2 - textW(bl1, 2) / 2) + 1, 9, PC.goldDk, 2);
    drawText(g, bl1, Math.round(bw / 2 - textW(bl1, 2) / 2), 8, PC.score, 2);

    /* authentic 32x18 arcade dual coin door centered in front of player */
    var dw = 32, dh = 18;
    var dx = Math.round(bw / 2 - dw / 2);
    var dy = 23;
    var coinFlash = (Math.floor(performance.now() / 250) % 2) === 0;
    /* drop shadow */
    g.fillStyle = 'rgba(0,0,0,0.8)';
    g.fillRect(dx + 1, dy + 1, dw, dh);
    /* outer notched metal door plate */
    g.fillStyle = PC.metalBd;
    g.fillRect(dx + 1, dy, dw - 2, dh);
    g.fillRect(dx, dy + 1, dw, dh - 2);
    g.fillStyle = PC.metal;
    g.fillRect(dx + 1, dy + 1, dw - 2, dh - 2);
    g.fillStyle = PC.metalHi;
    g.fillRect(dx + 2, dy + 1, dw - 4, 1);
    g.fillRect(dx + 1, dy + 2, 1, dh - 4);
    g.fillStyle = PC.metalDk;
    g.fillRect(dx + 2, dy + dh - 2, dw - 4, 1);
    g.fillRect(dx + dw - 2, dy + 2, 1, dh - 4);
    /* corner door rivets */
    g.fillStyle = PC.ink;
    g.fillRect(dx + 2, dy + 2, 1, 1); g.fillRect(dx + dw - 3, dy + 2, 1, 1);
    g.fillRect(dx + 2, dy + dh - 3, 1, 1); g.fillRect(dx + dw - 3, dy + dh - 3, 1, 1);
    g.fillStyle = PC.metalHi;
    g.fillRect(dx + 2, dy + 2, 1, 1); g.fillRect(dx + dw - 3, dy + 2, 1, 1);

    /* center indicator LED with breathing glow */
    if (coinFlash) {
      g.fillStyle = 'rgba(255, 215, 106, 0.4)';
      g.fillRect(dx + 13, dy + 2, 6, 3);
    }
    g.fillStyle = coinFlash ? PC.gold : PC.goldDk;
    g.fillRect(dx + 14, dy + 3, 4, 1);
    if (coinFlash) { g.fillStyle = PC.goldHi; g.fillRect(dx + 15, dy + 3, 2, 1); }

    /* dual coin entry bezels (left & right) */
    var bxs = [dx + 4, dx + 18];
    for (var bi = 0; bi < 2; bi++) {
      var bx = bxs[bi];
      /* dark bezel border */
      g.fillStyle = PC.ink;
      g.fillRect(bx, dy + 3, 10, 12);
      g.fillStyle = PC.metalBd;
      g.fillRect(bx, dy + 3, 10, 1);
      g.fillRect(bx, dy + 14, 10, 1);
      g.fillRect(bx, dy + 3, 1, 12);
      g.fillRect(bx + 9, dy + 3, 1, 12);
      /* amber/orange push-to-reject button face */
      g.fillStyle = '#a64a14';
      g.fillRect(bx + 1, dy + 4, 8, 10);
      g.fillStyle = '#e8782a';
      g.fillRect(bx + 1, dy + 4, 8, 1);
      g.fillRect(bx + 1, dy + 4, 1, 10);
      /* high-contrast vertical coin slit */
      g.fillStyle = PC.ink;
      g.fillRect(bx + 4, dy + 5, 2, 8);
      g.fillStyle = PC.metalBd;
      g.fillRect(bx + 3, dy + 5, 1, 8);
      g.fillRect(bx + 6, dy + 5, 1, 8);
      /* gold glint on slot edge */
      g.fillStyle = coinFlash ? PC.gold : PC.goldHi;
      g.fillRect(bx + 4, dy + 6, 1, 5);
      /* coin poised at top of left slot */
      if (bi === 0 && coinFlash) {
        g.fillStyle = PC.gold;
        g.fillRect(bx + 3, dy + 4, 4, 1);
        g.fillStyle = PC.goldHi;
        g.fillRect(bx + 4, dy + 4, 2, 1);
      }
    }

    var rxKey = Math.round(bw / 2 - textW(blRevive) / 2);
    var ky = dy + dh + 4;
    drawText(g, blRevive, rxKey + 1, ky + 1, PC.goldDk, 1);
    drawText(g, blRevive, rxKey, ky, coinFlash ? PC.gold : PC.white, 1);

    if (bl3 && !bl4) {
      drawText(g, bl3, Math.round(bw / 2 - textW(bl3) / 2), ky + 11, PC.slateHi, 1);
    }
    if (rank) {
      var ry = bl3 ? ky + 21 : ky + 11;
      var rx = Math.round(bw / 2 - rw / 2);
      if (rank.tier >= 6) {
        drawSpr(g, SPR_STAR, rx, ry, STAR_LEG);
        rx += rankBadgeW + 4;
      } else {
        for (var rk = 0; rk < rank.tier; rk++) { drawSpr(g, SPR_CHEV, rx + rk * 6, ry, CHEV_LEG); }
        rx += rankBadgeW + 4;
      }
      drawText(g, rankText, rx, ry, PC.slateHi, 1);
    }
    if (bl4) {
      /* the crown: a pixel cup, a gold verdict, and the two scores
         that settled it — the plate becomes the podium */
      var tx = Math.round(bw / 2 - textW(bl4) / 2 - 14);
      drawSpr(g, SPR_TROPHY, tx, ky + 11, TROPHY_LEG);
      drawText(g, bl4, Math.round(bw / 2 - textW(bl4) / 2), ky + 13, PC.gold, 1);
      drawText(g, bl5, Math.round(bw / 2 - textW(bl5) / 2), ky + 23, PC.shellDk, 1);
    }
    goCv.style.width = (bw * PXG) + 'px';
    goCv.style.height = (bh0 * PXG) + 'px';
  }

  /* the initials face: HIGH SCORE! over three letter slots — signed
     letters burn gold, the slot in hand blinks white, the untouched
     rest wait in slate; the gold underline marks the slot in hand */
  function paintEntryFace(g) {
    var E = hiEntry;
    var bl1 = 'HIGH SCORE!';
    var bw = textW(bl1, 2) + 20;
    var bh0 = 70;
    goCv.width = bw; goCv.height = bh0;
    goCv.className = 'go-cv pxcv';
    g.clearRect(0, 0, bw, bh0);
    g.fillStyle = PC.panelBd;
    g.fillRect(2, 0, bw - 4, bh0);
    g.fillRect(0, 2, bw, bh0 - 4);
    g.fillStyle = PC.panel;
    g.fillRect(2, 2, bw - 4, bh0 - 4);
    g.fillRect(1, 3, bw - 2, bh0 - 6);
    g.fillRect(3, 1, bw - 6, bh0 - 2);
    g.fillStyle = PC.panelHi;
    for (var pgx = 3; pgx < bw - 3; pgx += 3) { g.fillRect(pgx, 2, 1, 1); }
    drawText(g, bl1, Math.round(bw / 2 - textW(bl1, 2) / 2), 7, PC.score, 2);
    var blink = (Math.floor(performance.now() / 330) % 2) === 0;
    var slotW = 14, gap = 10;
    var x0 = Math.round(bw / 2 - (slotW * 3 + gap * 2) / 2);
    for (var i = 0; i < 3; i++) {
      var sx = x0 + i * (slotW + gap);
      var ch = E.letters[i] || 'A';
      var isCur = i === E.idx;
      var col = i < E.locked ? PC.score : (isCur ? (blink ? PC.white : PC.goldLo) : PC.slateHi);
      drawText(g, ch, sx + 2, 26, col, 2);
      g.fillStyle = isCur && blink ? PC.gold : PC.panelHi;
      g.fillRect(sx, 44, slotW - 2, 2);
    }
    /* The legend tells the truth about the glass in front of you. On a
       keyboard the W/S and A/D names are the whole instruction; on a
       thumb they are a lie, because that plate's four bands are the
       controls. Both are painted, chosen by the pointer, so neither
       player is left reading keys they do not have. */
    var kbA = 'W/S CHANGE  A/D MOVE', kbB = 'FIRE TO LOCK';
    var tcA = '<<  v  ^  LOCK', tcB = 'TAP A BAND';
    if (finePointer.matches) {
      drawText(g, kbA, Math.round(bw / 2 - textW(kbA) / 2), 52, PC.shellDk, 1);
      drawText(g, kbB, Math.round(bw / 2 - textW(kbB) / 2), 61, PC.slateHi, 1);
    } else {
      drawText(g, tcA, Math.round(bw / 2 - textW(tcA) / 2), 52, PC.shellDk, 1);
      drawText(g, tcB, Math.round(bw / 2 - textW(tcB) / 2), 61, PC.slateHi, 1);
      /* the band seams, so the four targets are visible and not folklore */
      g.fillStyle = PC.panelHi;
      for (var seam = 1; seam < 4; seam++) { g.fillRect(Math.round(bw / 4 * seam), 50, 1, 10); }
    }
    goCv.style.width = (bw * PXG) + 'px';
    goCv.style.height = (bh0 * PXG) + 'px';
  }

  /* the signature ritual: W/S scroll a letter, A/D move the slot,
     FIRE locks it — three locks and the record has a name forever */
  function commitHiEntry() {
    if (!hiEntry) { return; }
    var nm = hiEntry.letters.join('').replace(/[^A-Z0-9]/g, '');
    hiName = nm.length === 3 ? nm : 'AAA';
    store('fw-hi-name', hiName);
    /* round 12: the signature rides to the patron gate's door too —
       the run's own world bucket takes the name with the score */
    if (world && world.runWorld && worldOwnsScore(world.runWorld, hiEntry.score || 0)) {
      worldSaveName(world.runWorld, hiName);
    }
    /* the signature earns its chair on the BEST PILOTS board */
    pushHiTable(hiName, hiEntry.score || 0);
    hiEntry = null;
    paintGoPlate();
    blip(659, 90);
    setTimeout(function () { blip(880, 90); }, 100);
    setTimeout(function () { blip(1319, 170); }, 210);
  }
  var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function entryKey(code) {
    if (!hiEntry) { return; }
    var E = hiEntry;
    E.idle = 0;
    var up = code === 'KeyW' || code === 'ArrowUp';
    var dn = code === 'KeyS' || code === 'ArrowDown';
    var lf = code === 'KeyA' || code === 'ArrowLeft';
    var rt = code === 'KeyD' || code === 'ArrowRight';
    var fire = code === 'Space' || code === 'Enter';
    if (up || dn) {
      var pos = ABC.indexOf(E.letters[E.idx]);
      if (pos < 0) { pos = 0; }
      pos = (pos + (up ? 1 : -1) + ABC.length) % ABC.length;
      E.letters[E.idx] = ABC.charAt(pos);
      blip(500 + pos * 16, 40);
    } else if (lf || rt) {
      /* left re-opens a signed slot; right may only walk across slots
         the pilot has already locked — the ritual has an order */
      if (lf) {
        E.idx = Math.max(0, E.idx - 1);
        E.locked = Math.min(E.locked, E.idx);
      } else if (E.idx < E.locked && E.idx < 2) {
        E.idx = E.idx + 1;
      }
      blip(360, 40);
    } else if (fire) {
      E.locked = E.idx + 1;
      if (E.locked >= 3) { commitHiEntry(); return; }
      E.idx = E.locked;
      blip(784, 60);
    }
    paintGoPlate();
  }
  /* the plate takes taps during the signing (thumbs on a phone).
     Four bands, not three: the old gesture mapped left third -> KeyA,
     right third -> KeyD, middle -> KeyW, and KeyW only ever scrolled a
     letter UP. Space is what LOCKS a letter, and it was on no band at
     all — so the signature could be started on a phone and never
     finished. The ceremony has four verbs (letter up, letter down, slot
     back, lock) and the plate is wide enough to carry all four. */
  if (goCv) {
    (goCv.parentElement || goCv).addEventListener('pointerdown', function (e) {
      if (hiEntry) {
        var r = goCv.getBoundingClientRect();
        if (!r.width) { return; }
        var fx = (e.clientX - r.left) / r.width;
        if (fx < 0.25) { entryKey('KeyA'); }        /* slot back   */
        else if (fx < 0.5) { entryKey('KeyS'); }   /* letter down  */
        else if (fx < 0.75) { entryKey('KeyW'); }  /* letter up    */
        else { entryKey('Space'); }                 /* lock it      */
        return;
      }
      if (world && world.shipDead) {
        if (coinBtn) { coinBtn.click(); }
      }
    });
  }

  /* ── the idle show · the cabinet talks when nobody plays ────
     A deck left alone long enough cycles the two screens every
     1980s machine knew by heart: the SCORE ADVANCE TABLE (what
     the sky's creatures are worth) and the BEST PILOTS board (the
     five highest names this cabinet keeps). Any hand at the
     controls sweeps both away and the demo resumes. */
  var attractShow = null;      /* { kind: 'table'|'board', until, pt } */
  var attractIdleMs = 0;       /* wall-clock ms since the last hand */
  var attractNextKind = 'table';
  /* the cabinet's memory of a flawless sector: the BEST PILOTS card
     carries a gold brag line for a while after one lands */
  var perfectBrag = 0;
  function openAttractShow(kind) {
    attractShow = {
      kind: (kind === 'board' || kind === 'howto' || kind === 'cast' ||
             kind === 'gates') ? kind : 'table',
      until: performance.now() + 8200,
      pt: 0,
      t0: performance.now()   /* round 11: the tricks read their cue off this */
    };
    /* round 13: the rotation grows a third screen — table, board,
       GATE CHAMPIONS, howto, cast. The four doors get their turn
       on the marquee between the pilots and the lessons. */
    attractNextKind = attractShow.kind === 'table' ? 'board'
      : (attractShow.kind === 'board' ? 'gates'
      : (attractShow.kind === 'gates' ? 'howto'
      : (attractShow.kind === 'howto' ? 'cast' : 'table')));
    attractIdleMs = 0;
    html.classList.add('attract-show');   /* the copy recedes, the tube owns the glass */
    html.setAttribute('data-show', attractShow.kind);   /* the DOM caption reads it */
    blip(523, 70);
    setTimeout(function () { blip(659, 90); }, 90);
    /* the cast parade gets its own entrance: each keeper answers the
       door with a rising note as their name goes up on the tube */
    if (attractShow.kind === 'cast') {
      for (var ci = 0; ci < 4; ci++) {
        (function (nn) {
          setTimeout(function () {
            if (attractShow && attractShow.kind === 'cast') { blip(392 + nn * 110, 55); }
          }, 320 + nn * 420);
        })(ci);
      }
      /* round 11: the tricks take turns too — each keeper performs
         its rare trick on stage and answers with its own voice */
      var VK = ['ingot', 'gem', 'bolt', 'bloom'];
      for (var tv = 0; tv < 4; tv++) {
        (function (nv) {
          setTimeout(function () {
            if (attractShow && attractShow.kind === 'cast') { keeperVoice(VK[nv]); }
          }, 1400 + nv * 1600);
        })(tv);
      }
    }
    /* round 13: the gates card walks the four doors in order — one
       soft rising knock per gate, gold to pink, like a knuckle
       tapping each doorframe down the hall */
    if (attractShow.kind === 'gates') {
      for (var gi2 = 0; gi2 < 4; gi2++) {
        (function (gn) {
          setTimeout(function () {
            if (attractShow && attractShow.kind === 'gates') { blip(330 + gn * 82, 55); }
          }, 260 + gn * 380);
        })(gi2);
      }
    }
  }
  function closeAttractShow() {
    if (!attractShow) { return; }
    attractShow = null;
    html.classList.remove('attract-show');
    html.removeAttribute('data-show');
  }
  /* every path a human hand can take lands here: the idle clock
     resets, the show folds, the pilot is theirs again. The takeover
     also seeds the run: the record it has to beat is the one on the
     glass NOW (a stale 0 once opened the signature for any run —
     a ceremony nobody earned), and the ladder starts empty. */
  function touchDeck(w) {
    attractIdleMs = 0;
    closeAttractShow();
    if (w && !w.humanRun) {
      w.hiAtRunStart = hiScore;
      w.runStartT = w.t;
      w.rankTier = 1;
      /* round 12: whose patronage is this run under? The gate you
         last walked through keeps the record of your best day.
         round 14: doStart already locks the door the instant START
         lands — before its scroll to world one rewrites the chrome.
         A hand that arrives late (first WASD after a mouse START)
         keeps that door instead of inheriting world one's. */
      if (w.runWorld === undefined) { w.runWorld = currentWorld || lastWorld || ''; }
    }
    if (w) { w.lastManualAt = w.t; w.humanRun = true; }
  }

  /* ── round 12 · the four doors keep their own records ────
     One cabinet, four gates: a run made under a world's patronage
     also writes that gate's own kept best — score, name and rank
     live in fw-*-0<world> keys, and the gate pages read their own
     bucket first (GATE RECORD) before falling back to the cabinet's
     global wall (CABINET RECORD). */
  function worldBucket(wid) {
    var n = parseInt(wid, 10);
    if (!(n >= 1 && n <= 4)) { return null; }
    return '0' + n;
  }
  function worldRec(wid) {
    var b = worldBucket(wid);
    if (!b) { return null; }
    return {
      s: Math.max(0, parseInt(store('fw-hiscore-' + b) || '0', 10) || 0),
      n: (store('fw-hi-name-' + b) || 'AAA'),
      r: Math.max(1, Math.min(6, parseInt(store('fw-best-rank-' + b) || '1', 10) || 1))
    };
  }
  function worldScoreBeat(wid, sc) {
    var b = worldBucket(wid);
    if (!b) { return false; }
    return sc > (parseInt(store('fw-hiscore-' + b) || '0', 10) || 0);
  }
  /* the signing test: the run that SET the door record (its score
     equals the kept bucket, having raised it mid-run) owns the name
     on it just as much as a run that beat the bucket outright */
  function worldOwnsScore(wid, sc) {
    var b = worldBucket(wid);
    if (!b) { return false; }
    return sc > 0 && sc >= (parseInt(store('fw-hiscore-' + b) || '0', 10) || 0);
  }
  function worldSaveScore(wid, sc) {
    var b = worldBucket(wid);
    if (b) { store('fw-hiscore-' + b, '' + Math.max(0, Math.floor(sc))); }
    paintWorldChips();
  }
  function worldSaveName(wid, nm) {
    var b = worldBucket(wid);
    if (b) { store('fw-hi-name-' + b, nm); }
    paintWorldChips();
  }
  function worldSaveRank(wid, tier) {
    var b = worldBucket(wid);
    if (!b) { return; }
    var was = Math.max(1, Math.min(6, parseInt(store('fw-best-rank-' + b) || '1', 10) || 1));
    if (tier > was) { store('fw-best-rank-' + b, '' + tier); }
    paintWorldChips();
  }

  /* round 14 · the doors wear their records on the page itself —
     the same buckets the gate pages read, stamped under each
     keeper's name on the cabinet's own shelf. A door nobody has
     scored under says nothing: honest silence, no placeholder. */
  function paintWorldChips() {
    var chips = $$('.terra-rec');
    for (var ci = 0; ci < chips.length; ci++) {
      var el = chips[ci];
      var rec3 = worldRec(el.getAttribute('data-rec') || '');
      if (!rec3 || rec3.s <= 0) { el.hidden = true; continue; }
      el.textContent = 'GATE RECORD ' + pad10(rec3.s) + ' \u00b7 ' + rec3.n +
        (rec3.r >= 2 ? ' \u00b7 RANK ' + RANK_TITLES[Math.min(6, rec3.r) - 1] : '');
      el.hidden = false;
    }
  }

  /* the BEST PILOTS ledger — five names and the scores that earned
     them, kept on this cabinet between visits; the newest signature
     blinks until the next one arrives */
  var DEFAULT_HI_TABLE = [
    { n: 'NEO', s: 12450 },
    { n: 'ACE', s: 9800 },
    { n: 'RAD', s: 7500 },
    { n: 'MAX', s: 5200 },
    { n: 'AAA', s: 3100 }
  ];
  var hiTable = [];
  try { hiTable = JSON.parse(store('fw-hi-table') || '[]') || []; } catch (e) { hiTable = []; }
  if (!Array.isArray(hiTable)) { hiTable = []; }
  hiTable = hiTable.filter(function (r) { return r && r.n && r.s > 0; }).slice(0, 5);
  if (!hiTable.length && hiScore > 0) { hiTable = [{ n: hiName, s: hiScore }]; }
  for (var dti = 0; dti < DEFAULT_HI_TABLE.length && hiTable.length < 5; dti++) {
    var def = DEFAULT_HI_TABLE[dti];
    var exists = false;
    for (var dtk = 0; dtk < hiTable.length; dtk++) {
      if (hiTable[dtk].n === def.n) { exists = true; break; }
    }
    if (!exists) { hiTable.push({ n: def.n, s: def.s }); }
  }
  hiTable.sort(function (a, b) { return (b.s || 0) - (a.s || 0); });
  hiTable = hiTable.slice(0, 5);
  function saveHiTable() { store('fw-hi-table', JSON.stringify(hiTable)); }
  function pushHiTable(nm, sc) {
    if (!sc || sc <= 0) { return; }
    /* remember who sat where, so a pilot who slides down the ladder
       can wear the small red arrow of the displaced */
    var prevRank = {};
    var ii;
    for (ii = 0; ii < hiTable.length; ii++) { prevRank[hiTable[ii].n] = ii; delete hiTable[ii].fresh; }
    hiTable.push({ n: nm, s: sc, fresh: true });
    hiTable.sort(function (a, b) { return (b.s || 0) - (a.s || 0); });
    hiTable = hiTable.slice(0, 5);
    var nowMs = performance.now();
    for (ii = 0; ii < hiTable.length; ii++) {
      var pr = prevRank[hiTable[ii].n];
      if (pr !== undefined && ii > pr) { hiTable[ii].dropUntil = nowMs + 4200; }
    }
    saveHiTable();
  }

  /* the champion's cup — nine by nine pixels of gold */
  var SPR_TROPHY = [
    '.TTTTTTT.',
    'TTTTTTTTT',
    'TTT.W.TTT',
    '.TTTTTTT.',
    '..TTTTT..',
    '...TTT...',
    '....T....',
    '..DDDDD..',
    '.DDDDDDD.'
  ];
  var TROPHY_LEG = { T: PC.gold, W: PC.white, D: PC.goldLo };

  /* the pilot rank: the machine rates the run it just watched. Six
     titles, each worth its own badge — gold chevrons one to five,
     and a lone star for the chair nobody sits in twice. The badge
     you wear until the next coin pushes you up the ladder. */
  function pilotRank(score) {
    if (score >= 100000) { return { t: 'DEFENDER', tier: 6 }; }
    if (score >= 60000) { return { t: 'ACE', tier: 5 }; }
    if (score >= 30000) { return { t: 'VETERAN', tier: 4 }; }
    if (score >= 15000) { return { t: 'PILOT', tier: 3 }; }
    if (score >= 5000) { return { t: 'CADET', tier: 2 }; }
    return { t: 'ROOKIE', tier: 1 };
  }
  var SPR_CHEV = [
    'X...X',
    '.X.X.',
    '..X..'
  ];
  var CHEV_LEG = { X: PC.gold };
  var SPR_STAR = [
    '...X...',
    '...X...',
    '.XXXXX.',
    '..XWX..',
    '..XXX..',
    '.X...X.'
  ];
  var STAR_LEG = { X: PC.gold, W: PC.white };

  /* round 10 · the ladder answers mid-run: the instant the odometer
     crosses a rung the glass says so — stamped banner, the promotion
     fanfare — and the cabinet keeps the best rank ever worn on this
     machine, the way it keeps the high score. The demo pilot never
     climbs: the ladder is for the hands on the deck. */
  var RANK_TITLES = ['ROOKIE', 'CADET', 'PILOT', 'VETERAN', 'ACE', 'DEFENDER'];
  var bestRankTier = 1;
  function checkRankUp(w) {
    var r = pilotRank(w.score || 0);
    if (r.tier <= (w.rankTier || 1)) { return false; }
    w.rankTier = r.tier;
    if (r.tier > bestRankTier) {
      bestRankTier = r.tier;
      store('fw-best-rank', '' + bestRankTier);
    }
    /* round 12: the patron gate keeps the run's rank on its own door */
    if (w.runWorld) { worldSaveRank(w.runWorld, r.tier); }
    w.banner = {
      l1: 'RANK UP',
      l2: 'NOW ' + r.t + (r.tier >= 6 ? '!' : ''),
      until: performance.now() + 2300
    };
    popAt(w, Math.round(w.cols / 2), Math.round(w.rows * 0.30) + 22, 'RANK UP');
    if (r.tier >= 6) {
      /* the summit: the lone star earns its own fanfare, the glass
         answers with a burst of gold sparks under the banner, and
         round 12 lets the whole tube surge gold for a beat — the
         coin-door dither, repurposed as a promotion surge */
      starBurst(w, Math.round(w.cols / 2), Math.round(w.rows * 0.30) + 12);
      w.flash = 900;
      sfx('defstar');
    } else {
      sfx('rankup');
    }
    return true;
  }

  /* the two attract cards, drawn ON the tube (the copy has receded
     behind them via html.attract-show). Same notched panel + dither
     halo recipe as the boot title card — the cabinet keeps one face */
  function attractPanel(g, cols, rows, pw, ph, cy) {
    var px = Math.round(cols / 2 - pw / 2);
    var py = Math.round((cy || rows / 2) - ph / 2);
    for (var hy = -1; hy <= ph; hy++) {
      for (var hxx = -1; hxx <= pw; hxx++) {
        var edge = (hxx === -1 || hxx === pw || hy === -1 || hy === ph);
        if (!edge) { continue; }
        if (bayerAt(hxx, hy) < 0.5) {
          g.fillStyle = PC.panel;
          g.fillRect(px + hxx, py + hy, 1, 1);
        }
      }
    }
    g.fillStyle = PC.panelBd;
    g.fillRect(px + 2, py, pw - 4, ph);
    g.fillRect(px, py + 2, pw, ph - 4);
    g.fillRect(px + 1, py + 1, pw - 2, ph - 2);
    g.fillStyle = PC.panel;
    g.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    g.fillRect(px + 1, py + 3, pw - 2, ph - 6);
    g.fillRect(px + 3, py + 1, pw - 6, ph - 2);
    g.fillStyle = PC.panelHi;
    for (var gx = px + 3; gx < px + pw - 3; gx += 3) { g.fillRect(gx, py + 2, 1, 1); }
    return { x: px, y: py };
  }

  /* the cast parade: the four keepers of the worlds, pocket-sized.
     Same souls that wait in the terrarium plates, painted at sprite
     scale and kept alive with a shared two-frame heart — the tube
     introduces the cast exactly the way a 1981 cabinet would. */
  function castKeeper(g, i, x, y, t, rareS) {
    var k = Math.floor(t / 380) % 2;
    if (i === 0) {                       /* شمشونی · the ingot: proud hop */
      var hop = ((t % 4200) < 520) ? -Math.round(Math.sin((t % 520) / 520 * Math.PI) * 3) : 0;
      var iy = y + 4 + hop;
      var r;
      for (r = 0; r < 7; r++) {
        var hw = Math.round(2 + r * 0.72);
        g.fillStyle = r < 1 ? '#fff4cc' : (r < 5 ? '#ffd76a' : '#ab8420');
        g.fillRect(x + 6 - hw, iy + r, hw * 2, 1);
      }
      g.fillStyle = '#fff4cc';
      g.fillRect(x + 5, iy, 1, 1); g.fillRect(x + 8, iy, 1, 1);
      var bl = (t % 3400) < 140;
      g.fillStyle = '#2b1e0a';
      if (bl) { g.fillRect(x + 4, iy + 3, 2, 1); g.fillRect(x + 8, iy + 3, 2, 1); }
      else { g.fillRect(x + 5, iy + 2, 1, 2); g.fillRect(x + 8, iy + 2, 1, 2); }
      g.fillRect(x + 5, iy + 5, 3, 1);
      if ((t % 6000) < 300) {
        g.fillStyle = '#fff4cc';
        g.fillRect(x + 14, iy - 2, 1, 3); g.fillRect(x + 13, iy - 1, 3, 1);
      }
      /* round 11: the trick — six coins hop out of the ingot and
         rain back down, then a gold crown cross settles above it */
      if (rareS >= 0 && rareS < 1.6) {
        var cc;
        for (cc = 0; cc < 6; cc++) {
          var cp = (rareS - cc * 0.14) / 0.9;
          if (cp < 0 || cp > 1) { continue; }
          var cxp = x + 6 + (cc - 2.5) * 3.4;
          var cyp = iy + 1 - Math.sin(cp * Math.PI) * 7;
          g.fillStyle = cc % 2 ? '#ffd76a' : '#fff4cc';
          g.fillRect(Math.round(cxp), Math.round(cyp), 2, 2);
        }
        if (rareS > 0.95 && (Math.floor(rareS * 11) % 2) === 0) {
          g.fillStyle = '#fff4cc';
          g.fillRect(x + 6, iy - 4, 1, 1);
          g.fillRect(x + 4, iy - 2, 1, 1); g.fillRect(x + 8, iy - 2, 1, 1);
          g.fillRect(x + 2, iy, 1, 1); g.fillRect(x + 10, iy, 1, 1);
        }
      }
    } else if (i === 1) {                /* الماسک · the ruby: float + glint */
      var bob = Math.round(Math.sin(t * 0.0026) * 2);
      var gy = y + 3 + bob;
      var wds = [1, 3, 5, 7, 7, 5, 3, 1];
      var dr;
      for (dr = 0; dr < 8; dr++) {
        g.fillStyle = dr < 3 ? '#ff85a2' : (dr < 6 ? '#ff2a6d' : '#990033');
        g.fillRect(x + 6 - Math.floor(wds[dr] / 2), gy + dr, wds[dr], 1);
      }
      g.fillStyle = '#ffffff';
      g.fillRect(x + 6, gy + 1, 2, 1);
      if ((t % 2200) < 260) {
        g.fillStyle = k ? '#ffffff' : '#ff85a2';
        g.fillRect(x + 13, gy + 2, 1, 3); g.fillRect(x + 12, gy + 3, 3, 1);
      }
      /* round 11: the trick — a prism of three nested diamonds
         unfolds around the ruby, shade by shade */
      if (rareS >= 0 && rareS < 1.6) {
        var pp = Math.min(1, rareS / 0.85);
        var pr = Math.round(pp * 7);
        var cols3 = ['#ff85a2', '#ff2a6d', '#990033'];
        var dd;
        for (dd = 0; dd < 3; dd++) {
          var rr = pr - dd * 2;
          if (rr < 1) { continue; }
          g.fillStyle = cols3[dd];
          g.fillRect(x + 6 + rr, gy + 3, 1, 1);
          g.fillRect(x + 6 - rr, gy + 3, 1, 1);
          g.fillRect(x + 6, gy + 3 - rr, 1, 1);
          g.fillRect(x + 6, gy + 3 + rr, 1, 1);
        }
      }
    } else if (i === 2) {                /* پیچِک · the bolt: audits, LED blinks */
      var by2 = y + 4 + (k ? 1 : 0);
      g.fillStyle = '#444456';
      g.fillRect(x + 2, by2, 10, 6);
      g.fillStyle = '#787890';
      g.fillRect(x + 2, by2, 10, 1); g.fillRect(x + 3, by2 + 1, 1, 3);
      g.fillStyle = '#2c2c38';
      g.fillRect(x + 2, by2 + 5, 10, 1);
      g.fillStyle = '#161620';
      g.fillRect(x + 1, by2 + 6, 12, 1);
      g.fillStyle = ((t % 1600) < 800) ? '#50e3c2' : '#1f443e';
      g.fillRect(x + 6, by2 + 2, 2, 2);
      g.fillStyle = k ? '#ffd76a' : '#54401a';
      g.fillRect(x + 3, by2 + 2, 2, 1); g.fillRect(x + 9, by2 + 2, 2, 1);
      g.fillStyle = '#787890';
      g.fillRect(x + 7, by2 - 3, 1, 3);
      g.fillStyle = ((t % 900) < 450) ? '#ff85a2' : '#787890';
      g.fillRect(x + 7, by2 - 4, 1, 1);
      if ((t % 2600) < 200) {
        g.fillStyle = '#ffd76a';
        g.fillRect(x + 14, by2 + 3, 1, 1); g.fillRect(x + 15, by2 + 5, 1, 1);
      }
      /* round 11: the trick — a teal spark laps the hull twice
         while the amber eyes burn solid gold */
      if (rareS >= 0 && rareS < 1.6) {
        var lapP = (rareS % 0.8) / 0.8;
        var lx2 = lapP < 0.5
          ? x + 1 + Math.round(lapP * 2 * 13)
          : x + 14 - Math.round((lapP - 0.5) * 2 * 13);
        g.fillStyle = '#50e3c2';
        g.fillRect(lx2, lapP < 0.5 ? by2 - 1 : by2 + 7, 1, 1);
        g.fillStyle = '#ffd76a';
        g.fillRect(x + 3, by2 + 2, 2, 1); g.fillRect(x + 9, by2 + 2, 2, 1);
      }
    } else {                             /* یاسِک · the jasmine: sway + petal */
      var sw2 = Math.round(Math.sin(t * 0.0021) * 2);
      g.fillStyle = '#b3563a';
      g.fillRect(x + 4, y + 10, 6, 3);
      g.fillStyle = '#d97b52';
      g.fillRect(x + 4, y + 10, 6, 1);
      g.fillStyle = '#7e3a28';
      g.fillRect(x + 4, y + 12, 6, 1);
      g.fillStyle = '#3fae5a';
      g.fillRect(x + 7 + (sw2 > 0 ? 1 : 0), y + 7, 1, 3);
      var bx2 = x + 6 + sw2;
      g.fillStyle = '#f7f3e8';
      g.fillRect(bx2, y + 4, 5, 3); g.fillRect(bx2 + 1, y + 3, 3, 1); g.fillRect(bx2 + 1, y + 7, 3, 1);
      g.fillStyle = '#ffd76a';
      g.fillRect(bx2 + 2, y + 5, 1, 1);
      if ((t % 7000) < 2000) {
        var dp2 = (t % 7000) / 2000;
        g.fillStyle = '#f7f3e8';
        g.fillRect(bx2 + 6 + Math.round(dp2 * 3), y + 8 + Math.round(dp2 * 5), 1, 1);
      }
      /* round 11: the trick — a spiral of petals climbs the stem to
         the ceiling of the case, and a light ring waits up there */
      if (rareS >= 0 && rareS < 1.6) {
        var pe;
        for (pe = 0; pe < 7; pe++) {
          var pep = (rareS - pe * 0.13) / 1.15;
          if (pep < 0 || pep > 1) { continue; }
          var pa = pep * 4.4 + pe * 0.9;
          var pr2 = 5 - Math.round(pep * 3);
          g.fillStyle = pe % 2 ? '#f7f3e8' : '#ffd76a';
          g.fillRect(x + 6 + Math.round(Math.cos(pa) * pr2),
                     y + 9 - Math.round(pep * 8), 1, 1);
        }
        if (rareS > 1.1 && (Math.floor(rareS * 13) % 2) === 0) {
          g.fillStyle = '#ffd76a';
          g.fillRect(x + 3, y + 1, 7, 1);
          g.fillRect(x + 2, y + 2, 1, 1); g.fillRect(x + 10, y + 2, 1, 1);
        }
      }
    }
  }

  function drawAttractCard(g, cols, rows, t) {
    /* near-black wash — the demo keeps breathing underneath, dimmed */
    g.fillStyle = 'rgba(11,11,15,0.90)';
    g.fillRect(0, 0, cols, rows);
    var isTable = attractShow.kind === 'table';
    var isHow = attractShow.kind === 'howto';
    var isCast = attractShow.kind === 'cast';
    var isGates = attractShow.kind === 'gates';
    var hdr = isTable ? '- SCORE ADVANCE TABLE -'
      : (isHow ? '- HOW TO PLAY -'
      : (isGates ? '- GATE CHAMPIONS -'
      : (isCast ? '- MEET THE KEEPERS -' : '- BEST PILOTS -')));
    var rowH = 20, padT = 9;
    var pw = Math.min(cols - 10, 188);
    /* the howto card earns a sixth row: the secret lives at the foot
       of the page, and the cabinet wants you to go find it. The
       table card grows a brag line for a while after a flawless
       sector — a cabinet that watched you win likes to say so. And
       the best rank ever worn on this machine keeps a line of its
       own, for as long as it stays above ROOKIE. */
    var bragPerfect = isTable && performance.now() < perfectBrag;
    var bragRank = isTable && bestRankTier >= 2;
    var brag = bragPerfect || bragRank;
    var nRows = isCast || isGates ? 4 : (isHow ? 7 : 5);
    var ph = padT + 11 + nRows * rowH + 13 + (brag ? 12 : 0);
    /* round 13 · the deck-aware show: the hardware row is bolted
       into the hero's flow, so its screen height moves with the
       tube's shape — a tall phone parks the joystick right where
       the old fixed center wanted the card, and the PRESS START
       line hid behind the FIRE dome for real. Ask the DOM where the
       deck sits; if the standard float would cross it, tighten the
       rows and lift the card into the free band between the glass
       HUD and the hardware. Tubes where the card already clears the
       deck draw exactly as before — not one pixel moved. */
    var deckTopL = null;
    var deckEl = document.querySelector('.joy') || document.querySelector('.pbtn');
    if (deckEl) {
      var deckR = deckEl.getBoundingClientRect();
      if (deckR && deckR.top > 1 && deckR.top < rows * PXG) {
        deckTopL = Math.floor(deckR.top / PXG);
      }
    }
    var hudSc = PXG <= 2 ? 2 : 1;
    var bandTop = 2 + 20 * hudSc + 2;                 /* under the glass HUD */
    var bandBot = deckTopL != null ? deckTopL - 6 : rows;   /* above the deck */
    var stdCy = rows * 0.36;
    var fitsStd = (stdCy + ph / 2) <= bandBot && (stdCy - ph / 2) >= bandTop;
    if (!fitsStd && deckTopL != null) {
      var chromeH = ph - nRows * rowH;
      var availH = bandBot - bandTop;
      if (availH > chromeH + nRows * 14) {
        rowH = Math.floor((availH - chromeH) / nRows);
        ph = chromeH + nRows * rowH;
      }
    }
    var cardCy = (!fitsStd && deckTopL != null)
      ? Math.max(bandTop + ph / 2, bandBot - ph / 2)
      : stdCy;
    /* the card floats in the UPPER glass: the deck (joystick, domes)
       is bolted over the lower third, and the show never plays behind
       the hardware */
    var box = attractPanel(g, cols, rows, pw, ph, cardCy);
    /* header: gold, breathing slow like a marquee bulb */
    var hb = (Math.floor(t / 460) % 2) === 0;
    drawText(g, hdr, Math.round(cols / 2 - textW(hdr) / 2), box.y + padT, hb ? PC.gold : PC.goldLo, 1);
    var blink = (Math.floor(t / 330) % 2) === 0;
    var ry0 = box.y + padT + 11 + 4;
    if (isTable) {
      /* every creature of the sky, animated, with its price —
         exactly what the demo behind the card is worth */
      var TR = [
        [SPR_LANDER, LANDER_LEG, 'LANDER', '150 PTS'],
        [SPR_LANDER_T, LANDER_LEG_T, 'TRACTOR', '300 PTS'],
        [SPR_MUTANT, MUT_LEG, 'MUTANT', '500 PTS'],
        [SPR_MOTHER, MOTHER_LEG, 'FLAGSHIP', '5000 PTS'],
        [SPR_HUM, HUM_LEG, 'HUMANOID', 'SAVE THEM!']
      ];
      var sway = Math.round(Math.sin(t * 0.003) * 1.5);
      for (var i = 0; i < TR.length; i++) {
        var row = TR[i];
        var ry = ry0 + i * rowH;
        var spr = row[0];
        if (i === 2 && (Math.floor(t / 180) % 2)) { spr = SPR_MUTANT2; }   /* the mutant flaps */
        var bob = Math.round(Math.sin(t * 0.004 + i * 1.7) * 1.5);
        if (spr === SPR_MOTHER && drawSheetFrame(g, 'mother', Math.floor(t / 70) % 36, box.x + 14 + sway - 1, ry + bob - 1, 38, 20)) {
          /* animated flagship mothership */
        } else {
          drawSpr(g, spr, box.x + 16 + sway, ry + bob + 1, row[1]);
        }
        if (i === 1 && blink) {
          /* the tractor hangs its beam even on the placard */
          g.fillStyle = '#7a1f4d';
          g.fillRect(box.x + 20, ry + 10, 1, 6);
          g.fillRect(box.x + 22, ry + 10, 1, 6);
        }
        drawText(g, row[2], box.x + 46, ry + 2, PC.shell, 1);
        drawText(g, row[3], box.x + pw - 7 - textW(row[3]), ry + 2, i === 4 ? PC.press : PC.gold, 1);
      }
    } else if (isHow) {
      /* the third classic: HOW TO PLAY — pixel key caps drawn like the
         deck's own hardware, one row per thing a pilot must know */
      function keyCap(x, y, w, h, label) {
        g.fillStyle = PC.metalBd;
        g.fillRect(x, y, w, h);
        g.fillStyle = PC.metal;
        g.fillRect(x + 1, y + 1, w - 2, h - 2);
        g.fillStyle = PC.metalHi;
        g.fillRect(x + 1, y + 1, w - 2, 1);
        g.fillRect(x + 1, y + 1, 1, h - 2);
        if (label) { drawMText(g, label, x + Math.round((w - mTextW(label)) / 2), y + Math.round((h - 5) / 2), PC.shell); }
      }
      var ix = box.x + 14;
      var HY = [
        ['FLY', 'WASD'],
        ['FIRE', 'SPACE'],
        ['SPECIAL', 'KEY E'],
        ['PAUSE', 'KEY P'],
        ['RESCUE', 'SHOOT CARRIER'],
        ['SECRET', 'PAGE FOOT'],
        ['RANKS', '6 RANKS']
      ];
      for (var hi = 0; hi < HY.length; hi++) {
        var hy = ry0 + hi * rowH;
        if (hi === 0) {
          /* the WASD cluster: an inverted T of five-pixel caps */
          keyCap(ix + 8, hy, 7, 7, 'W');
          keyCap(ix, hy + 8, 7, 7, 'A');
          keyCap(ix + 8, hy + 8, 7, 7, 'S');
          keyCap(ix + 16, hy + 8, 7, 7, 'D');
        } else if (hi === 1) {
          /* the long bar: the one key every pilot finds by feel */
          keyCap(ix + 1, hy + 5, 24, 6, null);
          g.fillStyle = PC.metalHi;
          g.fillRect(ix + 3, hy + 7, 20, 1);
        } else if (hi === 2) {
          for (var pp = 0; pp < 4; pp++) {
            g.fillStyle = pp < 3 || blink ? PC.gold : PC.slate;
            g.fillRect(ix + 1 + pp * 6, hy + 3, 4, 6);
          }
        } else if (hi === 3) {
          keyCap(ix + 4, hy, 7, 7, 'P');
        } else if (hi === 5) {
          /* the secret row: a tiny gold arrow pointing down the page,
             blinking like it knows something you don't yet */
          var aw = blink ? 0 : 1;
          g.fillStyle = PC.gold;
          g.fillRect(ix + 6, hy + 2, 5, 1);
          g.fillRect(ix + 7, hy + 3, 3, 1);
          g.fillRect(ix + 8, hy + 4, 1, 1);
          if (aw) { g.fillRect(ix + 8, hy + 5, 1, 1); }
        } else if (hi === 6) {
          /* round 12: the rank ladder marches in place — chevrons
             fill up one by one as the value name climbs the six
             titles, a poster of everything a pilot can wear */
          var rTier = (Math.floor(t / 700) % 6) + 1;
          for (var rc2 = 0; rc2 < 5; rc2++) {
            drawSpr(g, SPR_CHEV, ix + rc2 * 6, hy + 3, rc2 < rTier ? CHEV_LEG : { X: PC.slate });
          }
        } else {
          var hsway = Math.round(Math.sin(t * 0.003) * 1.5);
          drawSpr(g, SPR_HUM, ix + 4 + hsway, hy + 1, HUM_LEG);
        }
        drawText(g, HY[hi][0], box.x + 46, hy + 2, hi >= 5 ? PC.slateHi : PC.shell, 1);
        drawText(g, HY[hi][1], box.x + pw - 7 - textW(HY[hi][1]), hy + 2,
          hi === 6 ? (blink ? PC.gold : PC.press)
          : (hi === 5 ? (blink ? PC.gold : PC.press) : (hi === 4 ? PC.press : PC.gold)), 1);
      }
    } else if (isCast) {
      /* the keepers take a bow: four rows, one cameo each, painted
         alive with the same two-frame heart the terrariums breathe
         with. The tube speaks Latin; the plates greet you in Persian
         down the page — each keeps its own door. */
      var KAST = [
        { nm: 'W01 SHAMSHUNI', tag: 'INGOT' },
        { nm: 'W02 ALMASAK', tag: 'RUBY' },
        { nm: 'W03 PICHAK', tag: 'BOLT' },
        { nm: 'W04 YASEK', tag: 'BLOOM' }
      ];
      for (var ki = 0; ki < 4; ki++) {
        var ky2 = ry0 + ki * rowH;
        /* round 11: each keeper takes a turn on stage — 1.6s of its
           rare trick, staggered down the card, the same routine the
           terrarium keeps under five taps */
        var showAge = attractShow.t0 ? (t - attractShow.t0) : -1;
        var trickAt = 1400 + ki * 1600;
        var rareS = (showAge >= trickAt && showAge < trickAt + 1600)
          ? (showAge - trickAt) / 1000 : -1;
        castKeeper(g, ki, box.x + 14, ky2 + 2, t, rareS);
        drawText(g, KAST[ki].nm, box.x + 46, ky2 + 2, ki === 0 ? PC.gold : (blink ? PC.shell : PC.slateHi), 1);
        drawText(g, KAST[ki].tag, box.x + pw - 7 - textW(KAST[ki].tag), ky2 + 2, PC.press, 1);
      }
    } else if (isGates) {
      /* round 13: the four doors keep their own walls of fame (the
         per-world buckets landed in round 12) — now the tube gives
         them a card of their own in the idle rotation. One row per
         gate, wearing that door's accent; the champion and the rank
         the door keeps. An open gate says so honestly. */
      var GW = [
        { id: '01', nm: 'ORDIBEHESHT', c: '#ffd76a' },
        { id: '02', nm: 'TALASHO', c: '#b24fd8' },
        { id: '03', nm: 'RAZAN', c: '#2fbfae' },
        { id: '04', nm: 'YASSI', c: '#ff2a6d' }
      ];
      for (var gi = 0; gi < 4; gi++) {
        var gw2 = GW[gi];
        var gy2 = ry0 + gi * rowH;
        var rec2 = worldRec(gw2.id);
        if (rec2 && rec2.s > 0) {
          /* round 14: the keeper steps out — the door's resident stands
             beside its champion's score, the same cameo the cast card
             paints (the rare trick withheld: an honours list is not a
             stage). An open gate keeps its keeper home. */
          castKeeper(g, gi, box.x + 12, gy2 + 1, t, -1);
          var gLine = gw2.id + ' ' + rec2.n + ' ' + pad10(rec2.s);
          drawText(g, gLine, box.x + 46, gy2 + 2, gw2.c, 1);
          /* the rank that door keeps: chevrons, or the lone star —
             the same ladder the in-run badge wears */
          if (rec2.r >= 6) {
            drawSpr(g, SPR_STAR, box.x + pw - 11, gy2 + 1, STAR_LEG);
          } else if (rec2.r >= 2) {
            for (var gc2 = 0; gc2 < rec2.r; gc2++) {
              drawSpr(g, SPR_CHEV, box.x + pw - 11 - (rec2.r - 1 - gc2) * 6, gy2 + 3, CHEV_LEG);
            }
          }
        } else {
          var oLine = gw2.id + ' ' + gw2.nm;
          drawText(g, oLine, box.x + 14, gy2 + 2, PC.slate, 1);
          drawText(g, 'OPEN', box.x + pw - 7 - textW('OPEN'), gy2 + 2, PC.slate, 1);
        }
      }
    } else {
      /* the five best pilots this cabinet keeps: 1ST burns gold,
         the newest signature blinks like it is still wet — with a
         rank-up arrow beside it, because it EARNED that chair */
      var RANKS = ['1ST', '2ND', '3RD', '4TH', '5TH'];
      var RANKC = [PC.gold, PC.shell, PC.press, PC.slateHi, PC.slateHi];
      for (var b = 0; b < 5; b++) {
        var e = hiTable[b];
        var line = RANKS[b] + ' ' + (e ? e.n : '---') + ' ' + pad10(e ? e.s : 0);
        /* the bent ladder: the displaced pilot's whole row stings
           red for a while, blinking like a bruise */
        var displaced = e && !e.fresh && e.dropUntil && performance.now() < e.dropUntil;
        var col = e
          ? (e.fresh && blink
            ? PC.white
            : (displaced && (Math.floor(performance.now() / 260) % 2) ? PC.redHi : RANKC[b]))
          : PC.slate;
        var lx = Math.round(cols / 2 - textW(line) / 2);
        drawText(g, line, lx, ry0 + b * rowH + 2, col, 1);
        if (e && e.fresh && b === 0) {
          /* round 13: the reigning champion wears the cup — while the
             fresh ink dries on the top row, the gold trophy stands
             at its side. The arrow says I ARRIVED; the cup says
             I REIGN. */
          drawSpr(g, SPR_TROPHY, lx + textW(line) + 5, ry0 + 1, TROPHY_LEG);
        }
        if (e && e.fresh) {
          var ax = lx - 10;
          var ay = ry0 + b * rowH + 3;
          g.fillStyle = blink ? PC.white : PC.gold;
          g.fillRect(ax + 2, ay, 1, 1);
          g.fillRect(ax + 1, ay + 1, 3, 1);
          g.fillRect(ax, ay + 2, 5, 1);
          g.fillRect(ax + 1, ay + 3, 3, 1);
        }
        /* a pilot the fresh chair pushed down wears a red down-arrow
           for a while — the ladder remembers who it bent */
        if (displaced) {
          var dx = lx - 10;
          var dy = ry0 + b * rowH + 3;
          g.fillStyle = PC.red;
          g.fillRect(dx, dy, 5, 1);
          g.fillRect(dx + 1, dy + 1, 3, 1);
          g.fillRect(dx + 2, dy + 2, 1, 1);
        }
      }
    }
    /* the floor note: how a pilot takes the deck */
    if (bragPerfect) {
      var bStr = 'FLAWLESS SECTOR +1000';
      drawText(g, bStr, Math.round(cols / 2 - textW(bStr) / 2), box.y + ph - 20,
        (Math.floor(t / 300) % 2) ? PC.gold : PC.goldLo, 1);
    } else if (bragRank) {
      /* the kept rank: gold, breathing slower than the header —
         this one is earned wear, not a moment's brag. Round 12:
         a DEFENDER-tier brag wears the lone star itself, the same
         7×6 star the in-run badge carries. */
      var bStr2 = 'BEST RANK ' + RANK_TITLES[Math.min(6, bestRankTier) - 1];
      var hasStar = bestRankTier >= 6;
      var bw = textW(bStr2) + (hasStar ? 10 : 0);
      var bx0 = Math.round(cols / 2 - bw / 2);
      if (hasStar) { drawSpr(g, SPR_STAR, bx0, box.y + ph - 21, STAR_LEG); }
      drawText(g, bStr2, bx0 + (hasStar ? 10 : 0), box.y + ph - 20,
        (Math.floor(t / 460) % 2) ? PC.gold : PC.goldLo, 1);
    }
    var note = 'PRESS START';
    drawText(g, note, Math.round(cols / 2 - textW(note) / 2), box.y + ph - 11, blink ? PC.slateHi : PC.slate, 1);
  }

  if (hero && cv) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      if (!entries[0].isIntersecting && world) {
        setPause(true);   /* scrolled away from the tube: pause itself */
      }
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
  /* the record's owner: three initials — the signature of the run
     that set it, kept on this cabinet between visits */
  var hiName = (store('fw-hi-name') || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'AAA';
  /* the best rank ever worn here, kept like the high score — the
     attract table brags about it until a better run replaces it */
  bestRankTier = Math.max(1, Math.min(6, parseInt(store('fw-best-rank') || '1', 10) || 1));
  function bumpHi(w) {
    if (!w.humanRun) { return; }   /* the demo pilot never writes the record */
    checkRankUp(w);                /* every paid point can move the ladder */
    /* round 12: the patron gate's own record keeps pace mid-run */
    if (w.runWorld && worldScoreBeat(w.runWorld, w.score)) { worldSaveScore(w.runWorld, w.score); }
    if (w.score > hiScore) {
      var was = hiScore;
      hiScore = w.score;
      store('fw-hiscore', '' + hiScore);
      if (was > 0 && !w.hiBeaten) {
        /* the ceremony: a beaten record gets its fanfare — blinking
           gold on the glass and three rising notes */
        w.hiBeaten = true;
        w.hiFlashUntil = w.t + 9000;
        sfx('hiScore');
      }
    }
  }
  var playT = 0;        /* ms of paid play left on the cabinet clock */
  var coinGrace = 0;    /* brief window to pump more coins in */
  function pad10(n) {
    n = Math.max(0, Math.min(9999999999, Math.floor(n)));
    return ('0000000000' + n).slice(-10);
  }
  /* the champion plate keeps its scores compact — seven digits each */
  function pad7(n) {
    n = Math.max(0, Math.min(9999999, Math.floor(n)));
    return ('0000000' + n).slice(-7);
  }
  function saveCredits() { store('fw-credits', '' + credits); }

  var keys = { w: false, a: false, s: false, d: false };
  var KEYMAP = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd' };
  /* ── the boss theme is a STATE, not an event list ──
     Every reason to stop the anthem was wired up as its own call —
     stopBossMusic on death, on pause, on sound-off, on the boss dying,
     on the boss dying again from a second code path. What none of them
     did was the other half of the contract: put it BACK. killShip()
     stops it for the respiratory beat, and then nothing ever restarted
     it, because doStart() on a corpse only clicks coinBtn and returns.
     So a player who died mid-boss-fight, spent a coin and came back
     fought the rest of the fight in silence, with the boss still alive
     the whole time.

     One predicate, polled, is harder to get wrong than a list of
     counterpart calls: the theme plays exactly while the boss is alive
     and the game is running, and any reason that stops being true stops
     the music. Polled at 4Hz off the world clock — it is a few boolean
     tests, and it costs nothing per frame. */
  function bossMusicWanted(w) {
    return !!(soundOn && w && w.mother && w.mother.state !== 'dying' &&
              !paused && !w.shipDead && !html.classList.contains('gameover-dim'));
  }
  var bossMusicPoll = 0;
  function bossMusicReconcile(w, dt) {
    bossMusicPoll -= dt;
    if (bossMusicPoll > 0) { return; }
    bossMusicPoll = 250;
    var want = bossMusicWanted(w);
    if (want && !bossMusicSource) {
      startBossMusic();
      /* the pause switch remembers that it stopped it, so clearing the
         hold here keeps a later unpause from starting a second voice */
      if (typeof bossThemeHeld !== 'undefined') { bossThemeHeld = false; }
    } else if (!want && bossMusicSource) {
      stopBossMusic(w && w.shipDead ? 500 : 260);
    }
  }
  /* the service switch: P freezes the sim, the glass blinks PAUSE,
     the coin door keeps its promises until you flip back */
  var paused = false;
  /* Toggle FROM a known state, not from `!paused`. The document's
     capture-phase pointerdown already un-pauses on ANY tap while paused,
     so a tap on the HUD switch would run that first (paused -> false)
     and then this one (false -> true): net zero, and the switch appeared
     dead. Passing the current value makes both agree. */
  /* the boss theme is a loop, so a pause that leaves it running sounds
     like the game never stopped — the tube goes quiet and the anthem keeps
     marching. Fade it out on the way in, and only pick it back up on the
     way out if she is still up there and not already dying. */
  var bossThemeHeld = false;
  function setPause(v) {
    var want = !!v;
    if (want === paused) { return; }
    paused = want;
    if (paused) {
      if (bossMusicSource) { bossThemeHeld = true; stopBossMusic(260); }
    } else if (bossThemeHeld) {
      bossThemeHeld = false;
      if (world && world.mother && world.mother.state !== 'dying') { startBossMusic(); }
    }
    blip(paused ? 392 : 523, 90);
    if (typeof paintPause === 'function') { paintPause(); }
  }
  function togglePause() {
    setPause(!paused);
  }
  document.addEventListener('pointerdown', function (e) {
    if (paused) {
      if (coinBtn && (e.target === coinBtn || coinBtn.contains(e.target))) {
        return; /* let coinBtn handle coin insertion */
      }
      /* the HUD pause switch is a real control with its own handler;
         "tap anywhere to resume" must not swallow its taps too, or the
         switch would flip twice and read as dead. */
      if (pauseBtn && (e.target === pauseBtn || pauseBtn.contains(e.target))) {
        return;
      }
      setPause(false);
    }
  }, true);
  /* ── with START off the deck, the glass IS the START button ──
     Across the whole phone/tablet band the deck cannot seat stick + START
     + two domes at a thumb-sized scale, so the row drops START (see the
     --hero-ctl-w bands in styles.css) and the tube takes the press
     instead. START was not only the way in: it is also the dead-run
     continue, because doStart() routes a corpse to coinBtn. Removing it
     without this would leave a touch player unable to start OR continue,
     which is why the handler below stands in for it rather than merely
     adding a shortcut.

     Gated on START genuinely being hidden. If it is on screen the glass
     must stay inert, or the two paths race and a paid coin is spent twice
     by a single tap. `human-run` is the other gate, and it matters most:
     doStart() on a live run RESETS it — score to zero, ship back to the
     top — so a stray thumb on the sky would throw away a run in progress.
     Only the pre-run and the dead-run states may start. */
  var START_GLASS_IGNORE = '.joy,.panel-btns,.pbtn,.pstart,.coin-row,.snddeck,' +
    '.hero-foot,.go-plate,.hud,.boot,.cart,.lightbox,.modal,a,button,input,select,textarea,[data-close]';
  function startIsOffDeck() {
    return !!(startBtn && startBtn.offsetParent === null);
  }
  document.addEventListener('pointerdown', function (e) {
    if (paused) { return; }                    /* the resume rule above owns it */
    if (!startIsOffDeck()) { return; }         /* START is on the deck: it is the button */
    if (html.classList.contains('human-run') && world && !world.shipDead) { return; }
    var t = e.target;
    if (t && t.closest && t.closest(START_GLASS_IGNORE)) { return; }
    doStart();
  });
  document.addEventListener('visibilitychange', function () {
    /* the arcade courtesy: step away, and the deck pauses itself */
    if (document.hidden && world) { setPause(true); }
  });
  function manualGun() {
    var w = world;
    if (!w || !w.ship || w.portal || w.shipDead) { return; }
    if (w.ship.fireCd <= 0) {
      w.ship.fireCd = (w.t < (w.laserUntil || 0)) ? 170 : 260;
      fireShip(true);
      /* the deck talks back through the palms too: a two-frame tick
         under the thumb, the way a microswitch used to announce fire */
      if (typeof navigator !== 'undefined' && navigator.vibrate) { navigator.vibrate(5); }
    }
  }
  addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { return; }
    if (!heroVisible || !world) { return; }
    /* the signature owns every key while the entry is up */
    if (hiEntry) { entryKey(e.code); e.preventDefault(); return; }
    if (paused) {
      if (/^(Alt|Control|Shift|Meta|Tab|CapsLock|Escape|ContextMenu|F\d+)$/.test(e.key) ||
          /^(Alt|Control|Shift|Meta|Tab|CapsLock|Escape|F\d+)/.test(e.code)) {
        return; /* ignore system/modifier keys */
      }
      togglePause();
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyP') { togglePause(); e.preventDefault(); return; }
    /* when dead, press any key to revive */
    if (world && world.shipDead) {
      if (/^(Alt|Control|Shift|Meta|Tab|CapsLock|Escape|ContextMenu|F\d+)$/.test(e.key) ||
          /^(Alt|Control|Shift|Meta|Tab|CapsLock|Escape|F\d+)/.test(e.code)) {
        return; /* ignore system/modifier keys */
      }
      if (coinBtn) {
        coinBtn.click();
        e.preventDefault();
        return;
      }
    }
    var k = KEYMAP[e.code];
    if (k) {
      keys[k] = true;
      touchDeck(world);
      e.preventDefault();
      syncStick();
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      keys.space = true;
      touchDeck(world);
      pbtnState[1] = 2;      /* the FIRE dome sinks with the key */
      paintPBtns();
      if (!e.repeat) { manualGun(); }
      return;
    }
    if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      e.preventDefault();
      touchDeck(world);
      pbtnState[0] = 2;      /* the SPECIAL dome sinks with the key */
      paintPBtns();
      if (!e.repeat) {
        fireSpecial();
        blip(740, 60);
      }
      return;
    }
    if (e.code === 'Enter') {
      e.preventDefault();
      touchDeck(world);
      if (!e.repeat) {
        startState = 2;      /* the START key sinks with the key */
        paintStart();
        doStart();
      }
    }
  });
  addEventListener('keyup', function (e) {
    var k = KEYMAP[e.code];
    if (k) { keys[k] = false; syncStick(); return; }
    if (e.code === 'Space') { keys.space = false; pbtnState[1] = 0; paintPBtns(); return; }
    if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      pbtnState[0] = 0;
      paintPBtns();
      return;
    }
    if (e.code === 'Enter') { startState = 0; paintStart(); }
  });
  addEventListener('blur', function () {
    keys.w = keys.a = keys.s = keys.d = false;
    keys.space = false;
    pbtnState[0] = pbtnState[1] = 0;
    paintPBtns();
    syncStick();   /* the stick springs back when the tube loses focus */
  });

/* the stick is TWO axes now. joyTiltX/Y are in whole game pixels
     (-3..3) and are the single source of truth for how the stick is
     drawn — the keyboard, a gamepad and a thumb all write them, so the
     hardware never tells two stories. joyPress is the bellows: a hand
     is on the stick, whichever hand it is. */
  var joyTiltX = 0, joyTiltY = 0, joyPress = false;
  var startState = 0;   /* 0 idle · 1 hover · 2 press */
  /* one stick, many hands: the keyboard tilts the same stick the
     pointer does, so the hardware always tells the truth. The thumb
     owns the stick outright while it is held (joyHeld) and this defers
     to it — otherwise a WASD keypress would rip the stick out from
     under a finger mid-drag. Bellows keep their old meaning on the
     keyboard (vertical keys compress them) so desktop feel is unchanged. */
  function syncStick() {
    if (joyHeld) { return; }
    var nx = (keys.a || padKeys.a) ? -3 : ((keys.d || padKeys.d) ? 3 : 0);
    var ny = (keys.w || padKeys.w) ? -3 : ((keys.s || padKeys.s) ? 3 : 0);
    var np = !!(keys.w || keys.s || padKeys.w || padKeys.s);
    if (nx !== joyTiltX || ny !== joyTiltY || np !== joyPress) {
joyTiltX = nx; joyTiltY = ny; joyPress = np;
      paintJoy();
    }
  }
  var pbtnState = [0, 0];
  var coinLed = true, coinAnimT0 = -1, coinCredit = false;

  /* ── gamepad · the cabinet accepts a real stick too ─── */
  /* D-pad/left stick flies, A (or RB) is the gun, B (LB) calls the
     plumber, Start starts. The deck mirrors every pad input through
     the very same painters the keyboard uses — the hardware tells
     the truth no matter which hand is on it. */
  var padKeys = { w: false, a: false, s: false, d: false };
  var padFire = false, padConnected = false;
  var padCtl = null;   /* which hand the pad flies with: 'stick' | 'dpad' */
  var padStartPrev = false, padSpecPrev = false;
  function pollPad(w) {
    var pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
    var p = null;
    for (var pi = 0; pi < pads.length; pi++) {
      if (pads[pi] && pads[pi].connected) { p = pads[pi]; break; }
    }
    padConnected = !!p;
    if (!p) {
      if (padKeys.a || padKeys.d || padKeys.w || padKeys.s || padFire) {
        padKeys.w = padKeys.a = padKeys.s = padKeys.d = false;
        padFire = false;
        pbtnState[1] = 0;
        paintPBtns();
        syncStick();
      }
      padStartPrev = padSpecPrev = false;
      padCtl = null;
      return;
    }
    function btn(ix) { return !!(p.buttons[ix] && p.buttons[ix].pressed); }
    var ax0 = p.axes[0] || 0, ax1 = p.axes[1] || 0;
    var na = btn(14) || ax0 < -0.35;
    var nd = btn(15) || ax0 > 0.35;
    var nw = btn(12) || ax1 < -0.35;
    var ns = btn(13) || ax1 > 0.35;
    /* the glass tells the truth about hands: a stick thrown shows
       STICK, a d-pad edge shows DPAD — last hand wins, default PAD */
    var dpadNow = btn(12) || btn(13) || btn(14) || btn(15);
    if (dpadNow) { padCtl = 'dpad'; }
    else if (Math.abs(ax0) > 0.35 || Math.abs(ax1) > 0.35) { padCtl = 'stick'; }
    if (na !== padKeys.a || nd !== padKeys.d || nw !== padKeys.w || ns !== padKeys.s) {
      /* the pad spells too: D-pad edges drive the slots while the
         glass waits for a name */
      if (hiEntry) {
        if (nw && !padKeys.w) { entryKey('KeyW'); }
        if (ns && !padKeys.s) { entryKey('KeyS'); }
        if (na && !padKeys.a) { entryKey('KeyA'); }
        if (nd && !padKeys.d) { entryKey('KeyD'); }
      }
      padKeys.a = na; padKeys.d = nd; padKeys.w = nw; padKeys.s = ns;
      syncStick();
    }
    var nfire = btn(0) || btn(7);
    if (nfire !== padFire) {
      padFire = nfire;
      pbtnState[1] = nfire ? 2 : 0;
      paintPBtns();
      /* the pad signs too: A locks the letter in hand */
      if (hiEntry && nfire) { entryKey('Space'); }
    }
    var nstart = btn(9);
    if (nstart !== padStartPrev) {
      padStartPrev = nstart;
      startState = nstart ? 2 : 0;
      paintStart();
      if (nstart) { doStart(); }
    }
    var nspec = btn(1) || btn(6);
    if (nspec !== padSpecPrev) {
      padSpecPrev = nspec;
      if (nspec) {
        pbtnState[0] = 2;
        paintPBtns();
        fireSpecial();
        blip(740, 60);
        setTimeout(function () { pbtnState[0] = 0; paintPBtns(); }, 240);
      }
    }
    if ((na || nd || nw || ns || nfire || nstart || nspec) && w) {
      w.padSeen = w.t;
      touchDeck(w);
    }
  }
  addEventListener('gamepadconnected', function (e) {
    blip(880, 90);
    /* a real cabinet notices hardware walking up: the pad's name,
       paren-free and uppercased, rides the notched banner */
    if (world) {
      var pid = String((e && e.gamepad && e.gamepad.id) || 'PLAYER PAD')
        .replace(/\s*\([^)]*\)/g, '').trim().toUpperCase().slice(0, 20) || 'PLAYER PAD';
      world.banner = { l1: 'PAD LINKED', l2: pid, until: performance.now() + 2400 };
    }
  });
  addEventListener('gamepaddisconnected', function () { blip(440, 120, 220); });

  function paintJoy() {
    if (!joyCv) { return; }
    var g = joyCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    joyCv.width = 40; joyCv.height = 38;
    g.clearRect(0, 0, 40, 38);
    var pressDy = joyPress ? 1 : 0;
    /* hard shadow under the whole assembly */
    pxOval(g, 20, 33, 16, 5, 'rgba(0,0,0,.85)');
    /* mounting plate — brushed gold, beveled, four real screws */
    pxOval(g, 20, 32, 16, 5, PC.goldDk);
    pxOval(g, 20, 31, 16, 5, PC.goldLo);
    pxOval(g, 20, 30, 15, 4, PC.gold);
    g.fillStyle = PC.goldHi;
    g.fillRect(9, 27, 22, 1);
    g.fillStyle = PC.goldDeep;
    g.fillRect(10, 33, 20, 1);
    g.fillStyle = PC.ink;
    g.fillRect(7, 29, 2, 2); g.fillRect(31, 29, 2, 2);
    g.fillRect(13, 32, 2, 2); g.fillRect(25, 32, 2, 2);
    g.fillStyle = PC.metalHi;
    g.fillRect(7, 29, 1, 1); g.fillRect(31, 29, 1, 1);
    g.fillRect(13, 32, 1, 1); g.fillRect(25, 32, 1, 1);
    /* the round black dust washer the shaft passes through. It rides the
       vertical tilt too — the whole gait, not just the lean.
       Sign matters and is not negotiable: joyTiltY is POSITIVE when the
       thumb pulls the stick DOWN (keys.s), so every offset below adds
       ky. Negating them made the stick sink when the ship climbed —
       the picture and the simulation telling opposite stories, which is
       worse than no picture at all. */
    var kx = joyTiltX / 3, ky = joyTiltY / 3;
    var washDy = Math.round(ky * 1);
    pxOval(g, 20, 26 - pressDy + washDy, 8, 3, PC.ink);
    pxOval(g, 20, 25 - pressDy + washDy, 8, 3, PC.metalDk);
    pxOval(g, 20, 25 - pressDy + washDy, 6, 2, PC.ink);
    /* the shaft — sheared chrome columns, machined ribs every 3rd row,
       and two rubber bellows rings that compress on press. Pushing the
       stick forward/back walks the top of the shaft up or down its
       travel; that is the only honest way to draw a second axis in a
       side elevation without redrawing the whole assembly in plan.
       The ball-top travels 2px, not 3: pxBall draws 6px above `by`, so
       3px of travel put the ball's crown on y=-1 and clipped it. */
    var topY = 12 + pressDy + Math.round(ky * 2);
    var baseY = 25;
    var k = kx;
    var x, y;
    for (y = topY; y <= baseY; y++) {
      var f = (baseY - y) / (baseY - topY);
      var sx = 20 + Math.round(k * f * 6);
      g.fillStyle = PC.shaftHi; g.fillRect(sx, y, 1, 1);
      g.fillStyle = PC.shaft;   g.fillRect(sx + 1, y, 2, 1);
      g.fillStyle = PC.shaftDk; g.fillRect(sx + 3, y, 1, 1);
      if ((y - topY) % 3 === 1) { g.fillStyle = PC.shaftHi; g.fillRect(sx + 2, y, 1, 1); }
    }
    /* bellows rings — the rubber dust cover flexes against the tilt */
    if (k !== 0) {
      g.fillStyle = PC.metalDk;
      g.fillRect(20 - Math.round(k * 2) - 5, 22, 3, 1);
      g.fillRect(20 - Math.round(k * 2) + 4, 22, 3, 1);
      g.fillRect(20 - Math.round(k * 1) - 4, 19, 2, 1);
      g.fillRect(20 - Math.round(k * 1) + 4, 19, 2, 1);
    }
    /* the ball-top — classic red, shaded like lit plastic, with the
       cold white specular every real ball-top carries */
    var bx = 20 + Math.round(kx * 6);
    var by = Math.max(6, 8 + pressDy + Math.round(ky * 2));
    pxBall(g, bx, by, 7, { out: PC.redOut, hi: PC.redHi, base: PC.red, dk: PC.redDk }, 6);
    g.fillStyle = '#ffffff';
    g.fillRect(bx - 3, by - 4, 2, 1);
    g.fillRect(bx - 4, by - 3, 1, 2);
    if (Math.abs(kx) < 0.5 && Math.abs(ky) < 0.5 && !joyPress) { g.fillRect(bx - 2, by - 5, 1, 1); }
    /* rim light along the lower edge — the reflection of the panel */
    g.fillStyle = PC.redHi;
    g.fillRect(bx - 4, by + 5, 3, 1);
    g.fillRect(bx + 2, by + 5, 3, 1);
    g.fillRect(bx - 1, by + 6, 3, 1);
    g.fillStyle = PC.gold;
    g.fillRect(bx - 1, by + 7, 2, 1);
    joyCv.style.width = (40 * PXG) + 'px';
    joyCv.style.height = (38 * PXG) + 'px';
  }

  function paintStart() {
    if (!startCv) { return; }
    var g = startCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    startCv.width = 50; startCv.height = 22;
    g.clearRect(0, 0, 50, 22);
    var st = startState;   /* 0 idle · 1 hover · 2 press */
    var dy = st === 2 ? 1 : 0;
    /* hard shadow */
    g.fillStyle = 'rgba(0,0,0,.85)';
    g.fillRect(7, 5 + dy, 38, 12);
    /* the gold bezel — notched corners, machined face */
    g.fillStyle = PC.goldDk;
    g.fillRect(5, 2 + dy, 40, 15);
    g.fillRect(4, 3 + dy, 42, 13);
    g.fillStyle = PC.goldLo;
    g.fillRect(6, 3 + dy, 38, 13);
    g.fillRect(5, 4 + dy, 40, 11);
    g.fillStyle = PC.goldHi;
    for (var gx = 8; gx < 42; gx += 3) { g.fillRect(gx, 3 + dy, 1, 1); }
    /* the dark well the lighted cap sits in */
    g.fillStyle = PC.ink;
    g.fillRect(8, 5 + dy, 34, 10);
    /* the lighted ivory cap — top bevel light, bottom bevel shade */
    g.fillStyle = '#f2efe6';
    g.fillRect(9, 6 + dy, 32, 8);
    g.fillStyle = '#ffffff';
    g.fillRect(9, 6 + dy, 32, 1);
    g.fillStyle = '#b9b9c6';
    g.fillRect(9, 13 + dy, 32, 1);
    /* engraved START — light emboss under, dark ink on top */
    var lw = textW('START');
    var lx = 25 - Math.round(lw / 2);
    drawText(g, 'START', lx, 8 + dy, '#ffffff');
    drawText(g, 'START', lx, 7 + dy, '#2a2438');
    /* hover: a gold glow ring steps around the bezel */
    if (st === 1) {
      g.fillStyle = PC.goldHi;
      g.fillRect(8, 1, 8, 1); g.fillRect(34, 1, 8, 1);
      g.fillRect(8, 19, 8, 1); g.fillRect(34, 19, 8, 1);
      g.fillRect(4, 2, 1, 1); g.fillRect(45, 2, 1, 1);
      g.fillRect(4, 18, 1, 1); g.fillRect(45, 18, 1, 1);
    }
    /* press: warm light spills from under the bezel */
    if (st === 2) {
      g.fillStyle = 'rgba(255, 226, 150, .6)';
      g.fillRect(11, 18, 28, 2);
      g.fillRect(6, 16, 3, 2); g.fillRect(41, 16, 3, 2);
    }
    startCv.style.width = (50 * PXG) + 'px';
    startCv.style.height = (22 * PXG) + 'px';
  }

  function paintPBtns() {
    pbtnEls.forEach(function (el, idx) {
      var cvs = el.querySelector('.pbtn-cv');
      if (!cvs) { return; }
      var red = el.classList.contains('pbtn-red');
      var state = pbtnState[idx] || 0;
      var g = cvs.getContext('2d');
      g.imageSmoothingEnabled = false;
      cvs.width = 30; cvs.height = 30;
      g.clearRect(0, 0, 30, 30);
      var dy = state === 2 ? 1 : 0;
      var off = state === 2 ? 1 : 2;
      /* hard shadow */
      pxOval(g, 15, 15 + off, 12, 12, 'rgba(0,0,0,.85)');
      /* machined outer ring, seated in the panel */
      pxOval(g, 15, 14 + dy, 13, 13, PC.metalBd);
      pxOval(g, 15, 14 + dy, 12, 12, PC.metal);
      g.fillStyle = PC.metalHi;
      g.fillRect(6, 7 + dy, 3, 1); g.fillRect(21, 7 + dy, 3, 1);
      g.fillRect(6, 21 + dy, 3, 1); g.fillRect(21, 21 + dy, 3, 1);
      /* the clear translucent bezel ring the dome sits in — the
         bright circle every real button leaf carries */
      pxOval(g, 15, 14 + dy, 11, 11, red ? '#ffd7e0' : '#e6d4ff');
      pxOval(g, 15, 14 + dy, 10, 10, PC.metalDk);
      /* the dome — convex plastic, shaded like the real thing */
      var tones = red
        ? { out: PC.redOut, hi: PC.redHi, base: PC.red, dk: PC.redDk }
        : { out: '#1b0b33', hi: '#d9b8ff', base: '#7a4fd0', dk: '#37206b' };
      pxBall(g, 15, 14 + dy, 9, tones);
      /* inner ring — the plunger's mould line */
      g.fillStyle = tones.dk;
      pxOval(g, 15, 14 + dy, 6, 6, tones.dk);
      pxOval(g, 15, 14 + dy, 5, 5, tones.base);
      /* cold specular — one hard highlight, upper-left */
      g.fillStyle = '#ffffff';
      g.fillRect(10, 8 + dy, 3, 1);
      g.fillRect(9, 9 + dy, 1, 3);
      g.fillStyle = tones.hi;
      g.fillRect(12, 7 + dy, 2, 1);
      g.fillRect(9, 12 + dy, 1, 1);
      if (red) {
        /* printed FIRE — dark key, white ink */
        drawMText(g, 'FIRE', 15 - Math.floor(mTextW('FIRE') / 2), 15 + dy, PC.redOut);
        drawMText(g, 'FIRE', 15 - Math.floor(mTextW('FIRE') / 2), 14 + dy, '#ffffff');
      } else {
        /* the gift itself is the icon, drawn proud on the dome */
        drawSpr(g, SPR_SHROOM, 11, 8 + dy, SHROOM_LEG, 0, 1);
        var w0 = world;
        var laserOn = w0 && w0.t < (w0.laserUntil || 0);
        var seg = laserOn
          ? Math.ceil(((w0.laserUntil - w0.t) / 30000) * 4)
          : Math.min(4, w0 ? (w0.kills || 0) : 0);
        /* four charge LEDs embedded in the bezel's lower rim */
        for (var q = 0; q < 4; q++) {
          g.fillStyle = q < seg ? (laserOn ? PC.bullet : PC.gold) : PC.metalDk;
          g.fillRect(8 + q * 4, 24 + dy, 2, 2);
          if (q < seg) {
            g.fillStyle = laserOn ? PC.bulletGlow : PC.goldHi;
            g.fillRect(8 + q * 4, 24 + dy, 1, 1);
          }
        }
        /* charged: a two-phase pixel halo — cardinal rays one beat,
           diagonal sparks the next. drawn pixels, not css bloom */
        var ready = w0 && (w0.kills || 0) >= 4 && !laserOn && !w0.shipDead;
        if (ready || laserOn) {
          var ph2 = Math.floor(performance.now() / 200) % 2;
          var gc = laserOn ? PC.bulletGlow : PC.goldHi;
          var gc2 = laserOn ? PC.bullet : PC.gold;
          g.fillStyle = ph2 ? gc : gc2;
          g.fillRect(14, dy, 2, 2); g.fillRect(14, 26 + dy, 2, 2);
          g.fillRect(dy, 14 + dy, 2, 2); g.fillRect(28, 14 + dy, 2, 2);
          if (ph2) {
            g.fillStyle = gc;
            g.fillRect(4, 4 + dy, 1, 1); g.fillRect(25, 4 + dy, 1, 1);
            g.fillRect(4, 24 + dy, 1, 1); g.fillRect(25, 24 + dy, 1, 1);
          } else {
            g.fillStyle = gc2;
            g.fillRect(6, 1 + dy, 1, 1); g.fillRect(23, 1 + dy, 1, 1);
            g.fillRect(1, 9 + dy, 1, 1); g.fillRect(28, 9 + dy, 1, 1);
            g.fillRect(1, 19 + dy, 1, 1); g.fillRect(28, 19 + dy, 1, 1);
            g.fillRect(6, 27 + dy, 1, 1); g.fillRect(23, 27 + dy, 1, 1);
          }
        }
      }
      /* pressed: light spills from under the bezel */
      if (state === 2) {
        g.fillStyle = red ? PC.red : '#b78cff';
        g.fillRect(4, 25, 5, 1); g.fillRect(21, 25, 5, 1);
        g.fillRect(13, 27, 4, 1);
      }
      /* halo when hovered */
      if (state === 1) {
        g.fillStyle = PC.goldHi;
        g.fillRect(3, 14 + dy, 3, 1); g.fillRect(24, 14 + dy, 3, 1);
        g.fillRect(14, 2 + dy, 2, 1); g.fillRect(14, 25 + dy, 2, 1);
        g.fillRect(5, 6 + dy, 1, 1); g.fillRect(24, 6 + dy, 1, 1);
        g.fillRect(5, 22 + dy, 1, 1); g.fillRect(24, 22 + dy, 1, 1);
      }
      cvs.style.width = (30 * PXG) + 'px';
      cvs.style.height = (30 * PXG) + 'px';
    });
  }

  /* ── the deck's SOUND switch · a latching rocker, cabinet hardware ── */
  /* The same soundOn the HUD chip flips, but drawn as the machine it
     belongs on: a brushed plate, a real rocker with ON lit at the top,
     a green LED burning when the cabinet speaks. One state, two faces. */
  var sndDeckBtn = $('#sndDeck');
  var sndDeckCv = sndDeckBtn ? sndDeckBtn.querySelector('.snddeck-cv') : null;
  var sndDeckState = 0;   /* 0 idle · 1 hover · 2 press */
  function paintSndDeck() {
    if (!sndDeckCv) { return; }
    var g = sndDeckCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    sndDeckCv.width = 24; sndDeckCv.height = 22;
    g.clearRect(0, 0, 24, 22);
    var on = soundOn;
    var dy = sndDeckState === 2 ? 1 : 0;
    /* hard shadow under the plate */
    g.fillStyle = 'rgba(0,0,0,.85)';
    g.fillRect(2, 3 + dy, 20, 15);
    /* brushed two-tone plate, notched corners, two real screws */
    g.fillStyle = PC.metalBd;
    g.fillRect(3, 1 + dy, 18, 15);
    g.fillRect(2, 2 + dy, 20, 13);
    g.fillStyle = PC.metal;
    g.fillRect(3, 2 + dy, 18, 13);
    g.fillRect(4, 3 + dy, 16, 11);
    g.fillStyle = PC.metalHi;
    g.fillRect(3, 2 + dy, 18, 1);
    g.fillRect(4, 3 + dy, 16, 1);
    g.fillStyle = PC.ink;
    g.fillRect(4, 2 + dy, 1, 1); g.fillRect(19, 2 + dy, 1, 1);
    g.fillRect(4, 14 + dy, 1, 1); g.fillRect(19, 14 + dy, 1, 1);
    /* the rocker slot — a dark well with a beveled rim */
    g.fillStyle = PC.metalDk;
    g.fillRect(8, 3 + dy, 8, 9);
    g.fillStyle = PC.ink;
    g.fillRect(9, 4 + dy, 6, 7);
    /* the rocker itself: ON throws the switch up, OFF lets it rest
       down — the gold tip is the lit half of the bat handle */
    var rockY = on ? 4 + dy : 6 + dy;
    g.fillStyle = PC.shaftDk;
    g.fillRect(9, rockY, 6, 5);
    g.fillStyle = PC.shaft;
    g.fillRect(9, rockY, 5, 5);
    g.fillStyle = PC.shaftHi;
    g.fillRect(9, rockY, 5, 1);
    if (on) {
      /* the lit ON face — gold cap burning at the top of the throw */
      g.fillStyle = PC.gold;
      g.fillRect(9, rockY, 6, 2);
      g.fillStyle = PC.goldHi;
      g.fillRect(9, rockY, 6, 1);
    } else {
      /* thrown down: the cap sits in shadow, a coal instead of a lamp */
      g.fillStyle = PC.goldDk;
      g.fillRect(9, rockY + 3, 6, 2);
    }
    /* engraved SOUND — dark key, light emboss under */
    var lw = mTextW('SOUND');
    drawMText(g, 'SOUND', 12 - Math.floor(lw / 2), 15 + dy, PC.metalDk);
    drawMText(g, 'SOUND', 12 - Math.floor(lw / 2), 14 + dy, PC.shaftHi);
    /* the LED — green when the cabinet speaks, dead slate when mute */
    var led = on ? PC.ok : PC.slate;
    g.fillStyle = PC.ink;
    g.fillRect(3, 5 + dy, 3, 3);
    g.fillStyle = led;
    g.fillRect(4, 6 + dy, 1, 1);
    if (on) {
      g.fillStyle = 'rgba(80, 227, 194, .45)';
      g.fillRect(3, 5 + dy, 3, 3);
      g.fillStyle = '#eafff9';
      g.fillRect(4, 6 + dy, 1, 1);
    }
    /* hover: gold sparks step around the plate, like the deck's
       other hardware */
    if (sndDeckState === 1) {
      g.fillStyle = PC.goldHi;
      g.fillRect(6, 0, 6, 1); g.fillRect(14, 0, 4, 1);
      g.fillRect(6, 19, 6, 1); g.fillRect(14, 19, 4, 1);
      g.fillRect(1, 4, 1, 6); g.fillRect(22, 4, 1, 6);
      g.fillRect(1, 12, 1, 2); g.fillRect(22, 12, 1, 2);
    }
    /* pressed: the plate dips, the well glows faintly */
    if (sndDeckState === 2) {
      g.fillStyle = on ? 'rgba(80, 227, 194, .5)' : 'rgba(255, 215, 106, .3)';
      g.fillRect(9, 4, 6, 8);
    }
    sndDeckCv.style.width = Math.round(24 * PXG * COIN_ART_K) + 'px';
    sndDeckCv.style.height = Math.round(22 * PXG * COIN_ART_K) + 'px';
  }
  if (sndDeckBtn) {
    sndDeckBtn.addEventListener('pointerenter', function () {
      sndDeckState = 1;
      paintSndDeck();
    });
    sndDeckBtn.addEventListener('pointerleave', function () {
      sndDeckState = 0;
      paintSndDeck();
    });
    sndDeckBtn.addEventListener('pointerdown', function () {
      sndDeckState = 2;
      paintSndDeck();
    });
    sndDeckBtn.addEventListener('pointerup', function () {
      sndDeckState = sndDeckBtn.matches(':hover') ? 1 : 0;
      paintSndDeck();
    });
    sndDeckBtn.addEventListener('click', function () {
      /* one state, two faces: the HUD chip and the rocker agree */
      soundOn = !soundOn;
      store('fw-sound', soundOn ? '1' : '0');
if (soundOn) { ensureCtx(); blip(660, 60); setTimeout(function () { blip(990, 70); }, 90); }
      else { sfx('switchOff'); stopBossMusic(); }
      paintSound();
    });
  }

  /* ── pause, on the chrome that is already there ────────
     `togglePause` used to be reachable only from KeyP, or from ANY key
     while already paused — so a phone, which has no P and no way to
     press a key, could never pause at all. A notification lands, the
     cabinet pauses itself on visibilitychange, and there was no door
     back in. The HUD strip is fixed at every width and is the one piece
     of cabinet chrome a thumb always has, so the switch lives there. */
  var pauseBtn = $('#pauseBtn');
  var pauseLabel = $('#pauseLabel');
  function paintPause() {
    if (!pauseBtn) { return; }
    pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pauseBtn.setAttribute('aria-label', paused ? 'ادامه‌ی بازی' : 'مکث بازی');
    if (pauseLabel) { pauseLabel.textContent = paused ? 'ادامه' : 'مکث'; }
    pauseBtn.classList.toggle('is-paused', !!paused);
  }
  if (pauseBtn) {
    pauseBtn.addEventListener('click', function (e) {
      /* every path into `paused` — this switch, the visibility rule, the
         scrolled-away rule, the any-key rule — goes through setPause(),
         which repaints on its own. Nothing to monkey-patch. */
      e.stopPropagation();
      togglePause();
    });
  }
  paintPause();

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
    /* COIN_ART_K: the coin door is chrome, not a control, so it gets a
       ceiling rather than the raw grid. See calcGrids for why, and for why
       the sound rocker shares the factor. */
    coinCv.style.width = Math.round(26 * PXG * COIN_ART_K) + 'px';
    coinCv.style.height = Math.round(27 * PXG * COIN_ART_K) + 'px';
  }

  function setCoinCredit(on) {
    coinCredit = on;
    if (coinLabel) { coinLabel.dataset.credit = on ? '1' : ''; }
    paintCoinLabel();
    paintCredit();
  }

  function paintCoinLabel() {
    if (!coinLabel) { return; }
    var text, color;
    if (coinCredit) { text = 'THANK YOU'; color = PC.gold; }
    else if (world && world.shipDead) { text = 'INSERT COIN'; color = PC.gold; }
    else if (playT > 0) {
      var sec2 = Math.ceil(playT / 1000);
      text = 'TIME ' + (sec2 < 10 ? '0' + sec2 : '' + sec2);
      color = PC.gold;
    } else {
      text = 'INSERT COIN';
      color = credits > 0 ? PC.gold : PC.slateHi;
    }
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
    var text, color;
    if (playT > 0) {
      var sec = Math.ceil(playT / 1000);
      text = 'TIME ' + (sec < 10 ? '0' + sec : '' + sec);
      color = PC.gold;
    } else {
      var nn = credits < 10 ? '0' + credits : '' + credits;
      text = 'CREDIT ' + nn;
      color = credits > 0 || coinCredit ? PC.gold : PC.shell;
    }
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
    paintSndDeck();
    paintCoin();
    paintCoinLabel();
    paintCredit();
    paintDecal();
    paintCue();
    paintGoPlate();
  }

  /* ── cursor sprite · a pixel arrow on the same grid ─── */
  var cursor = $('#cursor');
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
    cursor.dataset.mode = mode;
  }

  if (useCursor) {
    html.classList.add('has-cursor');
    paintCursor('idle');
    doc.addEventListener('pointerdown', function () {
      cursor.classList.add('is-flash');
      paintCursor('flash');
      setTimeout(function () {
        cursor.classList.remove('is-flash');
        var m = cursor.classList.contains('is-hover') ? 'hover'
          : (cursor.classList.contains('is-enter') ? 'enter' : 'idle');
        paintCursor(m);
      }, 110);
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
  var CUR_LINK_SEL = 'a, button, [role="button"], [data-zoom-src], [data-close], .foot-hint, #boot, .joy, .pbtn, .go-plate, .lightbox-backdrop';

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
    var link = el ? el.closest(CUR_LINK_SEL) : null;
    if (cart && !link) {
      var faceHit = cartControlAt(cart, mx, my, CUR_LINK_SEL);
      if (faceHit) { link = faceHit; }
    }
    var art = el ? el.closest('.world-art') : null;
    var inMarquee = !!(el && el.closest('.marquee'));

    if (useCursor) {
      cursor.classList.toggle('is-enter', !!cart && !link);
      cursor.classList.toggle('is-hover', !!link);
      var curMode = link ? 'hover' : (cart ? 'enter' : 'idle');
      if (cursor.dataset.mode !== curMode && !cursor.classList.contains('is-flash')) {
        paintCursor(curMode);
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

    var target = link || cart;
    if (target !== hoverTarget) {
      hoverTarget = target;
      var now = Date.now();
      if (target && now - lastBlipAt > 90) {
        lastBlipAt = now;
        if (link) { blip(660, 40); }
        else if (cart) { sfx('cartSnap'); }
      }
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
        var flipping = o.cart.classList.contains('is-flipping');
        if (o.art === art && !flipping && !o.cart.classList.contains('is-dragging')) {
          var r = o.art.getBoundingClientRect();
          var rx = ((my - r.top) / r.height - 0.5) * -10;
          var ry = ((mx - r.left) / r.width - 0.5) * 10;
          rx = Math.max(-5, Math.min(5, Math.round(rx / 2.5) * 2.5));
          ry = Math.max(-5, Math.min(5, Math.round(ry / 2.5) * 2.5));
          o.cart.classList.add('tilting');
          var flipped = o.cart.classList.contains('is-flipped');
          var baseRot = flipped ? 180 : 0;
          var effRx = flipped ? -rx : rx;
          var effRy = flipped ? -ry : ry;
          o.cart.style.transform = 'translateY(-4px) rotateY(' + (baseRot + effRy) + 'deg) rotateX(' + effRx + 'deg)';
        } else if (o.cart.classList.contains('tilting') && !o.cart.classList.contains('is-dragging')) {
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
      if (o.cart.classList.contains('is-dragging')) { return; }
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

  /* ── 3D cartridge flipper wiring ────────────────────── */
  var FLIP_MS = 640;

  function markFlipping(cartEl) {
    if (!cartEl) { return; }
    cartEl.classList.add('is-flipping');
    clearTimeout(cartEl._flipTimer);
    cartEl._flipTimer = setTimeout(function () {
      cartEl.classList.remove('is-flipping');
      cartEl._flipTimer = 0;
    }, reduced.matches ? 0 : FLIP_MS);
  }

  function setFaceHidden(face, hidden) {
    if (!face) { return; }
    face.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    face.toggleAttribute('inert', hidden);
  }

  function initCartridgeFlipAria() {
    $$('.cart-flipper-wrap').forEach(function (wrap) {
      var cartEl = $('.cartridge', wrap);
      if (!cartEl) { return; }
      var front = $('.cart-front', cartEl);
      var back = $('.cart-back', cartEl);
      var ribbonTabs = $$('.cart-side-pull-tab', wrap);
      var ribbonTab = ribbonTabs[0];
      var ambientHint = $('.ambient-gesture-hint', wrap);
      var dataKey = cartEl.getAttribute('data-cart') || wrap.getAttribute('data-cart') || 'x';
      if (back && !back.id) { back.id = 'cart-back-' + dataKey; }
      if (front && !front.id) { front.id = 'cart-front-' + dataKey; }
      var isFlipped = cartEl.classList.contains('is-flipped');
      if (back && back.id) {
        if (ribbonTab) { ribbonTab.setAttribute('aria-controls', back.id); }
        if (ambientHint) { ambientHint.setAttribute('aria-controls', back.id); }
      }
      for (var ti = 0; ti < ribbonTabs.length; ti++) {
        var rTab = ribbonTabs[ti];
        if (rTab.classList.contains('cart-ribbon-back') && front && front.id) { rTab.setAttribute('aria-controls', front.id); }
        rTab.setAttribute('aria-expanded', isFlipped ? 'true' : 'false');
      }
      if (ambientHint) { ambientHint.setAttribute('aria-expanded', isFlipped ? 'true' : 'false'); }
      wrap.classList.toggle('is-flipped', isFlipped);
      setFaceHidden(front, isFlipped);
      setFaceHidden(back, !isFlipped);
    });
  }

  function toggleCartFlip(cartEl) {
    if (!cartEl || cartEl.classList.contains('is-dragging')) { return; }
    var wrap = cartEl.closest('.cart-flipper-wrap');
    var active = doc.activeElement;
    var isFlipped = cartEl.classList.toggle('is-flipped');
    if (wrap) {
      wrap.classList.toggle('is-flipped', isFlipped);
      var ribbonTabs = $$('.cart-side-pull-tab', wrap);
      for (var ti = 0; ti < ribbonTabs.length; ti++) { ribbonTabs[ti].setAttribute('aria-expanded', isFlipped ? 'true' : 'false'); }
      var ambientHint = $('.ambient-gesture-hint', wrap);
      if (ambientHint) {
        ambientHint.setAttribute('aria-expanded', isFlipped ? 'true' : 'false');
        var hintText = $('.hint-text', ambientHint);
        if (hintText) {
          /* short copy, matching the markup: the long sentence wrapped to
             two lines at 375px and took the row from 31px to 57px. The
             full instruction stays in the hint's aria-label. */
          hintText.textContent = isFlipped ? 'برای بازگشت، کارتریج را بکشید' : 'برای چرخش، کارتریج را بکشید';
        }
      }
    }
    var front = $('.cart-front', cartEl);
    var back = $('.cart-back', cartEl);
    setFaceHidden(front, isFlipped);
    setFaceHidden(back, !isFlipped);
    if (active && active.isConnected && active.closest && active.closest('.cart-face')) {
      var landed = isFlipped ? $('.cart-back .cart-side-pull-tab', cartEl) : $('.cart-front .cart-side-pull-tab', cartEl);
      if (landed) {
        try { landed.focus({ preventScroll: true }); } catch (_) { landed.focus(); }
      }
    }
    cartEl.classList.remove('tilting');
    cartEl.style.transform = '';
    markFlipping(cartEl);
    sfx('cartFlip');
    queueRefresh();
  }

  function cartControlAt(cartEl, x, y, selector) {
    if (!cartEl) { return null; }
    var face = cartEl.classList.contains('is-flipped') ? $('.cart-back', cartEl) : $('.cart-front', cartEl);
    if (!face) { return null; }
    var list = $$(selector, face);
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { return list[i]; }
    }
    return null;
  }

  /* ── Interactive Cartridge Drag & Sweep (Physics) ── */
  var cartClickGuard = { cart: null, at: 0 };

  function initCartridgeDragAndSweep() {
    var cartridges = $$('.cartridge');
    cartridges.forEach(function (cart) {
      var isDown = false;
      var isDragging = false;
      var activePointer = null;
      var startX = 0;
      var startY = 0;
      var startTime = 0;
      var baseAngle = 0;
      var currentAngle = 0;
      var cartWidth = 360;

      function settle() {
        markFlipping(cart);
        cart.style.transform = '';
      }

      cart.addEventListener('pointerdown', function (e) {
        if (e.isPrimary === false || (typeof e.button === 'number' && e.button > 0)) { return; }
        if (e.target.closest('a, input, [role="tab"], .screen-chrome, .cart-view-tabs, .btn-cart-enter')) {
          return;
        }
        if (cartControlAt(cart, e.clientX, e.clientY, '.view-tab-btn, .btn-cart-enter')) {
          return;
        }
        isDown = true;
        isDragging = false;
        activePointer = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        startTime = performance.now();
        baseAngle = cart.classList.contains('is-flipped') ? 180 : 0;
        currentAngle = baseAngle;
        cartWidth = cart.offsetWidth || 360;
        try { cart.setPointerCapture(e.pointerId); } catch (_) {}
      });

      cart.addEventListener('pointermove', function (e) {
        if (!isDown || e.pointerId !== activePointer) { return; }
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;

        if (!isDragging) {
          if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) {
            isDragging = true;
            cart.classList.add('is-dragging');
            cart.classList.remove('tilting');
          }
        }

        if (isDragging) {
          var rotDelta = (dx / cartWidth) * 180;
          currentAngle = baseAngle + rotDelta;
          cart.style.transform = 'rotateY(' + currentAngle + 'deg)';
          if (e.cancelable) { e.preventDefault(); }
        }
      });

      function endDrag(e) {
        if (!isDown) { return; }
        var wasDragging = isDragging;
        var pointer = activePointer;
        isDown = false;
        isDragging = false;
        activePointer = null;
        try { cart.releasePointerCapture(pointer); } catch (_) {}
        if (!wasDragging) { return; }

        cart.classList.remove('is-dragging');
        cartClickGuard.cart = cart;
        cartClickGuard.at = performance.now();

        if (!e || e.type !== 'pointerup') {
          settle();
          return;
        }

        var dx = e.clientX - startX;
        var dt = Math.max(1, performance.now() - startTime);
        var speed = Math.abs(dx) / dt;
        var shouldFlip = (Math.abs(dx) > 50) || (speed > 0.35 && Math.abs(dx) > 20);

        if (shouldFlip) {
          toggleCartFlip(cart);
        } else {
          settle();
        }
      }

      cart.addEventListener('dragstart', function (e) { e.preventDefault(); });
      cart.addEventListener('pointerup', endDrag);
      cart.addEventListener('pointercancel', endDrag);
      cart.addEventListener('lostpointercapture', endDrag);

      /* Keyboard rotation. The ribbon tab was the only control that could
         reach this from a keyboard, and it is display:none below 860px —
         so hiding it there would have taken keyboard rotation with it.
         The cartridge itself is now tabindex=0/role=region, so Enter and
         Space flip it and the arrow keys step through the faces. */
      cart.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          if (e.target !== cart) { return; }
          e.preventDefault();
          toggleCartFlip(cart);
          sfx('pipOn');
          return;
        }
        var dir = 0;
        if (e.key === 'ArrowLeft') { dir = -1; }
        else if (e.key === 'ArrowRight') { dir = 1; }
        if (!dir) { return; }
        if (e.target.closest('a, button, input, [role="tab"]')) { return; }
        e.preventDefault();
        var cur = cart.classList.contains('is-flipped') ? 1 : 0;
        var next = (cur + dir + 2) % 2;
        if (next !== cur) { toggleCartFlip(cart); sfx('pipOn'); }
      });
    });
  }
  initCartridgeDragAndSweep();
  initCartridgeFlipAria();

  /* ── Device Switcher Tabs & Lightbox Handlers ── */
  var lightbox = $('#cartLightbox');
  var lightboxImg = $('#lightboxImg');
  var lightboxTitle = $('#lightboxTitle');
  var lightboxClose = $('#lightboxClose');
  var lightboxCounter = $('#lightboxCounter');
  var lightboxPrev = $('#lightboxPrev');
  var lightboxNext = $('#lightboxNext');
  var lightboxThumbs = $('#lightboxThumbs');
  var lbLastFocus = null;
  var GALLERIES = {
    ordibehesht: [
      { src: 'assets/preview_ordibehesht_desktop.webp', title: 'طلای اردیبهشت · نسخه دسکتاپ' },
      { src: 'assets/preview_ordibehesht_mobile.webp', title: 'طلای اردیبهشت · نسخه موبایل' },
      { src: 'assets/preview_ordibehesht_mobile2.webp', title: 'طلای اردیبهشت · نسخه موبایل ۲' },
      { src: 'assets/gallery_ordibehesht_1.webp', title: 'طلای اردیبهشت · صفحه اصلی' },
      { src: 'assets/gallery_ordibehesht_2.webp', title: 'طلای اردیبهشت · فروشگاه' },
      { src: 'assets/gallery_ordibehesht_3.webp', title: 'طلای اردیبهشت · مجله' }
    ],
    talasho: [
      { src: 'assets/preview_talasho_desktop.webp', title: 'طلاشو VIP · نسخه دسکتاپ' },
      { src: 'assets/preview_talasho_mobile.webp', title: 'طلاشو VIP · نسخه موبایل' },
      { src: 'assets/preview_talasho_mobile2.webp', title: 'طلاشو VIP · نسخه موبایل ۲' },
      { src: 'assets/gallery_talasho_1.webp', title: 'طلاشو VIP · صفحه اصلی' },
      { src: 'assets/gallery_talasho_2.webp', title: 'طلاشو VIP · گاوصندوق‌ها' },
      { src: 'assets/gallery_talasho_3.webp', title: 'طلاشو VIP · مجله' }
    ],
    razan: [
      { src: 'assets/preview_razan_desktop.webp', title: 'مهندسی مشاور رازان · نسخه دسکتاپ' },
      { src: 'assets/preview_razan_mobile.webp', title: 'مهندسی مشاور رازان · نسخه موبایل' },
      { src: 'assets/preview_razan_mobile2.webp', title: 'مهندسی مشاور رازان · نسخه موبایل ۲' },
      { src: 'assets/gallery_razan_1.webp', title: 'مهندسی مشاور رازان · صفحه اصلی' },
      { src: 'assets/gallery_razan_2.webp', title: 'مهندسی مشاور رازان · درباره ما' },
      { src: 'assets/gallery_razan_3.webp', title: 'مهندسی مشاور رازان · تماس با ما' }
    ],
    yassi: [
      { src: 'assets/preview_yassi_desktop.webp', title: 'یاسی شو · نسخه دسکتاپ' },
      { src: 'assets/preview_yassi_mobile.webp', title: 'یاسی شو · نسخه موبایل' },
      { src: 'assets/preview_yassi_mobile2.webp', title: 'یاسی شو · نسخه موبایل ۲' },
      { src: 'assets/gallery_yassi_1.webp', title: 'یاسی شو · صفحه اصلی' },
      { src: 'assets/gallery_yassi_2.webp', title: 'یاسی شو · آرشیو پروژه‌ها' },
      { src: 'assets/gallery_yassi_3.webp', title: 'یاسی شو · آرشیو درگذشتگان' }
    ]
  };
  var galleryState = null;

  function faNum(n) {
    return String(n).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d); });
  }

  function hideGalleryControls() {
    galleryState = null;
    if (lightboxCounter) { lightboxCounter.hidden = true; }
    if (lightboxPrev) { lightboxPrev.hidden = true; }
    if (lightboxNext) { lightboxNext.hidden = true; }
    if (lightboxThumbs) { lightboxThumbs.hidden = true; }
  }

  /* Pick a thumbnail column count that leaves NO ORPHAN ROW.

   `repeat(auto-fit, minmax(64px, 1fr))` computed its own count from the
   width and had no idea how many items there were: at 375px it chose 4
   columns, and a 6-item gallery came out as a row of 4 plus a row of 2.
   The thumbnail strip is a navigation control, and a half-empty last row
   reads as a mistake.

   So: start from the widest count whose thumb would still be a thumbnail
   (not a crumb) and walk DOWN to the first count that divides `n`
   exactly. Every gallery here holds 6 items, so this lands on 6 on a
   desktop and 3 on a phone — never 4. */
function setThumbColumns(box, n) {
    if (!box || !n) { return; }
    var MIN_THUMB = 64;
    var GAP = 8;
    var avail = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) - parseFloat(getComputedStyle(box).paddingRight);
    if (!(avail > 0)) { avail = 320; }
    var maxFit = Math.max(1, Math.floor((avail + GAP) / (MIN_THUMB + GAP)));
    var cols = Math.min(n, maxFit);
    while (cols > 1 && n % cols !== 0) { cols--; }
    box.style.setProperty('--lb-cols', String(Math.max(1, cols)));
  }

  /* the column count depends on the measured width, so an orientation
     change has to recompute it — the strip is built once per open. */
  function refreshThumbColumns() {
    if (lightboxThumbs && !lightboxThumbs.hidden && lightboxThumbs.children.length) {
      setThumbColumns(lightboxThumbs, lightboxThumbs.children.length);
    }
  }

  function buildThumbs(key) {
    if (!lightboxThumbs) { return; }
    lightboxThumbs.innerHTML = '';
    var items = GALLERIES[key];
    if (!items || !items.length) {
      lightboxThumbs.hidden = true;
      return;
    }
    var n = items.length;
    setThumbColumns(lightboxThumbs, n);
    items.forEach(function (item, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lightbox-thumb';
      b.setAttribute('aria-label', (item.title || 'تصویر') + ' ' + faNum(i + 1) + ' از ' + faNum(n));
      var im = document.createElement('img');
      im.src = item.src;
      im.alt = '';
      b.appendChild(im);
      b.addEventListener('click', function () {
        if (setGalleryImage(key, i)) {
          sfx('pipOn');
          queueRefresh();
        }
      });
      lightboxThumbs.appendChild(b);
    });
    lightboxThumbs.hidden = false;
  }

  function swapLightboxImg(src, alt) {
    if (!lightboxImg) { return; }
    lightboxImg.classList.add('is-fade');
    clearTimeout(lightboxImg._fadeT);
    lightboxImg._fadeT = setTimeout(function () {
      lightboxImg.classList.remove('is-fade');
    }, 600);
    lightboxImg.onload = function () {
      clearTimeout(lightboxImg._fadeT);
      requestAnimationFrame(function () { lightboxImg.classList.remove('is-fade'); });
    };
    lightboxImg.onerror = function () {
      clearTimeout(lightboxImg._fadeT);
      lightboxImg.classList.remove('is-fade');
    };
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
  }

  function setGalleryImage(key, idx) {
    var items = GALLERIES[key];
    if (!items || !items.length || !lightboxImg) { hideGalleryControls(); return false; }
    var n = items.length;
    idx = ((idx % n) + n) % n;
    var item = items[idx];
    galleryState = { key: key, idx: idx };
    swapLightboxImg(item.src, item.title || 'پیش‌نمایش پروژه');
    if (lightboxTitle) { lightboxTitle.textContent = item.title || 'پیش‌نمایش پروژه'; }
    if (lightboxCounter) {
      lightboxCounter.textContent = faNum(idx + 1) + ' از ' + faNum(n);
      lightboxCounter.hidden = false;
    }
    if (lightboxPrev) { lightboxPrev.hidden = n < 2; }
    if (lightboxNext) { lightboxNext.hidden = n < 2; }
    if (lightboxThumbs && !lightboxThumbs.hidden) {
      var kids = lightboxThumbs.children;
      for (var ti = 0; ti < kids.length; ti++) {
        var on = ti === idx;
        kids[ti].classList.toggle('is-active', on);
        if (on) {
          kids[ti].setAttribute('aria-current', 'true');
          if (typeof kids[ti].scrollIntoView === 'function') {
            try { kids[ti].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (e) {}
          }
        } else { kids[ti].removeAttribute('aria-current'); }
      }
    }
    var ahead = new Image();
    ahead.src = items[(idx + 1) % n].src;
    var behind = new Image();
    behind.src = items[(idx - 1 + n) % n].src;
    return true;
  }

  function openLightbox(src, title, galleryKey) {
    if (!lightbox || !lightboxImg) { return; }
    lbLastFocus = document.activeElement;
    var opened = false;
    if (galleryKey && GALLERIES[galleryKey]) {
      var items = GALLERIES[galleryKey];
      var start = 0;
      for (var gi = 0; gi < items.length; gi++) {
        if (items[gi].src === src) { start = gi; break; }
      }
      buildThumbs(galleryKey);
      opened = setGalleryImage(galleryKey, start);
    }
    if (!opened) {
      hideGalleryControls();
      swapLightboxImg(src, title || 'پیش‌نمایش پروژه');
      if (lightboxTitle) { lightboxTitle.textContent = title || 'پیش‌نمایش پروژه'; }
    }
    lightbox.hidden = false;
    var sbw = window.innerWidth - document.documentElement.clientWidth;
    if (sbw > 0) { document.body.style.paddingRight = sbw + 'px'; }
    html.classList.add('lb-lock');
    requestAnimationFrame(function () {
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
    });
    if (lightboxClose) {
      try { lightboxClose.focus({ preventScroll: true }); } catch (_) { try { lightboxClose.focus(); } catch (__) {} }
    }
    sfx('cartFlip');
    queueRefresh();
  }

  function navGallery(delta) {
    if (!galleryState || !lightbox || lightbox.hidden) { return; }
    if (setGalleryImage(galleryState.key, galleryState.idx + delta)) {
      sfx('pipOn');
      queueRefresh();
    }
  }

  function closeLightbox() {
    if (!lightbox) { return; }
    hideGalleryControls();
    if (lightboxThumbs) {
      lightboxThumbs.innerHTML = '';
      lightboxThumbs.hidden = true;
    }
    html.classList.remove('lb-lock');
    document.body.style.paddingRight = '';
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    if (lbLastFocus && lbLastFocus.focus) {
      try { lbLastFocus.focus({ preventScroll: true }); } catch (_) { try { lbLastFocus.focus(); } catch (__) {} }
    }
    lbLastFocus = null;
    queueRefresh();
    setTimeout(function () {
      if (!lightbox.classList.contains('is-open')) {
        lightbox.hidden = true;
        if (lightboxImg) { lightboxImg.src = ''; }
        queueRefresh();
      }
    }, 220);
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', function () { navGallery(-1); });
  }
  if (lightboxNext) {
    lightboxNext.addEventListener('click', function () { navGallery(1); });
  }
  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox || e.target.classList.contains('lightbox-backdrop')) {
        closeLightbox();
      }
    });
  }
  doc.addEventListener('keydown', function (e) {
    if (!lightbox || lightbox.hidden) { return; }
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      navGallery(1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      navGallery(-1);
      e.preventDefault();
    } else if (e.key === 'Home' || e.key === 'End') {
      if (galleryState && setGalleryImage(galleryState.key, e.key === 'Home' ? 0 : GALLERIES[galleryState.key].length - 1)) {
        sfx('pipOn');
        queueRefresh();
        e.preventDefault();
      }
    } else if (e.key === 'Tab') {
      var foci = Array.prototype.filter.call(lightbox.querySelectorAll('button'), function (b) {
        return !b.hidden && b.offsetParent !== null;
      });
      if (foci.length) {
        var first = foci[0];
        var last = foci[foci.length - 1];
        var act = document.activeElement;
        if (e.shiftKey && (act === first || !lightbox.contains(act))) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && (act === last || !lightbox.contains(act))) {
          first.focus();
          e.preventDefault();
        }
      }
    }
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') { return; }
    var z = e.target && e.target.closest ? e.target.closest('[data-zoom-src]') : null;
    if (!z) { return; }
    if (lightbox && !lightbox.hidden) { return; }
    e.preventDefault();
    z.click();
  });

  var swipeX0 = null;
  var swipeY0 = null;
  if (lightbox) {
    var lbBody = $('.lightbox-body', lightbox);
    if (lbBody) {
      lbBody.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1) {
          swipeX0 = e.touches[0].clientX;
          swipeY0 = e.touches[0].clientY;
        }
      }, { passive: true });
      lbBody.addEventListener('touchend', function (e) {
        if (swipeX0 === null) { return; }
        var t = e.changedTouches[0];
        var dx = t.clientX - swipeX0;
        var dy = t.clientY - swipeY0;
        swipeX0 = null;
        swipeY0 = null;
        if (!galleryState || Math.abs(dx) < 48 || Math.abs(dy) >= Math.abs(dx)) { return; }
        navGallery(dx < 0 ? -1 : 1);
      }, { passive: true });
    }
  }

  doc.addEventListener('click', function (e) {
    if (cartClickGuard.cart) {
      var guardHit = e.target && e.target.closest ? e.target.closest('.cartridge') : null;
      var guardFresh = performance.now() - cartClickGuard.at < 500;
      if (guardHit === cartClickGuard.cart) {
        cartClickGuard.cart = null;
        if (guardFresh) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      } else if (!guardFresh) {
        cartClickGuard.cart = null;
      }
    }

    var tabBtn = e.target.closest('.view-tab-btn');
    if (tabBtn) {
      var stage = tabBtn.closest('.cart-back-well');
      if (stage) {
        var view = tabBtn.getAttribute('data-view');
        var allTabs = $$('.view-tab-btn', stage);
        allTabs.forEach(function (t) {
          var active = t === tabBtn;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        var desktopPanel = $('.view-desktop', stage);
        var mobilePanel = $('.view-mobile', stage);
        if (desktopPanel && mobilePanel) {
          if (view === 'desktop') {
            desktopPanel.hidden = false;
            mobilePanel.hidden = true;
          } else {
            desktopPanel.hidden = true;
            mobilePanel.hidden = false;
          }
        }
        sfx('pipOn');
      }
      e.preventDefault();
      return;
    }

    var zoomEl = e.target.closest('[data-zoom-src]');
    if (zoomEl) {
      var src = zoomEl.getAttribute('data-zoom-src');
      var title = zoomEl.getAttribute('data-zoom-title');
      if (src) {
        openLightbox(src, title, zoomEl.getAttribute('data-gallery'));
        e.preventDefault();
        return;
      }
    }

    var ambientHint = e.target.closest('.ambient-gesture-hint');
    if (ambientHint) {
      var targetWrap = ambientHint.closest('.cart-flipper-wrap');
      var cart = targetWrap ? $('.cartridge', targetWrap) : null;
      if (cart) {
        toggleCartFlip(cart);
        e.preventDefault();
        return;
      }
    }
    var flipTab = e.target.closest('.cart-side-pull-tab');
    if (flipTab) {
      var cartFromTab = flipTab.closest('.cartridge');
      if (cartFromTab) {
        toggleCartFlip(cartFromTab);
        e.preventDefault();
        return;
      }
    }
    var cartBody = e.target.closest('.cartridge');
    if (cartBody && !e.target.closest('a, button, [data-zoom-src]')) {
      var routeEl = cartControlAt(cartBody, e.clientX, e.clientY, '.view-tab-btn, [data-zoom-src], .btn-cart-enter, .cart-side-pull-tab, a');
      if (routeEl) {
        try { routeEl.focus({ preventScroll: true }); } catch (_) { try { routeEl.focus(); } catch (__) {} }
        routeEl.click();
        e.preventDefault();
        return;
      }
      toggleCartFlip(cartBody);
      e.preventDefault();
      return;
    }
  });

  doc.addEventListener('keydown', function (e) {
    if (lightbox && !lightbox.hidden) { return; }
    var key = e.key;
    if (key !== 'Enter' && key !== ' ' && key !== 'ArrowLeft' && key !== 'ArrowRight') { return; }
    var t = e.target;
    if (!t || !t.closest) { return; }
    var wrap = t.closest('.cart-flipper-wrap');
    if (!wrap) { return; }
    if (key === 'Enter' || key === ' ') {
      if (!t.classList || (!t.classList.contains('ambient-gesture-hint') && !t.classList.contains('cart-side-pull-tab'))) { return; }
    } else if (t.closest('[role="tablist"]')) {
      return;
    }
    var cartForKey = $('.cartridge', wrap);
    if (cartForKey) {
      toggleCartFlip(cartForKey);
      e.preventDefault();
    }
  });

  /* ── on-screen controls · START / coin / joystick ──── */
  if (startBtn) {
    startBtn.addEventListener('pointerdown', function () {
      sfx('startClick');
      startState = 2;
      paintStart();
    });
    var releaseStart = function () {
      startState = startBtn.classList.contains('is-hover') ? 1 : 0;
      paintStart();
    };
    startBtn.addEventListener('pointerup', releaseStart);
    startBtn.addEventListener('pointerleave', releaseStart);
    startBtn.addEventListener('click', doStart);
  }
  function doStart() {
      /* the signature owns the deck first: START while the entry is
         up commits the three letters and goes no further */
      if (hiEntry) { commitHiEntry(); return; }
      /* when dead, pressing START revives immediately via continue without scrolling away */
      if (world && world.shipDead) {
        if (coinBtn) { coinBtn.click(); }
        return;
      }
      /* a kept coin is spent on the way in; without one, entry is
         still free — the cabinet just remembers who tipped it */
      var spent = credits > 0;
      if (spent) { credits -= 1; saveCredits(); paintCredit(); }
      if (world) {
        touchDeck(world);
        world.humanRun = true;
        world.shipDead = false;
        world.score = 0;
        world.kills = 0;
        world.chain = 0;
        world.chainUntil = 0;
        world.sector = 1;             /* the ladder starts over for the hand */
        world.sectorKills = 0;
        world.rankTier = 1;
        world.runWorld = currentWorld || lastWorld || '';
        world.planetFall = false;
        world.zeroHumsT = 0;
        world.hiAtRunStart = hiScore;
        world.runStartT = world.t;
        world.ship.y = Math.round(world.rows * 0.40);
        world.ship.ty = Math.round(world.rows * 0.40);
        world.portal = { t0: world.t };
        sfx('portal');
        world.banner = {
          l1: 'WORLD 01',
          l2: spent ? 'GOOD LUCK!' : 'FREE PLAY!',
          until: performance.now() + 1600
        };
        html.classList.remove('gameover-dim');
        html.classList.add('human-run');
      }
      closeAttractShow();
    }

  var exploreBtn = $('#exploreBtn');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', function () {
      sfx('exploreSlide');
      var w1 = $('.w01');
      if (w1 && w1.scrollIntoView) {
        w1.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  var coinReset = null;
  if (coinBtn) {
    coinBtn.addEventListener('click', function () {
      /* the cabinet demands the signature first: a coin during the
         entry commits the letters, then buys the continue */
      if (hiEntry) { commitHiEntry(); }
      attractIdleMs = 0;
      closeAttractShow();
      coinAnimT0 = performance.now();
      coinLed = true;
      paintCoin();
      credits = Math.min(99, credits + 1);
      saveCredits();
      sfx('coin');
      if (paused) {
        togglePause();
      }
      /* the coin drops through the slot and into your hand: one solid
         clunk of haptic, only where the hardware offers it */
      if (typeof navigator !== 'undefined' && navigator.vibrate) { navigator.vibrate(14); }
      /* the policy: every coin buys thirty seconds, the grace window
         lets a handful of coins buy a handful of minutes, and then
         the slot vanishes until the clock burns out */
      playT = Math.min(999000, playT + 30000);
      coinGrace = 2600;
      html.classList.remove('coin-hidden');
      paintCredit();
      paintCoinLabel();
      setCoinCredit(true);
      clearTimeout(coinReset);
      coinReset = setTimeout(function () {
        setCoinCredit(false);
      }, 1900);
      /* the world answers the coin: the tube surges gold, the little
         people throw their arms up, the ship rolls, and one permanent
         gold star joins the sky — a receipt you can see from space */
      if (world) {
        if (!paused) { world.flash = 900; }
        world.hiBeaten = false;   /* a new run earns its own ceremony */
        rumble(0.15, 0.5, 140);   /* the door thanks you */
        if (world.shipDead) {
          /* the continue: a gate opens and she steps back out of it —
             same pilot, same score, the classic continue */
          world.shipDead = false;
          world.ds1 = world.ds2 = world.ds3 = 0;
          world.ship.y = Math.round(world.rows * 0.40);
          world.ship.ty = Math.round(world.rows * 0.40);
          world.portal = { t0: world.t };
          sfx('portal');
          world.hiAtRunStart = hiScore;
          world.runStartT = world.t;
          world.humanRun = true;
          world.banner = { l1: 'WORLD 01', l2: 'GOOD LUCK!', until: performance.now() + 1700 };
        } else {
          world.cheerUntil = world.t + 2200;
          world.ship.flipUntil = world.t + 700;
          world.banner = { l1: 'THANK YOU', l2: 'PLAYER ' + curPlayer, until: performance.now() + 1700 };
        }
        world.stars.push({
          x: Math.random() * world.cols,
          y: Math.floor(Math.random() * Math.max(8, Math.round(world.rows * 0.5))),
          l: 3, tw: Math.random() * 6.28, gold: true, red: false
        });
      }
      paintCredit();
      blip(960 + Math.random() * 60, 70);
      setTimeout(function () { blip(1270 + Math.random() * 100, 110); }, 90);
    });
  }

  /* ── the stick, under a thumb ────────────────────────────
     This used to be a single pointerdown that picked the left or right
     half and teleported the ship nine columns through bankShip(). No
     keys were written at all, so the sim (which reads only `keys`) never
     saw a direction: there was no flight, no hold, and no vertical axis
     whatsoever — a phone could only nudge the ship sideways.

     It is now a real stick. The pivot is the ball-top's rest position,
     captured ONCE at grab time so the stick cannot teleport when the
     thumb lands off-centre. `keys.a/d/w/s` are the only channel the sim
     understands, so we write those and stay binary — the analog feel is
     the painted stick plus a wider dead zone, not a new physics model.
     Capture means a thumb that slides off the stick still releases it. */
  var joyHeld = false;          /* a finger owns the stick right now */
  var joyPointerId = null;      /* and it is this one */
  var joyPivotX = 0, joyPivotY = 0;
  var JOY_DEAD = 5;             /* px of slop before the stick bites */
  var JOY_LEAN = 3;             /* px of travel that reads as full tilt */

  function joyApply(e) {
    var dx = e.clientX - joyPivotX;
    var dy = e.clientY - joyPivotY;
    /* dead zone: measured along each axis so a thumb resting slightly
       off-centre does not creep the ship sideways */
    var ax = dx < 0 ? -Math.max(0, -dx - JOY_DEAD) : Math.max(0, dx - JOY_DEAD);
    var ay = dy < 0 ? -Math.max(0, -dy - JOY_DEAD) : Math.max(0, dy - JOY_DEAD);
    var kx = Math.max(-1, Math.min(1, ax / JOY_LEAN));
    var ky = Math.max(-1, Math.min(1, ay / JOY_LEAN));
    var nx = Math.round(kx * 3);
    var ny = Math.round(ky * 3);
    if (nx !== joyTiltX || ny !== joyTiltY) {
      joyTiltX = nx; joyTiltY = ny;
      paintJoy();
    }
    /* the one and only bridge into the simulation */
    keys.a = nx < 0; keys.d = nx > 0;
    keys.w = ny < 0; keys.s = ny > 0;
  }
  function joyRelease() {
    joyHeld = false; joyPointerId = null;
    keys.a = keys.d = keys.w = keys.s = false;
    joyTiltX = 0; joyTiltY = 0; joyPress = false;
    paintJoy();
  }

  if (joyBox) {
    joyBox.addEventListener('pointerdown', function (e) {
      if (joyHeld) { return; }              /* one finger owns the stick */
      var r = joyBox.getBoundingClientRect();
      /* pivot = the centre of the ball at rest. Scaling is already baked
         into the rect by the time we read it, so this is the painted
         position, not the layout box. */
      joyPivotX = r.left + r.width / 2;
      joyPivotY = r.top + r.height * 0.32;   /* the ball sits high on the gait */
      joyHeld = true; joyPointerId = e.pointerId;
      joyPress = true;
      try { joyBox.setPointerCapture(e.pointerId); } catch (_) {}
      joyApply(e);
      paintJoy();
      if (world) { touchDeck(world); }
      /* a thunk as the hand takes the weight — the old code blipped here
         too, and it is the only feedback a tap gets */
      sfx('thruster');
      blip(190, 110, 90);
      e.preventDefault();
    });
    joyBox.addEventListener('pointermove', function (e) {
      if (!joyHeld || e.pointerId !== joyPointerId) { return; }
      joyApply(e);
      if (world) { touchDeck(world); }
      e.preventDefault();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
      joyBox.addEventListener(t, function (e) {
        if (!joyHeld || (e.pointerId != null && e.pointerId !== joyPointerId)) { return; }
        joyRelease();
      });
    });
  }

  /* ── the domes, under a thumb ─────────────────────────────
     Same story as the stick: this was pointerdown-only, so a phone got
     exactly one shot per tap. Holding SPACE is not the same thing —
     manualGun re-arms the 260ms cooldown and the sim (stepWorld's
     `keys.space` branch) rides it, which is why a held key is a stream
     of fire. The red dome now drives `keys.space` for as long as it is
     held, so a thumb lands on the very same branch the keyboard does
     and the two hands tell one truth.

     The violet dome has no cooldown of its own to ride — fireSpecial is
     already self-gating (it needs four kills, and it zeroes them) — so
     it stays a press. Capture means sliding a thumb off the dome still
     lets go, which is the classic stuck-button bug. */
  var pbtnHeld = [null, null];   /* pointerId currently owning each dome */

  pbtnEls.forEach(function (b, idx) {
    var red = b.classList.contains('pbtn-red');

    function press(e) {
      if (pbtnHeld[idx] != null) { return; }   /* one finger per dome */
      pbtnHeld[idx] = e.pointerId;
      try { b.setPointerCapture(e.pointerId); } catch (_) {}
      pbtnState[idx] = 2;
      paintPBtns();
      if (world) { touchDeck(world); }
      if (hiEntry) {
        /* the glass is waiting for a name: the dome commits the letter,
           exactly as SPACE does on a keyboard. Held auto-repeat is not
           wanted here, so this is a discrete press only. */
        entryKey('Space');
        return;
      }
      if (red) {
        keys.space = true;      /* held fire rides the cooldown */
        manualGun();
        if (typeof navigator !== 'undefined' && navigator.vibrate) { navigator.vibrate(5); }
      } else {
        fireSpecial();          /* the violet dome calls the plumber */
        blip(740, 60);
      }
      e.preventDefault();
    }
    function release(e) {
      if (pbtnHeld[idx] == null) { return; }
      if (e && e.pointerId != null && e.pointerId !== pbtnHeld[idx]) { return; }
      pbtnHeld[idx] = null;
      pbtnState[idx] = 0;
      if (red) { keys.space = false; }
      paintPBtns();
    }

    b.addEventListener('pointerdown', press);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
      b.addEventListener(t, release);
    });
  });

  /* ── master animation loop ──────────────────────────── */
  var lastT = 0;
  var bandCheckLast = 0;
  /* Keep the play band honest. The deck is anchored to a CSS var and a
     scale that can both change AFTER the world was built — the font swap
     lands, a media-query band flips, the safe-area inset arrives — and
     the band is a row count baked in at build time. Baking it and
     watching only the hero's height left the same tube measuring two
     different bands on two runs. The near terrain is drawn per frame
     rather than cached in skyCv, so re-deriving the band costs two
     numbers and no rebuild: self-healing beats a fragile rebuild. */
  function syncDeckBand(t) {
    if (!hero || !world || !fieldOn) { return; }
    if (t - bandCheckLast < 500) { return; }
    bandCheckLast = t;
    var dk = hero.querySelector('.hero-deck');
    if (!dk) { return; }
    var hr = hero.getBoundingClientRect();
    var dTop = dk.getBoundingClientRect().top - hr.top;
    if (!(typeof world.deckTopPx === 'number') || Math.abs(dTop - world.deckTopPx) <= 4) { return; }
    var nb = deckBandRows(hr.height, world.rows, world.px);
    if (nb !== world.rows - world.groundRows) { world.groundRows = world.rows - nb; }
    world.deckTopPx = dTop;
  }
  var ledLast = 0;
  var bannerWas = false;
  var dimWas = false;
  var goTickPt = 0;   /* round 11: the plate's live rank re-stamp clock */
  var pipLast = 0;
  var joyWigglePhase = 0, joyWiggleLast = 0;
  var JOY_WIGGLE = [0, 0, 1, 2, 1, 0, 0, -1, -2, -1, 0, 0, 0, 0, 0, 0];
  var coinRepaintLast = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    var dt = lastT ? Math.min(t - lastT, 64) : 16;
    lastT = t;
    if (doc.hidden) { return; }
    pollPad(world);
    if (useCursor) {
      cxx += (mx - cxx) * 0.16;
      cyy += (my - cyy) * 0.16;
      cursor.style.transform = 'translate3d(' + cxx + 'px,' + cyy + 'px,0)';
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
        /* a kept coin glows steady — the door holds a promise */
        coinLed = credits > 0 ? true : !coinLed;
        needRepaint = true;
      }
      if (coinAnimT0 >= 0) {
        needRepaint = true;
        if (t - coinRepaintLast > 60) { coinRepaintLast = t; }
      }
      if (needRepaint) { paintCoin(); }
    }
    /* joystick attract wiggle — stepped, never while pressed, and
       NEVER while a hand is on WASD or a thumb is on the stick: the
       hardware must tell the truth */
    syncDeckBand(t);
    if (joyCv && !joyHeld && !joyPress && !reduced.matches &&
        !keys.a && !keys.d && !keys.w && !keys.s) {
      if (t - joyWiggleLast > 260) {
        joyWiggleLast = t;
        joyWigglePhase = (joyWigglePhase + 1) % JOY_WIGGLE.length;
        var nt = JOY_WIGGLE[joyWigglePhase];
        if (nt !== joyTiltX) {
          joyTiltX = nt;
          paintJoy();
        }
      }
    }
    if (fieldOn && !reduced.matches && world && (heroVisible || bootActive) && !paused) {
      stepWorld(dt);
    }
    /* while a banner stamp is up, the attract copy yields the glass —
       the cabinet never talks over itself */
    var bannerOn = !!(world && world.banner && t < world.banner.until && !world.banner.keepText);
    if (bannerOn !== bannerWas) {
      bannerWas = bannerOn;
      html.classList.toggle('banner-on', bannerOn);
    }
    html.classList.toggle('human-run', !!(world && world.humanRun && !world.shipDead));
    html.classList.toggle('boss-active', !!(world && world.mother && world.mother.state !== 'dying'));
    /* a dimming stamp: the introduction recedes behind the DOM plate —
       present, legible at the edges, never glyph-on-glyph */
    var dimOn = !!(world && world.banner && world.banner.dim && t < world.banner.until);
    if (dimOn !== dimWas) {
      dimWas = dimOn;
      html.classList.toggle('gameover-dim', dimOn);
      if (dimOn) { paintGoPlate(); }
    }
    /* while the plate is up, repaint regularly so continue prompt and coin glint blink */
    if (dimOn && world && world.humanRun && !hiEntry &&
        ((world.dispScore != null && world.dispScore !== world.score) || t - goTickPt > 240)) {
      goTickPt = t;
      paintGoPlate();
    }
    /* the initials entry: its idle clock runs on the wall clock, and
       the slot blink repaints the plate about three times a second */
    if (hiEntry) {
      hiEntry.idle += dt;
      if (hiEntry.idle > 9000) { commitHiEntry(); }
      else if (t - (hiEntry.pt || 0) > 330) { hiEntry.pt = t; paintGoPlate(); }
    }
    /* the idle show: a deck left alone long enough cycles its classic
       attract screens — the score advance table, then the best pilots
       board — over the sleeping demo. Any hand at the controls kills
       it on the spot (touchDeck); a plate or banner outranks it */
    if (attractShow) {
      if (t > attractShow.until) { closeAttractShow(); attractIdleMs = 0; }
    } else if (fieldOn && heroVisible && !paused && world && !hiEntry &&
               !bannerOn && !dimOn && !world.humanRun && world.t > 4000) {
      attractIdleMs += dt;
      if (attractIdleMs > 12000) { openAttractShow(attractNextKind); }
    }
    if (world && heroVisible && fx && !memoHold) { renderWorld(fx, 'hero', t); }
    if (t - pipLast > 200) { pipLast = t; if (world) { paintPBtns(); } }
    if (world && bootActive && bfx && !memoHold) { renderWorld(bfx, 'boot', t); }
  }
  requestAnimationFrame(loop);

  /* ── konami console + modal ─────────────────────────── */
  var modal = $('#modal');
  var modalClose = $('#modalClose');
  var lastFocus = null;
  var KSEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var kpos = 0;

  /* the code does not open a dialog. it reboots the tube — see
     assets/memory.js. everything below is the hand-off: memory.js
     paints with the very same fonts, palette and sprite sheets the
     cabinet already owns (borrowed, never forked), and it keeps the
     sim frozen behind its back while it does. if it is missing, the
     old two-credit thank-you note still stands in. */
  window.__fw_gfx = {
    drawText: drawText,
    textW: textW,
    drawMText: drawMText,
    mTextW: mTextW,
    pxText: pxTextCanvas,
    bayer: bayerAt,
    pc: PC,
    font: FONT,
    mfont: MFONT,
    spr: drawSpr,
    sprites: { trophy: SPR_TROPHY, chev: SPR_CHEV, star: SPR_STAR },
    legends: { trophy: TROPHY_LEG, chev: CHEV_LEG, star: STAR_LEG }
  };
  window.__fw_synth = {
    tone: tone,
    noiseHit: noiseHit,
    on: function () { return !!soundOn; },
    ctx: function () { return actx; },
    master: function () { return master; }
  };
  /* the memory tube is opaque: stop stepping and stop repainting the
     hero behind it, or we burn a whole game's worth of frames on a
     picture nobody can see */
  var memoHold = false;
  window.__fw_memoHold = function (on) {
    memoHold = !!on;
    if (on) {
      setPause(true);
    } else {
      setPause(false);
      attractIdleMs = 0;
      lastT = 0;
    }
  };
  /* what the cabinet gives back for a name: three coins, ten minutes
     of paid play, and — the part that matters — the BIOS line at the
     top of every future boot stops being the owner's name and starts
     being yours. POST[5] is the one line on this site that greets
     you before the picture is even finished. Leaving without a name
     still pays the coins: the machine is not petty about it. */
  window.__fw_memoGift = function (who, visits) {
    who = String(who || '').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 12);
    visits = parseInt(visits, 10) || 0;
    credits = Math.min(99, credits + 3);
    saveCredits();
    paintCredit();
    playT = Math.min(999000, Math.max(playT, 600000));
    if (who) {
      /* the boot block is drawn 6px a character with no clipping, so a
         long line walks straight off a narrow tube. the visit count is
         the first thing to go: the name is the point, the count is a
         bonus. 26 characters is what a 320px screen at the coarse grid
         can hold */
      var line = 'PLAYER ' + who;
      if (visits > 1) {
        var withVisits = line + '  ·  ' + visits + ' VISITS';
        if (withVisits.length <= 26) { line = withVisits; }
      }
      POST[5] = [line.slice(0, 26), ''];
    }
    if (world) {
      world.kills = Math.max(world.kills || 0, 4);
      if (!world.shipDead) {
        world.banner = {
          l1: who ? 'PLAYER ' + who : 'MEMORY MODE',
          l2: '+3 CREDITS · FREE PLAY 10:00',
          until: performance.now() + 3400
        };
      }
    }
    return !!who;
  };
  function konami() {
    if (window.__fw_memo && window.__fw_memo.enter()) { return; }
    openModal();
  }

  function openModal() {
    lastFocus = doc.activeElement;
    modal.hidden = false;
    modalClose.focus();
    blip(880, 90, 440);
    /* the code did something real once; it still does — two coins and
       a charged laser, dropped on the deck below. A gift from the
       cabinet, not a cheat: you still have to fly it. */
    credits = Math.min(99, credits + 2);
    saveCredits();
    paintCredit();
    if (world) {
      world.kills = Math.max(world.kills || 0, 4);
      if (!world.shipDead) {
        world.banner = { l1: 'KONAMI', l2: '+2 CREDITS', until: performance.now() + 2200 };
      }
    }
    setTimeout(function () { blip(659, 80, 440); }, 110);
    setTimeout(function () { blip(880, 120, 440); }, 220);
    queueRefresh();
  }
  function closeModal() {
    sfx('shutterClose');
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    queueRefresh();
  }
  modalClose.addEventListener('click', closeModal);
  $('[data-close]').addEventListener('click', closeModal);

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) { closeModal(); return; }
    if (!modal.hidden && e.key === 'Tab') { e.preventDefault(); modalClose.focus(); return; }
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === KSEQ[kpos]) {
      kpos += 1;
      if (kpos === KSEQ.length) { kpos = 0; konami(); }
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
      if (taps >= 7) { taps = 0; konami(); }
    });
  }

  /* ── ignition ───────────────────────────────────────── */
  /* controls paint immediately (no fonts needed); pixel text waits for
     Estedad so the quantized glyphs match the real metrics */
  buildControls();
  paintWorldChips();   /* round 14: the doors put their records on the shelf */
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
