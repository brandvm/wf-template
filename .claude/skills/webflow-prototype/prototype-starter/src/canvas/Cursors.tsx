// PROTOTYPE-ONLY: the agents' cursors, drawn once per agent on the canvas
// (above the frames, in screen space), as Figma draws a teammate's: the
// filled arrow in their colour with a white edge, and the name tag below
// and right of the tip with their status on a second line. Always the same
// size on screen; gliding when the agent moves to another element, following
// the canvas instantly when you pan or zoom. The cursor is a drawing (the
// arrow), not a control: the one SVG here.
import { useEffect, useRef, useState } from 'react';
import { colorOf, labelOf, type Agent } from './presence';

// Figma's multiplayer arrow; its tip is (0.5, 1.2).
const ARROW = 'M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z';

export interface CursorPoint { agent: Agent; x: number; y: number; target: string }

export function Cursors({ points, all, top, gliding: canvasGliding = false }: { points: readonly CursorPoint[]; all: readonly Agent[]; top: string | null; gliding?: boolean }) {
  // Glide only when an agent's target element changes, never on pan or zoom.
  const last = useRef(new Map<string, string>());
  const [gliding, setGliding] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const moved = points.filter((p) => last.current.has(p.agent.id) && last.current.get(p.agent.id) !== p.target).map((p) => p.agent.id);
    points.forEach((p) => last.current.set(p.agent.id, p.target));
    if (!moved.length) return;
    setGliding(new Set(moved));
    const t = setTimeout(() => setGliding(new Set()), 460);
    return () => clearTimeout(t);
  }, [points.map((p) => `${p.agent.id}:${p.target}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cv-cursors" aria-hidden="true">
      {points.map(({ agent: a, x, y }) => {
        const color = colorOf(a.id);
        return (
          <div
            key={a.id}
            className="cv-cursor"
            // Glides with the canvas too, when it glides to an agent.
            data-gliding={gliding.has(a.id) || canvasGliding ? '' : undefined}
            data-idle={a.state === 'idle' ? '' : undefined}
            style={{ transform: `translate(${x}px, ${y}px)`, zIndex: a.id === top ? 2 : 1 }}
          >
            <svg width="24" height="36" viewBox="0 0 24 36" className="cv-cursor-arrow">
              {/* Rounded tip and corners (the person, 2026-11-20: "a little more
                  rounded"): the arrow drawn with a round-joined stroke in its own
                  colour over a wider round-joined white edge. */}
              <path d={ARROW} fill="#fff" stroke="#fff" strokeWidth={4.5} strokeLinejoin="round" />
              <path d={ARROW} fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
            </svg>
            <div className="cv-cursor-tag" style={{ background: color }}>
              <div className="cv-cursor-name">{labelOf(a, all)}</div>
              <div className="cv-cursor-status">{a.status ?? a.task ?? 'Working'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
