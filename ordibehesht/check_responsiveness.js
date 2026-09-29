const { chromium } = require('playwright');
const path = require('path');

const pages = [
  'index.html',
  'buy.html',
  'sell.html',
  'deposit.html',
  'withdraw.html',
  'rates.html',
  'transactions.html',
  'bank-account.html',
  'physical.html',
  'missions.html',
  'invite.html',
  'profile.html'
];

const viewports = [
  { name: 'mobile-small', width: 360, height: 640 },
  { name: 'mobile-mid', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const issues = [];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    for (const p of pages) {
      const filePath = 'file:///' + path.resolve(__dirname, 'gold', p).replace(/\\/g, '/');
      try {
        await page.goto(filePath, { waitUntil: 'load' });
        await page.waitForTimeout(300);

        const overflowInfo = await page.evaluate(() => {
          const sw = document.documentElement.scrollWidth;
          const iw = window.innerWidth;
          if (sw <= iw + 2) return null;

          const bad = [];
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > iw + 2) {
              bad.push(`${el.tagName}.${el.className} (right: ${Math.round(r.right)})`);
            }
          });
          return { scrollWidth: sw, innerWidth: iw, badElements: bad.slice(0, 5) };
        });

        if (overflowInfo) {
          issues.push({ page: p, viewport: vp.name, overflowInfo });
        }
      } catch (err) {
        issues.push({ page: p, viewport: vp.name, error: err.message });
      }
    }
    await context.close();
  }

  await browser.close();
  console.log('DETAILED RESPONSIVENESS REPORT:');
  console.log(JSON.stringify(issues, null, 2));
})();
