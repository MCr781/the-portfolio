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

    // Format a number with thousand separators (Latin digits — fintech convention)
    function format(n) {
        return new Intl.NumberFormat('en-US').format(Math.round(n));
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
        const absPct   = Math.abs(pct).toFixed(1) + '%';

        // Reset classes
        chipEl.classList.remove(
            'text-status-success', 'bg-status-success-bg',
            'text-status-error',   'bg-status-error-bg',
            'text-content-muted',  'bg-primary-50'
        );

        if (pct > 0.01) {
            // up — green
            chipEl.classList.add('text-status-success', 'bg-status-success-bg');
            if (arrowSvg) arrowSvg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>';
        } else if (pct < -0.01) {
            // down — red
            chipEl.classList.add('text-status-error', 'bg-status-error-bg');
            if (arrowSvg) arrowSvg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>';
        } else {
            // flat — gray
            chipEl.classList.add('text-content-muted', 'bg-primary-50');
            if (arrowSvg) arrowSvg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14"/>';
        }

        if (pctEl) pctEl.textContent = absPct;
    }

    // Update a single price row with new values
    function updateRow(rowEl, name, current, prev) {
        if (!rowEl) return;

        // Update data attributes
        rowEl.setAttribute('data-price-current', current);
        rowEl.setAttribute('data-price-prev', prev);

        // Update display
        const displayEl = rowEl.querySelector('[data-price-display]');
        if (displayEl) {
            // Smooth transition: flash bg gold briefly on change
            displayEl.style.transition = 'color 0.3s';
            displayEl.textContent = format(current);
        }

        // Update fluctuation chip
        const chipEl = rowEl.querySelector('[data-fluctuation-display]');
        applyFluctuation(chipEl, fluctuationPercent(current, prev));
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

    // ----------------------------------------------------------------
    // DEMO MODE: random-walk prices every 5 seconds
    // Backend: delete this whole block, just keep updatePrices() above
    // ----------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        const rows = document.querySelectorAll('[data-price-row]');
        if (!rows.length) return;

        setInterval(function () {
            rows.forEach(function (row) {
                const name    = row.getAttribute('data-price-name');
                const current = parseFloat(row.getAttribute('data-price-current')) || 0;

                // Random walk: ±0.3% with small flat-floor
                const delta = (Math.random() - 0.5) * 0.006 * current;
                const newPrice = Math.max(1, current + delta);

                updateRow(row, name, newPrice, current);
            });

            // Update "last updated" timestamp display
            const now = new Date();
            const ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
            const tsEls = document.querySelectorAll('[data-last-update]');
            tsEls.forEach(function (el) { el.textContent = ts; });
        }, 5000);
    });

    function pad(n) { return (n < 10 ? '0' : '') + n; }

})();
