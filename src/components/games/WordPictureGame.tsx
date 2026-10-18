import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { getUnit, type VocabWord } from '@/data/units';
import { useFitGrid } from '@/hooks/useFitGrid';
import { useFontsReady } from '@/hooks/useFontsReady';
import { buildRounds, starsFor } from '@/lib/rounds';
import { cn, prefersReducedMotion, shuffle } from '@/lib/utils';
import { BigButton } from './BigButton';
import { GameStage } from './GameStage';
import type { GameProps } from './types';

const PASTELS = ['bg-pastel-blue', 'bg-pastel-pink', 'bg-pastel-mint', 'bg-pastel-yellow', 'bg-pastel-lilac', 'bg-pastel-peach'];
const SHAKE_MS = 500;
const POP_MS = 600;
const HINT_MS = 1300;
const ROUND_DONE_DELAY_MS = 650;

// Layout (px). Everything else scales from the fitted card width.
const GAP = 16;
const INSET = 8; // room for the placed-card glow and the lifted chip
const BANK_GAP = 12;
const MIN_CARD = 140;
const MAX_CARD = 320;
const MIN_CHIP_H = 56;
const MIN_TEXT = 28;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Sizes of one card (picture + slot) and of the matching chips, for a card `w` px wide. */
function cardMetrics(w: number) {
  const pad = Math.round(clamp(w * 0.045, 6, 14));
  const picH = Math.round((w - 2 * pad) * 0.72);
  const slotH = Math.round(clamp(w * 0.3, MIN_CHIP_H, 96));
  const font = Math.round(clamp(slotH * 0.5, MIN_TEXT, 48));
  return { pad, picH, slotH, font, emoji: Math.round(w * 0.55), height: 2 * pad + picH + pad + slotH };
}
type CardMetrics = ReturnType<typeof cardMetrics>;

let measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, fontPx: number): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * fontPx * 0.6;
  measureCtx.font = `700 ${fontPx}px Cairo, sans-serif`;
  return measureCtx.measureText(text).width;
}

/** Chips get an explicit width so the bank wraps exactly as calculated. */
function chipWidth(text: string, m: CardMetrics): number {
  const padX = Math.round(m.font * 0.6);
  return Math.max(m.slotH, Math.ceil(textWidth(text, m.font) * 1.06) + 2 * padX + 4);
}

/** Bank height for these words; one row if they fit, otherwise as many as flex-wrap makes. */
function bankHeight(words: readonly VocabWord[], m: CardMetrics, areaWidth: number): number {
  let rows = 1;
  let x = 0;
  for (const word of words) {
    const w = chipWidth(word.text, m);
    if (x > 0 && x + BANK_GAP + w > areaWidth) {
      rows++;
      x = w;
    } else {
      x += (x > 0 ? BANK_GAP : 0) + w;
    }
  }
  return rows * m.slotH + (rows - 1) * BANK_GAP;
}

export default function WordPictureGame({ unitId, onExit }: GameProps) {
  const [sessionKey, setSessionKey] = useState(0);
  const unit = getUnit(unitId);
  const game = unit?.games.find((g) => g.id === 'word-picture');

  if (!unit || !game) {
    return (
      <GameStage onClose={onExit}>
        <p className="p-8 text-center font-cairo text-3xl">لَا تُوجَدُ كَلِمَاتٌ</p>
      </GameStage>
    );
  }
  return (
    <Session
      key={sessionKey}
      words={unit.vocab}
      title={game.title}
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
  title: string;
  instruction: string;
  onRestart: () => void;
  onExit?: () => void;
}

function Session({ words, title, instruction, onRestart, onExit }: SessionProps) {
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
  useFontsReady(); // re-measure chip text once Cairo is loaded

  const round = rounds[roundIndex]!;
  const byId = new Map(words.map((w) => [w.id, w]));
  const bankWords = round.bank.map((id) => byId.get(id)!);

  const fit = useFitGrid({
    count: round.words.length,
    gap: GAP,
    inset: INSET,
    minWidth: MIN_CARD,
    maxWidth: MAX_CARD,
    cardHeight: (w) => cardMetrics(w).height,
    reserveHeight: (w, areaWidth) => GAP + bankHeight(bankWords, cardMetrics(w), areaWidth - 2 * INSET),
  });

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

  const finished = phase === 'finished';
  const layout = fit.layout;
  const showPlay = !finished && layout !== null && readyRound === roundIndex;

  let overlay = null;
  if (finished) {
    const stars = starsFor(words.length - Object.keys(misses).length, words.length);
    overlay = <FinalScreen stars={stars} onRestart={onRestart} onExit={onExit} />;
  } else if (phase === 'round-complete') {
    overlay = (
      <div className="flex animate-rise-in flex-col items-center gap-[clamp(12px,calc(var(--app-h,100dvh)*0.04),32px)] rounded-[2rem] bg-white px-10 py-[clamp(12px,calc(var(--app-h,100dvh)*0.04),40px)] shadow-xl">
        <p className="font-cairo text-[clamp(28px,calc(var(--app-h,100dvh)*0.07),64px)] font-extrabold leading-[1.5]" role="status">
          أَحْسَنْتَ! 🌟
        </p>
        <BigButton onClick={nextRound} autoFocus>
          التَّالِي
        </BigButton>
      </div>
    );
  }

  return (
    <GameStage
      title={title}
      instruction={instruction}
      progress={{ total: rounds.length, current: finished ? rounds.length : roundIndex }}
      onClose={onExit}
      playAreaRef={fit.ref}
      scrollable={showPlay && !layout.fits}
      rotateHint={showPlay && !layout.fits && fit.fitsRotated}
      overlay={overlay}
      overlayOpaque={finished}
    >
      {showPlay && (
        <PlayArea
          layout={layout}
          metrics={cardMetrics(layout.cardWidth)}
          bankHeight={bankHeight(bankWords, cardMetrics(layout.cardWidth), (fit.area?.width ?? 0) - 2 * INSET)}
          round={round}
          bankWords={bankWords}
          placed={placed}
          selected={selected}
          wrong={wrong}
          popSlot={popSlot}
          hintSlot={hintSlot}
          failedImages={failedImages}
          byId={byId}
          onTapSlot={tapSlot}
          onTapChip={tapChip}
          onImageError={markImageFailed}
        />
      )}
    </GameStage>
  );
}

interface PlayAreaProps {
  layout: NonNullable<ReturnType<typeof useFitGrid>['layout']>;
  metrics: CardMetrics;
  bankHeight: number;
  round: Round;
  bankWords: VocabWord[];
  placed: ReadonlySet<string>;
  selected: string | null;
  wrong: { chipId: string; slotId: string } | null;
  popSlot: string | null;
  hintSlot: string | null;
  failedImages: ReadonlySet<string>;
  byId: Map<string, VocabWord>;
  onTapSlot: (word: VocabWord) => void;
  onTapChip: (id: string) => void;
  onImageError: (id: string) => void;
}

function PlayArea({
  layout,
  metrics: m,
  bankHeight: bankH,
  round,
  bankWords,
  placed,
  selected,
  wrong,
  popSlot,
  hintSlot,
  failedImages,
  byId,
  onTapSlot,
  onTapChip,
  onImageError,
}: PlayAreaProps) {
  const w = layout.cardWidth;
  const textStyle = { fontSize: m.font };

  return (
    <div
      className={cn('flex min-h-full flex-col items-center', layout.fits ? 'justify-center' : 'justify-start')}
      style={{ gap: GAP, padding: INSET }}
      data-fit={`${layout.cols}x${layout.rows} w=${w} fits=${layout.fits}`}
    >
      <div className="grid justify-center" style={{ gridTemplateColumns: `repeat(${layout.cols}, ${w}px)`, gap: GAP }}>
        {round.words.map((word, i) => {
          const isPlaced = placed.has(word.id);
          const wrongHere = wrong?.slotId === word.id ? byId.get(wrong.chipId) : undefined;
          return (
            <button
              key={word.id}
              type="button"
              data-card={word.id}
              onClick={() => onTapSlot(word)}
              disabled={isPlaced}
              aria-label={isPlaced ? word.text : 'ضَعِ الكَلِمَةَ هُنَا'}
              style={{ width: w, height: m.height, padding: m.pad, gap: m.pad }}
              className={cn(
                'game-piece flex flex-col rounded-3xl bg-white text-start shadow-md transition-[box-shadow,background-color] duration-300',
                isPlaced && 'bg-emerald-50 shadow-[0_0_0_4px_rgb(110_231_183),0_8px_28px_rgba(16,185,129,0.25)]',
                popSlot === word.id && 'animate-pop',
                hintSlot === word.id && 'animate-hint',
              )}
            >
              <PictureCard
                word={word}
                failed={failedImages.has(word.id)}
                pastel={PASTELS[i % PASTELS.length]!}
                height={m.picH}
                emojiSize={m.emoji}
                onError={onImageError}
              />
              <span
                style={{ height: m.slotH }}
                className={cn(
                  'flex w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-dashed px-1 transition-colors',
                  isPlaced
                    ? 'border-transparent bg-white/70'
                    : selected
                      ? 'border-amber-400 bg-amber-50/60'
                      : 'border-slate-300 bg-slate-50/60',
                )}
              >
                {isPlaced ? (
                  <span style={textStyle} className="font-cairo font-bold leading-[1.6] text-emerald-800">
                    {word.text}
                  </span>
                ) : wrongHere ? (
                  <span style={textStyle} className="animate-shake rounded-2xl bg-white px-4 font-cairo font-bold leading-[1.6] shadow">
                    {wrongHere.text}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-wrap content-start justify-center" style={{ gap: BANK_GAP, height: bankH }}>
        {bankWords.map((word) => {
          if (placed.has(word.id)) return null;
          const isSelected = selected === word.id;
          return (
            <button
              key={word.id}
              type="button"
              data-chip={word.id}
              onClick={() => onTapChip(word.id)}
              aria-pressed={isSelected}
              style={{ width: chipWidth(word.text, m), height: m.slotH, ...textStyle }}
              className={cn(
                'game-piece flex items-center justify-center rounded-2xl border-2 border-white bg-white font-cairo font-bold leading-[1.6] shadow-md transition-transform duration-200',
                isSelected && '-translate-y-2 scale-105 border-amber-300 bg-pastel-yellow shadow-xl',
                wrong?.chipId === word.id && 'invisible',
              )}
            >
              {word.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PictureCard({
  word,
  failed,
  pastel,
  height,
  emojiSize,
  onError,
}: {
  word: VocabWord;
  failed: boolean;
  pastel: string;
  height: number;
  emojiSize: number;
  onError: (id: string) => void;
}) {
  const frame = 'w-full shrink-0 overflow-hidden rounded-2xl';
  if (word.image && !failed) {
    return (
      <span className={cn(frame, 'block bg-white')} style={{ height }}>
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
    <span role="img" aria-label={word.text} style={{ height }} className={cn(frame, pastel, 'flex items-center justify-center')}>
      <span aria-hidden className="leading-none" style={{ fontSize: emojiSize }}>
        {word.emoji}
      </span>
    </span>
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

  // Sized from the visible height so it always fits inside the stage.
  return (
    <div className="flex flex-col items-center gap-[clamp(12px,calc(var(--app-h,100dvh)*0.04),40px)]">
      <p className="font-cairo text-[clamp(28px,calc(var(--app-h,100dvh)*0.07),64px)] font-extrabold leading-[1.5]">
        أَحْسَنْتَ! 🌟
      </p>
      <div className="flex gap-4" role="img" aria-label={`${stars} / 3`}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            aria-hidden
            className={cn(
              'text-[clamp(40px,calc(var(--app-h,100dvh)*0.12),120px)] leading-none',
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
        {onExit && (
          <BigButton onClick={onExit} variant="secondary">
            عَوْدَة
          </BigButton>
        )}
      </div>
    </div>
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
