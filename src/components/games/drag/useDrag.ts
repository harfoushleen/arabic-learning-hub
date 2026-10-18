import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { prefersReducedMotion } from '@/lib/utils';

export type DropResult = 'correct' | 'wrong';

export interface DragState<Id> {
  id: Id;
  /** Where the original tile sits; the floating copy starts here. */
  rect: DOMRect;
  dx: number;
  dy: number;
  /** Over the drop target right now. */
  over: boolean;
  /** Gliding back to `rect` after a wrong drop, a miss, or a cancel. */
  returning: boolean;
}

interface DragOptions<Id> {
  /** Rectangle of the current drop target (e.g. the active blank), or null if there is none. */
  getTarget: () => DOMRect | null;
  /** Called when a tile is released over the target. */
  onDrop: (id: Id) => DropResult;
  /** A press that moved less than TAP_SLOP — tiles are never placed by tapping. */
  onTap?: (id: Id) => void;
  /** Called once the tile is back in place after a wrong drop or a miss. */
  onReturned?: (id: Id, reason: 'wrong' | 'miss') => void;
  canDrag?: () => boolean;
  margin?: number;
}

const TAP_SLOP = 8;
export const RETURN_MS = 200;

interface Active<Id> {
  id: Id;
  pointerId: number;
  startX: number;
  startY: number;
  rect: DOMRect;
  moved: boolean;
  over: boolean;
}

/**
 * Pointer-events drag (touch and mouse alike; no HTML5 drag-and-drop). Spread `bind(id)` on each
 * tile and render the floating copy from `drag` (see DraggableTile).
 */
export function useDrag<Id extends string>(options: DragOptions<Id>) {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });

  const [drag, setDrag] = useState<DragState<Id> | null>(null);
  const [over, setOver] = useState(false);
  const active = useRef<Active<Id> | null>(null);
  const returnTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(returnTimer.current), []);

  const finish = useCallback((id: Id, reason: 'wrong' | 'miss') => {
    active.current = null;
    setOver(false);
    if (prefersReducedMotion()) {
      setDrag(null);
      opts.current.onReturned?.(id, reason);
      return;
    }
    setDrag((d) => (d ? { ...d, dx: 0, dy: 0, over: false, returning: true } : d));
    returnTimer.current = window.setTimeout(() => {
      setDrag(null);
      opts.current.onReturned?.(id, reason);
    }, RETURN_MS);
  }, []);

  const bind = (id: Id) => ({
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (active.current || drag || (opts.current.canDrag && !opts.current.canDrag())) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = e.currentTarget.getBoundingClientRect();
      active.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, rect, moved: false, over: false };
      setDrag({ id, rect, dx: 0, dy: 0, over: false, returning: false });
    },
    onPointerMove(e: ReactPointerEvent<HTMLElement>) {
      const a = active.current;
      if (!a || a.pointerId !== e.pointerId) return;
      const dx = e.clientX - a.startX;
      const dy = e.clientY - a.startY;
      if (Math.hypot(dx, dy) > TAP_SLOP) a.moved = true;
      const t = opts.current.getTarget();
      const m = opts.current.margin ?? 24;
      a.over =
        a.moved &&
        !!t &&
        e.clientX >= t.left - m &&
        e.clientX <= t.right + m &&
        e.clientY >= t.top - m &&
        e.clientY <= t.bottom + m;
      setOver(a.over);
      setDrag({ id, rect: a.rect, dx, dy, over: a.over, returning: false });
    },
    onPointerUp(e: ReactPointerEvent<HTMLElement>) {
      const a = active.current;
      if (!a || a.pointerId !== e.pointerId) return;
      if (!a.moved) {
        active.current = null;
        setOver(false);
        setDrag(null);
        opts.current.onTap?.(id);
        return;
      }
      if (a.over) {
        const result = opts.current.onDrop(id);
        if (result === 'correct') {
          active.current = null;
          setOver(false);
          setDrag(null);
          return;
        }
        finish(id, 'wrong');
        return;
      }
      finish(id, 'miss');
    },
    onPointerCancel(e: ReactPointerEvent<HTMLElement>) {
      const a = active.current;
      if (!a || a.pointerId !== e.pointerId) return;
      finish(id, 'miss');
    },
  });

  return { drag, over, bind };
}
