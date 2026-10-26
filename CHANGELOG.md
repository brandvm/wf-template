# Changelog

Versions of the template itself. A repo created from it records the
version in `.wf-template.json` (`version`); `pnpm update-skills` brings its
skills up to a newer one and records that under `skills`. Template releases
are tagged `vX.Y.Z` in this repo (they have nothing to do with a client
repo's own release tags).

Releases are tagged from 0.2.0 on; `pnpm update-skills` follows the latest
tag (master only when there is none). Tag a commit whose CI passed, and
never move a pushed tag. Bump the version in `.wf-template.json` and add an
entry here in the same pull request as the change: patch for fixes and wording, minor for new
checks, scripts or lessons, major when a client repo has to change something
by hand to follow (e.g. the loader snippets).

## 0.8.0 — 2026-10-20

Harvested from a live-site optimization (a site taken from mobile 60 to 93
and desktop 86 to 96 on its home page). One loader fix, one recipe change,
one script fix and eleven lessons.

**For client repos:** `pnpm update-skills`. To take the loader fix,
re-paste piece 1 (head code) from `loader.html` with your `RELEASE`, and
publish; pieces 2a, 2b and 3 are unchanged. Copy the Finsweet recipe's
`finsweet.ts` into `src/modules/` if the project uses it.

- **Loader (piece 1):** on a release domain the head code writes the
  pinned stylesheet into `<head>` and re-points Embed 2a at it as the
  parser inserts it. Production no longer waits for the staging sheet on
  GitHub Pages and then swaps (closes the 2026-10-09 lesson). New test:
  first paint waits for the release sheet (delayed 1 s) and not for
  GitHub Pages (delayed 3 s); it fails on 0.7.1's loader and on a version
  that only re-points 2a, which painted before the CSS (CLS 0.17–0.31).
  If the release sheet fails (jsDelivr down or blocked), 2a goes back to
  its staging sheet, so the page stays styled as it did on 0.7.1 (new
  test). The head code uses `document.write` on purpose; Lighthouse lists
  it under Best Practices.
- **Finsweet recipe:** each attribute starts when one of its elements is
  within two screens of the viewport, or on first input, instead of at
  load (a list nest fetched seven item pages at load). `resetFinsweet()`
  cancels any still waiting, so a page transition never starts one late.
  An attribute used only inside a hidden element starts on first input
  (Known issues in the recipe).
- **`wf:baseline compare`:** compares the new screenshot's PNG height
  with the saved one, not the pre-scroll `scrollHeight` (every page that
  grows as it loads was reported as changed).
- **Lessons:** IX3 replay corrected (no `position` = 0, not append; empty
  actions skipped; default 0.5 s; hidden actions left out of the
  published chunk); bundled GSAP plugins registering on Webflow's
  `window.gsap`; lazy ScrollTrigger builds with hidden and re-rendered
  triggers; reserving space for an async form; Finsweet list nesting;
  deferring GTM (and its cost); the `0fr` grid row padding; replacing a
  font through the API (another host; don't preload it); proving a CMS
  field unused; `set_attributes` on Images (`loading` works, `sizes` and
  `crossorigin` fail); the Embed 2a lesson closed with the shipped fix.

## 0.7.1 — 2026-10-19

A check of 0.6.0 and 0.7.0: every harvested source was confirmed committed
(or, for the unversioned prototype folders, finished and documented), and
every recipe was run in a browser against the real libraries (gsap 3.15,
lenis 1.3, @barba/core 2.10), not only type-checked.

**For client repos:** `pnpm update-skills`. Copy the `:where(button)` rule
from §02 of `src/styles.css`, and `scripts/measure-type.mjs` plus its
package script into `../prototype`, if wanted.

- **Barba recipe fix:** Barba 2.10 removes the leaving container only
  after `afterEnter`, so page modules started there bound the old page's
  elements (and its ScrollTriggers). `afterEnter` now removes it first.
  Navigation, head sync, current links, focus, `dataLayer`, teardown,
  Webflow re-init, hash and `prevent` all checked in a browser.
- **Removed:** the before/after report template added to webflow-audit in
  0.7.0. Its source was an interim draft not yet committed in the project
  it came from; the Close step is back to its 0.6.0 text.
- **Starter CSS §02:** `:where(button)` inherits `letter-spacing` and
  `word-spacing`. Text in a button no longer loses its parent's tracking.
  A Designer tag style or class still wins: zero specificity.
- **`pnpm measure:type`** (prototype): the style guide's type as rendered
  at 1440 and 390 (size, line height, tracking, weight, case, family).
  The style-guide generator now writes `data-sg-type` on each typography
  specimen; the starter's style guide is regenerated with it.

## 0.7.0 — 2026-10-19

Tier 2 and 3 of the 2026-10-19 harvest from client builds.

**For client repos:** run `pnpm update-skills` (it brings `build.mjs`,
`scripts/phosphor.mjs`, the `subset-font` devDependency and the new `wf:*`
scripts; run `pnpm install` after). No loader snippet changed. An existing
`../prototype` is a copy: take the new files from
`.claude/skills/webflow-prototype/prototype-starter/scripts/` and its
package.json scripts by hand. §04 of `src/styles.css` changed (scroll lock
on `html` only): copy that rule if the repo still locks `body`.

- **`pnpm wf:overflow`:** loads each page at 13 widths from 2560 to 360
  (`overflow.widths`). Reports sideways scroll and every element whose
  visible right edge passes the viewport, named by class chain. Skips
  clipped content, off-canvas menus and hidden elements; `--why` lists
  what was skipped, `overflow.ignore` adds selectors. Clean on two client
  sites at all widths.
- **`tests/loader.check.mjs`:** the loader pieces run in `node:vm` with no
  browser: host detection, blocked storage, missing config, RELEASE null
  or set, preconnect origin, fallbacks. Part of `pnpm test`.
- **`pnpm phosphor --subset`:** keeps only the icons used (`src/**`,
  `phosphor.icons`, `--icons`, or the published pages with
  `--from <url>`). The font is cut to those glyphs with `subset-font`
  (hundreds of bytes instead of ~150 KB) and inlined as a data URL. Names
  that aren't icons are reported. The full font stays the default; a new
  icon needs a re-run.
- **`build.mjs`:**
  - accepts `{ in, out }` entry points (the dev log no longer breaks);
  - defines `__WFC_VERSION__` from `package.json`;
  - writes `dist/version.json` (a content `hash`, and the version when
    `package.json` has one; `--stamp` adds `commit` and `built`).
- **Prototype:**
  - `pnpm css:published` builds the CSS and a stand-in snapshot from a
    site's published CSS when there is no connector (GET only, per-page CSS
    merged), and lists what it can't recover;
  - `pnpm screens` takes screenshots at the check widths and reports
    overflow and errors from 2560 to 360;
  - `pnpm check:states` checks keyboard focus, the mouse focus ring and the
    pressed state of every control, with no selectors to list;
  - `check-drift` shares the published-CSS parser;
  - `check:style-guide` fails when a combo doesn't sit on one element.
- **Recipes:**
  - `barba`: page-transition skeleton. Syncs head and current links,
    re-inits Turnstile and Webflow, announces the title and moves focus,
    sends a GTM page view, and tears modules down per page with
    `ScrollTrigger.sort()`.
  - `smooth-scroll`: one shared GSAP + Lenis setup. Off under reduced
    motion, handles nested scrollers, and passes the instance rather than
    reading `window.lenis`.
  - `modal`: portal, inert, focus trap, `#hash` openers, scroll lock on
    `html` only.
  - `snippets`: count-up, marquee, FAQ, CMS tabs, dropdown close,
    resize-reload, page-loader backstop, IX3 fallback.

  All are linked from webflow-build SKILL.md.
- **conventions.md:**
  - §16 Motion and Webflow interactions: CSS first, then a module; never
    hide first-screen content waiting for JS; the IX3 fallback; the
    page-loader failsafe.
  - §17: an optional split stylesheet.
- **Starter CSS:** the loading scroll lock is on `html` only. A locked
  `body` became the scroll container and un-stuck sticky headers.
- **Handoff and docs:**
  - new `docs/handoff/REVIEW.md` and `SEO-PLAN.md`;
  - an SEO plan section in webflow-launch;
  - the `data-manual-todo` marker for manual steps;
  - a looping background video section in `media.md`;
  - a plain-language before/after report template in webflow-audit
    (removed again in 0.7.1: its source was an interim draft).
- **`wf:perf`:** extra Chrome flags from `WF_PERF_CHROME_FLAGS`.
- **AGENTS.md:** `rename_variable` works; a create can come back suffixed.
- **Lessons:** 15 new entries and 7 updated ones from seven more client
  builds. Topics include:
  - WHTML imports: conditional visibility, section ids, new-tab links;
  - links and nested link styles in CMS rich text;
  - template JSON-LD;
  - component variant classes;
  - capped bleeds;
  - Finsweet List counts and filters;
  - scroll locks on `html` only;
  - consent managers blocking the bundle;
  - HubSpot CAPTCHA forms;
  - WebGL before first paint;
  - local Lighthouse network flags.

## 0.6.0 — 2026-10-19

Harvested from five client builds and the org's other repos.

**Manual step for client repos, once:** run `pnpm update-skills`, then
re-paste all three loader snippets (head code, Embed 2b, footer code) into
Webflow and publish. Embed 2a is unchanged. The new starter modules and
recipes are not copied by `update-skills`: copy `src/modules/aria-roles.ts`,
`placeholders.ts` and `unique-form-ids.ts` if the site needs them.

- **Loader.** On staging, 2b keeps the stylesheet 2a already fetched and
  swaps in a cache-busted copy only after `load`. The second,
  render-blocking request before first paint is gone; CLS on staging
  went from ~0.18 to 0.005 on the site it came from. The footer loader
  re-points the sheet only when the bundle comes from another origin.
  The head code preconnects to the bundle's own origin instead of a fixed
  jsDelivr pair. It also treats `*.canvas.webflow.com` (the Designer's
  custom-code preview) as staging. New tests in
  `environment-switcher.spec.mjs`.
- **`pnpm wf:seo`:** checks every page in the sitemap (or crawled from
  `pages`), on staging or `--live`. Fails on:
  - a missing title, meta description or OG tag;
  - not exactly one H1;
  - JSON-LD that doesn't parse or contains an HTML entity (`&#39;`);
  - with `--canonical`, a missing canonical.

  Indexable pages only; it tells an empty tag (a blank CMS field) from a
  missing one. Lists noindex pages; with `--live` they fail unless
  `seo.noindexOk` allows them, and so does a noindex page listed in
  `sitemap.xml`.
- **`pnpm wf:install`:** compares the snippets Webflow publishes with
  `loader.html`, ignoring `RELEASE` and the org and repo. Fails on drift, a
  jsDelivr URL pinned to a version other than `RELEASE`, a
  second viewport meta, duplicate Finsweet Attributes tags, or any request
  to localhost.
- **`pnpm wf:parity`** and a "Migrating a live site" section in
  webflow-build: renders each page as published and again with the old
  custom-code assets (`parity.oldAssets`) served from `dist/`, then
  compares every element's computed style and box at each width. Reach
  parity first, improve after. Adds a "Migration parity" gate in
  `checklists.md`.
- **Starter modules:**
  - `aria-roles` (`data-aria-role`);
  - `placeholders` (`data-placeholder`);
  - `unique-form-ids` (radios and checkboxes in a CMS list publish the same
    id; labels' `for` follows).

  The conventions already described them, but the template didn't ship
  them. Tested in `tests/modules.spec.mjs`.
- **Video recipe (`recipes/video/`):** autoplay video that loads late,
  plays only on screen, honours reduced motion and the visitor's pause,
  and retries on the first tap after a refused autoplay. Also an optional
  failed state, a WCAG 2.2.2 `data-video-toggle` button, and CSS that
  hides Safari's Low Power Mode play glyph.
- **Anchor-scroll recipe (`recipes/anchor-scroll/`):** replaces
  webflow.js's `click.wf-scroll` so in-page links clear sticky and fixed
  bars, with an optional Lenis instance.
- **Prototype port per project:** `pnpm new-project` picks a port from the
  slug (5200–5999) and writes it to `prototypeUrl` and the prototype's
  `dev` script, which now uses `--strictPort`. Two clients' prototypes no
  longer collide on 5173, and a busy port can't move silently.
- **Lessons:** 33 new entries and 4 corrected ones. Topics include:
  - Barba forms and head tags after a page change;
  - pin order;
  - `window.lenis`;
  - iOS Low Power Mode video;
  - CMS list and template limits through the API;
  - page SEO tokens;
  - bulk CSV import;
  - variable modes and inherited text colour;
  - duplicate ids;
  - the two loader fixes above.

  `figma.md` covers video fills and clipped layer screenshots.

## 0.5.1 — 2026-10-16

- **Licensed MIT No Attribution (`LICENSE`).** Anyone may use, change,
  share and sell the template, for client work or anything else, with no
  attribution required. The licence covers every earlier version too.
- **`THIRD-PARTY-NOTICES.md`:** the ISC notice of Finsweet's
  developer-starter, which the template began from, and where the Phosphor
  (MIT) and Geist (OFL) licences are. Keep it in every repo made from the
  template; `pnpm update-skills` adds it to repos that lack it (on the run
  after the script has updated itself).
- `pnpm new-project` removes `LICENSE` from a client repo and sets its
  `package.json` licence to `UNLICENSED`, so the client's own code is not
  released under MIT-0.
- `CONTRIBUTING.md` and the pull request template: contributions are
  accepted under the same licence.

## 0.5.0 — 2026-10-13

**Manual step for client repos, once:** replace `scripts/update-skills.mjs`
with this version (copy it from the template), then run
`pnpm update-skills`. From then on the script updates itself.

- **`pnpm update-skills` brings the tooling too.** Besides the skills it
  now replaces the template's own files (`build.mjs`,
  `scripts/update-skills.mjs`, `scripts/phosphor.mjs`,
  `scripts/check-repo.mjs`), adds the package scripts and devDependencies
  a repo lacks, and seeds the icon font (`src/phosphor.css`,
  `src/phosphor/`, the import in `src/styles.css`) when it is missing.
  It lists every change first; `--skills-only` keeps the old behaviour;
  `--from <folder>` reads a local copy of the template. The Phosphor
  parts of 0.4.0 no longer need copying by hand.
- **`pnpm check:drift`** (prototype): compares the snapshot with the
  stylesheet the staging site publishes and lists variables and classes
  that exist on one side only and every value that differs, per
  breakpoint, state and mode. Taking the snapshot is still done through
  the connector; this is what tells you it is right and when it has gone
  stale. Its first run found a stale class in the starter's own snapshot.
- **`pnpm fig <file.fig>`** (prototype): reads a saved Figma file when
  there is no connector: pages, frames, layers, auto layout, text, fonts,
  colours, images (`webflow-prototype` › figma.md).
- **Starter site:** status colours get an `On Dark` twin and the Dark
  mode of `Status/*` points at it (the base colours were 3.4–3.8:1 on the
  dark background); the utility set is filled in (Weight Regular and
  Bold, Leading Snug and Normal, Tracking Tight, Text Accent, Center and
  Balance); Form Input is documented as the one class for inputs, selects
  and textareas, with the combo Is Textarea; C | Video takes an optional
  WebM source (props WebM and Has WebM).
- Style guide generator: a specimen name may contain a pipe
  (`name=C | Button` was read as "C").

## 0.4.5 — 2026-10-13

No manual step for client repos.

- One icon component: **Icon** (the colour layer, the one to insert) wraps
  **Icon Size** (was Icon). Color variants gain Success, Warning and Error.
- New variables: `Colors` › `Status/Success`, `Warning`, `Error` and the
  semantic `Status/*` roles that point at them. Starter site, snapshot,
  specimens and docs updated.

## 0.4.4 — 2026-10-13

No manual step for client repos.

- Icon sizes are named by pixel size at 16px text (12px, 16px, 20px, 24px,
  32px, 48px, 64px) and valued in em, replacing Small … XXL.
- New **Icon Color** component: wraps Icon with Inherit, Primary,
  Secondary and Accent variants bound to the semantic text colours.
  Starter site, snapshot, specimens and docs updated.

## 0.4.3 — 2026-10-13

No manual step for client repos.

- Icon alignment: Webflow publishes the space inside the icon glyph as a
  non-breaking space, which shifted the glyph when its box centred its
  content. Icon Glyph now aligns to flex-start (starter site, snapshot,
  specimens); the recipe, canvas hygiene and a lesson explain why.

## 0.4.2 — 2026-10-13

No manual step for client repos.

- Finsweet recipe: `searchable-select.md`, a searchable select on a
  Webflow Dropdown with Combo Box. Element by element structure, the same
  as prototype markup, the Designer values that cancel Webflow's form and
  dropdown defaults, how it behaves (sorted by value, drives List Sort)
  and what to check. It is a recipe, not a starter component.

## 0.4.1 — 2026-10-13

No manual step for client repos.

- The Icon glyph holds a single space as its text, as Phosphor's own
  Webflow component does, so the Designer canvas doesn't show it as an
  empty element. Canvas hygiene, the Phosphor recipe and the prototype
  specimens say so.

## 0.4.0 — 2026-10-13

No manual step for client repos (`pnpm update-skills` brings the recipe
and the lessons). A client repo that wants the icon font copies
`scripts/phosphor.mjs`, the `phosphor` script, the `loader` and
`assetNames` lines of `build.mjs` and the `@import` at the top of
`src/styles.css`, then runs `pnpm phosphor`.

- **Phosphor Icons in the bundle.** `styles.css` ships the regular weight
  as an icon font (about 75 KB of CSS before compression, plus one 144 KB
  font that loads only where an icon shows). `pnpm phosphor regular bold`
  picks the weights per site, `pnpm phosphor none` removes it. Nothing is
  installed: the script downloads the pinned version's two files per
  weight. Recipe: `webflow-build/recipes/phosphor/`.
- **Control components on the starter site** (`starter-site.md` §D2):
  Icon (a 1em glyph box with size variants), C | Button as four
  single-class layers (Button › Button Color › Button Size › Button
  Content) with icon before or after the label, C | Icon Button, C | Video
  and Section Head. The old Button class is now the plain outer wrapper;
  its Is Secondary combo is the Secondary variant of Button Color. Forms
  get Form Field and Form Input classes with focus states.
- The prototype starter mirrors them: snapshot, generated CSS, style guide
  specimens (a Components section), and the pinned Phosphor stylesheet as a
  prototype-only stand-in. `wf:preflight` knows the icon font's classes.
- Conventions §10: start from the starter's components; searchable
  selects, accordions, sliders and lightboxes are built when needed.
- Two lessons: building nested components through the MCP; `set_text` on
  imported blocks and remove-then-set in one style update.

## 0.3.2 — 2026-10-13

No manual step for client repos.

- The Current state of a class can be written through the WHTML importer
  (`.class.w--current` in its `css`), on a new class only; the style
  guide skill and a lesson say how. The starter's Sg Sidebar Link has it.
- Starter site SEO settings are written down (`starter-site.md` §G):
  subdomain indexing off, auto-generated sitemap on. Excluding the design
  pages from the sitemap needs a site plan; `webflow-launch` checks it
  before launch.

## 0.3.1 — 2026-10-13

No manual step for client repos. Changes that came out of building the
style guide on the starter Webflow site.

- **Style guide layout:** no monospace font (every label uses the site's
  font; a system monospace brings its own slashed zero); the theme frame
  has no maximum height, so a section shows with its full padding; colour
  dots in tables are a wrapper (**Sg Dot**) around a swatch, not a
  three-class combo; the Forms section is anchored as `form-elements`
  (Webflow refuses `forms` as an element id; items still use
  `section=forms`).
- **Two h1s are allowed on the style guide** (it is `noindex`): the
  Typography section shows a real h1 for the All H1 Headings tag style, and
  specimens keep their h1.
- **Type scale:** every weight from `Weight/Thin` (100) to
  `Weight/Black` (900) is a variable, in order. No new classes; roles
  still use Regular, Medium and Bold.
- **Starter Webflow site** (done, `starter-site.md` §A, §E, §F): Geist
  uploaded as a custom font with `ss03` and `ss08` on the Body style;
  the weights; the style guide page in the fixed layout with all Sg
  classes and variable combos; a media page shell; and the Layout modes
  set on Body at each breakpoint (they were missing, so layout values
  never changed with the breakpoint).
- Four new lessons in `lessons/mcp.md`: importing with `css` creates
  classes; `id="forms"` is dropped; reordering variables by swapping
  slots; a collection's modes do nothing until a style sets them.

## 0.3.0 — 2026-10-13

The workflow is now one skill per phase, with the style guide first, new
gates and five new checks.

**For a client repo already in use** (two steps by hand, once; a repo
created from this version needs neither):

1. Copy `scripts/update-skills.mjs` from the template, then run
   `pnpm update-skills`. The new script also adds the new `wf:*`
   shortcuts to `package.json` and links the new skills in the workspace
   folder; the old one copies the skills only.
2. A prototype folder made before this version keeps its own copies of
   the old style guide scripts. To move it to the fixed layout, copy
   `scripts/skill.mjs`, `scripts/check-snapshot.mjs`,
   `src/modules/style-guide-nav.ts` and the `style-guide`,
   `check:style-guide` and `check:snapshot` scripts in `package.json`
   from the prototype starter, then move what was in
   `design/style-guide/components.html` into items or page blocks.

Skills:

- **`webflow-prototype` (new, split out of `webflow-build`):** project
  setup, the inputs, the localhost prototype and the handoff pack. It never
  writes to Webflow. `prototype-starter/` and `figma.md` moved into it;
  `pnpm new-project` copies the starter from there. It ends with a
  **Prototype handoff** gate and the message that starts the build session.
- **`webflow-build`** now covers the Webflow build only. The rules every
  skill shares (standing rules, wrap-up, handing work over, contributing)
  are one file, `webflow-build/rules.md`.
- **`webflow-audit` (new):** a site that is already live. Read-only audit
  (baselines with a noise floor, speed medians, accessibility, links,
  published HTML, SEO, inventory), a tracker in the client's wording, a
  rollback point, a parity release, then small batches: staging, verify,
  "what else would go live", the person types "publish", verify
  production. Also the short procedure for a one-off fix.

Order and gates:

- **Build order:** variables → tag styles → classes → CMS → repo port and
  loader → the style guide page → the media page (when a page plays a
  video) → components from real page markup → pages → style guide final
  check. In the prototype the style guide is also the first page.
- **New gates:** Prototype page done (tablet and phone, states, outline,
  keyboard, every way of arriving, pre-flight), Prototype handoff,
  Foundation done, Media done, Component done. **Before the prototype**
  gains the component plan and the video list; **Build handoff** gains the
  style guide final check and the speed numbers.
- **Media page** (`webflow-build/media.md`): `/design/media`, where a
  person uploads each video as a Background Video so Webflow converts and
  hosts it; the real pages play the hosted files through the Video
  component.
- **Rules:** publishing is split (new build: staging is fine; live site: a
  publish is site-wide, wait for the word "publish"); after every Webflow
  write batch say "reload the Designer" and what is not published; scripts
  live in the repo; the wrap-up report has a fixed short shape.
- `docs/handoff/MANUAL-TODO.md` opens with the seven kinds of step to
  expect, so they are found at the start and not at the end.

Checks (`pnpm wf:*`, in `webflow-build/scripts/`):

- `wf:preflight`: reads the prototype's markup and reports what the
  importer or the publisher will change, as FIX (change the markup now) or
  PLAN (a known extra build step). `--strict` gates the handoff.
- `wf:styles`: sorts every declaration of the new classes into what the
  connector can create, what a person sets by hand in the Designer, and
  what goes to repo CSS, in creation order. It replaces a converter that
  was written in a session's scratch folder on an earlier build and lost.
- `wf:html`: the published page against what the build expects: default
  field names, links standing in for buttons, a variant whose class is on
  no element, classes no stylesheet defines, script hooks the prototype has
  and the published page lost.
- `wf:perf`: Lighthouse as the median of several runs, mobile and
  desktop, with the range (Lighthouse is fetched by npx, not a dependency).
- `pnpm check:snapshot` (prototype): the hand-written snapshot is
  consistent (every alias and binding resolves, modes exist) and the
  generated CSS matches it.
- `pnpm update-skills` also adds new `wf:*` shortcuts to `package.json`
  and links new skills in the workspace.
- Prototype starter: the nav partial is a plain placeholder (its made-up
  classes had no CSS), so a new project passes the pre-flight.

Not in this version: an automatic export of the Webflow snapshot (it is
still written from the connector's output; `check:snapshot` checks it),
and reading a `.fig` file without the Figma connector.

Style guide:

- New skill `webflow-style-guide`: the style guide page has one layout on
  every site. A sticky sidebar lists the sections; each section is a list of
  rows (name, class and note on the left, the live specimen on the right).
  Eleven sections in a fixed order (`scripts/sections.mjs`); a section with
  no content is left out, nothing can be added. The page's own layout is the
  skill's `sg.css` (Sg classes only, no project class in the frame).
- The generator and the check moved from the prototype starter into the
  skill (`scripts/gen-style-guide.mjs`, `check-style-guide.mjs`), so
  `pnpm update-skills` updates them for every project. The prototype runs
  them through `scripts/skill.mjs`.
- Specimens replace the hand-written `components.html`: items in
  `design/style-guide/items/*.html`, or `<!-- sg:start … -->` blocks taken
  from the real pages, which stay in step with them. Specimens lose their
  ids and script hooks and are `inert`. Page sections show at half size.
- Colour and radius swatches use one generated combo per variable instead
  of inline styles, so the prototype page and the Webflow page are built
  the same way (the importer turned each inline style into a junk combo).
- `pnpm check:style-guide` also fails on an unknown or out-of-order
  section, a sidebar that doesn't match the sections, a section without
  rows, more than one h1, or an inline style.
- The style guide is the first page built, in the prototype and in Webflow;
  every later class or component adds its row in the same piece of work.
  `webflow-build/style-guide.md` is removed; `conventions.md` §12,
  `starter-site.md` §E and the prototype starter README point at the skill.
- The style guide follows whatever variables a site has: the template's
  collections, names and values are a standard, not a limit
  (`conventions.md` §4, `starter-site.md` §A). Collections named
  differently are mapped in `design/style-guide/config.json`; collections
  the generator doesn't know are shown as tables. The Typography section
  also shows the native tag styles (headings, paragraphs, links).
- The layout is written for someone new to the site: Overview explains how
  to use the page (four cards), then shows counts, fonts, variable
  collections and breakpoints; every section opens with its number, title
  and one line on what it is for; specimens sit on a panel, class names
  read as code, a row's name stays in view beside a long table, and each
  spacing variable has a bar of its size (one more generated combo family,
  Sg Bar + Is …).
- Default font: **Geist** (`Typography Scale` › `Family/Base`), with
  `font-feature-settings: "ss03" on, "ss08" on` on the Body
  tag style. The font is the official variable file, shipped in the
  prototype starter's `public/fonts/` with its licence and uploaded to
  Webflow as a custom font: Google Fonts' build of Geist has no stylistic
  sets. A project with its own typeface replaces it. This also fixes the starter
  snapshot, whose `Family/Base` held a whole font stack: a font variable
  holds one family name, so the generated CSS quoted the stack as a single
  (invalid) family and pages fell back to a serif. **The starter Webflow
  site still needs the same change** (upload Geist in Site settings › Fonts,
  set `Family/Base` and the Body style's font features), and the style guide frame (`starter-site.md` §E).
- Prototype starter: default button and form specimens, and
  `style-guide-nav.ts` (the sidebar's current-section highlight; Webflow
  does this with the link's Current state).

## 0.2.0 — 2026-10-09

Client repos must re-paste loader pieces 2b and 3 (footer code) into
Webflow and publish to get the stylesheet swap fix; nothing else needs a
manual step.

- Loader: piece 2b swaps the stylesheet without an unstyled gap
  (`WFC.setCSS`: the target loads next to the current sheet, the old one
  goes on load and stays on error, the id moves at once, an unchanged URL
  is a no-op); piece 3 uses it, with a plain-href fallback. Assigning a
  new href caused a full-page layout shift (desktop CLS 0.2–0.5, back to
  ~0.001). New `tests/css-swap.spec.mjs`.
- `AGENTS.md` › Snippets are not versioned and README › Release:
  `loader.html` matches what is installed except `RELEASE`, which stays
  `null` in the repo. `AGENTS.md` › Webflow MCP limits: the WHTML importer
  turns `style` attributes into `inline-div-N` combos.
- Prototype starter: `gen-webflow-css.mjs` emits the `large`/`xl`/`xxl`
  (min-width) breakpoints and `.w--current` / `.w--redirected-*` states;
  `gen-style-guide.mjs` fixes (`.sg-grid` stretch, `.sg-tile` max-height,
  `.sg-bar` max-width, `Radius/` group in the Radius section, `nameOf` on
  `---` slugs); `prototype.css` element stand-ins in `:where()` so a
  site's real tag styles win.
- Lessons: loader/release (stylesheet swap CLS, RELEASE stays null, the
  render-blocking staging link in Embed 2a — open, with a proposed fix,
  parity checks vs Lighthouse CLS, Lighthouse and reduced motion); mcp
  (`inline-div-N` combos, API uploads stuck at size 0, CMS image URL
  re-hosting, box-shadow with a variable); designer (image Load setting
  and preload); css (the two prototype starter fixes).
- Lessons from adopting the template on a live site: mcp (asset upload
  without a public URL, `set_attributes` on Image elements, `publish_site`
  domain ids and rate limit), designer (CMS bindings in JSON-LD, phone hero
  video framing), css (measure preloads), js (moving off IX3, Finsweet
  outside index.js). Merged with the loader entries above: one entry for
  the Embed 2a staging link (render-blocking and a second download), one
  for RELEASE in the repo.
- `style-guide.md`: swatches are built with one combo per colour role;
  never import `style=""` markup (it becomes `inline-div-N` combos).

## 0.1.0 — 2026-10-08 (not tagged)

- Toolchain: esbuild bundle and stylesheet, module manifest with `run()`,
  three-snippet loader with a single `RELEASE`, environment switcher,
  Playwright checks, staging workflow with the `dist/` check.
- `pnpm new-project` fills a new repo in; `pnpm update-skills` updates its
  skills from the template.
- `docs/handoff/`: HANDOFF, MANUAL-TODO and BUILD-NOTES templates.
- Skills: `webflow-build` (workflow, checklists, conventions, lessons by
  area, prototype starter with a style-guide generator, `pnpm wf:*`
  checks including accessibility, links and visual baselines) and
  `webflow-launch`.
- `CONTRIBUTING.md`, pull request and issue templates; `pnpm harvest`
  collects lessons from client repos.
- Fluid scaling (Osmo Scaling System) on by default in `src/styles.css` §01.
- `recipes/finsweet/`: Finsweet Attributes as a bundled module, never a
  Webflow script tag.
- Project start: `pnpm new-project` sets up the workspace around the repo
  (`CLAUDE.md` importing the agent rules and handoff, `.mcp.json`, skill
  links, `prototype/`, `Assets/`; `--no-workspace` skips it) and lists the
  person's steps in order. README › Starting a project gives the one
  kickoff message.
- `webflow-build`: `figma.md` (designs from a Figma link through the Figma
  connector, a frame per breakpoint), `starter-site.md` (the starter
  Webflow site projects duplicate), Project setup from the Webflow site
  name, a **Before the prototype** gate in `checklists.md`, and a Working
  rhythm section (one page per session, a go-ahead per Webflow batch).
  MCP lessons from building the starter site (rate limits, breakpoint
  modes, slots, stale snapshots). The prototype starter ships with the
  starter site's snapshot (`breakpointModes` added to the format).
- `style-guide.md`: how to make a project's style guide page (prototype
  first). The starter site ships without one, only a page that keeps the
  reserved Label and Form classes alive.
