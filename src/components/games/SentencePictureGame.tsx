import { useCallback, useRef, useState } from 'react';
import { getUnit, type SentencePictureItem } from '@/data/units';
import { solveFitGrid, useFitGrid, type FitGridConfig } from '@/hooks/useFitGrid';
import { useFontsReady } from '@/hooks/useFontsReady';
import { useTimers } from '@/hooks/useTimers';
import { starsFor } from '@/lib/rounds';
import { derange, shuffle } from '@/lib/shuffle';
import { cn } from '@/lib/utils';
import { useDrag, type DragState, type DropResult } from './drag/useDrag';
import { GameFinal } from './GameFinal';
import { GameStage } from './GameStage';
import type { GameProps } from './types';

// Draggable/target keys: `s:<item id>` for a sentence card, `p:<item id>` for a picture card.
// A match is checked by item id, never by comparing Arabic text.
type Key = `s:${string}` | `p:${string}`;
const sKey = (id: string): Key => `s:${id}`;
const pKey = (id: string): Key => `p:${id}`;
const itemId = (key: Key) => key.slice(2);
const isSentence = (key: Key) => key.startsWith('s:');

const SHAKE_MS = 500;
const POP_MS = 600;
const HINT_MS = 1300;
const WIGGLE_MS = 450;
const DONE_DELAY_MS = 900;

const ROW_GAP = 16;
// Gap between the columns (dots + lines). We aim for ~30% of the width so children draw long,
// clear lines, trading at most a quarter of the row height for it (see the gutter search below).
const MIN_GUTTER = 88;
const MAX_GUTTER = 360;
const INSET = 8;
const MAX_CONTENT = 1200;
const MIN_ROW = 96;
const MAX_ROW = 260;
const PAD = 14;
const DOT = 28;
const DOT_HIT = 48;
const LINE = 1.8; // text-vowelled line-height
const MIN_TEXT = 32;
const LINE_COLORS = ['#F9A8D4', '#93C5FD', '#86EFAC', '#FCD34D', '#C4B5FD'];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

let measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, fontPx: number): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * fontPx * 0.6;
  measureCtx.font = `700 ${fontPx}px "Noto Naskh Arabic", serif`;
  return measureCtx.measureText(text).width;
}

/** Lines a sentence wraps to in `width` px (greedy, by words, like the browser). */
function lineCount(text: string, font: number, width: number): number {
  const space = textWidth(' ', font);
  let lines = 1;
  let x = 0;
  for (const word of text.split(/\s+/)) {
    const w = textWidth(word, font) * 1.04;
    if (x > 0 && x + space + w > width) {
      lines++;
      x = w;
    } else {
      x += (x > 0 ? space : 0) + w;
    }
  }
  return lines;
}

/** Row geometry for row height `h` in a content box `contentWidth` wide. */
function rowMetrics(h: number, contentWidth: number, gutter = MIN_GUTTER) {
  const pictureWidth = Math.round((h * 4) / 3);
  const sentenceWidth = contentWidth - pictureWidth - gutter;
  const font = Math.round(clamp(h * 0.2, MIN_TEXT, 44));
  return { h, pictureWidth, sentenceWidth, gutter, font, textWidth: sentenceWidth - 2 * PAD - DOT / 2 };
}

const contentWidthFor = (areaWidth: number) => Math.min(areaWidth - 2 * INSET, MAX_CONTENT);

export default function SentencePictureGame({ unitId, onExit }: GameProps) {
  const [sessionKey, setSessionKey] = useState(0);
  const unit = getUnit(unitId);
  const game = unit?.games.find((g) => g.id === 'sentence-picture');

  if (!unit || !game || unit.sentencePictures.length === 0) {
    return (
      <GameStage onClose={onExit}>
        <p className="p-8 text-center text-vowelled text-3xl">لَا تُوجَدُ جُمَلٌ</p>
      </GameStage>
    );
  }
  return (
    <Session
      key={sessionKey}
      items={unit.sentencePictures}
      title={game.title}
      instruction={game.instruction}
      onRestart={() => setSessionKey((k) => k + 1)}
      onExit={onExit}
    />
  );
}

interface SessionProps {
  items: SentencePictureItem[];
  title: string;
  instruction: string;
  onRestart: () => void;
  onExit?: () => void;
}

interface Point {
  x: number;
  y: number;
}

function Session({ items, title, instruction, onRestart, onExit }: SessionProps) {
  // Sentences and pictures are shuffled independently; deranging the sentence order guarantees no
  // row holds a matching pair.
  const [order] = useState(() => {
    const sentences = shuffle(items);
    return { sentences, pictures: derange(sentences) };
  });
  const [matched, setMatched] = useState<readonly string[]>([]);
  const [wrongTries, setWrongTries] = useState<Readonly<Record<string, number>>>({});
  const [shake, setShake] = useState<Key | null>(null);
  const [wiggle, setWiggle] = useState<Key | null>(null);
  const [hint, setHint] = useState<Key | null>(null);
  const [pop, setPop] = useState<readonly Key[]>([]);
  const [finished, setFinished] = useState(false);
  const later = useTimers();
  const fontsReady = useFontsReady(); // measure sentences with Naskh, not the fallback font

  const longest = (m: ReturnType<typeof rowMetrics>) =>
    Math.max(...items.map((it) => lineCount(it.sentence, m.font, m.textWidth)));
  const textFits = (m: ReturnType<typeof rowMetrics>) =>
    m.textWidth > 0 && Math.ceil(longest(m) * m.font * LINE + 2 * PAD) <= m.h;

  // The fit hook solves for the ROW HEIGHT (its "card width"): a row height fits only if the
  // longest sentence fits in the space the picture and gutter leave. Taller rows mean a wider
  // picture and a narrower sentence, so the search is monotonic.
  const fitConfig = (gutter: number): FitGridConfig => ({
    count: items.length,
    columns: [1],
    gap: ROW_GAP,
    inset: INSET,
    minWidth: MIN_ROW,
    maxWidth: MAX_ROW,
    // areaWidth here already excludes the inset.
    cardHeight: (h, areaWidth) => (textFits(rowMetrics(h, Math.min(areaWidth, MAX_CONTENT), gutter)) ? h : Infinity),
  });
  const fit = useFitGrid(fitConfig(MIN_GUTTER));

  // Card and dot elements, for hit-testing and for drawing the lines.
  const cards = useRef(new Map<Key, HTMLElement>());
  const dotEls = useRef(new Map<Key, HTMLElement>());
  const [geometry, setGeometry] = useState<{ box: DOMRect; dots: Map<Key, Point> } | null>(null);

  // Dots are measured by layout offsets, not getBoundingClientRect, so a bounce or shake running
  // during a resize/rotation can't leave the locked lines a few px off once it ends.
  const measure = useCallback((container: HTMLElement) => {
    const dots = new Map<Key, Point>();
    for (const [key, el] of dotEls.current) {
      const at = offsetWithin(el, container);
      dots.set(key, { x: at.x + el.offsetWidth / 2, y: at.y + el.offsetHeight / 2 });
    }
    setGeometry({ box: container.getBoundingClientRect(), dots });
  }, []);

  // Re-measure whenever the rows box changes size, the device rotates, or (fallback) the area scrolls,
  // so locked lines stay attached to their dots.
  const linesRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const run = () => measure(el);
      const ro = new ResizeObserver(run);
      ro.observe(el);
      window.addEventListener('orientationchange', run);
      window.addEventListener('resize', run);
      window.addEventListener('scroll', run, true);
      return () => {
        ro.disconnect();
        window.removeEventListener('orientationchange', run);
        window.removeEventListener('resize', run);
        window.removeEventListener('scroll', run, true);
      };
    },
    [measure],
  );

  const { drag, overId, bind } = useDrag<Key, Key>({
    margin: 16,
    canDrag: (key) => !finished && !shake && !matched.includes(itemId(key)),
    getTargets: (key) => {
      const out: { id: Key; rect: DOMRect }[] = [];
      for (const [k, el] of cards.current) {
        if (isSentence(k) === isSentence(key) || matched.includes(itemId(k))) continue;
        out.push({ id: k, rect: el.getBoundingClientRect() });
      }
      return out;
    },
    onDrop: dropOn,
    onTap: (key) => {
      setWiggle(key);
      later(() => setWiggle((cur) => (cur === key ? null : cur)), WIGGLE_MS);
    },
    onReturned: (_key, reason, target) => {
      if (reason !== 'wrong' || !target) return;
      setShake(target);
      later(() => setShake(null), SHAKE_MS);
    },
  });

  function dropOn(from: Key, target: Key): DropResult {
    const sentenceId = itemId(isSentence(from) ? from : target);
    const pictureId = itemId(isSentence(from) ? target : from);

    if (sentenceId === pictureId) {
      const next = [...matched, sentenceId];
      setMatched(next);
      setPop([sKey(sentenceId), pKey(sentenceId)]);
      later(() => setPop([]), POP_MS);
      if (next.length === items.length) later(() => setFinished(true), DONE_DELAY_MS);
      return 'correct';
    }

    const count = (wrongTries[sentenceId] ?? 0) + 1;
    setWrongTries({ ...wrongTries, [sentenceId]: count });
    if (count === 2) {
      const correct = pKey(sentenceId);
      setHint(correct);
      later(() => setHint((cur) => (cur === correct ? null : cur)), HINT_MS);
    }
    return 'wrong';
  }

  // Widest gutter (up to ~30% of the width) whose fit keeps rows at >= 75% of the largest height.
  const sized = (() => {
    const base = fit.layout;
    const area = fit.area;
    if (!fontsReady || !base || !area) return null;
    const contentWidth = contentWidthFor(area.width);
    if (base.fits) {
      const target = Math.round(clamp(contentWidth * 0.3, MIN_GUTTER, MAX_GUTTER));
      for (let g = target; g > MIN_GUTTER; g -= 8) {
        const wider = solveFitGrid(area.width, area.height, fitConfig(g));
        if (wider.fits && wider.cardWidth >= base.cardWidth * 0.75) {
          return { layout: wider, m: rowMetrics(wider.cardWidth, contentWidth, g) };
        }
      }
    }
    return { layout: base, m: rowMetrics(base.cardWidth, contentWidth) };
  })();
  const layout = sized?.layout ?? null;
  const m = sized?.m ?? null;

  let overlay = null;
  if (finished) {
    const stars = starsFor(items.length - Object.keys(wrongTries).length, items.length);
    overlay = <GameFinal stars={stars} onRestart={onRestart} onExit={onExit} confetti="always" />;
  }

  const registerCard = (key: Key) => (el: HTMLElement | null) => {
    if (el) cards.current.set(key, el);
    else cards.current.delete(key);
  };
  const registerDot = (key: Key) => (el: HTMLElement | null) => {
    if (el) dotEls.current.set(key, el);
    else dotEls.current.delete(key);
  };

  const cardState = (key: Key) => ({
    matched: matched.includes(itemId(key)),
    className: cn(
      'game-piece relative flex shrink-0 touch-none select-none items-center rounded-3xl border-[3px] shadow-md transition-colors [-webkit-touch-callout:none]',
      matched.includes(itemId(key))
        ? 'cursor-default border-emerald-300 shadow-[0_0_0_3px_rgb(167_243_208)]'
        : overId === key
          ? 'cursor-grab border-amber-400'
          : 'cursor-grab border-white',
      pop.includes(key) && 'animate-pop',
      shake === key && 'animate-shake',
      hint === key && 'animate-hint',
      wiggle === key && 'animate-wiggle',
    ),
    data: {
      'data-matched': matched.includes(itemId(key)),
      'data-over': overId === key,
      'data-hint': hint === key,
      'data-wiggle': wiggle === key,
      'data-shake': shake === key,
    },
  });

  return (
    <GameStage
      title={title}
      instruction={instruction}
      progress={{ total: items.length, current: finished ? items.length : matched.length }}
      onClose={onExit}
      playAreaRef={fit.ref}
      scrollable={layout !== null && !layout.fits}
      rotateHint={layout !== null && !layout.fits && fit.fitsRotated}
      overlay={overlay}
      overlayOpaque
    >
      {layout && m && !finished && (
        <div
          className={cn('flex min-h-full flex-col items-center', layout.fits ? 'justify-center' : 'justify-start')}
          style={{ padding: INSET }}
        >
          <div ref={linesRef} className="relative flex flex-col" style={{ gap: ROW_GAP }} data-rows>
            {order.sentences.map((sentence, row) => {
              const picture = order.pictures[row]!;
              const s = sKey(sentence.id);
              const p = pKey(picture.id);
              const sState = cardState(s);
              const pState = cardState(p);
              return (
                <div
                  key={sentence.id}
                  data-row={row}
                  data-row-sentence={sentence.id}
                  data-row-picture={picture.id}
                  className="flex items-center"
                  style={{ gap: m.gutter, [layout.fits ? 'height' : 'minHeight']: m.h }}
                >
                  {/* Sentence: RTL start (right). Its dot faces the gutter (left edge). */}
                  <div
                    ref={registerCard(s)}
                    role="button"
                    tabIndex={-1}
                    aria-label={sentence.sentence}
                    data-sentence={sentence.id}
                    {...sState.data}
                    {...bind(s)}
                    className={cn(sState.className, 'bg-white')}
                    style={{
                      width: m.sentenceWidth,
                      [layout.fits ? 'height' : 'minHeight']: m.h,
                      paddingBlock: PAD,
                      paddingInlineStart: PAD,
                      paddingInlineEnd: PAD + DOT / 2,
                    }}
                  >
                    <p className="text-vowelled" style={{ fontSize: m.font }}>
                      {sentence.sentence}
                    </p>
                    <Dot dotKey={s} refFn={registerDot(s)} side="left" matched={sState.matched} />
                  </div>

                  {/* Picture: left column. Its dot faces the gutter (right edge). */}
                  <div
                    ref={registerCard(p)}
                    role="button"
                    tabIndex={-1}
                    aria-label={picture.sentence}
                    data-picture={picture.id}
                    {...pState.data}
                    {...bind(p)}
                    className={cn(pState.className, 'justify-center bg-pastel-blue')}
                    style={{ width: m.pictureWidth, height: m.h }}
                  >
                    <img
                      src={picture.image}
                      alt={picture.sentence}
                      draggable={false}
                      className="pointer-events-none h-full w-full rounded-[1.25rem] object-contain p-1"
                    />
                    <Dot dotKey={p} refFn={registerDot(p)} side="right" matched={pState.matched} />
                  </div>
                </div>
              );
            })}

            <Lines
              geometry={geometry}
              matched={matched}
              rowOf={(id) => order.sentences.findIndex((it) => it.id === id)}
              drag={drag}
            />
          </div>
        </div>
      )}
    </GameStage>
  );
}

/** Layout position of `el` inside `container` (ignores CSS transforms). */
function offsetWithin(el: HTMLElement, container: HTMLElement): Point {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== container) {
    x += node.offsetLeft + node.clientLeft;
    y += node.offsetTop + node.clientTop;
    node = node.offsetParent as HTMLElement | null;
  }
  // clientLeft/Top add each ancestor's border; the element's own border isn't part of its offset.
  return { x: x - el.clientLeft, y: y - el.clientTop };
}

/** Connection dot on a card's gutter edge: 28px visible inside a 48px touch area. */
function Dot({
  dotKey,
  refFn,
  side,
  matched,
}: {
  dotKey: Key;
  refFn: (el: HTMLElement | null) => void;
  side: 'left' | 'right';
  matched: boolean;
}) {
  return (
    <span
      aria-hidden
      className="absolute z-10 flex items-center justify-center"
      style={{ width: DOT_HIT, height: DOT_HIT, top: `calc(50% - ${DOT_HIT / 2}px)`, [side]: -DOT_HIT / 2 }}
    >
      <span
        ref={refFn}
        data-dot={dotKey}
        className={cn('rounded-full border-4 border-white shadow', matched ? 'bg-emerald-400' : 'bg-amber-400')}
        style={{ width: DOT, height: DOT }}
      />
    </span>
  );
}

/** S-curve between two points, leaving and arriving horizontally (across the gutter). */
function curve(a: Point, b: Point) {
  const c = (b.x - a.x) / 2;
  return `M ${a.x} ${a.y} C ${a.x + c} ${a.y}, ${b.x - c} ${b.y}, ${b.x} ${b.y}`;
}

function Lines({
  geometry,
  matched,
  rowOf,
  drag,
}: {
  geometry: { box: DOMRect; dots: Map<Key, Point> } | null;
  matched: readonly string[];
  rowOf: (id: string) => number;
  drag: DragState<Key, Key> | null;
}) {
  if (!geometry) return null;
  const { box, dots } = geometry;
  const from = drag ? dots.get(drag.id) : undefined;
  const pointer = drag ? { x: drag.startX + drag.dx - box.left, y: drag.startY + drag.dy - box.top } : undefined;

  return (
    <svg data-lines className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" aria-hidden>
      {matched.map((id) => {
        const a = dots.get(sKey(id));
        const b = dots.get(pKey(id));
        if (!a || !b) return null;
        return (
          <path
            key={id}
            data-line={id}
            data-x1={a.x}
            data-y1={a.y}
            data-x2={b.x}
            data-y2={b.y}
            d={curve(a, b)}
            fill="none"
            stroke={LINE_COLORS[rowOf(id) % LINE_COLORS.length]}
            strokeWidth={8}
            strokeLinecap="round"
          />
        );
      })}
      {drag && from && pointer && (drag.dx !== 0 || drag.dy !== 0) && (
        <path
          key={drag.returning ? 'retract' : 'live'}
          data-live-line={drag.returning ? 'retracting' : 'live'}
          d={curve(from, pointer)}
          fill="none"
          stroke="#FBBF24"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={drag.returning ? '1 1' : undefined}
          pathLength={1}
          className={drag.returning ? 'animate-retract' : undefined}
        />
      )}
    </svg>
  );
}
