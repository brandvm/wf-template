// Every class must be applied somewhere on the style guide page, so
// Webflow's "Clean up unused styles" can never delete one that only the
// CMS, a script or an unbuilt page uses (conventions.md §12).
//   pnpm check:style-guide
// Reads the classes from webflow.css and new-classes*.css, and the class
// attributes in design/style-guide/index.html plus its included partials.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const cssFiles = ['src/css/webflow.css', ...fs.readdirSync(path.join(root, 'src/css'))
  .filter((f) => /^new-classes.*\.css$/.test(f)).map((f) => `src/css/${f}`)];
const classes = new Set();
for (const f of cssFiles) {
  const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, prelude] of css.matchAll(/([^{}]+)\{/g)) {
    if (prelude.trim().startsWith('@')) continue;
    for (const [, c] of prelude.matchAll(/\.([a-z][\w-]*)/g)) classes.add(c);
  }
}

let html = read('design/style-guide/index.html');
html = html.replace(/<!-- @include ([\w/.-]+) -->/g, (_, f) => read(f));
const used = new Set();
for (const [, list] of html.matchAll(/\bclass="([^"]*)"/g)) for (const c of list.split(/\s+/)) if (c) used.add(c);

const missing = [...classes].filter((c) => !used.has(c)).sort();
if (missing.length) {
  console.log(`Not on the style guide (${missing.length} of ${classes.size}):\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log(`All ${classes.size} classes are applied on the style guide.`);
