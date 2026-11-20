import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';

// `pnpm dev` and dev mode were removed in 1.0.0: nothing loads a local
// bundle any more. Client repos keep the old script until it's deleted.
if (process.argv.includes('--dev')) {
  console.error('pnpm dev was removed in wf-template 1.0.0 (no dev mode). Delete the "dev" script from package.json; push to see a change on staging.');
  process.exit(1);
}
// --stamp adds the commit and build time to dist/version.json. Only for a
// build that is deployed and never committed (e.g. after CI's dist check):
// a committed dist/ can't contain its own commit, and a time in it would
// fail the check on every build.
const stamp = process.argv.includes('--stamp');
// package.json's version, or 0.0.0 while it has none. Bundled code reads
// it as __WFC_VERSION__.
const version = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8')).version ?? '0.0.0';

const config = {
  entryPoints: ['src/index.ts', 'src/styles.css'],
  bundle: true,
  outdir: 'dist',
  // Icon fonts (src/phosphor/) are copied next to the stylesheet, with a
  // content hash in the name so a new version is never served from cache.
  loader: { '.woff2': 'file' },
  assetNames: 'fonts/[name]-[hash]',
  minify: true,
  target: 'es2019',
  logLevel: 'info',
  define: { __WFC_VERSION__: JSON.stringify(version) },
};

// Start clean so a renamed or removed entry never leaves a stale file in
// the committed dist/.
await rm('dist', { recursive: true, force: true });
const { metafile } = await esbuild.build({ ...config, metafile: true });
// Which build is live: fetch <bundle base>/version.json and compare its
// hash (of every file in dist/) with a local `pnpm build`. Without
// --stamp it holds nothing else, so a rebuild of the same src/ is
// byte-identical and CI's dist check still passes.
const hash = createHash('sha256');
for (const file of Object.keys(metafile.outputs).sort()) hash.update(file + '\0').update(await readFile(file));
// No version field while package.json has none: the hash identifies the build.
const info = { ...(version !== '0.0.0' && { version }), hash: hash.digest('hex').slice(0, 12) };
if (stamp) {
  try {
    info.commit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {}
  info.built = new Date().toISOString();
}
await writeFile('dist/version.json', JSON.stringify(info) + '\n');
