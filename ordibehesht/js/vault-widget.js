/* ════════════════════════════════════════════════════════════════════════════
   vault-widget.js — Item 13: Product page vault integration
   ────────────────────────────────────────────────────────────────────────────
   Loaded on every product detail page (product/*.html). Injects a vault-balance
   widget above the product price showing:
     • User's gram + rial vault balance (from GoldAuth)
     • A coverage bar showing how much of the product price the vault covers
     • A "Buy with Gold Vault" button

   Behavior:
   • If user is logged in (GoldAuth.isLoggedIn) AND has a non-zero vault balance:
     - Inject the widget
     - Replace the lead-form modal's open behavior with a real "buy with vault"
       modal that shows the breakdown (vault covers X, user pays Y from wallet/gateway)
   • If user is NOT logged in OR has zero balance:
     - Don't inject the widget (keep the existing lead-form behavior)

   No backend; all data is mocked from GoldAuth (sessionStorage).
   ════════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // Don't run if GoldAuth isn't loaded (e.g. on a non-gold page that doesn't
  // load gold-chrome.js).
  if (!window.GoldAuth) return;

  // Only run on product detail pages (must have #pdp-price and #open-piggy-bank-modal).
  var priceEl = document.getElementById('pdp-price');
  var buyBtn = document.getElementById('open-piggy-bank-modal');
  if (!priceEl || !buyBtn) return;

  // ── Helpers ──
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

  // ── Extract numeric price from the price element ──
  // The element contains Persian digits + "تومان" — extract the digits.
  function extractPrice() {
    var txt = priceEl.textContent || '';
    var en = toEn(txt).replace(/[^0-9]/g, '');
    return parseInt(en) || 0;
  }

  // ── Get user's total vault balance (gram + rial equivalent) ──
  function getVaultTotals() {
    var vaults = GoldAuth.getVaults();
    var totalGram = 0;
    var totalRial = 0;
    vaults.forEach(function (v) {
      totalGram += v.gramBalance || 0;
      totalRial += v.rialBalance || 0;
    });
    // Convert gram balance to rial equivalent at the current rate (mocked at 17,641,000)
    var RATE = 17641000;
    var gramInRial = totalGram * RATE;
    var totalRialAvailable = totalRial + gramInRial;
    return {
      gram: totalGram,
      rial: totalRial,
      gramInRial: gramInRial,
      totalRialAvailable: totalRialAvailable,
      rate: RATE
    };
  }

  var productPrice = extractPrice();

  // ── Always inject the "regular buy" button next to the vault buy button ──
  // This way both buttons are visible to all users (logged in or not).
  var pdpActions = buyBtn.parentNode; // .pdp-actions
  if (pdpActions && !pdpActions.querySelector('.pdp-regular-buy')) {
    var regularBtn = document.createElement('a');
    regularBtn.className = 'button pdp-regular-buy';
    regularBtn.href = '../index.htm'; // main site checkout / contact
    regularBtn.innerHTML = '<i class="bx bx-cart-alt"></i> خرید عادی';
    regularBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;background:white;border:1px solid var(--gold-500);color:var(--gold-700);padding:10px 18px;border-radius:12px;font-weight:700;text-decoration:none;font-family:inherit;font-size:14px;transition:background 0.15s;';
    regularBtn.addEventListener('mouseenter', function () {
      regularBtn.style.background = 'var(--gold-50, #fdf8e8)';
    });
    regularBtn.addEventListener('mouseleave', function () {
      regularBtn.style.background = 'white';
    });
    // Insert the regular buy button right after the vault buy button
    if (buyBtn.nextSibling) {
      pdpActions.insertBefore(regularBtn, buyBtn.nextSibling);
    } else {
      pdpActions.appendChild(regularBtn);
    }
  }

  // ── Add a fancy info tooltip next to the vault buy button ──
  // Explains how "buy with gholak" works.
  if (!pdpActions.querySelector('.pdp-vault-tooltip-trigger')) {
    var tooltipTrigger = document.createElement('button');
    tooltipTrigger.className = 'pdp-vault-tooltip-trigger';
    tooltipTrigger.type = 'button';
    tooltipTrigger.setAttribute('aria-label', 'راهنمای خرید با قلک');
    tooltipTrigger.innerHTML = '<i class="bx bx-info-circle"></i>';
    tooltipTrigger.style.cssText = 'width:36px;height:36px;border-radius:50%;border:1px solid var(--gold-300,#eccf72);background:var(--gold-50,#fdf8e8);color:var(--gold-700,#9a7d25);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;transition:all 0.2s;position:relative;';
    // Insert after the vault buy button (before regular buy)
    if (buyBtn.nextSibling) {
      pdpActions.insertBefore(tooltipTrigger, buyBtn.nextSibling);
    } else {
      pdpActions.appendChild(tooltipTrigger);
    }

    // Build the fancy tooltip
    var tooltip = document.createElement('div');
    tooltip.className = 'pdp-vault-tooltip';
    tooltip.innerHTML =
      '<div class="pdp-vault-tooltip-arrow"></div>' +
      '<div class="pdp-vault-tooltip-header">' +
        '<i class="bx bx-coin-stack pdp-vault-tooltip-header-icon"></i>' +
        '<div>' +
          '<div class="pdp-vault-tooltip-title">خرید با قلک طلا</div>' +
          '<div class="pdp-vault-tooltip-subtitle">چگونه کار می‌کند؟</div>' +
        '</div>' +
      '</div>' +
      '<div class="pdp-vault-tooltip-body">' +
        '<div class="pdp-vault-tooltip-step">' +
          '<div class="pdp-vault-tooltip-step-num">۱</div>' +
          '<div>موجودی قلک شما (طلا + ریال) محاسبه می‌شود.</div>' +
        '</div>' +
        '<div class="pdp-vault-tooltip-step">' +
          '<div class="pdp-vault-tooltip-step-num">۲</div>' +
          '<div>درصد پوشش هزینه محصول توسط قلک نمایش داده می‌شود.</div>' +
        '</div>' +
        '<div class="pdp-vault-tooltip-step">' +
          '<div class="pdp-vault-tooltip-step-num">۳</div>' +
          '<div>مابقی مبلغ از درگاه بانکی پرداخت می‌شود.</div>' +
        '</div>' +
        '<div class="pdp-vault-tooltip-step">' +
          '<div class="pdp-vault-tooltip-step-num">۴</div>' +
          '<div>محصول پس از تأیید، برای شما ارسال می‌گردد.</div>' +
        '</div>' +
      '</div>' +
      '<div class="pdp-vault-tooltip-footer">' +
        '<i class="bx bx-shield-check"></i>' +
        '<span>تراکنش امن و شفاف — کسر آنی از قلک</span>' +
      '</div>';
    document.body.appendChild(tooltip);

    // Position + show/hide
    function positionTooltip() {
      var rect = tooltipTrigger.getBoundingClientRect();
      tooltip.style.top = (rect.bottom + 8) + 'px';
      tooltip.style.left = (rect.left + rect.width / 2) + 'px';
      tooltip.style.transform = 'translateX(-50%)';
    }
    tooltipTrigger.addEventListener('mouseenter', function () {
      positionTooltip();
      tooltip.classList.add('open');
    });
    tooltipTrigger.addEventListener('mouseleave', function () {
      tooltip.classList.remove('open');
    });
    tooltipTrigger.addEventListener('click', function (e) {
      e.preventDefault();
      positionTooltip();
      tooltip.classList.toggle('open');
    });
  }

  // ── Determine vault state ──
  var isLoggedIn = GoldAuth.isLoggedIn();
  var vault = isLoggedIn ? getVaultTotals() : { gram: 0, rial: 0, totalRialAvailable: 0, rate: 17641000 };
  var hasBalance = isLoggedIn && (vault.gram > 0 || vault.rial > 0);

  // ── Compute coverage for the fill-up meter (always, even if not logged in) ──
  var meterPct = 0;
  if (isLoggedIn && hasBalance && productPrice > 0) {
    meterPct = Math.min(100, Math.round((vault.totalRialAvailable / productPrice) * 100));
  }

  // ── Add fill-up meter to the buy button ──
  // The meter is a progress bar at the bottom of the button that fills
  // based on how much of the product price the vault can cover.
  buyBtn.classList.add('pdp-vault-buy-btn');
  buyBtn.style.position = 'relative';
  buyBtn.style.overflow = 'hidden';

  if (!buyBtn.querySelector('.pdp-vault-meter')) {
    var meter = document.createElement('div');
    meter.className = 'pdp-vault-meter';
    meter.innerHTML = '<div class="pdp-vault-meter-fill" style="width:' + meterPct + '%;"></div>';
    buyBtn.appendChild(meter);
  }

  if (!isLoggedIn || !hasBalance || productPrice <= 0) {
    // User not logged in OR has zero balance
    if (!isLoggedIn) {
      buyBtn.innerHTML = '<span class="pdp-vault-btn-label">خرید با قلک <small>(نیاز به ورود)</small></span><div class="pdp-vault-meter"><div class="pdp-vault-meter-fill" style="width:0%;"></div></div>';
      buyBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        window.location.href = '../gold/login.html';
      }, true);
    } else {
      buyBtn.innerHTML = '<span class="pdp-vault-btn-label">خرید با قلک <small>(موجودی کافی نیست)</small></span><div class="pdp-vault-meter"><div class="pdp-vault-meter-fill" style="width:0%;"></div></div>';
      buyBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        window.location.href = '../gold/buy.html';
      }, true);
    }
    return;
  }

  // ── Logged in with balance: build + inject the vault widget ──
  var coveragePct = meterPct;
  var fullyCovered = vault.totalRialAvailable >= productPrice;

  var widget = document.createElement('div');
  widget.className = 'vault-balance-widget';
  widget.innerHTML =
    '<div class="vault-widget-header">' +
      '<i class="bx bx-coin-stack vault-widget-icon"></i>' +
      '<div>' +
        '<div class="vault-widget-title">موجودی قلک شما</div>' +
        '<div class="vault-widget-subtitle">برای خرید این محصول قابل استفاده است</div>' +
      '</div>' +
    '</div>' +
    '<div class="vault-widget-balances">' +
      '<div class="vault-widget-balance">' +
        '<div class="vault-widget-balance-label">موجودی طلا</div>' +
        '<div class="vault-widget-balance-value">' + toFa(vault.gram.toFixed(3)) + ' <small>گرم</small></div>' +
      '</div>' +
      '<div class="vault-widget-balance">' +
        '<div class="vault-widget-balance-label">موجودی ریالی</div>' +
        '<div class="vault-widget-balance-value">' + faMoney(vault.rial) + ' <small>تومان</small></div>' +
      '</div>' +
    '</div>' +
    '<div class="vault-widget-coverage">' +
      '<div class="vault-widget-coverage-row">' +
        '<span class="vault-widget-coverage-label">پوشش هزینه محصول توسط قلک</span>' +
        '<span class="vault-widget-coverage-pct' + (fullyCovered ? ' full' : '') + '">' + toFa(coveragePct) + '٪</span>' +
      '</div>' +
      '<div class="vault-widget-coverage-bar">' +
        '<div class="vault-widget-coverage-bar-fill" style="width: ' + coveragePct + '%;"></div>' +
      '</div>' +
      '<div class="vault-widget-coverage-text">' +
        (fullyCovered
          ? 'قلک شما تمام هزینه این محصول را پوشش می‌دهد. می‌توانید کامل آن را با قلک بخرید.'
          : 'قلک شما ' + faMoney(vault.totalRialAvailable) + ' تومان از ' + faMoney(productPrice) + ' تومان قیمت محصول را پوشش می‌دهد. مابقی باید از درگاه پرداخت پرداخت شود.') +
      '</div>' +
    '</div>';

  // Insert the widget BEFORE the price element
  priceEl.parentNode.insertBefore(widget, priceEl);

  // Update the vault buy button's label + meter to show coverage %
  buyBtn.innerHTML = '<span class="pdp-vault-btn-label">خرید با قلک <small>(' + toFa(coveragePct) + '٪ پوشش)</small></span><div class="pdp-vault-meter"><div class="pdp-vault-meter-fill" style="width:' + coveragePct + '%;"></div></div>';

  // ── Replace the buy button's behavior: open a real "buy with vault" modal ──
  // The original button opens #piggyBankLeadModal (a lead-capture form).
  // We intercept the click, prevent the lead form, and instead open a
  // proper breakdown modal.
  buyBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    openBuyWithVaultModal();
  }, true); // capture phase to beat the original handler

  function openBuyWithVaultModal() {
    // Build the modal if it doesn't exist
    var modalId = 'vault-buy-modal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var amountFromVault = Math.min(vault.totalRialAvailable, productPrice);
    var amountFromGateway = productPrice - amountFromVault;
    var gramToDeduct = 0;
    var rialToDeduct = 0;

    // Deduct from rial wallet first, then from gram balance
    if (vault.rial >= amountFromVault) {
      rialToDeduct = amountFromVault;
    } else {
      rialToDeduct = vault.rial;
      var remaining = amountFromVault - vault.rial;
      gramToDeduct = remaining / vault.rate;
    }

    var modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'vault-buy-modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML =
      '<div class="vault-buy-modal" style="background:white;border-radius:16px;max-width:420px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
          '<h3 style="font-size:18px;font-weight:900;margin:0;">خرید با قلک طلا</h3>' +
          '<button type="button" id="vault-buy-close" style="background:none;border:none;font-size:24px;cursor:pointer;color:#6b7280;line-height:1;">×</button>' +
        '</div>' +
        '<div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:16px;">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;">' +
            '<span style="color:#6b7280;">قیمت محصول</span>' +
            '<span style="font-weight:700;">' + faMoney(productPrice) + ' تومان</span>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;">' +
            '<span style="color:#6b7280;">پرداخت از قلک طلا</span>' +
            '<span style="font-weight:700;color:#10b981;">- ' + faMoney(amountFromVault) + ' تومان</span>' +
          '</div>' +
          (gramToDeduct > 0 ? '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:12px;color:#6b7280;"><span>⁙ معادل ' + toFa(gramToDeduct.toFixed(3)) + ' گرم طلا</span><span></span></div>' : '') +
          (rialToDeduct > 0 ? '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:12px;color:#6b7280;"><span>⁙ معادل ' + faMoney(rialToDeduct) + ' تومان ریالی</span><span></span></div>' : '') +
          (amountFromGateway > 0
            ? '<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px dashed #e5e7eb;font-size:13px;"><span style="color:#6b7280;">پرداخت از درگاه بانکی</span><span style="font-weight:700;color:#ef4444;">' + faMoney(amountFromGateway) + ' تومان</span></div>'
            : '<div style="text-align:center;padding:8px;background:#ecfdf5;border-radius:8px;font-size:12px;color:#065f46;font-weight:700;">✓ تمام هزینه توسط قلک پوشش داده شد</div>') +
        '</div>' +
        '<div style="background:#fefbf7;border:1px solid var(--gold-200, #f9edc5);border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;color:var(--gold-900, #5f4c16);line-height:1.6;">' +
          '<i class="bx bx-info-circle" style="margin-left:4px;"></i>' +
          'پس از تأیید، مبلغ ' + faMoney(amountFromVault) + ' تومان از قلک شما کسر و سفارش ثبت می‌شود.' +
        '</div>' +
        '<button type="button" id="vault-buy-confirm" style="width:100%;padding:14px;border-radius:12px;background:linear-gradient(135deg,var(--gold-400,#d4af37),var(--gold-600,#b8962e));color:white;font-weight:900;border:none;cursor:pointer;font-size:14px;">' +
          (amountFromGateway > 0 ? 'تأیید و ادامه پرداخت' : 'تأیید و خرید با قلک') +
        '</button>' +
      '</div>';

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Wire close
    var closeBtn = modal.querySelector('#vault-buy-close');
    function close() {
      modal.remove();
      document.body.style.overflow = '';
    }
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });

    // Wire confirm
    var confirmBtn = modal.querySelector('#vault-buy-confirm');
    confirmBtn.addEventListener('click', function () {
      close();
      if (window.GoldToast) {
        GoldToast.success('سفارش با قلک طلا ثبت شد. در حال انتقال به درگاه...');
      }
      // In production: redirect to gateway for amountFromGateway, or straight
      // to order-confirmation if amountFromGateway === 0. For demo, redirect
      // to the gold app's payment-result page.
      setTimeout(function () {
        window.location.href = '../gold/payment-result.html?status=success' +
          '&amount=' + productPrice +
          '&tracking=' + Math.floor(Math.random() * 9000000 + 1000000);
      }, 1200);
    });
  }

})();
