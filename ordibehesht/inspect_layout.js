const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('file:///' + path.resolve(__dirname, 'gold/buy.html').replace(/\\/g, '/'));
  await page.evaluate(() => {
    if (window.GoldBottomSheet) window.GoldBottomSheet.open('pre-invoice');
  });
  await page.waitForTimeout(500);

  const info = await page.evaluate(() => {
    const sheet = document.querySelector('[data-bs="pre-invoice"]');
    const header = document.querySelector('[data-bs="pre-invoice"] .bottom-sheet-header');
    const body = document.querySelector('[data-bs="pre-invoice"] .bottom-sheet-body');
    const btn = document.querySelector('[data-bs="pre-invoice"] #pi-confirm-btn');

    return {
      viewportHeight: window.innerHeight,
      sheetRect: sheet ? sheet.getBoundingClientRect() : null,
      headerRect: header ? header.getBoundingClientRect() : null,
      bodyRect: body ? body.getBoundingClientRect() : null,
      btnRect: btn ? btn.getBoundingClientRect() : null,
      sheetStyles: sheet ? {
        height: getComputedStyle(sheet).height,
        maxHeight: getComputedStyle(sheet).maxHeight,
        top: getComputedStyle(sheet).top,
        bottom: getComputedStyle(sheet).bottom,
        transform: getComputedStyle(sheet).transform,
      } : null
    };
  });

  console.log('MOBILE LAYOUT INFO:', JSON.stringify(info, null, 2));
  await browser.close();
})();
