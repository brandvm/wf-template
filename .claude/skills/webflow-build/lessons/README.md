# Lessons from earlier builds

Things that cost time on earlier client builds, with the fix for each.
Read the file for the area you are about to work in; you don't need all
of them every session.

| File | Covers | Entries |
| --- | --- | --- |
| [mcp.md](mcp.md) | Webflow MCP and API: What the Webflow MCP tools (element and WHTML builders, styles, variables, components, CMS) do differently from what you would expect, and the workaround for each. | 25 |
| [designer.md](designer.md) | Designer and canvas: How the Designer, the canvas and publishing behave: combos, components, tag styles, forms, grids, empty elements. | 13 |
| [css.md](css.md) | Repo CSS: Repo CSS against the Designer: cascade, focus, fixed children, overflow. | 7 |
| [js.md](js.md) | JavaScript modules: Modules, GSAP, Lenis, Barba, Finsweet and Webflow's own scripts. | 10 |
| [loader-release-ci.md](loader-release-ci.md) | Loader, release and CI: The three snippets, releases with jsDelivr tags, and the CI checks. | 5 |

## Titles

**Webflow MCP and API** ([mcp.md](mcp.md))

- Only one collection can take breakpoint auto-modes
- Style MCP rejects variables on row-gap / column-gap
- "Label" is a reserved class name
- Tag styles other than body are unreachable by MCP
- `mode_id: "base"` fails on variable updates
- Style values containing `var()` collapse to one variable
- "Form" is a reserved class name; outline-width takes no variable
- WHTML importer: classes, forms, images and limits
- Component props: what the MCP can and can't wire
- WHTML importer turns `<button>` into a link
- Sitemap indexing API is plan-gated
- Element builder: rejected actions can still leave an element
- TextBlock builder makes an uneditable Block; WHTML drops fs-* attributes
- CMS API: Number fields are integers; new collections need a site publish
- WHTML drops the whole class list if one class is missing
- Nested button components: what the MCP can't do
- `remove_style` only sees usages on the page in context
- Importer drops <img> attributes; Webflow drops valueless video booleans
- API gaps met building a home page
- Line breaks in headings drop the word space
- Variable writes hit a rate limit; breakpoint auto-modes work on a fresh collection
- Breakpoint variable modes don't read back; tag styles need the right site
- Filled slots read back empty
- Slots: the MCP can work beside a plain element, never start one
- Element snapshots can show stale styles

**Designer and canvas** ([designer.md](designer.md))

- A two-class combo can't be edited from a three-class element
- Gradient layers have no size/tile in the Designer
- Webflow form and dropdown defaults leak through our classes
- Webflow rewrites roles and drops attributes on publish
- Native `<button type="submit">` in Webflow forms
- Inter Variable narrows large type (optical size)
- Designer canvas draws a templateless grid as 2×2
- Canvas `.wf-empty`: empty elements show as 75px boxes or vanish
- Split text in Webflow Spans flattens when edited
- Conditional classes are typed slugs, not linked styles
- em spacing moved from a button to its wrapper changes size
- Removing a rule locally does not remove it on the canvas
- An Embed with a script hides its stylesheet link on the canvas

**Repo CSS** ([css.md](css.md))

- Horizontal scrollers drag vertically
- Template focus rule overrides Designer focus states on inputs
- backdrop-filter traps fixed children (floating nav)
- Element resets in §02 beat Designer tag styles
- Neutralizers in §03 override Designer styles
- Root font-size scale drifts from Designer tokens
- Renaming a Webflow variable silently breaks repo CSS

**JavaScript modules** ([js.md](js.md))

- Finsweet Combo Box 2.7.1 differs from its docs
- Webflow images publish with srcset; swapping src does nothing
- Arriving at /#section lands short of the section
- gsap.from() start state reverts on load: hero flickers
- Barba: first-load hooks, lost hash, missing types
- Page modules torn down per Barba page
- Anchors to pinned sections land at the end of the pin
- One throwing module leaves the page scroll-locked
- CDN `defer` scripts cannot be ordered against the bundle
- Webflow's anchor scroll ignores a sticky header

**Loader, release and CI** ([loader-release-ci.md](loader-release-ci.md))

- Filling in REPO in loader.html breaks the browser tests
- Body Embed stylesheet: page paints unscaled, then jumps
- Static localhost link is requested by public visitors
- VER lives in two snippets and a placeholder 404s at launch
- The add -f dist / untrack release ritual is error-prone

## Adding a lesson

A project logs a surprise in its own `GOTCHAS.md` and tags it
`template-candidate` when it would recur on any project. Those entries are
collected into these files (see the template README › AI agents), with client
names, copy and project-only details made generic. Keep the entry format of
`GOTCHAS.md`, without the Scope line.
