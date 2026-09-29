const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('file:///' + path.resolve('offline.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'screenshots/offline_desktop_fix.png' });

  // And mobile
  const mContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mPage = await mContext.newPage();
  await mPage.goto('file:///' + path.resolve('offline.html').replace(/\\/g, '/'));
  await mPage.waitForTimeout(1000);
  await mPage.screenshot({ path: 'screenshots/offline_mobile_fix.png' });

  await browser.close();
})();
