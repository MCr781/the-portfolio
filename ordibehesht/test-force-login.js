const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('file:///' + path.resolve('gold/buy.html').replace(/\\/g, '/'));
  await page.waitForTimeout(500);
  
  const result = await page.evaluate(() => {
    try {
      const modal = document.getElementById('loginModal');
      modal.style.display = 'flex';
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      return "SUCCESS";
    } catch(e) {
      return e.toString();
    }
  });
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/buy_force_login.png', fullPage: true });

  await browser.close();
})();
