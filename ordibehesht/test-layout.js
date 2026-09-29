const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('file:///' + path.resolve('offline.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1000);
  
  const layout = await page.evaluate(() => {
    const container = document.querySelector('.offline-container').getBoundingClientRect();
    const card = document.querySelector('.offline-card').getBoundingClientRect();
    const body = document.body.getBoundingClientRect();
    return {
      body: { w: body.width, h: body.height },
      container: { x: container.x, w: container.width, h: container.height },
      card: { x: card.x, w: card.width, h: card.height },
      containerDisplay: window.getComputedStyle(document.querySelector('.offline-container')).display,
      containerAlign: window.getComputedStyle(document.querySelector('.offline-container')).alignItems
    };
  });
  console.log('Layout:', JSON.stringify(layout, null, 2));

  await browser.close();
})();
