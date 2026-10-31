// scripts/update-skills.mjs against a throwaway repo that is behind the
// template: an older build, no icon font, fewer scripts. The template is
// read from this folder (--from), so nothing is downloaded.
// Run by `pnpm test` with node --test (not Playwright).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = '/* Site styles. */\n\n/* 01. TOKENS */\n:root { --gap: 1em; }\n';

function oldRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-update-'));
  for (const d of ['scripts', 'src', '.claude/skills/webflow-build']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  fs.copyFileSync(path.join(root, 'scripts/update-skills.mjs'), path.join(dir, 'scripts/update-skills.mjs'));
  fs.writeFileSync(path.join(dir, 'build.mjs'), '// an older build\n');
  fs.writeFileSync(path.join(dir, 'src/styles.css'), SHEET);
  fs.writeFileSync(path.join(dir, '.claude/skills/webflow-build/SKILL.md'), 'old\n');
  fs.writeFileSync(path.join(dir, '.wf-template.json'), JSON.stringify({ version: '0.2.0', template: 'example/wf-template' }));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'wf-acme', scripts: { build: 'node build.mjs', dev: 'my own dev' }, devDependencies: { esbuild: '^0.1.0' } }));
  return dir;
}
const run = (dir, args = []) => execFileSync('node', [path.join(dir, 'scripts/update-skills.mjs'), '--from', root, ...args],
  { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');

test('a dry run lists the changes and writes nothing', () => {
  const dir = oldRepo();
  const out = run(dir, ['--dry-run']);
  assert.match(out, /~ build\.mjs/);
  assert.match(out, /\+ scripts\/phosphor\.mjs/);
  assert.match(out, /\+ src\/phosphor\.css/);
  assert.equal(read(dir, 'build.mjs'), '// an older build\n');
  assert.equal(read(dir, 'src/styles.css'), SHEET);
  assert.ok(!fs.existsSync(path.join(dir, 'src/phosphor.css')));
});

test('brings skills, tooling, package entries and the icon font', () => {
  const dir = oldRepo();
  run(dir);
  assert.equal(read(dir, 'build.mjs'), read(root, 'build.mjs'));
  assert.equal(read(dir, '.claude/skills/webflow-build/SKILL.md'), read(root, '.claude/skills/webflow-build/SKILL.md'));
  assert.ok(fs.existsSync(path.join(dir, 'scripts/phosphor.mjs')));
  const pkg = JSON.parse(read(dir, 'package.json'));
  assert.equal(pkg.scripts.dev, 'my own dev', 'an existing script is never changed');
  assert.equal(pkg.devDependencies.esbuild, '^0.1.0', 'an existing dependency is never changed');
  assert.ok(pkg.scripts.phosphor && pkg.scripts['wf:perf'] && pkg.devDependencies['axe-core']);
  assert.ok(!pkg.scripts.harvest && !pkg.scripts['new-project'], 'template-only scripts stay out');
  const css = read(dir, 'src/styles.css');
  assert.ok(css.startsWith('/* Site styles. */'));
  assert.ok(css.indexOf('@import "./phosphor.css";') < css.indexOf(':root'), 'the import is above every rule');
  assert.ok(fs.readdirSync(path.join(dir, 'src/phosphor')).some((f) => f.endsWith('.woff2')));
  assert.equal(read(dir, 'docs/handoff/progress.json'), read(root, 'docs/handoff/progress.json'), 'task progress is seeded');
  assert.ok(fs.existsSync(path.join(dir, 'scripts/progress.mjs')) && pkg.scripts.progress);
});

test('a second run changes nothing, and a site without icons keeps it that way', () => {
  const dir = oldRepo();
  run(dir);
  fs.writeFileSync(path.join(dir, 'src/phosphor.css'), '/* none */\n');
  const before = read(dir, 'src/styles.css');
  const out = run(dir);
  assert.match(out, /already up to date/);
  assert.doesNotMatch(out, /Tooling|Seeds|Added/);
  assert.equal(read(dir, 'src/phosphor.css'), '/* none */\n');
  assert.equal(read(dir, 'src/styles.css'), before);
});

test('--skills-only leaves the build and the stylesheet alone', () => {
  const dir = oldRepo();
  run(dir, ['--skills-only']);
  assert.equal(read(dir, 'build.mjs'), '// an older build\n');
  assert.equal(read(dir, 'src/styles.css'), SHEET);
  const pkg = JSON.parse(read(dir, 'package.json'));
  assert.ok(pkg.scripts['wf:perf'] && !pkg.scripts.phosphor);
});
