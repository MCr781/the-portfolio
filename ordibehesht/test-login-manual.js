const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('file:///' + path.resolve('gold/buy.html').replace(/\\/g, '/'));
  await page.waitForTimeout(500);
  
  const result = await page.evaluate(() => {
    try {
      document.body.classList.add('modal-is-active');
      const modal = document.getElementById('loginModal');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      return "SUCCESS";
    } catch(e) {
      return e.toString();
    }
  });
  console.log(result);
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/buy_manual_login.png', fullPage: true });

  await browser.close();
})();
