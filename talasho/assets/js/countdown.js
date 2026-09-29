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
     Static recurring campaigns can also set data-countdown-cycle-days so an
     expired seed deadline advances to the next campaign window automatically.
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
            const cycleDays = globalDeadline ? 0 : Number(el.getAttribute('data-countdown-cycle-days'));
            const deadline = resolveDeadline(deadlineStr, cycleDays);
            if (!deadline) {
                // Invalid deadline — hide the timer entirely instead of showing 00:00:00
                el.style.visibility = 'hidden';
                return;
            }

            // Cache DOM references
            const hoursEl = el.querySelector('[data-cd-hours]');
            const minsEl  = el.querySelector('[data-cd-mins]');
            const secsEl  = el.querySelector('[data-cd-secs]');
            let intervalId = null;
            let hasExpired = false;

            function tick() {
                const now   = new Date();
                const diff  = deadline - now;

                if (diff <= 0) {
                    // Offer expired — zero everything out, then stop
                    if (hoursEl) hoursEl.textContent = '00';
                    if (minsEl)  minsEl.textContent  = '00';
                    if (secsEl)  secsEl.textContent  = '00';
                    if (intervalId !== null) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                    // Dispatch event for backend to listen to
                    if (!hasExpired) {
                        hasExpired = true;
                        el.dispatchEvent(new CustomEvent('countdown:expired', { bubbles: true }));
                    }
                    return false;
                }

                const totalSecs = Math.floor(diff / 1000);
                const h = Math.floor(totalSecs / 3600);
                const m = Math.floor((totalSecs % 3600) / 60);
                const s = totalSecs % 60;

                if (hoursEl) hoursEl.textContent = pad(h);
                if (minsEl)  minsEl.textContent  = pad(m);
                if (secsEl)  secsEl.textContent  = pad(s);
                return true;
            }

            // Mark as initialized so CSS can show it (it was hidden until JS runs)
            const shouldContinue = tick(); // immediate first tick — prevents flash of 00:00:00
            el.setAttribute('data-countdown-ready', 'true');
            if (shouldContinue) intervalId = setInterval(tick, 1000);
        });
    });

    // ---- helpers ----
    function resolveDeadline(str, cycleDays) {
        const deadline = parseDeadline(str);
        if (!deadline || !Number.isFinite(cycleDays) || cycleDays <= 0) return deadline;

        const cycleMs = cycleDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        if (deadline.getTime() <= now) {
            const elapsedCycles = Math.floor((now - deadline.getTime()) / cycleMs) + 1;
            deadline.setTime(deadline.getTime() + elapsedCycles * cycleMs);
        }
        return deadline;
    }

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
