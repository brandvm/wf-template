// PROTOTYPE-ONLY: the prototype environment (/design/canvas).
// The site at three breakpoints side by side on a canvas you pan and zoom,
// each frame the real page at that width (its breakpoint, fluid scale, nav
// and pins behave as on a screen that size). Live: each frame is a screen
// tall and scrolls, with motion; Full page: each frame is the whole page,
// motion off. Inspect: pick an element in any frame and edit it in the
// panel; edits cascade across breakpoints like Webflow.
// UI from kit (@weftly/components, @weftly/editor), per kit's rule: every
// control is a library part.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Breakpoints, Button, Icon, IconButton, Panel, PanelBody, PanelHead, Segmented, Select, Switch, Tag, Text, Toolbar, WithTooltip, cascade } from '@weftly/components';
import { ZoomControl } from '@weftly/editor';
import { Edits, bpOf, bpInfo, type Bp } from './edits';
import { Marks, keepViewportUnitsFrozen, injectEdits, readValues, readVariables, resolve, scrollFrameTo, setFramePaused, targetOf } from './frames';
import { Inspector, type Selection } from './Inspector';
import { load, save } from './store';
import { CURSOR_MS, PresenceLayer, labelOf, subscribe, type Agent } from './presence';
import { PresenceAvatars, PresenceList } from './PresenceList';
import { Cursors, type CursorPoint } from './Cursors';

export const FRAMES = [
  { id: 'desktop', name: 'Desktop', width: 1440, screen: 900, icon: 'monitor' },
  { id: 'tablet', name: 'Tablet', width: 820, screen: 1180, icon: 'tablet' },
  { id: 'mobile', name: 'Mobile', width: 390, screen: 844, icon: 'phone' },
] as const;
export type FrameId = (typeof FRAMES)[number]['id'];

const GAP = 80; // between frames, in page px
// The space above the frames, in canvas px, where the labels sit. The
// labels themselves are drawn at a constant size on screen (see .cv-label).
const LABEL = 0;
const TOP = 56; // screen px above the frames after Fit, for the labels
// The project's pages, from the dev server (vite.config.js › pages, each
// labelled by its <title>): { value: URL, label, design: style guide and
// other design/ pages }.
type PageItem = { value: string; label: string; design?: boolean };

type Mode = 'live' | 'full';
const PAGE_GAP = 480; // between pages in All pages, in page px
// All pages draws like Figma: pictures of the pages (pnpm canvas:shots) for
// the overview; a frame runs live only when it is on screen at LIVE_ZOOM or
// closer, at most MAX_LIVE at once, mounted once the canvas has stopped
// moving; nothing off screen is drawn at all.
const LIVE_ZOOM = 30;
const MAX_LIVE = 4;
type Shot = { src: string; h: number; at: number };
interface Live { win: Window; doc: Document; marks: Marks; presence: PresenceLayer }

/** Where an agent's cursor goes first: the frames its work names (an edit
 *  in the 991 px block, a check at 390), then the active frame, then the rest. */
function frameOrder(a: Agent, active: FrameId): FrameId[] {
  const named = (a.frames ?? []).filter((id): id is FrameId => FRAMES.some((f) => f.id === id));
  return [...new Set<FrameId>([...named, active, ...FRAMES.map((f) => f.id)])];
}

export function App() {
  // What the canvas remembers from the last visit (store.ts).
  const saved = useMemo(() => load(), []);
  const edits = useMemo(() => {
    const e = new Edits();
    if (saved.edits?.length) e.restore(saved.edits);
    return e;
  }, [saved]);
  useSyncExternalStore((fn) => edits.subscribe(fn), () => edits.all().length + edits.css());

  const [page, setPage] = useState(saved.page ?? '/');
  const [PAGES, setPages] = useState<PageItem[]>([{ value: '/', label: 'Home' }]);
  useEffect(() => { fetch('/__pages').then((r) => r.json()).then(setPages).catch(() => {}); }, []);
  // The site's pages (not the style guide) for All pages; the pictures
  // script reads the same list (scripts/canvas-shots.mjs).
  const SITE = useMemo(() => PAGES.filter((p) => !p.design), [PAGES]);
  const [mode, setMode] = useState<Mode>(saved.mode ?? 'live');
  const [sync, setSync] = useState(saved.sync ?? true);
  // Full page, every page at once (the person, 2026-11-20): view only.
  const [allPages, setAllPages] = useState(saved.allPages ?? false);
  const showAll = mode === 'full' && allPages;
  const [allHeights, setAllHeights] = useState<Record<string, number>>({});
  const [shots, setShots] = useState<Record<string, Shot>>({});
  const [shotsBusy, setShotsBusy] = useState(false);
  const loadShots = useCallback(() => {
    fetch(`/canvas-shots/manifest.json?t=${Date.now()}`).then((r) => (r.ok ? r.json() : {})).then(setShots).catch(() => setShots({}));
  }, []);
  useEffect(() => { if (showAll) loadShots(); }, [showAll, loadShots]);
  const updateShots = async () => {
    setShotsBusy(true);
    try { await fetch('/__canvas-shots', { method: 'POST' }); } finally { setShotsBusy(false); loadShots(); }
  };
  const [inspect, setInspect] = useState(false);
  // Collapsed until you pick an element (the person, 2026-11-20).
  const [panelOpen, setPanelOpen] = useState(saved.panelOpen ?? false);
  const [onlyThis, setOnlyThis] = useState(saved.onlyThis ?? false);
  const [zoom, setZoom] = useState(saved.zoom ?? 40);
  const [pan, setPan] = useState(saved.pan ?? { x: 40, y: TOP });
  const [heights, setHeights] = useState<Record<FrameId, number>>({ desktop: 900, tablet: 1180, mobile: 844 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [panning, setPanning] = useState(false);
  // The breakpoint you're looking at or editing: the toolbar's Breakpoints
  // control and the highlighted frame show it.
  const [active, setActive] = useState<FrameId>(saved.active ?? 'desktop');
  const [paused, setPaused] = useState<Partial<Record<FrameId, boolean>>>({});
  const [variables, setVariables] = useState<{ name: string; value: string; type?: string }[]>([]);
  const [, bump] = useState(0);
  // Who is working (Claude, its agents, other sessions), live from the dev
  // server; a tick every 10 s keeps "12s ago" and the cursor cut-off fresh.
  const [agents, setAgents] = useState<Agent[]>([]);
  const agentsRef = useRef<Agent[]>([]);
  agentsRef.current = agents;
  useEffect(() => subscribe(setAgents), []);
  useEffect(() => { const t = setInterval(() => bump((n) => n + 1), 10_000); return () => clearInterval(t); }, []);
  // A frame scrolling moves the elements under the cursors: redraw (at most once a frame's worth).
  const redrawPending = useRef(false);
  const redrawCursors = () => {
    if (redrawPending.current) return;
    redrawPending.current = true;
    setTimeout(() => { redrawPending.current = false; bump((n) => n + 1); }, 16);
  };
  const recent = (list: readonly Agent[]) => list.filter((a) => Date.now() - a.at < CURSOR_MS && a.selectors?.length);
  const pendingSelection = useRef(saved.selection ?? null);
  const selectionRef = useRef<Selection | null>(null);

  const viewport = useRef<HTMLDivElement>(null);
  const frames = useRef<Partial<Record<FrameId, Live>>>({});
  const iframes = useRef<Partial<Record<FrameId, HTMLIFrameElement | null>>>({});
  const state = useRef({ inspect, mode, sync, zoom, pan, onlyThis, syncing: false });
  state.current = { ...state.current, inspect, mode, sync, zoom, pan, onlyThis };

  // ---- Layout of the world: frames side by side ----
  const layout = useMemo(() => {
    let x = 0;
    return FRAMES.map((f) => {
      const h = mode === 'full' ? heights[f.id] : f.screen;
      const item = { ...f, x, h };
      x += f.width + GAP;
      return item;
    });
  }, [mode, heights]);
  // All pages: each page's three frames side by side, the pages in a row.
  const allLayout = useMemo(() => {
    let x = 0;
    return SITE.map((pg) => {
      const x0 = x;
      const items = FRAMES.map((f) => {
        const key = `${pg.value}|${f.id}`;
        const item = { ...f, key, x, h: allHeights[key] ?? shots[key]?.h ?? f.screen };
        x += f.width + GAP;
        return item;
      });
      x += PAGE_GAP - GAP;
      return { ...pg, x: x0, frames: items };
    });
  }, [allHeights, shots, SITE]);
  const allFrames = allLayout.flatMap((pg) => pg.frames);
  const worldW = showAll ? allFrames.reduce((w, f) => Math.max(w, f.x + f.width), 0) : layout.reduce((w, f) => Math.max(w, f.x + f.width), 0);
  const worldH = (showAll ? Math.max(...allFrames.map((f) => f.h)) : Math.max(...layout.map((f) => f.h))) + LABEL;

  const fit = useCallback(() => {
    const v = viewport.current;
    if (!v) return;
    const vw = v.clientWidth - 64;
    const vh = v.clientHeight - 64;
    // Live: the whole row fits; Full page: fit the width, start at the top.
    // All pages: the whole row of pages across the canvas.
    const z = mode === 'full' ? vw / worldW : Math.min(vw / worldW, vh / worldH);
    const zoomed = Math.max(showAll ? 1 : 5, Math.min(100, showAll ? Math.round(z * 1000) / 10 : Math.floor(z * 100)));
    setZoom(zoomed);
    // All pages: room for the page names above the frame labels.
    setPan({ x: (v.clientWidth - (worldW * zoomed) / 100) / 2, y: showAll ? TOP + 48 : TOP });
  }, [mode, worldW, worldH, showAll]);
  // A change of view fits the frames; the first run keeps a remembered view.
  // (Compared with the last view, not "first run": React's dev mode runs an
  // effect twice on mount.)
  const lastMode = useRef<Mode | null>(saved.zoom !== undefined ? mode : null);
  useEffect(() => {
    if (lastMode.current === mode) return;
    lastMode.current = mode;
    fit();
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  // Turning All pages on or off fits too.
  const lastAll = useRef(showAll);
  useEffect(() => {
    if (lastAll.current === showAll) return;
    lastAll.current = showAll;
    fit();
  }, [showAll]); // eslint-disable-line react-hooks/exhaustive-deps
  // The canvas resizing (the browser going full screen, the panel opening)
  // keeps your view: what was in the middle stays there. Only the first
  // size, a change of view and the Fit button fit the frames.
  const fitRef = useRef(fit);
  fitRef.current = fit;
  const lastSize = useRef<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const v = viewport.current;
    if (!v) return;
    const ro = new ResizeObserver(() => {
      const size = { w: v.clientWidth, h: v.clientHeight };
      const prev = lastSize.current;
      lastSize.current = size;
      if (!prev) { if (saved.zoom === undefined) fitRef.current(); return; }
      setPan((p) => ({ x: p.x + (size.w - prev.w) / 2, y: p.y + (size.h - prev.h) / 2 }));
    });
    ro.observe(v);
    return () => ro.disconnect();
  }, []);

  // ---- Pan and zoom ----
  const zoomAt = useCallback((next: number, cx: number, cy: number) => {
    const { zoom: z, pan: p } = state.current;
    const nz = Math.max(1, Math.min(200, next));
    const k = nz / z;
    setPan({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k });
    setZoom(nz);
  }, []);
  // Wheel: ⌘ or Ctrl (and trackpad pinch) zooms at the pointer; otherwise pans.
  const onWheel = useCallback((e: WheelEvent, offset = { x: 0, y: 0 }) => {
    const v = viewport.current;
    if (!v) return;
    e.preventDefault();
    const rect = v.getBoundingClientRect();
    const cx = e.clientX + offset.x - rect.left;
    const cy = e.clientY + offset.y - rect.top;
    // A mouse wheel's notch is ~100 (pinch sends small steps): at most ×1.25 per event.
    if (e.ctrlKey || e.metaKey) zoomAt(state.current.zoom * Math.min(1.25, Math.max(0.8, Math.exp(-e.deltaY * 0.01))), cx, cy);
    else setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
  }, [zoomAt]);
  useEffect(() => {
    const v = viewport.current;
    if (!v) return;
    const h = (e: WheelEvent) => onWheel(e);
    v.addEventListener('wheel', h, { passive: false });
    return () => v.removeEventListener('wheel', h);
  }, [onWheel]);
  // Space + drag pans, over the frames too (they stop taking the pointer while space is held).
  const spaceDown = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceDown.current && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { spaceDown.current = true; setPanning(true); e.preventDefault(); }
      if (e.altKey && e.code === 'KeyT') { e.preventDefault(); setInspect((i) => !i); }
      if (e.code === 'Escape') setInspect(false);
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') { spaceDown.current = false; setPanning(false); } };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !spaceDown.current) return;
    drag.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPanning(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = drag.current;
    setPan((p) => ({ x: p.x + e.clientX - d.x, y: p.y + e.clientY - d.y }));
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => { drag.current = null; if (!spaceDown.current) setPanning(false); };

  // ---- Frames ----
  const src = `${page}${mode === 'full' ? '?static' : ''}`;
  const onFrameLoad = (id: FrameId) => {
    const el = iframes.current[id];
    const win = el?.contentWindow;
    const doc = el?.contentDocument;
    if (!el || !win || !doc || !doc.body) return;
    const f = FRAMES.find((x) => x.id === id)!;
    const marks = new Marks(doc, win);
    const presence = new PresenceLayer(doc);
    frames.current[id] = { win, doc, marks, presence };
    presence.update(recent(agentsRef.current), agentsRef.current);
    injectEdits(doc, edits.css());
    if (id === 'desktop') setVariables(readVariables(doc, win));

    if (state.current.mode === 'full') {
      // The page's own height (body), not the document's scroll height: that
      // is never less than the frame, so one moment of growth (a style
      // arriving unfrozen) would ratchet the frame up for good.
      const measure = () => setHeights((h) => ({ ...h, [id]: Math.max(f.screen, Math.ceil(doc.body.getBoundingClientRect().height)) }));
      keepViewportUnitsFrozen(doc, f.screen, measure);
      new (win as unknown as typeof globalThis).ResizeObserver(measure).observe(doc.body);
    }

    // Wheel over a frame: Full page frames don't scroll, so the canvas pans;
    // in Live they scroll, and ⌘/Ctrl or pinch still zooms the canvas.
    doc.addEventListener('wheel', (e) => {
      if (state.current.mode === 'full' || e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        const k = state.current.zoom / 100;
        // The frame's event is in its own (unscaled) pixels: where that is on the canvas.
        onWheel(e, { x: r.left + e.clientX * k - e.clientX, y: r.top + e.clientY * k - e.clientY });
      }
    }, { passive: false });
    // Keys inside a frame reach the canvas's shortcuts.
    doc.addEventListener('keydown', (e) => window.dispatchEvent(new KeyboardEvent('keydown', e)));
    doc.addEventListener('keyup', (e) => window.dispatchEvent(new KeyboardEvent('keyup', e)));

    // Picking.
    doc.addEventListener('pointermove', (e) => { if (state.current.inspect) marks.showHover(resolve(e.target)); }, true);
    doc.addEventListener('pointerleave', () => marks.showHover(null));
    doc.addEventListener('click', (e) => {
      if (!state.current.inspect) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const target = resolve(e.target);
      if (!target) return;
      select(id, target);
    }, true);
    const refresh = () => { marks.refresh(); presence.place(); redrawCursors(); };
    win.addEventListener('scroll', refresh, { passive: true });
    win.addEventListener('resize', refresh);

    // Sync scroll (Live): the other frames follow, at the same share of their page.
    win.addEventListener('scroll', () => {
      const s = state.current;
      if (s.mode !== 'live' || !s.sync || s.syncing) return;
      const share = win.scrollY / Math.max(1, doc.documentElement.scrollHeight - win.innerHeight);
      s.syncing = true;
      for (const [other, live] of Object.entries(frames.current)) {
        if (other === id || !live) continue;
        live.win.scrollTo(0, share * Math.max(0, live.doc.documentElement.scrollHeight - live.win.innerHeight));
      }
      requestAnimationFrame(() => { s.syncing = false; });
    }, { passive: true });
    // The selection from before the reload, once its frame is back.
    const want = pendingSelection.current;
    if (want && want.frame === id) {
      const el = doc.querySelector<HTMLElement>(want.selector);
      if (el) {
        const target = targetOf(el, state.current.onlyThis);
        setSelection({ target, frame: id, bp: want.bp, el });
        for (const live of Object.values(frames.current)) live?.marks.showSelection(target.selector);
      }
      pendingSelection.current = null;
    } else if (selectionRef.current) {
      marks.showSelection(selectionRef.current.target.selector);
    }
    bump((n) => n + 1);
  };

  // All pages: a frame is a picture of its page. Its height follows the
  // page (viewport units frozen, as Full page), and the wheel pans the canvas.
  const onAllLoad = (key: string, el: HTMLIFrameElement | null, screen: number) => {
    const win = el?.contentWindow;
    const doc = el?.contentDocument;
    if (!el || !win || !doc || !doc.body) return;
    injectEdits(doc, edits.css());
    const measure = () => setAllHeights((h) => {
      const v = Math.max(screen, Math.ceil(doc.body.getBoundingClientRect().height));
      return h[key] === v ? h : { ...h, [key]: v };
    });
    keepViewportUnitsFrozen(doc, screen, measure);
    new (win as unknown as typeof globalThis).ResizeObserver(measure).observe(doc.body);
    doc.addEventListener('wheel', (e) => {
      const r = el.getBoundingClientRect();
      const k = state.current.zoom / 100;
      onWheel(e, { x: r.left + e.clientX * k - e.clientX, y: r.top + e.clientY * k - e.clientY });
    }, { passive: false });
    doc.addEventListener('keydown', (e) => window.dispatchEvent(new KeyboardEvent('keydown', e)));
    doc.addEventListener('keyup', (e) => window.dispatchEvent(new KeyboardEvent('keyup', e)));
    // A click opens that page on its own (Full page), not the link.
    doc.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); }, true);
    // Shown once fonts and the first layout are in (a timer, not an
    // animation frame: those don't run in a background tab).
    void doc.fonts.ready.then(() => win.setTimeout(() => {
      setReadyKeys((r) => (r.has(key) ? r : new Set(r).add(key)));
    }, 80));
  };

  // A selection: the element's target (its classes, or this element only),
  // shown in every frame; the panel edits the breakpoint of the frame it was picked in.
  const select = (id: FrameId, el: HTMLElement) => {
    const f = FRAMES.find((x) => x.id === id)!;
    const target = targetOf(el, state.current.onlyThis);
    setSelection({ target, frame: id, bp: bpOf(f.width), el });
    setActive(id);
    for (const live of Object.values(frames.current)) live?.marks.showSelection(target.selector);
    setInspect(false);
    setPanelOpen(true);
  };
  // Re-target when "only this one" changes.
  useEffect(() => {
    if (!selection) return;
    const target = targetOf(selection.el, onlyThis);
    setSelection({ ...selection, target });
    for (const live of Object.values(frames.current)) live?.marks.showSelection(target.selector);
  }, [onlyThis]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edits go into every frame as one stylesheet; boxes follow the changed layout.
  useEffect(() => {
    const off = edits.subscribe(() => {
      for (const live of Object.values(frames.current)) {
        if (!live) continue;
        injectEdits(live.doc, edits.css());
        requestAnimationFrame(() => live.marks.refresh());
      }
    });
    return () => { off(); };
  }, [edits]);

  // Cursors follow the agents in every frame.
  useEffect(() => {
    for (const live of Object.values(frames.current)) live?.presence.update(recent(agents), agents, followed);
  });

  // Hover box off when inspect is off.
  useEffect(() => {
    if (!inspect) for (const live of Object.values(frames.current)) live?.marks.showHover(null);
  }, [inspect]);

  // Values for the panel: read in the frame that shows the editing breakpoint
  // (Mobile landscape has no frame: Tablet's then).
  const valuesAt = useCallback((bp: Bp) => {
    if (!selection) return {};
    const frameId: FrameId = bp === 'base' ? 'desktop' : bp === 'mobile' ? 'mobile' : 'tablet';
    const live = frames.current[frameId];
    const el = live?.doc.querySelector(selection.target.selector) ?? null;
    return el && live ? readValues(live.win, el) : selection.el.ownerDocument.defaultView ? readValues(selection.el.ownerDocument.defaultView, selection.el) : {};
  }, [selection]);
  const bodyPx = useCallback((bp: Bp) => {
    const frameId: FrameId = bp === 'base' ? 'desktop' : bp === 'mobile' ? 'mobile' : 'tablet';
    const live = frames.current[frameId];
    return live ? parseFloat(live.win.getComputedStyle(live.doc.body).fontSize) || 16 : 16;
  }, []);

  const frameOfBp = (bp: Bp): FrameId => (bp === 'base' ? 'desktop' : bp === 'mobile' ? 'mobile' : 'tablet');
  const focusFrame = (id: FrameId) => {
    const f = layout.find((x) => x.id === id)!;
    const v = viewport.current;
    setActive(id);
    if (selection) setSelection({ ...selection, bp: bpOf(f.width) });
    if (v) setPan((p) => ({ x: v.clientWidth / 2 - (f.x + f.width / 2) * (zoom / 100), y: p.y }));
  };

  // Frames scrolled off the canvas stop moving (GSAP, Lenis, videos,
  // animations) and start again when they come back.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const v = viewport.current?.getBoundingClientRect();
      if (!v) return;
      const next: Partial<Record<FrameId, boolean>> = {};
      for (const f of FRAMES) {
        const r = iframes.current[f.id]?.getBoundingClientRect();
        const live = frames.current[f.id];
        if (!r || !live) continue;
        const off = r.right < v.left || r.left > v.right || r.bottom < v.top || r.top > v.bottom;
        next[f.id] = off;
        void setFramePaused(live.win, live.doc, off);
      }
      setPaused((p) => (FRAMES.some((f) => p[f.id] !== next[f.id]) ? next : p));
    });
    return () => cancelAnimationFrame(id);
  });

  selectionRef.current = selection;
  // Remember everything after each change (debounced in store.ts).
  const editCount = edits.all().length + edits.css().length;
  useEffect(() => {
    save({
      page, mode, sync, allPages, panelOpen, onlyThis, zoom, pan, active,
      edits: edits.all(),
      selection: selection ? { selector: selection.target.selector, frame: selection.frame, bp: selection.bp } : pendingSelection.current,
    });
  }, [page, mode, sync, allPages, panelOpen, onlyThis, zoom, pan, active, selection, editCount, edits]);

  // Reset view: the canvas's defaults, keeping the page and the edits
  // (those have Reset all in the panel). Switching to Live fits on its own.
  const resetView = () => {
    setInspect(false);
    setSync(true);
    setPanelOpen(false);
    setOnlyThis(false);
    setActive('desktop');
    setSelection(null);
    pendingSelection.current = null;
    for (const live of Object.values(frames.current)) live?.marks.showSelection(null);
    setMode('live');
    setAllPages(false);
    // Fit once the panel has closed and the canvas has its new size.
    setTimeout(() => fitRef.current(), 80);
  };

  // Go to an agent, as clicking a teammate's avatar in Figma does: in the
  // active frame (or the first that shows their element), scroll the frame
  // so the element is in view (Live), then glide the canvas to centre it.
  const [gliding, setGliding] = useState(false);
  // The agent you last went to: its cursor is drawn above the others.
  const [followed, setFollowed] = useState<string | null>(null);
  const goToAgent = async (a: Agent) => {
    setFollowed(a.id);
    const order = frameOrder(a, active);
    const v = viewport.current;
    if (!v) return;
    for (const id of order) {
      const live = frames.current[id];
      const el = live?.presence.elementOf(a);
      if (!live || !el) continue;
      if (mode === 'live') {
        const r0 = el.getBoundingClientRect();
        await scrollFrameTo(live.win, Math.max(0, live.win.scrollY + r0.top - live.win.innerHeight / 3));
      }
      // After the frame's scroll has landed (a timer, not an animation frame:
      // those don't run in a background tab).
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        const f = layout.find((x) => x.id === id)!;
        // Close enough to read their work (the person: "a bit more").
        const z = Math.max(zoom, 75) / 100;
        const wx = f.x + r.left + Math.min(r.width, 600) / 2;
        const wy = LABEL + r.top + Math.min(r.height, 400) / 2;
        setGliding(true);
        setZoom(z * 100);
        setPan({ x: v.clientWidth / 2 - wx * z, y: v.clientHeight / 2 - wy * z });
        setTimeout(() => setGliding(false), 500);
      }, 60);
      return;
    }
  };

  // One cursor per agent for the whole canvas: on its element in the active
  // breakpoint's frame, or the first frame that has it. Screen position from
  // the canvas pan and zoom (not a DOM read, so it holds while the canvas
  // glides) plus the element's place in its frame.
  const cursorPoints: CursorPoint[] = [];
  for (const a of recent(agents)) {
    const order = frameOrder(a, active);
    for (const id of order) {
      const el = frames.current[id]?.presence.elementOf(a);
      const f = layout.find((x) => x.id === id);
      if (!el || !f) continue;
      const r = el.getBoundingClientRect();
      const z = zoom / 100;
      cursorPoints.push({
        agent: a,
        x: pan.x + (f.x + r.left + Math.min(24, r.width / 4)) * z,
        y: pan.y + (LABEL + r.top + Math.min(18, r.height / 3)) * z,
        target: `${id}|${(a.selectors ?? []).join(',')}`,
      });
      break;
    }
  }

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`;
  // All pages: which frames are on screen (from the pan and zoom, no DOM
  // reads), and which run live once the canvas has settled.
  const vSize = { w: viewport.current?.clientWidth ?? 1600, h: viewport.current?.clientHeight ?? 900 };
  const zk = zoom / 100;
  const onScreen = (x: number, w: number, h: number, margin = 0) => {
    const left = pan.x + x * zk, top = pan.y;
    return left + w * zk > -margin && left < vSize.w + margin && top + h * zk > -margin && top < vSize.h + margin;
  };
  const [settled, setSettled] = useState(true);
  useEffect(() => {
    setSettled(false);
    const t = setTimeout(() => setSettled(true), 250);
    return () => clearTimeout(t);
  }, [pan.x, pan.y, zoom]);
  // The live set changes only once the canvas has stopped moving, and a
  // live frame stays live while you pan and zoom (it was reloading on every
  // wheel step: a white flash and the page starting over). A frame already
  // live keeps running down to three quarters of LIVE_ZOOM, so zooming
  // around the threshold doesn't toggle it.
  const [liveKeys, setLiveKeys] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!showAll) { setLiveKeys((k) => (k.size ? new Set() : k)); return; }
    if (!settled) return;
    const cx = vSize.w / 2;
    const next = new Set(allFrames
      .filter((f) => onScreen(f.x, f.width, f.h) && (zoom >= (liveKeys.has(f.key) ? LIVE_ZOOM * 0.75 : LIVE_ZOOM) || !shots[f.key]))
      .sort((a, b) => Math.abs(pan.x + (a.x + a.width / 2) * zk - cx) - Math.abs(pan.x + (b.x + b.width / 2) * zk - cx))
      .slice(0, MAX_LIVE)
      .map((f) => f.key));
    setLiveKeys((prev) => (prev.size === next.size && [...next].every((k) => prev.has(k)) ? prev : next));
  }, [showAll, settled, allFrames, shots]); // eslint-disable-line react-hooks/exhaustive-deps
  // A live frame shows only once its page has loaded and laid out; until
  // then its picture stays (no white frame).
  const [readyKeys, setReadyKeys] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setReadyKeys((r) => { const n = new Set([...r].filter((k) => liveKeys.has(k))); return n.size === r.size ? r : n; });
  }, [liveKeys]);
  const framePointer = panning ? 'none' : 'auto';

  return (
    <div className="cv-shell" data-panel={panelOpen ? 'open' : 'closed'}>
      <Toolbar
        lenses={<Text className="cv-title cv-narrow-hide">Prototype</Text>}
        right={
          <div className="cv-group">
            <PresenceAvatars agents={agents} onGo={goToAgent} />
            <WithTooltip text="Inspect: pick an element in any frame" keys={['⌥', 'T']}>
              <Button size="sm" variant={inspect ? 'primary' : 'secondary'} icon="square-dashed-mouse-pointer" disabled={showAll} onClick={() => setInspect((i) => !i)}>
                {inspect ? 'Picking…' : 'Inspect'}
              </Button>
            </WithTooltip>
            <IconButton icon="panel-right" label={panelOpen ? 'Hide the Inspect panel' : 'Show the Inspect panel'} pressed={panelOpen} onClick={() => setPanelOpen((o) => !o)} />
          </div>
        }
      >
        <div className="cv-group">
          <Select label="Page" variant="chip" icon="file" value={page} options={PAGES} onValueChange={(v) => { setPage(v); setSelection(null); }} />
          <IconButton icon="rotate-ccw" label="Reload the frames" onClick={() => { for (const f of FRAMES) iframes.current[f.id]?.contentWindow?.location.reload(); }} />
          <span className="cv-sep" aria-hidden="true" />
          <Segmented<Mode>
            label="View"
            value={mode}
            onValueChange={(m) => setMode(m)}
            options={[
              { value: 'live', label: 'Live' },
              { value: 'full', label: 'Full page' },
            ]}
          />
          {mode === 'full' && (
            <label className="cv-switch">
              <Switch label="All pages" checked={allPages} onCheckedChange={setAllPages} />
              <Text className="cv-narrow-hide">All pages</Text>
            </label>
          )}
          {showAll && (
            <WithTooltip text="Take new pictures of every page (about 40 s). Close up, frames run live anyway.">
              <Button size="sm" variant="ghost" icon="image" disabled={shotsBusy} onClick={updateShots}>{shotsBusy ? 'Updating…' : 'Update pictures'}</Button>
            </WithTooltip>
          )}
          {mode === 'live' && (
            <label className="cv-switch">
              <Switch label="Sync scroll" checked={sync} onCheckedChange={setSync} />
              <Text className="cv-narrow-hide">Sync scroll</Text>
            </label>
          )}
          <span className="cv-sep" aria-hidden="true" />
          {/* Fit left of the breakpoints (the person, 2026-11-20): it frames all three; its own icon, not Inspect's. */}
          <WithTooltip text="Fit all breakpoints in view">
            <IconButton icon="maximize" label="Fit to canvas" onClick={fit} />
          </WithTooltip>
          <Breakpoints
            breakpoints={FRAMES.map((f) => ({ width: f.width, name: f.name, icon: f.icon }))}
            width={FRAMES.find((f) => f.id === active)!.width}
            describeWidth={cascade}
            onWidthChange={(w) => {
              // A typed width goes to the frame nearest it.
              const near = [...FRAMES].sort((a, b) => Math.abs(a.width - w) - Math.abs(b.width - w))[0]!;
              focusFrame(near.id);
            }}
          />
          <span className="cv-sep" aria-hidden="true" />
          <ZoomControl zoom={Math.round(zoom)} onZoomChange={(z) => { const v = viewport.current; if (v) zoomAt(z, v.clientWidth / 2, v.clientHeight / 2); }} />
          <WithTooltip text="Reset view: Live, sync scroll on, fitted, panel closed, Desktop, nothing selected. Keeps the page and your edits.">
            <span className="cv-swap">
              <Button size="sm" variant="ghost" icon="undo-2" className="cv-narrow-hide" onClick={resetView}>Reset view</Button>
              <IconButton icon="undo-2" label="Reset view" className="cv-narrow-show" onClick={resetView} />
            </span>
          </WithTooltip>
        </div>
      </Toolbar>

      <div className="cv-main">
        <div
          ref={viewport}
          className="cv-viewport"
          data-panning={panning ? '' : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="cv-world" data-small={showAll && zoom < 12 ? '' : undefined} data-gliding={gliding ? '' : undefined} style={{ transform, width: worldW, height: worldH, ['--cv-z' as string]: zoom / 100 }}>
            {showAll && allLayout.map((pg) => {
              const pgW = pg.frames.reduce((w, f) => w + f.width + GAP, -GAP);
              if (!onScreen(pg.x, pgW, Math.max(...pg.frames.map((f) => f.h)), 400)) return null;
              return (
                <div key={pg.value} className="cv-page" style={{ left: pg.x }}>
                  {/* The name keeps to its page's width on screen, so names never overlap. */}
                  <button type="button" className="cv-page-label" title={`Open ${pg.label}`} style={{ maxWidth: `calc(${pgW}px * var(--cv-z, 1))` }} onClick={() => { setPage(pg.value); setAllPages(false); }}>
                    <Icon name="file" size={14} />
                    <Text>{pg.label}</Text>
                    <Text className="cv-dim">Open</Text>
                  </button>
                  {pg.frames.map((f) => {
                    if (!onScreen(f.x, f.width, f.h, 400)) return null;
                    const shot = shots[f.key];
                    const live = liveKeys.has(f.key);
                    return (
                      <div key={f.key} className="cv-frame" style={{ left: f.x - pg.x, width: f.width, height: f.h }}>
                        <div className="cv-label">
                          <Icon name={f.icon} size={14} />
                          <Text>{f.name}</Text>
                          <Text className="cv-dim">{f.width}</Text>
                          {live && <Tag tone="accent">{readyKeys.has(f.key) ? 'Live' : 'Loading'}</Tag>}
                        </div>
                        {shot && <img className="cv-shot" src={`${shot.src}?t=${shot.at}`} alt="" width={f.width} height={f.h} decoding="async" draggable={false} />}
                        {live && (
                          <iframe
                            className="cv-live"
                            title={`${pg.label}, ${f.name}, ${f.width} px`}
                            src={`${pg.value}?static`}
                            width={f.width}
                            height={f.h}
                            data-ready={readyKeys.has(f.key) || !shot ? '' : undefined}
                            style={{ pointerEvents: framePointer }}
                            onLoad={(e) => onAllLoad(f.key, e.currentTarget, f.screen)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {!showAll && layout.map((f) => {
              const bp = bpInfo(bpOf(f.width));
              return (
                <div key={f.id} className="cv-frame" data-active={selection && active === f.id ? '' : undefined} style={{ left: f.x, width: f.width, height: f.h }}>
                  <div className="cv-label">
                    <Icon name={f.icon} size={14} />
                    <Text>{f.name}</Text>
                    <Text className="cv-dim">{f.width}</Text>
                    {/* The ring and "Editing" only while an element is selected (the person, 2026-11-20). */}
                    <Tag tone={selection && active === f.id ? 'accent' : 'neutral'}>{bp.scope}</Tag>
                    {selection && active === f.id && <Tag tone="accent">Editing</Tag>}
                    {paused[f.id] && <Tag>Paused</Tag>}
                  </div>
                  <iframe
                    ref={(n) => { iframes.current[f.id] = n; }}
                    key={`${f.id}-${src}`}
                    title={`${f.name}, ${f.width} px`}
                    src={src}
                    width={f.width}
                    height={f.h}
                    style={{ pointerEvents: framePointer }}
                    // The page's own full-screen controls (the video player) work in a frame.
                    allow="fullscreen"
                    allowFullScreen
                    onLoad={() => onFrameLoad(f.id)}
                  />
                </div>
              );
            })}
          </div>
          <Cursors points={cursorPoints} all={agents} top={followed} gliding={gliding} />
          <PresenceList agents={agents} onGo={goToAgent} />
          {inspect && <div className="cv-hint"><Icon name="scan" size={14} /><Text>Click any element in a frame · Esc to stop</Text></div>}
        </div>

        {panelOpen && (
          <Panel className="cv-panel">
            <PanelHead>
              <Text className="cv-strong">Inspect</Text>
              <IconButton icon="close" size="sm" label="Hide the Inspect panel" onClick={() => setPanelOpen(false)} />
            </PanelHead>
            <PanelBody className="cv-panel-body">
              <Inspector
                selection={selection}
                edits={edits}
                valuesAt={valuesAt}
                bodyPx={bodyPx}
                variables={variables}
                onlyThis={onlyThis}
                onOnlyThis={setOnlyThis}
                page={page}
                onPick={() => setInspect(true)}
                onBp={(bp) => { if (selection) setSelection({ ...selection, bp }); setActive(frameOfBp(bp)); }}
                onParent={() => {
                  const p = selection?.el.parentElement;
                  if (selection && p && p.tagName !== 'BODY') select(selection.frame, p);
                }}
              />
            </PanelBody>
          </Panel>
        )}
      </div>
    </div>
  );
}
