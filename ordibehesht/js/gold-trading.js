(function () {
  'use strict';

  /* ── Utility ── */
  window.toPersianNum = (n) => {
    const digits = '۰۱۲۳۴۵۶۷۸۹';
    return n.toString().replace(/[0-9]/g, (d) => digits[+d]);
  };
  window.toEnglishNum = (s) => {
    const digits = '۰۱۲۳۴۵۶۷۸۹';
    return s.replace(/[۰-۹]/g, (d) => digits.indexOf(d).toString());
  };
  window.formatMoney = (n) => {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  window.formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ── Toast System ── */
  let toastId = 0;
  window.GoldToast = {
    show(message, type, duration) {
      type = type || 'success';
      duration = duration || 3500;
      const id = ++toastId;
      const container = document.getElementById('toast-container');
      if (!container) return;
      const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${message}</span><button class="toast-close" onclick="this.closest('.toast').classList.add('removing');setTimeout(()=>this.closest('.toast').remove(),300)">✕</button>`;
      container.appendChild(el);
      setTimeout(() => {
        el.classList.add('removing');
        setTimeout(() => el.remove(), 300);
      }, duration);
    },
    success(msg, dur) { this.show(msg, 'success', dur); },
    error(msg, dur) { this.show(msg, 'error', dur); },
    info(msg, dur) { this.show(msg, 'info', dur); },
    warning(msg, dur) { this.show(msg, 'warning', dur); },
  };

  /* ── Bottom Sheet ── */
  window.GoldBottomSheet = {
    open(id) {
      const overlay = $(`[data-bs-overlay="${id}"]`);
      const sheet = $(`[data-bs="${id}"]`);
      if (!overlay || !sheet) return;
      // Make the elements visible first (without the .open class), force a
      // reflow so the browser registers the starting transform/opacity, THEN
      // add .open. Without this two-step approach, the very first open() of
      // a freshly-injected sheet skips the slide-up transition (the browser
      // batches the display change with the transform change).
      overlay.style.visibility = 'visible';
      sheet.style.visibility = 'visible';
      sheet.style.opacity = '1';
      overlay.style.opacity = '1';
      // Force reflow
      void sheet.offsetHeight;
      overlay.classList.add('open');
      sheet.classList.add('open');
      // Clean up the inline styles once the transition kicks in
      setTimeout(() => {
        overlay.style.visibility = '';
        sheet.style.visibility = '';
        sheet.style.opacity = '';
        overlay.style.opacity = '';
      }, 50);
      document.body.style.overflow = 'hidden';
    },
    close(id) {
      const overlay = $(`[data-bs-overlay="${id}"]`);
      const sheet = $(`[data-bs="${id}"]`);
      if (!overlay || !sheet) return;
      overlay.classList.remove('open');
      sheet.classList.remove('open');
      document.body.style.overflow = '';
    },
    closeAll() {
      $$('[data-bs-overlay]').forEach((o) => o.classList.remove('open'));
      $$('[data-bs]').forEach((s) => s.classList.remove('open'));
      document.body.style.overflow = '';
    },
  };

  /* ── Dual Input ── */
  window.GoldDualInput = {
    init(el) {
      const rialInput = el.querySelector('.dual-input-rial');
      const gramInput = el.querySelector('.dual-input-gram');
      const rateEl = el.querySelector('.dual-input-rate-value');
      if (!rialInput || !gramInput) return;

      const rate = parseFloat(rateEl ? rateEl.dataset.rate : 80000000) || 80000000;
      let activeInput = null;

      const cleanNum = (v) => {
        const cleaned = toEnglishNum(v).replace(/[^0-9.]/g, '');
        return cleaned;
      };

      const formatInput = (input) => {
        const cleaned = cleanNum(input.value);
        const num = parseFloat(cleaned);
        if (!isNaN(num) && cleaned.indexOf('.') === -1) {
          input.value = formatMoney(num.toString());
        } else {
          input.value = cleaned;
        }
      };

      rialInput.addEventListener('input', function () {
        activeInput = 'rial';
        const cleaned = cleanNum(this.value);
        const rial = parseFloat(cleaned) || 0;
        if (rial > 0) {
          const gram = rial / rate;
          gramInput.value = gram.toFixed(3);
        } else {
          gramInput.value = '';
        }
        formatInput(this);
      });

      gramInput.addEventListener('input', function () {
        activeInput = 'gram';
        const cleaned = cleanNum(this.value);
        const gram = parseFloat(cleaned) || 0;
        if (gram > 0) {
          const rial = gram * rate;
          rialInput.value = formatMoney(Math.round(rial).toString());
        } else {
          rialInput.value = '';
        }
        formatInput(this);
      });

      rialInput.addEventListener('focus', () => { activeInput = 'rial'; });
      gramInput.addEventListener('focus', () => { activeInput = 'gram'; });

      // Note: the .dual-input-swap icon is now decorative (aria-hidden, no click
      // handler). Both fields auto-sync on input, so there's no need to swap
      // which field is "primary" — users can type in either one.

      return { rialInput, gramInput, rate, getRial: () => parseFloat(cleanNum(rialInput.value)) || 0, getGram: () => parseFloat(cleanNum(gramInput.value)) || 0 };
    },
  };

  /* ── Countdown Timer ── */
  window.GoldCountdown = {
    instances: {},
    create(el, options) {
      const id = el.dataset.countdownId || 'cd-' + Math.random().toString(36).slice(2, 7);
      el.dataset.countdownId = id;
      el.classList.add('countdown-ring');

      // Lifecycle guard: if a previous countdown was created on this element,
      // stop its interval before re-creating. Without this, every call to
      // create() (e.g. each time a pre-invoice bottom-sheet is reopened)
      // spawns a NEW setInterval that keeps ticking in the background, never
      // cleared. The visible symptom is the timer text jumping backwards
      // and the onExpire callback firing multiple times.
      const prev = this.instances[id];
      if (prev && typeof prev.stop === 'function') {
        prev.stop();
      }

      const maxSeconds = options.maxSeconds || 598;
      const size = options.size || 48;
      const stroke = options.strokeWidth || 3;
      const radius = (size - stroke) / 2;
      const circumference = 2 * Math.PI * radius;
      const center = size / 2;

      el.innerHTML = `
        <svg width="${size}" height="${size}">
          <defs>
            <linearGradient id="countdown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#d4af37"/>
              <stop offset="50%" stop-color="#e5bf4a"/>
              <stop offset="100%" stop-color="#b8962e"/>
            </linearGradient>
          </defs>
          <circle class="countdown-ring-bg" cx="${center}" cy="${center}" r="${radius}" stroke-width="${stroke}"/>
          <circle class="countdown-ring-progress" cx="${center}" cy="${center}" r="${radius}" stroke-width="${stroke}"
            stroke-dasharray="${circumference}" stroke-dashoffset="0" id="countdown-progress-${id}"/>
        </svg>
        <span class="countdown-ring-text" id="countdown-text-${id}">00:00</span>
      `;

      const progressCircle = document.getElementById(`countdown-progress-${id}`);
      const textEl = document.getElementById(`countdown-text-${id}`);
      let remaining = maxSeconds;
      let interval = null;

      const update = () => {
        const progress = remaining / maxSeconds;
        const offset = circumference * (1 - progress);
        progressCircle.style.strokeDashoffset = offset;
        textEl.textContent = formatTime(remaining);
        textEl.className = `countdown-ring-text${remaining < 60 ? ' urgent' : ''}`;
        progressCircle.style.stroke = remaining < 60 ? '#ef4444' : '';
      };

      const start = () => {
        remaining = maxSeconds;
        update();
        interval = setInterval(() => {
          remaining--;
          update();
          if (remaining <= 0) {
            clearInterval(interval);
            interval = null;
            if (options.onExpire) options.onExpire();
          }
        }, 1000);
      };

      const stop = () => {
        if (interval) { clearInterval(interval); interval = null; }
      };

      const reset = () => { stop(); remaining = maxSeconds; update(); };

      start();

      this.instances[id] = { el, start, stop, reset, getRemaining: () => remaining };
      return this.instances[id];
    },
  };

  /* ── Pre-invoice Timer ── */
  window.GoldPreInvoice = {
    init(el, options) {
      const timerEl = el.querySelector('[data-countdown]');
      if (!timerEl) return;
      const maxSec = parseInt(timerEl.dataset.countdownMax) || 598;
      const cd = GoldCountdown.create(timerEl, {
        maxSeconds: maxSec,
        size: parseInt(timerEl.dataset.countdownSize) || 48,
        strokeWidth: parseInt(timerEl.dataset.countdownStroke) || 3,
        onExpire: () => {
          if (options && options.onExpire) options.onExpire();
        },
      });
      return cd;
    },
  };

  /* ── Format numbers on page load ── */
  document.addEventListener('DOMContentLoaded', function () {
    $$('[data-format="money"]').forEach((el) => {
      const val = parseInt(el.dataset.value);
      if (!isNaN(val)) el.textContent = toPersianNum(formatMoney(val));
    });
    $$('[data-format="persian"]').forEach((el) => {
      const val = el.dataset.value || el.textContent;
      el.textContent = toPersianNum(val);
    });
  });

  /* ── Bottom Sheet Overlay Clicks ── */
  document.addEventListener('click', function (e) {
    const overlay = e.target.closest('[data-bs-overlay]');
    if (overlay) {
      const id = overlay.dataset.bsOverlay;
      GoldBottomSheet.close(id);
    }
  });

  /* ── Nav Active State ── */
  document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;
    $$('.gold-nav-item').forEach((item) => {
      const href = item.getAttribute('href');
      if (href && path.endsWith(href)) {
        item.classList.add('active');
      }
    });
  });

  /* ── PWA Polish JS ── */
  document.addEventListener('click', function(e) {
    const target = e.target.closest('.ripple');
    if(!target) return;
    
    let span = target.querySelector('.ripple-span');
    if(!span) {
      span = document.createElement('span');
      span.className = 'ripple-span';
      target.appendChild(span);
    }
    
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    
    span.style.animation = 'none';
    span.offsetHeight; /* trigger reflow */
    span.style.animation = null; 
  });

})();

  /* ── PWA Install Prompt Logic ── */
  const pwaBanner = document.getElementById('pwa-install-banner');
  const pwaBtn = document.getElementById('pwa-install-btn');
  const pwaClose = document.getElementById('pwa-install-close');

  if (pwaBanner && pwaBtn && pwaClose) {
    // Check if app is already installed or banner was dismissed
    if (localStorage.getItem('pwa_banner_dismissed') || window.matchMedia('(display-mode: standalone)').matches) {
      pwaBanner.style.display = 'none';
    } else {
      // Listen for the custom event dispatched by sw-register.js
      document.addEventListener('pwa:installable', () => {
        pwaBanner.style.display = 'flex';
      });
      
      // If the event fired before we added the listener, we can check window.__deferredInstallPrompt
      if (window.__deferredInstallPrompt) {
         pwaBanner.style.display = 'flex';
      }
    }

    pwaBtn.addEventListener('click', () => {
      const promptEvent = window.__deferredInstallPrompt;
      if (!promptEvent) return;
      promptEvent.prompt();
      promptEvent.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
          pwaBanner.style.display = 'none';
        }
        window.__deferredInstallPrompt = null;
      });
    });

    pwaClose.addEventListener('click', () => {
      pwaBanner.style.display = 'none';
      localStorage.setItem('pwa_banner_dismissed', 'true');
    });
  }
