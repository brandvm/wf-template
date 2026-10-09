import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Piece 2b must never leave the page without the repo stylesheet: the sheet
// scales the type, so a gap is a full-page layout shift (CLS).
const loader = readFileSync(new URL('../loader.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const script2b = [...loader.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('C.setCSS = function'));
const stage = 'https://stage.test/';
const prod = 'https://cdn.test/wf-example@9.9.9/dist/';

async function setup(page, releaseRoute) {
  await page.route(stage + 'styles.css*', (r) => r.fulfill({ contentType: 'text/css', body: ':root{--sheet:stage}' }));
  await page.route(prod + 'styles.css', releaseRoute);
  await page.route('https://site.test/', (r) => r.fulfill({ contentType: 'text/html', body: `<html><head><script>
    window.WFC = { staging: false, dev: false, devBase: 'http://localhost:3000/', stag: '${stage}', release: '9.9.9', prod: '${prod}' };
    </script></head><body><link id="wfc-css" rel="stylesheet" href="${stage}styles.css?v=1"><script>${script2b}</script></body></html>` }));
  await page.goto('https://site.test/', { waitUntil: 'domcontentloaded' });
  return () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sheet').trim());
}

test('2b swaps the stylesheet without an unstyled gap', async ({ page }) => {
  expect(script2b, 'piece 2b defines WFC.setCSS').toBeTruthy();
  let release;
  const released = new Promise((r) => (release = r));
  const sheet = await setup(page, async (r) => { await released; r.fulfill({ contentType: 'text/css', body: ':root{--sheet:release}' }); });
  // Release sheet still loading: the staging sheet must still apply.
  expect(await sheet()).toBe('stage');
  await expect(page.locator('#wfc-css')).toHaveAttribute('href', prod + 'styles.css');
  await expect(page.locator('link[rel=stylesheet]')).toHaveCount(2);
  release();
  await expect.poll(sheet).toBe('release');
  await expect(page.locator('link[rel=stylesheet]')).toHaveCount(1);
  // Setting the same URL again (piece 3 does) is a no-op.
  await page.evaluate((url) => window.WFC.setCSS(url), prod + 'styles.css');
  await expect(page.locator('link[rel=stylesheet]')).toHaveCount(1);
});

test('2b keeps the current stylesheet when the target fails', async ({ page }) => {
  const sheet = await setup(page, (r) => r.abort());
  await expect(page.locator('link[rel=stylesheet]')).toHaveCount(1);
  await expect(page.locator('#wfc-css')).toHaveAttribute('href', stage + 'styles.css?v=1');
  expect(await sheet()).toBe('stage');
});

test('2b keeps one #wfc-css when an earlier swap fails while a newer one loads', async ({ page }) => {
  const other = 'https://cdn.test/wf-example@9.9.8/dist/styles.css';
  let fail, loadOther;
  const failed = new Promise((r) => (fail = r));
  const otherReady = new Promise((r) => (loadOther = r));
  await page.route(other, async (r) => { await otherReady; r.fulfill({ contentType: 'text/css', body: ':root{--sheet:other}' }); });
  const sheet = await setup(page, async (r) => { await failed; r.abort(); });
  // A second swap (piece 3's fallback) starts while the first is still loading…
  await page.evaluate((url) => window.WFC.setCSS(url), other);
  // …then the first fails before the second has loaded.
  fail();
  await expect.poll(() => page.locator('link[href*="9.9.9"]').count()).toBe(0);
  await expect(page.locator('#wfc-css')).toHaveCount(1);
  await expect(page.locator('#wfc-css')).toHaveAttribute('href', other);
  loadOther();
  await expect.poll(sheet).toBe('other');
  await expect(page.locator('#wfc-css')).toHaveCount(1);
});
