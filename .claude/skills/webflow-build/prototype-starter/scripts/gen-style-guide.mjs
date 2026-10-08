// Generate design/style-guide/index.html from the snapshot and the CSS.
//   pnpm style-guide
// Sections, in order (conventions.md §12):
//   1 colours      every Color variable outside the semantic collection
//   2 themes       every class that sets a Colors Semantic mode
//   3 typography   every class that sets a Typography Styles mode
//   4 utilities    Size, Weight, Leading, Tracking, Text and Max Width classes
//   5 spacing, radius
//   6 components   design/style-guide/components.html, written by hand
//   7 class library: every class or combo not applied above, on a sealed
//     tile, so Webflow's "Clean up unused styles" can never delete it.
// The page's own layout uses Sg classes (src/css/style-guide.css, written
// here too); create them in Webflow with the page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const V = JSON.parse(read('webflow-snapshot/variables.json'));
const S = JSON.parse(read('webflow-snapshot/styles.json'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const SEMANTIC = 'Colors Semantic';
const STYLES = 'Typography Styles';

// Classes and combo chains from webflow.css and new-classes*.css.
const chains = new Map(); // ".a.b" → ["a", "b"]
const cssFiles = ['src/css/webflow.css', ...fs.readdirSync(path.join(root, 'src/css')).filter((f) => /^new-classes.*\.css$/.test(f)).map((f) => `src/css/${f}`)];
for (const f of cssFiles) {
  const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, prelude] of css.matchAll(/([^{}]+)\{/g)) {
    for (let sel of prelude.split(',')) {
      sel = sel.trim().replace(/^[a-z]+(?=\.)/, '');
      const m = sel.match(/^((?:\.[a-z][\w-]*)+)/);
      if (m && !chains.has(m[1])) chains.set(m[1], m[1].slice(1).split('.'));
    }
  }
}
const used = new Set();
const use = (classes) => { classes.forEach((c) => used.add(c)); return classes.join(' '); };
const nameOf = (sel) => S.find((s) => s.selector === sel)?.name ?? sel.slice(1).split(/[.-]/).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

const sections = [];
const section = (id, title, body) => sections.push(`
      <section class="${use(['section'])}" id="${id}">
        <div class="${use(['s-wrapper'])}">
          <h2 class="${use(['sg-title'])}">${esc(title)}</h2>
${body}
        </div>
      </section>`);
const label = (t) => `<div class="${use(['sg-label'])}">${esc(t)}</div>`;

// 1 colours
const colours = V.filter((c) => c.collection !== SEMANTIC).flatMap((c) => c.variables.filter((v) => v.type === 'Color').map((v) => [c.collection, v]));
if (colours.length) section('colours', 'Colours', `          <div class="${use(['sg-grid'])}">\n${colours.map(([c, v]) =>
  `            <div class="${use(['sg-swatch'])}"><div class="${use(['sg-swatch-color'])}" style="background: var(${v.cssName})"></div>${label(`${c} / ${v.name}`)}</div>`).join('\n')}\n          </div>`);

// 2 themes, 3 typography: classes that set a mode of that collection
const byMode = (coll) => S.filter((s) => s.variableModes?.main?.[coll] && s.selector?.startsWith('.'));
const themes = byMode(SEMANTIC);
if (themes.length) section('themes', 'Colour themes', `          <div class="${use(['sg-grid'])}">\n${themes.map((s) =>
  `            <div class="${use([...chains.get(s.selector) ?? s.selector.slice(1).split('.'), 'sg-theme'])}">${label(`${s.name} → ${s.variableModes.main[SEMANTIC]}`)}<p>Text on this theme. <a href="#themes">A link</a>.</p></div>`).join('\n')}\n          </div>`);
const type = byMode(STYLES);
if (type.length) section('typography', 'Typography', type.map((s) =>
  `          <div class="${use(['sg-specimen'])}">${label(`${s.name} · ${s.variableModes.main[STYLES]}`)}<div class="${use(s.selector.slice(1).split('.'))}">The quick brown fox jumps over the lazy dog</div></div>`).join('\n'));

// 4 utilities
const UTIL = /^(Size|Weight|Leading|Tracking|Text|Max Width)\b/;
const utils = S.filter((s) => UTIL.test(s.name) && s.selector?.startsWith('.') && !s.selector.slice(1).includes('.'));
if (utils.length) section('utilities', 'Utilities', `          <div class="${use(['sg-grid'])}">\n${utils.map((s) =>
  `            <div class="${use(['sg-specimen'])}">${label(s.name)}<div class="${use([s.selector.slice(1)])}">Aa Sample text</div></div>`).join('\n')}\n          </div>`);

// 5 spacing, radius
const scale = (name, css) => {
  const c = V.find((x) => x.collection === name);
  if (!c?.variables.length) return;
  section(name.toLowerCase(), name, c.variables.map((v) =>
    `          <div class="${use(['sg-specimen'])}">${label(v.name)}<div class="${use(['sg-bar'])}" style="${css(v.cssName)}"></div></div>`).join('\n'));
};
scale('Spacing', (v) => `width: var(${v})`);
scale('Radius', (v) => `border-radius: var(${v})`);

// 6 components, written by hand
const componentsFile = 'design/style-guide/components.html';
if (!fs.existsSync(path.join(root, componentsFile))) {
  fs.writeFileSync(path.join(root, componentsFile), '<!-- Components and page components, written by hand: buttons and their states,\n     form parts, cards, the page-structure diagram, page previews. -->\n');
}
const components = read(componentsFile);
for (const [, list] of components.matchAll(/\bclass="([^"]*)"/g)) list.split(/\s+/).forEach((c) => c && used.add(c));
section('components', 'Components', `          <!-- @include ${componentsFile} -->`);

// 7 class library: every chain not applied above, on a sealed tile
const left = [...chains].filter(([, cls]) => !cls.every((c) => used.has(c)) && !cls[0].startsWith('sg-'));
if (left.length) section('classes', 'Class library', `          <div class="${use(['sg-grid'])}">\n${left.map(([sel, cls]) =>
  `            <div class="${use(['sg-tile'])}">${label(nameOf(sel))}<div class="${use(cls)}"></div></div>`).join('\n')}\n          </div>`);

fs.writeFileSync(path.join(root, 'design/style-guide/index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Style guide</title>
<!-- @include partials/head.html -->
<link rel="stylesheet" href="/src/css/style-guide.css">
<script type="module" src="/src/main.ts"></script>
</head>
<body>
<!-- GENERATED by \`pnpm style-guide\`; edit ${componentsFile} instead. -->
<div class="g-page-w">
  <!-- @include partials/nav.html -->
  <div class="g-main-w">
    <main id="main">
      <section class="section is-top" id="top">
        <div class="s-wrapper">
          <h1 class="d1">Style guide</h1>
        </div>
      </section>${sections.join('')}
    </main>
    <!-- @include partials/footer.html -->
  </div>
</div>
</body>
</html>
`);

fs.writeFileSync(path.join(root, 'src/css/style-guide.css'), `/* GENERATED by \`pnpm style-guide\`: the style guide page's own layout.
   Create these Sg classes in Webflow with the page. */
.sg-title { margin: 0 0 1.5em; }
.sg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(12em, 1fr)); grid-template-rows: auto; gap: 1.5em; }
.sg-label { font-size: 0.75em; opacity: 0.7; margin-bottom: 0.5em; }
.sg-swatch-color { aspect-ratio: 3 / 2; border: 1px solid rgb(0 0 0 / 0.1); }
.sg-theme { padding: 1.5em; }
.sg-specimen { margin-bottom: 1.5em; }
.sg-bar { height: 0.75em; min-width: 1px; background: currentColor; }
/* repo-css: designer-cant — contain keeps positioned or hidden specimens inside their tile */
.sg-tile { position: relative; min-height: 6em; padding: 1em; overflow: hidden; contain: layout paint; border: 1px dashed rgb(0 0 0 / 0.2); }
`);
console.log(`style guide: ${sections.length} sections, ${used.size} classes applied, ${left.length} on library tiles`);
