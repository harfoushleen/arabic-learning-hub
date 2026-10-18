import { useEffect, useRef, useState, type RefObject } from 'react';
import { EmojiArt } from '@/components/EmojiArt';
import { getUnit, type LetterForm, type LetterFormItem, type LetterFormPart } from '@/data/units';
import { solveFitGrid, useFitGrid, type FitGridConfig, type FitGridLayout } from '@/hooks/useFitGrid';
import { useFontsReady } from '@/hooks/useFontsReady';
import { useTimers } from '@/hooks/useTimers';
import { TATWEEL, worksheetSegments, ZWJ } from '@/lib/arabicJoining';
import { celebrate } from '@/lib/celebrate';
import { starsFor } from '@/lib/rounds';
import { shuffle, shuffleAvoiding } from '@/lib/shuffle';
import { textWidth } from '@/lib/textWidth';
import { cn } from '@/lib/utils';
import { BigButton } from './BigButton';
import { DraggableTile } from './drag/DraggableTile';
import { useDrag, type DropResult } from './drag/useDrag';
import { GameFinal } from './GameFinal';
import { GameStage } from './GameStage';
import type { GameProps } from './types';

// Tiles are identified by id; answers are never checked by comparing Arabic strings.
type TileId = 'initial' | 'medial' | 'final' | 'isolated';
const TILES: { id: TileId; form: LetterForm }[] = [
  { id: 'initial', form: 'بـ' },
  { id: 'medial', form: 'ـبـ' },
  { id: 'final', form: 'ـب' },
  { id: 'isolated', form: 'ب' },
];
const TILE_FOR_ANSWER: Record<LetterForm, TileId> = { 'بـ': 'initial', 'ـبـ': 'medial', 'ـب': 'final', 'ب': 'isolated' };

const SHAKE_MS = 500;
const WIGGLE_MS = 450;
const POP_MS = 600;
const HINT_MS = 1300;
const WORD_HOLD_MS = 1200;

const GAP = 24;
const INSET = 8;
const MIN_TILE = 80;
const GOOD_TILE = 110; // the word shrinks before tiles go below this
const MAX_TILE = 140;
const MAX_WORD_FONT = 72;
const MIN_WORD_FONT = 40;
const MIN_PICTURE = 96;
const LINE = 1.8; // text-vowelled line-height

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const blankBox = (font: number) => ({ width: Math.max(64, Math.round(font * 0.95)), height: Math.max(72, Math.round(font * 1.35)) });

/** Word font (at most `maxFont`), shrunk if the word (blanks drawn as boxes) wouldn't fit the row. */
function wordFont(item: LetterFormItem, maxFont: number, areaWidth: number): number {
  let font = maxFont;
  // Worst case: every letter plus the worksheet dashes beside the blanks.
  const text = item.parts.map((p) => (p.type === 'text' ? p.value : p.fill)).join('') + TATWEEL.repeat(2);
  const blanks = item.parts.filter((p) => p.type === 'blank').length;
  const width = textWidth(text, font) * 1.08 + blanks * (blankBox(font).width + 8);
  if (width > areaWidth) font = Math.max(36, Math.floor((font * areaWidth) / width));
  return font;
}

/** Height reserved for the word: one line of text or a blank box, whichever is taller, plus room for marks. */
const wordBlockHeight = (font: number) => Math.max(Math.ceil(font * LINE), blankBox(font).height) + 16;

const PASTELS = ['bg-pastel-blue', 'bg-pastel-pink', 'bg-pastel-mint', 'bg-pastel-yellow', 'bg-pastel-lilac', 'bg-pastel-peach'];

export default function LetterFormsGame({ unitId, onExit }: GameProps) {
  const [session, setSession] = useState<{ key: number; previous: string[] | null }>({ key: 0, previous: null });
  const unit = getUnit(unitId);
  const game = unit?.games.find((g) => g.id === 'letter-forms');

  if (!unit || !game || unit.letterForms.length === 0) {
    return (
      <GameStage onClose={onExit}>
        <p className="p-8 text-center text-vowelled text-3xl">لَا تُوجَدُ كَلِمَاتٌ</p>
      </GameStage>
    );
  }
  return (
    <Session
      key={session.key}
      items={unit.letterForms}
      previousOrder={session.previous}
      title={game.title}
      instruction={game.instruction}
      onRestart={(order) => setSession((s) => ({ key: s.key + 1, previous: order }))}
      onExit={onExit}
    />
  );
}

type Phase = 'playing' | 'holding' | 'word-done' | 'finished';

interface SessionProps {
  items: LetterFormItem[];
  previousOrder: string[] | null;
  title: string;
  instruction: string;
  onRestart: (order: string[]) => void;
  onExit?: () => void;
}

function Session({ items, previousOrder, title, instruction, onRestart, onExit }: SessionProps) {
  // Fresh word order on every open; a replay never repeats the previous order.
  const [words] = useState(() => {
    const previous = previousOrder?.map((id) => items.find((it) => it.id === id)!);
    return previous ? shuffleAvoiding(items, previous) : shuffle(items);
  });
  const [tileOrders] = useState(() => words.map(() => shuffle(TILES)));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [filled, setFilled] = useState<(string | null)[]>(() => words[0]!.parts.map(() => null));
  const [shakeTile, setShakeTile] = useState<TileId | null>(null);
  const [wiggleTile, setWiggleTile] = useState<TileId | null>(null);
  const [hintTile, setHintTile] = useState<TileId | null>(null);
  const [pop, setPop] = useState(false);
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(() => new Set());
  const [misses, setMisses] = useState<Readonly<Record<string, number>>>({});
  const later = useTimers();
  useFontsReady(); // re-measure word width once Naskh is loaded

  const item = words[index]!;
  const activeBlank = item.parts.findIndex((p, i) => p.type === 'blank' && filled[i] == null);

  // The picture sits above the word; on screens too short for that (phone landscape) it moves beside
  // the word instead. Either way a GAP separates it from the word, keeping it outside the blank's
  // 24px drop margin, so a drop on the picture counts as "elsewhere".
  const fitConfig = (beside: boolean, picture: number, maxFont: number): FitGridConfig => ({
    count: TILES.length,
    gap: GAP,
    inset: INSET,
    minWidth: MIN_TILE,
    maxWidth: MAX_TILE,
    cardHeight: (w) => w,
    reserveHeight: (_w, areaWidth) => {
      const word = wordBlockHeight(wordFont(item, maxFont, areaWidth - 2 * INSET - (beside ? picture + GAP : 0)));
      return (beside ? Math.max(picture, word) : picture + GAP + word) + GAP;
    },
  });
  const fit = useFitGrid(fitConfig(false, MIN_PICTURE, MIN_WORD_FONT));

  // The picture is the largest element: it aims for ~42% of the play area (capped at 360px, or 38%
  // on very tall screens). When space is short the word shrinks first, then the tiles, the picture last.
  let sizing: { layout: FitGridLayout; picture: number; font: number; beside: boolean } | null = null;
  if (fit.area) {
    const { width, height } = fit.area;
    const choose = (beside: boolean) => {
      const target = Math.min(Math.max(360, Math.round(height * 0.38)), Math.round(height * 0.42), width - 2 * INSET);
      for (let picture = target; picture >= MIN_PICTURE; picture -= 8) {
        for (let font = MAX_WORD_FONT; font >= MIN_WORD_FONT; font -= 4) {
          const layout = solveFitGrid(width, height, fitConfig(beside, picture, font));
          if (layout.fits && layout.cardWidth >= GOOD_TILE) return { layout, picture, font, beside };
        }
        const layout = solveFitGrid(width, height, fitConfig(beside, picture, MIN_WORD_FONT));
        if (layout.fits) return { layout, picture, font: MIN_WORD_FONT, beside };
      }
      return null;
    };
    // Beside (phone landscape) only when stacked can't fit; then the last-resort scroll.
    sizing = choose(false) ??
      choose(true) ?? {
        layout: solveFitGrid(width, height, fitConfig(true, MIN_PICTURE, MIN_WORD_FONT)),
        picture: MIN_PICTURE,
        font: MIN_WORD_FONT,
        beside: true,
      };
  }

  const activeBlankEl = useRef<HTMLSpanElement | null>(null);
  const { drag, over, bind } = useDrag<TileId, 'blank'>({
    getTargets: () => {
      const rect = activeBlankEl.current?.getBoundingClientRect();
      return rect ? [{ id: 'blank', rect }] : [];
    },
    canDrag: () => phase === 'playing' && !shakeTile && activeBlank >= 0,
    onDrop: dropTile,
    onTap: (id) => {
      // Tiles are only placed by dragging; a tap wiggles to say "drag me".
      setWiggleTile(id);
      later(() => setWiggleTile((cur) => (cur === id ? null : cur)), WIGGLE_MS);
    },
    onReturned: (id, reason) => {
      if (reason !== 'wrong') return;
      setShakeTile(id);
      later(() => setShakeTile(null), SHAKE_MS);
    },
  });

  function dropTile(id: TileId): DropResult {
    const blank = item.parts[activeBlank] as Extract<LetterFormPart, { type: 'blank' }>;
    const correct = TILE_FOR_ANSWER[blank.answer];

    if (id === correct) {
      const next = [...filled];
      next[activeBlank] = blank.fill;
      setFilled(next);
      setPop(true);
      later(() => setPop(false), POP_MS);
      if (item.parts.every((p, i) => p.type !== 'blank' || next[i] != null)) {
        setPhase('holding');
        later(() => {
          if (index + 1 < words.length) {
            setPhase('word-done');
          } else {
            setPhase('finished');
          }
        }, WORD_HOLD_MS);
      }
      return 'correct';
    }

    const key = `${item.id}:${activeBlank}`;
    const count = (misses[key] ?? 0) + 1;
    setMisses({ ...misses, [key]: count });
    if (count === 2) {
      setHintTile(correct);
      later(() => setHintTile((cur) => (cur === correct ? null : cur)), HINT_MS);
    }
    return 'wrong';
  }

  function nextWord() {
    const next = index + 1;
    setIndex(next);
    setFilled(words[next]!.parts.map(() => null));
    setPhase('playing');
  }

  const finished = phase === 'finished';
  const layout = sizing?.layout ?? null;
  const beside = sizing?.beside ?? false;
  const picture = sizing?.picture ?? 0;
  const areaWidth = (fit.area?.width ?? 0) - 2 * INSET - (beside ? picture + GAP : 0);

  let overlay = null;
  if (finished) {
    const totalBlanks = words.reduce((n, w) => n + w.parts.filter((p) => p.type === 'blank').length, 0);
    const stars = starsFor(totalBlanks - Object.keys(misses).length, totalBlanks);
    overlay = (
      <FinalWithConfetti stars={stars} onRestart={() => onRestart(words.map((w) => w.id))} onExit={onExit} />
    );
  }

  return (
    <GameStage
      title={title}
      instruction={instruction}
      progress={{ total: words.length, current: finished ? words.length : index }}
      onClose={onExit}
      playAreaRef={fit.ref}
      scrollable={!finished && layout !== null && !layout.fits}
      rotateHint={!finished && layout !== null && !layout.fits && fit.fitsRotated}
      overlay={overlay}
      overlayOpaque
    >
      {!finished && layout && (
        <div
          className={cn('flex min-h-full flex-col items-center', layout.fits ? 'justify-center' : 'justify-start')}
          style={{ gap: GAP, padding: INSET }}
        >
          <div className={cn('flex items-center', !beside && 'flex-col')} style={{ gap: GAP }}>
            <WordPicture
              key={item.id}
              item={item}
              size={picture}
              pastel={PASTELS[index % PASTELS.length]!}
              failed={failedImages.has(item.id)}
              onError={() => setFailedImages((prev) => new Set([...prev, item.id]))}
              complete={activeBlank < 0}
            />
            <Word
              item={item}
              filled={filled}
              activeBlank={activeBlank}
              font={wordFont(item, sizing!.font, areaWidth)}
              pop={pop}
              blankRef={activeBlankEl}
              over={over}
            />
          </div>

          <div
            className="grid justify-center"
            style={{
              gridTemplateColumns: `repeat(${layout.cols}, ${layout.cardWidth}px)`,
              gridAutoRows: `${layout.cardWidth}px`,
              gap: GAP,
            }}
          >
            {phase === 'word-done' ? (
              <div className="flex items-center justify-center" style={{ gridColumn: '1 / -1' }}>
                <BigButton onClick={nextWord} autoFocus>
                  التَّالِي
                </BigButton>
              </div>
            ) : (
              tileOrders[index]!.map((tile) => (
                <DraggableTile
                  key={tile.id}
                  id={tile.id}
                  drag={drag}
                  bind={bind}
                  data={{
                    'data-tile': tile.id,
                    'data-hint': hintTile === tile.id,
                    'data-wiggle': wiggleTile === tile.id,
                  }}
                  style={{ width: layout.cardWidth, height: layout.cardWidth, fontSize: clamp(layout.cardWidth * 0.5, 48, 96) }}
                  className={cn(
                    'flex cursor-grab items-center justify-center rounded-3xl border-2 border-white bg-white text-vowelled shadow-md',
                    shakeTile === tile.id && 'animate-shake',
                    hintTile === tile.id && 'animate-hint',
                    wiggleTile === tile.id && 'animate-wiggle',
                  )}
                >
                  {tile.form}
                </DraggableTile>
              ))
            )}
          </div>
        </div>
      )}
    </GameStage>
  );
}

/**
 * Display-only picture of the word (not a drop target): the image, or the Noto emoji art if there's
 * none. The art loops gently the whole time and bursts when the word is completed.
 */
function WordPicture({
  item,
  size,
  pastel,
  failed,
  onError,
  complete,
}: {
  item: LetterFormItem;
  size: number;
  pastel: string;
  failed: boolean;
  onError: () => void;
  complete: boolean;
}) {
  const showImage = item.image && !failed;
  return (
    <div
      data-picture={item.id}
      role="img"
      aria-label={item.target}
      className={cn('game-piece flex shrink-0 items-center justify-center overflow-hidden rounded-3xl shadow-md', showImage ? 'bg-white' : pastel, complete && 'animate-pop')}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img src={item.image} alt="" draggable={false} onError={onError} className="pointer-events-none h-full w-full object-contain p-2" />
      ) : (
        <EmojiArt emoji={item.emoji} size={Math.round(size * 0.82)} play loop replay={complete} />
      )}
    </div>
  );
}

/**
 * The worksheet word: dashed boxes for missing letters with a tatweel beside them where the
 * neighbor really connects (طَـ▢ـل); a placed ب joins its neighbors, and a completed word has no tatweel.
 */
function Word({
  item,
  filled,
  activeBlank,
  font,
  pop,
  blankRef,
  over,
}: {
  item: LetterFormItem;
  filled: (string | null)[];
  activeBlank: number;
  font: number;
  pop: boolean;
  blankRef: RefObject<HTMLSpanElement | null>;
  over: boolean;
}) {
  const box = blankBox(font);
  const segments = worksheetSegments(item.parts, filled);
  return (
    <div
      data-word={item.id}
      data-complete={activeBlank < 0}
      className={cn('whitespace-nowrap text-vowelled', pop && 'animate-pop')}
      style={{ fontSize: font, height: wordBlockHeight(font), paddingBlock: 8 }}
    >
      {segments.map((seg, i) =>
        seg.isBlank && seg.text.replaceAll(ZWJ, '') === '' ? (
          <span
            key={seg.key}
            ref={i === activeBlank ? blankRef : undefined}
            data-blank={i}
            data-active={i === activeBlank}
            data-over={i === activeBlank && over}
            aria-label="فَرَاغ"
            className={cn(
              'mx-1 inline-block rounded-2xl border-[3px] border-dashed align-middle transition-colors',
              i !== activeBlank
                ? 'border-slate-300 bg-slate-50/60'
                : over
                  ? 'scale-105 border-emerald-400 bg-emerald-50'
                  : 'border-amber-400 bg-amber-50',
            )}
            style={box}
          />
        ) : (
          // Inline spans (never inline-block) so the ZWJs keep the letters joined.
          <span key={seg.key} className={seg.isBlank ? 'text-pink-400' : undefined}>
            {seg.text}
          </span>
        ),
      )}
    </div>
  );
}

function FinalWithConfetti(props: { stars: 1 | 2 | 3; onRestart: () => void; onExit?: () => void }) {
  // GameFinal celebrates a perfect score itself; this game celebrates every finish.
  const { stars } = props;
  useEffect(() => {
    if (stars < 3) celebrate();
  }, [stars]);
  return <GameFinal {...props} />;
}
