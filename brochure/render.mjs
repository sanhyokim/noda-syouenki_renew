// Render every brochure/dist/brochure-<edition>-bleed{0,3}.html to PDF.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();

for (const name of fs.readdirSync(dist).filter(f => /^brochure-\w+-bleed\d\.html$/.test(f))) {
  const file = path.join(dist, name);
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: file.replace(/\.html$/, '.pdf'), preferCSSPageSize: true, printBackground: true });
}

await browser.close();
