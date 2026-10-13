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
