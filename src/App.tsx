import { Suspense, useEffect, type CSSProperties } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { GameStage } from '@/components/games/GameStage';
import { gameRegistry } from '@/components/games/registry';
import { getUnit, units, type GameId, type Unit } from '@/data/units';
import { useHashRoute } from '@/lib/router';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';

/** A length that scales with the visible height (so the unit screen fits short laptop screens). */
const vh = (min: number, k: number, max: number) => `clamp(${min}px, calc(var(--app-h, 100dvh) * ${k}), ${max}px)`;

/** Card press effect: lift on hover (mouse only), push down with a smaller shadow, keyboard focus ring. */
const PRESSABLE = cn(
  'game-piece shadow-card transition-[transform,box-shadow] duration-150 ease-out',
  '[@media(hover:hover)]:hover:-translate-y-[3px] active:!translate-y-[3px] active:shadow-card-pressed',
  'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink',
);

export default function App() {
  const { route, go, leave } = useHashRoute();
  const unit = route.unitId ? getUnit(route.unitId) : undefined;
  const gameOpen = unit !== undefined && route.gameId !== null;

  // Lock page scroll (incl. iOS rubber-banding) while a game is open.
  useEffect(() => {
    if (!gameOpen) return;
    document.documentElement.classList.add('scroll-locked');
    return () => document.documentElement.classList.remove('scroll-locked');
  }, [gameOpen]);

  // Each screen starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.unitId]);

  const closeGame = () => leave({ unitId: route.unitId, gameId: null });

  return (
    <>
      {unit ? (
        <UnitScreen
          unit={unit}
          onBack={() => leave({ unitId: null, gameId: null })}
          onPlay={(gameId) => go({ unitId: unit.id, gameId })}
        />
      ) : (
        <HomeScreen onPick={(unitId) => go({ unitId, gameId: null })} />
      )}

      <Dialog open={gameOpen} onOpenChange={(open) => !open && closeGame()}>
        {unit && route.gameId && <GameDialog unit={unit} gameId={route.gameId} onClose={closeGame} />}
      </Dialog>
    </>
  );
}

function LetterTiles({ unit, className, style }: { unit: Unit; className?: string; style?: CSSProperties }) {
  // Standalone letters use Naskh like all Arabic text (Cairo's ز looks like a Latin "j").
  return (
    <span className="flex gap-3.5" aria-hidden>
      {unit.letters.map((letter) => (
        <span
          key={letter}
          data-letter-tile
          className={cn(
            'flex aspect-square items-center justify-center bg-white pb-[0.22em] font-naskh font-bold leading-none shadow-[inset_0_-5px_0_rgba(59,58,74,.06)]',
            THEME[unit.theme].ink,
            className,
          )}
          style={style}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

function Badge({ unit }: { unit: Unit }) {
  return (
    <span className={cn('inline-block rounded-full bg-white px-4 text-vowelled', THEME[unit.theme].ink)} style={{ fontSize: vh(15, 0.026, 18) }}>
      {unit.label}
    </span>
  );
}

const LOGO = [
  { letter: 'أ', className: 'bg-peach text-peach-ink rotate-6' },
  { letter: 'ب', className: 'bg-sky text-sky-ink -rotate-6 translate-y-1.5' },
  { letter: 'ت', className: 'bg-mint text-mint-ink rotate-[4deg]' },
];

function HomeScreen({ onPick }: { onPick: (unitId: string) => void }) {
  return (
    <main className="min-h-app mx-auto max-w-[1160px] px-6 pb-12 pt-6">
      <header className="flex flex-col items-center gap-1.5 pb-9 pt-6 text-center">
        <div className="mb-2 flex gap-2.5" aria-hidden>
          {LOGO.map(({ letter, className }) => (
            <span key={letter} className={cn('flex h-16 w-16 items-center justify-center rounded-[20px] pb-[0.22em] font-naskh text-[40px] font-bold leading-none shadow-card', className)}>
              {letter}
            </span>
          ))}
        </div>
        <h1 className="text-vowelled text-[clamp(36px,5vw,52px)]">أَلْعَابُ الحُرُوفِ</h1>
        <p className="text-vowelled text-[clamp(20px,2.4vw,26px)] text-muted">أَخْتَارُ وَحْدَةً وَأَلْعَبُ</p>
      </header>

      <section aria-label="الوَحَدَاتُ" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-7">
        {units.map((unit) => (
          <button
            key={unit.id}
            type="button"
            data-unit-card={unit.id}
            onClick={() => onPick(unit.id)}
            className={cn(PRESSABLE, 'flex min-h-[300px] flex-col items-center gap-3.5 rounded-card-lg px-5 pb-5 pt-[22px] text-center', THEME[unit.theme].bg)}
          >
            <Badge unit={unit} />
            <LetterTiles unit={unit} className="w-[clamp(84px,9vw,104px)] rounded-card-md text-[clamp(54px,6vw,68px)]" />
            <span className="text-vowelled text-[clamp(24px,2.6vw,28px)]">{unit.title}</span>
            <span className="mt-auto flex gap-2" aria-hidden>
              {unit.games.map((g) => (
                <span key={g.id} className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/70 font-emoji text-[22px] leading-none">
                  {g.emoji}
                </span>
              ))}
            </span>
          </button>
        ))}
      </section>
    </main>
  );
}

function UnitScreen({ unit, onBack, onPlay }: { unit: Unit; onBack: () => void; onPlay: (id: GameId) => void }) {
  const theme = THEME[unit.theme];
  return (
    <main data-unit-screen={unit.id} className="min-h-app mx-auto flex max-w-[1160px] flex-col px-4 pb-4 pt-3 sm:px-6">
      <header className={cn('mb-4 flex shrink-0 items-center gap-[18px] rounded-card-lg px-4 py-2.5 shadow-card', theme.bg)}>
        <button
          type="button"
          onClick={onBack}
          aria-label="رُجُوع"
          className={cn(PRESSABLE, 'flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-white text-[32px] font-bold leading-none', theme.ink)}
        >
          →
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <Badge unit={unit} />
          <h1 className="text-vowelled" style={{ fontSize: vh(22, 0.04, 34) }}>
            {unit.title}
          </h1>
        </div>
        <span className="hidden min-[560px]:block">
          <LetterTiles unit={unit} className="w-[72px] rounded-[18px] text-[46px]" />
        </span>
      </header>

      <section
        aria-label="الأَلْعَابُ"
        className="grid flex-1 auto-rows-[minmax(220px,auto)] grid-cols-1 gap-4 min-[560px]:auto-rows-[minmax(0,1fr)] min-[560px]:grid-cols-2"
      >
        {unit.games.map((game) => {
          // Each card is filled with its game's own color; the emoji circle and pill are white.
          const t = THEME[game.theme];
          return (
            <button
              key={game.id}
              type="button"
              data-game-card={game.id}
              onClick={() => onPlay(game.id)}
              className={cn(PRESSABLE, 'flex min-h-0 flex-col items-center justify-center rounded-card-lg border-4 border-white/60 px-[18px] text-center', t.bg)}
              style={{ gap: vh(4, 0.012, 10), paddingBlock: vh(8, 0.025, 22) }}
            >
              <span
                aria-hidden
                className="flex aspect-square shrink-0 items-center justify-center rounded-full bg-white/80 font-emoji leading-none"
                style={{ width: vh(52, 0.09, 112), fontSize: vh(28, 0.047, 58) }}
              >
                {game.emoji}
              </span>
              <span className="text-vowelled" style={{ fontSize: vh(20, 0.036, 26) }}>
                {game.title}
              </span>
              <span className={cn('text-vowelled opacity-80', t.ink)} style={{ fontSize: vh(15, 0.026, 19), lineHeight: 1.8 }}>
                {game.short}
              </span>
              <span
                className={cn('inline-flex items-center rounded-full bg-white px-[26px] text-vowelled', t.ink)}
                style={{ minHeight: vh(40, 0.07, 52), fontSize: vh(18, 0.032, 22) }}
              >
                أَلْعَبُ ◀
              </span>
            </button>
          );
        })}
      </section>
    </main>
  );
}

function GameDialog({ unit, gameId, onClose }: { unit: Unit; gameId: GameId; onClose: () => void }) {
  const Game = gameRegistry[gameId];
  const title = unit.games.find((g) => g.id === gameId)?.title ?? '';
  return (
    <DialogContent aria-describedby={undefined}>
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <Suspense
        fallback={
          <GameStage onClose={onClose}>
            <div className="flex h-full items-center justify-center text-6xl">⏳</div>
          </GameStage>
        }
      >
        <div id="active-game-container" data-game={gameId} data-unit={unit.id}>
          <Game unitId={unit.id} onExit={onClose} />
        </div>
      </Suspense>
    </DialogContent>
  );
}
