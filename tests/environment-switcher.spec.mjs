import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const loader = readFileSync(new URL('../loader.html', import.meta.url), 'utf8')
  .replaceAll('REPO', 'wf-example').replaceAll('X.Y.Z', '1.0.0');
const scripts = [...loader.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[0]);
const links = [...loader.matchAll(/<link\b[^>]*>/g)].map(match => match[0])
  .filter(link => /id="bv-css/.test(link)).join('\n');
const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
const stage = 'https://brandvm.github.io/wf-example/';
const local = 'http://localhost:3000/';
const release = 'https://cdn.jsdelivr.net/gh/brandvm/wf-example@1.0.0/dist/';

async function setup(page, {
  url = 'https://example.webflow.io/',
  unavailable = () => false,
  blockedStorage = false,
  editor = false,
  design = false,
} = {}) {
  expect(scripts).toHaveLength(3);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  if (blockedStorage) await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  });
  const html = `<!doctype html><html><head>${scripts[0]}</head><body>
    ${links}${scripts[1]}<h1>Example client website</h1>
    <script>window.Webflow={env:mode=>mode==='editor'?${editor}:mode==='design'?${design}:false};</script>
    ${scripts[2]}</body></html>`;
  await page.route('**/*', route => {
    const request = route.request();
    if (request.isNavigationRequest()) return route.fulfill({ contentType: 'text/html', body: html });
    if (unavailable(request.url())) return route.abort();
    const style = new URL(request.url()).pathname.endsWith('.css');
    return route.fulfill({ contentType: style ? 'text/css' : 'text/javascript', body: style ? css : js });
  });
  await page.goto(url);
  await expect(page.locator('html')).not.toHaveClass(/is-loading/);
  return errors;
}

for (const width of [1440, 390]) test(`switches sources and keeps the page URL at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const errors = await setup(page, { url: 'https://example.webflow.io/services?tab=one#section' });
  const launcher = page.getByRole('button', { name: 'Choose environment (Staging)' });
  await launcher.click();
  await expect(page.getByRole('button', { name: 'Staging', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Dev', exact: true }).click();
  await expect(page).toHaveURL('https://example.webflow.io/services?tab=one&bv-dev=1#section');
  await page.getByRole('button', { name: 'Choose environment (Dev)' }).click();
  expect(await page.evaluate(() => window.BV.source)).toBe(local);
  await page.getByRole('button', { name: 'Staging', exact: true }).click();
  await expect(page).toHaveURL('https://example.webflow.io/services?tab=one&bv-dev=0#section');
  await expect(launcher).toBeVisible();
  expect(await page.evaluate(() => window.BV.source)).toBe(stage);
  expect(await page.evaluate(() => localStorage.getItem('bv-dev'))).toBe('0');
  expect(errors).toEqual([]);
});

test('mode persists on another page without a query flag', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Choose environment (Staging)' }).click();
  await page.getByRole('button', { name: 'Dev', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose environment (Dev)' })).toBeVisible();
  await page.goto('https://example.webflow.io/about');
  await expect(page.getByRole('button', { name: 'Choose environment (Dev)' })).toBeVisible();
  expect(await page.evaluate(() => window.BV.source)).toBe(local);
});

test('URL selection works when localStorage is blocked', async ({ page }) => {
  const errors = await setup(page, { blockedStorage: true });
  await page.getByRole('button', { name: 'Choose environment (Staging)' }).click();
  await page.getByRole('button', { name: 'Dev', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose environment (Dev)' })).toBeVisible();
  expect(await page.evaluate(() => window.BV.source)).toBe(local);
  expect(errors).toEqual([]);
});

test('local JS failure shows staging and removes the local stylesheet', async ({ page }) => {
  const errors = await setup(page, {
    url: 'https://example.webflow.io/?bv-dev=1',
    unavailable: url => url.startsWith(local) && url.includes('index.js'),
  });
  await page.getByRole('button', { name: 'Choose environment (Staging)' }).click();
  await expect(page.getByRole('status')).toHaveText('Dev unavailable · using staging');
  await expect(page.locator('#bv-css-dev')).toHaveCount(0);
  await expect(page.locator('#bv-css')).toHaveAttribute('href', new RegExp('^' + stage));
  await page.getByRole('button', { name: 'Staging', exact: true }).click();
  await expect(page).toHaveURL('https://example.webflow.io/?bv-dev=0');
  await page.getByRole('button', { name: 'Choose environment (Staging)' }).click();
  await expect(page.getByRole('status')).toBeHidden();
  expect(errors).toEqual([]);
});

test('staging failure identifies the pinned release and allows a retry', async ({ page }) => {
  let failStage = true;
  const errors = await setup(page, { unavailable: url => failStage && url.startsWith(stage) && url.includes('index.js') });
  await page.getByRole('button', { name: 'Choose environment (Staging)' }).click();
  await expect(page.getByRole('status')).toHaveText('Staging unavailable · using release');
  expect(await page.evaluate(() => window.BV.source)).toBe(release);
  await expect(page.locator('#bv-css')).toHaveAttribute('href', release + 'styles.css');
  failStage = false;
  await page.getByRole('button', { name: 'Staging', exact: true }).click();
  await expect(page).toHaveURL('https://example.webflow.io/?bv-dev=0');
  await page.getByRole('button', { name: 'Choose environment (Staging)' }).click();
  expect(await page.evaluate(() => window.BV.source)).toBe(stage);
  await expect(page.getByRole('status')).toBeHidden();
  expect(errors).toEqual([]);
});

test('supports keyboard access, Escape, outside clicks, and duplicate initialization', async ({ page }) => {
  const errors = await setup(page);
  const launcher = page.getByRole('button', { name: 'Choose environment (Staging)' });
  await launcher.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Staging', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(launcher).toBeFocused();
  await expect(page.getByRole('group', { name: 'Code environment' })).toBeHidden();
  await launcher.click();
  await page.locator('h1').click();
  await expect(launcher).toBeVisible();
  await page.addScriptTag({ content: js });
  await expect(page.locator('#bv-environment')).toHaveCount(1);
  expect(errors).toEqual([]);
});

for (const scenario of [
  { label: 'production', url: 'https://client.example/?bv-dev=1' },
  { label: 'localhost', url: 'http://localhost:3000/' },
  { label: 'Webflow editor', editor: true },
  { label: 'Designer', design: true },
]) test(`hidden in ${scenario.label}`, async ({ page }) => {
  const errors = await setup(page, scenario);
  await expect(page.locator('#bv-environment')).toHaveCount(0);
  expect(errors).toEqual([]);
});
