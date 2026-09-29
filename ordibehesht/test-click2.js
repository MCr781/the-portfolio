const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('file:///' + path.resolve('gold/buy.html').replace(/\\/g, '/'));
  await page.waitForTimeout(500);
  
  await page.evaluate(() => {
    const btn = document.querySelector('.user-btn');
    if (btn) btn.click();
  });
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/buy_after_login_click2.png', fullPage: true });

  await browser.close();
})();
