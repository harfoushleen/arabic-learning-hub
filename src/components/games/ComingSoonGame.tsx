import { BigButton } from './BigButton';
import { GameStage } from './GameStage';
import type { GameProps } from './types';

/** Placeholder for games that aren't built yet. */
export default function ComingSoonGame({ onExit }: GameProps) {
  return (
    <GameStage onClose={onExit}>
      <div className="flex h-full flex-col items-center justify-center gap-8">
        <p className="text-vowelled text-[clamp(28px,calc(var(--app-h,100dvh)*0.07),56px)]">
          قَرِيبًا 🚧
        </p>
        {onExit && (
          <BigButton onClick={onExit} variant="secondary">
            عَوْدَة
          </BigButton>
        )}
      </div>
    </GameStage>
  );
}
