---
name: webflow-build
description: Build a Webflow site from an approved design (a Figma link or a localhost prototype) with the Webflow MCP and this wf-template repo, section by section, verified against the design at three widths, up to the build handoff. Use when starting a new project ("New project: Webflow site <name>, Figma <link>"), setting up a repo and workspace from wf-template, reading a Figma design, starting a localhost prototype, starting or continuing a Webflow build (Designer through the MCP plus JS/CSS in the repo), comparing Webflow staging with the prototype, checking anchors, page transitions or load flicker, or wrapping up a build session. For launch, use webflow-launch.
---

# Webflow build: approved design → Webflow, section by section

The person approves every design decision; Claude builds, verifies and
reports. A section is done only when it matches the approved design at every
width, works after every way of arriving at it, and its manual steps are
listed.

- [checklists.md](checklists.md) gates the start of the build, each
  finished page and the build handoff.
- [conventions.md](conventions.md) sets the page and section structure,
  class and variable naming, and the component, CMS and style-guide
  patterns every build starts from.
- [lessons/](lessons/README.md) holds what cost time on earlier builds, by
  area. Read the file for the area you are about to work in.
- [prototype-starter/](prototype-starter/README.md) is a localhost
  prototype that mirrors Webflow, for when the design is built and approved
  in code first.
- [figma.md](figma.md) reads a design from a Figma link through the Figma
  connector: frames per breakpoint, screenshots, variables, measurements.
- [starter-site.md](starter-site.md) describes the starter Webflow site a
  project duplicates, with the base system already in it.
- [style-guide.md](style-guide.md) is how to make a project's style guide
  page when asked: prototype first, then Webflow, then the staging checks.
- After the build handoff, the `webflow-launch` skill takes over: pre-launch
  QA, launch day, the client handoff and the first 30 days.

Every checklist item says who does it:
- **[Claude]** Claude does it (through the MCP, the repo or a script).
- **[Claude checks]** Claude verifies it and reports; a person fixes what
  Claude can't.
- **[Person]** a person does it (client, PM, designer, DNS, accounts).
  Claude may remind and track it, never claim it.

## Session start (every session)

1. Read the workspace `CLAUDE.md`, then this repo's `AGENTS.md` and
   `GOTCHAS.md`, then `docs/handoff/` (`HANDOFF.md`, `MANUAL-TODO.md`,
   `BUILD-NOTES.md`). Skim [lessons/README.md](lessons/README.md) and read
   the lesson file for today's area (MCP work: `lessons/mcp.md`). Never
   repeat a mistake already logged.
2. Read the project memory: where the last session stopped, open manual
   steps, open questions. Say in one line where things stand and what's
   next; ask which page or section if it isn't clear.
3. On a new project, run **Before the prototype** in `checklists.md`
   first, and **Before building** before the first Webflow batch. Agree
   any change to `conventions.md` with the designer. If an input is
   missing, ask for it; don't guess content, states or SEO fields.
4. Webflow MCP: call `webflow_guide_tool` once, then reuse one session id
   and agent id for the whole session.
5. The prototype dev server is running and `webflow-build.config.json`
   exists (`pnpm new-project` writes it; see Project setup).
6. Today's scope is one page (see Working rhythm). Say which.

## Standing rules (unless the project's own rules say otherwise)

- **Never commit or push without an explicit OK.** List the touched files
  first; group related changes into one ask. Work on the default branch.
- **Designer first.** Anything the Designer can express (classes, combos,
  variables, breakpoint styles, states, custom properties) goes in Webflow.
  Repo CSS only with a `repo-css: <tag>` reason (see `AGENTS.md`).
- **Ask before creating, editing or removing classes and variables**, one
  batch at a time, with names and values. A request that clearly implies
  them (e.g. "build it in Webflow" after approving a mock) is the OK.
- **Publishing to the webflow.io staging domain is fine.** Never publish to
  a custom domain, cut a release or change DNS without asking.
- **No credentials in chat.** Logins come through the team's password vault
  or the person's own sessions; never ask for, store or repeat a password,
  API key or token.
- **Manual steps** the API can't do go in `docs/handoff/MANUAL-TODO.md`
  (lettered A, B, C…) with *why* the API can't. Mark them done when the person says so.
- **Log surprises** in `GOTCHAS.md` in the same change as the fix, with the
  file's entry format; tag `template-candidate` when it would recur on any
  wf-template project.
- When the person corrects you, update the fix everywhere it applies and
  say so. Don't argue; verify.

## The section loop

For each section, in page order:

1. **Read the design**: prototype markup, CSS and the module that animates
   it; or the Figma frame, its states and the interaction spec. Note every
   `data-*` hook, id and aria attribute.
2. **Check what Webflow has**: classes (`query_styles`), components and
   their props, CMS fields, assets. Reuse before creating; name anything
   new by `conventions.md` (sections 2–4).
3. **Build**, preferring, in order:
   - component instances;
   - the element builder for DOM elements (`button`, `ul/li` when ARIA
     roles must survive, `svg`, `span` with tag), with nested children;
   - WHTML import for plain markup, then fix what it drops (see the
     importer checklist below).
   Page content lives in the **G | Main** slot of the G | Page W
   component. On a page whose slot is still empty: build the sections in
   a **To Slot** wrapper after G | Page W, ask the person to drag the wrapper into the slot, then ungroup
   it (move each child before the wrapper, remove the wrapper). Once a
   section is in the slot, build next to it directly (`conventions.md`
   §1). Check slot content with `query_elements`; the page tree shows
   slots as empty.
4. **Wire** attributes, CMS bindings, prop values, links, form settings.
5. **Publish**, then run the checks. Fix, re-publish, re-check.
6. **Report**: what was built, what matched, what differs and why, manual
   steps, and the files waiting for a commit OK.

When a page is complete, run **Page done** in `checklists.md`.

### Importer checklist (after every WHTML import)

- `<button>` became a Link → rebuild as DOM `button`, move children in.
- `<img>` lost every attribute and its asset link → `set_image_asset`,
  re-add `data-*`, `loading`, size (or a class with `aspect-ratio`).
- `<span>` became a text Span → shapes as `<div>`; split text pieces as
  DOM `span` (otherwise editing the parent's text flattens them).
- A class list with one missing class lost *all* its classes → create
  classes first, re-check `styleNames`.
- DOM elements keep a literal `class` attribute → `remove_attribute class`.
- A normal space before `<br>` is trimmed → `Line.&nbsp;<br>Next`.
- Boolean attributes need a value (`muted="true"`) or publishing drops them.
- Lists publish as `role="list"` → keep ARIA roles on DOM `ul/li`.

### Canvas hygiene

- Every class on an empty element: padding 0 on all sides and
  `font-size: inherit` (the canvas `.wf-empty` adds 75px padding and
  font-size 0).
- Every grid sets at least one row and one column template; centre single
  children with flex, not grid.
- No style values only the MCP can see: if the Designer can't display it,
  it belongs in repo CSS with a tag.

## Checks

The scripts are in this skill's `scripts/` folder, with a `pnpm` shortcut
each. They read `webflow-build.config.json` from the current directory or a
parent (the example is `webflow-build.config.example.json`). By default
staging loads this repo's local `dist/`, so code can be checked before a
push; `--live` checks what visitors get. Screenshots go to
`.webflow-build/` next to the config.

```bash
pnpm wf:compare /path '<section selector>' [width] [--scroll]   # element geometry vs prototype
pnpm wf:pass /path [width]                                       # whole page: section offsets + pixel frames
pnpm wf:anchors /path [width] [--offset N]                       # every #link lands on its section
pnpm wf:outline /path                                            # heading outline, one h1, glued words at <br>
pnpm wf:film /path [selector] [width]                            # first seconds of a load (flicker)
pnpm wf:transitions /start /a /b [--width W]                     # Barba swaps, leaks, full page loads
pnpm wf:a11y [/path…] [--all-widths]                             # axe scan, WCAG 2.2 A/AA rules
pnpm wf:links [/path…] [--max 50] [--external]                   # crawl: broken, # and placeholder links
pnpm wf:baseline save|compare [/path…]                           # full-page visual baselines (launch, releases)
```

Paths default to `pages` in the config, else `/`.

From outside the repo, run the same files with `node
.claude/skills/webflow-build/scripts/<name>.mjs`.

Reading results:
- `compare`: ±1px is rounding. "Only in webflow" rows for component
  wrappers are expected structure, not bugs.
- `pass`: video heroes differ frame to frame. Any other frame >2% is a real
  difference: open the PNG pair before guessing. A section offset that
  differs shifts everything after it, so fix the first one.
- `anchors`: every row `ok`; pinned targets are measured at their
  `.pin-spacer`.
- `load-film`: healthy = hidden → 0 → rising. Items at full opacity before
  the animation = flicker.
- `transitions`: ✓ on every swap, height and pins equal to the direct load
  after each round, `full loads 1`.
- `a11y`: exits 1 on serious or critical failures. Automated rules catch
  about a third of WCAG issues; keyboard and screen reader checks stay.
- `links`: `#` links are fine while content is missing, as long as each
  one is in the known issues.
- `baseline`: `CHANGED` rows have before/after PNGs; expected changes →
  `save` again and commit.

Run `compare` per section while building; `pass`, `outline`, `anchors`,
`a11y` and `links` when a page is done; `load-film` after touching the hero or the loader;
`transitions` after touching pages, links or modules. Check all three
widths (Webflow's breakpoints are 991/767/479). For interactions, script
the hover, click or scroll state and compare that, not only the resting
state.

The prototype comparison needs a localhost prototype. With a Figma-only
handoff, review against the frame screenshots in `Assets/figma/`
([figma.md](figma.md)) and run the other scripts as they are.

## Repo work

- One module per feature in `src/modules/`, one `run()` line in the
  manifest. Modules depend on `data-*` attributes, not class names.
- `pnpm check && pnpm build && pnpm test` before asking to commit; `dist/`
  is committed with the source.
- With page transitions (Barba), page modules run per page inside a
  `gsap.context` with their listeners recorded and torn down on leave;
  global modules (Lenis, nav) run once and expose refresh hooks. Test after
  arriving by transition, not only on direct load.
- Things visible at load: `gsap.set()` + `gsap.to()`, never `gsap.from()`.
- Swapping a Webflow image: remove `srcset`/`sizes` first.
- Anchors: unbind webflow.js's `click.wf-scroll`; scroll to a pinned
  section's `.pin-spacer`; pause scroll snapping during the glide.
- Never put `backdrop-filter`, `filter` or `transform` on a wrapper that
  holds `position: fixed` children.
- Libraries are bundled, never Webflow script tags. Finsweet Attributes:
  [recipes/finsweet/](recipes/finsweet/README.md).
- Sizes follow the fluid scaling in `src/styles.css` §01: Webflow
  variables in em, the desktop frame set to the design before building.
- Loader snippets aren't versioned: any `loader.html` change must be
  re-pasted in Webflow (a manual step).

## Project setup (new project)

The flow starts from one message (README › Starting a project), e.g.
*"New project: Webflow site <name>, Figma <link>. Set up the repo and
workspace, run Before the prototype, then build the prototype page by page;
wait for my go-ahead before any Webflow change."*

Before it, a person has created the repo from the template on GitHub,
cloned it into its own client folder (`<Client>/wf-<client>/`), and
duplicated the starter site under the client's name
([starter-site.md](starter-site.md)).

1. **Skills first.** Offer `pnpm update-skills` (ask; it replaces local
   skill edits), so the project starts on the latest lessons.
2. **Find the site.** Through the Webflow connector, list the sites and
   match the name the person gave: the site ID and the short name (the
   staging subdomain, `<short name>.webflow.io`). Two matches or none →
   ask. Read the GitHub org and repo from `git remote get-url origin`.
3. **Fill in the repo and set up the workspace:**

   ```bash
   pnpm install
   pnpm new-project --client "<Client>" --slug <short name> --org <org> --site-id <id>
   ```

   It fills in the project facts in `AGENTS.md`, the `package.json` name,
   `REPO` in `loader.html` and the handoff title, and writes
   `webflow-build.config.json`. Around the repo it creates the workspace:
   `<Client>/CLAUDE.md` (imports `AGENTS.md`, `GOTCHAS.md` and
   `docs/handoff/`), `.mcp.json`, links to the skills, `prototype/` (a copy
   of [prototype-starter/](prototype-starter/README.md)) and `Assets/`.
   Write the Figma link into the workspace `CLAUDE.md` (Design line). Ask
   for any value you can't find; never guess.
4. **List the person's steps, in this order,** and track them in
   `docs/handoff/MANUAL-TODO.md` until done:
   1. Repo Settings → Pages → Source: GitHub Actions; add the developers
      team.
   2. First push: Claude asks to commit the setup; after the push the
      staging workflow must pass (`https://<org>.github.io/<repo>/styles.css`
      loads).
   3. Paste the loader from `loader.html` (ORG and REPO are now filled
      in): head code and footer code in Site settings. Embeds 2a and 2b
      already sit in G | Components with placeholders: Claude fills
      them in through the MCP after the go-ahead, or the person pastes
      them.
   4. Staging password and noindex until launch.
5. **Move to the workspace.** From the next session, Claude is opened in
   `<Client>/`, not in the repo: that is where the MCP server, the skills
   and the imports are set up. Run `pnpm install` in `prototype/`.
6. **Inputs, then the prototype.** Run **Before the prototype** in
   `checklists.md`, read the design ([figma.md](figma.md)), take the
   Webflow snapshot, and build the prototype page by page.
7. Fill in `docs/handoff/HANDOFF.md` from the design; keep
   `MANUAL-TODO.md` and `BUILD-NOTES.md` current from the first session.
8. Structure and names follow `conventions.md`. Webflow order: approve
   variables → classes → tag styles (set once in the Designer so the MCP
   can reach them) → CMS collections → style guide page
   (every class used, so cleanup can't delete them) → components → pages,
   section by section. A site duplicated from the starter already has the
   base of each; the project adds to it.

## Working rhythm

- **One page per session, finished completely:** built, checked at every
  width, its states and SEO fields done, **Page done** run, handoff
  updated. Half-built pages are where shortcuts get forgotten.
- **Page-by-page approval.** The designer approves each prototype page
  before its Webflow build, and each Webflow page before the next one
  starts.
- **A go-ahead before each Webflow batch.** Propose the batch (variables
  old → new, classes with what they are for, the elements to build), wait
  for the OK, write it, report what changed. Approval of one batch never
  covers the next.
- **`docs/handoff/` stays current** during the session, not at the end:
  a decision goes into `HANDOFF.md` when it is made, a manual step into
  `MANUAL-TODO.md` when it is found.
- **Lessons go back.** At wrap-up, offer every `template-candidate`
  lesson to the template (see Contributing).

## Session wrap-up

1. Everything published; repo clean or the commit ask made.
2. `GOTCHAS.md` updated; `docs/handoff/` current.
3. Project memory updated: where things stand, last commit, next step,
   open questions.
4. Short report: done today, next, open questions.
5. If the session taught something the next project should know, offer to
   contribute it back (see Contributing).

## Contributing

This skill lives in the template repository this project was created from
(`template` in `.wf-template.json`), at
`.claude/skills/webflow-build/` (with `webflow-launch` next to it). Anyone
with a GitHub account can improve it: fork the repo, change the skill or
its lessons, and open a pull request. A repo created from the template
gets later skill versions with `pnpm update-skills` (recorded in
`.wf-template.json`); ask before running it, since it replaces local edits
to the skills.

**When to offer a contribution** (Claude, at wrap-up or when it happens):
- a `template-candidate` lesson that isn't in `lessons/` yet;
- a fix or improvement to a check script, or a new check worth reusing;
- a checklist item that turned out to be missing or wrong.

**How:** say what you'd contribute and why, in two or three lines, and ask.
Follow the template's `CONTRIBUTING.md` (version bump and changelog
entry).
With an OK, prepare the change against a fresh clone of `wf-template`
(never the client repo), keep it generic (no client names, URLs, people or
credentials), and open a pull request from a branch or fork with `gh pr
create`. Never push to the template's default branch unless the person
says so. If the person has no write access, fork first.

**What a good contribution looks like:**
- lessons follow the `GOTCHAS.md` entry format (without Scope), go in the
  file for their area, say what happened and why, and give a fix someone
  else can apply, with client names, copy and project details made generic;
- scripts keep working from the config file alone (no hard-coded sites);
- checklist items keep their [Claude] / [Claude checks] / [Person] tag.
