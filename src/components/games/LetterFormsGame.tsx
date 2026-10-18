import { useEffect, useState } from 'react';
import { getUnit, type LetterForm, type LetterFormItem, type LetterFormPart } from '@/data/units';
import { useFitGrid } from '@/hooks/useFitGrid';
import { useFontsReady } from '@/hooks/useFontsReady';
import { useTimers } from '@/hooks/useTimers';
import { joinedSegments, ZWJ } from '@/lib/arabicJoining';
import { celebrate } from '@/lib/celebrate';
import { starsFor } from '@/lib/rounds';
import { shuffle, shuffleAvoiding } from '@/lib/shuffle';
import { cn } from '@/lib/utils';
import { BigButton } from './BigButton';
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
const POP_MS = 600;
const HINT_MS = 1300;
const WORD_HOLD_MS = 1200;

const GAP = 24;
const INSET = 8;
const MIN_TILE = 80;
const MAX_TILE = 200;
const LINE = 1.8; // text-vowelled line-height

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

let measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, fontPx: number): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * fontPx * 0.6;
  measureCtx.font = `700 ${fontPx}px "Noto Naskh Arabic", serif`;
  return measureCtx.measureText(text).width;
}

const blankBox = (font: number) => ({ width: Math.max(64, Math.round(font * 0.95)), height: Math.max(72, Math.round(font * 1.35)) });

/** Word font for a tile width, shrunk if the word (blanks drawn as boxes) wouldn't fit the row. */
function wordFont(item: LetterFormItem, tile: number, areaWidth: number): number {
  let font = Math.round(clamp(tile * 0.7, 44, 110));
  const text = item.parts.map((p) => (p.type === 'text' ? p.value : p.fill)).join('');
  const blanks = item.parts.filter((p) => p.type === 'blank').length;
  const width = textWidth(text, font) * 1.08 + blanks * (blankBox(font).width + 8);
  if (width > areaWidth) font = Math.max(36, Math.floor((font * areaWidth) / width));
  return font;
}

/** Height reserved for the word: one line of text or a blank box, whichever is taller, plus room for marks. */
const wordBlockHeight = (font: number) => Math.max(Math.ceil(font * LINE), blankBox(font).height) + 16;

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
  const [hintTile, setHintTile] = useState<TileId | null>(null);
  const [pop, setPop] = useState(false);
  const [misses, setMisses] = useState<Readonly<Record<string, number>>>({});
  const later = useTimers();
  useFontsReady(); // re-measure word width once Naskh is loaded

  const item = words[index]!;
  const activeBlank = item.parts.findIndex((p, i) => p.type === 'blank' && filled[i] == null);

  const fit = useFitGrid({
    count: TILES.length,
    gap: GAP,
    inset: INSET,
    minWidth: MIN_TILE,
    maxWidth: MAX_TILE,
    cardHeight: (w) => w,
    reserveHeight: (w, areaWidth) => GAP + wordBlockHeight(wordFont(item, w, areaWidth - 2 * INSET)),
  });

  function tapTile(id: TileId) {
    if (phase !== 'playing' || shakeTile || activeBlank < 0) return;
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
      return;
    }

    const key = `${item.id}:${activeBlank}`;
    const count = (misses[key] ?? 0) + 1;
    setMisses({ ...misses, [key]: count });
    setShakeTile(id);
    later(() => setShakeTile(null), SHAKE_MS);
    if (count === 2) {
      setHintTile(correct);
      later(() => setHintTile((cur) => (cur === correct ? null : cur)), HINT_MS);
    }
  }

  function nextWord() {
    const next = index + 1;
    setIndex(next);
    setFilled(words[next]!.parts.map(() => null));
    setPhase('playing');
  }

  const finished = phase === 'finished';
  const layout = fit.layout;
  const areaWidth = (fit.area?.width ?? 0) - 2 * INSET;

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
          <Word
            item={item}
            filled={filled}
            activeBlank={activeBlank}
            font={wordFont(item, layout.cardWidth, areaWidth)}
            pop={pop}
          />

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
                <button
                  key={tile.id}
                  type="button"
                  data-tile={tile.id}
                  onClick={() => tapTile(tile.id)}
                  disabled={phase !== 'playing'}
                  style={{ width: layout.cardWidth, height: layout.cardWidth, fontSize: clamp(layout.cardWidth * 0.5, 48, 96) }}
                  className={cn(
                    'game-piece flex items-center justify-center rounded-3xl border-2 border-white bg-white text-vowelled shadow-md transition-transform active:scale-95',
                    shakeTile === tile.id && 'animate-shake',
                    hintTile === tile.id && 'animate-hint',
                  )}
                >
                  {tile.form}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </GameStage>
  );
}

/** The worksheet word: text as written, dashed boxes for missing letters, joined once a ب is placed. */
function Word({
  item,
  filled,
  activeBlank,
  font,
  pop,
}: {
  item: LetterFormItem;
  filled: (string | null)[];
  activeBlank: number;
  font: number;
  pop: boolean;
}) {
  const box = blankBox(font);
  // joinedSegments adds ZWJs only next to letters that are actually there, so empty blanks never
  // reveal how the missing ب connects.
  const segments = joinedSegments(item.parts, filled);
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
            data-blank={i}
            data-active={i === activeBlank}
            aria-label="فَرَاغ"
            className={cn(
              'mx-1 inline-block rounded-2xl border-[3px] border-dashed align-middle transition-colors',
              i === activeBlank ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-50/60',
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
