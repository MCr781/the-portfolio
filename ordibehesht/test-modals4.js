const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('file:///' + path.resolve('gold/buy.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1000);
  
  // Try to click login button
  await page.evaluate(() => {
    const btn = document.querySelector('.user-btn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000);
  
  const isVisible = await page.evaluate(() => {
    const m = document.getElementById('loginModal');
    return m ? window.getComputedStyle(m).display : 'null';
  });
  console.log('buy.html Login Modal Display:', isVisible);

  await browser.close();
})();
