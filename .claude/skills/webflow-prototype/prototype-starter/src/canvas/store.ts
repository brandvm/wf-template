// PROTOTYPE-ONLY: the canvas remembers its settings in this browser
// (localStorage), so a reload brings back the page, view, zoom and position,
// the panel, the breakpoint, the edits not yet sent and the selection.
// A convenience for one person on one machine: nothing here is shared.
import type { Edit, Bp } from './edits';

const KEY = 'prototype-canvas:v1';

export interface Saved {
  page: string;
  mode: 'live' | 'full';
  allPages?: boolean;
  sync: boolean;
  panelOpen: boolean;
  onlyThis: boolean;
  zoom: number;
  pan: { x: number; y: number };
  active: 'desktop' | 'tablet' | 'mobile';
  edits: Edit[];
  selection: { selector: string; frame: 'desktop' | 'tablet' | 'mobile'; bp: Bp } | null;
}

export function load(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Saved>) : {};
  } catch {
    return {}; // private window, blocked storage: start fresh
  }
}

let timer = 0;
export function save(s: Saved) {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
  }, 250);
}
