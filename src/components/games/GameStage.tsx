import type { ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

interface GameStageProps {
  title?: string;
  instruction?: string;
  progress?: { total: number; current: number };
  onClose?: () => void;
  /** Receives the play area element — hand it to useFitGrid to size pieces. */
  playAreaRef?: Ref<HTMLDivElement>;
  /** Last resort when even minimum sizes don't fit (e.g. phone landscape). */
  scrollable?: boolean;
  /** Suggest rotating the device (shown only while scrolling is unavoidable). */
  rotateHint?: boolean;
  /** Panels like round-complete or the final screen; they cover the stage and never add height. */
  overlay?: ReactNode;
  overlayOpaque?: boolean;
  children?: ReactNode;
}

/**
 * Full-height frame every game renders inside: header (title, progress, close) and instruction
 * take their natural height; the play area gets exactly what's left and never scrolls.
 */
export function GameStage({
  title,
  instruction,
  progress,
  onClose,
  playAreaRef,
  scrollable = false,
  rotateHint = false,
  overlay,
  overlayOpaque = false,
  children,
}: GameStageProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden overscroll-none px-4 pb-3 pt-2 3xl:px-8 3xl:pb-6 3xl:pt-4">
      <header className="flex h-16 shrink-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          {title && (
            <p className="hidden truncate text-vowelled text-[22px] text-ink/60 sm:block 3xl:text-[28px]">
              {title}
            </p>
          )}
        </div>
        <div className="flex shrink-0 justify-center">
          {progress && <ProgressDots total={progress.total} current={progress.current} />}
        </div>
        <div className="flex flex-1 justify-end">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="إِغْلَاق"
              className="game-piece flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-md transition-transform active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {instruction && (
          <h2 className="shrink-0 pb-2 text-center text-vowelled text-[28px] md:text-[32px] 3xl:text-[44px]">
            {instruction}
          </h2>
        )}
        <div
          ref={playAreaRef}
          data-play-area
          className={cn('min-h-0 flex-1', scrollable ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden')}
        >
          {children}
        </div>

        {rotateHint && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[5] flex justify-center">
            <span className="animate-fade-in rounded-full bg-white px-5 py-1 text-vowelled text-[22px] shadow-md">
              أَدِرِ الجِهَازَ 🔄
            </span>
          </div>
        )}

        {overlay && (
          <div
            className={cn(
              'absolute inset-0 z-10 flex animate-fade-in items-center justify-center overflow-hidden p-2',
              overlayOpaque ? 'bg-cream' : 'bg-cream/80',
            )}
          >
            {overlay}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <ol className="flex items-center gap-3" aria-label={`الجَوْلَةُ ${Math.min(current + 1, total)} مِنْ ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          className={cn(
            'h-4 w-4 rounded-full transition-all duration-300 3xl:h-5 3xl:w-5',
            i < current && 'bg-emerald-400',
            i === current && 'w-8 bg-amber-400 3xl:w-10',
            i > current && 'bg-slate-200',
          )}
        />
      ))}
    </ol>
  );
}
