// Collect new template-candidate lessons from client repos (template only).
//   pnpm harvest --org <github-org> [--since 2026-10-01] [--count]
// Reads GOTCHAS.md from every repo in the org (private repos need
// GITHUB_TOKEN, or a signed-in `gh`), keeps entries tagged
// `Scope: template-candidate` whose Status doesn't say "upstreamed" or
// "harvested" and whose title isn't in the skill's lessons yet, and writes
// them to .harvest/<date>.md, grouped by area, with the source repo.
// That draft still has client details in it: rewrite each entry generically
// into lessons/<area>.md, then mark the source entries "harvested" in their
// repos. .harvest/ is gitignored; never commit it.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
let org = opt('org');
if (!org) { try { org = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root }).toString().match(/github\.com[:/]([^/]+)\//)?.[1]; } catch {} }
if (!org) { console.error('usage: pnpm harvest --org <github-org>'); process.exit(1); }
const since = opt('since');

let token = process.env.GITHUB_TOKEN;
if (!token) { try { token = execFileSync('gh', ['auth', 'token'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {} }
const headers = { accept: 'application/vnd.github+json', ...(token && { authorization: `Bearer ${token}` }) };
async function api(p) {
  const res = await fetch(`https://api.github.com${p}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${p}: ${res.status} ${res.statusText}`);
  return res.json();
}

// Titles already in the lessons, normalised for comparison.
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const lessonsDir = path.join(root, '.claude/skills/webflow-build/lessons');
const known = new Set(fs.readdirSync(lessonsDir).flatMap((f) =>
  [...fs.readFileSync(path.join(lessonsDir, f), 'utf8').matchAll(/^### [^·\n]*· (.+)$/gm)].map((m) => norm(m[1]))));

const repos = [];
for (let pg = 1; ; pg++) {
  const batch = (await api(`/orgs/${org}/repos?per_page=100&page=${pg}&type=all`)) ?? (await api(`/users/${org}/repos?per_page=100&page=${pg}`));
  if (!batch?.length) break;
  repos.push(...batch.filter((r) => !r.archived && r.name !== 'wf-template'));
}

const found = {};
let scanned = 0;
for (const r of repos) {
  const file = await api(`/repos/${org}/${r.name}/contents/GOTCHAS.md`);
  if (!file?.content) continue;
  scanned++;
  const text = Buffer.from(file.content, 'base64').toString('utf8');
  for (const e of text.split(/^(?=### )/m).filter((e) => e.startsWith('### '))) {
    const title = e.match(/^### ([^·\n]*)· (.+)$/m);
    if (!title || !/^- Scope: template-candidate/m.test(e)) continue;
    if (/^- Status: .*(upstreamed|harvested)/im.test(e)) continue;
    if (since && title[1].trim() < since) continue;
    if (known.has(norm(title[2]))) continue;
    const area = e.match(/^- Area: (\w+)/m)?.[1] ?? 'other';
    (found[area] ??= []).push(`<!-- ${r.full_name} -->\n${e.trim()}\n`);
  }
}

const total = Object.values(found).flat().length;
console.log(`${scanned} repos with GOTCHAS.md (of ${repos.length}${token ? '' : ', public only: set GITHUB_TOKEN for private repos'}); ${total} new lessons`);
if (argv.includes('--count') || !total) process.exit(0);
const out = path.join(root, '.harvest', `${new Date().toISOString().slice(0, 10)}.md`);
fs.mkdirSync(path.dirname(out), { recursive: true });
const body = ['# Harvest draft — contains client details, never commit', '',
  'Rewrite each entry generically into the lessons file for its area', '(CONTRIBUTING.md › Rules), then mark it "harvested" in its repo.', ''];
for (const [area, es] of Object.entries(found).sort()) body.push(`## ${area}`, '', ...es);
fs.writeFileSync(out, body.join('\n'));
console.log(`Draft: ${path.relative(root, out)}`);
