const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  
  await page.goto('file:///' + path.resolve('gold/withdraw.html').replace(/\\/g, '/'));
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'screenshots/withdraw_mobile.png', fullPage: true });

  await browser.close();
})();
