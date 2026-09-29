const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p1 = await desktop.newPage();
  await p1.goto('file:///' + path.resolve('gold/buy.html').replace(/\\/g, '/'));
  await p1.waitForTimeout(500);
  await p1.screenshot({ path: 'screenshots/buy_desktop2.png', fullPage: true });

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await mobile.newPage();
  await p2.goto('file:///' + path.resolve('gold/buy.html').replace(/\\/g, '/'));
  await p2.waitForTimeout(500);
  await p2.screenshot({ path: 'screenshots/buy_mobile2.png', fullPage: true });

  await browser.close();
})();
