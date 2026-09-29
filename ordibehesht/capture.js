const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const pages = [
    'index.html',
    'buy.html',
    'sell.html',
    'withdraw.html',
    'physical.html',
    'bank-account.html',
    'payment-result.html',
    'profile.html'
  ];

  const dir = 'C:/Users/Mohammad Mahdi/.gemini/antigravity-cli/brain/1d52ad5e-4f76-402a-9455-a8af06b1fa60';

  for (const p of pages) {
    console.log(`Taking screenshot of ${p}...`);
    try {
        const url = `file://E:/Work/Tala/gold/${p}`;
        await page.goto(url);
        await page.waitForTimeout(1000); // let animations finish
        await page.screenshot({ path: path.join(dir, `${p.replace('.html', '')}_desktop.png`), fullPage: true });
    } catch(e) {
        console.error(`Error on ${p}: ${e}`);
    }
  }

  await browser.close();
  console.log('All screenshots taken!');
})();
