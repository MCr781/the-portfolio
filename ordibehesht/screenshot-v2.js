const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();

  // Mobile screenshots
  const mCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const pages = [
    ['gold/index.html', 'v2_index_mobile'],
    ['gold/buy.html', 'v2_buy_mobile'],
    ['gold/deposit.html', 'v2_deposit_mobile'],
    ['gold/withdraw.html', 'v2_withdraw_mobile'],
    ['gold/transactions.html', 'v2_transactions_mobile'],
    ['gold/invite.html', 'v2_invite_mobile'],
    ['gold/rates.html', 'v2_rates_mobile'],
    ['offline.html', 'v2_offline_mobile'],
  ];
  for (const [file, name] of pages) {
    const p = await mCtx.newPage();
    await p.goto('file:///' + path.resolve(file).replace(/\\\\/g, '/'));
    await p.waitForTimeout(1200);
    await p.screenshot({ path: 'screenshots/' + name + '.png', fullPage: true });
    await p.close();
  }

  // Desktop screenshots
  const dCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dPages = [
    ['gold/buy.html', 'v2_buy_desktop'],
    ['gold/deposit.html', 'v2_deposit_desktop'],
    ['gold/bank-account.html', 'v2_bankaccount_desktop'],
    ['gold/withdraw.html', 'v2_withdraw_desktop'],
    ['offline.html', 'v2_offline_desktop'],
  ];
  for (const [file, name] of dPages) {
    const p = await dCtx.newPage();
    await p.goto('file:///' + path.resolve(file).replace(/\\\\/g, '/'));
    await p.waitForTimeout(1200);
    await p.screenshot({ path: 'screenshots/' + name + '.png', fullPage: true });
    await p.close();
  }

  // Modal comparison: PWA cart modal
  const mPage = await dCtx.newPage();
  await mPage.goto('file:///' + path.resolve('gold/buy.html').replace(/\\\\/g, '/'));
  await mPage.waitForTimeout(1200);
  await mPage.evaluate(() => {
    const btn = document.querySelector('.cart-btn');
    if (btn) btn.click();
  });
  await mPage.waitForTimeout(800);
  await mPage.screenshot({ path: 'screenshots/v2_pwa_cart_modal.png' });

  // PWA calc modal
  await mPage.evaluate(() => {
    document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display='none'; m.style.opacity='0'; });
    document.body.classList.remove('modal-is-active');
  });
  await mPage.waitForTimeout(300);
  await mPage.evaluate(() => {
    const btn = document.querySelector('.calc-btn');
    if (btn) btn.click();
  });
  await mPage.waitForTimeout(800);
  await mPage.screenshot({ path: 'screenshots/v2_pwa_calc_modal.png' });

  await browser.close();
  console.log('All v2 screenshots done!');
})();
