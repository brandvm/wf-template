# Brand Vision — Webflow custom code template

TypeScript + esbuild toolchain for Webflow client sites — JS **and** CSS.
Dev = localhost live reload · Staging = auto-deploy on push · Prod = pinned jsDelivr tag.

Source files: `src/index.ts` (bundled to `dist/index.js`) and `src/styles.css`
(minified to `dist/styles.css`). Both ship together under one version tag.

## New project checklist

1. Use this template → create repo `wf-<client>` (public)
2. `package.json` → change `"name"`
3. Repo Settings → Pages → Source: **GitHub Actions**
4. Repo → Settings → Collaborators and teams → add the `developers` team (Write)
5. Paste the JS loader (see `loader.html`) into Webflow → Site settings → Footer
   code, and the pinned CSS `<link>` into Site settings → Head code, with this
   repo's URLs → publish to staging

## Daily

- `pnpm install` once per machine, then `pnpm dev`
- On the `.webflow.io` site: `localStorage.setItem('bv-dev','1')` → your browser
  loads localhost with live reload. `localStorage.removeItem('bv-dev')` to exit.
- `git push` → client-facing staging bundle updates in ~1 min (no Webflow publish)

## Release (launch / retainer updates)

```
pnpm build
git add dist && git commit -m "release: vX.Y.Z"
git tag vX.Y.Z && git push && git push --tags
```

Then bump `@X.Y.Z` in BOTH Webflow spots (footer loader `VER` + head CSS link)
→ publish staging → verify → publish prod.
Rollback = revert the version strings. Never use `@latest` or branch URLs in prod.

**Tag rules (learned the hard way):** `dist/` must be committed *before* the tag
is pushed, and a pushed tag must **never** be moved (`tag -f`) — jsDelivr
snapshots a version once and keeps it forever; a half-baked snapshot is
permanent. Botched release? Cut the next patch version instead.

## Loader (Webflow Site settings → Footer + Head)

See `loader.html` in this repo — replace REPO and the version. The footer
script handles JS in all three environments and overrides the CSS on
staging/dev; the head `<link>` is the pinned production CSS.

## Auditing before launch

Before shipping, check every JS module and CSS block against the live markup —
modules whose selectors/attributes appear on no page are dead weight
(the TeraWulf migration dropped 5 of 7 inherited modules this way).

## Handoff (site leaving the agency)

Build → paste `dist/index.js` inline into Site footer, CSS inline into head →
remove loader + external tags → publish → zip `src/` for the client → archive repo.
