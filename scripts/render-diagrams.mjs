// Renders the SVG diagrams to PDF + PNG using the installed Edge/Chrome:  npm run diagrams
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const root = process.cwd();
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
for (const [file, w, h] of [['er_diagram', 2000, 1380], ['relational_schema', 1940, 880]]) {
  const svg = fs.readFileSync(path.join(root, 'docs', `${file}.svg`), 'utf8');
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h });
  await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await p.screenshot({ path: path.join(root, 'docs', `${file}.png`) });
  await p.pdf({ path: path.join(root, 'docs', `${file}.pdf`), width: `${w}px`, height: `${h}px`, printBackground: true, pageRanges: '1' });
  await p.close();
}
await browser.close();
console.log('rendered PDFs and PNGs');
process.exit(0);
