// Bring this repo's agent skills up to date with the template.
//   pnpm update-skills [--ref <tag|branch>] [--repo <owner/repo>] [--dry-run]
// Downloads .claude/skills from the template on GitHub (default: the
// latest release tag, else master), replaces the local copy, and records
// the version in .wf-template.json. Everything else in the repo is left
// alone. Local edits to a skill are overwritten, so the script lists what
// changes first; contribute local improvements to the template instead
// (webflow-build › Contributing).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const dry = argv.includes('--dry-run');
const metaFile = path.join(root, '.wf-template.json');
const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
const repo = opt('repo') ?? meta.template;
if (!repo) {
  console.error('Which template? Pass --repo <owner/repo>, or set "template" in .wf-template.json.');
  process.exit(1);
}

async function gh(p) {
  const res = await fetch(`https://api.github.com/repos/${repo}${p}`, {
    headers: { accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN && { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) },
  });
  if (!res.ok) throw new Error(`GitHub ${p}: ${res.status} ${res.statusText}`);
  return res;
}

let ref = opt('ref');
if (!ref) {
  const tags = await (await gh('/tags?per_page=100')).json();
  const parse = (n) => n.slice(1).split('.').map(Number);
  const newer = (a, b) => { const [x, y] = [parse(a), parse(b)]; return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; };
  const versions = tags.map((t) => t.name).filter((n) => /^v\d+\.\d+\.\d+$/.test(n)).sort(newer);
  ref = versions[0] ?? 'master';
}
const commit = (await (await gh(`/commits/${encodeURIComponent(ref)}`)).json()).sha;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-skills-'));
const tarball = path.join(tmp, 'src.tgz');
fs.writeFileSync(tarball, Buffer.from(await (await gh(`/tarball/${commit}`)).arrayBuffer()));
execFileSync('tar', ['-xzf', tarball, '-C', tmp]);
const top = fs.readdirSync(tmp).find((d) => fs.statSync(path.join(tmp, d)).isDirectory());
const incoming = path.join(tmp, top, '.claude/skills');
const local = path.join(root, '.claude/skills');

const list = (dir) => {
  const out = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      e.isDirectory() ? walk(p) : out.push(path.relative(dir, p));
    }
  })(dir);
  return out;
};
const before = new Set(list(local));
const after = new Set(list(incoming));
const changes = [];
for (const f of after) {
  if (!before.has(f)) changes.push(`+ ${f}`);
  else if (!fs.readFileSync(path.join(local, f)).equals(fs.readFileSync(path.join(incoming, f)))) changes.push(`~ ${f}`);
}
for (const f of before) if (!after.has(f)) changes.push(`- ${f}`);

const version = /^v\d/.test(ref) ? ref : `${ref}@${commit.slice(0, 7)}`;
console.log(`Template skills ${version} (${repo})`);
console.log(changes.length ? changes.sort().map((c) => '  ' + c).join('\n') : '  already up to date');
if (!dry && changes.length) {
  fs.rmSync(local, { recursive: true, force: true });
  fs.cpSync(incoming, local, { recursive: true });
}
if (!dry) {
  meta.template = repo;
  meta.skills = { version, commit, updated: new Date().toISOString().slice(0, 10) };
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
  if (changes.length) console.log('Review the diff, then commit .claude/skills and .wf-template.json.');
}
fs.rmSync(tmp, { recursive: true, force: true });
