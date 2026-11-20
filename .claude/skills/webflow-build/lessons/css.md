# Lessons: Repo CSS

Repo CSS against the Designer: cascade, focus, fixed children, overflow.

Harvested from client builds made from this template (`Scope:
template-candidate` entries in their `GOTCHAS.md`). Module and file names
refer to the project the lesson came from; Status is that project's.

### 2026-11-18 · Rich-text margin trims flatten designed embeds
- Area: css
- Symptom: designed blocks pasted into a CMS rich-text field as Embeds
  (cards, a diagram, a row of tiles) lost their spacing; a cards row sat
  on the button above it.
- Cause: the repo's rich-text rule that zeroes the first child's top
  margin and the last child's bottom margin also matched elements inside
  the embed. A `.w-embed` is a `div`, so `div:first-child > :first-child`
  hits its first child, and a version that matched any depth with
  `!important` flattened every nested first and last child.
- Fix: keep the trim to direct children of `.w-richtext`, and exclude
  designed embeds with `:not(:where(.w-embed, .w-embed *))` (or a list of
  the embed classes). Check every new designed embed in rich text against
  the trim.
- Status: fixed in that project

### 2026-11-18 · Embed markup collides with the site's own class names
- Area: css, designer
- Symptom: rows in a block pasted into a CMS rich-text Embed overlapped
  and their text was squashed.
- Cause: the embed was generated from prototype markup with short class
  names (`d1`–`d5`, `dot`) that were also Webflow site classes (display
  headings, a decorative dot); the site stylesheet styled the embed's
  elements too.
- Fix: give embed markup its own prefix (for example `sx-*`) in the
  generator and in the CMS HTML. Before adding prototype markup to an
  Embed or rich text, check its class names against the published site
  CSS (every class in the site's `webflow.css`).
- Status: fixed in that project

### 2026-11-18 · A decorative image behind a canvas became the LCP and a flicker
- Area: css, perf
- Symptom: a hero painted flat colour, then jumped to its gradient when a
  ~240 KB poster JPEG arrived; mobile LCP was 6.2 s, on that image.
- Cause: the decorative background behind a WebGL canvas was an `<img>`
  in an Embed, so it was both late and the largest paint.
- Fix: ship a tiny (about 48px wide) copy of the same frame inline in the
  stylesheet as the section's background (a ~1.5 KB data URI, scaled up,
  tagged `repo-css: designer-cant` for the inline data URI), drop the
  `<img>`, and fade the canvas in over it. Mobile LCP went from 6.2 to
  4.1 s, with no colour jump.
- Status: fixed in that project

### 2026-11-13 · Backdrop blur on a moving element stutters
- Area: css, perf
- Symptom: a card carousel moved by a CSS transform loop was "not smooth"
  on a phone and on desktop. Headless Chromium showed nothing: its frame
  rate and trace looked fine, and script work was under 15 ms in 3 s.
- Cause: each card had a frosted frame (`backdrop-filter: blur`) and
  small glass dots (also `backdrop-filter`), dozens per copy of the
  track. A backdrop blur on a moving layer is re-rendered on the GPU every
  frame; headless or emulated GPUs don't show the cost.
- Fix: bake the frost into the image: the photo under the frame is a
  pre-blurred, slightly darkened WebP (about 10 KB; mirrored edges so the
  blur doesn't darken them), and the frame has no blur and no tint. Small
  glass elements inside the moving track get a flat tint. A plain
  `filter: blur` on the photo also works, but a flattened image costs
  nothing. Keep `backdrop-filter` off anything that animates, and judge
  smoothness on a real device, not in headless Chrome.
- Status: fixed in that project

### 2026-11-13 · A later stylesheet's base rule beats an earlier breakpoint rule
- Area: css
- Symptom: (1) in the repo, a rule for a width the Designer has no
  breakpoint for (`@media (max-width: 1279px)`) also won at 991px and
  below, so a stacked side nav was 224px tall instead of 59px and the
  content started 165px lower than the prototype. (2) In a prototype,
  restyling existing classes in a second CSS file broke the phone layout:
  a stacked intro was 43em tall and panels kept their desktop padding.
- Cause: the same specificity, so source order decides. Repo CSS loads
  after `webflow.css`, so its rule beats the Designer's 991/767/479
  values for the same class and property. In the prototype the newer
  file's plain rule beats the older file's `@media` rule. (A `flex-basis`
  meant as a width also becomes a height once the parent is a column.)
- Fix: give a repo rule for an in-between width a floor:
  `@media (min-width: 992px) and (max-width: 1279px)`, for every property
  the Designer also sets at a smaller breakpoint. In a prototype override
  file, restate every changed property that has a breakpoint value in
  that file's own media blocks. In Webflow itself this can't happen (one
  class, one value per breakpoint). After either, check 820 and 390, not
  only the width you changed.
- Status: fixed in two projects

### 2026-11-10 · Inside an embedded form's iframe, breakpoints read the iframe's width
- Area: css, js
- Symptom: a two-column form grid with a one-column style at the 767
  breakpoint showed one column in a 576px-wide form on a 1440 screen.
- Cause: the form embed (HubSpot) copies the page's stylesheets into its
  iframe, so every media query there tests the iframe's viewport, not the
  page's.
- Fix: classes used inside the iframe size by their own width, not by
  breakpoints, e.g. `repeat(auto-fit, minmax(min(100%, 16em), 1fr))`.
  Also: `:has()` can't be nested, and one invalid selector in a list drops
  the whole rule (split such rules); an IntersectionObserver only sees
  targets in its own window, so observe iframe elements with the frame's
  own `IntersectionObserver`. A reserved min-height for the form must be
  re-measured whenever its layout changes.
- Status: fixed in that project

### 2026-11-09 · Double, missing and clipped focus rings on wrapped controls
- Area: css, designer
- Symptom: a native select showed its square ring inside a rounded pill
  that drew its own; an input showed its focus border plus an outline 3px
  away (two indicators, on mouse click too); custom radios showed their
  own ring inside the wrapper's Focus Within ring; visually hidden radios
  had no visible focus at all; a focusable panel's ring was clipped by its
  card's `overflow: hidden`.
- Cause: a fallback `:focus-visible` ring lands on whichever element has
  focus, also when its wrapper draws the ring; a `<select>` matches
  `:focus-visible` on a mouse click; the Designer has Focus Within but no
  keyboard-only state for a parent.
- Fix: one indicator per control. Inputs: Focus and Focus Visible = the
  active border plus one outline at offset 0. Wrappers that draw the ring
  (a pill, a choice, a segmented tab) carry its colour, width and offset
  in the Designer with `outline-style: none`; a `designer-cant` repo rule
  `.wrapper:has(:focus-visible) { outline-style: solid }` only switches
  the style on, so the colour stays a Designer variable and repo CSS reads
  no variable name. The inner control's Focus Visible is outline none.
  Inside an `overflow: hidden` parent, use a negative (inset) offset.
  Audit with Tab and with mouse clicks, at desktop and phone width.
- Status: fixed in that project

### 2026-10-12 · `mix-blend-mode` stops blending inside S Wrapper
- Area: css, designer
- Symptom: a logo row with `mix-blend-mode` disappeared (or stopped
  blending) once it was moved inside the section's S Wrapper.
- Cause: S Wrapper is `position: relative` with a `z-index`, which makes
  it a stacking context; a blend mode only blends with what is inside the
  same stacking context, not with the section background behind it.
- Fix: keep blended elements out of S Wrapper (cap their width directly),
  or put the background they blend with inside the same stacking context.
  Any `z-index` on an ancestor has the same effect.
- Status: fixed in that project

### 2026-10-30 · Font fallback metrics: calibrate `size-adjust` on the site's own text
- Area: css, perf
- Symptom: while the web fonts loaded, headings moved 2–3px and hero text
  re-wrapped (11px) at 390; Lighthouse CLS 0.02–0.03 once the font preload
  was dropped. A first set of fallback faces, with `size-adjust` from
  frequency-weighted lowercase widths (as fontaine and next/font compute
  it), fixed 390 but made a title wrap to two lines at 1440.
- Cause: the stacks fell back to `system-ui`, narrower than the web font;
  and the textbook ratio against Arial was wrong for this site's
  capital-heavy headings (110.5% from lowercase, 108.8% measured).
- Fix: one `@font-face` fallback per web font in repo CSS (`local("Arial")`
  or `local("Courier New")`, plus Liberation/Arimo/Cousine), with
  `size-adjust` measured with canvas `measureText` on every text string of
  the site's pages in the web font against the fallback, and the web
  font's typo ascent, descent and line gap divided by it. The Webflow
  family variables name the fallback second (`"Font", "Font Fallback",
  system-ui, sans-serif`). Test before writing to Webflow: serve the local
  stylesheet plus a test-only override of the family variables, load each
  page with `.woff2` blocked and with fonts, and compare the first
  screen's text boxes (36 → 9px at 1440, 122 → 8px at 390). Live CLS went
  to 0.001–0.005.
- Status: fixed in that project
- Found by: claude

### 2026-10-29 · Figma sizes come out small on classes with their own type size
- Area: css
- Symptom: inputs were 27.5px high instead of 40, and chips and badges
  were smaller than in Figma, though every value was taken from it.
- Cause: em spacing is computed against the element's own font size
  (conventions §6). Spacing variables are em at 16px, so on a 12–15px
  class they shrink; and an input nested in its label took its size
  (0.75em) from the label's 11px.
- Fix: on those classes, variable-bound spacing is `calc(var(--x) * 16 /
  <font px>)` and plain Figma numbers are em at that size; label and
  control are siblings, as in a Webflow Form Field. Measure rendered px
  against Figma, not the CSS values.
- Status: fixed in that project's prototype
- Found by: claude

### 2026-10-29 · Library CSS in new-classes.css fails the style guide check
- Area: css
- Symptom: after Lenis's CSS was added at the end of `new-classes.css`
  (where Designer-can't rules go), `check:style-guide` failed:
  `lenis-stopped` and `.lenis.lenis-stopped` "not on the style guide".
- Cause: the generator and the check read every class in
  `new-classes*.css` as a Webflow class to create; a library's own state
  classes never are.
- Fix: the starter has `src/css/repo.css` for library CSS, linked after
  the new classes and moved to the repo's `styles.css` as is (wf-template
  0.15.0).
- Status: fixed in wf-template 0.15.0
- Found by: claude

### 2026-10-29 · The template's base CSS would restyle a live site during a migration
- Area: css, loader
- Symptom: moving a live site's code onto the template, `src/styles.css`
  (already set up for the redesign: fluid scaling, margin resets,
  `img {display:block}`, `a {text-decoration:none}`) would have shipped to
  the live pages and changed how they look.
- Cause: the template has one bundle; a live-site migration and a
  redesign in the same repo need two stylesheets that never meet.
- Fix: a second entry, `src/live/` → `dist/live/index.js` and
  `dist/live/styles.css` (build.mjs), and a `BUNDLE = "live/"` folder in
  loader.html (also in 2a's href); the tests read it like SITE. At the
  redesign's launch BUNDLE becomes `""` and `src/live/` is deleted.
  `pnpm update-skills` replaces `build.mjs` with the template's and drops
  the `src/live/` entries: `pnpm build` then deletes `dist/live/`, and a
  push removes the bundle the live pages load. After every update, check
  `git diff build.mjs` and restore project entries (mark them with a
  comment) before building or pushing.
- Status: open in the template (a bundle folder in the loader)
- Found by: claude

### 2026-10-28 · Webflow's body size variable is the text components' 1em
- Area: css, designer
- Symptom: setting Typography Role › Size › Body to 14px (0.875rem) at
  mobile shrank every heading to 14px too.
- Cause: Webflow's text components use that variable as their "1em":
  `.c-heading h2`, `.c-paragraph p` and similar are `font-size:
  var(--_typography-role---size--body)`, and the scale steps are `em`. A
  rem value pins every one of them; an em value below 1 compounds when
  nested.
- Fix: leave the body role at 1em. Make body copy smaller through the
  paragraph styles instead (a Typography Style mode on the paragraph
  component at that breakpoint, with the same font, weight and line
  height as Body), and set the same on each variant that should differ
  (see designer.md "Component variant styles lose to the base class's
  breakpoint rules").
- Status: documented
- Found by: claude

### 2026-10-27 · Prototype breakpoint proposals on `:root` lose to the Body tag's modes
- Area: css
- Symptom: below 992px the prototype showed the starter's fonts and sizes
  although `proposed.css` overrode the role variables at each breakpoint.
- Cause: the starter applies breakpoint variable modes on the Body tag
  style, so `webflow.css` sets the role and layout variables on `body`
  inside each @media block; a proposal on `:root` is overridden for
  everything inside body.
- Fix: write breakpoint proposals on `:root, body`. The `proposed.css`
  header says so (wf-template 0.9.0).
  Each smaller breakpoint's body block redeclares the roles again, so a
  changed value goes in every breakpoint block below the one it starts at
  (the `proposed.css` header says so from wf-template 0.15.0).
- Status: fixed in wf-template 0.9.0
- Found by: claude

### 2026-10-27 · The prototype had no fluid scaling
- Area: css
- Symptom: at 1440 the prototype rendered at 16px = 1em while staging
  rendered at 13.7px (the repo's §01 scaling), so prototype and staging
  could never match at the check width.
- Cause: the prototype doesn't load the repo's `src/styles.css`, and
  `prototype.css` had no copy of §01.
- Fix: `prototype.css` has a stand-in of §01 (wf-template 0.9.0). Keep
  its `--size-container-ideal`, `-min` and `-max` the same as §01.
- Status: fixed in wf-template 0.9.0
- Found by: claude

### 2026-10-27 · check:drift read Webflow's unspaced shorthands as drift
- Area: css
- Symptom: 12 "values that differ" on an untouched starter site
  (footer, skip link and chip padding).
- Cause: Webflow publishes `padding: var(--_a)var(--_b)` with no space
  between the `var()` calls, and `var(--_a).625em` with a number straight
  after one; the parser read the whole shorthand as each side's value.
- Fix: `check-drift.mjs` splits values after a closing bracket at depth 0
  too (wf-template 0.9.0).
- Status: fixed in wf-template 0.9.0
- Found by: claude

### 2026-10-27 · check:states reported a pressed state missing after a control removed itself
- Area: css
- Symptom: "a.button: no pressed state" on several pages, although every
  such control had an `:active` rule.
- Cause: the check reloads the page per control and finds it by index. A
  dismissible announcement bar remembered its dismissal in
  `localStorage`, so after its close button was pressed the bar was gone
  on every later load and each index pointed at another element.
- Fix: `check-states.mjs` clears `localStorage` and `sessionStorage`
  before every load (wf-template 0.9.0).
- Status: fixed in wf-template 0.9.0
- Found by: claude

### 2026-10-19 · A `0fr` grid row still holds its item's padding
- Area: css
- Symptom: a dropdown animated with `grid-template-rows: 0fr → 1fr`
  stopped at 41 px instead of 0 when closed.
- Cause: a grid item's padding sets its minimum size, so a `0fr` track
  still holds the padding.
- Fix: the closed state also sets the item's vertical padding to 0,
  transitioned with the rows, so the Designer padding returns when open.
- Status: fixed in that project
- Found by: claude

### 2026-10-09 · Measure preloads; font preloads can make it worse
- Area: css, perf
- Symptom: font preloads for the heading and body fonts (both
  `font-display: swap`) were expected to help LCP.
- Cause: they compete with the render-blocking CSS for bandwidth.
- Fix: A/B by injecting the `<link>`s into production HTML with Playwright
  route interception (7 runs, median, 4× CPU, slow 4G): fonts gave
  −20–40 ms LCP but +30–100 ms FCP, so they were dropped; an image preload
  for a lazy LCP hero image gave −420 ms on one page and nothing on others
  (a 5 KB SVG; a hero hidden behind IX3). Keep only measured wins.
- Status: done
- Found by: claude

### 2026-10-05 · Horizontal scrollers drag vertically
- Area: css
- Symptom: Slider Track could be dragged up and down while scrolling.
- Cause: with `overflow-x: auto` and `overflow-y` left at visible, CSS
  computes `overflow-y` as auto, so any small vertical overflow scrolls.
  The prototype rule had the same gap.
- Fix: set `overflow-y: hidden` in the Designer on every horizontal
  scroller (Slider Track, Lightbox Thumbs).
- Status: fixed (Webflow styles, 2026-10-05)
- Found by: human

### 2026-10-06 · Template focus rule overrides Designer focus states on inputs
- Area: css
- Symptom: the designer saw a dark square ring around the Select's text input
  only, instead of the brand-colour ring on the whole field. Every Form Input
  showed the same dark ring instead of its Designer Focus Visible state
  (Form/Focus, offset 3px). On click, Form Input's border turned blue.
- Cause: the template's §07 rule `:focus-visible, .w-input:focus-visible,
  .w-select:focus-visible { outline: 2px solid var(--color-accent) }`
  (`currentColor`). The `.w-input` part is 0-2-0, the same as a Designer
  `.form-input:focus-visible`, and repo CSS loads later, so it wins. The
  blue border is webflow.css `.w-input:focus { border-color: #3898ec }`,
  which beats a class's base border colour.
- Fix: the `.w-input` / `.w-select` selectors dropped from the rule (plain
  `:focus-visible` fallback kept). In Webflow: Select Input › Focus
  Visible outline none; Select Toggle › Focus Within outline 2px
  Form/Focus, offset 3px; Form Input › Focus border colour = its base
  border variable. Every input class needs its own Focus Visible state
  and a Focus border colour.
- Status: fixed — the template's focus rule, plus Webflow styles in that project
- Found by: human

### 2026-10-06 · backdrop-filter traps fixed children (floating nav)
- Area: css
- Symptom: with G | Nav W made absolute (the bar scrolls away), the fixed
  menu sheet and floating buttons inside it would scroll away too.
- Cause: `backdrop-filter`, `filter`, `transform` and `will-change:
  transform` make an element the containing block of its `position: fixed`
  descendants. The bar's glass blur and its old auto-hide transform did that.
- Fix: the blur lives on a child, **Nav Bg** (absolute, inset 0, z-index -1);
  G | Nav W has no transform or will-change. Keep those properties off any
  wrapper that holds fixed elements. Related: the bar's toggle starts with an
  SR Only label and the float's doesn't, so the X rules use
  `:nth-child(n of .nav-toggle-line)`.
- Status: fixed in that project's repo
- Found by: claude

### 2026-10-02 · Element resets in §02 beat Designer tag styles
- Area: css
- Symptom: A Designer tag style ("All H2 Headings", "All Links") margin or
  colour has no effect.
- Cause: Webflow emits tag styles as bare element selectors (`h2 {}`),
  0-0-1 — the same specificity as the §02 resets, which load later and win.
- Fix: none yet. Options: wrap the resets in `:where()` (then webflow.css
  defaults return), or drop them and set tag styles in the Designer.
- Status: open
- Found by: claude

### 2026-10-02 · Neutralizers in §03 override Designer styles
- Area: css
- Symptom: A style changed in the Designer has no effect on the page.
- Cause: `src/styles.css` loads after `webflow.css`, so the §03 `.w-*` rules
  win same-specificity ties by source order. `.w-layout-blockcontainer
  { max-width }` silently overrode Designer container caps on one project;
  the `.w-dropdown-toggle` reset broke Webflow's chevron spacing on another.
- Fix: one project removed ten neutralizers so Webflow's own defaults stood
  unopposed. Delete a neutralizer the moment it fights the
  Designer. Delete it rather than comment it out: CSS comments don't
  nest, so on that project a `/* … */` around a block that already held a
  comment closed early, a "commented-out" `.w-nav` neutralizer had been
  live all along, and a stray `*/` was left for esbuild to warn about.
- Status: fixed in the template — selectable-component rules removed; only Designer-unselectable internals remain in §03
- Found by: human

### 2026-10-02 · Root font-size scale drifts from Designer tokens
- Area: css
- Symptom: Designer variables named for px values ("Max Width - 1280px")
  render at different sizes; the scale is retuned again and again.
- Cause: The §01 fluid scale sets `:root` font-size, so every rem/em value
  coming out of the Designer scales with it. One project retuned it seven
  times (1680 → 1440 → 1680 → clamp → revert → 1920 → 1440); another found
  em layout tokens rendering 6.25% short.
- Fix: none general. Agree the scale with the designer before building, or
  drop it and let Webflow variables own sizing.
- Status: fixed in the template — scaling now sets the BODY font-size (Osmo), not
  :root, so rem and px-named tokens keep their meaning; frames are tuned per
  project before building
- Found by: human

### 2026-10-02 · Renaming a Webflow variable silently breaks repo CSS
- Area: css
- Symptom: A container cap or token-driven value quietly stops applying.
- Cause: Container/Max Width was renamed to Section/Max Width in Webflow.
  Webflow rewrites its own references but cannot reach this bundle, so
  `var(--_layout---container--max-width, none)` fell back to `none`.
- Fix: avoid referencing Webflow variable names in repo CSS; if one is
  needed, log it here so renames get checked.
- Status: fixed in the template — the template no longer references Webflow variable names; the AGENTS.md policy forbids new ones without approval
- Found by: human

### 2026-10-09 · Prototype generators lose large breakpoints and `.w--` states
- Area: css
- Symptom: with a snapshot of an existing site in the prototype starter:
  styles at Webflow's `large` / `xl` / `xxl` breakpoints (min-width 1280 /
  1440 / 1920) were missing; Current and custom radio Checked / Focused
  came out as invalid pseudo-classes (`:current`); the style guide's
  swatch grids were one column wide, a pill radius in Spacing drew a bar
  wider than the page, full-viewport classes made 100vh library tiles, and
  `gen-style-guide.mjs` crashed on a class slug with `---`.
- Cause: the generators assumed the starter site's snapshot (four
  breakpoints, no class states, a Radius collection, small values).
- Fix: `gen-webflow-css.mjs` emits min-width blocks and `.w--current` /
  `.w--redirected-checked` / `.w--redirected-focus`; `gen-style-guide.mjs`
  stretches `.sg-grid`, caps `.sg-tile` and `.sg-bar`, sends `Radius/`
  variables to the Radius section, and filters empty slug parts.
- Status: fixed in the template's prototype starter
- Found by: claude

### 2026-10-09 · Prototype stand-ins override an existing site's tag styles
- Area: css
- Symptom: with a snapshot of an existing site, prototype headings lost
  their weight, links their colour and images their sizing.
- Cause: `prototype.css` loads last and carried bare element rules
  (`h1…p { font-weight: inherit }`, `a { color: inherit }`, `img {…}`),
  the same specificity as the site's tag styles in the generated
  `webflow.css`, so they won the tie.
- Fix: the stand-ins are wrapped in `:where()`, so any tag style in
  `webflow.css` wins and the stand-ins apply only where the snapshot sets
  nothing.
- Status: fixed in the template's prototype starter
- Found by: claude

### 2026-10-09 · `<button>` drops the inherited letter-spacing
- Area: css
- Symptom: accordion questions wrapped to two lines where the design has
  one; the heading's −3% tracking was missing on the text inside the
  button.
- Cause: the browser's default stylesheet sets `letter-spacing: normal`
  (and `word-spacing`, `text-transform`) on `<button>`; `font: inherit`
  does not cover them.
- Fix: `letter-spacing: inherit` (with `word-spacing` and `text-transform`)
  on any class used on a `<button>` that should take its parent's type;
  classes that set their own tracking are fine. A native-button reset in
  the Designer (designer.md, "Native `<button type="submit">` in Webflow
  forms") should include them.
- Status: fixed in that project's prototype; template 0.7.1 §02 sets
  `letter-spacing` and `word-spacing` to `inherit` on `:where(button)`
  (zero specificity, so a Designer tag style or class still wins).
  `text-transform` stays per class: normalize sets it at 0-0-1.
- Found by: claude

### 2026-10-15 · A script-hidden overlay blocks the Designer canvas
- Area: css
- Symptom: below 992px every click on the canvas selected the nav.
- Cause: the full-screen mobile menu is hidden by a module (`hidden`); the
  canvas runs no script, so it sat over the page at opacity 0. The canvas
  also ignored `pointer-events: none`. (The 2a stylesheet link is fetched
  without a cache-buster in the Designer, so a new repo rule can take up
  to 10 minutes to reach the canvas.)
- Fix: hide it on the canvas only:
  `html.wf-design-mode .mobile-menu:not(.is-open) { display: none; }`
  (tag `canvas-preview`). To edit the menu, add its open combo for the
  session. Any overlay that a script hides needs the same rule.
- Status: fixed in that project's repo
- Found by: human

### 2026-09-16 · A scroll lock belongs on `html` only: locking `body` un-sticks the header
- Area: css
- Symptom: on a scrolled page (always the case when arriving with a
  #hash), the open mobile menu started above the viewport and only its
  bottom-pinned button showed.
- Cause: the open-menu state set `overflow: hidden` on `html` **and**
  `body`. That makes `body` its own scroll container; the sticky header
  then sticks inside `body`, which never scrolls, so it sat at the
  document top off-screen and a menu offset measured from it went
  negative. Forcing `position: relative` on the open header had the same
  effect.
- Fix: lock `html` only, drop any position override on the header, and
  clamp offsets measured from it at 0. Use the same rule for every lock
  (menu, modal, loader; `recipes/modal/` should follow it).
- Status: fixed in that project's repo; template 0.7.0 §04 locks `html`
  only.
- Found by: claude

### 2026-10-07 · Finsweet filters: style `.is-list-active`, and the operator is `contain`
- Area: css, js
- Symptom: (1) a filter set from the query string filtered the list, but
  its checkbox looked inactive, and the first click removed the filter
  while making the checkbox look active. (2) Year filter pills did
  nothing; once they could be selected every year showed zero items, and
  "All" never cleared the filter.
- Cause: (1) Finsweet sets the real input and `.is-list-active`
  correctly, but Webflow's decorative `.w--redirected-checked` isn't
  synced when Finsweet initialises from the URL; the CSS styled the
  Webflow class. (2) `fs-list-operator="contains"` isn't a Finsweet v2
  value (it is `contain`), and an unknown value silently falls back to
  `equal`; the "All" radio had no operator, so it became a separate
  `equal` condition that never cleared the other. The labels also
  published `for=""`, which detaches them from their nested radios (see
  designer.md, "Duplicate ids in CMS lists and component instances").
- Fix: style the Finsweet state (`.is-list-active` on the filter's
  wrapper) as the source of truth, and keep the decorative Webflow
  checkbox neutral when the wrapper is inactive. Give every radio in a
  group the same `fs-list-operator`, spelled `contain`, and every label a
  custom `for`. Check attribute values against the Finsweet v2 docs and
  `recipes/finsweet/`: typos fail silently.
  An "All" built as `fs-list-element="clear"` never gets the active class
  (Finsweet toggles it on radio and checkbox labels only): make All a
  radio in the group with `value=""`, `fs-list-value=""` and `checked`.
  `fs-list-activeclass="is-active"` on each radio uses a Designer combo
  instead of `.is-list-active`.
- Status: fixed in two projects
- Found by: claude + codex
