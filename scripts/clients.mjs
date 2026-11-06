// Which client repos are behind the template, and what they have to give
// back (template only).
//   pnpm clients [--org <github-org>] [--json]
// Reads .wf-template.json from every repo in the org that has one (private
// repos need GITHUB_TOKEN, or a signed-in `gh`), and lists for each: the
// template version it was created from, the version its skills are on, an
// open "Template update" pull request (the template-update workflow), and
// its template-candidate lessons not harvested yet (`pnpm harvest` collects
// them). Read only: it changes nothing in any repo.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
let org = opt('org');
if (!org) { try { org = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root }).toString().match(/github\.com[:/]([^/]+)\//)?.[1]; } catch {} }
if (!org) { console.error('usage: pnpm clients --org <github-org>'); process.exit(1); }

let token = process.env.GITHUB_TOKEN;
if (!token) { try { token = execFileSync('gh', ['auth', 'token'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {} }
const headers = { accept: 'application/vnd.github+json', ...(token && { authorization: `Bearer ${token}` }) };
async function api(p) {
  const res = await fetch(`https://api.github.com${p}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${p}: ${res.status} ${res.statusText}`);
  return res.json();
}
const file = async (repo, f) => {
  const r = await api(`/repos/${org}/${repo}/contents/${f}`);
  return r?.content ? Buffer.from(r.content, 'base64').toString('utf8') : null;
};

// Lessons already in the skill (by title) count as given back, as in harvest.
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const lessonsDir = path.join(root, '.claude/skills/webflow-build/lessons');
const known = new Set(fs.readdirSync(lessonsDir).flatMap((f) =>
  [...fs.readFileSync(path.join(lessonsDir, f), 'utf8').matchAll(/^### [^·\n]*· (.+)$/gm)].map((m) => norm(m[1]))));

const latest = JSON.parse(fs.readFileSync(path.join(root, '.wf-template.json'), 'utf8')).version;
const num = (v) => String(v ?? '').match(/\d+\.\d+\.\d+/)?.[0] ?? null;
const behind = (v) => { const [a, b] = [v, latest].map((x) => x.split('.').map(Number)); return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]; };

const repos = [];
for (let pg = 1; ; pg++) {
  const batch = (await api(`/orgs/${org}/repos?per_page=100&page=${pg}&type=all`)) ?? (await api(`/users/${org}/repos?per_page=100&page=${pg}`));
  if (!batch?.length) break;
  repos.push(...batch.filter((r) => !r.archived && r.name !== 'wf-template'));
}

const rows = [];
for (const r of repos) {
  const metaText = await file(r.name, '.wf-template.json');
  if (!metaText) continue;
  let meta;
  try { meta = JSON.parse(metaText); } catch { meta = {}; }
  const skills = num(meta.skills?.version) ?? num(meta.version);
  const pr = (await api(`/repos/${org}/${r.name}/pulls?state=open&head=${org}:template-update`))?.[0];
  const gotchas = (await file(r.name, 'GOTCHAS.md')) ?? '';
  const lessons = gotchas.split(/^(?=### )/m).filter((e) => /^- Scope: template-candidate/m.test(e) && !/^- Status: .*(upstreamed|harvested)/im.test(e)
    && !known.has(norm(e.match(/^### [^·\n]*· (.+)$/m)?.[1] ?? ''))).length;
  rows.push({ repo: r.name, created: num(meta.version), skills, behind: skills ? behind(skills) < 0 : true, pr: pr?.html_url ?? null, lessons });
}

if (argv.includes('--json')) { console.log(JSON.stringify({ latest, rows }, null, 2)); process.exit(0); }
const pad = (s, n) => String(s ?? '—').padEnd(n);
console.log(`Template ${latest} · ${rows.length} client repos in ${org}${token ? '' : ' (public only: set GITHUB_TOKEN for private repos)'}\n`);
console.log(`${pad('repo', 32)}${pad('created', 10)}${pad('skills', 10)}${pad('update', 22)}lessons`);
for (const r of rows.sort((a, b) => b.behind - a.behind || a.repo.localeCompare(b.repo))) {
  const update = r.pr ? 'pull request open' : r.behind ? 'behind' : 'up to date';
  console.log(`${pad(r.repo, 32)}${pad(r.created, 10)}${pad(r.skills, 10)}${pad(update, 22)}${r.lessons || ''}`);
}
const late = rows.filter((r) => r.behind && !r.pr);
if (late.length) console.log(`\n${late.length} behind with no update pull request: run the template-update workflow there (Actions › template-update › Run workflow), or pnpm update-skills in the repo.`);
const give = rows.reduce((n, r) => n + r.lessons, 0);
if (give) console.log(`${give} lessons not harvested yet: pnpm harvest --org ${org}`);
