// Check that a folder meets the template contract Bench relies on
// (docs/bench.md › Template contract). Bench runs it on templates users
// bring; run it here before releasing a change to new-project or update-skills.
//   node scripts/check-template.mjs [<folder>] [--json]
// Exits 1 and lists what is missing when the folder falls short.
// Template only: not in client repos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The newest contract this checker knows. A template declaring a newer one
// needs a newer Bench.
const CONTRACT = 1;

const argv = process.argv.slice(2);
const dir = path.resolve(argv.find((a) => !a.startsWith('--')) ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const problems = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); return ok; };
const file = (f) => path.join(dir, f);
const json = (f) => { try { return JSON.parse(fs.readFileSync(file(f), 'utf8')); } catch { return undefined; } };
const text = (f) => (fs.existsSync(file(f)) ? fs.readFileSync(file(f), 'utf8') : undefined);
// A script supports a flag when it reads it by name: opt('slug'), flag('dry-run'), '--no-workspace'.
const takes = (src, name) => new RegExp(`['"\`](--)?${name.replace(/-/g, '\\-')}['"\`]`).test(src);

const meta = json('.wf-template.json');
if (need(meta, '.wf-template.json is missing or not JSON')) {
  need(/^\d+\.\d+\.\d+$/.test(meta.version ?? ''), '.wf-template.json: "version" must be x.y.z');
  need(Number.isInteger(meta.contract), '.wf-template.json: "contract" must say which contract it meets (1)');
  need(!(meta.contract > CONTRACT), `.wf-template.json: contract ${meta.contract} is newer than this checker (${CONTRACT}); update Bench`);
}

const pkg = json('package.json');
if (need(pkg, 'package.json is missing or not JSON')) {
  for (const s of ['dev', 'build']) need(pkg.scripts?.[s], `package.json: no "${s}" script`);
}

const scripts = {
  'scripts/new-project.mjs': ['client', 'slug', 'org', 'repo', 'site-id', 'template', 'bench', 'no-workspace', 'dry-run', 'force'],
  'scripts/update-skills.mjs': ['from', 'dry-run', 'bench'],
};
for (const [f, flags] of Object.entries(scripts)) {
  const src = text(f);
  if (!need(src, `${f} is missing`)) continue;
  const missing = flags.filter((n) => !takes(src, n));
  need(!missing.length, `${f}: doesn't take ${missing.map((n) => '--' + n).join(', ')}`);
}
const np = text('scripts/new-project.mjs');
if (np) need(/isTTY/.test(np), 'scripts/new-project.mjs: must only ask questions when stdin is a terminal (check process.stdin.isTTY)');

const config = json('webflow-build.config.example.json');
if (need(config, 'webflow-build.config.example.json is missing or not JSON')) {
  for (const k of ['stagingUrl', 'bundlePattern', 'widths', 'pages']) need(config[k] !== undefined, `webflow-build.config.example.json: no "${k}"`);
}
const loader = text('loader.html');
if (need(loader, 'loader.html is missing')) {
  need(/var OWNER = "/.test(loader) && /var SITE = "/.test(loader), 'loader.html: needs var OWNER = "…" and var SITE = "…" (Bench reads them to find the bundles)');
}

const result = { ok: problems.length === 0, contract: meta?.contract, version: meta?.version, skills: fs.existsSync(file('.claude/skills')), problems };
if (argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`✓ ${path.basename(dir)} ${meta.version} meets template contract ${meta.contract}${result.skills ? '' : ' (no .claude/skills)'}`);
} else {
  console.log(`✗ ${path.basename(dir)} doesn't meet the template contract:\n${problems.map((p) => '  - ' + p).join('\n')}`);
}
process.exit(result.ok ? 0 : 1);
