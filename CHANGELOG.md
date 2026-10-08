# Changelog

Versions of the template itself. A repo created from it records the
version in `.wf-template.json` (`version`); `pnpm update-skills` brings its
skills up to a newer one and records that under `skills`. Template releases
are tagged `vX.Y.Z` in this repo (they have nothing to do with a client
repo's own release tags).

Until 1.0.0 the template is still taking shape and isn't tagged;
`pnpm update-skills` then follows master. Bump the version in `.wf-template.json` and add an entry here in the same
pull request as the change: patch for fixes and wording, minor for new
checks, scripts or lessons, major when a client repo has to change something
by hand to follow (e.g. the loader snippets).

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
