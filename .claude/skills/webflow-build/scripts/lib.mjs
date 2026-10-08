// Shared helpers for the webflow-build checks.
//
// Every script reads `webflow-build.config.json`, found in the current
// working directory or the nearest parent (usually the repo root):
//
// {
//   "prototypeUrl": "http://127.0.0.1:5173",       // approved localhost prototype
//   "stagingUrl":   "https://<site>.webflow.io",    // published Webflow staging
//   "repoDir":      ".",                           // this repo (has dist/ and @playwright/test), relative to the config
//   "bundlePattern": "<org>\\.github\\.io/<repo>/(index\\.js|styles\\.css)",
//   "widths": [[1440, 900], [820, 1180], [390, 844]],
//   "pages": ["/", "/about"]                        // optional: default paths for a11y, links, baseline
// }
//
// By default staging pages load this repo's local dist/ instead of the
// deployed bundle (bundlePattern), so code can be checked before a push.
// --live checks exactly what visitors get.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

function findConfig() {
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    const file = path.join(dir, 'webflow-build.config.json');
    if (fs.existsSync(file)) return file;
    if (path.dirname(dir) === dir) return null;
  }
}

export function loadConfig() {
  const file = findConfig();
  if (!file) {
    console.error(`No webflow-build.config.json in ${process.cwd()} or its parents. See SKILL.md › Project setup.`);
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  cfg.file = file;
  cfg.repoDir = path.resolve(path.dirname(file), cfg.repoDir ?? '.');
  cfg.widths ??= [[1440, 900], [820, 1180], [390, 844]];
  cfg.prototypeUrl = cfg.prototypeUrl?.replace(/\/$/, '');
  cfg.stagingUrl = cfg.stagingUrl?.replace(/\/$/, '');
  return cfg;
}

// Flags that take a value: --width 390, --offset 72, --max 50, --dir baselines.
const VALUED = new Set(['--width', '--offset', '--max', '--dir', '--threshold']);

export function args() {
  const argv = process.argv.slice(2);
  const flags = new Set();
  const values = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (VALUED.has(a)) { values[a.slice(2)] = argv[++i]; flags.add(a); }
    else if (a.startsWith('--')) flags.add(a);
    else pos.push(a);
  }
  return { flags, values, pos, live: flags.has('--live') };
}

// Resolve a package from the repo (Playwright, axe-core live there).
export const repoRequire = (cfg) => createRequire(path.join(cfg.repoDir, 'package.json'));

// Paths to check: the ones given, else config.pages, else the home page.
export const paths = (cfg, pos) => (pos.length ? pos : cfg.pages ?? ['/']);

export async function browser(cfg) {
  const require = createRequire(path.join(cfg.repoDir, 'package.json'));
  const { chromium } = require('@playwright/test');
  return chromium.launch();
}

// A page at one viewport; staging pages get the local bundle unless --live.
export async function page(b, cfg, url, [w, h], { live = false } = {}) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  // '%c%d …' is the "Made in Webflow" badge logging, not an error.
  p.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('%c%d')) errors.push('console: ' + m.text()); });
  if (!live && cfg.bundlePattern && url.startsWith(cfg.stagingUrl)) {
    const re = new RegExp(cfg.bundlePattern);
    await p.route(re, (r) => {
      const f = r.request().url().includes('styles.css') ? 'styles.css' : 'index.js';
      r.fulfill({ body: fs.readFileSync(path.join(cfg.repoDir, 'dist', f)), contentType: f.endsWith('css') ? 'text/css' : 'application/javascript' });
    });
  }
  p.errors = errors;
  return p;
}

export const bust = (url) => url + (url.includes('?') ? '&' : '?') + 'x=' + Date.now();

// Scroll with Lenis if the page has it, so scrubbed scenes settle the same
// way they do for a visitor.
export const scrollTo = (p, y) =>
  p.evaluate((y) => { window.__lenis?.scrollTo?.(y, { immediate: true, force: true }); window.scrollTo(0, y); }, y);

// Screenshots and other output, next to the config (gitignored).
export function outDir(name) {
  const dir = path.join(path.dirname(findConfig()), '.webflow-build', name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Pixel difference of two PNG buffers, computed in a blank page's canvas
// (no image libraries needed). Returns [fraction, firstRow, lastRow] of the
// rows where more than 2% of pixels differ.
export async function pixelDiff(b, a, c) {
  const cmp = await b.newPage();
  const r = await cmp.evaluate(async ([a, c]) => {
    const ld = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ic] = await Promise.all([ld(a), ld(c)]);
    const w = ia.width, h = ia.height;
    const cv = new OffscreenCanvas(w, h); const x = cv.getContext('2d');
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, w, h).data;
    x.drawImage(ic, 0, 0); const dc = x.getImageData(0, 0, w, h).data;
    let n = 0; const rows = new Array(h).fill(0);
    for (let i = 0; i < da.length; i += 4) {
      if (Math.abs(da[i] - dc[i]) > 40 || Math.abs(da[i + 1] - dc[i + 1]) > 40 || Math.abs(da[i + 2] - dc[i + 2]) > 40) { n++; rows[(i / 4 / w) | 0]++; }
    }
    let y0 = -1, y1 = -1;
    rows.forEach((v, y) => { if (v > w * 0.02) { if (y0 < 0) y0 = y; y1 = y; } });
    return [n / (w * h), y0, y1];
  }, [a.toString('base64'), c.toString('base64')]);
  await cmp.close();
  return r;
}
