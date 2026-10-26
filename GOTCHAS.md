# Gotchas

A running log of things that cost time on this project. Agents read it at
the start of every session and add to it when they hit something new (see
the Session protocol in `AGENTS.md`). Never delete an entry — update its
`Status` instead.

Lessons from earlier builds are in the skill, not here:
`.claude/skills/webflow-build/lessons/` (one file per area). Read the file
for the area you work in. Entries tagged `Scope: template-candidate` are
collected from client repos into those files.

## Entry format

```md
### YYYY-MM-DD · Short title
- Area: designer | css | loader | release | mcp | ci | js | perf
- Scope: project | template-candidate
- Symptom: what was observed
- Cause: why it happened
- Fix: what was done, or the workaround
- Status: open | fixed <sha> | upstreamed wf-template <sha>
- Found by: claude | codex | human
```

## This project

<!-- Add new entries here, newest first. -->

### 2026-10-26 · All client repos shared one Webflow MCP sign-in
- Area: mcp
- Scope: template-candidate
- Symptom: signing in to the Webflow MCP for one client's repo replaced
  the sign-in of another; the MCP then reached the wrong client's site.
- Cause: every repo's `.mcp.json` named the server `webflow`, and Claude
  Code keeps one OAuth sign-in per server name on the machine.
- Fix: `pnpm new-project` names it `webflow-<slug>`; AGENTS.md says to
  check the site ID before writing. Tokens stay out of the repo.
- Status: open
- Found by: human
