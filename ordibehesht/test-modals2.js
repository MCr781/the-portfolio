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
  
  const isVisible = await page.evaluate(() => {
    const m = document.getElementById('loginModal');
    return m ? window.getComputedStyle(m).display : 'null';
  });
  console.log('Login Modal Display:', isVisible);
  
  // Try calc button
  await page.evaluate(() => {
    const btn = document.querySelector('.calc-btn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000);
  
  const isCalcVisible = await page.evaluate(() => {
    const m = document.getElementById('calcModal');
    return m ? window.getComputedStyle(m).display : 'null';
  });
  console.log('Calc Modal Display:', isCalcVisible);

  await browser.close();
})();
