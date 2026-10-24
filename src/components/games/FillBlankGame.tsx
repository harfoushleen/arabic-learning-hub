import { useRef, useState } from 'react';
import { getUnit, type FillBlankPart, type FillBlankSentence, type FillBlankWord, type Theme } from '@/data/units';
import { solveFitGrid, useFitGrid, type FitGridConfig, type FitGridLayout } from '@/hooks/useFitGrid';
import { useFontsReady } from '@/hooks/useFontsReady';
import { useTimers } from '@/hooks/useTimers';
import { starsFor } from '@/lib/rounds';
import { shuffle, shuffleAvoiding } from '@/lib/shuffle';
import { textWidth } from '@/lib/textWidth';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { BigButton } from './BigButton';
import { DraggableTile } from './drag/DraggableTile';
import { useDrag, type DropResult } from './drag/useDrag';
import { GameFinal } from './GameFinal';
import { GameStage } from './GameStage';
import type { GameProps } from './types';

type BlankPart = Extract<FillBlankPart, { type: 'blank' }>;

const SHAKE_MS = 500;
const WIGGLE_MS = 450;
const POP_MS = 600;
const HINT_MS = 1300;
const SENTENCE_HOLD_MS = 1200;

const GAP = 16; // between story, sentence and cloud
const INSET = 8;
const PIECE_GAP = 12; // between chips
const BORDER = 3;
const MAX_CONTENT = 1100;
const CARD_PAD_X = 24;
const CARD_PAD_Y = 12;
const MAX_FONT = 48; // sentence text; chips use up to 30px, down to 24px
const MIN_FONT = 32;
const STORY_FONT = 32;
const LINE = 1.8; // text-vowelled line-height
const CLOUD_PAD_X = 28;
const CLOUD_PAD_Y = 18;
const PUFF = 26; // the cloud's bumps stand this far above its body
const BUTTON_H = 64; // BigButton min height

const rowCount = (widths: number[], max: number): number => {
  let rows = 1;
  let used = 0;
  for (const w of widths) {
    if (used > 0 && used + PIECE_GAP + w > max) {
      rows++;
      used = w;
    } else {
      used += (used > 0 ? PIECE_GAP : 0) + w;
    }
  }
  return rows;
};

const isSpace = (ch: string | undefined) => ch !== undefined && /\s/.test(ch);

/** A blank box is `blankHeight(font)` tall; its margins cancel that out so it never grows the line. */
const blankHeight = (font: number) => Math.max(56, Math.round(font * 1.3));

interface Metrics {
  font: number;
  chipFont: number;
  chipH: number;
  chipW: Record<string, number>;
  contentWidth: number;
  sentenceH: number;
  cloudW: number;
  cloudH: number;
}

interface Content {
  sentences: FillBlankSentence[];
  words: FillBlankWord[];
  text: (wordId: string) => string;
}

/** What a blank shows once filled with `wordId`: its own `fill`, else the word's text. */
const fillText = (content: Content, part: BlankPart, wordId: string) => part.fill ?? content.text(wordId);

/** Width of a blank box (and of the word that fills it): the widest thing that can go in it. */
function blankWidth(content: Content, part: BlankPart, font: number): number {
  const widest = Math.max(...part.accept.map((id) => textWidth(fillText(content, part, id), font)));
  return Math.max(96, Math.ceil(widest * 1.06) + 2 * 14);
}

/** Lines a sentence wraps to in `width` px: greedy by words, a blank counts as one unbreakable word. */
function sentenceLines(content: Content, sentence: FillBlankSentence, font: number, width: number): number {
  const space = textWidth(' ', font);
  const words: number[] = [];
  let word = 0;
  for (const part of sentence.parts) {
    if (part.type === 'blank') {
      word += blankWidth(content, part, font) + 8; // + its margins
      continue;
    }
    for (const piece of part.value.split(/(\s+)/)) {
      if (piece === '') continue;
      if (/^\s+$/.test(piece)) {
        if (word > 0) words.push(word);
        word = 0;
      } else {
        word += textWidth(piece, font) * 1.04;
      }
    }
  }
  if (word > 0) words.push(word);

  let lines = 1;
  let used = 0;
  for (const w of words) {
    if (used > 0 && used + space + w > width) {
      lines++;
      used = w;
    } else {
      used += (used > 0 ? space : 0) + w;
    }
  }
  return lines;
}

/** Sizes for a sentence font: the sentence card for the worst-case sentence, the cloud for all the chips. */
function metrics(content: Content, font: number, areaWidth: number): Metrics {
  const contentWidth = Math.min(areaWidth, MAX_CONTENT);
  const textArea = contentWidth - 2 * (CARD_PAD_X + BORDER);
  const lines = Math.max(...content.sentences.map((s) => sentenceLines(content, s, font, textArea)));
  const sentenceH = lines * Math.ceil(font * LINE) + 2 * (CARD_PAD_Y + BORDER);

  const chipFont = Math.min(30, Math.max(24, Math.round(font * 0.66)));
  const chipH = Math.max(56, Math.ceil(chipFont * LINE)); // tap targets stay ≥ 56px
  const padX = Math.round(chipFont * 0.45);
  const chipW: Record<string, number> = {};
  for (const w of content.words) chipW[w.id] = Math.max(56, Math.ceil(textWidth(w.text, chipFont) * 1.04) + 2 * (padX + BORDER));
  const rows = rowCount(Object.values(chipW), contentWidth - 2 * CLOUD_PAD_X);
  const bodyH = Math.max(rows * chipH + (rows - 1) * PIECE_GAP, BUTTON_H) + 2 * CLOUD_PAD_Y;
  return { font, chipFont, chipH, chipW, contentWidth, sentenceH, cloudW: contentWidth, cloudH: PUFF + bodyH };
}

export default function FillBlankGame({ unitId, onExit }: GameProps) {
  const [session, setSession] = useState(0);
  const unit = getUnit(unitId);
  const game = unit?.games.find((g) => g.id === 'fill-blank');
  const data = unit?.fillBlank;

  if (!unit || !game || !data || data.sentences.length === 0) {
    return (
      <GameStage onClose={onExit}>
        <p className="p-8 text-center text-vowelled text-3xl">لَا تُوجَدُ جُمَلٌ</p>
      </GameStage>
    );
  }
  return (
    <Session
      key={session}
      data={data}
      story={unit.story}
      storyTheme={unit.theme}
      cloudTheme={game.theme}
      title={game.title}
      instruction={game.instruction}
      onRestart={() => setSession((s) => s + 1)}
      onExit={onExit}
    />
  );
}

type Phase = 'playing' | 'holding' | 'sentence-done' | 'finished';

interface SessionProps {
  data: { words: FillBlankWord[]; sentences: FillBlankSentence[] };
  story?: string;
  storyTheme: Theme;
  cloudTheme: Theme;
  title: string;
  instruction: string;
  onRestart: () => void;
  onExit?: () => void;
}

function Session({ data, story, storyTheme, cloudTheme, title, instruction, onRestart, onExit }: SessionProps) {
  // Fresh sentence order and chip order on every open and replay; the cloud never starts in the order
  // the blanks come in.
  const [sentences] = useState(() => shuffle(data.sentences));
  const [cloud] = useState(() => {
    const taken = new Set<string>();
    const answerOrder = sentences.flatMap((s) =>
      s.parts.flatMap((p) => {
        if (p.type !== 'blank') return [];
        const id = p.accept.find((a) => !taken.has(a)) ?? p.accept[0]!;
        taken.add(id);
        return [data.words.find((w) => w.id === id)!];
      }),
    );
    return shuffleAvoiding(data.words, answerOrder);
  });
  const content: Content = {
    sentences,
    words: data.words,
    text: (id) => data.words.find((w) => w.id === id)!.text,
  };

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [filled, setFilled] = useState<Readonly<Record<number, string>>>({}); // part index → word id, this sentence
  const [used, setUsed] = useState<ReadonlySet<string>>(() => new Set()); // word ids placed so far, all sentences
  const [shakeChip, setShakeChip] = useState<string | null>(null);
  const [wiggleChip, setWiggleChip] = useState<string | null>(null);
  const [hintChip, setHintChip] = useState<string | null>(null);
  const [popBlank, setPopBlank] = useState<number | null>(null);
  const [misses, setMisses] = useState<Readonly<Record<string, number>>>({});
  const later = useTimers();
  useFontsReady(); // re-measure text once Naskh is loaded

  const sentence = sentences[index]!;
  const storyH = story ? Math.ceil(STORY_FONT * LINE) + GAP : 0;

  // Measuring text is the costly part and every drag move re-renders, so each size is worked out once per render.
  const measured = new Map<string, Metrics>();
  const metricsFor = (font: number, areaWidth: number) => {
    const key = `${font}:${areaWidth}`;
    if (!measured.has(key)) measured.set(key, metrics(content, font, areaWidth));
    return measured.get(key)!;
  };

  const fitConfig = (font: number): FitGridConfig => ({
    count: 1,
    columns: [1],
    gap: 0,
    inset: INSET,
    minWidth: 1,
    maxWidth: 1,
    // The one "card" is story + sentence; the cloud is the reserved height below it.
    cardHeight: (_w, areaWidth) => storyH + metricsFor(font, areaWidth).sentenceH,
    reserveHeight: (_w, areaWidth) => GAP + metricsFor(font, areaWidth).cloudH,
  });
  const fit = useFitGrid(fitConfig(MIN_FONT));

  // The biggest sentence font that fits; chips scale with it. Nothing fits (phone landscape): smallest
  // sizes and the last-resort scroll.
  let layout: FitGridLayout | null = null;
  let m: Metrics | null = null;
  if (fit.area) {
    const { width, height } = fit.area;
    for (let font = MAX_FONT; font >= MIN_FONT; font -= 4) {
      layout = solveFitGrid(width, height, fitConfig(font));
      m = metricsFor(font, width - 2 * INSET);
      if (layout.fits) break;
    }
  }

  // Every unfilled blank of the sentence is a drop target.
  const blankEls = useRef(new Map<string, HTMLElement>());
  const { drag, overId, bind } = useDrag<string, string>({
    getTargets: () => [...blankEls.current].map(([id, el]) => ({ id, rect: el.getBoundingClientRect() })),
    margin: 12,
    canDrag: (id) => phase === 'playing' && !shakeChip && !used.has(id),
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

  function dropChip(wordId: string, target: string): DropResult {
    const at = Number(target);
    const part = sentence.parts[at];
    if (part?.type !== 'blank') return 'wrong';

    if (part.accept.includes(wordId) && !used.has(wordId)) {
      const nextFilled = { ...filled, [at]: wordId };
      setFilled(nextFilled);
      setUsed(new Set(used).add(wordId));
      setHintChip(null);
      setPopBlank(at);
      later(() => setPopBlank((cur) => (cur === at ? null : cur)), POP_MS);
      if (sentence.parts.every((p, i) => p.type !== 'blank' || nextFilled[i] !== undefined)) {
        setPhase('holding');
        later(() => setPhase(index + 1 < sentences.length ? 'sentence-done' : 'finished'), SENTENCE_HOLD_MS);
      }
      return 'correct';
    }

    // The chip glides back and shakes; the second miss on a blank pulses a chip that fits it.
    const key = `${sentence.id}:${at}`;
    const count = (misses[key] ?? 0) + 1;
    setMisses({ ...misses, [key]: count });
    if (count === 2) {
      const correct = part.accept.find((id) => !used.has(id));
      if (correct) {
        setHintChip(correct);
        later(() => setHintChip((cur) => (cur === correct ? null : cur)), HINT_MS);
      }
    }
    return 'wrong';
  }

  function nextSentence() {
    setIndex(index + 1);
    setFilled({});
    setPhase('playing');
  }

  const finished = phase === 'finished';
  const complete = phase !== 'playing';

  let overlay = null;
  if (finished) {
    const total = sentences.reduce((n, s) => n + s.parts.filter((p) => p.type === 'blank').length, 0);
    const stars = starsFor(total - Object.keys(misses).length, total);
    overlay = <GameFinal stars={stars} confetti="always" onRestart={onRestart} onExit={onExit} />;
  }

  return (
    <GameStage
      title={title}
      instruction={instruction}
      progress={{ total: sentences.length, current: finished ? sentences.length : index }}
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
          {story && (
            <p data-story className={cn('shrink-0 text-center text-vowelled', THEME[storyTheme].ink)} style={{ fontSize: STORY_FONT }}>
              {story}
            </p>
          )}

          {/* The sentence: dashed boxes are the drop targets; a filled one shows the word in place. */}
          <div
            data-sentence={sentence.id}
            data-complete={complete}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-3xl border-[3px] transition-colors',
              complete ? 'border-emerald-400 bg-emerald-50 shadow-[0_0_0_6px_rgb(167_243_208)]' : 'border-white bg-white/70',
            )}
            style={{ width: m.contentWidth, height: m.sentenceH }}
          >
            <p className="text-center text-vowelled" style={{ fontSize: m.font, paddingInline: CARD_PAD_X }}>
              {sentence.parts.map((part, i) => {
                if (part.type === 'text') return <span key={i}>{part.value}</span>;
                // No gap on a side where the text is attached to the word (وَ + name).
                const prev = sentence.parts[i - 1];
                const next = sentence.parts[i + 1];
                const attachedBefore = prev?.type === 'text' && !isSpace(prev.value.at(-1));
                const attachedAfter = next?.type === 'text' && !isSpace(next.value.at(0));
                const h = blankHeight(m.font);
                const box = {
                  width: blankWidth(content, part, m.font),
                  height: h,
                  marginBlock: -h / 2,
                  marginInlineStart: attachedBefore ? 0 : 4,
                  marginInlineEnd: attachedAfter ? 0 : 4,
                };
                const wordId = filled[i];
                return wordId !== undefined ? (
                  <span
                    key={i}
                    data-filled={i}
                    data-filled-word={wordId}
                    className={cn(
                      'inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-emerald-100 align-middle text-emerald-900',
                      popBlank === i && 'animate-pop',
                    )}
                    style={box}
                  >
                    {fillText(content, part, wordId)}
                  </span>
                ) : (
                  <span
                    key={i}
                    ref={(el) => {
                      if (el) blankEls.current.set(String(i), el);
                      else blankEls.current.delete(String(i));
                    }}
                    data-blank={i}
                    data-over={overId === String(i)}
                    aria-label="فَرَاغ"
                    className={cn(
                      'inline-block rounded-2xl border-[3px] border-dashed align-middle transition-colors',
                      overId === String(i) ? 'scale-105 border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50',
                    )}
                    style={box}
                  />
                );
              })}
            </p>
          </div>

          {/* The word cloud: every word not used yet, across all the sentences. */}
          <div data-cloud className="relative shrink-0" style={{ width: m.cloudW, height: m.cloudH }}>
            <Puffs theme={cloudTheme} />
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 flex flex-wrap content-center items-center justify-center rounded-[44px] shadow-[inset_0_-6px_0_rgba(59,58,74,.06)]',
                THEME[cloudTheme].bg,
              )}
              style={{ top: PUFF, padding: `${CLOUD_PAD_Y}px ${CLOUD_PAD_X}px`, gap: PIECE_GAP }}
            >
              {phase === 'sentence-done' ? (
                <BigButton onClick={nextSentence} autoFocus>
                  التَّالِي
                </BigButton>
              ) : (
                cloud
                  .filter((word) => !used.has(word.id))
                  .map((word) => (
                    <DraggableTile
                      key={word.id}
                      id={word.id}
                      drag={drag}
                      bind={bind}
                      data={{
                        'data-tile': word.id,
                        'data-hint': hintChip === word.id,
                        'data-wiggle': wiggleChip === word.id,
                        'data-shake': shakeChip === word.id,
                      }}
                      style={{ width: m.chipW[word.id], height: m.chipH, fontSize: m.chipFont }}
                      className={cn(
                        'flex cursor-grab items-center justify-center whitespace-nowrap rounded-2xl border-[3px] border-white bg-white text-vowelled shadow-md',
                        shakeChip === word.id && 'animate-shake',
                        hintChip === word.id && 'animate-hint',
                        wiggleChip === word.id && 'animate-wiggle',
                      )}
                    >
                      {word.text}
                    </DraggableTile>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </GameStage>
  );
}

/** The bumps along the top edge that make the cloud's body read as a cloud. */
const PUFFS = [
  { x: 14, d: 40 },
  { x: 36, d: 52 },
  { x: 62, d: 46 },
  { x: 84, d: 38 },
];

function Puffs({ theme }: { theme: Theme }) {
  return (
    <>
      {PUFFS.map(({ x, d }) => (
        <span
          key={x}
          aria-hidden
          className={cn('pointer-events-none absolute rounded-full', THEME[theme].bg)}
          style={{ left: `${x}%`, top: PUFF - d / 2 + 4, width: d, height: d, transform: 'translateX(-50%)' }}
        />
      ))}
    </>
  );
}
