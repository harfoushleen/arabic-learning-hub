import { useCallback, useEffect, useRef, useState } from 'react';
import { EmojiArt } from '@/components/EmojiArt';
import { getUnit, type VocabWord } from '@/data/units';
import { useFitGrid } from '@/hooks/useFitGrid';
import { useFontsReady } from '@/hooks/useFontsReady';
import { useTimers } from '@/hooks/useTimers';
import { celebrate } from '@/lib/celebrate';
import { buildRounds, starsFor } from '@/lib/rounds';
import { derange } from '@/lib/shuffle';
import { textWidth } from '@/lib/textWidth';
import { cn } from '@/lib/utils';
import { BigButton } from './BigButton';
import { DraggableTile } from './drag/DraggableTile';
import { useDrag, type DropResult } from './drag/useDrag';
import { GameFinal } from './GameFinal';
import { GameStage } from './GameStage';
import type { GameProps } from './types';

const PASTELS = ['bg-pastel-blue', 'bg-pastel-pink', 'bg-pastel-mint', 'bg-pastel-yellow', 'bg-pastel-lilac', 'bg-pastel-peach'];
const SHAKE_MS = 500;
const WIGGLE_MS = 450;
const POP_MS = 600;
const CELEBRATE_MS = 2000;
const HINT_MS = 1300;
const ROUND_DONE_DELAY_MS = 650;

// Layout (px). Everything else scales from the fitted card width.
const GAP = 16;
const INSET = 8; // room for the placed-card glow and the lifted chip
const BANK_GAP = 12;
const MIN_CARD = 140;
const MAX_CARD = 320;
const MIN_CHIP_H = 60; // fits 28px text at line-height 1.8 inside the slot border
const MIN_TEXT = 28;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Sizes of one card (picture + slot) and of the matching chips, for a card `w` px wide. */
function cardMetrics(w: number) {
  const pad = Math.round(clamp(w * 0.045, 6, 14));
  const picH = Math.round((w - 2 * pad) * 0.72);
  const slotH = Math.round(clamp(w * 0.3, MIN_CHIP_H, 96));
  const font = Math.floor(clamp((slotH - 8) / 1.8, MIN_TEXT, 48)); // 1.8 line-height + border/padding
  return { pad, picH, slotH, font, emoji: Math.round(w * 0.55), height: 2 * pad + picH + pad + slotH };
}
type CardMetrics = ReturnType<typeof cardMetrics>;

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
        <p className="p-8 text-center text-vowelled text-3xl">لَا تُوجَدُ كَلِمَاتٌ</p>
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
  // Fresh order on every open and every replay (the session remounts). The bank is deranged
  // so no chip sits in the same position as its picture.
  const [rounds] = useState<Round[]>(() =>
    buildRounds(words).map((r) => ({ words: r, bank: derange(r.map((w) => w.id)) })),
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [placed, setPlaced] = useState<ReadonlySet<string>>(() => new Set());
  const [shakeChip, setShakeChip] = useState<string | null>(null);
  const [wiggleChip, setWiggleChip] = useState<string | null>(null);
  const [popSlot, setPopSlot] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [hintSlot, setHintSlot] = useState<string | null>(null);
  const [misses, setMisses] = useState<Readonly<Record<string, number>>>({});
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(() => new Set());
  const [readyRound, setReadyRound] = useState(-1);
  const later = useTimers();
  useFontsReady(); // re-measure chip text once Naskh is loaded

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
    const withImages = round.words.filter((w) => w.image && !w.art);
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

  // Drag a word chip onto a picture card (pointer events: finger and mouse alike).
  const cardEls = useRef(new Map<string, HTMLElement>());
  const { drag, overId, bind } = useDrag<string, string>({
    getTargets: () =>
      round.words
        .filter((w) => !placed.has(w.id))
        .flatMap((w) => {
          const el = cardEls.current.get(w.id);
          return el ? [{ id: w.id, rect: el.getBoundingClientRect() }] : [];
        }),
    // Cards sit GAP apart, so a small margin keeps a drop on the gap from reaching the wrong card.
    margin: 8,
    canDrag: (id) => phase === 'playing' && !placed.has(id) && !shakeChip,
    onDrop: dropChip,
    onTap: (id) => {
      // Words are only placed by dragging; a tap wiggles to say "drag me".
      setWiggleChip(id);
      later(() => setWiggleChip((cur) => (cur === id ? null : cur)), WIGGLE_MS);
    },
    onReturned: (id, reason) => {
      if (reason !== 'wrong') return;
      setShakeChip(id);
      later(() => setShakeChip(null), SHAKE_MS);
    },
  });

  function dropChip(chipId: string, cardId: string): DropResult {
    if (chipId === cardId) {
      const word = byId.get(chipId)!;
      const nextPlaced = new Set(placed).add(chipId);
      setPlaced(nextPlaced);
      setHintSlot(null);
      setPopSlot(chipId);
      later(() => setPopSlot((cur) => (cur === chipId ? null : cur)), POP_MS);
      // The matched picture animates on a loop for 2s as part of the celebration.
      setCelebrating(chipId);
      later(() => setCelebrating((cur) => (cur === chipId ? null : cur)), CELEBRATE_MS);
      if (word.audio) new Audio(word.audio).play().catch(() => {});
      if (round.words.every((w) => nextPlaced.has(w.id))) {
        later(() => {
          setPhase('round-complete');
          celebrate();
        }, ROUND_DONE_DELAY_MS);
      }
      return 'correct';
    }

    // Wrong card: the chip glides back and shakes; the second miss for this word pulses its picture.
    const count = (misses[chipId] ?? 0) + 1;
    setMisses({ ...misses, [chipId]: count });
    if (count === 2) {
      setHintSlot(chipId);
      later(() => setHintSlot((cur) => (cur === chipId ? null : cur)), HINT_MS);
    }
    return 'wrong';
  }

  function nextRound() {
    if (roundIndex + 1 >= rounds.length) {
      setPhase('finished');
      return;
    }
    setRoundIndex(roundIndex + 1);
    setPlaced(new Set());
    setPhase('playing');
  }

  const finished = phase === 'finished';
  const layout = fit.layout;
  const showPlay = !finished && layout !== null && readyRound === roundIndex;

  let overlay = null;
  if (finished) {
    const stars = starsFor(words.length - Object.keys(misses).length, words.length);
    overlay = <GameFinal stars={stars} onRestart={onRestart} onExit={onExit} />;
  } else if (phase === 'round-complete') {
    overlay = (
      <div className="flex animate-rise-in flex-col items-center gap-[clamp(12px,calc(var(--app-h,100dvh)*0.04),32px)] rounded-[2rem] bg-white px-10 py-[clamp(12px,calc(var(--app-h,100dvh)*0.04),40px)] shadow-xl">
        <p className="text-vowelled text-[clamp(28px,calc(var(--app-h,100dvh)*0.07),64px)]" role="status">
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
          overId={overId}
          drag={drag}
          bind={bind}
          shakeChip={shakeChip}
          wiggleChip={wiggleChip}
          popSlot={popSlot}
          celebrating={celebrating}
          hintSlot={hintSlot}
          failedImages={failedImages}
          registerCard={(id, el) => (el ? cardEls.current.set(id, el) : cardEls.current.delete(id))}
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
  overId: string | null;
  drag: ReturnType<typeof useDrag<string, string>>['drag'];
  bind: ReturnType<typeof useDrag<string, string>>['bind'];
  shakeChip: string | null;
  wiggleChip: string | null;
  popSlot: string | null;
  celebrating: string | null;
  hintSlot: string | null;
  failedImages: ReadonlySet<string>;
  registerCard: (id: string, el: HTMLElement | null) => void;
  onImageError: (id: string) => void;
}

function PlayArea({
  layout,
  metrics: m,
  bankHeight: bankH,
  round,
  bankWords,
  placed,
  overId,
  drag,
  bind,
  shakeChip,
  wiggleChip,
  popSlot,
  celebrating,
  hintSlot,
  failedImages,
  registerCard,
  onImageError,
}: PlayAreaProps) {
  const w = layout.cardWidth;
  const textStyle = { fontSize: m.font };

  // A word dragged over a card plays its picture again (a counter per card).
  const [hovers, setHovers] = useState<Readonly<Record<string, number>>>({});
  const [lastOver, setLastOver] = useState<string | null>(null);
  if (overId !== lastOver) {
    setLastOver(overId);
    if (overId) setHovers((h) => ({ ...h, [overId]: (h[overId] ?? 0) + 1 }));
  }

  return (
    <div
      className={cn('flex min-h-full flex-col items-center', layout.fits ? 'justify-center' : 'justify-start')}
      style={{ gap: GAP, padding: INSET }}
      data-fit={`${layout.cols}x${layout.rows} w=${w} fits=${layout.fits}`}
    >
      <div className="grid justify-center" style={{ gridTemplateColumns: `repeat(${layout.cols}, ${w}px)`, gap: GAP }}>
        {round.words.map((word, i) => {
          const isPlaced = placed.has(word.id);
          const isOver = overId === word.id;
          return (
            <div
              key={word.id}
              ref={(el) => registerCard(word.id, el)}
              data-card={word.id}
              data-placed={isPlaced}
              data-over={isOver}
              data-hint={hintSlot === word.id}
              aria-label={isPlaced ? word.text : 'ضَعِ الكَلِمَةَ هُنَا'}
              style={{ width: w, height: m.height, padding: m.pad, gap: m.pad }}
              className={cn(
                'game-piece flex flex-col rounded-3xl bg-white text-start shadow-md transition-[box-shadow,background-color] duration-300',
                isPlaced && 'bg-emerald-50 shadow-[0_0_0_4px_rgb(110_231_183),0_8px_28px_rgba(16,185,129,0.25)]',
                isOver && 'shadow-[0_0_0_4px_rgb(251_191_36)]',
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
                // Plays once when the round appears (staggered), again while a word is dragged over
                // the card, and loops while celebrating a match.
                delay={hovers[word.id] ? 0 : i * 150}
                replay={hovers[word.id] ?? 0}
                loop={celebrating === word.id}
              />
              <span
                style={{ height: m.slotH }}
                className={cn(
                  'flex w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-dashed px-1 transition-colors',
                  isPlaced
                    ? 'border-transparent bg-white/70'
                    : isOver
                      ? 'border-amber-400 bg-amber-50'
                      : drag
                        ? 'border-amber-300 bg-amber-50/40'
                        : 'border-slate-300 bg-slate-50/60',
                )}
              >
                {isPlaced && (
                  <span style={textStyle} className="text-vowelled text-emerald-800">
                    {word.text}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex w-full flex-wrap content-start justify-center" style={{ gap: BANK_GAP, height: bankH }}>
        {bankWords.map((word) =>
          placed.has(word.id) ? null : (
            <DraggableTile
              key={word.id}
              id={word.id}
              drag={drag}
              bind={bind}
              data={{
                'data-chip': word.id,
                'data-wiggle': wiggleChip === word.id,
                'data-shake': shakeChip === word.id,
              }}
              style={{ width: chipWidth(word.text, m), height: m.slotH, ...textStyle }}
              className={cn(
                'flex cursor-grab items-center justify-center rounded-2xl border-2 border-white bg-white text-vowelled shadow-md',
                shakeChip === word.id && 'animate-shake',
                wiggleChip === word.id && 'animate-wiggle',
              )}
            >
              {word.text}
            </DraggableTile>
          ),
        )}
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
  delay,
  replay,
  loop,
}: {
  word: VocabWord;
  failed: boolean;
  pastel: string;
  height: number;
  emojiSize: number;
  onError: (id: string) => void;
  delay: number;
  replay: number;
  loop: boolean;
}) {
  const frame = 'w-full shrink-0 overflow-hidden rounded-2xl';
  if (word.image && !failed && !word.art) {
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
    <span role="img" aria-label={word.text} style={{ height }} className={cn(frame, word.art ? 'bg-white' : pastel, 'flex items-center justify-center')}>
      <EmojiArt
        emoji={word.emoji}
        art={word.art}
        // Cartoon art is a whole scene, so it fills the picture; an emoji stays emoji-sized.
        size={word.art ? '100%' : Math.min(Math.round(emojiSize * 1.15), height - 8)}
        play
        loop={loop}
        replay={replay}
        delay={delay}
      />
    </span>
  );
}

function decodeImage(src: string): Promise<boolean> {
  const img = new Image();
  img.src = src;
  return img.decode().then(
    () => true,
    () => false,
  );
}
