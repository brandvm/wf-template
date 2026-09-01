# Brand Vision — Webflow custom code template

TypeScript + esbuild toolchain for Webflow client sites.
Dev = localhost live reload · Staging = auto-deploy on push · Prod = pinned jsDelivr tag.

## New project checklist

1. Use this template → create repo `wf-<client>` (public)
2. `package.json` → change `"name"`
3. Repo Settings → Pages → Source: **GitHub Actions**
4. Paste the loader (below) into Webflow → Site settings → Footer code,
   with this repo's URLs → publish to staging

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

Then bump `@X.Y.Z` in the Webflow footer loader → publish staging → verify → publish prod.
Rollback = revert the version string. Never use `@latest` or branch URLs in prod.

## Loader (Webflow Site settings → Footer)

See `loader.html` in this repo — replace ORG/REPO and the version.

## Handoff (site leaving the agency)

Build → paste `dist/index.js` inline into Site footer, CSS inline into head →
remove loader + external tags → publish → zip `src/` for the client → archive repo.
