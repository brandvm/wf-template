// The Bench side of the template (docs/bench.md): signed packs, the contract
// check, and the --bench record in new-project and update-skills.
// Run by `pnpm test` with node --test (not Playwright).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `wf-bench-${name}-`));
const node = (script, args, cwd, env = {}) => spawnSync('node', [script, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
const RECORD = { template: 'official', name: 'Brand Vision', version: '0.10.0', base: '0.10.0' };

// A tiny template repo with one commit, so packing never depends on this
// checkout being clean.
function templateRepo() {
  const dir = tmp('repo');
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.copyFileSync(path.join(root, 'scripts/pack.mjs'), path.join(dir, 'scripts/pack.mjs'));
  fs.writeFileSync(path.join(dir, '.wf-template.json'), JSON.stringify({ version: '1.2.3', contract: 1 }));
  fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '# Changelog\n\n## 1.2.3 — 2026-10-30\n\nNew things.\n\n## 1.2.2 — 2026-10-01\n\nOld things.\n');
  fs.writeFileSync(path.join(dir, 'build.mjs'), '// build\n');
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'template');
  return dir;
}

test('packs a version, signed, with its changelog notes', () => {
  const repo = templateRepo();
  const keys = tmp('keys');
  assert.equal(node('scripts/pack.mjs', ['--keygen', keys], repo).status, 0);
  assert.notEqual(node('scripts/pack.mjs', ['--keygen', keys], repo).status, 0, 'never replaces a key');

  const r = node('scripts/pack.mjs', ['--key', path.join(keys, 'pack-key.pem')], repo);
  assert.equal(r.status, 0, r.stderr);
  const out = path.join(repo, 'packs');
  const body = fs.readFileSync(path.join(out, 'wf-template-1.2.3.json'));
  const sig = Buffer.from(fs.readFileSync(path.join(out, 'wf-template-1.2.3.json.sig'), 'utf8').trim(), 'base64');
  const pub = crypto.createPublicKey(fs.readFileSync(path.join(keys, 'pack-key.pub.pem')));
  assert.ok(crypto.verify(null, body, pub, sig), 'the signature verifies with the public key');
  assert.ok(!crypto.verify(null, Buffer.concat([body, Buffer.from(' ')]), pub, sig), 'and fails on any change');

  const manifest = JSON.parse(body);
  assert.equal(manifest.format, 1);
  assert.equal(manifest.contract, 1);
  assert.equal(manifest.version, '1.2.3');
  assert.match(manifest.notes, /^## 1\.2\.3[\s\S]*New things\.$/);
  assert.doesNotMatch(manifest.notes, /Old things/);
  const archive = fs.readFileSync(path.join(out, manifest.archive.file));
  assert.equal(crypto.createHash('sha256').update(archive).digest('hex'), manifest.archive.sha256);
  const files = execFileSync('tar', ['-tzf', path.join(out, manifest.archive.file)]).toString();
  assert.match(files, /^wf-template\/\.wf-template\.json$/m);
  assert.doesNotMatch(files, /\.git\//);
});

test('refuses to pack without a key unless --unsigned', () => {
  const repo = templateRepo();
  const r = node('scripts/pack.mjs', [], repo, { PACK_KEY: '' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /No signing key/);
  assert.equal(node('scripts/pack.mjs', ['--unsigned'], repo, { PACK_KEY: '' }).status, 0);
  assert.ok(fs.existsSync(path.join(repo, 'packs/wf-template-1.2.3.json')));
  assert.ok(!fs.existsSync(path.join(repo, 'packs/wf-template-1.2.3.json.sig')));
});

test('this template meets the contract; an incomplete one does not', () => {
  assert.equal(node('scripts/check-template.mjs', [], root).status, 0);
  const broken = tmp('broken');
  for (const f of ['.wf-template.json', 'package.json', 'webflow-build.config.example.json', 'loader.html', 'scripts/new-project.mjs']) {
    fs.mkdirSync(path.dirname(path.join(broken, f)), { recursive: true });
    fs.copyFileSync(path.join(root, f), path.join(broken, f));
  }
  fs.writeFileSync(path.join(broken, 'scripts/update-skills.mjs'), "const from = opt('from');\n");
  const r = node(path.join(root, 'scripts/check-template.mjs'), [broken, '--json'], root);
  assert.equal(r.status, 1);
  assert.deepEqual(JSON.parse(r.stdout).problems, ["scripts/update-skills.mjs: doesn't take --dry-run, --bench"]);
});

// A project Bench made from an older version.
function benchProject() {
  const dir = tmp('project');
  for (const d of ['scripts', 'src', '.claude/skills/webflow-build']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  fs.copyFileSync(path.join(root, 'scripts/update-skills.mjs'), path.join(dir, 'scripts/update-skills.mjs'));
  fs.writeFileSync(path.join(dir, 'src/styles.css'), '/* Site. */\n');
  fs.writeFileSync(path.join(dir, '.claude/skills/webflow-build/SKILL.md'), 'old\n');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'wf-acme', scripts: {} }));
  fs.writeFileSync(path.join(dir, '.wf-template.json'), JSON.stringify({
    version: '0.9.0', template: 'example/wf-template', bench: { ...RECORD, version: '0.9.0', base: '0.9.0' },
  }));
  return dir;
}
const meta = (dir) => JSON.parse(fs.readFileSync(path.join(dir, '.wf-template.json'), 'utf8'));

test('a Bench project updates from Bench, not from GitHub', () => {
  const dir = benchProject();
  const r = node('scripts/update-skills.mjs', [], dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Bench manages this project's template \(Brand Vision 0\.9\.0\)/);
  assert.equal(meta(dir).bench.version, '0.9.0', 'nothing written');
});

test('update-skills --from --bench records the new version and keeps the repo', () => {
  const dir = benchProject();
  const r = node('scripts/update-skills.mjs', ['--from', root, '--bench', JSON.stringify(RECORD)], dir);
  assert.equal(r.status, 0, r.stderr);
  const m = meta(dir);
  assert.deepEqual(m.bench, RECORD);
  assert.equal(m.template, 'example/wf-template', 'a local copy does not replace the GitHub repo');
  const current = JSON.parse(fs.readFileSync(path.join(root, '.wf-template.json'), 'utf8')).version;
  assert.equal(m.skills.version, `local@${current}`, 'records the version it updated to');
  assert.ok(!JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts['pack-template'], 'template-only');
});

test('a malformed --bench record is refused before anything changes', () => {
  const dir = benchProject();
  const r = node('scripts/update-skills.mjs', ['--from', root, '--bench', '{"template":"someone else"}'], dir);
  assert.equal(r.status, 1);
  assert.equal(fs.readFileSync(path.join(dir, '.claude/skills/webflow-build/SKILL.md'), 'utf8'), 'old\n');
});

const skipNew = !fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8').includes('<CLIENT>') && 'project already set up';
test('new-project --bench records the template and drops template-only files', { skip: skipNew }, () => {
  const dir = tmp('new');
  const FILES = ['package.json', 'AGENTS.md', 'loader.html', 'docs/handoff/HANDOFF.md', 'docs/bench.md', 'scripts/new-project.mjs',
    'scripts/pack.mjs', 'scripts/check-template.mjs', '.wf-template.json', 'CONTRIBUTING.md', 'CHANGELOG.md', 'LICENSE', '.mcp.json'];
  for (const f of FILES) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(root, f), path.join(dir, f));
  }
  const own = { template: 'own/studio', name: 'Studio template', version: '2.0.0' };
  const r = node('scripts/new-project.mjs', ['--client', 'Acme', '--slug', 'acme', '--org', 'acme-org', '--no-workspace', '--bench', JSON.stringify(own)], dir);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(meta(dir).bench, own);
  assert.doesNotMatch(r.stdout, /Template repo unknown/, 'Bench knows where the template is');
  for (const f of ['scripts/pack.mjs', 'scripts/check-template.mjs', 'docs/bench.md']) assert.ok(!fs.existsSync(path.join(dir, f)), `${f} is template only`);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), /pack-template|harvest/);
});
