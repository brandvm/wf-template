# <CLIENT> — Webflow custom code

Agent instructions for this repository. Codex, Cursor and similar tools read
this file directly; Claude Code reads it through `CLAUDE.md`. It is the single
source of agent rules — edit this file, never a copy of it.

## Project facts

Fill these in when the repo is created from `brandvm/wf-template`.

- Client / site: `<CLIENT>`
- GitHub: `brandvm/<REPO>`, default branch `master`
- Webflow site ID: `<SITE_ID>`
- Staging site: `https://<SLUG>.webflow.io`
- Staging bundles: `https://brandvm.github.io/<REPO>/`
- Production domain: `<DOMAIN or "not attached yet">`
- Production release: `<RELEASE in the head snippet, or "none yet">`

## Who owns what

Webflow owns markup, layout, classes, components, CMS content, interactions
**and styling by default**. This repo owns JavaScript behaviour and only the
CSS the Designer cannot express.

That split is deliberate. Repo CSS loads from an Embed after `webflow.css`,
so it wins every specificity tie against the Designer. Any rule written here
that the Designer could have expressed becomes a hidden override: the next
person changes that style in the Designer, nothing happens, and the only fix
is edit `src/` → push → wait for staging → reload the Designer. Every project
built from this template has lost time to that loop.

## CSS policy — Designer first

Before writing any CSS, decide where it belongs.

1. **Can the Designer do it?** A class or combo class style, a variable, a
   breakpoint style, a state (hover/focus/current), an interaction. If yes:
   - With the Webflow MCP connected, apply it in Webflow (styles and
     variables tools), then tell the user what was changed.
   - Without the MCP, give the user exact Designer steps: class, breakpoint,
     property, value.
   - Do **not** add it to `src/styles.css`.
2. **Repo CSS needs a reason.** Every rule — or the section header comment
   covering a group of rules — carries one tag from this list:

   ```css
   /* repo-css: <tag> — <short why> */
   ```

   | Tag | Use for |
   | --- | --- |
   | `js-state` | Classes/attributes a module toggles (`.is-open`, `.is-loading`, `[data-state]`) |
   | `designer-cant` | Name the feature: `:has()`, complex combinators, `@keyframes`, `@supports`, container queries, `::marker`, `color-mix()`, masks |
   | `third-party` | Swiper, Lenis, Finsweet or other library markup |
   | `canvas-preview` | `.w-editor`, `.wf-design-mode`, `html:not([data-wf-domain])` helpers |
   | `approved-base` | A site-wide base the user explicitly asked to keep in code |
   | `override-webflow` | Overriding a `.w-*` default or a Designer style |

3. **`override-webflow` needs the user's explicit approval** and a
   `GOTCHAS.md` entry explaining why. Ask before writing it.
4. **Never, without that approval:** set `font-size` on `:root`/`html`,
   neutralize `.w-*` defaults, or reference Webflow variable names
   (`--_layout---…`, `--_typography---…`). A renamed variable in Webflow
   silently breaks every rule that reads it — Webflow rewrites its own
   references, never this bundle's.
5. **Ambiguous request?** Say which parts go in the Designer and which go in
   code before editing anything. "Make the heading bigger on mobile" is a
   Designer breakpoint style, not a media query here.

## Read before changing integration

- `README.md` — commands, daily flow, release, handoff.
- `loader.html` — the three snippets pasted into Webflow (head code, the
  CSS/config Embed on the canvas, footer code). Read it before touching any
  of them.
- `src/index.ts` is a manifest: one `run('<name>', init<Name>)` call per
  module, so a module that throws is logged and the rest still run. Features
  go in `src/modules/`, one file each, exporting an init function that no-ops
  when its target markup is absent.
- `src/styles.css` opens with cascade notes. Add rules to the section they
  belong to, never to the end of the file.
- Third-party libraries are bundled with `pnpm add`, not added as CDN tags.
  The footer loader appends the bundle dynamically, so a sibling
  `<script defer>` has no ordering guarantee.

## Webflow canvas facts

- **The Designer canvas never runs scripts.** Anything shown only after JS
  runs is invisible there; use a `canvas-preview` rule if the Designer needs
  to see it.
- **The canvas shows the staging stylesheet only.** Seeing a CSS change in
  the Designer means push → ~1 min → reload the Designer tab. Never add a
  static `http://localhost` link to the Embed for good — every public
  visitor's browser would request it. `loader.html` describes the temporary
  opt-in; if one is in use, the local and staging sheets are additive and a
  deleted rule keeps applying from staging until pushed.
- No live reload on the canvas. Reload the Designer tab.
- Debug "is my CSS loading?" with `background`, not `outline` — outlines on
  `body` paint outside the canvas iframe and get clipped.

## Snippets are not versioned

A push updates the JS/CSS bundles only. Any change to `loader.html` must be
re-pasted into Webflow and published to take effect — say so in the commit
or PR description, and keep `loader.html` identical to what is installed.

## Commands and release

```bash
pnpm dev      # watch + server on :3000
pnpm build    # minified -> dist/
pnpm check    # tsc --noEmit
pnpm test     # build + Playwright checks
```

Node 22 and the pinned pnpm in `package.json`. `dist/` is committed: after
any `src/` change run `pnpm build` and commit `dist/` with it — CI fails the
push otherwise, and staging only deploys after `pnpm check`, the browser
tests and the `dist/` check pass. `pnpm dev` builds in memory and never
touches `dist/`.

Release as the README describes: tag a commit whose CI passed, then set
`RELEASE` in the head snippet — the only version string. Never move a pushed
tag; cut the next patch. Never use `@latest` or a branch URL in production.

## Webflow MCP limits

Worked around, not fixed — do not rediscover these.

- `custom_value` is rejected for Color and Size variables (`color-mix()`,
  `oklch()`, `calc()`). Create those through the variables JSON import with
  `valueType: "custom"`.
- No variable rename or reorder within a collection. Rename in the Designer
  (preserves ids and aliases; recreating does not).
- The WHTML importer drops `class` attributes. Create the style, then apply
  it.
- `get_all_elements` does not descend into component definitions — pass the
  component scope. An element "missing" from a page is usually inside one.
- Concurrent Designer edits change element ids. Re-query on "Element not
  found" instead of assuming deletion.
- Responsive styles are only returned when breakpoints are requested
  explicitly (`include_breakpoints`).

## Session protocol

1. **Start:** read `GOTCHAS.md`. Do not repeat a mistake already logged.
2. **During:** when something surprising costs time — a Webflow quirk, a
   template default that gets in the way, an MCP limitation, a fix that had
   to be reverted — add an entry to `GOTCHAS.md` in the same commit as the
   fix, using the format at the top of that file.
3. **Scope:** tag an entry `template-candidate` when it would recur on any
   project built from `wf-template`; those entries are collected later to
   improve the template. Otherwise tag it `project`.
4. Never delete entries. Update `Status` when something is fixed or
   upstreamed.
