const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('file:///' + path.resolve('gold/index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1000);
  
  // Try to click login button
  await page.evaluate(() => {
    const btn = document.querySelector('.user-btn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/login_modal_test.png', fullPage: true });

  await browser.close();
})();
