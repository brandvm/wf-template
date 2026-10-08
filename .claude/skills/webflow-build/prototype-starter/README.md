# Prototype starter

A localhost prototype that mirrors Webflow, for the prototype phase
(`conventions.md` §13): the design is built and approved here first, then
rebuilt in Webflow class for class.

It mirrors Webflow on purpose:
- **URLs:** each page is `folder/index.html` at its Webflow URL, served
  without a trailing slash.
- **Breakpoints:** 991, 767 and 479px.
- **Structure:** the page shell and section structure from `conventions.md`
  §1–2. Nav and Footer are one partial each (one Webflow Component each).
- **CSS:** the CSS Webflow already has is generated from a snapshot and
  never edited; changes and new classes live in their own files, so each
  one can be approved and then made in the Designer.
- **JS:** modules work like the repo's `src/modules/`, so they move into
  the repo unchanged.

## Start

`pnpm new-project` copies this folder to `<Client>/prototype`, next to the
repo (copy it by hand for a workspace set up without it). Then:

```bash
pnpm install
pnpm dev            # http://127.0.0.1:5173
```

Set `prototypeUrl` in the repo's `webflow-build.config.json` to the same
address, so the check scripts can compare staging with it.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `<page>/index.html` | Pages at their Webflow URLs; add each to `pages` in `vite.config.js` |
| `design/style-guide/index.html` | The style guide page (`conventions.md` §12), **generated** by `pnpm style-guide`: colours, themes, typography, utilities, spacing, radius, then a tile for every class not shown elsewhere |
| `design/style-guide/components.html` | Hand-written part of the style guide: buttons and states, forms, components, page previews |
| `src/css/style-guide.css` | **Generated** with the page: its Sg layout classes |
| `partials/` | `head.html` (stylesheets), `nav.html`, `footer.html`, included with `<!-- @include partials/nav.html -->` |
| `webflow-snapshot/` | `variables.json` and `styles.json`: what Webflow has now |
| `src/css/tokens.css`, `webflow.css` | **Generated** from the snapshot (`pnpm css`). Never edit |
| `src/css/proposed.css` | Changes to existing variables and class bindings, as P1, P2… old → new |
| `src/css/new-classes.css` | New classes, grouped by component (more files: `new-classes-*.css`) |
| `src/css/prototype.css` | Stand-ins for what Webflow ships, and the tag styles; never moved |
| `src/main.ts`, `src/modules/` | The module manifest and one file per module |
| `CLASSES.md` | **Generated** (`pnpm classes`): every new class with its Designer name |

## Commands

```bash
pnpm css                 # snapshot → tokens.css + webflow.css
pnpm classes             # new-classes*.css → CLASSES.md
pnpm style-guide         # snapshot + CSS → design/style-guide/index.html
pnpm check:style-guide   # every class is applied on the style guide
pnpm check               # tsc
pnpm build               # sanity check
```

## Webflow snapshot

Claude writes the two files from the Webflow MCP (variables with all modes
and aliases; styles with `include_breakpoints`), at the start and after
every Designer change, then runs `pnpm css`. The starter ships with the
snapshot of the starter Webflow site (`../starter-site.md`), so a new
prototype starts from the same base system as a duplicated site.

Two things the MCP can't read back, so the snapshot states them by hand:
breakpoint variable modes (`breakpointModes` on a collection, body's
`variableModes` per breakpoint) and `calc()` values that use variables
(the read returns only the first variable; copy the value from the
published CSS).

`variables.json`: one entry per collection.

```json
[{ "collection": "Layout", "modes": ["Base", "Tablet"],
   "variables": [{ "name": "Section/Padding H", "type": "Size",
     "cssName": "--_layout---section--padding-h",
     "values": { "Base": { "value": 2, "unit": "em" }, "Tablet": { "value": 1.5, "unit": "em" } },
     "alias": { "Base": "Spacing/32" } }] }]
```

- `values`: per mode. A size is `{value, unit}`; anything else is a string
  or number.
- `alias`: per mode, `"<Collection>/<Variable>"` when the value points at
  another variable.
- `breakpointModes` (optional, on a collection): `{ "medium": "<mode>", … }`
  for a collection with breakpoint auto-modes (Typography Role); `pnpm css`
  switches it on `:root` at each breakpoint.

`styles.json`: one entry per class or combo.

```json
[{ "name": "Section", "selector": ".section",
   "properties": { "main": { "padding-left": "var:Layout/Section/Padding H" },
                   "medium:hover": { "opacity": "0.8" } },
   "variableModes": { "main": { "Typography Styles": "H2" } } }]
```

- Keys are `<breakpoint>[:<state>]`: `main`, `medium` (991), `small` (767),
  `tiny` (479).
- `var:<Collection>/<Variable>` binds a variable.
- `variableModes` sets a collection's mode on that class (the Typography
  Styles pattern in `conventions.md` §4). The body tag style is
  `"name": "body"`.

## From prototype to Webflow

1. The designer approves the prototype page by page.
2. Claude proposes, batch by batch and with the designer's go-ahead each
   time:
   - the P-blocks of `proposed.css`;
   - the classes in `CLASSES.md`;
   - the tag styles.
3. After each batch is made in Webflow, refresh the snapshot and run
   `pnpm css`, so the prototype matches Webflow again.
4. Write the repo's `docs/handoff/HANDOFF.md`: pages, components,
   modules and their `data-*` hooks.
5. Build in Webflow with the webflow-build skill.

Rules in the new-classes files that the Designer can't express go to the
repo's `src/styles.css` with their `repo-css:` tag. `check:style-guide`
lists JS state classes too; they need a specimen on the style guide only if
the Designer styles them.
