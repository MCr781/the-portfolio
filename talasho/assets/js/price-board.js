/* ============================================================
   TALASHO — price-board.js
   Demo script for the live price board.
   Random-walks the prices every 5s so the UI feels alive.
   ============================================================
   BACKEND INTEGRATION:
     This script is for FRONTEND DEMO ONLY.
     Backend team should:
       1) Remove this file from the page (or guard it behind a flag), AND
       2) Call window.TALASHO.updatePrices(payload) with their live data.
     Payload format (array of { name, current, prev }):
       window.TALASHO.updatePrices([
         { name: 'طلای ۱۸ عیار (گرم)', current: 4400000, prev: 4350000 },
         { name: 'دلار آزاد',          current: 60000,   prev: 59800 },
         ...
       ])
   ============================================================ */

(function () {
    'use strict';

    // Convert Latin digits to Persian digits (RTL UI convention)
    var PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    function toPersianDigits(value) {
        return String(value).replace(/\d/g, function (d) { return PERSIAN_DIGITS[d]; });
    }

    // Format a number with thousand separators, rendered in Persian digits
    function format(n) {
        return toPersianDigits(new Intl.NumberFormat('en-US').format(Math.round(n)));
    }

    // Calculate fluctuation % from current vs previous price
    function fluctuationPercent(current, prev) {
        if (!prev) return 0;
        return ((current - prev) / prev) * 100;
    }

    // Apply visual state to a single fluctuation chip
    function applyFluctuation(chipEl, pct) {
        if (!chipEl) return;
        const arrowSvg = chipEl.querySelector('svg');
        const pctEl    = chipEl.querySelector('[data-fluctuation-percent]');
        const sign     = pct > 0.01 ? '+' : pct < -0.01 ? '-' : '';
        const displayPct = sign + toPersianDigits(Math.abs(pct).toFixed(1)) + '%';

        // Reset classes
        chipEl.classList.remove(
            'text-emerald-700',    'bg-status-success-bg',  'border-emerald-700/20',
            'text-red-700',        'bg-status-error-bg',    'border-red-700/20',
            'text-slate-800',      'bg-primary-100',        'border-primary-200/70'
        );

        if (pct > 0.01) {
            // up — green tinted pill with dark text (WCAG AA)
            chipEl.classList.add('text-emerald-700', 'bg-status-success-bg', 'border-emerald-700/20');
            if (arrowSvg) arrowSvg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>';
        } else if (pct < -0.01) {
            // down — red tinted pill with dark text (WCAG AA)
            chipEl.classList.add('text-red-700', 'bg-status-error-bg', 'border-red-700/20');
            if (arrowSvg) arrowSvg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>';
        } else {
            // flat — neutral lavender pill with dark text
            chipEl.classList.add('text-slate-800', 'bg-primary-100', 'border-primary-200/70');
            if (arrowSvg) arrowSvg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14"/>';
        }

        if (pctEl) {
            pctEl.setAttribute('dir', 'ltr');
            pctEl.textContent = displayPct;
        }
    }

    // Per-instrument rolling history, shared by every widget with the same name.
    // Feeds the mini heartbeat sparkline in the header gold chip.
    var sparkHistory = {};

    // Redraw the sparkline polyline from the recent price history
    function updateSparkline(sparkEl, history) {
        if (!sparkEl || !history || history.length < 2) return;
        var poly = sparkEl.querySelector('polyline');
        if (!poly) return;

        var vb = (sparkEl.getAttribute('viewBox') || '0 0 28 16').trim().split(/\s+/).map(Number);
        if (vb.length !== 4) return;
        var vbW = vb[2], vbH = vb[3], pad = 1.5;

        var min = Math.min.apply(null, history);
        var max = Math.max.apply(null, history);
        var range = (max - min) || 1;
        var usableH = Math.max(1, vbH - pad * 2);
        var step = (vbW - pad * 2) / (history.length - 1);

        var points = history.map(function (v, i) {
            var x = pad + i * step;
            var y = pad + (1 - (v - min) / range) * usableH;
            return x.toFixed(1) + ',' + y.toFixed(1);
        }).join(' ');

        poly.setAttribute('points', points);
    }

    // Update a single price row with new values
    function updateRow(rowEl, name, current, prev) {
        if (!rowEl) return;

        // Update data attributes
        rowEl.setAttribute('data-price-current', current);
        rowEl.setAttribute('data-price-prev', prev);

        // Update display
        const displayEl = rowEl.querySelector('[data-price-display]');
        if (displayEl) displayEl.textContent = format(current);

        // Update fluctuation chip
        const chipEl = rowEl.querySelector('[data-fluctuation-display]');
        applyFluctuation(chipEl, fluctuationPercent(current, prev));

        // Flash the price cell green/red on change (living market effect)
        const flashEl = rowEl.querySelector('[data-price-flash]');
        if (flashEl) {
            flashEl.classList.remove('flash-up', 'flash-down');
            void flashEl.offsetWidth; // restart the animation
            flashEl.classList.add(current >= prev ? 'flash-up' : 'flash-down');
        }

        // Feed the heartbeat sparkline
        sparkHistory[name] = sparkHistory[name] || [];
        const history = sparkHistory[name];
        history.push(current);
        if (history.length > 24) history.shift();
        updateSparkline(rowEl.querySelector('[data-sparkline]'), history);
    }

    // PUBLIC API — backend can call this with their live data
    function updatePrices(payload) {
        if (!Array.isArray(payload)) return;
        const rows = document.querySelectorAll('[data-price-row]');
        payload.forEach(function (item) {
            rows.forEach(function (row) {
                if (row.getAttribute('data-price-name') === item.name) {
                    updateRow(row, item.name, item.current, item.prev);
                }
            });
        });
    }

    // Expose public API
    window.TALASHO = window.TALASHO || {};
    window.TALASHO.updatePrices = updatePrices;

    // Initialize sparklines immediately on load so chart is visible instantly
    function initSparklines() {
        var rows = document.querySelectorAll('[data-price-row]');
        if (!rows.length) return;

        rows.forEach(function (row) {
            var name = row.getAttribute('data-price-name');
            if (!name) return;

            if (!sparkHistory[name] || sparkHistory[name].length < 2) {
                var current = parseFloat(row.getAttribute('data-price-current')) || 4545000;
                var prev = parseFloat(row.getAttribute('data-price-prev')) || (current * 0.992);

                // Seed a realistic 10-point historical curve from prev to current
                var seed = [];
                var steps = 10;
                var base = prev;
                var totalDiff = current - prev;
                for (var i = 0; i < steps; i++) {
                    var ratio = i / (steps - 1);
                    var wave = Math.sin(i * 0.9) * 0.0015 * base;
                    seed.push(Math.round(base + totalDiff * ratio + wave));
                }
                sparkHistory[name] = seed;
            }

            var sparkEl = row.querySelector('[data-sparkline]');
            if (sparkEl) {
                updateSparkline(sparkEl, sparkHistory[name]);
            }
        });
    }

    // ----------------------------------------------------------------
    // DEMO MODE: random-walk prices every 5 seconds
    // Backend: delete this whole block, just keep updatePrices() above
    // ----------------------------------------------------------------
    function startDemoEngine() {
        const rows = document.querySelectorAll('[data-price-row]');
        if (!rows.length) return;

        // Render sparkline and rows immediately on startup
        initSparklines();

        setInterval(function () {
            // One random-walk per instrument name so every widget with the same
            // name (desktop chip, mobile strip, rates page) stays in sync.
            const nextByName = {};

            rows.forEach(function (row) {
                const name = row.getAttribute('data-price-name');
                const prev = parseFloat(row.getAttribute('data-price-current')) || 0;

                let current;
                if (nextByName[name] !== undefined) {
                    current = nextByName[name];
                } else {
                    // Random walk: ±0.3% with small flat-floor
                    const delta = (Math.random() - 0.5) * 0.006 * prev;
                    current = Math.max(1, prev + delta);
                    nextByName[name] = current;
                }

                updateRow(row, name, current, prev);
            });

            // Update "last updated" timestamp display
            const now = new Date();
            const ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
            const tsEls = document.querySelectorAll('[data-last-update]');
            tsEls.forEach(function (el) { el.textContent = ts; });
        }, 5000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startDemoEngine);
    } else {
        startDemoEngine();
    }

    function pad(n) { return toPersianDigits((n < 10 ? '0' : '') + n); }

})();
