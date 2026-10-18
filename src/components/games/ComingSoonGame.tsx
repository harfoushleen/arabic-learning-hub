import type { GameProps } from './types';

/** Placeholder for games that aren't built yet. */
export default function ComingSoonGame({ onExit }: GameProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 p-6">
      <p className="font-cairo text-[48px] font-extrabold leading-[1.6]">قَرِيبًا 🚧</p>
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="game-piece min-h-[64px] min-w-[160px] rounded-2xl bg-pastel-lilac px-8 font-cairo text-[32px] font-bold leading-[1.6] shadow-md transition-transform active:scale-95"
        >
          عَوْدَة
        </button>
      )}
    </div>
  );
}
