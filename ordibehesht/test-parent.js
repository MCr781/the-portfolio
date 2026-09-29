const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('file:///' + path.resolve('gold/buy.html').replace(/\\/g, '/'));
  await page.waitForTimeout(500);
  
  const result = await page.evaluate(() => {
    const el = document.getElementById('loginModal');
    let output = {};
    output.parent = el.parentElement.tagName + '.' + el.parentElement.className;
    output.parentDisplay = window.getComputedStyle(el.parentElement).display;
    return output;
  });
  console.log(result);
  await browser.close();
})();
