// Render brochure/dist/brochure-bleed{0,3}.html to PDF.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();

for (const b of [0, 3]) {
  const file = path.join(dist, `brochure-bleed${b}.html`);
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(dist, `brochure-bleed${b}.pdf`), preferCSSPageSize: true, printBackground: true });
}

await browser.close();
