const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file:///' + path.resolve(__dirname, 'gold/index.html').replace(/\\/g, '/'));

  const overflowingElements = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const result = [];
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 5) {
        result.push({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          right: rect.right,
          width: rect.width
        });
      }
    });
    return result;
  });

  console.log('OVERFLOWING ELEMENTS:', JSON.stringify(overflowingElements.slice(0, 15), null, 2));
  await browser.close();
})();
