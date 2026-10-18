import { useEffect } from 'react';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';
import { BigButton } from './BigButton';

/** End-of-game panel shared by the games: praise, 1–3 stars, replay and back. */
export function GameFinal({
  stars,
  onRestart,
  onExit,
  confetti = 'perfect',
  extra,
}: {
  stars: 1 | 2 | 3;
  onRestart: () => void;
  onExit?: () => void;
  /** 'perfect': confetti only for 3 stars (Game 1); 'always': on every finish. */
  confetti?: 'perfect' | 'always';
  /** An extra button between replay and back (Game 3: "another letter"). */
  extra?: { label: string; onClick: () => void };
}) {
  useEffect(() => {
    if (stars === 3 || confetti === 'always') celebrate();
  }, [stars, confetti]);

  // Sized from the visible height so it always fits inside the stage.
  return (
    <div className="flex flex-col items-center gap-[clamp(12px,calc(var(--app-h,100dvh)*0.04),40px)]">
      <p className="text-vowelled text-[clamp(28px,calc(var(--app-h,100dvh)*0.07),64px)]">
        أَحْسَنْتَ! 🌟
      </p>
      <div className="flex gap-4" role="img" aria-label={`${stars} / 3`}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            aria-hidden
            className={cn(
              'font-emoji text-[clamp(40px,calc(var(--app-h,100dvh)*0.12),120px)] leading-none',
              n > stars && 'opacity-25 grayscale',
            )}
          >
            ⭐
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <BigButton onClick={onRestart} autoFocus>
          أَعِدِ اللُّعْبَةَ
        </BigButton>
        {extra && (
          <BigButton onClick={extra.onClick} variant="secondary">
            {extra.label}
          </BigButton>
        )}
        {onExit && (
          <BigButton onClick={onExit} variant="secondary">
            عَوْدَة
          </BigButton>
        )}
      </div>
    </div>
  );
}
