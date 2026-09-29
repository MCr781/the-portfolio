/* ==========================================================================
   Yasi Show - Shared Front-end Interactions
   --------------------------------------------------------------------------
   This file contains UI-state logic only (no backend calls). The backend team
   can later replace `setLoggedIn` / `setLoggedOut` with real session checks.
   ========================================================================== */

(function () {
    'use strict';

    /* ----------------------------------------------------------------------
       1. Auth State Management
       ----------------------------------------------------------------------
       Two UI states live in the header markup:
         - #auth-loggedout  -> shows "ورود / عضویت" button
         - #auth-loggedin   -> shows user profile chip + dropdown

       Backend integration:
         * Call YasiAuth.setLoggedIn("نام کاربر") right after a successful
           login to swap the UI.
         * Call YasiAuth.setLoggedOut() on logout / session expiry.
         * On page load, call YasiAuth.setLoggedIn(name) if a valid session
           cookie / token exists.
       ---------------------------------------------------------------------- */
    var STORAGE_KEY = 'yasi_auth_demo';

    window.YasiAuth = {
        /**
         * Switch header to the logged-in state.
         * @param {string} displayName  e.g. "علی صیدنژاد"
         */
        setLoggedIn: function (displayName) {
            var loggedOut = document.getElementById('auth-loggedout');
            var loggedIn  = document.getElementById('auth-loggedin');
            var nameEl    = document.getElementById('auth-username');
            if (loggedOut) loggedOut.classList.add('hidden');
            if (loggedIn)  loggedIn.classList.remove('hidden');
            if (nameEl && displayName) nameEl.textContent = displayName;
            // Persist for demo / front-end preview only.
            try { localStorage.setItem(STORAGE_KEY, displayName || ''); } catch (e) {}
        },

        setLoggedOut: function () {
            var loggedOut = document.getElementById('auth-loggedout');
            var loggedIn  = document.getElementById('auth-loggedin');
            if (loggedIn)  loggedIn.classList.add('hidden');
            if (loggedOut) loggedOut.classList.remove('hidden');
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
            // Close any open dropdown
            var dd = document.getElementById('profile-dropdown');
            if (dd) dd.classList.add('hidden');
        },

        toggleProfileMenu: function () {
            var dd = document.getElementById('profile-dropdown');
            if (!dd) return;
            dd.classList.toggle('hidden');
        },

        /**
         * Opens the OTP login modal if it exists on the current page
         * (index / about / contact / profile). Otherwise redirects to the
         * home page where the modal is available.
         */
        openLogin: function () {
            window.location.href = 'register.html';
        }
    };

    /* ----------------------------------------------------------------------
       2. Auto-restore demo auth state on every page load.
       (Remove this block once the backend wired real sessions in.)
       ---------------------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', function () {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                window.YasiAuth.setLoggedIn(saved);
            }
        } catch (e) {}

        // Profile dropdown: close when clicking outside
        document.addEventListener('click', function (e) {
            var dd = document.getElementById('profile-dropdown');
            var trigger = e.target.closest('[data-profile-trigger]');
            if (dd && !dd.classList.contains('hidden') && !trigger && !e.target.closest('#profile-dropdown')) {
                dd.classList.add('hidden');
            }
        });

        // Deep-link: open login modal if URL ends with #login
        if (window.location.hash === '#login') {
            setTimeout(function () { window.YasiAuth.openLogin(); }, 300);
        }
    });

    /* ----------------------------------------------------------------------
       3. Tiny helper to toggle the mobile menu (used by header hamburger).
          Kept here so future pages can rely on it without inline handlers.
       ---------------------------------------------------------------------- */
    window.YasiMenu = {
        open: function () {
            var m = document.getElementById('mobile-menu');
            if (m) { m.classList.remove('hidden'); document.body.classList.add('overflow-hidden'); }
        },
        close: function () {
            var m = document.getElementById('mobile-menu');
            if (m) { m.classList.add('hidden'); document.body.classList.remove('overflow-hidden'); }
        }
    };
})();
