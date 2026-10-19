// loader.html's three pieces run in node:vm against a small fake DOM: host
// detection, the dev flag and its storage, RELEASE null or set, the
// preconnect origin, the missing-config guards and the fallbacks. No
// browser, so it runs in well under a second; the Playwright spec
// (environment-switcher.spec.mjs) covers what needs real loading.
// Run by `pnpm test` with node --test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// The loader as pasted into Webflow, read the way the Playwright spec reads
// it: comments stripped (they hold an example link that must NOT be
// installed), ORG and REPO filled in.
const raw = readFileSync(new URL('../loader.html', import.meta.url), 'utf8');
const source = raw.replace(/<!--[\s\S]*?-->/g, '').replaceAll('ORG', 'example-org').replaceAll('REPO', 'wf-example');
const repo = source.match(/var SITE = "([^"]+)"/)[1];
const org = source.match(/var OWNER = "([^"]+)"/)[1];
const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const cssLink = source.match(/<link\b[^>]*id="wfc-css"[^>]*>/)?.[0];
const [head, embed, footer] = scripts;
const stage = `https://${org}.github.io/${repo}/`;
const local = 'http://localhost:3000/';
const release = (v) => `https://cdn.jsdelivr.net/gh/${org}/${repo}@${v}/dist/`;

// A page with the loader pieces in it. `pieces` picks which ones are
// installed (a missing head code is the "config missing" case).
function load({ host = 'example.webflow.io', search = '', stored = null, denyStorage = false, RELEASE = null, pieces = ['head', 'embed', 'footer'] } = {}) {
  const logs = { error: [], warn: [] };
  const timers = [];
  const listeners = {};
  const nodes = [];
  const classes = new Set();
  const attach = (parent, node, before) => {
    node.parentNode = parent;
    nodes.splice(before ? nodes.indexOf(before) : nodes.length, 0, node);
    return node;
  };
  const el = (tag) => {
    const node = { tagName: tag.toUpperCase(), parentNode: null, nextSibling: null };
    node.removeAttribute = (name) => { if (name === 'id') node.id = ''; };
    node.remove = () => { node.parentNode = null; };
    return node;
  };
  const container = {
    insertBefore: (node, ref) => attach(container, node, ref),
    removeChild: (node) => { node.parentNode = null; return node; },
    appendChild: (node) => attach(container, node),
  };
  const document = {
    documentElement: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) } },
    head: { appendChild: (node) => attach(document.head, node) },
    createElement: el,
    getElementById: (id) => nodes.find((n) => n.parentNode && n.id === id) ?? null,
  };
  const page = vm.createContext({
    document,
    location: { hostname: host, search, href: `https://${host}/${search}` },
    URL, URLSearchParams,
    localStorage: {
      getItem() { if (denyStorage) throw new Error('Storage blocked'); return stored; },
      setItem(_, value) { if (denyStorage) throw new Error('Storage blocked'); stored = value; },
    },
    console: { error: (m) => logs.error.push(String(m)), warn: (m) => logs.warn.push(String(m)) },
    setTimeout: (fn, ms) => timers.push({ fn, ms }),
    addEventListener: (type, fn) => (listeners[type] ??= []).push(fn),
  });
  page.window = page;
  const code = { head: head.replace('var RELEASE = null;', `var RELEASE = ${JSON.stringify(RELEASE)};`), embed, footer };
  if (pieces.includes('embed')) {
    // Embed 2a: the <link> the parser already met when 2b runs.
    const link = el('link');
    link.id = 'wfc-css';
    link.href = cssLink.match(/href="([^"]+)"/)[1];
    attach(container, link);
  }
  for (const piece of pieces) vm.runInContext(code[piece], page);
  return {
    page, logs, timers, classes, stored: () => stored,
    WFC: page.WFC,
    preconnects: () => nodes.filter((n) => n.rel === 'preconnect'),
    scripts: () => nodes.filter((n) => n.tagName === 'SCRIPT'),
    css: () => document.getElementById('wfc-css'),
    devCSS: () => document.getElementById('wfc-css-dev'),
    fire: (type) => (listeners[type] ?? []).forEach((fn) => fn()),
  };
}

test('loader.html has the four pieces and ships with RELEASE null', () => {
  assert.equal(scripts.length, 3, 'head code, Embed 2b and footer code each hold one <script>');
  assert.ok(cssLink, 'Embed 2a is a <link id="wfc-css">');
  assert.match(cssLink, new RegExp(`href="${stage}styles\\.css\\?v=1"`));
  assert.ok(raw.includes('var RELEASE = null;'), 'loader.html must ship with `var RELEASE = null;`');
  assert.doesNotMatch(source, /localhost:3000\/styles\.css"/, 'no static localhost link outside the comments');
});

test('host detection: webflow.io and the Designer preview are staging, anything else is production', () => {
  for (const [host, staging] of [
    ['example.webflow.io', true],
    ['example.canvas.webflow.com', true],
    ['www.client.example', false],
    ['client.example', false],
    ['example.webflow.io.evil.example', false],
    ['example.canvas.webflow.com.evil.example', false],
    ['webflow.io', false],
  ]) {
    const h = load({ host, search: '?wfc-dev=1', RELEASE: '1.0.0' });
    assert.equal(h.WFC.staging, staging, host);
    assert.equal(h.WFC.dev, staging, `${host}: the dev flag only works on staging`);
  }
});

test('production ignores a dev flag in the URL and in storage', () => {
  const h = load({ host: 'www.client.example', search: '?wfc-dev=1', stored: '1', RELEASE: '1.0.0' });
  assert.equal(h.WFC.dev, false);
  assert.equal(h.stored(), '1', 'production never writes the flag');
  assert.deepEqual(h.scripts().map((s) => s.src), [release('1.0.0') + 'index.js']);
  assert.equal(h.devCSS(), null);
});

test('staging: the URL flag is stored, a stored flag applies, ?wfc-dev=0 turns it off', () => {
  const on = load({ search: '?wfc-dev=1' });
  assert.equal(on.WFC.dev, true);
  assert.equal(on.stored(), '1');
  assert.equal(on.scripts()[0].src, local + 'index.js');
  assert.equal(on.devCSS().href, local + 'styles.css');

  const saved = load({ stored: '1' });
  assert.equal(saved.WFC.dev, true);

  const off = load({ search: '?wfc-dev=0', stored: '1' });
  assert.equal(off.WFC.dev, false);
  assert.equal(off.stored(), '0');
  assert.ok(off.scripts()[0].src.startsWith(stage + 'index.js?v='));
  assert.equal(off.devCSS(), null);
});

test('storage denied: the URL flag still works and nothing throws', () => {
  for (const [search, dev] of [['?wfc-dev=1', true], ['?wfc-dev=0', false], ['', false]]) {
    const h = load({ search, denyStorage: true });
    assert.equal(h.WFC.dev, dev, search || 'no flag');
    assert.ok(h.scripts()[0].src.startsWith(dev ? local : stage));
    assert.deepEqual(h.logs.error, []);
  }
});

test('missing config: Embed 2b and the footer log an error and load nothing', () => {
  const h = load({ pieces: ['embed', 'footer'] });
  assert.equal(h.WFC, undefined);
  assert.equal(h.scripts().length, 0);
  assert.equal(h.logs.error.length, 2);
  assert.match(h.logs.error[0], /Head code config missing; the stylesheet stays on staging/);
  assert.match(h.logs.error[1], /Head code config missing; custom code not loaded/);
  assert.ok(h.css().href.startsWith(stage), 'the 2a sheet is left alone');
});

test('missing CSS Embed: the footer warns and still loads the bundle', () => {
  const h = load({ pieces: ['head', 'footer'] });
  assert.match(h.logs.warn.join('\n'), /CSS embed not found/);
  assert.ok(h.scripts()[0].src.startsWith(stage + 'index.js?v='));
});

test('RELEASE null on a custom domain: staging bundle, cache-busted, with a console error', () => {
  const h = load({ host: 'www.client.example' });
  assert.equal(h.WFC.prod, stage);
  assert.match(h.logs.error.join('\n'), /RELEASE is not set/);
  assert.match(h.scripts()[0].src, new RegExp(`^${stage}index\\.js\\?v=\\d+$`));
  assert.ok(h.css().href.startsWith(stage), 'the stylesheet stays on staging');
  assert.ok(!h.scripts().some((s) => s.src.includes('cdn.jsdelivr.net')));
});

test('RELEASE set: production pins CSS and JS to the jsDelivr tag, no cache-buster, no error', () => {
  const h = load({ host: 'www.client.example', RELEASE: '2.3.4' });
  assert.equal(h.WFC.prod, release('2.3.4'));
  assert.deepEqual(h.scripts().map((s) => s.src), [release('2.3.4') + 'index.js']);
  assert.equal(h.css().href, release('2.3.4') + 'styles.css');
  assert.deepEqual(h.logs.error, []);
});

test('RELEASE set: staging still runs the staging bundle and falls back to the release', () => {
  const h = load({ RELEASE: '2.3.4' });
  const [first] = h.scripts();
  assert.ok(first.src.startsWith(stage + 'index.js?v='));
  first.onerror();
  assert.equal(h.scripts()[1].src, release('2.3.4') + 'index.js');
  assert.equal(h.css().href, release('2.3.4') + 'styles.css', 'CSS follows the JS fallback');
});

test('RELEASE null: staging has no release to fall back to', () => {
  const h = load();
  assert.equal(h.scripts()[0].onerror, undefined);
});

test('dev mode falls back to staging when localhost is down', () => {
  const h = load({ search: '?wfc-dev=1' });
  h.scripts()[0].onerror();
  assert.ok(h.scripts()[1].src.startsWith(stage + 'index.js?v='));
  assert.equal(h.devCSS(), null, 'the local stylesheet is removed with the fallback');
});

test('staging swaps in a cache-busted stylesheet only after load', () => {
  const h = load();
  const parsed = h.css().href;
  assert.equal(parsed, stage + 'styles.css?v=1');
  h.page.WFC.source = stage; // what the footer sets for the staging bundle
  h.fire('load');
  assert.match(h.css().href, new RegExp(`^${stage}styles\\.css\\?v=\\d{5,}$`));
});

test('preconnect warms the origin the bundle comes from, twice (plain and CORS)', () => {
  for (const [opts, origin] of [
    [{}, new URL(stage).origin],
    [{ host: 'example.canvas.webflow.com' }, new URL(stage).origin],
    [{ search: '?wfc-dev=1' }, new URL(local).origin],
    [{ host: 'www.client.example', RELEASE: '1.0.0' }, 'https://cdn.jsdelivr.net'],
    [{ host: 'www.client.example' }, new URL(stage).origin],
  ]) {
    const links = load({ ...opts, pieces: ['head'] }).preconnects();
    assert.equal(links.length, 2, JSON.stringify(opts));
    for (const link of links) assert.equal(link.href, origin, JSON.stringify(opts));
    assert.deepEqual(links.map((l) => l.crossOrigin), [undefined, '']);
  }
});

test('the scroll lock is set at once and released by the 3 s safety timeout', () => {
  const h = load({ pieces: ['head'] });
  assert.ok(h.classes.has('is-loading'));
  const lock = h.timers.find((t) => t.ms === 3000);
  assert.ok(lock, 'a 3000 ms timeout');
  lock.fn();
  assert.ok(!h.classes.has('is-loading'));
});
