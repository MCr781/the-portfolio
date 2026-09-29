const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p1 = await desktop.newPage();
  await p1.goto('http://localhost:3000/gold/buy.html');
  await p1.waitForTimeout(500);
  await p1.screenshot({ path: 'screenshots/buy_desktop.png', fullPage: true });

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await mobile.newPage();
  await p2.goto('http://localhost:3000/gold/buy.html');
  await p2.waitForTimeout(500);
  await p2.screenshot({ path: 'screenshots/buy_mobile.png', fullPage: true });

  await browser.close();
})();
