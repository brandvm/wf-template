// PROTOTYPE-ONLY: pictures of every site page at the canvas's three
// breakpoints, for the canvas's All pages view (/design/canvas). Like
// Figma, the overview draws cached pictures; a page runs live only where
// you zoom in on it.
//   pnpm canvas:shots [/path …]
// Each page as the canvas's Full page shows it (?static: motion off), the
// whole page, at half scale (enough for an overview; the live page takes
// over close up), JPEG. Written to public/canvas-shots/ with manifest.json
// (each picture's file, the page's height in CSS px and when it was taken).
// The canvas's "Update pictures" button runs this through the dev server.
import fs from 'node:fs';
import path from 'node:path';
import { root, args, devServer, chromium } from './lib.mjs';

const FRAMES = [
  { id: 'desktop', width: 1440, screen: 900 },
  { id: 'tablet', width: 820, screen: 1180 },
  { id: 'mobile', width: 390, screen: 844 },
];
const SCALE = 0.5;
const { pos } = args();
const dir = path.join(root, 'public/canvas-shots');
fs.mkdirSync(dir, { recursive: true });
const manifestPath = path.join(dir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const slug = (v) => (v.replace(/^\/|\/$/g, '').replace(/\.html$/, '').replace(/[^a-z0-9]+/gi, '-') || 'home');

const server = await devServer();
// The site's pages, as the canvas lists them (the dev server's /__pages).
const all = (await (await fetch(new URL('/__pages', server.url)).json())).filter((p) => !p.design);
const list = pos.length ? all.filter((p) => pos.includes(p.value)) : all;
const browser = await (await chromium()).launch();
try {
  for (const f of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: f.width, height: f.screen }, deviceScaleFactor: SCALE });
    const page = await ctx.newPage();
    for (const p of list) {
      await page.goto(new URL(`${p.value}?static`, server.url).href, { waitUntil: 'networkidle' });
      // Every image now, not when scrolled to; then the fonts.
      await page.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
        await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
        await document.fonts.ready;
      });
      await page.waitForTimeout(400);
      const h = await page.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height));
      const file = `${slug(p.value)}-${f.id}.jpg`;
      await page.screenshot({ path: path.join(dir, file), fullPage: true, type: 'jpeg', quality: 72 });
      manifest[`${p.value}|${f.id}`] = { src: `/canvas-shots/${file}`, h: Math.max(f.screen, h), at: Date.now() };
      console.log(`${p.label} · ${f.id} · ${h}px`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.stop();
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
