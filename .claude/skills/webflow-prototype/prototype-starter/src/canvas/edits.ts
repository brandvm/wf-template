// PROTOTYPE-ONLY: the prototype environment's edits.
// An edit is a CSS property set on a selector at one breakpoint. All edits
// become one stylesheet, injected into every frame, that cascades the way
// Webflow does: a Desktop edit applies at every width, a Tablet edit at
// 991 and below, and so on down. Nothing is saved: the summary is pasted to
// Claude, who makes the change in the classes, variables and style guide.

export type Bp = 'base' | 'tablet' | 'landscape' | 'mobile';

export const BPS: readonly { id: Bp; name: string; scope: string; max: number | null }[] = [
  { id: 'base', name: 'Desktop', scope: 'Base', max: null },
  { id: 'tablet', name: 'Tablet', scope: '≤ 991', max: 991 },
  { id: 'landscape', name: 'Mobile landscape', scope: '≤ 767', max: 767 },
  { id: 'mobile', name: 'Mobile portrait', scope: '≤ 479', max: 479 },
];

/** Which breakpoint a frame of this width edits (Webflow's desktop-first cascade). */
export const bpOf = (width: number): Bp => (width >= 992 ? 'base' : width >= 768 ? 'tablet' : width >= 480 ? 'landscape' : 'mobile');
export const bpInfo = (bp: Bp) => BPS.find((b) => b.id === bp)!;

export interface Target {
  /** What the edit applies to: ".intro-statement" or a structural path. */
  selector: string;
  /** For people: "h2.intro-statement". */
  label: string;
  /** The parents, outermost first: "section.section.is-intro › div.s-wrapper › …". */
  chain: string;
  text: string;
}

export interface Edit {
  target: Target;
  bp: Bp;
  prop: string;
  /** The computed value before, at that breakpoint, as read in the frame. */
  from: string;
  to: string;
  /**
   * Where the edit stops, as Webflow's cascade does: a smaller breakpoint
   * that has its own value for this property keeps it. The smallest width
   * the edit applies at (null: all the way down), and that breakpoint's name.
   */
  minWidth?: number | null;
  keeps?: string;
}

const key = (e: Pick<Edit, 'target' | 'bp' | 'prop'>) => `${e.target.selector}|${e.bp}|${e.prop}`;

export class Edits {
  private list = new Map<string, Edit>();
  private listeners = new Set<() => void>();

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((fn) => fn());
  }
  all() {
    return [...this.list.values()];
  }
  /** Back from storage after a reload. */
  restore(list: readonly Edit[]) {
    for (const e of list) this.list.set(key(e), e);
    this.emit();
  }
  get(target: Target, bp: Bp, prop: string) {
    return this.list.get(key({ target, bp, prop }));
  }
  set(edit: Edit) {
    const k = key(edit);
    const prev = this.list.get(k);
    // Keep the first "from": the value before any edit.
    const from = prev ? prev.from : edit.from;
    if (edit.to.trim() === '' || edit.to.trim() === from) this.list.delete(k);
    else this.list.set(k, { ...edit, from, to: edit.to.trim(), minWidth: prev?.minWidth ?? edit.minWidth ?? null, keeps: prev?.keeps ?? edit.keeps });
    this.emit();
  }
  remove(target: Target, bp: Bp, prop: string) {
    this.list.delete(key({ target, bp, prop }));
    this.emit();
  }
  clear() {
    this.list.clear();
    this.emit();
  }

  /** The stylesheet every frame gets. !important: a preview wins over the site's classes and its scripts' inline styles. */
  css() {
    return this.all()
      .sort((a, b) => BPS.findIndex((x) => x.id === a.bp) - BPS.findIndex((x) => x.id === b.bp))
      .map((e) => {
        const max = bpInfo(e.bp).max;
        const q = [max !== null ? `(max-width: ${max}px)` : '', e.minWidth ? `(min-width: ${e.minWidth}px)` : ''].filter(Boolean);
        const rule = `${e.target.selector} { ${e.prop}: ${e.to} !important; }`;
        return q.length ? `@media screen and ${q.join(' and ')} {\n${rule}\n}` : rule;
      })
      .join('\n');
  }

  /** What is pasted to Claude, grouped by element, then by breakpoint. */
  summary(page: string, bodyPx: (bp: Bp) => number) {
    const edits = this.all();
    if (!edits.length) return 'Prototype canvas — no changes.';
    const lines = [`Prototype canvas — ${page}`, 'Breakpoint edits cascade like Webflow: Desktop applies at every width, Tablet at 991 and below, and so on.'];
    const bySel = new Map<string, Edit[]>();
    for (const e of edits) bySel.set(e.target.selector, [...(bySel.get(e.target.selector) ?? []), e]);
    for (const group of bySel.values()) {
      const t = group[0]!.target;
      lines.push('', `Element: ${t.label}`, `Chain: ${t.chain}`);
      if (t.text) lines.push(`Text: "${t.text}"`);
      for (const b of BPS) {
        const es = group.filter((e) => e.bp === b.id);
        if (!es.length) continue;
        lines.push(`${b.name} (${b.scope}):`);
        for (const e of es) lines.push(`  ${e.prop}: ${describe(e.prop, e.from, bodyPx(b.id))} → ${describe(e.prop, e.to, bodyPx(b.id))}${e.keeps ? `  (${e.keeps} keeps its own value)` : ''}`);
      }
    }
    return lines.join('\n');
  }
}

const r = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
function describe(prop: string, v: string, body: number) {
  const px = v.match(/^(-?[\d.]+)px$/);
  if (px) return `${v} (${r(parseFloat(px[1]!) / body)}em of the ${r(body, 2)}px body)`;
  if (prop === 'letter-spacing' && /em$/.test(v)) return `${v} (${r(parseFloat(v) * 100, 2)}%)`;
  return v;
}
