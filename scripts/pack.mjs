// Turn a version of this template into a signed pack for Bench (docs/bench.md).
//   pnpm pack-template [--ref <tag|commit>] [--out packs] [--key <pem file>]
//                      [--id official] [--name "Brand Vision"] [--unsigned]
//   pnpm pack-template --keygen <dir>   (once: the signing key pair)
// The key is --key, or PACK_KEY holding the PEM text. Without either the
// pack is refused unless --unsigned. Template only: not in client repos.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 1 << 30 });
const FORMAT = 1;

if (opt('keygen')) {
  const dir = path.resolve(opt('keygen'));
  const priv = path.join(dir, 'pack-key.pem');
  if (fs.existsSync(priv)) { console.error(`${priv} exists: refusing to replace a signing key.`); process.exit(1); }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(priv, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  const pub = publicKey.export({ type: 'spki', format: 'pem' });
  fs.writeFileSync(path.join(dir, 'pack-key.pub.pem'), pub);
  console.log(`Wrote ${priv} (secret: password manager or CI secret, never a repo)`);
  console.log(`and ${path.join(dir, 'pack-key.pub.pem')}. Public key for Bench:\n${pub}`);
  process.exit(0);
}

const ref = opt('ref') ?? 'HEAD';
const commit = git('rev-parse', '--verify', `${ref}^{commit}`).toString().trim();
if (ref === 'HEAD' && git('status', '--porcelain', '--untracked-files=no').toString().trim()) {
  console.error('Uncommitted changes: a pack holds committed files only. Commit first, or pass --ref.');
  process.exit(1);
}
const meta = JSON.parse(git('show', `${commit}:.wf-template.json`).toString());
if (!/^\d+\.\d+\.\d+$/.test(meta.version ?? '')) { console.error(`.wf-template.json at ${ref} has no x.y.z version.`); process.exit(1); }

let key = process.env.PACK_KEY || (opt('key') && fs.readFileSync(opt('key'), 'utf8'));
if (!key && !flag('unsigned')) {
  console.error('No signing key: pass --key <pem file> or set PACK_KEY (or --unsigned for a local-only pack).');
  process.exit(1);
}

const out = path.resolve(root, opt('out') ?? 'packs');
fs.mkdirSync(out, { recursive: true });
const base = `wf-template-${meta.version}`;
const archive = git('archive', '--format=tar.gz', '--prefix=wf-template/', commit);
fs.writeFileSync(path.join(out, `${base}.tar.gz`), archive);

const manifest = {
  format: FORMAT,
  contract: meta.contract ?? 1,
  id: opt('id') ?? 'official',
  name: opt('name') ?? 'Brand Vision',
  source: 'brandvm/wf-template',
  version: meta.version,
  commit,
  created: new Date().toISOString(),
  archive: { file: `${base}.tar.gz`, root: 'wf-template', size: archive.length, sha256: crypto.createHash('sha256').update(archive).digest('hex') },
  notes: changelogSection(meta.version),
};
const body = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(out, `${base}.json`), body);
const sigFile = path.join(out, `${base}.json.sig`);
fs.rmSync(sigFile, { force: true });
if (key) fs.writeFileSync(sigFile, crypto.sign(null, body, crypto.createPrivateKey(key)).toString('base64') + '\n');

console.log(`Packed template ${meta.version} (${commit.slice(0, 7)}) into ${path.relative(process.cwd(), out) || '.'}/:`);
console.log(`  ${base}.tar.gz  ${(archive.length / 1024).toFixed(0)} KB\n  ${base}.json${key ? `\n  ${base}.json.sig` : '\n  (unsigned)'}`);

// The CHANGELOG.md section for version, from the packed commit.
function changelogSection(version) {
  let text = '';
  try { text = git('show', `${commit}:CHANGELOG.md`).toString(); } catch { return ''; }
  const start = text.search(new RegExp(`^## ${version.replace(/\./g, '\\.')}\\b.*$`, 'm'));
  if (start < 0) return '';
  const rest = text.slice(start);
  const next = rest.slice(1).search(/^## /m);
  return (next < 0 ? rest : rest.slice(0, next + 1)).trim();
}
