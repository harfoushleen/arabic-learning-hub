import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { prefersReducedMotion } from '@/lib/utils';

export type DropResult = 'correct' | 'wrong';

export interface DropTarget<T> {
  id: T;
  rect: DOMRect;
}

export interface DragState<Id, T = string> {
  id: Id;
  /** Where the dragged element sits; a floating copy starts here. */
  rect: DOMRect;
  /** Pointer position when the drag started (client coordinates). */
  startX: number;
  startY: number;
  /** Pointer offset from the start. Kept while returning, so a line can retract from where it was. */
  dx: number;
  dy: number;
  /** Target under the pointer right now. */
  overId: T | null;
  over: boolean;
  /** Going back after a wrong drop, a miss, or a cancel. */
  returning: boolean;
}

interface DragOptions<Id, T> {
  /** Current drop targets for the dragged element (e.g. the active blank, or the other column's cards). */
  getTargets: (id: Id) => DropTarget<T>[];
  /** Called when the pointer is released over a target. */
  onDrop: (id: Id, target: T) => DropResult;
  /** A press that moved less than TAP_SLOP — nothing is ever placed by tapping. */
  onTap?: (id: Id) => void;
  /** Called once the drag is over after a wrong drop (with its target) or a miss (null). */
  onReturned?: (id: Id, reason: 'wrong' | 'miss', target: T | null) => void;
  canDrag?: (id: Id) => boolean;
  /** Extra hit-test margin around each target, px. */
  margin?: number;
}

const TAP_SLOP = 8;
export const RETURN_MS = 200;

interface Active<Id, T> {
  id: Id;
  pointerId: number;
  startX: number;
  startY: number;
  rect: DOMRect;
  moved: boolean;
  overId: T | null;
}

function hitTest<T>(targets: DropTarget<T>[], x: number, y: number, m: number): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const { id, rect: r } of targets) {
    if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
    const d = Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2);
    if (d < bestDist) {
      best = id;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Pointer-events drag (touch and mouse alike; no HTML5 drag-and-drop). Spread `bind(id)` on each
 * draggable element and render feedback from `drag` (e.g. DraggableTile's floating copy, or a line).
 */
export function useDrag<Id extends string, T extends string = string>(options: DragOptions<Id, T>) {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });

  const [drag, setDrag] = useState<DragState<Id, T> | null>(null);
  const active = useRef<Active<Id, T> | null>(null);
  const returnTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(returnTimer.current), []);

  const finish = useCallback((id: Id, reason: 'wrong' | 'miss', target: T | null) => {
    active.current = null;
    if (prefersReducedMotion()) {
      setDrag(null);
      opts.current.onReturned?.(id, reason, target);
      return;
    }
    setDrag((d) => (d ? { ...d, overId: null, over: false, returning: true } : d));
    returnTimer.current = window.setTimeout(() => {
      setDrag(null);
      opts.current.onReturned?.(id, reason, target);
    }, RETURN_MS);
  }, []);

  const bind = (id: Id) => ({
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (active.current || drag || (opts.current.canDrag && !opts.current.canDrag(id))) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic events (tests) have no active pointer to capture.
      }
      const rect = e.currentTarget.getBoundingClientRect();
      active.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, rect, moved: false, overId: null };
      setDrag({ id, rect, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, overId: null, over: false, returning: false });
    },
    onPointerMove(e: ReactPointerEvent<HTMLElement>) {
      const a = active.current;
      if (!a || a.pointerId !== e.pointerId) return;
      const dx = e.clientX - a.startX;
      const dy = e.clientY - a.startY;
      if (Math.hypot(dx, dy) > TAP_SLOP) a.moved = true;
      a.overId = a.moved ? hitTest(opts.current.getTargets(a.id), e.clientX, e.clientY, opts.current.margin ?? 24) : null;
      setDrag({
        id,
        rect: a.rect,
        startX: a.startX,
        startY: a.startY,
        dx,
        dy,
        overId: a.overId,
        over: a.overId !== null,
        returning: false,
      });
    },
    onPointerUp(e: ReactPointerEvent<HTMLElement>) {
      const a = active.current;
      if (!a || a.pointerId !== e.pointerId) return;
      if (!a.moved) {
        active.current = null;
        setDrag(null);
        opts.current.onTap?.(id);
        return;
      }
      if (a.overId !== null) {
        const target = a.overId;
        if (opts.current.onDrop(id, target) === 'correct') {
          active.current = null;
          setDrag(null);
          return;
        }
        finish(id, 'wrong', target);
        return;
      }
      finish(id, 'miss', null);
    },
    onPointerCancel(e: ReactPointerEvent<HTMLElement>) {
      const a = active.current;
      if (!a || a.pointerId !== e.pointerId) return;
      finish(id, 'miss', null);
    },
  });

  return { drag, over: drag?.over ?? false, overId: drag?.overId ?? null, bind };
}
