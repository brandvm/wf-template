// scripts/new-project.mjs on a throwaway copy of the files it edits.
// Run by `pnpm test` with node --test (not Playwright).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['package.json', 'AGENTS.md', 'loader.html', 'docs/handoff/HANDOFF.md', 'scripts/new-project.mjs', '.wf-template.json', 'CONTRIBUTING.md', 'CHANGELOG.md'];

function copy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-new-project-'));
  for (const f of FILES) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(root, f), path.join(dir, f));
  }
  return dir;
}
// A repo that has been set up has no placeholders left to fill in.
const skip = !fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8').includes('<CLIENT>') && 'project already set up';

const run = (dir, args) => execFileSync('node', [path.join(dir, 'scripts/new-project.mjs'), ...args],
  { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString();

test('fills in every placeholder and writes the config', { skip }, () => {
  const dir = copy();
  run(dir, ['--client', 'Acme Homes', '--slug', 'acme-homes', '--repo', 'wf-acme', '--org', 'acme-org', '--site-id', 'a'.repeat(24), '--template', 'example/wf-template']);
  const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
  assert.match(read('package.json'), /"name": "wf-acme"/);
  assert.doesNotMatch(read('package.json'), /"harvest"/);
  const agents = read('AGENTS.md');
  assert.doesNotMatch(agents, /<CLIENT>|<REPO>|<SITE_ID>|<SLUG>|<DOMAIN|<RELEASE/);
  assert.match(agents, /# Acme Homes — Webflow custom code/);
  assert.match(agents, /https:\/\/acme-homes\.webflow\.io/);
  const loader = read('loader.html');
  assert.match(loader, /var SITE = "wf-acme";/);
  assert.match(loader, /acme-org\.github\.io\/wf-acme\/styles\.css/);
  assert.match(loader, /var OWNER = "acme-org";/);
  assert.doesNotMatch(loader.replace(/<!--[\s\S]*?-->/g, ''), /REPO/);
  assert.doesNotMatch(read('docs/handoff/HANDOFF.md'), /<CLIENT>/);
  const cfg = JSON.parse(read('webflow-build.config.json'));
  assert.equal(cfg.stagingUrl, 'https://acme-homes.webflow.io');
  assert.ok(new RegExp(cfg.bundlePattern).test('https://acme-org.github.io/wf-acme/index.js'));
  assert.ok(!fs.existsSync(path.join(dir, 'CONTRIBUTING.md')) && !fs.existsSync(path.join(dir, 'CHANGELOG.md')), 'template-only files removed');
  const meta = JSON.parse(read('.wf-template.json'));
  assert.match(meta.version, /^\d+\.\d+\.\d+$/);
  assert.match(meta.created, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(meta.template, 'example/wf-template');
});

test('refuses to run twice', { skip }, () => {
  const dir = copy();
  run(dir, ['--client', 'Acme', '--slug', 'acme', '--org', 'acme-org', '--template', 'example/wf-template']);
  assert.throws(() => run(dir, ['--client', 'Acme', '--slug', 'acme', '--org', 'acme-org']), /already filled in/);
});

test('rejects a full URL as the slug', { skip }, () => {
  const dir = copy();
  assert.throws(() => run(dir, ['--client', 'Acme', '--slug', 'https://acme.webflow.io', '--org', 'acme-org']), /subdomain only/);
});

// A repo cloned into its own client folder gets the workspace around it.
function copyIntoWorkspace() {
  const ws = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wf-workspace-')), 'Acme');
  const dir = path.join(ws, 'wf-acme');
  for (const f of [...FILES, '.mcp.json']) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(root, f), path.join(dir, f));
  }
  fs.cpSync(path.join(root, '.claude/skills'), path.join(dir, '.claude/skills'), { recursive: true });
  for (const f of ['GOTCHAS.md', 'docs/handoff/MANUAL-TODO.md', 'docs/handoff/BUILD-NOTES.md']) fs.copyFileSync(path.join(root, f), path.join(dir, f));
  return { ws, dir };
}

test('sets up the workspace around the repo', { skip }, () => {
  const { ws, dir } = copyIntoWorkspace();
  fs.writeFileSync(path.join(ws, 'Assets-note.txt'), '');
  assert.match(run(dir, ['--client', 'Acme', '--slug', 'acme', '--org', 'acme-org', '--template', 'example/wf-template']), /Workspace skipped/, 'a folder holding other files is left alone');
  assert.ok(!fs.existsSync(path.join(ws, 'CLAUDE.md')));
  fs.rmSync(path.join(ws, 'Assets-note.txt'));
  fs.writeFileSync(path.join(ws, '.mcp.json'), '{"keep":true}');
  run(dir, ['--client', 'Acme', '--slug', 'acme', '--org', 'acme-org', '--force']);
  const claude = fs.readFileSync(path.join(ws, 'CLAUDE.md'), 'utf8');
  for (const f of ['AGENTS.md', 'GOTCHAS.md', 'docs/handoff/HANDOFF.md', 'docs/handoff/MANUAL-TODO.md']) {
    assert.match(claude, new RegExp(`^@wf-acme/${f}$`, 'm'));
    assert.ok(fs.existsSync(path.join(dir, f)), `${f} exists in the repo`);
  }
  assert.equal(fs.readFileSync(path.join(ws, '.mcp.json'), 'utf8'), '{"keep":true}', 'existing files are kept');
  assert.ok(fs.existsSync(path.join(ws, '.claude/skills/webflow-build/SKILL.md')), 'skills reachable from the workspace');
  assert.ok(fs.existsSync(path.join(ws, 'prototype/package.json')), 'prototype copied');
  assert.ok(fs.statSync(path.join(ws, 'Assets/figma')).isDirectory());
});

test('--no-workspace leaves the folder alone', { skip }, () => {
  const { ws, dir } = copyIntoWorkspace();
  run(dir, ['--client', 'Acme', '--slug', 'acme', '--org', 'acme-org', '--template', 'example/wf-template', '--no-workspace']);
  assert.deepEqual(fs.readdirSync(ws), ['wf-acme']);
});
