import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { RETURN_MS, type DragState, type useDrag } from './useDrag';

interface DraggableTileProps<Id extends string> {
  id: Id;
  drag: DragState<Id, string> | null;
  bind: ReturnType<typeof useDrag<Id, string>>['bind'];
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Extra attributes for tests and styling hooks (data-*). */
  data?: Record<`data-${string}`, string | boolean | undefined>;
}

/**
 * A tile you drag with a finger or the mouse. The original fades while a floating copy follows the
 * pointer (transform only, so nothing reflows); the copy lives on <body> so no parent transform moves it.
 */
export function DraggableTile<Id extends string>({ id, drag, bind, className, style, children, data }: DraggableTileProps<Id>) {
  const mine = drag?.id === id ? drag : null;
  return (
    <>
      <div
        role="button"
        tabIndex={-1}
        {...data}
        {...bind(id)}
        style={style}
        className={cn(
          'game-piece touch-none select-none [-webkit-touch-callout:none]',
          className,
          mine && 'opacity-30',
        )}
      >
        {children}
      </div>
      {mine &&
        createPortal(
          <div
            aria-hidden
            className={cn('pointer-events-none fixed z-[100] select-none', className, 'shadow-2xl')}
            style={{
              ...style,
              left: mine.rect.left,
              top: mine.rect.top,
              width: mine.rect.width,
              height: mine.rect.height,
              // Shrinks over the target so the highlighted drop zone stays visible around it.
              transform: mine.returning
                ? 'translate(0, 0) scale(1)'
                : `translate(${mine.dx}px, ${mine.dy}px) scale(${mine.over ? 0.6 : 1.1})`,
              transition: mine.returning ? `transform ${RETURN_MS}ms ease-out` : 'none',
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
