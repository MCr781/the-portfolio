/* ════════════════════════════════════════════════════════════════════════════
   auth.js — Pure UI helpers for /gold/auth.html and /gold/auth-register.html
   ────────────────────────────────────────────────────────────────────────────
   This file contains ONLY user-experience helpers. It does NOT:
   • Make any HTTP/fetch requests (HTMX handles all backend communication)
   • Store any session, token, or state in localStorage/sessionStorage
   • Validate OTP value (server validates against the SMS code)
   • Implement any authentication state machine

   It DOES:
   • Switch between Login and Register tabs (purely visual)
   • Toggle password visibility (show/hide)
   • Auto-advance between OTP input boxes (UX nicety, no validation)
   • Show a password-strength meter (UX nicety, no enforcement — server
     is the source of truth for password rules)

   HTMX handles all form submissions and DOM updates. The JS here just
   enhances the experience between user actions.
   ════════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Persian digit conversion (for password strength label only) ── */
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const toFa = (s) => s.toString().replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
  const toEn = (s) => s.toString().replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d).toString());

  /* ──────────────────────────────────────────────────────────────────────
     1. Tab switching (Login ↔ Register)
     ────────────────────────────────────────────────────────────────────── */
  function initTabs() {
    const tabLogin    = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const paneLogin   = document.getElementById('pane-login');
    const paneReg     = document.getElementById('pane-register');
    if (!tabLogin || !tabRegister) return;

    function activateTab(which) {
      const isLogin = (which === 'login');
      tabLogin.classList.toggle('active', isLogin);
      tabRegister.classList.toggle('active', !isLogin);
      tabLogin.setAttribute('aria-selected', isLogin);
      tabRegister.setAttribute('aria-selected', !isLogin);
      if (paneLogin) paneLogin.style.display = isLogin ? 'block' : 'none';
      if (paneReg)   paneReg.style.display   = isLogin ? 'none'  : 'block';
    }

    tabLogin.addEventListener('click', function () { activateTab('login'); });
    tabRegister.addEventListener('click', function () { activateTab('register'); });

    const switchLink = document.getElementById('switch-to-login-from-register');
    if (switchLink) {
      switchLink.addEventListener('click', function (e) {
        e.preventDefault();
        activateTab('login');
      });
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     2. Password visibility toggle
     ────────────────────────────────────────────────────────────────────── */
  function initPasswordToggles() {
    document.querySelectorAll('[data-toggle-pw]').forEach(function (btn) {
      const targetId = btn.getAttribute('data-toggle-pw');
      const input = document.getElementById(targetId);
      if (!input) return;
      btn.addEventListener('click', function () {
        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        btn.innerHTML = isPw ? '<i class="bx bx-hide"></i>' : '<i class="bx bx-show"></i>';
        btn.setAttribute('aria-label', isPw ? 'پنهان کردن رمز' : 'نمایش رمز');
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────────────
     3. OTP input auto-advance
     Only UX nicety — moves focus to next box when current is filled.
     Does NOT validate the value. Server validates the actual OTP.

     Works with any container that has:
       class="otp-input-group" data-otp-length="4"
       containing <input class="otp-box" maxlength="1"> elements
     ────────────────────────────────────────────────────────────────────── */
  function initOtpInputs() {
    document.querySelectorAll('.otp-input-group').forEach(function (container) {
      const boxes = Array.from(container.querySelectorAll('.otp-box'));
      if (!boxes.length) return;

      boxes.forEach(function (box, i) {
        box.addEventListener('input', function () {
          // Normalize to single digit (convert fa→en, strip non-digits)
          let v = toEn(this.value).replace(/[^0-9]/g, '');
          if (v.length > 1) v = v.slice(-1);
          this.value = v;
          // Auto-advance to next box
          if (v && i < boxes.length - 1) {
            boxes[i + 1].focus();
          }
        });

        box.addEventListener('keydown', function (e) {
          // Backspace on empty box → focus previous
          if (e.key === 'Backspace' && !this.value && i > 0) {
            boxes[i - 1].focus();
            boxes[i - 1].value = '';
            e.preventDefault();
          }
          // Arrow keys for navigation
          if (e.key === 'ArrowLeft' && i < boxes.length - 1) {
            boxes[i + 1].focus();
            e.preventDefault();
          }
          if (e.key === 'ArrowRight' && i > 0) {
            boxes[i - 1].focus();
            e.preventDefault();
          }
        });

        box.addEventListener('paste', function (e) {
          // Allow pasting a multi-digit code — distribute across boxes
          e.preventDefault();
          const pasted = (e.clipboardData || window.clipboardData).getData('text');
          const digits = toEn(pasted).replace(/[^0-9]/g, '').slice(0, boxes.length);
          boxes.forEach(function (b, idx) { b.value = digits[idx] || ''; });
          if (digits.length > 0) {
            boxes[Math.min(digits.length, boxes.length - 1)].focus();
          }
        });
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────────────
     4. Password strength meter (visual hint only — no enforcement)
     ────────────────────────────────────────────────────────────────────── */
  const STRENGTH_LABELS = ['خیلی ضعیف', 'ضعیف', 'متوسط', 'قوی', 'خیلی قوی'];
  const STRENGTH_CLASSES = ['weak', 'weak', 'medium', 'strong', 'strong'];

  function passwordScore(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return Math.min(score, 4);
  }

  function initPasswordStrength() {
    // Look for any password input that has a matching meter
    document.querySelectorAll('input[type="password"]').forEach(function (input) {
      // Convention: meter ID = input.id + '-meter', label ID = input.id + '-label'
      if (!input.id) return;
      const meter = document.getElementById(input.id + '-meter');
      const label = document.getElementById(input.id + '-label');
      if (!meter) return;

      input.addEventListener('input', function () {
        const pw = this.value;
        const score = passwordScore(pw);
        meter.className = 'pw-strength-meter ' + (pw ? STRENGTH_CLASSES[score] : '');
        meter.setAttribute('aria-valuenow', score);
        const bars = meter.querySelectorAll('.pw-strength-bar');
        bars.forEach(function (b, i) { b.classList.toggle('filled', i < score); });
        if (label) {
          label.textContent = pw ? STRENGTH_LABELS[score] : '';
          label.className = 'pw-strength-label ' + (pw ? STRENGTH_CLASSES[score] : '');
        }
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────────────
     5. Phone input nicety — convert fa digits to en, strip non-digits
     (Server is still responsible for validation; this is just UX.)
     ────────────────────────────────────────────────────────────────────── */
  function initPhoneInputs() {
    document.querySelectorAll('input[type="tel"]').forEach(function (input) {
      input.addEventListener('input', function () {
        let v = toEn(this.value).replace(/[^0-9]/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        this.value = v;
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────────────
     6. National ID input nicety — only digits, max 10
     ────────────────────────────────────────────────────────────────────── */
  function initNationalIdInputs() {
    document.querySelectorAll('input[name="nationalId"]').forEach(function (input) {
      input.addEventListener('input', function () {
        this.value = toEn(this.value).replace(/[^0-9]/g, '').slice(0, 10);
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────────────
     7. Birth date inputs — digits only + auto-advance
     ────────────────────────────────────────────────────────────────────── */
  function initBirthDateInputs() {
    const yearInput  = document.querySelector('input[name="birthYear"]');
    const monthInput = document.querySelector('input[name="birthMonth"]');
    const dayInput   = document.querySelector('input[name="birthDay"]');
    if (!yearInput || !monthInput || !dayInput) return;

    [yearInput, monthInput, dayInput].forEach(function (input) {
      input.addEventListener('input', function () {
        this.value = toEn(this.value).replace(/[^0-9]/g, '');
      });
    });

    // Auto-advance: year(4) → month(2) → day(2)
    yearInput.addEventListener('input', function () {
      if (this.value.length === 4) monthInput.focus();
    });
    monthInput.addEventListener('input', function () {
      if (this.value.length === 2) dayInput.focus();
    });
  }

  /* ──────────────────────────────────────────────────────────────────────
     8. HTMX event hooks — re-init after every HTMX swap
     Because HTMX replaces DOM nodes on form submissions, our event
     listeners need to be re-attached. htmx:afterSwap fires after every
     swap. We re-run all initializers.
     ────────────────────────────────────────────────────────────────────── */
  function reinitAll() {
    initPasswordToggles();
    initOtpInputs();
    initPasswordStrength();
    initPhoneInputs();
    initNationalIdInputs();
    initBirthDateInputs();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    reinitAll();
  });

  // Re-init after HTMX swaps (e.g. when step 1 form is replaced with step 2)
  document.body.addEventListener('htmx:afterSwap', reinitAll);
  document.body.addEventListener('htmx:afterSettle', reinitAll);

})();
