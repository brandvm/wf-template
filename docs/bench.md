# The template in Bench

Bench is a desktop workspace for Webflow builds. Its users never need this repo or a GitHub account for it. Instead:

- Bench carries the template as **signed packs**.
- It creates projects from a pack.
- It updates them with `pnpm update-skills --from <pack>`.

A user can also use **their own** template: either a customized copy of this one, or one they wrote. That works as long as it meets the [contract](#template-contract-version-1) below.

This page is the agreement between the template and Bench. Change it, and `contract` in `.wf-template.json`, together.

## Template packs

`pnpm pack-template` turns a version of this repo into a pack, written to `packs/`. That folder is never committed.

| File | What it is |
|---|---|
| `wf-template-<version>.tar.gz` | The tracked files at that commit, under a `wf-template/` folder. No git history, `node_modules` or test output. |
| `wf-template-<version>.json` | The manifest (below). |
| `wf-template-<version>.json.sig` | An Ed25519 signature of the manifest file's exact bytes, base64. |

```json
{
  "format": 1,
  "contract": 1,
  "id": "official",
  "name": "Brand Vision",
  "source": "brandvm/wf-template",
  "version": "0.10.0",
  "commit": "4f1c2e…",
  "created": "2026-10-30T18:00:00.000Z",
  "archive": { "file": "wf-template-0.10.0.tar.gz", "root": "wf-template", "size": 812345, "sha256": "…" },
  "notes": "The CHANGELOG.md section for this version, as Markdown."
}
```

**How Bench uses a pack:**
1. Check `.json.sig` against the public key built into Bench.
2. Check the archive's `sha256` against the manifest.
3. Only then extract the archive.

The manifest is what's signed, and it carries the archive's checksum, so one signature covers both files. Bench rejects a pack whose signature, checksum or `format` it doesn't recognize. It also rejects a pack with a `contract` newer than it supports, and tells the user to update Bench.

**The signing key:**
- Run `pnpm pack-template --keygen <dir>` once.
- It writes `pack-key.pem`, which is **secret**: keep it in a password manager or as a CI secret, never in a repo. It also writes `pack-key.pub.pem` and prints the public key, which goes into Bench.
- Pass the private key with `--key <file>`, or `PACK_KEY` holding the PEM text.
- `--unsigned` makes a pack without a signature. Bench uses those for templates a user builds on their own machine, which it trusts because they're the user's own.

## The project record

Every project's `.wf-template.json` says where its template came from:

```json
{
  "version": "0.10.0",
  "contract": 1,
  "created": "2026-10-30",
  "template": "brandvm/wf-template",
  "skills": { "version": "local@0.10.0", "commit": "local", "updated": "2026-10-30" },
  "bench": {
    "template": "official",
    "name": "Brand Vision",
    "version": "0.10.0",
    "base": "0.10.0"
  }
}
```

The `bench` record exists only for projects Bench manages. Its fields:

| Field | Meaning |
|---|---|
| `template` | `official`, `custom/<id>` (a user's customized copy of the official template) or `own/<id>` (a template the user brought). |
| `name` | What Bench shows, e.g. "Brand Vision" or "Studio template". |
| `version` | The template version the project is on now. A customized template uses `<base>+<user's version>`, e.g. `0.10.0+3`. |
| `base` | For `official` and `custom/…` templates: the official version underneath. Bench uses it to offer official updates. Left out for `own/…` templates. |

Bench writes this record with the `--bench '<json>'` flag that `new-project` and `update-skills` both accept. That flag only writes the record; the template's own rules are unchanged.

When a project has a `bench` record, `pnpm update-skills` without `--from` stops and says to update from Bench. Otherwise the command line could pull a different version than the one Bench tracks. `--repo` still overrides this.

`template` (the GitHub repo) stays as it was. For official projects it remains `brandvm/wf-template`, so a developer who has the repo can still run `pnpm update-skills --repo brandvm/wf-template` themselves.

## Bench's answers about the site

`pnpm new-project` also writes `.bench/site.json`: Bench's five answers about
the site (which Webflow site, how it runs here, what the published site loads
from the repo, how code reaches staging and live). They're the same values
Bench works out from `loader.html` and `webflow-build.config.json`, written
down so Bench reads them instead. Commit the file with the repo; Bench ›
Client settings › Code changes it. A repo without it works as before.

```json
{
  "kind": "wf-template",
  "webflow": { "siteId": "<24 hex>", "staging": "https://<slug>.webflow.io" },
  "local": { "command": "pnpm dev", "reload": "esbuild" },
  "loads": [
    { "url": "https://<ORG>.github.io/<REPO>/*", "local": "/*" },
    { "url": "https://cdn.jsdelivr.net/gh/<ORG>/<REPO>@*/dist/*", "local": "/*" },
    { "match": "<bundlePattern>", "local": "$1" }
  ],
  "staging": { "kind": "pages", "branch": "master", "build": "pnpm build", "page": "loader" },
  "live": { "kind": "jsdelivr-tag" },
  "packs": { "from": "repo" }
}
```

## A new site, from Figma

Every new site starts from a Figma file, and its prototype is built before
anything in Webflow. Bench uses the repo like this:

1. **Set up.** Add client › from a Figma design names the client from the
   file and makes the client folder, the repo from a pack (`new-project`)
   and an empty `prototype/`: a copy of
   `.claude/skills/webflow-prototype/prototype-starter/`, run once to see
   it answer.
2. **Pick the pages.** Frames with the same name across Desktop, Tablet
   and Mobile are one page. The person picks and orders them, each with
   its address; two pages at one address are refused.
3. **Build them.** One AI job builds the pages one at a time, following
   the `webflow-build` skill (SKILL.md › The prototype, from Figma): each
   page is `prototype/<page>/index.html` at its address, listed in `pages`
   in `prototype/vite.config.js`. Tokens, fonts and images come from the
   file; a value it doesn't give becomes a to-do. The AI doesn't commit,
   push or publish.
4. **Compare and update.** Each built page keeps its Figma frame for
   Compare › With Figma, and the Matches the Figma frame check compares
   them at each width. Bench looks at the file when the client opens and
   hourly, and offers to update the pages whose frames changed.

Bench keeps the build plan in `<Client>/.bench/prototype-build.json` and
each page's frame in `<Client>/.bench/pages.json`, outside the repo, per
Mac. The **Prototype** stage in `webflow-build/checklists.md` tracks it,
before Before building; Bench proves its first four items (below).

## Template contract, version 1

What any template needs for Bench to create and update projects from it. `node scripts/check-template.mjs <folder>` checks all of it and lists anything missing. Bench runs the copy from its official pack against templates users bring.

1. **`.wf-template.json`** with `version` (`x.y.z`) and `contract: 1`.
2. **`package.json`** with `dev` and `build` scripts. Bench runs `pnpm install` and `pnpm dev`.
3. **`scripts/new-project.mjs`** taking these flags, and never asking questions when stdin isn't a terminal:
   - `--client`, `--slug`, `--org`, `--repo`, `--site-id`
   - `--template`, `--bench '<json>'`
   - `--no-workspace`, `--dry-run`, `--force`
4. **`scripts/update-skills.mjs`** taking `--from <folder>`, `--dry-run` and `--bench '<json>'`. It lists every change before it writes, and never touches the site's own code.
5. **`webflow-build.config.example.json`** and **`loader.html`**. Bench reads the config's `stagingUrl`, `bundlePattern`, `widths` and `pages`, and the loader's `OWNER`/`SITE`, to swap in the local bundle.
6. **`.claude/skills/`** is optional. When it's there, `update-skills` keeps it current.

Template-only files (`scripts/pack.mjs`, `scripts/check-template.mjs`, `scripts/harvest.mjs`, `LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md`) are in packs but removed from projects by `new-project`, as before.

## Task progress

An optional part of contract 1: a template without it still works, and Bench falls back to keeping ticks on one Mac.

`docs/handoff/progress.json` holds the client's plans, which checklist items are done in each, who did them, and the requests. It lives in the repo, so Claude Code outside Bench, CI and the other Mac (through Sync) all see the same progress. Bench's Tasks panel reads and writes it, and Claude records ticks with `pnpm progress` (`scripts/progress.mjs`). A client with only a Webflow site (no repo) keeps the same file as `<Client>/progress.json`.

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
| `by` | `you` (ticked in Bench), `claude` (Claude did the work) or `check` (a `pnpm wf:*` script passed). |
| stage | Derived per build plan: the first stage with an unticked item, in the order Prototype (for a site from Figma: `.bench/prototype-build.json` in the client folder, or a Prototype tick), Before building, Foundation, Components, Pages, Build handoff, SEO plan, Pre-launch QA, Launch day, Client handoff, After launch. |
| `todos` | Requests: the person's (or the client's) to-dos, across plans. Claude reads them; it adds one only when asked. |
| `components` | The components that get a Component done group. |
| `history` | Plans started and finished. |

A fresh project's file has no plan; Bench and the first build tick both treat it as a New build. A format 1 file (no `plans`, from a pre-release of 0.13.0) reads as one `build` plan with its ticks moved under `build/`; the ids don't change.

**Writing it:** one plan and one tick per line, groups and ticks sorted by key, two-space indent, as `pnpm progress` writes it. Two Macs ticking different items then change different lines, and git merges them without a conflict. Collapsed groups and other view settings stay in Bench, per Mac.

**Items a Bench check proves:** a `[Claude checks]` item that names its script in brackets right after its plain words, as in "No serious or critical accessibility failures at any width (`a11y`)", is proved by Bench's own check of the same name: `compare` or `pass` (Matches the prototype), `a11y`, `wf:perf` (Speed: Home on a phone, 90 or more) and `wf:seo` (title, description, canonical and one H1). Bench shows a status mark instead of a checkbox, ticks it (`by: "check"`) when its check passes, and unticks it when a later run fails. The Prototype stage's first four items are proved by their words: the match with each frame by the Matches the Figma frame check, and the file linked, the frames picked and every frame built by Bench's own prototype build. Write such an item only when the check tests exactly what it says; anything else (a walkthrough, a report to read) goes in its own item, and a script named elsewhere in an item (`` `pnpm wf:seo --live` … ``) doesn't link it.

**Manual Designer steps:** ticking a row of `docs/handoff/MANUAL-TODO.md` in Bench writes `☑` into that row's Done cell, as a person would; that file stays the record for those steps.

`new-project` creates an empty file, and `update-skills` adds one to projects that don't have it.

## Releasing to Bench

After tagging a template release (the steps are at the top of `CHANGELOG.md`):

```sh
PACK_KEY="$(cat ~/secure/pack-key.pem)" pnpm pack-template --ref v0.10.0
```

Then upload the three files from `packs/` to Bench's template feed. Bench offers the new version to its users on their next check.
