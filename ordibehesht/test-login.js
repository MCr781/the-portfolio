const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('file:///' + path.resolve('gold/buy.html').replace(/\\/g, '/'));
  await page.waitForTimeout(500);
  
  const result = await page.evaluate(() => {
    let output = {};
    output.hasOverlay = document.getElementById('loginModal') !== null;
    output.classList = document.getElementById('loginModal') ? document.getElementById('loginModal').className : null;
    
    // Test the event listener
    const btn = document.querySelector('.user-btn');
    output.btnHtml = btn ? btn.outerHTML : null;
    
    return output;
  });
  console.log(result);

  await browser.close();
})();
