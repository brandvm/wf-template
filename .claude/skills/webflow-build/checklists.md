# Build checklists

Gates for a Webflow build, from the agency's project checklist. Setup,
discovery and design work (contracts, kickoff, research, client access) are
people work and stay in the agency's own checklist; these lists start where
the build needs inputs and end at the build handoff.

Tags: **[Claude]** Claude does it · **[Claude checks]** Claude verifies and
reports · **[Person]** a person does it; Claude may track it, never claim it.
Commands are the check scripts (`pnpm wf:*`, see SKILL.md › Checks).

## Before the prototype (inputs first)

Run once, right after Project setup and before any prototype page. These
inputs change the structure of everything after them, so they come
before code. Missing → ask; Claude never fills them in with guesses.

- [Person] The design: a Figma link with a frame per breakpoint for every
  page ([figma.md](figma.md)), or the agreement to design in the
  prototype.
- [Person] The desktop design frame and the width range it scales over,
  for the fluid scaling in `src/styles.css` §01 (default 1680, scaling
  1440–1680). [Claude] sets `--size-container-ideal`, `-min` and `-max`
  from it, and the Webflow variables stay in em.
- [Person] CMS structure: collections, fields (with types), references,
  sort order, and which pages list or template them.
- [Person] SEO per page: title, meta description, H1, slug.
- [Person] States for every control and component: hover, focus,
  pressed, disabled, error, empty, open.
- [Person] Final content placed in the designs (no lorem ipsum), or a
  dated list of what is still to come and from whom.
- [Claude] Records the answers in `docs/handoff/HANDOFF.md` (Pages, CMS,
  Decisions) and the gaps in Open decisions.

## Before building (design handoff, approved in writing)

Don't start building a page in Webflow until its inputs exist. Missing →
ask.

- [Person] Final designs approved in writing, every page at every
  breakpoint (an approved localhost prototype counts).
- [Person] Component library with its rules, including hover, focus,
  error and disabled states.
- [Person] Interaction and animation specs; prototypes for key flows.
- [Claude checks] Everything in **Before the prototype** is still
  current (content, SEO fields, CMS structure).
- [Person] Assets exported with licences (images, icons, fonts with a web
  licence).
- [Person] Forms spec: fields, where submissions go, who is notified,
  success and error copy.
- [Person] Tracking plan (which conversions), integrations list,
  languages, accessibility standard, browsers and devices to test on.
- [Claude checks] The handoff covers edge cases: long titles, missing
  images, empty CMS lists, form errors and success, the 404 page. Ask for
  anything that isn't designed.
- [Claude] Staging password-protected and set to noindex (Page/Site
  settings, or the `noindex` meta in head code if the plan can't).

## Page done (per page, before showing it for review)

- [Claude checks] `pass` and `compare` match the design at all three
  widths; differences are explained or fixed.
- [Claude checks] `outline`: one H1, no skipped levels, no words glued at
  line breaks; matches the H1 to H3 marked in the design.
- [Claude checks] `anchors`: every in-page and cross-page link lands on
  its section.
- [Claude checks] `a11y` at all widths: no serious or critical failures;
  `links`: no broken links (`#` placeholders listed in the known issues).
- [Claude] States built and checked: hover, focus-visible, active,
  disabled, error; animations as specced; reduced motion respected.
- [Claude] Forms: validation, spam protection, success and error messages,
  recipients; the CRM connection if specced (logins through the vault).
- [Claude] SEO fields set: title, meta description, slug, Open Graph
  image; alt text on content images, `alt=""` on decorative ones.
- [Claude] CMS: fields bound, empty-list and missing-image states handled,
  conditional visibility for optional fields.
- [Claude] No placeholder text, `#` links or stand-in images left, or each
  one listed in the known issues with an owner.
- [Claude checks] Design QA against the approved design, including states
  and animations, then [Person] the designer signs off.
- [Claude] Changes made during the build noted in the changes log
  (`BUILD-NOTES.md`).

## Build handoff (to launch / QA, signed off against the design)

The documents live in `docs/handoff/`: `BUILD-NOTES.md` holds the CMS
notes, integrations, changes log, redirect map and known issues.


- [Claude] Staging link with every page complete.
- [Claude] CMS notes: how to edit what (collections, fields, conditional
  sections, components and their props).
- [Claude] Integration list and configuration notes (no credentials).
- [Claude] Changes log from development.
- [Claude] Redirect map: every old URL → its closest new page (from the
  crawl saved in discovery).
- [Claude] Known issues, split into fix before launch and fix after launch.
- [Claude] `GOTCHAS.md` and `docs/handoff/MANUAL-TODO.md` current; every
  manual step done or handed over.

The lists after the build (pre-launch QA, launch day, handoff to client,
after launch) are in the `webflow-launch` skill.
