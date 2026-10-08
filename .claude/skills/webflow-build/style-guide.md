# Making the style guide page

When the person asks for a style guide page, this is how to make it. The
rules are in [conventions.md](conventions.md) §12; this file is the
procedure. The starter Webflow site doesn't ship one
([starter-site.md](starter-site.md)): every project makes its own, from its
own classes, once the base system is adapted to the design.

## 1. Prototype first

The layout comes from the prototype starter, not from scratch:

1. Refresh the snapshot (prototype-starter › Webflow snapshot), then run
   `pnpm css` and `pnpm style-guide`. It writes
   `design/style-guide/index.html` and its layout classes
   (`src/css/style-guide.css`). The sections run in this order:
   1. colours (every Color variable outside Colors Semantic);
   2. themes (every class that sets a Colors Semantic mode);
   3. typography (every class that sets a Typography Styles mode);
   4. utilities;
   5. spacing and radius;
   6. components (`components.html`, written by hand: buttons and their
      states, form parts, project components, page-component previews);
   7. the class library: every class or combo not shown above, each on
      a sealed tile.
2. Run `pnpm check:style-guide` until no class is missing; JS-only state
   classes need a tile only if the Designer styles them.
3. The person reviews the page at the three widths and approves it before
   anything is built in Webflow.

## 2. Build it in Webflow

Rebuild the approved page class for class, a go-ahead per batch:

- **Page:** `/design/style-guide` in a `design` folder, on the standard
  shell (G | Components + G | Page W); its sections go in the **G | Main**
  slot (To Slot wrapper, one drag, then ungroup; `conventions.md` §1).
  One h1 ("Style guide"); each section's eyebrow is an `h2` with Chip.
- **Layout classes:** create the generated `Sg …` classes (from
  `src/css/style-guide.css`) before importing any markup, so the
  importer keeps class lists (`lessons/mcp.md`).
- **Swatches:** the prototype colours each swatch with an inline
  `style="background: var(--…)"`. In Webflow, either set that as a
  `style` attribute (check it publishes), or give each role a combo on
  the swatch class (**Sg Swatch** + **Is Background Page**, …, one per
  Colors Semantic variable, each binding `background-color` to its
  variable). The combo route worked on the starter site; it costs a class
  per role. Show the primitives through the roles unless the person asks
  for them.
- **Spacing and radius:** a text list of names and values is enough; a
  bar per value needs a class per value.
- **Buttons:** Webflow Link elements carry the Button classes (the MCP has
  no plain button outside forms); note the states built in the Designer.
- **Form:** a Webflow Form with **Form** on the form block, **Label** on a
  label, one input, and the submit button with **Button**. This also keeps
  the reserved Label and Form classes in use.
- **Section variants:** Section + Is Dark (with S Wrapper + Is Wide),
  Section + Is Media (S Bg › S Bg Media + S Bg Overlay, `aria-hidden`),
  Section + Is Hero last.
- **Page settings:** `<meta name="robots" content="noindex, nofollow">` in
  the page's head code (the MCP can write it); exclude from the sitemap
  (needs a site plan, else a manual step) and from site search (Designer
  only); links into it use `data-barba-prevent` once Barba is in.

## 3. Check on staging

Publish to webflow.io and check the live page, not element snapshots:

- every class in the site appears on the page, or in the shell
  components (compare `get_styles` with `document.querySelector` per
  class or combo chain);
- one h1, headings in order; all sections directly in `main`;
- `noindex` in the head;
- Is Hero's published CSS has `min-height: 100svh` and the
  `calc(Nav/Height + Section/Padding V)` padding.

Webflow's **Clean up unused styles** is only safe once this page holds
every class. Until then, don't run it.
