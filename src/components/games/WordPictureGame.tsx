import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import confetti from 'canvas-confetti';
import { getUnit, type VocabWord } from '@/data/units';
import { buildRounds, starsFor } from '@/lib/rounds';
import { cn, prefersReducedMotion, shuffle } from '@/lib/utils';
import type { GameProps } from './types';

const PASTELS = ['bg-pastel-blue', 'bg-pastel-pink', 'bg-pastel-mint', 'bg-pastel-yellow', 'bg-pastel-lilac', 'bg-pastel-peach'];
const SHAKE_MS = 500;
const POP_MS = 600;
const HINT_MS = 1300;
const ROUND_DONE_DELAY_MS = 650;

const LG_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-3',
  6: 'lg:grid-cols-3',
};

export default function WordPictureGame({ unitId, onExit }: GameProps) {
  const [sessionKey, setSessionKey] = useState(0);
  const unit = getUnit(unitId);
  const game = unit?.games.find((g) => g.id === 'word-picture');

  if (!unit || !game) {
    return <p className="p-8 text-center font-cairo text-3xl">لَا تُوجَدُ كَلِمَاتٌ</p>;
  }
  return (
    <Session
      key={sessionKey}
      words={unit.vocab}
      instruction={game.instruction}
      onRestart={() => setSessionKey((k) => k + 1)}
      onExit={onExit}
    />
  );
}

interface Round {
  words: VocabWord[];
  bank: string[]; // word ids in the order shown in the word bank
}

type Phase = 'playing' | 'round-complete' | 'finished';

interface SessionProps {
  words: VocabWord[];
  instruction: string;
  onRestart: () => void;
  onExit?: () => void;
}

function Session({ words, instruction, onRestart, onExit }: SessionProps) {
  const [rounds] = useState<Round[]>(() =>
    buildRounds(words).map((r) => ({ words: r, bank: shuffle(r.map((w) => w.id)) })),
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [placed, setPlaced] = useState<ReadonlySet<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ chipId: string; slotId: string } | null>(null);
  const [popSlot, setPopSlot] = useState<string | null>(null);
  const [hintSlot, setHintSlot] = useState<string | null>(null);
  const [misses, setMisses] = useState<Readonly<Record<string, number>>>({});
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(() => new Set());
  const [readyRound, setReadyRound] = useState(-1);
  const later = useTimers();

  const round = rounds[roundIndex]!;
  const byId = new Map(words.map((w) => [w.id, w]));

  // Decode the round's images before showing it, so pictures never pop in mid-round.
  useEffect(() => {
    let cancelled = false;
    const withImages = round.words.filter((w) => w.image);
    Promise.all(
      withImages.map((w) => decodeImage(w.image!).then((ok) => (ok ? null : w.id))),
    ).then((results) => {
      if (cancelled) return;
      const failed = results.filter((id): id is string => id !== null);
      if (failed.length) setFailedImages((prev) => new Set([...prev, ...failed]));
      setReadyRound(roundIndex);
    });
    return () => {
      cancelled = true;
    };
  }, [round, roundIndex]);

  const markImageFailed = useCallback((id: string) => {
    setFailedImages((prev) => (prev.has(id) ? prev : new Set([...prev, id])));
  }, []);

  const busy = phase !== 'playing' || wrong !== null;

  function tapChip(id: string) {
    if (busy || placed.has(id)) return;
    setSelected((cur) => (cur === id ? null : id));
  }

  function tapSlot(word: VocabWord) {
    if (busy || placed.has(word.id) || !selected) return;
    const chipId = selected;
    setSelected(null);

    if (chipId === word.id) {
      const nextPlaced = new Set(placed).add(chipId);
      setPlaced(nextPlaced);
      setPopSlot(chipId);
      later(() => setPopSlot((cur) => (cur === chipId ? null : cur)), POP_MS);
      if (word.audio) new Audio(word.audio).play().catch(() => {});
      if (round.words.every((w) => nextPlaced.has(w.id))) {
        later(() => {
          setPhase('round-complete');
          celebrate();
        }, ROUND_DONE_DELAY_MS);
      }
      return;
    }

    const count = (misses[chipId] ?? 0) + 1;
    setMisses({ ...misses, [chipId]: count });
    setWrong({ chipId, slotId: word.id });
    later(() => {
      setWrong(null);
      if (count === 2) {
        setHintSlot(chipId);
        later(() => setHintSlot((cur) => (cur === chipId ? null : cur)), HINT_MS);
      }
    }, SHAKE_MS);
  }

  function nextRound() {
    if (roundIndex + 1 >= rounds.length) {
      setPhase('finished');
      return;
    }
    setRoundIndex(roundIndex + 1);
    setPhase('playing');
  }

  if (phase === 'finished') {
    const stars = starsFor(words.length - Object.keys(misses).length, words.length);
    return <FinalScreen stars={stars} onRestart={onRestart} onExit={onExit} />;
  }

  const ready = readyRound === roundIndex;

  return (
    <div className="relative flex h-full flex-col gap-4 overflow-y-auto overscroll-none p-4 sm:p-6 3xl:gap-8 3xl:p-10">
      <header className="flex flex-col items-center gap-3 px-16 sm:px-20">
        <h2 className="text-center font-cairo text-[28px] font-bold leading-[1.7] md:text-[32px] 3xl:text-[44px]">
          {instruction}
        </h2>
        <ProgressDots total={rounds.length} current={roundIndex} />
      </header>

      {ready ? (
        <>
          <div
            className={cn(
              'mx-auto grid w-full grid-cols-2 gap-4 lg:gap-6 3xl:gap-8',
              LG_COLS[round.words.length] ?? 'lg:grid-cols-4',
              round.words.length <= 3 ? 'max-w-5xl 3xl:max-w-7xl' : 'max-w-7xl 3xl:max-w-[1800px]',
            )}
          >
            {round.words.map((word, i) => {
              const isPlaced = placed.has(word.id);
              const wrongHere = wrong?.slotId === word.id ? byId.get(wrong.chipId) : undefined;
              return (
                <button
                  key={word.id}
                  type="button"
                  onClick={() => tapSlot(word)}
                  disabled={isPlaced}
                  aria-label={isPlaced ? word.text : 'ضَعِ الكَلِمَةَ هُنَا'}
                  className={cn(
                    'game-piece flex min-w-[160px] flex-col gap-3 rounded-3xl bg-white p-3 text-start shadow-md transition-[box-shadow,background-color] duration-300 3xl:p-4',
                    isPlaced && 'bg-emerald-50 shadow-[0_0_0_4px_rgb(110_231_183),0_8px_28px_rgba(16,185,129,0.25)]',
                    popSlot === word.id && 'animate-pop',
                    hintSlot === word.id && 'animate-hint',
                  )}
                >
                  <PictureCard
                    word={word}
                    failed={failedImages.has(word.id)}
                    pastel={PASTELS[i % PASTELS.length]!}
                    onError={markImageFailed}
                  />
                  <span
                    className={cn(
                      'flex min-h-[84px] w-full items-center justify-center rounded-2xl border-[3px] border-dashed px-2 transition-colors 3xl:min-h-[104px]',
                      isPlaced
                        ? 'border-transparent bg-white/70'
                        : selected
                          ? 'border-amber-400 bg-amber-50/60'
                          : 'border-slate-300 bg-slate-50/60',
                    )}
                  >
                    {isPlaced ? (
                      <span className="font-cairo text-[36px] font-bold leading-[1.6] text-emerald-800 3xl:text-[48px]">
                        {word.text}
                      </span>
                    ) : wrongHere ? (
                      <span className="animate-shake rounded-2xl bg-white px-5 font-cairo text-[36px] font-bold leading-[1.6] shadow 3xl:text-[48px]">
                        {wrongHere.text}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-4 pb-2 pt-2 3xl:max-w-[1600px] 3xl:gap-6">
            {round.bank.map((id) => {
              const word = byId.get(id)!;
              if (placed.has(id)) return null;
              const isSelected = selected === id;
              const inFlight = wrong?.chipId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => tapChip(id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'game-piece min-h-[72px] min-w-[120px] rounded-2xl border-2 border-white bg-white px-6 font-cairo text-[36px] font-bold leading-[1.6] shadow-md transition-transform duration-200 3xl:min-h-[92px] 3xl:px-8 3xl:text-[48px]',
                    isSelected && '-translate-y-2 scale-105 border-amber-300 bg-pastel-yellow shadow-xl',
                    inFlight && 'invisible',
                  )}
                >
                  {word.text}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-6xl" aria-hidden>
          ⏳
        </div>
      )}

      {phase === 'round-complete' && (
        <div className="absolute inset-0 z-10 flex animate-fade-in items-center justify-center bg-cream/80 p-6">
          <div className="flex animate-rise-in flex-col items-center gap-8 rounded-[2rem] bg-white px-12 py-10 shadow-xl">
            <p className="font-cairo text-[48px] font-extrabold leading-[1.6] 3xl:text-[64px]" role="status">
              أَحْسَنْتَ! 🌟
            </p>
            <BigButton onClick={nextRound} autoFocus>
              التَّالِي
            </BigButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PictureCard({
  word,
  failed,
  pastel,
  onError,
}: {
  word: VocabWord;
  failed: boolean;
  pastel: string;
  onError: (id: string) => void;
}) {
  const frame =
    'h-[clamp(160px,20vh,300px)] w-full overflow-hidden rounded-2xl lg:h-[clamp(160px,30vh,320px)] 3xl:h-[clamp(220px,32vh,420px)]';
  if (word.image && !failed) {
    return (
      <span className={cn(frame, 'block bg-white')}>
        <img
          src={word.image}
          alt={word.text}
          draggable={false}
          onError={() => onError(word.id)}
          className="game-piece pointer-events-none h-full w-full object-contain"
        />
      </span>
    );
  }
  return (
    <span role="img" aria-label={word.text} className={cn(frame, pastel, 'flex items-center justify-center')}>
      <span aria-hidden className="text-[110px] leading-none 3xl:text-[150px]">
        {word.emoji}
      </span>
    </span>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <ol className="flex items-center gap-3" aria-label={`الجَوْلَةُ ${current + 1} مِنْ ${total}`}>
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

function FinalScreen({
  stars,
  onRestart,
  onExit,
}: {
  stars: 1 | 2 | 3;
  onRestart: () => void;
  onExit?: () => void;
}) {
  useEffect(() => {
    if (stars === 3) celebrate();
  }, [stars]);

  return (
    <div className="flex h-full animate-fade-in flex-col items-center justify-center gap-10 p-6">
      <p className="font-cairo text-[48px] font-extrabold leading-[1.6] 3xl:text-[64px]">أَحْسَنْتَ! 🌟</p>
      <div className="flex gap-4" role="img" aria-label={`${stars} / 3`}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            aria-hidden
            className={cn('text-[88px] leading-none 3xl:text-[120px]', n > stars && 'opacity-25 grayscale')}
          >
            ⭐
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        <BigButton onClick={onRestart} autoFocus>
          أَعِدِ اللُّعْبَةَ
        </BigButton>
        {onExit && (
          <BigButton onClick={onExit} variant="secondary">
            عَوْدَة
          </BigButton>
        )}
      </div>
    </div>
  );
}

function BigButton({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  return (
    <button
      type="button"
      className={cn(
        'game-piece min-h-[64px] min-w-[160px] rounded-2xl px-8 font-cairo text-[32px] font-bold leading-[1.6] shadow-md transition-transform active:scale-95',
        variant === 'primary' ? 'bg-emerald-300 text-emerald-950' : 'bg-pastel-lilac text-ink',
        className,
      )}
      {...props}
    />
  );
}

function celebrate() {
  if (prefersReducedMotion()) return;
  void confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, zIndex: 200, disableForReducedMotion: true });
}

function decodeImage(src: string): Promise<boolean> {
  const img = new Image();
  img.src = src;
  return img.decode().then(
    () => true,
    () => false,
  );
}

/** setTimeout that is cleared automatically when the component unmounts. */
function useTimers() {
  const ids = useRef(new Set<number>());
  useEffect(() => {
    const set = ids.current;
    return () => {
      set.forEach((id) => window.clearTimeout(id));
      set.clear();
    };
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      ids.current.delete(id);
      fn();
    }, ms);
    ids.current.add(id);
  }, []);
}
