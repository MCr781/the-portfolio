const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const pagesToTest = [
    { name: 'auth', url: 'http://localhost:3000/gold/auth.html' },
    { name: 'auth-register', url: 'http://localhost:3000/gold/auth-register.html' },
    { name: 'bank-account', url: 'http://localhost:3000/gold/bank-account.html' },
    { name: 'invite', url: 'http://localhost:3000/gold/invite.html' }
  ];

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844, isMobile: true }
  ];

  for (const pageInfo of pagesToTest) {
    for (const vp of viewports) {
      console.log(`Navigating to ${pageInfo.url} on ${vp.name}...`);
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
      await page.screenshot({ path: `screenshots/${pageInfo.name}_${vp.name}.png`, fullPage: true });
      console.log(`Saved screenshot: screenshots/${pageInfo.name}_${vp.name}.png`);
      await page.close();
    }
  }

  await browser.close();
  console.log('All screenshots taken successfully.');
})();
