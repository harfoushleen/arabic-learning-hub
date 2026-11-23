import { GameStage } from './GameStage';

/** What the chooser needs of a set: Game 1 (word sets) and Game 3 (letter sets) both fit it. */
export interface ChooserSet { id: string; letter: string; name: string; }

/** Big letter tiles, one per set (built from the data, so a new letter appears by itself). */
export function LetterChooser({
  sets,
  title,
  instruction,
  onPick,
  onExit,
}: {
  sets: ChooserSet[];
  title: string;
  instruction: string;
  onPick: (setId: string) => void;
  onExit?: () => void;
}) {
  return (
    <GameStage title={title} instruction={instruction} onClose={onExit}>
      <div className="flex h-full flex-wrap content-center items-center justify-center gap-[clamp(16px,4vw,48px)] p-2">
        {sets.map((s) => (
          <button
            key={s.id}
            type="button"
            data-letter-set={s.id}
            onClick={() => onPick(s.id)}
            className="game-piece flex flex-col items-center justify-center gap-2 rounded-card-lg bg-white px-6 pb-4 pt-6 shadow-card transition-transform active:translate-y-[3px] active:shadow-card-pressed focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
            style={{ width: 'clamp(150px, calc(var(--app-h, 100dvh) * 0.34), 280px)' }}
          >
            {/* A fixed-height box, so letters with a tail (ز) don't push their name lower than others. */}
            <span
              className="flex items-center justify-center font-naskh font-bold leading-none text-sky-ink"
              style={{ fontSize: 'clamp(80px, calc(var(--app-h, 100dvh) * 0.18), 160px)', height: '1.25em' }}
            >
              {s.letter}
            </span>
            <span className="text-vowelled text-[clamp(22px,calc(var(--app-h,100dvh)*0.04),32px)]">{s.name}</span>
          </button>
        ))}
      </div>
    </GameStage>
  );
}
