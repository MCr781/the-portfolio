/* ════════════════════════════════════════════════════════════════════════════
   gold-chrome.js — shared UI chrome + components for the /gold/ PWA
   ────────────────────────────────────────────────────────────────────────────
   Loaded AFTER gold-trading.js on every gold/*.html page. Provides:

     1. GoldAuth       — mock sessionStorage-backed auth state machine
     2. GoldStatusAlert — reusable alert card (success / error / warning / info)
     3. GoldPreInvoice  — reusable timed pre-invoice bottom-sheet
     4. GoldReceipt     — unified receipt renderer (inline or standalone page)
     5. GoldUserMenu    — slide-out user menu, injected into every gold page
     6. GoldNotifications — slide-out notifications center, injected into every gold page
     7. GoldVaultCreate — full-featured create-vault bottom-sheet

   Design rules:
   • No backend. All state is mocked in sessionStorage. Real OTP / KYC / gateway
     integration is the server's job; this file only shapes the UI.
   • No build step. Plain ES5-ish IIFE so it runs in any browser the PWA targets.
   • No jQuery dependency. Uses the `$` / `$$` helpers from gold-trading.js
     when present, but falls back to native APIs.
   • Injects its own bottom-sheet markup into <body> on DOMContentLoaded so
     the 19 HTML pages don't each need to duplicate ~30 lines of menu markup.
   ════════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.GoldToast) {
    console.warn('[gold-chrome] gold-trading.js must load first; aborting.');
    return;
  }

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Persian digit helpers (mirror gold-trading.js in case it isn't loaded
     on a page that only needs the receipt renderer, e.g. receipt.html). */
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function toFa(n) { return String(n).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function toEn(s) { return String(s).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); }); }
  function fmtMoney(n) {
    n = String(n).replace(/[^0-9.-]/g, '');
    var parts = n.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  function faMoney(n) { return toFa(fmtMoney(n)); }
  function faNum(n)   { return toFa(n); }

  /* ═════════════════════════════════════════════════════════════════════════
     1. GoldAuth — mock auth state machine
     ═════════════════════════════════════════════════════════════════════════ */
  var AUTH_KEY = 'gholak_auth_state_v1';
  var DEMO_OTP = '12345';

  var GoldAuth = {
    DEMO_OTP: DEMO_OTP,

    get state() {
      try { return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null') || null; }
      catch (_) { return null; }
    },
    set state(v) {
      try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(v)); }
      catch (_) {}
    },

    isLoggedIn: function () {
      var s = this.state;
      return !!(s && s.phone && s.name);
    },

    /* Step 1: phone entry → persists phone, returns false if invalid. */
    setPhone: function (phone) {
      phone = toEn(String(phone || '')).replace(/[^0-9]/g, '');
      if (!/^09[0-9]{9}$/.test(phone)) return false;
      var s = this.state || {};
      s.phone = phone;
      s.otpSentAt = Date.now();
      this.state = s;
      return true;
    },

    /* Step 2: verify OTP. Returns true if matches DEMO_OTP. */
    verifyOtp: function (code) {
      code = toEn(String(code || '')).replace(/[^0-9]/g, '');
      if (code !== DEMO_OTP) return false;
      var s = this.state || {};
      s.otpVerified = true;
      this.state = s;
      return true;
    },

    /* Step 3: complete profile (name, lastname, nationalId, birthdate). */
    setProfile: function (profile) {
      var s = this.state || {};
      s.name      = profile.name      || '';
      s.lastname  = profile.lastname  || '';
      s.nationalId = profile.nationalId || '';
      s.birthYear  = profile.birthYear  || '';
      s.birthMonth = profile.birthMonth || '';
      s.birthDay   = profile.birthDay   || '';
      s.termsAcceptedAt = profile.termsAcceptedAt || Date.now();
      s.termsVersion = profile.termsVersion || '1.4 — 1404/03/20';
      this.state = s;
      return true;
    },

    /* Step 4: create main vault + finalize KYC. */
    finalize: function () {
      var s = this.state || {};
      s.kycStatus = 'approved';        // mock — real KYC is server-side
      s.accountStatus = 'active';
      s.createdAt = Date.now();
      if (!s.vaults || !s.vaults.length) {
        s.vaults = [{
          id: 'main',
          name: 'قلک اصلی',
          type: 'main',
          gramBalance: 0,
          rialBalance: 0,
          goalType: null,
          goalAmount: 0,
          reminder: 'none',
          createdAt: Date.now()
        }];
      }
      this.state = s;
      return s;
    },

    /* Vault CRUD */
    getVaults: function () {
      var s = this.state;
      return s && s.vaults ? s.vaults : [];
    },
    addVault: function (vault) {
      var s = this.state || { vaults: [] };
      vault.id = 'v-' + Date.now();
      vault.gramBalance = vault.gramBalance || 0;
      vault.rialBalance = vault.rialBalance || 0;
      vault.createdAt = Date.now();
      s.vaults = s.vaults || [];
      s.vaults.push(vault);
      this.state = s;
      return vault;
    },
    removeVault: function (id) {
      var s = this.state;
      if (!s || !s.vaults) return;
      // Never allow removing the main vault.
      if (id === 'main') return false;
      s.vaults = s.vaults.filter(function (v) { return v.id !== id; });
      this.state = s;
      return true;
    },

    logout: function () {
      sessionStorage.removeItem(AUTH_KEY);
    },

    /* Masked national ID, e.g. "۰۹۱۲۳۴۵۶۷۸" → "۰۹۱***۴۵۶۷۸" */
    maskedNationalId: function () {
      var s = this.state;
      if (!s || !s.nationalId) return '—';
      var nid = s.nationalId;
      if (nid.length < 4) return toFa(nid);
      return toFa(nid.slice(0, 3) + '***' + nid.slice(-4));
    },

    fullName: function () {
      var s = this.state;
      if (!s) return 'کاربر مهمان';
      return ((s.name || '') + ' ' + (s.lastname || '')).trim() || 'کاربر قلک طلا';
    }
  };
  window.GoldAuth = GoldAuth;


  /* ═════════════════════════════════════════════════════════════════════════
     2. GoldStatusAlert — reusable alert card
     ═════════════════════════════════════════════════════════════════════════ */
  var ALERT_ICONS = {
    success: 'bx-check-circle',
    error:   'bx-x-circle',
    warning: 'bx-info-circle',
    info:    'bx-bell'
  };
  var ALERT_TITLES = {
    success: 'عملیات موفق',
    error:   'خطا در عملیات',
    warning: 'توجه',
    info:    'اطلاع‌رسانی'
  };

  var GoldStatusAlert = {
    show: function (container, type, title, msg, opts) {
      container = typeof container === 'string' ? $(container) : container;
      if (!container) return null;
      opts = opts || {};
      var alert = document.createElement('div');
      alert.className = 'gold-alert gold-alert-' + (type || 'info');
      if (opts.dismissible) alert.classList.add('gold-alert-dismissible');
      alert.innerHTML =
        '<i class="bx ' + (ALERT_ICONS[type] || ALERT_ICONS.info) + ' gold-alert-icon"></i>' +
        '<div class="gold-alert-body">' +
          '<h4 class="gold-alert-title">' + (title || ALERT_TITLES[type || 'info']) + '</h4>' +
          (msg ? '<p class="gold-alert-text">' + msg + '</p>' : '') +
        '</div>' +
        (opts.dismissible ? '<button class="gold-alert-close" aria-label="بستن"><i class="bx bx-x"></i></button>' : '');
      if (opts.id) alert.id = opts.id;
      container.appendChild(alert);
      if (opts.dismissible) {
        alert.querySelector('.gold-alert-close').addEventListener('click', function () {
          alert.remove();
        });
      }
      return alert;
    },
    success: function (c, t, m, o) { return this.show(c, 'success', t, m, o); },
    error:   function (c, t, m, o) { return this.show(c, 'error',   t, m, o); },
    warning: function (c, t, m, o) { return this.show(c, 'warning', t, m, o); },
    info:    function (c, t, m, o) { return this.show(c, 'info',    t, m, o); }
  };
  window.GoldStatusAlert = GoldStatusAlert;


  /* ═════════════════════════════════════════════════════════════════════════
     3. GoldPreInvoice — reusable timed pre-invoice bottom-sheet
     ═════════════════════════════════════════════════════════════════════════ */
  var PREINVOICE_ID = 'gold-shared-pre-invoice';

  function buildPreInvoiceMarkup() {
    if ($(PREINVOICE_ID)) return $(PREINVOICE_ID);
    var overlay = document.createElement('div');
    overlay.className = 'bottom-sheet-overlay';
    overlay.setAttribute('data-bs-overlay', PREINVOICE_ID);
    var sheet = document.createElement('div');
    sheet.className = 'bottom-sheet';
    sheet.setAttribute('data-bs', PREINVOICE_ID);
    sheet.innerHTML =
      '<div class="bottom-sheet-handle"></div>' +
      '<div class="bottom-sheet-header">' +
        '<span class="bottom-sheet-title" id="gpi-title">پیش‌فاکتور</span>' +
        '<button class="bottom-sheet-close" onclick="GoldBottomSheet.close(\'' + PREINVOICE_ID + '\')"><i class="bx bx-x"></i></button>' +
      '</div>' +
      '<div class="bottom-sheet-body" id="gpi-body"></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
    return sheet;
  }

  var GoldPreInvoice = {
    /* opts: { title, rows:[{label,value,highlight?}], totalLabel, totalValue,
              termsVersion, noticeText, confirmLabel, maxSeconds, onConfirm, onExpire } */
    open: function (opts) {
      opts = opts || {};
      buildPreInvoiceMarkup();
      $('#gpi-title').textContent = opts.title || 'پیش‌فاکتور';

      var rowsHtml = (opts.rows || []).map(function (r) {
        return '<div class="pre-invoice-item' + (r.highlight ? ' pre-invoice-item-highlight' : '') + '">' +
                 '<span class="pre-invoice-label">' + (r.label || '') + '</span>' +
                 '<span class="pre-invoice-value">' + (r.value || '') + '</span>' +
               '</div>';
      }).join('');

      var totalHtml = '';
      if (opts.totalValue) {
        totalHtml = '<div class="pre-invoice-total">' +
                      '<span class="pre-invoice-total-label">' + (opts.totalLabel || 'قابل پرداخت') + '</span>' +
                      '<span class="pre-invoice-total-value">' + opts.totalValue + '</span>' +
                    '</div>';
      }

      var noticeHtml = '';
      if (opts.noticeText) {
        noticeHtml = '<div class="pre-invoice-note">' +
                       '<i class="bx bx-info-circle"></i>' +
                       '<span>' + opts.noticeText + '</span>' +
                     '</div>';
      }

      var termsHtml = '';
      if (opts.termsVersion) {
        termsHtml = '<label class="pre-invoice-terms">' +
                      '<input type="checkbox" id="gpi-terms" />' +
                      '<span>قوانین و مقررات را می‌پذیرم' +
                        '<span class="pre-invoice-terms-version">نسخه ' + opts.termsVersion + '</span>' +
                      '</span>' +
                    '</label>';
      }

      var errorHtml = '<div class="pre-invoice-error" id="gpi-error"></div>';

      var countdownAttr = 'data-countdown data-countdown-max="' + (opts.maxSeconds || 598) + '" data-countdown-size="32" data-countdown-stroke="3"';
      var confirmHtml = '<div class="bottom-sheet-actions">' +
        '<button class="btn-primary-gold ripple" id="gpi-confirm" style="position:relative; display:flex; justify-content:space-between; align-items:center;">' +
          '<span class="btn-text">' + (opts.confirmLabel || 'تایید و پرداخت') + '</span>' +
          '<span ' + countdownAttr + ' style="margin-right:12px;"></span>' +
        '</button>' +
      '</div>';

      $('#gpi-body').innerHTML = rowsHtml + totalHtml + noticeHtml + errorHtml + termsHtml + confirmHtml;

      // Wire countdown
      var cdEl = $('#gpi-confirm [data-countdown]');
      var cd = null;
      if (cdEl && window.GoldCountdown) {
        cd = window.GoldCountdown.create(cdEl, {
          maxSeconds: opts.maxSeconds || 598,
          size: 32, strokeWidth: 3,
          onExpire: function () {
            var btn = $('#gpi-confirm');
            if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
            var err = $('#gpi-error');
            if (err) err.textContent = 'زمان پیش‌فاکتور به پایان رسید. لطفاً دوباره تلاش کنید.';
            if (opts.onExpire) opts.onExpire();
          }
        });
      }

      // Wire confirm button
      var btn = $('#gpi-confirm');
      if (btn) {
        btn.addEventListener('click', function () {
          var terms = $('#gpi-terms');
          if (terms && !terms.checked) {
            var err = $('#gpi-error');
            if (err) err.textContent = 'لطفاً قوانین را تأیید کنید.';
            if (window.GoldToast) GoldToast.warning('لطفاً ابتدا قوانین و مقررات را تأیید کنید.');
            terms.focus();
            return;
          }
          if (opts.onConfirm) opts.onConfirm();
        });
      }

      window.GoldBottomSheet.open(PREINVOICE_ID);
      return { sheet: $(PREINVOICE_ID), countdown: cd };
    },
    close: function () { window.GoldBottomSheet.close(PREINVOICE_ID); }
  };
  window.GoldPreInvoice = GoldPreInvoice;


  /* ═════════════════════════════════════════════════════════════════════════
     4. GoldReceipt — unified receipt renderer
     ═════════════════════════════════════════════════════════════════════════ */
  var RECEIPT_TYPES = {
    buy:      { title: 'رسید خرید طلا',         prefix: 'B', icon: 'bx-cart-alt' },
    sell:     { title: 'رسید فروش طلا',         prefix: 'S', icon: 'bx-tag-alt' },
    withdraw: { title: 'رسید برداشت وجه',       prefix: 'W', icon: 'bx-money' },
    deposit:  { title: 'رسید شارژ کیف پول',      prefix: 'D', icon: 'bx-wallet-alt' },
    physical: { title: 'رسید درخواست تحویل فیزیکی', prefix: 'P', icon: 'bx-package' }
  };

  var STATUS_BADGES = {
    success:   '<span class="status-badge status-success"><i class="bx bx-check-circle"></i> موفق</span>',
    pending:   '<span class="status-badge status-pending"><i class="bx bx-time-five"></i> در انتظار</span>',
    failed:    '<span class="status-badge status-failed"><i class="bx bx-x-circle"></i> ناموفق</span>',
    canceled:  '<span class="status-badge status-pending"><i class="bx bx-block"></i> لغو شده</span>',
    review:    '<span class="status-badge status-review"><i class="bx bx-search-alt-2"></i> نیازمند بررسی</span>'
  };

  function faDate(d) {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      }).format(d || new Date());
    } catch (_) { return ''; }
  }

  var GoldReceipt = {
    /* data: { type, status, amount, weight, rate, fee, tax, total, tracking,
                vault, bank, holder, gateway, gatewayTracking, address,
                deliveryTime, termsVersion, date } */
    render: function (data) {
      data = data || {};
      var t = RECEIPT_TYPES[data.type] || RECEIPT_TYPES.buy;
      var status = data.status || 'success';
      var statusHtml = STATUS_BADGES[status] || STATUS_BADGES.pending;
      var amount = data.amount || '0';
      var tracking = data.tracking || String(Math.floor(Math.random() * 9000000 + 1000000));
      var weight = data.weight || '0';
      var date = data.date ? faDate(new Date(data.date)) : faDate(new Date());

      var rows = [];
      rows.push({ label: 'وضعیت', value: statusHtml });
      rows.push({ label: 'شماره پیگیری', value: t.prefix + '-' + faNum(tracking) });
      rows.push({ label: 'تاریخ', value: date });
      if (weight && weight !== '0') {
        rows.push({ label: 'مقدار طلا', value: faNum(weight) + ' گرم' });
      }
      if (data.rate) rows.push({ label: 'نرخ', value: faMoney(data.rate) + ' تومان' });
      if (data.fee)  rows.push({ label: 'کارمزد', value: faMoney(data.fee) + ' تومان' });
      if (data.tax)  rows.push({ label: 'مالیات', value: faMoney(data.tax) + ' تومان' });
      if (data.vault) rows.push({ label: 'قلک مقصد', value: data.vault });
      if (data.bank) {
        rows.push({ label: 'بانک مقصد', value: data.bank });
        if (data.holder) rows.push({ label: 'صاحب حساب', value: data.holder });
      }
      if (data.gateway) {
        rows.push({ label: 'درگاه پرداخت', value: data.gateway });
        if (data.gatewayTracking) rows.push({ label: 'کد پیگیری درگاه', value: faNum(data.gatewayTracking) });
      }
      if (data.address) {
        rows.push({ label: 'آدرس تحویل', value: '<span style="font-size:12px;">' + data.address + '</span>' });
      }
      if (data.deliveryTime) {
        rows.push({ label: 'زمان تحویل', value: data.deliveryTime });
      }
      if (data.termsVersion) {
        rows.push({ label: 'نسخه قوانین', value: data.termsVersion });
      }

      return {
        title: t.title,
        icon:  t.icon,
        amount: faMoney(amount) + ' تومان',
        rows: rows
      };
    },

    /* Render into a target container (used by receipt.html + payment-result.html) */
    renderInto: function (container, data) {
      container = typeof container === 'string' ? $(container) : container;
      if (!container) return;
      var r = this.render(data);
      container.innerHTML =
        '<div class="receipt-header">' +
          '<div class="receipt-icon"><i class="bx ' + r.icon + '"></i></div>' +
          '<div class="receipt-title">' + r.title + '</div>' +
          '<div class="receipt-subtitle">' + r.amount + '</div>' +
        '</div>' +
        '<div class="receipt-rows">' +
          r.rows.map(function (row) {
            return '<div class="receipt-row"><span class="receipt-row-label">' + row.label +
                   '</span><span class="receipt-row-value">' + row.value + '</span></div>';
          }).join('') +
        '</div>';
    }
  };
  window.GoldReceipt = GoldReceipt;


  /* ═════════════════════════════════════════════════════════════════════════
     5. GoldUserMenu — slide-out user menu, injected into every gold page
     ═════════════════════════════════════════════════════════════════════════ */
  var USER_MENU_ID = 'gold-shared-user-menu';

  function buildUserMenuMarkup() {
    if ($(USER_MENU_ID)) return;
    var overlay = document.createElement('div');
    overlay.className = 'bottom-sheet-overlay';
    overlay.setAttribute('data-bs-overlay', USER_MENU_ID);
    var sheet = document.createElement('div');
    sheet.className = 'bottom-sheet bottom-sheet-user-menu';
    sheet.setAttribute('data-bs', USER_MENU_ID);

    var userName = GoldAuth.isLoggedIn() ? GoldAuth.fullName() : 'کاربر مهمان';
    var userPhone = GoldAuth.state && GoldAuth.state.phone
      ? toFa(GoldAuth.state.phone)
      : '—';

    sheet.innerHTML =
      '<div class="bottom-sheet-handle"></div>' +
      '<div class="user-menu-header">' +
        '<div class="user-menu-avatar"><i class="bx bx-user"></i></div>' +
        '<div class="user-menu-info">' +
          '<div class="user-menu-name">' + userName + '</div>' +
          '<div class="user-menu-phone">' + userPhone + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="user-menu-body">' +
        '<a class="user-menu-item" href="profile.html"><i class="bx bx-user-circle"></i><span>پروفایل کاربر</span></a>' +
        '<a class="user-menu-item" href="index.html#vaults"><i class="bx bx-coin-stack"></i><span>قلک‌های من</span></a>' +
        '<a class="user-menu-item" href="index.html#wallet"><i class="bx bx-wallet-alt"></i><span>کیف پول من</span></a>' +
        '<a class="user-menu-item" href="bank-account.html"><i class="bx bx-credit-card"></i><span>حساب‌های بانکی</span></a>' +
        '<a class="user-menu-item" href="profile.html#security"><i class="bx bx-shield-quarter"></i><span>امنیت و ورود</span></a>' +
        '<a class="user-menu-item" href="profile.html#notifications"><i class="bx bx-bell"></i><span>تنظیمات اطلاع‌رسانی</span></a>' +
        '<a class="user-menu-item" href="transactions.html"><i class="bx bx-receipt"></i><span>تراکنش‌ها و رسیدها</span></a>' +
        '<a class="user-menu-item" href="profile.html#support"><i class="bx bx-support"></i><span>پشتیبانی</span></a>' +
        '<div class="user-menu-divider"></div>' +
        '<a class="user-menu-item user-menu-item-danger" href="login.html" id="user-menu-logout"><i class="bx bx-log-out"></i><span>خروج از حساب</span></a>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);

    // Wire logout
    var logoutBtn = $('#user-menu-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (e) {
        GoldAuth.logout();
        // allow navigation to login.html
      });
    }
  }

  var GoldUserMenu = {
    open: function () {
      buildUserMenuMarkup();
      // Refresh user info each open (in case profile changed)
      var name = GoldAuth.isLoggedIn() ? GoldAuth.fullName() : 'کاربر مهمان';
      var phone = GoldAuth.state && GoldAuth.state.phone ? toFa(GoldAuth.state.phone) : '—';
      var nameEl = $('.user-menu-name');
      var phoneEl = $('.user-menu-phone');
      if (nameEl) nameEl.textContent = name;
      if (phoneEl) phoneEl.textContent = phone;
      window.GoldBottomSheet.open(USER_MENU_ID);
    },
    close: function () { window.GoldBottomSheet.close(USER_MENU_ID); },
    toggle: function () {
      var sheet = $('[data-bs="' + USER_MENU_ID + '"]');
      if (sheet && sheet.classList.contains('open')) this.close();
      else this.open();
    }
  };
  window.GoldUserMenu = GoldUserMenu;


  /* ═════════════════════════════════════════════════════════════════════════
     6. GoldNotifications — slide-out notifications center
     ═════════════════════════════════════════════════════════════════════════ */
  var NOTIF_ID = 'gold-shared-notifications';

  // Mock notification feed. In production these would come from a server.
  var MOCK_NOTIFS = [
    { id: 1, type: 'success', title: 'خرید طلا موفق بود', body: '۰.۲۵۰ گرم طلا به قلک اصلی اضافه شد.', time: '۵ دقیقه پیش', read: false },
    { id: 2, type: 'info',    title: 'نرخ طلای ۱۸ عیار به‌روزرسانی شد', body: 'نرخ جدید: ۱۷,۶۴۱,۰۰۰ تومان', time: '۲۰ دقیقه پیش', read: false },
    { id: 3, type: 'warning', title: 'درخواست برداشت در حال بررسی', body: 'مبلغ ۲,۰۰۰,۰۰۰ تومان در انتظار تأیید است.', time: '۱ ساعت پیش', read: true }
  ];

  function buildNotificationsMarkup() {
    if ($(NOTIF_ID)) return;
    var overlay = document.createElement('div');
    overlay.className = 'bottom-sheet-overlay';
    overlay.setAttribute('data-bs-overlay', NOTIF_ID);
    var sheet = document.createElement('div');
    sheet.className = 'bottom-sheet bottom-sheet-notifications';
    sheet.setAttribute('data-bs', NOTIF_ID);
    sheet.innerHTML =
      '<div class="bottom-sheet-handle"></div>' +
      '<div class="bottom-sheet-header">' +
        '<span class="bottom-sheet-title">اعلان‌ها</span>' +
        '<button class="user-menu-mark-all" id="notif-mark-all">علامت‌گذاری همه به‌عنوان خوانده‌شده</button>' +
      '</div>' +
      '<div class="bottom-sheet-body" id="notif-body"></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);

    var markAll = $('#notif-mark-all');
    if (markAll) {
      markAll.addEventListener('click', function () {
        MOCK_NOTIFS.forEach(function (n) { n.read = true; });
        renderNotifBody();
        updateNotifBadge();
        if (window.GoldToast) GoldToast.success('همه اعلان‌ها خوانده‌شدند');
      });
    }
  }

  function renderNotifBody() {
    var body = $('#notif-body');
    if (!body) return;
    if (!MOCK_NOTIFS.length) {
      body.innerHTML = '<div class="empty-state"><i class="bx bx-bell-off"></i><p>اعلان جدیدی وجود ندارد.</p></div>';
      return;
    }
    body.innerHTML = MOCK_NOTIFS.map(function (n) {
      var icon = n.type === 'success' ? 'bx-check-circle'
               : n.type === 'warning' ? 'bx-info-circle'
               : n.type === 'error'   ? 'bx-x-circle'
               : 'bx-bell';
      return '<div class="notif-item' + (n.read ? '' : ' notif-unread') + '">' +
               '<div class="notif-icon notif-icon-' + n.type + '"><i class="bx ' + icon + '"></i></div>' +
               '<div class="notif-body">' +
                 '<div class="notif-title">' + n.title + '</div>' +
                 '<div class="notif-text">' + n.body + '</div>' +
                 '<div class="notif-time">' + n.time + '</div>' +
               '</div>' +
             '</div>';
    }).join('');
  }

  function updateNotifBadge() {
    var unread = MOCK_NOTIFS.filter(function (n) { return !n.read; }).length;
    var badge = $('.gold-notif-badge');
    if (!badge) {
      // Create badge on every bell icon
      $$('.gold-header .icon-btn-gold').forEach(function (btn) {
        if (btn.querySelector('.bx-bell')) {
          var b = document.createElement('span');
          b.className = 'gold-notif-badge';
          btn.appendChild(b);
          btn.style.position = 'relative';
          badge = b;
        }
      });
    }
    if (badge) {
      badge.textContent = unread > 0 ? faNum(unread) : '';
      badge.style.display = unread > 0 ? '' : 'none';
    }
  }

  var GoldNotifications = {
    open: function () {
      buildNotificationsMarkup();
      renderNotifBody();
      window.GoldBottomSheet.open(NOTIF_ID);
    },
    close: function () { window.GoldBottomSheet.close(NOTIF_ID); },
    toggle: function () {
      var sheet = $('[data-bs="' + NOTIF_ID + '"]');
      if (sheet && sheet.classList.contains('open')) this.close();
      else this.open();
    },
    refreshBadge: updateNotifBadge
  };
  window.GoldNotifications = GoldNotifications;


  /* ═════════════════════════════════════════════════════════════════════════
     7. GoldVaultCreate — full-featured create-vault bottom-sheet
     ═════════════════════════════════════════════════════════════════════════ */
  var VAULT_CREATE_ID = 'gold-shared-vault-create';

  function buildVaultCreateMarkup() {
    if ($(VAULT_CREATE_ID)) return;
    var overlay = document.createElement('div');
    overlay.className = 'bottom-sheet-overlay';
    overlay.setAttribute('data-bs-overlay', VAULT_CREATE_ID);
    var sheet = document.createElement('div');
    sheet.className = 'bottom-sheet';
    sheet.setAttribute('data-bs', VAULT_CREATE_ID);
    sheet.innerHTML =
      '<div class="bottom-sheet-handle"></div>' +
      '<div class="bottom-sheet-header">' +
        '<span class="bottom-sheet-title">ساخت قلک جدید</span>' +
        '<button class="bottom-sheet-close" onclick="GoldBottomSheet.close(\'' + VAULT_CREATE_ID + '\')"><i class="bx bx-x"></i></button>' +
      '</div>' +
      '<div class="bottom-sheet-body">' +
        '<div class="field-wrap">' +
          '<label class="field-label" for="vc-name">عنوان قلک</label>' +
          '<input type="text" id="vc-name" class="field-input" placeholder="مثلاً: قلک سفر، قلک ماشین" required maxlength="30">' +
        '</div>' +

        '<div class="field-wrap" style="margin-top:16px;">' +
          '<label class="field-label">هدف قلک (اختیاری)</label>' +
          '<div class="vc-goal-type-row">' +
            '<label class="vc-goal-type"><input type="radio" name="vc-goal-type" value="none" checked><span>بدون هدف</span></label>' +
            '<label class="vc-goal-type"><input type="radio" name="vc-goal-type" value="gram"><span>بر حسب گرم</span></label>' +
            '<label class="vc-goal-type"><input type="radio" name="vc-goal-type" value="rial"><span>بر حسب ریال</span></label>' +
          '</div>' +
          '<input type="text" id="vc-goal-amount" class="field-input" placeholder="مقدار هدف" style="margin-top:8px; display:none;">' +
        '</div>' +

        '<div class="field-wrap" style="margin-top:16px;">' +
          '<label class="field-label">یادآوری دوره‌ای</label>' +
          '<select id="vc-reminder" class="field-input">' +
            '<option value="none">بدون یادآوری</option>' +
            '<option value="daily">روزانه</option>' +
            '<option value="weekly">هفتگی</option>' +
            '<option value="monthly">ماهانه</option>' +
          '</select>' +
        '</div>' +

        '<div id="vc-error" class="pre-invoice-error"></div>' +

        '<div class="bottom-sheet-actions">' +
          '<button class="btn-primary-gold ripple" id="vc-submit">ایجاد قلک</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);

    // Wire goal-type radio → show/hide amount input + update placeholder
    $$('input[name="vc-goal-type"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var amt = $('#vc-goal-amount');
        if (!amt) return;
        if (this.value === 'none') {
          amt.style.display = 'none';
        } else {
          amt.style.display = '';
          amt.placeholder = this.value === 'gram' ? 'مثلاً: ۵۰ گرم' : 'مثلاً: ۵۰,۰۰۰,۰۰۰ تومان';
        }
      });
    });

    // Wire submit
    var submit = $('#vc-submit');
    if (submit) {
      submit.addEventListener('click', function () {
        var name = ($('#vc-name').value || '').trim();
        var err = $('#vc-error');
        err.textContent = '';
        if (!name) {
          err.textContent = 'لطفاً عنوان قلک را وارد کنید.';
          return;
        }
        var goalType = 'none';
        $$('input[name="vc-goal-type"]').forEach(function (r) {
          if (r.checked) goalType = r.value;
        });
        var goalAmount = 0;
        if (goalType !== 'none') {
          goalAmount = parseFloat(toEn($('#vc-goal-amount').value || '').replace(/[^0-9.]/g, '')) || 0;
          if (goalAmount <= 0) {
            err.textContent = 'لطفاً مقدار هدف معتبر وارد کنید.';
            return;
          }
        }
        var reminder = $('#vc-reminder').value;
        var vault = GoldAuth.addVault({
          name: name,
          type: 'custom',
          goalType: goalType,
          goalAmount: goalAmount,
          reminder: reminder
        });
        window.GoldBottomSheet.close(VAULT_CREATE_ID);
        if (window.GoldToast) GoldToast.success('قلک «' + name + '» با موفقیت ایجاد شد');
        // Notify listeners
        document.dispatchEvent(new CustomEvent('gold:vault-created', { detail: vault }));
      });
    }
  }

  var GoldVaultCreate = {
    open: function () {
      buildVaultCreateMarkup();
      // Reset fields on each open
      var name = $('#vc-name'); if (name) name.value = '';
      var amt = $('#vc-goal-amount'); if (amt) { amt.value = ''; amt.style.display = 'none'; }
      var none = $('input[name="vc-goal-type"][value="none"]'); if (none) none.checked = true;
      var rem = $('#vc-reminder'); if (rem) rem.value = 'none';
      var err = $('#vc-error'); if (err) err.textContent = '';
      window.GoldBottomSheet.open(VAULT_CREATE_ID);
    },
    close: function () { window.GoldBottomSheet.close(VAULT_CREATE_ID); }
  };
  window.GoldVaultCreate = GoldVaultCreate;


  /* ═════════════════════════════════════════════════════════════════════════
     9. GoldTransactionDetail — open a detail bottom-sheet for a transaction
     ═════════════════════════════════════════════════════════════════════════ */
  var TX_DETAIL_ID = 'gold-shared-tx-detail';

  function buildTxDetailMarkup() {
    if ($(TX_DETAIL_ID)) return;
    var overlay = document.createElement('div');
    overlay.className = 'bottom-sheet-overlay';
    overlay.setAttribute('data-bs-overlay', TX_DETAIL_ID);
    var sheet = document.createElement('div');
    sheet.className = 'bottom-sheet';
    sheet.setAttribute('data-bs', TX_DETAIL_ID);
    sheet.innerHTML =
      '<div class="bottom-sheet-handle"></div>' +
      '<div class="bottom-sheet-header">' +
        '<span class="bottom-sheet-title" id="txd-title">جزئیات تراکنش</span>' +
        '<button class="bottom-sheet-close" onclick="GoldBottomSheet.close(\'' + TX_DETAIL_ID + '\')"><i class="bx bx-x"></i></button>' +
      '</div>' +
      '<div class="bottom-sheet-body" id="txd-body"></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
  }

  var GoldTransactionDetail = {
    /* data: { title, type, amount, unit, date, status, tracking, desc } */
    open: function (data) {
      data = data || {};
      buildTxDetailMarkup();

      var statusMap = {
        success: { text: 'موفق', cls: 'status-success', icon: 'bx-check-circle' },
        pending: { text: 'در انتظار', cls: 'status-pending', icon: 'bx-time-five' },
        failed:  { text: 'ناموفق', cls: 'status-failed', icon: 'bx-x-circle' },
        review:  { text: 'نیازمند بررسی', cls: 'status-review', icon: 'bx-search-alt-2' }
      };
      var st = statusMap[data.status] || statusMap.success;
      var typeIcon = data.type === 'sell' ? 'bx-minus' : (data.type === 'withdraw' ? 'bx-money' : 'bx-plus');
      var typeColor = data.type === 'sell' ? '#ef4444' : (data.type === 'withdraw' ? '#f59e0b' : '#22c55e');

      $('#txd-title').textContent = data.title || 'جزئیات تراکنش';
      $('#txd-body').innerHTML =
        '<div style="text-align:center; padding: 16px 0 24px; border-bottom: 1px dashed #e5e7eb; margin-bottom: 20px;">' +
          '<div style="width:64px;height:64px;border-radius:50%;background:' + typeColor + '15;color:' + typeColor + ';display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 12px;">' +
            '<i class="bx ' + typeIcon + '"></i>' +
          '</div>' +
          '<div style="font-size:28px;font-weight:900;color:' + typeColor + ';">' + (data.amount || '') + ' ' + (data.unit || '') + '</div>' +
          '<div style="margin-top:8px;"><span class="status-badge ' + st.cls + '"><i class="bx ' + st.icon + '"></i> ' + st.text + '</span></div>' +
        '</div>' +
        '<div class="pre-invoice-items">' +
          (data.date ? '<div class="pre-invoice-item"><span class="pre-invoice-label">تاریخ</span><span class="pre-invoice-value">' + data.date + '</span></div>' : '') +
          (data.tracking ? '<div class="pre-invoice-item"><span class="pre-invoice-label">شماره پیگیری</span><span class="pre-invoice-value">' + data.tracking + '</span></div>' : '') +
          (data.desc ? '<div class="pre-invoice-item"><span class="pre-invoice-label">توضیحات</span><span class="pre-invoice-value" style="font-size:12px;">' + data.desc + '</span></div>' : '') +
        '</div>' +
        '<div class="bottom-sheet-actions" style="margin-top:24px;">' +
          '<a href="transactions.html" class="btn-secondary-gold ripple" style="display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;">مشاهده همه تراکنش‌ها</a>' +
        '</div>';
      window.GoldBottomSheet.open(TX_DETAIL_ID);
    }
  };
  window.GoldTransactionDetail = GoldTransactionDetail;


  /* ═════════════════════════════════════════════════════════════════════════
     Auto-mount on every gold page: wire the bell button + profile nav link
     to the shared sheets, fix the broken profile tab href, and add the
     notification badge.
     ═════════════════════════════════════════════════════════════════════════ */
  function mountOnGoldPages() {
    // Only run on /gold/ pages (the receipt.html and payment-result.html
    // pages don't have a .gold-header).
    if (!$('.gold-header, .gold-bottom-nav')) return;

    // ── Inject desktop sidebar nav (only visible on ≥960px via CSS) ──
    buildDesktopNav();

    // ── Inject mobile burger button + slide-in side nav (visible on <960px) ──
    injectBurgerButton();
    buildMobileNav();

    // Wire bell buttons (every gold page has at least one)
    $$('.gold-header .icon-btn-gold, .gold-bottom-nav .icon-btn-gold, .gold-desktop-nav .icon-btn-gold').forEach(function (btn) {
      if (btn.querySelector('.bx-bell')) {
        // Replace the no-op onclick with our notifications opener
        btn.removeAttribute('onclick');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          GoldNotifications.open();
        });
        btn.style.position = 'relative';
        if (!btn.querySelector('.gold-notif-badge')) {
          var badge = document.createElement('span');
          badge.className = 'gold-notif-badge';
          btn.appendChild(badge);
        }
      }
    });

    // Fix the broken profile tab link in the bottom nav (href="#" everywhere)
    $$('.gold-bottom-nav a[href="#"]').forEach(function (a) {
      // Only fix if it looks like the profile tab (icon bx-user)
      if (a.querySelector('.bx-user')) {
        a.setAttribute('href', '#user-menu');
        a.addEventListener('click', function (e) {
          e.preventDefault();
          GoldUserMenu.open();
        });
      }
    });

    // Update notif badge
    updateNotifBadge();
  }

  /* ═════════════════════════════════════════════════════════════════════════
     8. GoldDesktopNav — fixed sidebar nav for desktop (≥960px)
     ═════════════════════════════════════════════════════════════════════════ */
  function buildDesktopNav() {
    if ($('.gold-desktop-nav')) return; // already built

    var nav = document.createElement('aside');
    nav.className = 'gold-desktop-nav';

    var links = [
      { href: 'index.html',         icon: 'bx-home',           label: 'داشبورد' },
      { href: 'buy.html',           icon: 'bx-plus-circle',    label: 'خرید طلا' },
      { href: 'sell.html',          icon: 'bx-minus-circle',   label: 'فروش طلا' },
      { href: 'deposit.html',       icon: 'bx-wallet-alt',     label: 'شارژ کیف پول' },
      { href: 'withdraw.html',      icon: 'bx-money',          label: 'برداشت وجه' },
      { href: 'physical.html',      icon: 'bx-package',        label: 'تحویل فیزیکی' },
      { href: 'vaults.html',        icon: 'bx-coin-stack',     label: 'قلک‌های من' },
      { href: 'transactions.html',  icon: 'bx-transfer-alt',   label: 'تراکنش‌ها' },
      { href: 'rates.html',         icon: 'bx-trending-up',    label: 'نرخ لحظه‌ای' },
      { href: 'missions.html',      icon: 'bx-target-lock',    label: 'مأموریت‌ها' },
      { href: 'invite.html',        icon: 'bx-user-plus',      label: 'دعوت دوستان' },
      { href: 'profile.html',       icon: 'bx-user',           label: 'پروفایل' }
    ];

    // Determine active link based on current page
    var path = window.location.pathname;
    var activeHref = '';
    links.forEach(function (l) {
      if (path.endsWith('/' + l.href)) activeHref = l.href;
    });

    var linksHtml = links.map(function (l) {
      var isActive = l.href === activeHref;
      return '<a href="' + l.href + '" class="gold-nav-link' + (isActive ? ' active' : '') + '">' +
               '<i class="bx ' + l.icon + ' gold-nav-link-icon"></i>' +
               '<span class="gold-nav-link-label">' + l.label + '</span>' +
             '</a>';
    }).join('');

    var userName = GoldAuth.isLoggedIn() ? GoldAuth.fullName() : 'کاربر مهمان';
    var userPhone = GoldAuth.state && GoldAuth.state.phone ? toFa(GoldAuth.state.phone) : '—';

    nav.innerHTML =
      '<div class="gold-nav-brand">' +
        '<img src="../icons/brand-mark.svg" alt="قلک طلا" class="gold-nav-brand-logo">' +
        '<span class="gold-nav-brand-text">قلک طلا</span>' +
      '</div>' +
      '<nav class="gold-nav-links">' + linksHtml + '</nav>' +
      '<div class="gold-nav-footer">' +
        '<a href="../index.htm" class="gold-nav-footer-btn gold-nav-site-link">' +
          '<i class="bx bx-store"></i>' +
          '<span>فروشگاه اردیبهشت</span>' +
        '</a>' +
        '<button class="gold-nav-footer-btn" id="gold-nav-notif-btn">' +
          '<i class="bx bx-bell"></i>' +
          '<span>اعلان‌ها</span>' +
        '</button>' +
        '<button class="gold-nav-footer-btn gold-nav-footer-user" id="gold-nav-user-btn">' +
          '<div class="gold-nav-avatar"><i class="bx bx-user"></i></div>' +
          '<div class="gold-nav-user-info">' +
            '<span class="gold-nav-user-name">' + userName + '</span>' +
            '<span class="gold-nav-user-phone">' + userPhone + '</span>' +
          '</div>' +
        '</button>' +
      '</div>';

    document.body.appendChild(nav);

    // Wire footer buttons
    var notifBtn = $('#gold-nav-notif-btn');
    if (notifBtn) {
      notifBtn.addEventListener('click', function () { GoldNotifications.open(); });
      // Add notif badge to this button too
      var b = document.createElement('span');
      b.className = 'gold-notif-badge';
      notifBtn.style.position = 'relative';
      notifBtn.appendChild(b);
    }
    var userBtn = $('#gold-nav-user-btn');
    if (userBtn) {
      userBtn.addEventListener('click', function () { GoldUserMenu.open(); });
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     9. GoldMobileNav — burger button + slide-in side panel for mobile (<960px)
        Mirrors the desktop gold-desktop-nav so mobile users can navigate to
        every gold page from any gold page (not just the 5 items in the
        gold-bottom-nav).
     ═════════════════════════════════════════════════════════════════════════ */
  function injectBurgerButton() {
    // Avoid double-injecting
    if ($('.gold-burger-btn')) return;
    var headerLeft = $('.gold-header .gold-header-left');
    if (!headerLeft) return;
    var btn = document.createElement('button');
    btn.className = 'gold-burger-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'باز کردن منوی اصلی');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = "<i class='bx bx-menu'></i>";
    // Prepend so it sits at the start of the left cluster (visually right in RTL)
    headerLeft.insertBefore(btn, headerLeft.firstChild);
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleMobileNav();
    });
  }

  function buildMobileNav() {
    if ($('.gold-mobile-nav')) return; // already built

    var links = [
      { href: 'index.html',         icon: 'bx-home',           label: 'داشبورد' },
      { href: 'buy.html',           icon: 'bx-plus-circle',    label: 'خرید طلا' },
      { href: 'sell.html',          icon: 'bx-minus-circle',   label: 'فروش طلا' },
      { href: 'deposit.html',       icon: 'bx-wallet-alt',     label: 'شارژ کیف پول' },
      { href: 'withdraw.html',      icon: 'bx-money',          label: 'برداشت وجه' },
      { href: 'physical.html',      icon: 'bx-package',        label: 'تحویل فیزیکی' },
      { href: 'vaults.html',        icon: 'bx-coin-stack',     label: 'قلک‌های من' },
      { href: 'transactions.html',  icon: 'bx-transfer-alt',   label: 'تراکنش‌ها' },
      { href: 'rates.html',         icon: 'bx-trending-up',    label: 'نرخ لحظه‌ای' },
      { href: 'missions.html',      icon: 'bx-target-lock',    label: 'مأموریت‌ها' },
      { href: 'invite.html',        icon: 'bx-user-plus',      label: 'دعوت دوستان' },
      { href: 'profile.html',       icon: 'bx-user',           label: 'پروفایل' }
    ];

    // Determine active link based on current page
    var path = window.location.pathname;
    var activeHref = '';
    links.forEach(function (l) {
      if (path.endsWith('/' + l.href)) activeHref = l.href;
    });

    var linksHtml = links.map(function (l) {
      var isActive = l.href === activeHref;
      return '<a href="' + l.href + '" class="gold-mobile-nav-link' + (isActive ? ' active' : '') + '">' +
               '<i class="bx ' + l.icon + '"></i>' +
               '<span>' + l.label + '</span>' +
             '</a>';
    }).join('');

    var userName = (window.GoldAuth && GoldAuth.isLoggedIn()) ? GoldAuth.fullName() : 'کاربر مهمان';
    var userPhone = (window.GoldAuth && GoldAuth.state && GoldAuth.state.phone) ? toFa(GoldAuth.state.phone) : '—';

    // Overlay
    var overlay = document.createElement('div');
    overlay.className = 'gold-mobile-nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    // Side panel
    var nav = document.createElement('aside');
    nav.className = 'gold-mobile-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'منوی اصلی موبایل');
    nav.innerHTML =
      '<div class="gold-mobile-nav-header">' +
        '<div class="gold-mobile-nav-brand">' +
          '<img src="../icons/brand-mark.svg" alt="قلک طلا">' +
          '<span class="gold-mobile-nav-brand-text">قلک طلا</span>' +
        '</div>' +
        '<button class="gold-mobile-nav-close" aria-label="بستن منو"><i class="bx bx-x"></i></button>' +
      '</div>' +
      '<div class="gold-mobile-nav-user">' +
        '<div class="gold-mobile-nav-user-avatar"><i class="bx bx-user"></i></div>' +
        '<div class="gold-mobile-nav-user-info">' +
          '<span class="gold-mobile-nav-user-name">' + userName + '</span>' +
          '<span class="gold-mobile-nav-user-phone">' + userPhone + '</span>' +
        '</div>' +
      '</div>' +
      '<nav class="gold-mobile-nav-list">' + linksHtml + '</nav>' +
      '<div class="gold-mobile-nav-footer">' +
        '<a href="../index.htm" class="gold-mobile-nav-store-link">' +
          '<i class="bx bx-store"></i><span>فروشگاه اردیبهشت</span>' +
        '</a>' +
        '<a href="login.html" class="gold-mobile-nav-logout" id="gold-mobile-nav-logout">' +
          '<i class="bx bx-log-out"></i><span>خروج از حساب</span>' +
        '</a>' +
      '</div>';
    document.body.appendChild(nav);

    // Wire close button + overlay click
    var closeBtn = nav.querySelector('.gold-mobile-nav-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeMobileNav);
    }
    overlay.addEventListener('click', closeMobileNav);

    // Wire logout
    var logoutBtn = $('#gold-mobile-nav-logout');
    if (logoutBtn && window.GoldAuth) {
      logoutBtn.addEventListener('click', function () {
        if (typeof GoldAuth.logout === 'function') GoldAuth.logout();
        // allow navigation to login.html
      });
    }

    // Escape key closes the panel
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        closeMobileNav();
      }
    });

    // Close on orientation change / resize to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 960 && nav.classList.contains('open')) {
        closeMobileNav();
      }
    });
  }

  function openMobileNav() {
    var nav = $('.gold-mobile-nav');
    var overlay = $('.gold-mobile-nav-overlay');
    var btn = $('.gold-burger-btn');
    if (nav) nav.classList.add('open');
    if (overlay) { overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); }
    if (btn) btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    var nav = $('.gold-mobile-nav');
    var overlay = $('.gold-mobile-nav-overlay');
    var btn = $('.gold-burger-btn');
    if (nav) nav.classList.remove('open');
    if (overlay) { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); }
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function toggleMobileNav() {
    var nav = $('.gold-mobile-nav');
    if (!nav) return;
    if (nav.classList.contains('open')) closeMobileNav(); else openMobileNav();
  }

  document.addEventListener('DOMContentLoaded', mountOnGoldPages);

})();
