// Task progress: which checklist items are done, who did them, and the
// person's own to-dos, in docs/handoff/progress.json. Bench's Tasks panel,
// Claude (through this script) and CI all read and write the same file, and
// Sync carries it between Macs (docs/bench.md › Task progress).
//   pnpm progress show [--json]
//   pnpm progress tick   "<checklist>" "<item, or the start of it>" [--page /about] [--component Nav] [--by claude|check|you]
//   pnpm progress untick "<checklist>" "<item>" [--page …] [--component …]
//   pnpm progress todo "<text>"          a to-do for the person
//   pnpm progress todo-done "<text or id>"
//   pnpm progress stage <name|auto>      pin the stage, or derive it again
// <checklist> is a checklist heading from the skills, e.g. "Before building",
// "Pre-launch QA · Content" or "Page done" (with --page). Matching ignores
// case and takes the start of the text, as long as it's unique.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
export const FILE = 'docs/handoff/progress.json';

// ── Checklists (the same rules as Bench's parser, so the ids match) ─────
const OWNERS = { claude: 'claude', 'claude checks': 'claude-checks', person: 'person' };
const ITEM = /^- \[(Claude checks|Claude|Person)\]\s+(.*)$/i;

export function plain(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
}

export function parseChecklists(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const groups = [];
  let h2 = null;
  let sub = null;
  let current = null;
  let item = null;
  let inFence = false;
  const groupFor = () => {
    const title = sub ? `${h2.title} · ${sub}` : h2.title;
    if (current?.title !== title) {
      current = { title, hint: h2.hint, items: [] };
      groups.push(current);
    }
    return current;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading && !line.startsWith('###')) {
      const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(heading[1]);
      h2 = { title: plain(m ? m[1] : heading[1]), hint: m ? plain(m[2]) : undefined };
      sub = null;
      current = null;
      item = null;
      continue;
    }
    if (line.startsWith('#')) {
      h2 = null;
      item = null;
      continue;
    }
    if (!h2) continue;
    const tagged = ITEM.exec(line);
    if (tagged) {
      item = { owner: OWNERS[tagged[1].toLowerCase()], text: tagged[2] };
      groupFor().items.push(item);
      continue;
    }
    if (item && /^\s{2,}\S/.test(line)) {
      item.text += ' ' + line.trim();
      continue;
    }
    item = null;
    const next = lines[i + 1] ?? '';
    if (line.trim() && !line.startsWith('-') && !/^\s/.test(line) && ITEM.test(next) && line.length < 48 && !/[.:,]$/.test(line.trim())) {
      sub = plain(line);
    }
  }
  for (const g of groups) for (const it of g.items) it.text = plain(it.text);
  return groups.filter((g) => g.items.length > 0);
}

/** An item's id: the first 12 hex of sha1("<group id>\n<item text>"). Rewording an item changes it. */
export const itemId = (group, text) => createHash('sha1').update(`${group}\n${text}`).digest('hex').slice(0, 12);

function skill(rel) {
  for (const base of [path.join(root, '.claude/skills'), path.join(root, '..', '.claude/skills')]) {
    try {
      return fs.readFileSync(path.join(base, rel), 'utf8');
    } catch { /* next */ }
  }
  return '';
}

/** Every checklist, with its group id prefix: build/… from webflow-build, launch/… from webflow-launch. */
export function checklists() {
  return [
    ...parseChecklists(skill('webflow-build/checklists.md')).map((g) => ({ ...g, set: 'build' })),
    ...parseChecklists(skill('webflow-launch/SKILL.md')).map((g) => ({ ...g, set: 'launch' })),
  ];
}

// ── Stages: the order a site goes through, and the checklists in each ──
export const STAGES = [
  ['Before building', (id) => id.startsWith('build/Before building')],
  ['Foundation', (id) => id.startsWith('build/Foundation done') || id.startsWith('build/Media done')],
  ['Components', (id) => id.startsWith('build/component/')],
  ['Pages', (id) => id.startsWith('build/page/')],
  ['Build handoff', (id) => id.startsWith('build/Build handoff') || id.startsWith('build/Migration parity')],
  ['SEO plan', (id) => id.startsWith('launch/SEO plan')],
  ['Pre-launch QA', (id) => id.startsWith('launch/Pre-launch QA')],
  ['Launch day', (id) => id.startsWith('launch/Launch day')],
  ['Client handoff', (id) => id.startsWith('launch/Handoff to client')],
  ['After launch', (id) => id.startsWith('launch/After launch')],
];

// ── The file ─────────────────────────────────────────────────────────────
export const empty = () => ({ format: 1, stage: null, ticks: {}, todos: [], components: [] });

export function load(dir = root) {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(path.join(dir, FILE), 'utf8')) };
  } catch {
    return empty();
  }
}

/**
 * One tick per line, groups and ticks sorted, so two Macs ticking
 * different items merge without a conflict.
 */
export function serialize(p) {
  const groups = Object.keys(p.ticks).sort().filter((g) => Object.keys(p.ticks[g]).length);
  const tickLines = groups.map((g) => {
    const ids = Object.keys(p.ticks[g]).sort();
    const rows = ids.map((id) => `      ${JSON.stringify(id)}: ${JSON.stringify(p.ticks[g][id])}`);
    return `    ${JSON.stringify(g)}: {\n${rows.join(',\n')}\n    }`;
  });
  const todos = p.todos.map((t) => `    ${JSON.stringify(t)}`);
  return [
    '{',
    `  "format": 1,`,
    `  "stage": ${JSON.stringify(p.stage ?? null)},`,
    `  "ticks": {${tickLines.length ? `\n${tickLines.join(',\n')}\n  ` : ''}},`,
    `  "todos": [${todos.length ? `\n${todos.join(',\n')}\n  ` : ''}],`,
    `  "components": ${JSON.stringify(p.components ?? [])}`,
    '}',
    '',
  ].join('\n');
}

export function save(p, dir = root) {
  const file = path.join(dir, FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, serialize(p));
}

/** The group a tick goes in: a checklist, or one page's or one component's copy of it. */
export function findGroup(lists, name, { page, component } = {}) {
  const q = name.trim().toLowerCase();
  const hits = lists.filter((g) => g.title.toLowerCase().startsWith(q));
  const exact = hits.filter((g) => g.title.toLowerCase() === q);
  const pick = exact.length === 1 ? exact : hits;
  if (!pick.length) throw new Error(`No checklist called "${name}". Run pnpm progress show for the list.`);
  if (pick.length > 1) throw new Error(`"${name}" matches ${pick.map((g) => `"${g.title}"`).join(', ')}. Say more of it.`);
  const g = pick[0];
  if (g.title === 'Page done') {
    if (!page) throw new Error('Page done is per page: add --page /path.');
    return { ...g, id: `build/page/${page}` };
  }
  if (g.title === 'Component done') {
    if (!component) throw new Error('Component done is per component: add --component <name>.');
    return { ...g, id: `build/component/${component}` };
  }
  return { ...g, id: `${g.set}/${g.title}` };
}

export function findItem(group, text) {
  const q = plain(text).toLowerCase();
  const hits = group.items.filter((i) => i.text.toLowerCase().startsWith(q));
  const loose = hits.length ? hits : group.items.filter((i) => i.text.toLowerCase().includes(q));
  if (!loose.length) throw new Error(`No item in "${group.title}" starts with "${text}".`);
  if (loose.length > 1) throw new Error(`"${text}" matches ${loose.length} items in "${group.title}". Say more of it.`);
  return loose[0];
}

/** The first stage with something left to do (pages from the config; components from the file). */
export function deriveStage(p, lists, pages) {
  const groups = [];
  for (const g of lists) {
    if (g.title === 'Page done') for (const pg of pages) groups.push({ id: `build/page/${pg}`, items: g.items });
    else if (g.title === 'Component done') for (const c of p.components ?? []) groups.push({ id: `build/component/${c}`, items: g.items });
    else groups.push({ id: `${g.set}/${g.title}`, items: g.items });
  }
  for (const [name, has] of STAGES) {
    const mine = groups.filter((g) => has(g.id));
    if (mine.some((g) => g.items.some((i) => !p.ticks[g.id]?.[itemId(g.id, i.text)]))) return name;
  }
  return STAGES[STAGES.length - 1][0];
}

// ── CLI ──────────────────────────────────────────────────────────────────
function main(argv) {
  const opt = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const args = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
  const [cmd, a, b] = args;
  const p = load();
  const lists = checklists();
  const pages = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, 'webflow-build.config.json'), 'utf8')).pages ?? ['/'];
    } catch {
      return ['/'];
    }
  })();

  if (cmd === 'tick' || cmd === 'untick') {
    if (!a || !b) throw new Error(`Usage: pnpm progress ${cmd} "<checklist>" "<item>" [--page /path] [--component Name]`);
    const group = findGroup(lists, a, { page: opt('page'), component: opt('component') });
    const item = findItem(group, b);
    const id = itemId(group.id, item.text);
    if (cmd === 'tick') {
      const by = opt('by') ?? 'claude';
      if (!['claude', 'check', 'you'].includes(by)) throw new Error('--by is claude, check or you.');
      p.ticks[group.id] = { ...p.ticks[group.id], [id]: { text: item.text, by, at: new Date().toISOString() } };
      if (opt('component') && !p.components.includes(opt('component'))) p.components.push(opt('component'));
    } else if (p.ticks[group.id]) {
      delete p.ticks[group.id][id];
    }
    save(p);
    console.log(`${cmd === 'tick' ? 'Ticked' : 'Unticked'} ${group.id} › ${item.text}`);
    return;
  }
  if (cmd === 'todo') {
    if (!a?.trim()) throw new Error('Usage: pnpm progress todo "<text>"');
    p.todos.push({ id: `t-${randomUUID().slice(0, 8)}`, text: a.trim(), done: false });
    save(p);
    console.log(`Added a to-do: ${a.trim()}`);
    return;
  }
  if (cmd === 'todo-done') {
    const t = p.todos.find((x) => x.id === a) ?? p.todos.find((x) => x.text.toLowerCase().startsWith((a ?? '').toLowerCase()));
    if (!t) throw new Error(`No to-do "${a}".`);
    t.done = true;
    save(p);
    console.log(`Done: ${t.text}`);
    return;
  }
  if (cmd === 'stage') {
    if (a === 'auto') p.stage = null;
    else {
      const s = STAGES.find(([n]) => n.toLowerCase().startsWith((a ?? '').toLowerCase()));
      if (!s) throw new Error(`Stages: ${STAGES.map(([n]) => n).join(', ')}, or auto.`);
      p.stage = s[0];
    }
    save(p);
    console.log(`Stage: ${p.stage ?? `${deriveStage(p, lists, pages)} (derived)`}`);
    return;
  }
  // show
  const stage = p.stage ?? deriveStage(p, lists, pages);
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ stage, pinned: !!p.stage, ticks: p.ticks, todos: p.todos }, null, 2));
    return;
  }
  console.log(`Stage: ${stage}${p.stage ? ' (set by hand)' : ''}`);
  for (const g of lists) {
    const ids = g.title === 'Page done' ? pages.map((pg) => `build/page/${pg}`)
      : g.title === 'Component done' ? (p.components ?? []).map((c) => `build/component/${c}`) : [`${g.set}/${g.title}`];
    for (const id of ids) {
      const done = g.items.filter((i) => p.ticks[id]?.[itemId(id, i.text)]).length;
      console.log(`  ${done === g.items.length ? '☑' : '☐'} ${id}  ${done}/${g.items.length}`);
    }
  }
  const open = p.todos.filter((t) => !t.done);
  if (open.length) console.log(`The person's to-dos:\n${open.map((t) => `  ☐ ${t.text}`).join('\n')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
