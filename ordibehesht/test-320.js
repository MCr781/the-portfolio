const { chromium } = require('playwright');
const path = require('path');

const pages = [
  'index.html', 'buy.html', 'deposit.html', 'transactions.html'
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  for (const p of pages) {
    const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await context.newPage();
    const filePath = 'file:///' + path.resolve(__dirname, 'gold', p).replace(/\\/g, '/');
    
    await page.goto(filePath, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    
    const issues = await page.evaluate(() => {
      const container = document.querySelector('.gold-content');
      if (!container) return [];
      const cw = container.getBoundingClientRect().width;
      const cl = container.getBoundingClientRect().left;
      const cr = container.getBoundingClientRect().right;
      
      const bad = [];
      container.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > cw + 2) {
          bad.push({ tag: el.tagName, class: el.className, width: r.width, containerWidth: cw });
        }
        // check if sticking out of container (with 2px tolerance)
        // Note: RTL page, so we check if it goes past the container boundaries
        if (r.left < cl - 2 || r.right > cr + 2) {
            bad.push({ tag: el.tagName, class: el.className, left: r.left, right: r.right, cLeft: cl, cRight: cr, reason: 'sticks out of .gold-content' });
        }
      });
      return bad;
    });
    console.log('PAGE:', p, issues.length > 0 ? issues.slice(0, 5) : 'OK');
    await context.close();
  }
  await browser.close();
})();
