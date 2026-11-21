#!/usr/bin/env node
// PROTOTYPE-ONLY: a Claude Code hook that tells the prototype canvas what
// each agent is doing (presence: an avatar, a status line, and a cursor on
// the elements a change touches). Registered in the workspace's
// .claude/settings.json for PreToolUse, UserPromptSubmit, Stop,
// SubagentStop and SessionEnd.
//
// It reads the hook's JSON on stdin, posts a short summary to the dev
// server's /__presence (PRESENCE_URL, default this prototype's dev port), and
// exits. It never prints, never blocks a tool for more than ~400 ms, and
// never fails one: no dev server, no presence, nothing else changes.
import fs from 'node:fs';
import { basename } from 'node:path';

// The dev server's port, from this prototype's dev script (--port N).
const devPort = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    return /--port (\d+)/.exec(pkg.scripts?.dev ?? '')?.[1] ?? '5173';
  } catch { return '5173'; }
})();
const URL_BASE = process.env.PRESENCE_URL ?? `http://127.0.0.1:${devPort}`;

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let e;
try { e = JSON.parse(raw); } catch { process.exit(0); }

const session = String(e.session_id ?? 'session');
const sub = e.agent_id ? String(e.agent_id) : '';
const id = sub ? `${session}:${sub}` : session;
// Subagents by role: a workflow's or general-purpose agent is a "Builder".
const TYPES = { 'workflow-subagent': 'Builder', 'general-purpose': 'Builder', Explore: 'Explorer', Plan: 'Planner' };
const name = sub ? (TYPES[e.agent_type] ?? (e.agent_type ? String(e.agent_type) : 'Agent')) : 'Claude';
const input = e.tool_input ?? {};
const tool = String(e.tool_name ?? '');
const file = input.file_path || input.notebook_path || input.path || '';
const short = (p) => (p ? basename(String(p)) : '');

/** What the call does, in a few words. */
function status() {
  switch (e.hook_event_name) {
    case 'UserPromptSubmit': return { state: 'working', status: 'Reading your message' };
    case 'Stop': return { state: 'idle', status: 'Waiting for you' };
    case 'SubagentStop':
    case 'SessionEnd': return { gone: true };
  }
  if (/^(Edit|MultiEdit|Write|NotebookEdit)$/.test(tool)) return { status: `Editing ${short(file)}` };
  if (tool === 'Read') return { status: `Reading ${short(file)}` };
  if (tool === 'Grep' || tool === 'Glob') return { status: 'Searching the code' };
  if (tool === 'Bash') return { status: input.description ? String(input.description) : 'Running a command' };
  if (tool === 'Agent' || tool === 'Task') return { status: `Starting an agent: ${input.description ?? ''}`.trim() };
  if (/^Web(Search|Fetch)$/.test(tool)) return { status: 'Looking something up' };
  if (/Claude_Browser|claude-in-chrome/.test(tool)) {
    if (input.url) return { status: `Opening ${String(input.url).replace(/^https?:\/\/[^/]+/, '') || '/'}` };
    return { status: 'Checking in the browser' };
  }
  if (/figma/i.test(tool)) return { status: 'Reading Figma' };
  if (/webflow/i.test(tool)) return { status: 'Working in Webflow' };
  if (/ccd_turn__update_plan/.test(tool)) {
    const step = Array.isArray(input.items) ? input.items.find((i) => i.status === 'in_progress') : null;
    return step ? { status: undefined, task: String(step.content) } : null;
  }
  if (/^mcp__ccd_|^ToolSearch$|^Skill$/.test(tool)) return null; // housekeeping: no change worth showing
  return { status: tool.replace(/^mcp__[^_]+__/, '').replace(/_/g, ' ') };
}

/** The elements a call touches: classes and ids in edited CSS/HTML, data hooks, selectors the browser was asked for. */
function selectors() {
  const text = String(input.new_string ?? input.content ?? input.text ?? '').slice(0, 20_000);
  if (!text) return [];
  const out = new Set();
  const add = (s) => { if (out.size < 8 && s && !/^\.(w-|ph|sg-|cv-)/.test(s)) out.add(s); };
  for (const m of text.matchAll(/querySelector(?:All)?\(\s*['"`]([^'"`]+)['"`]/g)) add(m[1]);
  if (/\.css$/.test(file) || /[{};]\s*$/m.test(text)) for (const m of text.matchAll(/(?:^|[\s,{}>+~(])\.([a-z][\w-]*)/gm)) add(`.${m[1]}`);
  for (const m of text.matchAll(/class="([^"]+)"/g)) add(`.${m[1].trim().split(/\s+/)[0]}`);
  for (const m of text.matchAll(/\bid="([^"]+)"/g)) add(`#${m[1]}`);
  for (const m of text.matchAll(/\[(data-[\w-]+)(?:=[^\]]*)?\]/g)) add(`[${m[1]}]`);
  return [...out];
}

/** Which breakpoint frames the work is about, in the order the text names
 *  them: widths and breakpoint names (an edit in a 991 px media block is
 *  tablet work), so the canvas puts the cursor in that frame. */
function framesIn(text) {
  const found = [];
  for (const [id, re] of [['desktop', /(?<!\d)1440(?!\d)|\bdesktop\b/i], ['tablet', /(?<!\d)(?:820|991)(?!\d)|\btablet\b/i], ['mobile', /(?<!\d)(?:390|479|667|767)(?!\d)|\b(?:mobile|phone)\b/i]]) {
    const m = re.exec(text);
    if (m) found.push([m.index, id]);
  }
  return found.sort((a, b) => a[0] - b[0]).map(([, id]) => id);
}

const s = status();
if (!s) process.exit(0);
const body = { id, name, session: session.slice(0, 4), sub: Boolean(sub), state: 'working', ...s };
if (!s.gone && e.hook_event_name === 'PreToolUse') {
  body.tool = tool;
  if (file) body.file = String(file);
  const sel = selectors();
  if (sel.length) body.selectors = sel;
  // A plan step sets the frames for the work that follows (none named: the
  // active frame); a call that names a breakpoint moves the cursor there.
  const fr = framesIn(/ccd_turn__update_plan/.test(tool) ? String(s.task ?? '') : JSON.stringify(input).slice(0, 20_000));
  if (fr.length || /ccd_turn__update_plan/.test(tool)) body.frames = fr;
}
for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];

try {
  await fetch(`${URL_BASE}/__presence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(400),
  });
} catch { /* no dev server running: nothing to show */ }
process.exit(0);
