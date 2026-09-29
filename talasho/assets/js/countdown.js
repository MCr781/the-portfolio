/* ============================================================
   TALASHO — countdown.js
   Drives the Amazing Offers countdown timer.
   Each `[data-countdown]` element has its own deadline.
   Deadline format: "YYYY-MM-DD HH:MM:SS" (server local time)
   ============================================================
   BACKEND INTEGRATION:
     The deadline is read from the data-countdown attribute.
     Backend team can either:
       (a) Inject the date directly into the HTML attribute at render time, OR
       (b) Override at runtime: window.TALASHO = { offersDeadline: '2026-07-21 23:59:59' }
   ============================================================ */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const countdownEls = document.querySelectorAll('[data-countdown]');
        if (!countdownEls.length) return;

        // Allow backend override via global
        const globalDeadline = (window.TALASHO && window.TALASHO.offersDeadline) || null;

        countdownEls.forEach(function (el) {
            const deadlineStr = globalDeadline || el.getAttribute('data-countdown');
            const deadline = parseDeadline(deadlineStr);
            if (!deadline) {
                // Invalid deadline — hide the timer entirely instead of showing 00:00:00
                el.style.visibility = 'hidden';
                return;
            }

            // Cache DOM references
            const hoursEl = el.querySelector('[data-cd-hours]');
            const minsEl  = el.querySelector('[data-cd-mins]');
            const secsEl  = el.querySelector('[data-cd-secs]');

            function tick() {
                const now   = new Date();
                const diff  = deadline - now;

                if (diff <= 0) {
                    // Offer expired — zero everything out, then stop
                    if (hoursEl) hoursEl.textContent = '00';
                    if (minsEl)  minsEl.textContent  = '00';
                    if (secsEl)  secsEl.textContent  = '00';
                    clearInterval(intervalId);
                    // Dispatch event for backend to listen to
                    el.dispatchEvent(new CustomEvent('countdown:expired', { bubbles: true }));
                    return;
                }

                const totalSecs = Math.floor(diff / 1000);
                const h = Math.floor(totalSecs / 3600);
                const m = Math.floor((totalSecs % 3600) / 60);
                const s = totalSecs % 60;

                if (hoursEl) hoursEl.textContent = pad(h);
                if (minsEl)  minsEl.textContent  = pad(m);
                if (secsEl)  secsEl.textContent  = pad(s);
            }

            // Mark as initialized so CSS can show it (it was hidden until JS runs)
            tick(); // immediate first tick — prevents flash of 00:00:00
            el.setAttribute('data-countdown-ready', 'true');
            const intervalId = setInterval(tick, 1000);
        });
    });

    // ---- helpers ----
    function parseDeadline(str) {
        if (!str) return null;
        // Accept "YYYY-MM-DD HH:MM:SS" — replace hyphens with slashes for Safari
        const normalized = String(str).replace(/-/g, '/');
        const d = new Date(normalized);
        return isNaN(d.getTime()) ? null : d;
    }

    function pad(n) {
        return (n < 10 ? '0' : '') + n;
    }

})();
