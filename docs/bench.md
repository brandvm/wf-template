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

`docs/handoff/progress.json` holds which checklist items are done, who did them, and the person's own to-dos. It lives in the repo, so Claude Code outside Bench, CI and the other Mac (through Sync) all see the same progress. Bench's Tasks panel reads and writes it, and Claude records ticks with `pnpm progress` (`scripts/progress.mjs`).

```json
{
  "format": 1,
  "stage": null,
  "ticks": {
    "build/Before building": {
      "aee8a1a351c7": {"text":"Final designs approved in writing, …","by":"you","at":"2026-10-31T12:00:00.000Z"}
    },
    "build/page//about": {
      "…": {"text":"…","by":"check","at":"…"}
    }
  },
  "todos": [{"id":"t-1a2b3c4d","text":"Send the client the staging link","done":false}],
  "components": ["Nav", "Footer"]
}
```

| Field | Meaning |
|---|---|
| `ticks` | By group, then by item. A group is `build/<checklist>` (from `webflow-build/checklists.md`), `launch/<checklist>` (from `webflow-launch/SKILL.md`), `build/page/<path>` or `build/component/<name>`. A checklist with sub-headings uses `<heading> · <sub-heading>`, e.g. `launch/Pre-launch QA · Content`. |
| item id | The first 12 hex characters of `sha1("<group id>\n<item text>")`, where the text is the item with Markdown emphasis and links removed and spaces collapsed. Rewording an item changes its id, so an old tick shows as "changed", not done. |
| `by` | `you` (ticked in Bench), `claude` (Claude did the work) or `check` (a `pnpm wf:*` script passed). |
| `stage` | `null` while Bench derives it: the first stage with an unticked item, in the order Before building, Foundation, Components, Pages, Build handoff, SEO plan, Pre-launch QA, Launch day, Client handoff, After launch. A stage name when someone picked it by hand. |
| `todos` | The person's own to-dos. Claude reads them; it adds one only when asked. |
| `components` | The components that get a Component done group. |

**Writing it:** one tick per line, groups and ticks sorted by key, two-space indent, as `pnpm progress` writes it. Two Macs ticking different items then change different lines, and git merges them without a conflict. Collapsed groups and other view settings stay in Bench, per Mac.

**Manual Designer steps:** ticking a row of `docs/handoff/MANUAL-TODO.md` in Bench writes `☑` into that row's Done cell, as a person would; that file stays the record for those steps.

`new-project` creates an empty file, and `update-skills` adds one to projects that don't have it.

## Releasing to Bench

After tagging a template release (the steps are at the top of `CHANGELOG.md`):

```sh
PACK_KEY="$(cat ~/secure/pack-key.pem)" pnpm pack-template --ref v0.10.0
```

Then upload the three files from `packs/` to Bench's template feed. Bench offers the new version to its users on their next check.
