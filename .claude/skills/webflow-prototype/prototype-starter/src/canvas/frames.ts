// PROTOTYPE-ONLY: what the prototype environment does inside each frame.
// The frames are the real pages (same origin), so the canvas reaches into
// them directly: it rewrites viewport units for the Full page view, picks
// elements, draws the hover and selection boxes, and injects the edits.
import type { Target } from './edits';

export const PROPS = [
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-wrap', 'color',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'row-gap', 'column-gap',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'aspect-ratio',
  'display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self', 'grid-template-columns', 'grid-template-rows', 'flex', 'overflow',
  'background-color', 'background-image', 'border-radius', 'border', 'box-shadow', 'opacity', 'backdrop-filter',
  'position', 'top', 'right', 'bottom', 'left', 'z-index', 'transform',
] as const;

const r = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

// A frame's CSS rules belong to the frame's window, whose CSSStyleRule is not
// this page's: instanceof is always false across frames, so check the shape.
const isStyle = (rule: CSSRule): rule is CSSStyleRule => 'selectorText' in rule && 'style' in rule;
const isMedia = (rule: CSSRule): rule is CSSMediaRule => 'conditionText' in rule && 'media' in rule;
const children = (rule: CSSRule): CSSRuleList | null => ('cssRules' in rule ? (rule as CSSGroupingRule).cssRules : null);

/** Computed values, written as a designer reads them: line height unitless, tracking in em, family's first name. */
export function readValues(win: Window, el: Element): Record<string, string> {
  const cs = win.getComputedStyle(el);
  const out: Record<string, string> = {};
  for (const p of PROPS) out[p] = cs.getPropertyValue(p);
  const fs = parseFloat(cs.fontSize);
  out['font-size'] = `${r(fs, 2)}px`;
  out['line-height'] = cs.lineHeight === 'normal' ? 'normal' : String(r(parseFloat(cs.lineHeight) / fs, 3));
  out['letter-spacing'] = cs.letterSpacing === 'normal' ? '0em' : `${r(parseFloat(cs.letterSpacing) / fs)}em`;
  out['font-family'] = cs.fontFamily.split(',')[0]!.replace(/["']/g, '').trim();
  return out;
}

/** A click lands on the deepest element; split text (SplitText) is class-less letters and words, so climb to the nearest element with a class. */
export function resolve(t: EventTarget | null): HTMLElement | null {
  let el = t as HTMLElement | null;
  while (el && el.parentElement && el.parentElement.tagName !== 'BODY' && !el.classList.length) el = el.parentElement;
  return el && el.tagName !== 'HTML' && el.tagName !== 'BODY' ? el : null;
}

const named = (el: Element) => {
  const cls = Array.from(el.classList).filter((c) => !c.startsWith('w-variant'));
  return el.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : '');
};

/** The same element in every frame, by its position: body > :nth-child(2) > … */
function path(el: Element) {
  const parts: string[] = [];
  for (let n: Element | null = el; n && n.tagName !== 'BODY'; n = n.parentElement) {
    const i = n.parentElement ? Array.from(n.parentElement.children).indexOf(n) + 1 : 1;
    parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${i})`);
  }
  return `body > ${parts.join(' > ')}`;
}

/** What an edit applies to: the element's classes (the class change it previews), or only this element. */
export function targetOf(el: HTMLElement, onlyThis: boolean): Target {
  const classes = Array.from(el.classList);
  const selector = onlyThis || !classes.length ? path(el) : '.' + classes.map((c) => CSS.escape(c)).join('.');
  const chain: string[] = [];
  for (let n: Element | null = el.parentElement; n && n.tagName !== 'BODY' && chain.length < 6; n = n.parentElement) chain.unshift(named(n));
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
  return {
    selector,
    label: named(el) + (onlyThis && classes.length ? ' (this one only)' : ''),
    chain: [...chain, named(el)].join(' › '),
    text: text.length > 60 ? `${text.slice(0, 60)}…` : text,
  };
}

/**
 * Full page view: the frame is as tall as the page, so 100svh would be the
 * whole page. Every vh/svh/dvh/lvh in the page's styles is rewritten to px
 * of the device's screen height, then the frame can grow to the page.
 */
export function freezeViewportUnits(doc: Document, screenH: number) {
  const unit = /(-?[\d.]+)(s|d|l)?vh\b/g;
  const fix = (v: string) => v.replace(unit, (_, n) => `${r((parseFloat(n) * screenH) / 100, 2)}px`);
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (isStyle(rule)) {
        for (const p of Array.from(rule.style)) {
          const v = rule.style.getPropertyValue(p);
          if (unit.test(v)) { unit.lastIndex = 0; rule.style.setProperty(p, fix(v), rule.style.getPropertyPriority(p)); }
          unit.lastIndex = 0;
        }
      }
      const kids = children(rule);
      if (kids) walk(kids);
    }
  };
  for (const sheet of Array.from(doc.styleSheets)) {
    try { walk(sheet.cssRules); } catch { /* another origin's sheet (fonts, icons) */ }
  }
}

/**
 * Full page: keep the viewport units frozen. Styles that arrive after the
 * frame loads (Vite injects CSS from modules, hot updates rewrite a style
 * element's text, a late stylesheet link) bring their vh back; the hero then
 * grows with the frame, the frame with the hero, and so on (the "enormous
 * hero" glitch, 2026-11-20). Re-freeze on every change in the head, then
 * call `after` (re-measure).
 */
export function keepViewportUnitsFrozen(doc: Document, screenH: number, after: () => void) {
  const win = doc.defaultView!;
  let queued = 0;
  const run = () => {
    queued = 0;
    freezeViewportUnits(doc, screenH);
    after();
  };
  const queue = () => { if (!queued) queued = win.setTimeout(run, 0); };
  run();
  new (win as unknown as typeof globalThis).MutationObserver(queue).observe(doc.head, { childList: true, subtree: true, characterData: true });
  doc.addEventListener('load', (e) => { if ((e.target as Element)?.tagName === 'LINK') queue(); }, true);
}

/** The page's own variables (the Webflow ones in :root), for the value fields' completion. */
export function readVariables(doc: Document, win: Window) {
  const names = new Set<string>();
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (isStyle(rule) && /(^|,)\s*(:root|body)\s*(,|$)/.test(rule.selectorText)) {
        for (const p of Array.from(rule.style)) if (p.startsWith('--_')) names.add(p);
      }
      const kids = children(rule);
      if (kids) walk(kids);
    }
  };
  for (const sheet of Array.from(doc.styleSheets)) {
    try { walk(sheet.cssRules); } catch { /* other origin */ }
  }
  const cs = win.getComputedStyle(doc.body);
  return [...names].sort().map((name) => {
    const value = cs.getPropertyValue(name).trim();
    return { name, value, type: /colors/.test(name) ? 'color' : undefined };
  });
}

/** The hover and selection boxes, drawn inside the frame so they follow its scroll. */
export class Marks {
  private hover: HTMLDivElement;
  private boxes: HTMLDivElement[] = [];
  constructor(private doc: Document, private win: Window) {
    this.hover = this.box('#F2592B', true);
  }
  private box(color: string, dashed = false) {
    const d = this.doc.createElement('div');
    d.setAttribute('data-canvas-mark', '');
    d.style.cssText = `position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;border:1.5px ${dashed ? 'dashed' : 'solid'} ${color};background:${dashed ? 'transparent' : 'rgba(242,89,43,0.06)'};display:none;border-radius:2px;`;
    this.doc.body.append(d);
    return d;
  }
  private place(d: HTMLDivElement, el: Element | null) {
    if (!el || !el.isConnected) { d.style.display = 'none'; return; }
    const b = el.getBoundingClientRect();
    Object.assign(d.style, { display: 'block', left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
  }
  showHover(el: Element | null) { this.place(this.hover, el); }
  /** Every element the edit would change in this frame. */
  showSelection(selector: string | null) {
    const els = selector ? Array.from(this.doc.querySelectorAll(selector)).filter((e) => !e.hasAttribute('data-canvas-mark')) : [];
    while (this.boxes.length < els.length) this.boxes.push(this.box('#F2592B'));
    this.boxes.forEach((b, i) => this.place(b, els[i] ?? null));
    this.selector = selector;
  }
  selector: string | null = null;
  refresh() { this.showSelection(this.selector); }
  get window() { return this.win; }
}

/** The edits stylesheet, kept as the last stylesheet in the frame's head. */
export function injectEdits(doc: Document, css: string) {
  let style = doc.getElementById('canvas-edits') as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = 'canvas-edits';
    doc.head.append(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

/** Whether the page's CSS sets this property on this element inside @media (max-width: <max>px) — a breakpoint's own value. */
export function hasRuleAt(doc: Document, el: Element, prop: string, max: number): boolean {
  const re = new RegExp(`max-width:\\s*${max}px`);
  const walk = (rules: CSSRuleList, inMedia: boolean): boolean => {
    for (const rule of Array.from(rules)) {
      if (isMedia(rule)) { if (walk(rule.cssRules, inMedia || re.test(rule.conditionText))) return true; continue; }
      if (inMedia && isStyle(rule) && rule.style.getPropertyValue(prop) !== '') {
        try { if (el.matches(rule.selectorText)) return true; } catch { /* a selector this browser can't match */ }
      }
    }
    return false;
  };
  for (const sheet of Array.from(doc.styleSheets)) {
    if ((sheet.ownerNode as Element | null)?.id === 'canvas-edits') continue;
    try { if (walk(sheet.cssRules, false)) return true; } catch { /* other origin */ }
  }
  return false;
}

/**
 * Pause or resume everything that moves in a frame: GSAP (its ticker also
 * drives Lenis and ScrollTrigger), playing videos, and CSS and Web
 * Animations. Used for frames scrolled off the canvas. Resuming restarts
 * only what this paused.
 */
/** Whether the page has loaded one of its own modules (GSAP's, Lenis's):
 *  only then is it imported from the canvas, so a project without one gets
 *  no failed request. */
const pageLoaded = (win: Window, path: string) =>
  win.performance.getEntriesByType('resource').some((e) => new URL(e.name).pathname === path);

export async function setFramePaused(win: Window, doc: Document, paused: boolean) {
  const w = win as Window & { __canvasPaused?: { videos: HTMLVideoElement[]; anims: Animation[]; on: boolean } };
  const st = (w.__canvasPaused ??= { videos: [], anims: [], on: false });
  if (st.on === paused) return;
  st.on = paused;
  if (pageLoaded(win, '/src/modules/gsap.ts')) try {
    // The page's own GSAP: the same module instance its scripts use.
    const { gsap } = (await (win as unknown as { eval: (s: string) => Promise<{ gsap: { ticker: { sleep(): void; wake(): void }; globalTimeline: { pause(): void; resume(): void } } }> }).eval("import('/src/modules/gsap.ts')"));
    if (paused) { gsap.globalTimeline.pause(); gsap.ticker.sleep(); } else { gsap.ticker.wake(); gsap.globalTimeline.resume(); }
  } catch { /* a page without the site's GSAP */ }
  if (paused) {
    st.videos = Array.from(doc.querySelectorAll('video')).filter((v) => !v.paused);
    st.videos.forEach((v) => v.pause());
    st.anims = doc.getAnimations().filter((a) => a.playState === 'running');
    st.anims.forEach((a) => a.pause());
  } else {
    st.videos.forEach((v) => v.play().catch(() => {}));
    st.anims.forEach((a) => a.play());
    st.videos = [];
    st.anims = [];
  }
}

/**
 * Scroll a frame to y through the page's own Lenis when it has one (an
 * immediate jump Lenis knows about), so Lenis doesn't ease it back to its
 * old target; a plain scroll otherwise (reduced motion, Full page view).
 */
export async function scrollFrameTo(win: Window, y: number) {
  if (pageLoaded(win, '/src/modules/smooth-scroll.ts')) try {
    const { lenis } = await (win as unknown as { eval: (s: string) => Promise<{ lenis: { scrollTo(y: number, o: { immediate: boolean; force: boolean }): void } | null }> }).eval("import('/src/modules/smooth-scroll.ts')");
    if (lenis) { lenis.scrollTo(y, { immediate: true, force: true }); return; }
  } catch { /* a page without the site's smooth scroll */ }
  win.scrollTo(0, y);
}
