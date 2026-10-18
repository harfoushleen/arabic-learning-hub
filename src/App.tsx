import { Suspense, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { GameStage } from '@/components/games/GameStage';
import { gameRegistry } from '@/components/games/registry';
import { getUnit, units, type GameId, type Unit } from '@/data/units';

const GAME_CARD_COLORS = ['bg-pastel-pink', 'bg-pastel-mint', 'bg-pastel-yellow', 'bg-pastel-lilac'];

export default function App() {
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const activeUnit = activeUnitId ? getUnit(activeUnitId) : undefined;
  const gameOpen = activeUnit !== undefined && activeGameId !== null;

  // Lock page scroll (incl. iOS rubber-banding) while a game is open.
  useEffect(() => {
    if (!gameOpen) return;
    document.documentElement.classList.add('scroll-locked');
    return () => document.documentElement.classList.remove('scroll-locked');
  }, [gameOpen]);

  return (
    <main className="min-h-app mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 3xl:max-w-[1600px]">
      {activeUnit ? (
        <UnitView unit={activeUnit} onBack={() => setActiveUnitId(null)} onPlay={setActiveGameId} />
      ) : (
        <UnitList onPick={setActiveUnitId} />
      )}

      <Dialog open={gameOpen} onOpenChange={(open) => !open && setActiveGameId(null)}>
        {activeUnit && activeGameId && (
          <GameDialog unit={activeUnit} gameId={activeGameId} onClose={() => setActiveGameId(null)} />
        )}
      </Dialog>
    </main>
  );
}

function UnitList({ onPick }: { onPick: (id: string) => void }) {
  return (
    <>
      <h1 className="text-center font-cairo text-[40px] font-extrabold leading-[1.6]">أَلْعَابُ الحُرُوفِ</h1>
      <div className="flex flex-wrap justify-center gap-6">
        {units.map((unit) => (
          <button
            key={unit.id}
            type="button"
            data-unit-card={unit.id}
            onClick={() => onPick(unit.id)}
            style={{ backgroundColor: unit.color }}
            className="game-piece flex min-h-[200px] w-full flex-col sm:w-[420px] items-center justify-center gap-4 rounded-[2rem] p-6 shadow-md transition-transform active:scale-[0.98]"
          >
            <span className="flex gap-4 font-cairo text-[72px] font-extrabold leading-none">
              {unit.letters.map((letter) => (
                <span key={letter} className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/80 pb-3">
                  {letter}
                </span>
              ))}
            </span>
            <span className="font-cairo text-[32px] font-bold leading-[1.6]">{unit.title}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function UnitView({ unit, onBack, onPlay }: { unit: Unit; onBack: () => void; onPlay: (id: GameId) => void }) {
  return (
    <>
      <header className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="game-piece flex min-h-[56px] items-center gap-2 rounded-2xl bg-white px-5 font-cairo text-[24px] font-bold shadow-md transition-transform active:scale-95"
        >
          <span aria-hidden>→</span> عَوْدَة
        </button>
        <h1 className="flex-1 text-center font-cairo text-[36px] font-extrabold leading-[1.6]">{unit.title}</h1>
        <span className="hidden w-[120px] sm:block" aria-hidden />
      </header>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {unit.games.map((game, i) => (
          <button
            key={game.id}
            type="button"
            data-game-card={game.id}
            onClick={() => onPlay(game.id)}
            className={`game-piece flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[2rem] p-6 shadow-md transition-transform active:scale-[0.98] ${GAME_CARD_COLORS[i % GAME_CARD_COLORS.length]}`}
          >
            <span aria-hidden className="text-[64px] leading-none">
              {game.emoji}
            </span>
            <span className="font-cairo text-[30px] font-bold leading-[1.6]">{game.title}</span>
          </button>
        ))}
      </div>
    </>
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
