import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The loader as pasted into Webflow: comments stripped (they contain an
// example link that must NOT be installed), REPO and RELEASE filled in.
const source = readFileSync(new URL('../loader.html', import.meta.url), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '').replaceAll('ORG', 'example-org').replaceAll('REPO', 'wf-example');
// Client repos fill REPO (and maybe the org) in, so read them back.
const repo = source.match(/var SITE = "([^"]+)"/)[1];
const org = source.match(/var OWNER = "([^"]+)"/)[1];
if (!source.includes('var RELEASE = null;')) throw new Error('loader.html must ship with `var RELEASE = null;`');
function loader(release) {
  const text = source.replace('var RELEASE = null;', `var RELEASE = ${JSON.stringify(release)};`);
  return {
    scripts: [...text.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[0]),
    links: [...text.matchAll(/<link\b[^>]*>/g)].map(match => match[0])
      .filter(link => /id="wfc-css/.test(link)).join('\n'),
  };
}
const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
const stage = `https://${org}.github.io/${repo}/`;
const release = `https://cdn.jsdelivr.net/gh/${org}/${repo}@1.0.0/dist/`;

async function setup(page, {
  url = 'https://example.webflow.io/',
  unavailable = () => false,
  delay = () => 0,
  release = '1.0.0',
  requests = [],
  consoleErrors = [],
} = {}) {
  const { scripts, links } = loader(release);
  expect(scripts).toHaveLength(3);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const html = `<!doctype html><html><head>${scripts[0]}</head><body>
    ${links}${scripts[1]}<h1>Example client website</h1>
    ${scripts[2]}</body></html>`;
  await page.route('**/*', async route => {
    const request = route.request();
    if (request.isNavigationRequest()) return route.fulfill({ contentType: 'text/html', body: html });
    if (unavailable(request.url())) return route.abort();
    const wait = delay(request.url());
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    const style = new URL(request.url()).pathname.endsWith('.css');
    return route.fulfill({ contentType: style ? 'text/css' : 'text/javascript', body: style ? css : js });
  });
  await page.goto(url);
  await expect(page.locator('html')).not.toHaveClass(/is-loading/);
  return errors;
}

for (const url of ['https://client.example/', 'https://example.webflow.io/']) test(`public pages never request localhost (${new URL(url).hostname})`, async ({ page }) => {
  const requests = [];
  const errors = await setup(page, { url, requests });
  expect(requests.filter(request => /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(request))).toEqual([]);
  expect(errors).toEqual([]);
});

test('production uses the single RELEASE for both CSS and JS', async ({ page }) => {
  const requests = [];
  await setup(page, { url: 'https://client.example/', requests });
  await expect(page.locator('#wfc-css')).toHaveAttribute('href', release + 'styles.css');
  expect(requests).toContain(release + 'index.js');
  expect(requests.filter(request => request.startsWith(stage) && request.endsWith('.js'))).toEqual([]);
});

test('production without a RELEASE serves staging and logs an error', async ({ page }) => {
  const requests = [];
  const consoleErrors = [];
  await setup(page, { url: 'https://client.example/', release: null, requests, consoleErrors });
  // Staging changes on every push, so it is cache-busted like on webflow.io.
  await expect(page.locator('#wfc-css')).toHaveAttribute('href', new RegExp('^' + stage + 'styles\\.css\\?v=\\d+$'));
  expect(requests.some(request => request.startsWith(stage + 'index.js'))).toBe(true);
  expect(requests.filter(request => request.includes('cdn.jsdelivr.net/gh/'))).toEqual([]);
  expect(consoleErrors.join('\n')).toContain('RELEASE is not set');
});

test('the scroll lock is released when the bundle cannot load', async ({ page }) => {
  await setup(page, { url: 'https://client.example/', unavailable: url => url.endsWith('index.js') });
});

test('staging keeps the parsed stylesheet until load, then swaps in a fresh copy', async ({ page }) => {
  const requests = [];
  await setup(page, { url: 'https://example.webflow.io/', requests });
  // One request before first paint: the 2a sheet as parsed, not a second copy.
  await expect(page.locator('#wfc-css')).toHaveAttribute('href', new RegExp('^' + stage + 'styles\\.css\\?v=\\d{5,}$'));
  await expect(page.locator('link[rel=stylesheet]')).toHaveCount(1);
  expect(requests.filter(request => request.startsWith(stage + 'styles.css'))).toHaveLength(2);
  expect(requests).toContain(stage + 'styles.css?v=1');
});

test('the Designer custom-code preview counts as staging', async ({ page }) => {
  const requests = [];
  await setup(page, { url: 'https://example.canvas.webflow.com/', requests });
  expect(await page.evaluate(() => window.WFC.staging)).toBe(true);
  expect(requests.some(request => request.startsWith(stage + 'index.js'))).toBe(true);
});

test('a staging bundle that fails to load falls back to the pinned release', async ({ page }) => {
  const errors = await setup(page, { unavailable: url => url.startsWith(stage) && url.includes('index.js') });
  expect(await page.evaluate(() => window.WFC.source)).toBe(release);
  await expect(page.locator('#wfc-css')).toHaveAttribute('href', release + 'styles.css');
  expect(errors).toEqual([]);
});

test('the old ?wfc-dev=1 flag does nothing', async ({ page }) => {
  const requests = [];
  await setup(page, { url: 'https://example.webflow.io/?wfc-dev=1', requests });
  expect(await page.evaluate(() => window.WFC.source)).toBe(stage);
  expect(requests.filter(request => request.includes('localhost'))).toEqual([]);
});

for (const [url, origin] of [['https://example.webflow.io/', new URL(stage).origin], ['https://client.example/', 'https://cdn.jsdelivr.net']])
  test(`head code preconnects to the bundle's origin (${new URL(url).hostname})`, async ({ page }) => {
    await setup(page, { url });
    await expect(page.locator('link[rel=preconnect]')).toHaveCount(2);
    for (const href of await page.locator('link[rel=preconnect]').evaluateAll(links => links.map(link => link.href)))
      expect(new URL(href).origin).toBe(origin);
  });

test('on a release domain, first paint waits for the pinned stylesheet and only for it', async ({ page }) => {
  const requests = [];
  // GitHub Pages answers after 3 s and the release after 1 s. The page must
  // not paint before the release sheet (it scales the type: painting
  // without it shifted a whole page, CLS 0.31), nor wait for GitHub Pages.
  await setup(page, {
    url: 'https://client.example/', requests,
    delay: url => url.startsWith(stage) ? 3000 : url === release + 'styles.css' ? 1000 : 0,
  });
  // The bundle may boot before the delayed sheet arrives: wait for the paint.
  const fcp = () => page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime);
  await expect.poll(fcp).toBeGreaterThan(0);
  const paint = await fcp();
  const loaded = await page.evaluate(href => performance.getEntriesByName(href)[0]?.responseEnd, release + 'styles.css');
  expect(loaded).toBeGreaterThan(900);
  expect(paint).toBeGreaterThanOrEqual(loaded);
  expect(paint).toBeLessThan(2500);
  await expect(page.locator('#wfc-css')).toHaveAttribute('href', release + 'styles.css');
  for (const href of await page.locator('link[rel=stylesheet]').evaluateAll(links => links.map(link => link.href)))
    expect(href).toBe(release + 'styles.css');
  // The browser's look-ahead scanner may still request the 2a sheet from
  // GitHub Pages; the paint above shows it no longer holds the page.
});

test('on a release domain, a failed release stylesheet leaves Embed 2a on staging', async ({ page }) => {
  // jsDelivr down or blocked: the page must keep the repo CSS from GitHub
  // Pages, as before piece 1 wrote the release sheet (it scales the type).
  await setup(page, { url: 'https://client.example/', unavailable: url => url.startsWith(release) });
  await expect(page.locator('#wfc-css')).toHaveAttribute('href', stage + 'styles.css?v=1');
  // A cross-origin sheet's rules can't be read; a link that failed has none.
  await expect.poll(() => page.evaluate(() => Boolean(document.getElementById('wfc-css').sheet))).toBe(true);
});
