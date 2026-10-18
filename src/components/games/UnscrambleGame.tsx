import { useRef, useState } from 'react';
import { getUnit, type UnscrambleSet, type UnscrambleTile } from '@/data/units';
import { solveFitGrid, useFitGrid, type FitGridConfig, type FitGridLayout } from '@/hooks/useFitGrid';
import { useFontsReady } from '@/hooks/useFontsReady';
import { useTimers } from '@/hooks/useTimers';
import { starsFor } from '@/lib/rounds';
import { shuffle } from '@/lib/shuffle';
import { textWidth } from '@/lib/textWidth';
import { isComplete, nextTileIds, scrambleTiles } from '@/lib/unscramble';
import { cn } from '@/lib/utils';
import { BigButton } from './BigButton';
import { DraggableTile } from './drag/DraggableTile';
import { useDrag, type DropResult } from './drag/useDrag';
import { GameFinal } from './GameFinal';
import { GameStage } from './GameStage';
import type { GameProps } from './types';

const SHAKE_MS = 500;
const WIGGLE_MS = 450;
const POP_MS = 600;
const HINT_MS = 1300;
const SET_HOLD_MS = 1200;

const GAP = 20; // between picture, strip and bank
const INSET = 8;
const PIECE_GAP = 12; // between slots and between tiles
const STRIP_PAD = 12;
const BORDER = 3;
const MAX_STRIP = 1200;
const MIN_PICTURE = 120; // picture width, px
const MAX_PICTURE = 560;
const MAX_FONT = 60;
const MIN_FONT = 32;
const LINE = 1.8; // text-vowelled line-height

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pictureHeight = (w: number) => Math.round((w * 3) / 4);

/** Rows a greedy flex-wrap needs for these widths. */
function lineCount(widths: number[], max: number): number {
  let lines = 1;
  let used = 0;
  for (const w of widths) {
    if (used > 0 && used + PIECE_GAP + w > max) {
      lines++;
      used = w;
    } else {
      used += (used > 0 ? PIECE_GAP : 0) + w;
    }
  }
  return lines;
}

interface Metrics {
  font: number;
  pieceHeight: number;
  slotWidth: number;
  tileWidth: Record<string, number>;
  stripWidth: number;
  stripHeight: number;
  bankHeight: number;
}

/** Piece sizes for a font, and the strip and bank heights for their worst case (most rows). */
function metrics(set: UnscrambleSet, font: number, areaWidth: number): Metrics {
  const pieceHeight = Math.max(64, Math.ceil(font * LINE));
  const padX = Math.round(font * 0.45);
  const tileWidth: Record<string, number> = {};
  for (const t of set.tiles) tileWidth[t.id] = Math.max(64, Math.ceil(textWidth(t.text, font) * 1.04) + 2 * (padX + BORDER));
  const slotWidth = Math.max(72, Math.round(font * 2.2));
  const stripWidth = Math.min(areaWidth, MAX_STRIP);
  const inner = stripWidth - 2 * (STRIP_PAD + BORDER);

  // Every reachable strip: each accepted answer, filled word by word.
  let stripLines = 1;
  for (const answer of set.answers) {
    for (let n = 0; n <= answer.length; n++) {
      const widths = answer.map((id, i) => (i < n ? tileWidth[id]! : slotWidth));
      stripLines = Math.max(stripLines, lineCount(widths, inner));
    }
  }
  const bankLines = lineCount(Object.values(tileWidth), stripWidth);
  const rows = (n: number) => n * pieceHeight + (n - 1) * PIECE_GAP;
  return {
    font,
    pieceHeight,
    slotWidth,
    tileWidth,
    stripWidth,
    stripHeight: rows(stripLines) + 2 * (STRIP_PAD + BORDER),
    bankHeight: rows(bankLines),
  };
}

export default function UnscrambleGame({ unitId, onExit }: GameProps) {
  const [session, setSession] = useState(0);
  const unit = getUnit(unitId);
  const game = unit?.games.find((g) => g.id === 'unscramble');
  const sets = unit?.unscramble.filter((s) => s.answers.length > 0) ?? [];

  if (!unit || !game || sets.length === 0) {
    return (
      <GameStage onClose={onExit}>
        <p className="p-8 text-center text-vowelled text-3xl">لَا تُوجَدُ جُمَلٌ</p>
      </GameStage>
    );
  }
  return (
    <Session
      key={session}
      sets={sets}
      title={game.title}
      instruction={game.instruction}
      onRestart={() => setSession((s) => s + 1)}
      onExit={onExit}
    />
  );
}

type Phase = 'playing' | 'holding' | 'set-done' | 'finished';

interface SessionProps {
  sets: UnscrambleSet[];
  title: string;
  instruction: string;
  onRestart: () => void;
  onExit?: () => void;
}

function Session({ sets: allSets, title, instruction, onRestart, onExit }: SessionProps) {
  // Fresh set order and tile order on every open and replay; tiles never start in an accepted order.
  const [sets] = useState(() => shuffle(allSets));
  const [banks] = useState(() => sets.map((s) => scrambleTiles(s.tiles, s.answers)));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [placed, setPlaced] = useState<string[]>([]);
  const [shakeTile, setShakeTile] = useState<string | null>(null);
  const [wiggleTile, setWiggleTile] = useState<string | null>(null);
  const [hintTile, setHintTile] = useState<string | null>(null);
  const [popSlot, setPopSlot] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(() => new Set());
  const [misses, setMisses] = useState<Readonly<Record<string, number>>>({});
  const later = useTimers();
  useFontsReady(); // re-measure tile widths once Naskh is loaded

  const set = sets[index]!;
  const tileById = new Map(set.tiles.map((t) => [t.id, t]));
  const showPicture = !!set.image && !failedImages.has(set.id);

  // The picture is the one "card"; the strip and bank are the reserved height below it. Try the
  // biggest font first and let the picture shrink; only once the picture would get too small does
  // the font shrink.
  const fitConfig = (font: number, maxPicture = MAX_PICTURE): FitGridConfig => ({
    count: 1,
    columns: [1],
    gap: 0,
    inset: INSET,
    minWidth: showPicture ? MIN_PICTURE : 0,
    maxWidth: showPicture ? maxPicture : 0,
    cardHeight: (w) => (showPicture ? pictureHeight(w) : 0),
    reserveHeight: (_w, areaWidth) => {
      const m = metrics(set, font, areaWidth);
      return (showPicture ? GAP : 0) + m.stripHeight + GAP + m.bankHeight;
    },
  });
  const fit = useFitGrid(fitConfig(MIN_FONT));

  let layout: FitGridLayout | null = null;
  let m: Metrics | null = null;
  if (fit.area) {
    const { width, height } = fit.area;
    const maxPicture = Math.min(MAX_PICTURE, Math.round(((height - 2 * INSET) * 0.5 * 4) / 3));
    const minPictureHeight = clamp(height * 0.28, 90, 220);
    for (let font = MAX_FONT; font >= MIN_FONT; font -= 2) {
      layout = solveFitGrid(width, height, fitConfig(font, maxPicture));
      m = metrics(set, font, width - 2 * INSET);
      if (layout.fits && (!showPicture || layout.cardHeight >= minPictureHeight)) break;
    }
    // Nothing reached the preferred picture size: the smallest font that fits at all, else scroll.
    if (layout && (!layout.fits || (showPicture && layout.cardHeight < minPictureHeight))) {
      for (let font = MAX_FONT; font >= MIN_FONT; font -= 2) {
        layout = solveFitGrid(width, height, fitConfig(font, maxPicture));
        m = metrics(set, font, width - 2 * INSET);
        if (layout.fits) break;
      }
    }
  }

  const stripEl = useRef<HTMLDivElement | null>(null);
  const { drag, over, bind } = useDrag<string, 'strip'>({
    getTargets: () => {
      const rect = stripEl.current?.getBoundingClientRect();
      return rect ? [{ id: 'strip', rect }] : [];
    },
    margin: 16,
    canDrag: (id) => phase === 'playing' && !shakeTile && !placed.includes(id),
    onDrop: dropTile,
    onTap: (id) => {
      // Words are only placed by dragging; a tap wiggles to say "drag me".
      setWiggleTile(id);
      later(() => setWiggleTile((cur) => (cur === id ? null : cur)), WIGGLE_MS);
    },
    onReturned: (id, reason) => {
      if (reason !== 'wrong') return;
      setShakeTile(id);
      later(() => setShakeTile(null), SHAKE_MS);
    },
  });

  function dropTile(id: string): DropResult {
    const allowed = nextTileIds(set.answers, placed);
    const slot = placed.length;

    if (allowed.includes(id)) {
      const next = [...placed, id];
      setPlaced(next);
      setHintTile(null);
      setPopSlot(slot);
      later(() => setPopSlot((cur) => (cur === slot ? null : cur)), POP_MS);
      if (isComplete(set.answers, next)) {
        setPhase('holding');
        later(() => setPhase(index + 1 < sets.length ? 'set-done' : 'finished'), SET_HOLD_MS);
      }
      return 'correct';
    }

    const key = `${set.id}:${slot}`;
    const count = (misses[key] ?? 0) + 1;
    setMisses({ ...misses, [key]: count });
    if (count === 2) {
      const correct = allowed[0]!;
      setHintTile(correct);
      later(() => setHintTile((cur) => (cur === correct ? null : cur)), HINT_MS);
    }
    return 'wrong';
  }

  function nextSet() {
    setIndex(index + 1);
    setPlaced([]);
    setPhase('playing');
  }

  const finished = phase === 'finished';
  const complete = phase !== 'playing';
  const slotCount = set.tiles.length;

  let overlay = null;
  if (finished) {
    const total = sets.reduce((n, s) => n + s.tiles.length, 0);
    const stars = starsFor(total - Object.keys(misses).length, total);
    overlay = <GameFinal stars={stars} confetti="always" onRestart={onRestart} onExit={onExit} />;
  }

  return (
    <GameStage
      title={title}
      instruction={instruction}
      progress={{ total: sets.length, current: finished ? sets.length : index }}
      onClose={onExit}
      playAreaRef={fit.ref}
      scrollable={!finished && layout !== null && !layout.fits}
      rotateHint={!finished && layout !== null && !layout.fits && fit.fitsRotated}
      overlay={overlay}
      overlayOpaque
    >
      {!finished && layout && m && (
        <div
          className={cn('flex min-h-full flex-col items-center', layout.fits ? 'justify-center' : 'justify-start')}
          style={{ gap: GAP, padding: INSET }}
        >
          {showPicture && (
            <div
              key={set.id}
              data-picture={set.id}
              className="flex shrink-0 items-center justify-center overflow-hidden rounded-3xl border-[3px] border-white bg-pastel-blue shadow-md"
              style={{ width: layout.cardWidth, height: layout.cardHeight }}
            >
              <img
                src={set.image}
                alt=""
                draggable={false}
                onError={() => setFailedImages((prev) => new Set([...prev, set.id]))}
                className="pointer-events-none h-full w-full rounded-[1.25rem] object-contain p-1"
              />
            </div>
          )}

          {/* The sentence strip: the whole strip is the drop target; a word goes into the next slot. */}
          <div
            ref={stripEl}
            data-strip={set.id}
            data-over={over}
            data-complete={complete}
            className={cn(
              'flex shrink-0 flex-wrap content-start rounded-3xl border-[3px] transition-colors',
              complete
                ? 'border-emerald-400 bg-emerald-50 shadow-[0_0_0_6px_rgb(167_243_208)]'
                : over
                  ? 'border-emerald-400 bg-emerald-50/70'
                  : 'border-white bg-white/60',
            )}
            style={{ width: m.stripWidth, height: m.stripHeight, padding: STRIP_PAD, gap: PIECE_GAP }}
          >
            {Array.from({ length: slotCount }, (_, i) => {
              const tileId = placed[i];
              const isNext = i === placed.length && !complete;
              const style = { height: m.pieceHeight, fontSize: m.font };
              return tileId ? (
                <div
                  key={i}
                  data-slot={i}
                  data-slot-tile={tileId}
                  className={cn(
                    'flex shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border-[3px] bg-white text-vowelled shadow-sm',
                    complete ? 'border-emerald-300 text-emerald-900' : 'border-white',
                    popSlot === i && 'animate-pop',
                  )}
                  style={{ ...style, width: m.tileWidth[tileId] }}
                >
                  {tileById.get(tileId)!.text}
                </div>
              ) : (
                <div
                  key={i}
                  data-slot={i}
                  data-next={isNext}
                  aria-label="فَرَاغ"
                  className={cn(
                    'shrink-0 rounded-2xl border-[3px] border-dashed transition-colors',
                    isNext ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-50/60',
                  )}
                  style={{ ...style, width: m.slotWidth }}
                />
              );
            })}
          </div>

          {/* The word bank; once the sentence is done, the next button takes its place. */}
          <div
            data-bank
            className="flex shrink-0 flex-wrap content-start items-start justify-center"
            style={{ width: m.stripWidth, height: m.bankHeight, gap: PIECE_GAP }}
          >
            {phase === 'set-done' ? (
              <BigButton onClick={nextSet} autoFocus>
                التَّالِي
              </BigButton>
            ) : (
              banks[index]!
                .filter((t: UnscrambleTile) => !placed.includes(t.id))
                .map((tile) => (
                  <DraggableTile
                    key={`${set.id}:${tile.id}`}
                    id={tile.id}
                    drag={drag}
                    bind={bind}
                    data={{
                      'data-tile': tile.id,
                      'data-hint': hintTile === tile.id,
                      'data-wiggle': wiggleTile === tile.id,
                      'data-shake': shakeTile === tile.id,
                    }}
                    style={{ width: m.tileWidth[tile.id], height: m.pieceHeight, fontSize: m.font }}
                    className={cn(
                      'flex cursor-grab items-center justify-center whitespace-nowrap rounded-2xl border-[3px] border-white bg-white text-vowelled shadow-md',
                      shakeTile === tile.id && 'animate-shake',
                      hintTile === tile.id && 'animate-hint',
                      wiggleTile === tile.id && 'animate-wiggle',
                    )}
                  >
                    {tile.text}
                  </DraggableTile>
                ))
            )}
          </div>
        </div>
      )}
    </GameStage>
  );
}
