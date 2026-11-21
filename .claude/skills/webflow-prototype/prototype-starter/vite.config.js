import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

// kit (Weftly's design system: @weftly/components, @weftly/editor), used
// only by the prototype canvas at /design/canvas. kit is private: it is not
// in this repo or on npm. It is read as TypeScript source from a local
// checkout (WEFTLY_KIT, or ~/Documents/Projects/weftlyhq/kit as seen from
// <Client>/prototype). Without it the site pages run as usual and
// /design/canvas says what it needs.
const kit = process.env.WEFTLY_KIT ?? resolve(root, '../../../Projects/weftlyhq/kit');
const hasKit = existsSync(resolve(kit, 'packages/components/src/index.ts'));

// Pages, at the URLs they will have in Webflow (folder/index.html). A CMS
// template is built static from one real item, e.g.
// 'work/example-item/index.html'.
const pages = {
  home: 'index.html',
  styleGuide: 'design/style-guide/index.html',
  // The prototype canvas: the site at three breakpoints, with Inspect and
  // presence. A dev tool, never built in Webflow; needs kit.
  ...(hasKit ? { canvas: 'design/canvas/index.html' } : {}),
};

// <!-- @include partials/nav.html --> → that file's markup. Nav and Footer
// are one Webflow Component each; here they are one file each.
const includes = () => ({
  name: 'html-includes',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) =>
      html.replace(/<!-- @include ([\w/.-]+) -->/g, (_, file) => readFileSync(resolve(root, file), 'utf8')),
  },
});

// Webflow URLs have no trailing slash: serve /about from about/index.html.
const cleanUrls = () => ({
  name: 'clean-urls',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [path, query = ''] = req.url.split('?');
      if (path !== '/' && !path.includes('.') && existsSync(resolve(root, `.${path}/index.html`))) {
        req.url = `${path.replace(/\/$/, '')}/index.html${query ? `?${query}` : ''}`;
      }
      next();
    });
  },
});

// PROTOTYPE-ONLY: the canvas's page list. GET /__pages → every page in
// `pages` above (but the canvas itself) as { value: URL, label: its
// <title>, design: true for design/ pages }, in the order listed.
const pageList = () => ({
  name: 'page-list',
  configureServer(server) {
    server.middlewares.use('/__pages', (_req, res) => {
      const list = Object.values(pages)
        .filter((file) => file !== 'design/canvas/index.html')
        .map((file) => {
          const value = file === 'index.html' ? '/' : file.endsWith('/index.html') ? `/${file.slice(0, -'index.html'.length)}` : `/${file}`;
          let label = value;
          try { label = /<title>([^<]*)<\/title>/i.exec(readFileSync(resolve(root, file), 'utf8'))?.[1]?.trim() || value; } catch { /* keep the URL */ }
          return { value, label, ...(file.startsWith('design/') ? { design: true } : {}) };
        });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(list));
    });
  },
});

// Without kit, /design/canvas explains instead of failing to compile.
const canvasNeedsKit = () => ({
  name: 'canvas-needs-kit',
  configureServer(server) {
    if (hasKit) return;
    server.middlewares.use((req, res, next) => {
      if (!/^\/design\/canvas(\/|\/index\.html)?(\?|$)/.test(req.url ?? '')) return next();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><meta charset="utf-8"><title>Prototype canvas</title><body style="font:15px/1.5 system-ui;max-width:36em;margin:15vh auto;padding:0 1.5em"><h1 style="font-size:20px">The canvas needs kit</h1><p>The prototype canvas is built from kit (Weftly's design system), which is private and not part of this template. Point <code>WEFTLY_KIT</code> at a local kit checkout, or keep one at <code>${kit}</code>, then restart <code>pnpm dev</code>.</p><p>Every other prototype page works without it.</p></body>`);
    });
  },
});

// PROTOTYPE-ONLY: the canvas's "Update pictures" (All pages view) runs
// scripts/canvas-shots.mjs: POST /__canvas-shots, optional ?page=/path/;
// answers when the pictures are written.
const canvasShots = () => ({
  name: 'canvas-shots',
  configureServer(server) {
    let running = null;
    server.middlewares.use('/__canvas-shots', async (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      const page = new URL(req.url ?? '', 'http://x').searchParams.get('page');
      if (!running) {
        const { spawn } = await import('node:child_process');
        running = new Promise((done) => {
          const child = spawn(process.execPath, ['scripts/canvas-shots.mjs', ...(page ? [page] : [])], { cwd: root, stdio: 'inherit' });
          child.on('exit', (code) => done(code));
        }).finally(() => { running = null; });
      }
      const code = await running;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: code === 0 }));
    });
  },
});

// PROTOTYPE-ONLY: presence for the canvas. Claude Code hooks
// (scripts/presence-hook.mjs, registered in the workspace's
// .claude/settings.json) POST what each agent is doing to /__presence; the
// canvas gets every change live over Vite's socket (event "presence") and
// GETs the current list when it opens. Kept in memory: a restart clears it.
const presence = () => {
  const agents = new Map();
  return {
    name: 'presence',
    configureServer(server) {
      const list = () => [...agents.values()].sort((a, b) => b.at - a.at);
      const broadcast = () => server.ws.send({ type: 'custom', event: 'presence', data: list() });
      server.middlewares.use('/__presence', (req, res) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(list()));
          return;
        }
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 64_000) req.destroy(); });
        req.on('end', () => {
          try {
            const e = JSON.parse(body);
            if (!e || typeof e.id !== 'string') throw new Error('id');
            if (e.gone) agents.delete(e.id);
            else agents.set(e.id, { first: Date.now(), ...agents.get(e.id), ...e, at: Date.now() });
            broadcast();
            res.statusCode = 204;
          } catch {
            res.statusCode = 400;
          }
          res.end();
        });
      });
      // Agents silent for 30 minutes leave the list.
      setInterval(() => {
        const cut = Date.now() - 30 * 60_000;
        let changed = false;
        for (const [id, a] of agents) if (a.at < cut) { agents.delete(id); changed = true; }
        if (changed) broadcast();
      }, 60_000).unref?.();
    },
  };
};

export default defineConfig({
  plugins: [includes(), cleanUrls(), pageList(), canvasNeedsKit(), presence(), canvasShots()],
  resolve: {
    // One React for the page and kit (kit's own node_modules has a copy).
    dedupe: ['react', 'react-dom'],
    alias: hasKit
      ? [
          { find: /^@weftly\/components\/styles\.css$/, replacement: resolve(kit, 'packages/components/src/styles/index.css') },
          { find: /^@weftly\/components$/, replacement: resolve(kit, 'packages/components/src/index.ts') },
          { find: /^@weftly\/editor\/styles\.css$/, replacement: resolve(kit, 'packages/editor/src/styles.css') },
          { find: /^@weftly\/editor$/, replacement: resolve(kit, 'packages/editor/src/index.ts') },
        ]
      : [],
  },
  esbuild: { jsx: 'automatic' },
  server: { fs: { allow: [root, ...(hasKit ? [kit] : [])] } },
  build: {
    rollupOptions: {
      input: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, resolve(root, v)])),
    },
  },
});
