// PROTOTYPE-ONLY: presence in the prototype environment. Each agent
// (this Claude session, its subagents, other sessions) reports through the
// Claude Code hook (scripts/presence-hook.mjs) to the dev server, which
// sends the list here live. The canvas lists them and draws, in every
// frame, a cursor and a label on the first element a recent change touched,
// like a teammate in Figma. Agents don't move a mouse: the cursor marks
// where the work is.

export interface Agent {
  id: string;
  name: string;
  session: string;
  sub?: boolean;
  state: 'working' | 'idle';
  status?: string;
  task?: string;
  file?: string;
  tool?: string;
  selectors?: string[];
  /** The breakpoint frames the work is about (desktop, tablet, mobile), first preferred. */
  frames?: string[];
  /** When the agent first reported (kept by the dev server). */
  first?: number;
  at: number;
}

// A colour per agent, as Figma gives each teammate: every agent present
// gets one no other present agent has, keeps it while it is around, and
// frees it when it leaves. No orange: that is the selection colour.
const PALETTE = ['#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#14B8A6', '#6366F1', '#0EA5E9', '#84CC16'];
const assigned = new Map<string, string>();
export function assignColors(agents: readonly Agent[]) {
  const here = new Set(agents.map((a) => a.id));
  for (const id of [...assigned.keys()]) if (!here.has(id)) assigned.delete(id);
  // Oldest first, so a new agent never takes an existing one's colour.
  for (const a of [...agents].sort((x, y) => x.at - y.at)) {
    if (assigned.has(a.id)) continue;
    const used = new Set(assigned.values());
    assigned.set(a.id, PALETTE.find((c) => !used.has(c)) ?? PALETTE[assigned.size % PALETTE.length]!);
  }
}
export const colorOf = (id: string) => assigned.get(id) ?? PALETTE[0]!;
/** "Claude", or "Claude · 65e4" when more than one session is around. */
export const labelOf = (a: Agent, all: readonly Agent[]) => {
  const same = all.filter((b) => b.name === a.name);
  if (same.length < 2) return a.name;
  // Agents of one session (parallel subagents) are told apart by their
  // number in order of arrival: "Builder 1", "Builder 2"…
  if (a.sub && same.every((b) => b.session === a.session)) {
    const n = [...same].sort((x, y) => (x.first ?? x.at) - (y.first ?? y.at) || x.id.localeCompare(y.id)).indexOf(a) + 1;
    return `${a.name} ${n}`;
  }
  return `${a.name} · ${a.session}`;
};
export const ago = (at: number) => {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  return s < 5 ? 'now' : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`;
};
/** Cursors only for recent work: older than this, the agent stays in the list but leaves the page. */
export const CURSOR_MS = 90_000;

/** Live list from the dev server: the current one, then every change. */
export function subscribe(set: (agents: Agent[]) => void) {
  fetch('/__presence').then((r) => r.json()).then((data: Agent[]) => { assignColors(data); set(data); }).catch(() => {});
  const hot = import.meta.hot;
  const on = (data: Agent[]) => { assignColors(data); set(data); };
  hot?.on('presence', on);
  return () => hot?.off?.('presence', on);
}

// Figma's multiplayer pointer: the classic arrow, filled with the person's
// colour, a white edge and a soft shadow; its tip is the point (0, 0).
/**
 * In each frame: the outline of the element each agent is working on (the
 * same element at every breakpoint). The cursor itself is drawn once per
 * agent on the canvas (Cursors.tsx), not in the frames, so no frame clips it.
 */
export class PresenceLayer {
  private items = new Map<string, { box: HTMLDivElement; el: Element | null }>();
  constructor(private doc: Document) {}

  /** `top`: the agent you went to, its outline above the others. */
  update(agents: readonly Agent[], _all: readonly Agent[], top: string | null = null) {
    const seen = new Set<string>();
    for (const a of agents) {
      const el = this.find(a.selectors ?? []);
      if (!el) continue;
      seen.add(a.id);
      let it = this.items.get(a.id);
      if (!it) {
        const color = colorOf(a.id);
        const box = this.doc.createElement('div');
        box.setAttribute('data-canvas-mark', '');
        box.style.cssText = `position:fixed;pointer-events:none;z-index:2147483645;border:1.5px solid ${color};border-radius:3px;background:${color}14;transition:all 450ms cubic-bezier(0.23,1,0.32,1);`;
        this.doc.body.append(box);
        it = { box, el: null };
        this.items.set(a.id, it);
      }
      it.el = el;
      it.box.style.opacity = a.state === 'idle' ? '0.55' : '1';
      it.box.style.zIndex = a.id === top ? '2147483646' : '2147483645';
    }
    for (const [id, it] of this.items) {
      if (seen.has(id)) continue;
      it.box.remove();
      this.items.delete(id);
    }
    this.place();
  }

  /** Follow the elements as the frame scrolls or reflows. */
  place() {
    for (const it of this.items.values()) {
      if (!it.el?.isConnected) continue;
      const r = it.el.getBoundingClientRect();
      Object.assign(it.box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    }
  }

  /** Where an agent is in this frame: its outlined element, or (outline
   *  expired) the last element it touched. */
  elementOf(a: Agent) {
    const it = this.items.get(a.id);
    return it?.el?.isConnected ? it.el : this.find(a.selectors ?? []);
  }

  private find(selectors: readonly string[]) {
    for (const s of selectors) {
      try {
        const el = this.doc.querySelector(s);
        if (el && !el.hasAttribute('data-canvas-mark')) return el;
      } catch { /* not a valid selector here */ }
    }
    return null;
  }
}
