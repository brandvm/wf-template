# Lessons: Loader, release and CI

The three snippets, releases with jsDelivr tags, and the CI checks.

Harvested from client builds made from this template (`Scope:
template-candidate` entries in their `GOTCHAS.md`). Module and file names
refer to the project the lesson came from; Status is that project's.

### 2026-10-02 · Filling in REPO in loader.html breaks the browser tests
- Area: ci
- Symptom: The first push after setup fails `pnpm test` with
  `Expected: "https://<org>.github.io/wf-example/"`, `Received:
  ".../<repo>/"`, so staging never deploys.
- Cause: `tests/environment-switcher.spec.mjs` replaced the `REPO`
  placeholder with `wf-example` and hardcoded that name in `stage` and
  `release`. The README checklist tells every project to fill in `REPO`,
  so the replacement no longer happens and the hardcoded URLs no longer
  match the bundle's.
- Fix: the test reads the repo name back from `var SITE = "…"` in the
  loader and builds `stage`/`release` from it. That works whether or not
  REPO has been filled in.
- Status: fixed in this repo (same commit as this entry); not upstreamed
- Found by: claude

<!-- Add new entries here, newest first. -->

### 2026-10-06 · Body Embed stylesheet: page paints unscaled, then jumps
- Area: loader
- Symptom: the designer saw the hero (and every page) flash. A filmstrip showed
  the first paint at Webflow's 16px with a fallback font, then a jump to
  the repo's fluid scale once repo CSS arrived; `styles.css` was fetched three times.
- Cause: repo CSS comes from a `<link>` in a body Embed, which doesn't block
  rendering like a head stylesheet; the Embed script and the footer loader
  each rewrote its href with a new `Date.now()`, and every href change
  drops the sheet and fetches it again (the cancelled fetch also fires
  `error`); Inter (`font-display: swap`) loaded late.
- Fix: loader.html — head code preloads the Inter woff2, adds
  `html.wfc-css-wait body { visibility: hidden }` (3 s fallback) and one
  shared `WFC.v` cache-buster; the Embed script leaves the static link for
  the canvas and appends a fresh `#wfc-css` link with the final URL, whose
  load/error lifts the wait; the footer loader only sets the href when the
  URL really differs. Verified by serving staging with the patched snippets.
- Status: fixed in loader.html; the snippets had to be re-pasted
- Found by: human + claude

### 2026-10-02 · Static localhost link is requested by public visitors
- Area: loader
- Symptom: Published pages request `http://localhost:3000/styles.css`; can
  block render and trigger Chrome's local-network-access prompt.
- Cause: The canvas Embed carries a static localhost `<link>` so the
  Designer can see local CSS; the script that removes it runs after the
  browser has already started the request.
- Fix: two projects removed the static link independently and create it from script only in dev mode. Trade-off: the
  canvas then shows staging CSS only.
- Status: fixed in the template — the Embed has no static localhost link; the dev link is created by script in dev mode only
- Found by: human

### 2026-10-02 · VER lives in two snippets and a placeholder 404s at launch
- Area: release
- Symptom: Prod CSS and JS both 404 the moment a custom domain is attached.
- Cause: `VER = "X.Y.Z"` is never exercised on `*.webflow.io`, and a release
  must bump VER in both the Embed and the footer snippet.
- Fix: one project kept a single `RELEASE` value in the head config (`null` until the
  first tag) that the other snippets read.
- Status: fixed in the template — one RELEASE in head code; null serves staging with a console error instead of 404ing
- Found by: human

### 2026-10-02 · The add -f dist / untrack release ritual is error-prone
- Area: release
- Symptom: Empty release tags, re-cut versions, `dist/` swept into unrelated
  commits.
- Cause: `dist/` is gitignored except in release commits. One project re-cut
  v1.1.1 with a tree identical to v1.1.0.
- Fix: three projects committed `dist/` permanently and fail CI on
  `git diff --exit-code -- dist`.
- Status: fixed in the template — dist/ is committed; CI fails on drift; dev builds stay in memory
- Found by: human
