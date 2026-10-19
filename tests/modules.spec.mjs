import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

// The starter modules run from the built bundle, on markup as Webflow
// publishes it. Recipes are not in the bundle: they are compiled here the
// way a project's build would compile them once copied into src/modules/.
const js = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');

async function recipe(dir, code) {
  const result = await esbuild.build({
    stdin: { contents: code, resolveDir: fileURLToPath(new URL(`../.claude/skills/webflow-build/recipes/${dir}/`, import.meta.url)), loader: 'ts' },
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2019',
  });
  return result.outputFiles[0].text;
}

async function setup(page, body, { script = js, init } = {}) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  if (init) await page.addInitScript(init);
  await page.route('https://site.test/', (route) => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head></head><body>${body}<script>${script}</script></body></html>`,
  }));
  await page.goto('https://site.test/');
  return errors;
}

test('data-aria-role replaces the role Webflow publishes', async ({ page }) => {
  const errors = await setup(page, `<div class="w-dyn-list"><div role="list" class="w-dyn-items" data-aria-role="rowgroup">
    <div role="listitem" class="w-dyn-item" data-aria-role="row">One</div>
    <div role="listitem" class="w-dyn-item" data-aria-role=" ">Two</div></div></div>`);
  await expect(page.locator('.w-dyn-items')).toHaveAttribute('role', 'rowgroup');
  await expect(page.locator('.w-dyn-item').first()).toHaveAttribute('role', 'row');
  // An empty value leaves Webflow's role in place.
  await expect(page.locator('.w-dyn-item').last()).toHaveAttribute('role', 'listitem');
  expect(errors).toEqual([]);
});

test('data-placeholder becomes the field placeholder', async ({ page }) => {
  const errors = await setup(page, `<input id="name" placeholder="Designer" data-placeholder="Your name">
    <textarea id="message" data-placeholder="Tell us more"></textarea>
    <input id="empty" placeholder="Designer" data-placeholder="">`);
  await expect(page.locator('#name')).toHaveAttribute('placeholder', 'Your name');
  await expect(page.locator('#message')).toHaveAttribute('placeholder', 'Tell us more');
  await expect(page.locator('#empty')).toHaveAttribute('placeholder', 'Designer');
  expect(errors).toEqual([]);
});

// A filter as Webflow publishes it: radios in a Collection List that all
// carry the Designer id "radio".
const radio = (label, checked = '') => `<div class="w-dyn-item"><label class="w-radio">
  <div class="w-form-formradioinput w-radio-input"></div>
  <input type="radio" name="Category" id="radio" value="Radio" ${checked}>
  <span class="w-form-label" for="radio">${label}</span></label></div>`;

test('duplicate CMS radio ids become unique and labels follow', async ({ page }) => {
  const errors = await setup(page, `<form>${radio('All', 'checked')}${radio('Experiential')}${radio('Media Relations')}${radio('All')}</form>
    <input id="solo" type="text"><label for="solo">Solo</label>`);
  const ids = await page.$$eval('input[type=radio]', (els) => els.map((e) => e.id));
  expect(ids).toEqual(['radio-all', 'radio-experiential', 'radio-media-relations', 'radio-all-2']);
  const fors = await page.$$eval('.w-form-label', (els) => els.map((e) => e.getAttribute('for')));
  expect(fors).toEqual(ids);
  // Unique ids are left alone, and nothing else about the control changes.
  await expect(page.locator('#solo')).toHaveCount(1);
  await expect(page.locator('label[for=solo]')).toHaveCount(1);
  expect(await page.$eval('input[type=radio]', (e) => e.checked)).toBe(true);
  expect(errors).toEqual([]);
});

test('video recipe: refused autoplay starts on the first tap, not before', async ({ page }) => {
  const script = await recipe('video', "import { initAutoplayVideo } from './autoplay-video.ts'; initAutoplayVideo();");
  const errors = await setup(page, '<video autoplay muted loop playsinline style="width:320px;height:180px"></video>', {
    script,
    // iOS Low Power Mode: play() rejects until the visitor interacts.
    init: () => {
      window.__allow = false;
      window.__played = 0;
      HTMLMediaElement.prototype.play = function () {
        if (!window.__allow) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
        window.__played++;
        return Promise.resolve();
      };
    },
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__played)).toBe(0);
  await page.evaluate(() => { window.__allow = true; });
  await page.mouse.click(600, 500);
  await expect.poll(() => page.evaluate(() => window.__played)).toBe(1);
  // The retry is one-shot: a second click does not play again.
  await page.mouse.click(600, 500);
  expect(await page.evaluate(() => window.__played)).toBe(1);
  expect(errors).toEqual([]);
});
