const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('file:///' + path.resolve('gold/index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => {
    console.log("Checking user-btn:", document.querySelector('.user-btn').outerHTML);
    console.log("Checking loginModal:", document.querySelector('#loginModal').outerHTML.substring(0, 100));
    const btn = document.querySelector('.user-btn');
    btn.click();
  });
  await page.waitForTimeout(500);
  
  await page.evaluate(() => {
    console.log("LoginModal display:", document.querySelector('#loginModal').style.display);
    console.log("LoginModal opacity:", document.querySelector('#loginModal').style.opacity);
  });

  await browser.close();
})();
