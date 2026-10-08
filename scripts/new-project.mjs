// Fill in a repo created from this template, once.
//   pnpm new-project --client "Client Name" --slug client-site [--repo wf-client]
//                    [--org <github-org>] [--site-id <24-hex>] [--prototype-url URL]
// Missing values are asked for when run in a terminal. Writes:
//   package.json name · AGENTS.md project facts · loader.html REPO ·
//   docs/handoff/HANDOFF.md title · webflow-build.config.json · .wf-template.json
// and removes the files that only belong in the template (CONTRIBUTING…).
// Then sets up the workspace around the repo (the folder that holds it):
//   CLAUDE.md · .mcp.json · .claude/skills links · prototype/ · Assets/
// Only when that folder holds nothing but the repo (or a workspace already
// set up); existing files are never overwritten. --no-workspace skips it.
// Refuses to run twice (AGENTS.md no longer has the <CLIENT> placeholder)
// unless --force. --dry-run prints what would change.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const agents = read('AGENTS.md');
if (!agents.includes('<CLIENT>') && !flag('force')) {
  console.error('AGENTS.md is already filled in. Run with --force to fill it in again.');
  process.exit(1);
}

// Defaults from the git remote (github.com/<org>/<repo>) or the folder name.
let remote = '';
try { remote = execSync('git remote get-url origin', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch {}
const [, remoteOrg, remoteRepo] = remote.match(/github\.com[:/]([^/]+)\/([^/.\s]+)/) ?? [];

const values = {
  client: opt('client'),
  repo: opt('repo') ?? (remoteRepo !== 'wf-template' ? remoteRepo : undefined) ?? path.basename(root),
  slug: opt('slug'),
  siteId: opt('site-id'),
  org: opt('org') ?? remoteOrg,
  prototypeUrl: opt('prototype-url') ?? 'http://127.0.0.1:5173',
};
const questions = { client: 'Client / site name', org: 'GitHub org or user that owns this repo', slug: 'Webflow staging subdomain (<slug>.webflow.io)', siteId: 'Webflow site ID (Enter to fill in later)' };
if (process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  for (const [key, q] of Object.entries(questions)) {
    if (values[key] === undefined) values[key] = (await rl.question(`${q}: `)).trim() || undefined;
  }
  rl.close();
}
const missing = ['client', 'slug', 'org'].filter((k) => !values[k]);
if (missing.length) {
  console.error(`Missing: ${missing.map((k) => '--' + k).join(', ')}`);
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(values.slug)) {
  console.error('--slug is the subdomain only, e.g. client-site for client-site.webflow.io');
  process.exit(1);
}
if (values.siteId && !/^[0-9a-f]{24}$/.test(values.siteId)) {
  console.error('--site-id is the 24-character hex id from Site settings or the MCP');
  process.exit(1);
}
const { client, repo, slug, siteId, org, prototypeUrl } = values;
const today = new Date().toISOString().slice(0, 10);

const edits = {
  'package.json': (s) => s.replace(/"name": "[^"]*"/, `"name": "${repo}"`).replace(/\n    "harvest": "[^"]*",/, ''),
  'AGENTS.md': (s) => s
    .replace('Fill these in when the repo is created from the template (`pnpm new-project`).', `Filled in by \`pnpm new-project\` on ${today}.`)
    .replaceAll('<CLIENT>', client)
    .replaceAll('<ORG>/<REPO>', `${org}/${repo}`)
    .replaceAll('<ORG>.github.io/<REPO>', `${org}.github.io/${repo}`)
    .replace('<SITE_ID>', siteId ?? '<SITE_ID>')
    .replace('<SLUG>', slug)
    .replace('<DOMAIN or "not attached yet">', 'not attached yet')
    .replace('<RELEASE in the head snippet, or "none yet">', 'none yet'),
  'loader.html': (s) => s
    .replace('Replace ORG and REPO (all occurrences, pieces 1 and 2).', `ORG and REPO are filled in (${org}/${repo}).`)
    .replace('var OWNER = "ORG";', `var OWNER = "${org}";`)
    .replace('var SITE = "REPO";', `var SITE = "${repo}";`)
    .replaceAll('https://ORG.github.io/REPO/', `https://${org}.github.io/${repo}/`),
  'docs/handoff/HANDOFF.md': (s) => s.replace('<CLIENT>', client),
};
const config = {
  prototypeUrl,
  stagingUrl: `https://${slug}.webflow.io`,
  repoDir: '.',
  bundlePattern: `${org.replace(/\./g, '\\.')}\\.github\\.io/${repo}/(index\\.js|styles\\.css)`,
  widths: [[1440, 900], [820, 1180], [390, 844]],
  pages: ['/'],
};

for (const [file, edit] of Object.entries(edits)) {
  const before = read(file);
  const after = edit(before);
  if (after === before) continue;
  console.log(`${flag('dry-run') ? 'would update' : 'updated'} ${file}`);
  if (!flag('dry-run')) fs.writeFileSync(path.join(root, file), after);
}
// Files that only make sense in the template itself.
const TEMPLATE_ONLY = ['CONTRIBUTING.md', 'CHANGELOG.md', '.github/ISSUE_TEMPLATE', 'scripts/harvest.mjs'];
for (const f of TEMPLATE_ONLY) {
  if (!fs.existsSync(path.join(root, f))) continue;
  console.log(`${flag('dry-run') ? 'would remove' : 'removed'} ${f} (template only)`);
  if (!flag('dry-run')) fs.rmSync(path.join(root, f), { recursive: true });
}
// Record which template version this repo was created from.
const metaFile = path.join(root, '.wf-template.json');
const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
meta.created = today;
// Where the template lives, for `pnpm update-skills`: GitHub records it on
// repos created with "Use this template". --template overrides.
meta.template = opt('template') ?? meta.template;
if (!meta.template && remoteOrg && remoteRepo) {
  try {
    const res = await fetch(`https://api.github.com/repos/${remoteOrg}/${remoteRepo}`, { headers: process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {} });
    if (res.ok) meta.template = (await res.json()).template_repository?.full_name;
  } catch {}
}
if (!meta.template) console.log('Template repo unknown: pass --template <owner/repo> (used by pnpm update-skills).');
if (!flag('dry-run')) fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');

const configFile = path.join(root, 'webflow-build.config.json');
console.log(`${flag('dry-run') ? 'would write' : 'wrote'} webflow-build.config.json`);
// One line per width, like the example file.
if (!flag('dry-run')) fs.writeFileSync(configFile, JSON.stringify(config, null, 2).replace(/\[\s+(\d+),\s+(\d+)\s+\]/g, '[$1, $2]').replace(/\[\s+("[^\]]*")\s+\]/g, '[$1]') + '\n');

// The workspace: the folder around the repo, where Claude is opened. It
// imports the repo's agent rules and handoff, and links the repo's skills
// and MCP server, which Claude Code only reads from the folder it starts in.
const workspace = path.dirname(root);
const repoDir = path.basename(root);
let workspaceReady = false;
if (!flag('no-workspace')) {
  const ignore = new Set([repoDir, '.DS_Store', 'CLAUDE.md', '.mcp.json', '.claude', 'prototype', 'Assets']);
  const others = fs.readdirSync(workspace).filter((f) => !ignore.has(f));
  const claudeMd = path.join(workspace, 'CLAUDE.md');
  const ours = !fs.existsSync(claudeMd) || fs.readFileSync(claudeMd, 'utf8').includes(`@${repoDir}/AGENTS.md`);
  if (others.length || !ours) {
    console.log(`\nWorkspace skipped: ${workspace} holds more than this repo. Move the repo into its own folder (<Client>/${repoDir}) and run again with --force, or pass --no-workspace.`);
  } else {
    workspaceReady = true;
    const verb = flag('dry-run') ? 'would create' : 'created';
    const make = (rel, write) => {
      const p = path.join(workspace, rel);
      if (fs.existsSync(p) || isLink(p)) return console.log(`kept ../${rel} (exists)`);
      console.log(`${verb} ../${rel}`);
      if (!flag('dry-run')) { fs.mkdirSync(path.dirname(p), { recursive: true }); write(p); }
    };
    make('CLAUDE.md', (p) => fs.writeFileSync(p, workspaceClaudeMd()));
    make('.mcp.json', (p) => fs.copyFileSync(path.join(root, '.mcp.json'), p));
    for (const skill of fs.readdirSync(path.join(root, '.claude/skills'))) {
      make(`.claude/skills/${skill}`, (p) => {
        try { fs.symlinkSync(path.join('..', '..', repoDir, '.claude/skills', skill), p, 'dir'); }
        catch { fs.cpSync(path.join(root, '.claude/skills', skill), p, { recursive: true }); console.log(`  (copied: no symlink permission; re-copy after pnpm update-skills)`); }
      });
    }
    make('prototype', (p) => fs.cpSync(path.join(root, '.claude/skills/webflow-build/prototype-starter'), p, { recursive: true }));
    make('Assets/figma', (p) => fs.mkdirSync(p, { recursive: true }));
  }
}
function isLink(p) { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } }
function workspaceClaudeMd() {
  return `# ${client} — workspace

Claude is opened in this folder, one level above the repo. Written by
\`pnpm new-project\` on ${today}; edit it freely.

- \`${repoDir}/\` — the GitHub repo: custom code, the skills, the handoff
  docs. Paths in its \`AGENTS.md\` are relative to it; run \`pnpm\` and
  \`git\` there.
- \`prototype/\` — the localhost prototype (webflow-build ›
  prototype-starter). Not in git.
- \`Assets/\` — design exports, brand files and fonts; Figma frame
  screenshots in \`Assets/figma/\`. Not in git.
- \`.claude/skills/\` links to the repo's skills (\`pnpm update-skills\` in
  the repo updates them); \`.mcp.json\` is a copy of the repo's.

Design: <Figma link, or "prototype/">

@${repoDir}/AGENTS.md
@${repoDir}/GOTCHAS.md
@${repoDir}/docs/handoff/HANDOFF.md
@${repoDir}/docs/handoff/MANUAL-TODO.md
@${repoDir}/docs/handoff/BUILD-NOTES.md
`;
}

const ws = workspaceReady ? workspace : 'the folder that holds the repo';
console.log(`
Next, in this order (README › New project checklist):
  1. Repo Settings → Pages → Source: GitHub Actions; Collaborators and
     teams → add the developers team (Write).
  2. pnpm build && pnpm test, commit and push. Wait for the staging
     workflow to pass: https://${org}.github.io/${repo}/styles.css loads.
  3. Paste the loader from loader.html (ORG and REPO are filled in): head
     code, Embeds 2a and 2b in G | Components (a site duplicated from
     the starter has them with ORG/REPO placeholders: replace those), and
     footer code. Publish to staging; the canvas picks up styles.css.
  4. Staging: password and noindex until launch.${siteId ? '' : '\n  - Add the Webflow site ID to AGENTS.md › Project facts.'}
  Then open Claude in ${ws} (approve the Webflow MCP server, /mcp to sign in)${workspaceReady ? ', and run pnpm install in ../prototype' : ''}.`);
