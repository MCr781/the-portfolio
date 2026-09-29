const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('file:///' + path.resolve('gold/buy.html').replace(/\\/g, '/'));
  await page.waitForTimeout(500);
  
  await page.evaluate(() => {
    const btn = document.querySelector('.calc-btn');
    if (btn) btn.click();
  });
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/buy_after_calc_click.png', fullPage: true });

  await browser.close();
})();
