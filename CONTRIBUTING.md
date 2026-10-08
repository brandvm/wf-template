# Contributing to wf-template

Anyone with a GitHub account can improve this template: the toolchain, the
loader, the agent rules, and the two skills in `.claude/skills/`
(`webflow-build`, `webflow-launch`). Repos created from the template pick
up skill changes with `pnpm update-skills`.

## What helps most

- **A lesson** (something that cost time on a Webflow build, with the fix):
  add it to the matching file in `.claude/skills/webflow-build/lessons/`, or
  open an issue with the **Lesson** template if you'd rather someone else
  write it up.
- **A fix or a new check** in `scripts/` or the skills' `scripts/`.
- **A checklist or convention** that turned out missing or wrong.
- **A bug** in the loader, the switcher or a script: open an issue with
  the **Bug** template.

## How

1. Fork the repo (or branch, with write access) and make the change.
2. Run `pnpm install`, `pnpm check` and `pnpm test`. After a `src/` change,
   run `pnpm build` and commit `dist/` with it; CI fails otherwise.
3. Bump the version in `.wf-template.json` and add a `CHANGELOG.md` entry
   (patch: fixes and wording; minor: new checks, scripts or lessons; major:
   client repos must change something by hand).
4. Open a pull request against `master` and fill in the template.

## Rules

- **Generic only.** No client names, URLs, page copy, people, Webflow site
  IDs or credentials, in files or in commit messages. Describe what
  happened in general terms ("a pinned section", "Card Body").
- **Lessons** use the `GOTCHAS.md` entry format without the Scope line, go
  in the file for their area, and say what happened, why, and a fix someone
  else can apply.
- **Scripts** keep working from `webflow-build.config.json` alone (no
  hard-coded sites) and run on Node 22 without new runtime dependencies
  where possible.
- **Checklist items** keep their [Claude] / [Claude checks] / [Person] tag.
- **CSS** follows the Designer-first policy in `AGENTS.md`: every repo CSS
  rule carries a `repo-css:` tag.
