# Task progress

`docs/handoff/progress.json` holds the client's plans, which checklist items are done in each, who did them, and the requests. It lives in the repo, so every Claude Code session, CI and the other Mac see the same progress. Claude records ticks with `pnpm progress` (`scripts/progress.mjs`); `pnpm progress show` prints where the client stands. A client with only a Webflow site (no repo) keeps the same file as `<Client>/progress.json`.

```json
{
  "format": 2,
  "plans": [
    {"id":"build","kind":"new-build","status":"active","started":"2026-10-01"},
    {"id":"seo","kind":"seo","status":"active","started":"2026-11-02","cycle":{"day":2}}
  ],
  "ticks": {
    "build/build/Before building": {
      "aee8a1a351c7": {"text":"Final designs approved in writing, …","by":"you","at":"2026-10-31T12:00:00.000Z"}
    },
    "build/build/page//about": {
      "…": {"text":"…","by":"check","at":"…"}
    }
  },
  "todos": [{"id":"t-1a2b3c4d","text":"Swap the hero photo","done":false,"from":"the client"}],
  "components": ["Nav", "Footer"],
  "history": [{"at":"2026-11-02T10:00:00.000Z","text":"Started seo"}]
}
```

| Field | Meaning |
|---|---|
| `plans` | The work on this client: `new-build`, `migration`, `optimization`, `seo` or `maintenance`. Several can run at once; a finished plan keeps `status: "done"` and its ticks. `stage` is set only when someone picked it by hand; otherwise it's derived (below). Recurring plans (SEO, Maintenance) have a `cycle` day; Optimization can have `targets` (e.g. `{"lcp": 2.5}`). |
| `ticks` | By `<plan>/<group>`, then by item. A group is `build/<checklist>` (from `webflow-build/checklists.md`), `launch/<checklist>` (from `webflow-launch/SKILL.md`), `build/page/<path>` or `build/component/<name>`; SEO, Maintenance and Optimization use their skills' checklists (`webflow-<kind>/checklists.md`) when the template has them. A checklist with sub-headings uses `<heading> · <sub-heading>`, e.g. `launch/Pre-launch QA · Content`. A New build has the build and launch checklists; a Migration has the build ones. |
| item id | The first 12 hex characters of `sha1("<group>\n<item text>")` for the `build` plan, and of `sha1("<plan>/<group>\n<item text>")` for any other, where the text is the item with Markdown emphasis and links removed and spaces collapsed. Rewording an item changes its id, so an old tick shows as "changed", not done. |
| `by` | `you` (a person ticked it), `claude` (Claude did the work) or `check` (a `pnpm wf:*` script passed). |
| stage | Derived per build plan: the first stage with an unticked item, in the order Prototype (when the workspace has a `prototype/` folder, or there's a Prototype tick), Before building, Foundation, Components, Pages, Build handoff, SEO plan, Pre-launch QA, Launch day, Client handoff, After launch. |
| `todos` | Requests: the person's (or the client's) to-dos, across plans. Claude reads them; it adds one only when asked. |
| `components` | The components that get a Component done group. |
| `history` | Plans started and finished. |

A fresh project's file has no plan; the first build tick treats it as a New build. A format 1 file (no `plans`, from a pre-release of 0.13.0) reads as one `build` plan with its ticks moved under `build/`; the ids don't change.

**Writing it:** one plan and one tick per line, groups and ticks sorted by key, two-space indent, as `pnpm progress` writes it. Two Macs ticking different items then change different lines, and git merges them without a conflict.

**Items a check proves:** a `[Claude checks]` item that names its script in brackets right after its plain words, as in "No serious or critical accessibility failures at any width (`a11y`)", is proved by that check: tick it `by: "check"` when the check passes, and untick it when a later run fails. Write such an item only when the check tests exactly what it says; anything else (a walkthrough, a report to read) goes in its own item, and a script named elsewhere in an item (`` `pnpm wf:seo --live` … ``) doesn't link it.

**Manual Designer steps** stay in `docs/handoff/MANUAL-TODO.md`: a person writes `☑` in a row's Done cell when it's done.

`new-project` creates an empty file, and `update-skills` adds one to projects that don't have it.
