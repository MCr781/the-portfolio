const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  const targetUrl = 'file:///' + path.resolve('gold/index.html').replace(/\\/g, '/');
  await page.goto(targetUrl);
  await page.waitForTimeout(1000);

  // Focus and type in the desktop quick buy rial input
  const inputSelector = '#qb-desktop-input .dual-input-rial';
  await page.fill(inputSelector, '200000');
  await page.waitForTimeout(500);

  const btnSelector = '#qb-desktop-btn';
  const disabled = await page.$eval(btnSelector, el => el.disabled);
  console.log('Button disabled:', disabled);

  await page.click(btnSelector, { force: true });
  await page.waitForTimeout(1000);

  const display = await page.$eval('#preInvoiceModal', el => window.getComputedStyle(el).display);
  const opacity = await page.$eval('#preInvoiceModal .modal-content', el => window.getComputedStyle(el).opacity);
  const amount = await page.$eval('#pi-amount', el => el.textContent);
  
  console.log('preInvoiceModal display:', display);
  console.log('modal-content opacity:', opacity);
  console.log('pi-amount:', amount);

  await browser.close();
  console.log('Done!');
})();
