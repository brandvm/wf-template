// scripts/progress.mjs against a throwaway repo with this template's skills.
// Run by `pnpm test` with node --test (not Playwright).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { itemId, parseChecklists, serialize, empty, migrate } from '../scripts/progress.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function repo() {
  // Inside a workspace folder of its own, so ../prototype is this test's.
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wf-progress-')), 'repo');
  fs.cpSync(path.join(root, '.claude/skills'), path.join(dir, '.claude/skills'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs/handoff'), { recursive: true });
  // A fresh seed, not this repo's: a client repo's progress.json has its own plans.
  fs.writeFileSync(path.join(dir, 'docs/handoff/progress.json'), serialize(empty()));
  fs.writeFileSync(path.join(dir, 'webflow-build.config.json'), JSON.stringify({ pages: ['/', '/about'] }));
  return dir;
}
const run = (dir, ...args) => execFileSync('node', [path.join(root, 'scripts/progress.mjs'), ...args], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const fails = (dir, ...args) => {
  try {
    run(dir, ...args);
  } catch (err) {
    return err.stderr.toString();
  }
  assert.fail(`expected pnpm progress ${args.join(' ')} to fail`);
};
const read = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'docs/handoff/progress.json'), 'utf8'));

// Only the template ships an empty seed; a client repo's file holds its progress.
const isTemplate = !JSON.parse(fs.readFileSync(path.join(root, '.wf-template.json'), 'utf8')).created;
test('the seed file is empty and in the current format', { skip: !isTemplate && 'client repo' }, () => {
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'docs/handoff/progress.json'), 'utf8')), empty());
});

test('item ids are sha1 of group and text', () => {
  assert.equal(
    itemId('build/Before building', 'Final designs approved in writing, every page at every breakpoint (an approved localhost prototype counts).'),
    'aee8a1a351c7',
  );
});

test('the parser keeps tagged items only, with Markdown made plain', () => {
  const [g] = parseChecklists('## Checks (a hint)\n\nSome prose.\n- [Claude] Run **pnpm build**\n  and look\n- not an item\n');
  assert.equal(g.title, 'Checks');
  assert.equal(g.hint, 'a hint');
  assert.deepEqual(g.items, [{ owner: 'claude', text: 'Run pnpm build and look' }]);
});

test('tick finds the item by the start of its text and records who', () => {
  const dir = repo();
  run(dir, 'tick', 'before building', 'final designs', '--by', 'you');
  // The first build tick starts the build plan; ticks are keyed by plan and checklist.
  assert.deepEqual(read(dir).plans.map((x) => [x.id, x.kind, x.status]), [['build', 'new-build', 'active']]);
  const t = read(dir).ticks['build/build/Before building'];
  const [id] = Object.keys(t);
  assert.equal(id, 'aee8a1a351c7');
  assert.equal(t[id].by, 'you');
  run(dir, 'untick', 'before building', 'final designs');
  assert.deepEqual(read(dir).ticks, {});
});

test('per-page checklists need --page, and vague names say what they match', () => {
  const dir = repo();
  assert.match(fails(dir, 'tick', 'page done', 'x'), /--page/);
  assert.match(fails(dir, 'tick', 'pre-launch', 'x'), /matches/);
  assert.match(fails(dir, 'tick', 'nope', 'x'), /No checklist/);
  const page = parseChecklists(fs.readFileSync(path.join(root, '.claude/skills/webflow-build/checklists.md'), 'utf8')).find((g) => g.title === 'Page done');
  run(dir, 'tick', 'page done', page.items[0].text.slice(0, 30), '--page', '/about', '--by', 'check');
  assert.ok(read(dir).ticks['build/build/page//about']);
});

test('one tick per line, sorted, so two Macs merge cleanly', () => {
  const p = empty();
  p.ticks = { 'b/x': { z: { text: 'Z', by: 'you', at: 't' }, a: { text: 'A', by: 'claude', at: 't' } } };
  const lines = serialize(p).split('\n');
  const a = lines.findIndex((l) => l.includes('"a": {'));
  const z = lines.findIndex((l) => l.includes('"z": {'));
  assert.ok(a > 0 && z === a + 1, 'each tick is one line, in id order');
  assert.deepEqual(JSON.parse(serialize(p)), p);
});

test('a plan’s stage is derived until it is set, and requests are listed', () => {
  const dir = repo();
  assert.match(run(dir, 'show'), /No plan running/);
  run(dir, 'plan', 'add', 'new-build');
  assert.match(run(dir, 'show'), /build \(new-build\) · stage: Before building/);
  fs.mkdirSync(path.join(dir, '../prototype'), { recursive: true });
  fs.writeFileSync(path.join(dir, '../prototype/package.json'), '{}');
  assert.match(run(dir, 'show'), /build \(new-build\) · stage: Prototype/, 'a site with a prototype starts at the Prototype stage');
  fs.rmSync(path.join(dir, '../prototype'), { recursive: true });
  run(dir, 'stage', 'pre-launch');
  assert.equal(read(dir).plans[0].stage, 'Pre-launch QA');
  run(dir, 'stage', 'auto');
  assert.equal(read(dir).plans[0].stage, undefined);
  run(dir, 'todo', 'Send the client the staging link');
  assert.match(run(dir, 'show'), /Requests:\n {2}☐ Send the client the staging link/);
  run(dir, 'todo-done', 'send the client');
  assert.equal(read(dir).todos[0].done, true);
});

test('plans: add, list and end; a second of a kind is refused; recurring ones get a cycle', () => {
  const dir = repo();
  run(dir, 'plan', 'add', 'seo');
  assert.match(fails(dir, 'plan', 'add', 'seo'), /running already/);
  assert.match(fails(dir, 'plan', 'add', 'nope'), /Plan kinds/);
  run(dir, 'plan', 'add', 'new-build');
  const p = read(dir);
  assert.deepEqual(p.plans.map((x) => x.id), ['seo', 'build']);
  assert.ok(p.plans[0].cycle.day >= 1);
  run(dir, 'plan', 'end', 'build');
  assert.equal(read(dir).plans[1].status, 'done');
  assert.deepEqual(read(dir).history.map((h) => h.text), ['Started seo', 'Started new-build', 'Finished new-build']);
  assert.match(fails(dir, 'tick', 'before building', 'final designs'), /No checklist called "before building"/);
});

test('format 1 reads as one New build plan, ticks moved under build/, ids kept', () => {
  const p = migrate({ format: 1, stage: 'Pages', ticks: { 'build/Before building': { aee8a1a351c7: { text: 'x', by: 'you', at: 't' } } }, todos: [], components: ['Nav'] });
  assert.equal(p.format, 2);
  assert.deepEqual(p.plans.map((x) => [x.id, x.stage]), [['build', 'Pages']]);
  assert.ok(p.ticks['build/build/Before building'].aee8a1a351c7);
  assert.deepEqual(p.components, ['Nav']);
});

test('SEO, Maintenance and Optimization checklists tick into their own plan', () => {
  const dir = repo();
  run(dir, 'plan', 'add', 'optimization');
  assert.match(fails(dir, 'tick', 'baseline', 'search console has'), /No item in "Baseline"/);
  run(dir, 'plan', 'add', 'seo');
  assert.match(fails(dir, 'tick', 'baseline', 'search console has'), /matches/);
  run(dir, 'tick', 'baseline', 'search console has', '--by', 'check', '--plan', 'seo');
  const ticks = read(dir).ticks;
  const key = Object.keys(ticks).find((k) => k.startsWith('seo/'));
  assert.equal(key, 'seo/seo/Baseline');
  assert.match(run(dir, 'show'), /seo \(seo\)\n {2}☐ seo\/Baseline {2}1\/5/);
});
