# The starter site

A Webflow site that already holds the base system from
[conventions.md](conventions.md), so a project starts from a duplicate
instead of an empty site. The agency keeps one (for example "WF Starter")
in its workspace; its site ID stays out of this repo.

## Starting a project from it

1. [Person] Duplicate the starter site in the Webflow dashboard and name
   the copy after the client. Webflow gives it a new site ID and a
   staging subdomain.
2. [Claude] Find the copy by name through the Webflow connector (site ID,
   staging subdomain) and run `pnpm new-project` with those values
   (SKILL.md › Project setup).
3. [Claude] Point Embeds 2a and 2b in G | Components at the repo:
   replace `ORG` and `REPO` with the values in `loader.html` (a Webflow
   change, so after the go-ahead). The canvas shows the repo CSS once the
   first push has deployed.
4. [Claude] Take the snapshot for the prototype (prototype-starter ›
   Webflow snapshot). The starter's values are neutral placeholders: the
   design's colours, type and spacing replace them as old → new
   proposals, like any other variable change.

## What it holds

Built from `conventions.md`, in the order the Designer needs (each batch
approved before it is written). Values are neutral: a system font stack,
greys plus one accent, a spacing scale, all sizes in em. Writing a batch
this size through the MCP hits the rate limit: send about 20 writes per
call (`lessons/mcp.md`). Webflow names every collection's first mode
"Base mode" and the MCP can't rename it; its default "Base collection"
can't be deleted and stays empty.

**A. Variables** (§4)

| Collection | Modes | Contents |
| --- | --- | --- |
| Colors | Base | `Brand/Ink`, `Brand/Paper`, `Brand/Accent`; `Ink Tint/Ink 4…64`, `Paper Tint/Paper 12…64` |
| Colors Semantic | Base, Dark | `Background/Page`, `Background/Surface`, `Background/Overlay`, `Text/Primary`, `Text/Secondary`, `Text/Accent`, `Border/Subtle`, `Button/Background`, `Button/Text`, `Button/Background Hover`, `Form/Focus`, `Link/Hover`, each an alias of a Colors variable |
| Typography Scale | Base | `Family/Base`, `Size/12…96`, `Weight/Regular`, `Weight/Medium`, `Weight/Bold`, `Line Height/Tight`, `Snug`, `Normal`, `Letter Spacing/Tight`, `Normal`, `Wide` |
| Typography Role | Base + Tablet, Mobile Landscape, Mobile (breakpoint auto-modes) | `Family`, `Size`, `Weight`, `Line Height`, `Letter Spacing` for Display, H1–H6, Body, Body Large, Body Small, Label, Button |
| Typography Styles | Base (= Body) + one per other role | the five properties, each mode aliasing its role |
| Layout | Base, Tablet, Mobile Landscape, Mobile (set on the Body tag style) | `Section/Padding V`, `Section/Padding H`, `Container/Max Width`, `Content/Gap`, `Nav/Height`, `Nav/Padding H`, `Button/Height` |
| Spacing | Base | `None`, `Hairline`, `2`, `4`, `8`, `12`, `16`, `24`, `32`, `48`, `64`, `96`, `128` |
| Radius | Base | `None`, `2`, `4`, `8`, `Pill` |

**B. Tag styles** (§5). [Person] sets one property on All H1–H6
Headings, All Paragraphs and All Links in the Designer, and creates the
reserved classes **Label** and **Form** (the API can't), each with one
property and on an element so Webflow keeps them. [Claude] then
binds Body (no font-size: the repo's fluid scaling owns it), H1–H6,
Paragraphs and Links to the variables and sets the Layout mode on Body at
each breakpoint.

**C. Base classes** (§2–3): **Section** with **Is Hero**, **Is Top**,
**Is Media**, **Is Dark**; **S Bg**, **S Bg Media**, **S Bg Overlay**;
**S Wrapper** with **Is Wide**; **G | Page W**, **G | Nav W**,
**G | Main W**, **G | Footer W**; **D0–D6**, **Body L**, **Body S**,
**Label Text**, **Chip**; **Skip Link**; the utilities **Text Secondary**,
**Text Uppercase**, **Max Width Text**, **Weight Medium**,
**Leading Tight**, **Tracking Wide**; **Button** with **Is Secondary**
(hover, focus-visible and pressed states). Type classes bind the five
Typography Styles variables and pick a mode; gaps bind `grid-row-gap` /
`grid-column-gap`; classes for empty elements (S Bg, S Bg Overlay) carry
padding 0 and `font-size: inherit`. [Person] sets the padding-top of
**Is Hero** and **Is Top** to `calc(Nav/Height + Section/Padding V)` in
the Designer (a `calc()` with variables can't go through the MCP).

**D. Page shell and components** (§1, §10), all in the component group
*Global* and named after their root class:
- **G | Components**: class G | Components (fixed, 0×0, invisible) and
  `aria-hidden="true"`. Three embeds, named in the Navigator: an empty
  **Embed · site code (GTM noscript)** for each project's body-start code
  (`conventions.md` §1), then Embeds 2a and 2b with `ORG`/`REPO`
  placeholders.
- **G | Page W**: Skip link (→ `#main`) › G | Nav W › G | Main W ›
  `main#main` with class G | Main as the slot "G | Main", then
  G | Footer W.
- **G | Nav W**: div G | Nav W › `nav` G | Nav (aria-label "Main") › a
  placeholder link. **G | Footer W**: div G | Footer W › `footer`
  G | Footer › S Wrapper Is Wide › placeholder text.
- Every page (Home, the style guide, the 404) is G | Components +
  G | Page W, with its sections in the slot. **To Slot** (dashed outline,
  "To slot" label) marks the wrapper a person drags into a page's slot.
- Built with the element builder; `nav`, `main` and `footer` tags set
  afterwards. [Person] makes `main#main` the slot and copies the shell into
  the 404 utility page (the MCP can't reach utility pages). Until a
  project pastes its head code, staging logs "[wfc] Head code config
  missing" and the 2a stylesheet 404s; both are expected in the starter.

**E. Reserved classes page.** No style guide ships with the starter; each
project makes its own ([style-guide.md](style-guide.md)). The page
`/design/style-guide` holds one section with h1–h6 and a Form (class
**Form**, its label **Label**, submit **Button**), so the reserved classes,
which only the Designer can create, survive duplication. Its head code has
`noindex`. **Never run "Clean up unused styles" on the starter:** most
classes are on no element until a project's style guide applies them.

The starter is never published to a custom domain and holds no client
content. When `conventions.md` changes, update the starter in the same
round of work, then refresh `prototype-starter/webflow-snapshot/` from it.
