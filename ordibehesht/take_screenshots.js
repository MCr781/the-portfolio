const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Mobile screenshot
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('file:///' + path.resolve(__dirname, 'gold/buy.html').replace(/\\/g, '/'));
  await mobilePage.evaluate(() => {
    if (window.GoldBottomSheet) window.GoldBottomSheet.open('pre-invoice');
  });
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.resolve(__dirname, 'modal_buy_mobile.png') });
  await mobileContext.close();

  // Desktop screenshot
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('file:///' + path.resolve(__dirname, 'gold/buy.html').replace(/\\/g, '/'));
  await desktopPage.evaluate(() => {
    if (window.GoldBottomSheet) window.GoldBottomSheet.open('pre-invoice');
  });
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: path.resolve(__dirname, 'modal_buy_desktop.png') });
  await desktopContext.close();

  await browser.close();
  console.log('Screenshots saved successfully!');
})();
