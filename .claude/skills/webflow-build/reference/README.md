# Reference: Webflow's defaults

[webflow-default.css](webflow-default.css) is what a new, empty Webflow
project publishes before anything is styled (saved 2026-11-09). Every
property a class leaves unset falls back to it. It is a reference only:
never link it, bundle it or copy rules from it into `src/styles.css`.

When an element shows a margin, size, colour or grid track that nobody
set, search this file for the element's tag or `.w-*` class before
anything else.

## Defaults that most often cause trouble

| Default | What it does when the class doesn't set it | Fix (Designer) |
| --- | --- | --- |
| `.w-layout-grid` | A Grid element gets two `1fr` columns, two `auto` rows and 16px gaps. A Div Block with `display: grid` gets none of that (one column), though the canvas draws it 2×2 too | Set columns, rows and both gaps on every grid class (lessons/css.md, lessons/designer.md) |
| `body` | Arial, 14px, line-height 20px, colour #333 | Body tag style in the Designer; the size comes from repo CSS §01 (AGENTS.md) |
| `h1`–`h6` | Bold, margin-bottom 10px, margin-top 20px (h1–h3) or 10px (h4–h6), fixed px sizes and line heights | Tag styles, or set margins on the heading classes |
| `p` | margin-bottom 10px | Paragraph tag style, or the text class |
| `ul`, `ol` | margin-bottom 10px, padding-left 40px | List classes |
| `label` | Bold, block, margin-bottom 5px | Form label class |
| `.w-input`, `.w-select` | Height 38px, border #ccc, padding 8px 12px, font-size 14px, margin-bottom 10px | Input class (lessons/designer.md › form and dropdown defaults) |
| `.w-form` | margin-bottom 15px on every Form Block | A Form Block class with margin-bottom 0 |
| `.w-button` | Background #3898ec, padding 9px 15px, white text | Button class |
| `.w-container` | max-width 940px, centred | Use the site's own container class |
| `blockquote`, `figure` | Left border and 18px type; margin-bottom 10px | Rich text child styles |
| `.w-richtext figure` | max-width 60% | Rich text image styles |

Changing any of these in repo CSS is an `override-webflow` rule and needs
the person's approval first (AGENTS.md › CSS policy).

## Refreshing the copy

Publish a new, empty project to its webflow.io staging, open the
`*.webflow.shared.*.css` link in the page's `<head>`, and replace
everything below the header comment. Keep the site ID and URL out of the
file and the commit (CONTRIBUTING.md › Generic only).
