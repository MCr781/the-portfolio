const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  
  // Desktop screenshots
  const dCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  // Main site index.htm - login modal
  const mainPage = await dCtx.newPage();
  await mainPage.goto('file:///' + path.resolve('index.htm').replace(/\\\\/g, '/'));
  await mainPage.waitForTimeout(1500);
  
  // Open login modal on main site
  await mainPage.evaluate(() => {
    const btn = document.querySelector('.user-btn');
    if (btn) btn.click();
  });
  await mainPage.waitForTimeout(1000);
  await mainPage.screenshot({ path: 'screenshots/main_login_modal.png' });
  
  // Close and open cart modal
  await mainPage.evaluate(() => {
    document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display='none'; m.style.opacity='0'; });
    document.body.classList.remove('modal-is-active');
  });
  await mainPage.waitForTimeout(300);
  await mainPage.evaluate(() => {
    const btn = document.querySelector('.cart-btn');
    if (btn) btn.click();
  });
  await mainPage.waitForTimeout(1000);
  await mainPage.screenshot({ path: 'screenshots/main_cart_modal.png' });

  // Close and open calc modal
  await mainPage.evaluate(() => {
    document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display='none'; m.style.opacity='0'; });
    document.body.classList.remove('modal-is-active');
  });
  await mainPage.waitForTimeout(300);
  await mainPage.evaluate(() => {
    const btn = document.querySelector('.calc-btn');
    if (btn) btn.click();
  });
  await mainPage.waitForTimeout(1000);
  await mainPage.screenshot({ path: 'screenshots/main_calc_modal.png' });
  
  // PWA buy.html - login modal
  const pwaPage = await dCtx.newPage();
  await pwaPage.goto('file:///' + path.resolve('gold/buy.html').replace(/\\\\/g, '/'));
  await pwaPage.waitForTimeout(1500);
  await pwaPage.evaluate(() => {
    const btn = document.querySelector('.user-btn');
    if (btn) btn.click();
  });
  await pwaPage.waitForTimeout(1000);
  await pwaPage.screenshot({ path: 'screenshots/pwa_login_modal.png' });

  // Close and open cart modal on PWA
  await pwaPage.evaluate(() => {
    document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display='none'; m.style.opacity='0'; });
    document.body.classList.remove('modal-is-active');
  });
  await pwaPage.waitForTimeout(300);
  await pwaPage.evaluate(() => {
    const btn = document.querySelector('.cart-btn');
    if (btn) btn.click();
  });
  await pwaPage.waitForTimeout(1000);
  await pwaPage.screenshot({ path: 'screenshots/pwa_cart_modal.png' });

  // Close and open calc modal on PWA
  await pwaPage.evaluate(() => {
    document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display='none'; m.style.opacity='0'; });
    document.body.classList.remove('modal-is-active');
  });
  await pwaPage.waitForTimeout(300);
  await pwaPage.evaluate(() => {
    const btn = document.querySelector('.calc-btn');
    if (btn) btn.click();
  });
  await pwaPage.waitForTimeout(1000);
  await pwaPage.screenshot({ path: 'screenshots/pwa_calc_modal.png' });

  // Mobile screenshots
  const mCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  
  // Mobile PWA index
  const mIndex = await mCtx.newPage();
  await mIndex.goto('file:///' + path.resolve('gold/index.html').replace(/\\\\/g, '/'));
  await mIndex.waitForTimeout(1500);
  await mIndex.screenshot({ path: 'screenshots/pwa_index_mobile.png', fullPage: true });
  
  // Mobile PWA buy
  const mBuy = await mCtx.newPage();
  await mBuy.goto('file:///' + path.resolve('gold/buy.html').replace(/\\\\/g, '/'));
  await mBuy.waitForTimeout(1500);
  await mBuy.screenshot({ path: 'screenshots/pwa_buy_mobile.png', fullPage: true });

  // Mobile PWA deposit
  const mDep = await mCtx.newPage();
  await mDep.goto('file:///' + path.resolve('gold/deposit.html').replace(/\\\\/g, '/'));
  await mDep.waitForTimeout(1500);
  await mDep.screenshot({ path: 'screenshots/pwa_deposit_mobile.png', fullPage: true });

  // Mobile PWA transactions
  const mTx = await mCtx.newPage();
  await mTx.goto('file:///' + path.resolve('gold/transactions.html').replace(/\\\\/g, '/'));
  await mTx.waitForTimeout(1500);
  await mTx.screenshot({ path: 'screenshots/pwa_transactions_mobile.png', fullPage: true });

  // Mobile PWA invite
  const mInv = await mCtx.newPage();
  await mInv.goto('file:///' + path.resolve('gold/invite.html').replace(/\\\\/g, '/'));
  await mInv.waitForTimeout(1500);
  await mInv.screenshot({ path: 'screenshots/pwa_invite_mobile.png', fullPage: true });

  // Mobile PWA offline
  const mOff = await mCtx.newPage();
  await mOff.goto('file:///' + path.resolve('offline.html').replace(/\\\\/g, '/'));
  await mOff.waitForTimeout(1500);
  await mOff.screenshot({ path: 'screenshots/pwa_offline_mobile.png', fullPage: true });

  // Mobile PWA rates
  const mRates = await mCtx.newPage();
  await mRates.goto('file:///' + path.resolve('gold/rates.html').replace(/\\\\/g, '/'));
  await mRates.waitForTimeout(1500);
  await mRates.screenshot({ path: 'screenshots/pwa_rates_mobile.png', fullPage: true });

  // Mobile PWA withdraw
  const mWith = await mCtx.newPage();
  await mWith.goto('file:///' + path.resolve('gold/withdraw.html').replace(/\\\\/g, '/'));
  await mWith.waitForTimeout(1500);
  await mWith.screenshot({ path: 'screenshots/pwa_withdraw_mobile.png', fullPage: true });

  await browser.close();
  console.log('All screenshots captured!');
})();
