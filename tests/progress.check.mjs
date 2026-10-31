// scripts/progress.mjs against a throwaway repo with this template's skills.
// Run by `pnpm test` with node --test (not Playwright).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { itemId, parseChecklists, serialize, empty } from '../scripts/progress.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-progress-'));
  fs.cpSync(path.join(root, '.claude/skills'), path.join(dir, '.claude/skills'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs/handoff'), { recursive: true });
  fs.copyFileSync(path.join(root, 'docs/handoff/progress.json'), path.join(dir, 'docs/handoff/progress.json'));
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

test('the seed file is empty and in the current format', () => {
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'docs/handoff/progress.json'), 'utf8')), empty());
});

test('item ids are sha1 of group and text (Bench uses the same)', () => {
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
  const t = read(dir).ticks['build/Before building'];
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
  assert.ok(read(dir).ticks['build/page//about']);
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

test('the stage is derived until it is set, and to-dos are listed', () => {
  const dir = repo();
  assert.match(run(dir, 'show'), /Stage: Before building/);
  run(dir, 'stage', 'pre-launch');
  assert.equal(read(dir).stage, 'Pre-launch QA');
  run(dir, 'stage', 'auto');
  assert.equal(read(dir).stage, null);
  run(dir, 'todo', 'Send the client the staging link');
  assert.match(run(dir, 'show'), /to-dos:\n {2}☐ Send the client the staging link/);
  run(dir, 'todo-done', 'send the client');
  assert.equal(read(dir).todos[0].done, true);
});
