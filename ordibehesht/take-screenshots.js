const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function takeScreenshots() {
  const outDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  const browser = await chromium.launch();
  
  const pages = [
    { name: 'index', url: 'http://localhost:3000/gold/index.html' },
    { name: 'buy', url: 'http://localhost:3000/gold/buy.html' },
    { name: 'sell', url: 'http://localhost:3000/gold/sell.html' }
  ];

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ];

  for (const p of pages) {
    for (const v of viewports) {
      const page = await browser.newPage({
        viewport: { width: v.width, height: v.height }
      });
      console.log(`Navigating to ${p.url} on ${v.name}...`);
      await page.goto(p.url, { waitUntil: 'networkidle' });
      const screenshotPath = path.join(outDir, `${p.name}_${v.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved screenshot: ${screenshotPath}`);
      await page.close();
    }
  }

  await browser.close();
  console.log('All screenshots taken successfully.');
}

takeScreenshots().catch(console.error);
