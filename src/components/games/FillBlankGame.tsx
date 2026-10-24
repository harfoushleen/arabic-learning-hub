import { useState } from 'react';
import { getUnit, type FillBlankPart, type FillBlankSentence, type FillBlankWord, type Theme } from '@/data/units';
import { solveFitGrid, useFitGrid, type FitGridConfig, type FitGridLayout } from '@/hooks/useFitGrid';
import { useFontsReady } from '@/hooks/useFontsReady';
import { useTimers } from '@/hooks/useTimers';
import { starsFor } from '@/lib/rounds';
import { textWidth } from '@/lib/textWidth';
import { THEME } from '@/lib/theme';
import { cn, prefersReducedMotion } from '@/lib/utils';
import { BigButton } from './BigButton';
import { DraggableTile } from './drag/DraggableTile';
import { useDrag, type DropResult } from './drag/useDrag';
import { GameFinal } from './GameFinal';
import { GameStage } from './GameStage';
import type { GameProps } from './types';

type BlankPart = Extract<FillBlankPart, { type: 'blank' }>;

const SHAKE_MS = 500;
const FLY_MS = 350;
const WIGGLE_MS = 450;
const POP_MS = 600;
const HINT_MS = 1300;
const FINISH_HOLD_MS = 1200;

const CLOUD_TARGET = 'cloud';

const GAP = 12; // between story, sentences and cloud
const ROW_GAP = 8; // between sentence cards
const INSET = 8;
const PIECE_GAP = 12; // between chips
const BORDER = 3;
const MAX_CONTENT = 1100;
const CARD_PAD_X = 16;
const CARD_PAD_Y = 2;
const BADGE = 36; // the sentence number
const BADGE_GAP = 8;
const MAX_FONT = 48; // sentence text; chips use up to 30px, down to 24px
const MIN_FONT = 28;
const STORY_FONT = 32;
const LINE = 1.8; // text-vowelled line-height
const CLOUD_PAD_X = 28;
const CLOUD_PAD_Y = 12;
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

interface Blank {
  key: string; // `${sentence id}:${part index}`
  part: BlankPart;
}

interface Content {
  sentences: FillBlankSentence[];
  words: FillBlankWord[];
  blanks: Blank[];
}

interface Metrics {
  font: number;
  chipFont: number;
  chipH: number;
  chipW: Record<string, number>;
  blankW: number;
  contentWidth: number;
  sentencesH: number;
  cloudH: number;
}

const blankKey = (sentence: FillBlankSentence, index: number) => `${sentence.id}:${index}`;

/** What a blank shows once locked: its own `fill`, else the word it holds. */
const fillText = (part: BlankPart, wordText: string) => part.fill ?? wordText;

/** Any word can be dropped on any blank, so every blank is as wide as the widest word (or fill). */
function uniformBlankWidth(content: Content, font: number): number {
  const texts = [...content.words.map((w) => w.text), ...content.blanks.flatMap((b) => (b.part.fill ? [b.part.fill] : []))];
  const widest = Math.max(...texts.map((t) => textWidth(t, font)));
  return Math.max(96, Math.ceil(widest * 1.06) + 2 * 14);
}

/** Lines a sentence wraps to in `width` px: greedy by words, a blank counts as one unbreakable word. */
function sentenceLines(sentence: FillBlankSentence, font: number, blankW: number, width: number): number {
  const space = textWidth(' ', font);
  const words: number[] = [];
  let word = 0;
  for (const part of sentence.parts) {
    if (part.type === 'blank') {
      word += blankW + 8; // + its margins
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

/** Sizes for a sentence font: every sentence card at its own height, and the cloud for all the chips. */
function metrics(content: Content, font: number, areaWidth: number): Metrics {
  const contentWidth = Math.min(areaWidth, MAX_CONTENT);
  const textArea = contentWidth - 2 * (CARD_PAD_X + BORDER) - BADGE - BADGE_GAP;
  const blankW = uniformBlankWidth(content, font);
  const lineH = Math.ceil(font * LINE);
  const cardsH = content.sentences.map((s) => sentenceLines(s, font, blankW, textArea) * lineH + 2 * (CARD_PAD_Y + BORDER));
  const sentencesH = cardsH.reduce((sum, h) => sum + h, 0) + (cardsH.length - 1) * ROW_GAP;

  const chipFont = Math.min(30, Math.max(24, Math.round(font * 0.66)));
  const chipH = Math.max(56, Math.ceil(chipFont * LINE)); // tap targets stay ≥ 56px
  const padX = Math.round(chipFont * 0.45);
  const chipW: Record<string, number> = {};
  for (const w of content.words) chipW[w.id] = Math.max(56, Math.ceil(textWidth(w.text, chipFont) * 1.04) + 2 * (padX + BORDER));
  const rows = rowCount(Object.values(chipW), contentWidth - 2 * CLOUD_PAD_X);
  const bodyH = Math.max(rows * chipH + (rows - 1) * PIECE_GAP, BUTTON_H) + 2 * CLOUD_PAD_Y;
  return { font, chipFont, chipH, chipW, blankW, contentWidth, sentencesH, cloudH: PUFF + bodyH };
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

type Phase = 'playing' | 'checking' | 'finished';

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
  // The worksheet's order, never shuffled: sentences as listed, cloud words as listed.
  const content: Content = {
    sentences: data.sentences,
    words: data.words,
    blanks: data.sentences.flatMap((s) =>
      s.parts.flatMap((part, i) => (part.type === 'blank' ? [{ key: blankKey(s, i), part }] : [])),
    ),
  };
  const wordText = (id: string) => data.words.find((w) => w.id === id)!.text;

  const [phase, setPhase] = useState<Phase>('playing');
  const [placed, setPlaced] = useState<Readonly<Record<string, string>>>({}); // blank key → word id
  const [locked, setLocked] = useState<ReadonlySet<string>>(() => new Set()); // blank keys that were right
  const [misses, setMisses] = useState<Readonly<Record<string, number>>>({}); // blank key → wrong checks
  const [firstCorrect, setFirstCorrect] = useState<number | null>(null);
  const [shaking, setShaking] = useState<ReadonlySet<string>>(() => new Set()); // word ids
  const [flying, setFlying] = useState<Readonly<Record<string, { dx: number; dy: number }>>>({});
  const [wiggleChip, setWiggleChip] = useState<string | null>(null);
  const [hintChip, setHintChip] = useState<string | null>(null);
  const [popped, setPopped] = useState<ReadonlySet<string>>(() => new Set()); // blank keys
  const later = useTimers();
  useFontsReady(); // re-measure text once Naskh is loaded

  const total = content.blanks.length;
  const blankOf = new Map(Object.entries(placed).map(([key, id]) => [id, key])); // word id → blank key
  const lockedWords = new Set([...locked].map((key) => placed[key]!));
  const allFilled = content.blanks.every((b) => placed[b.key] !== undefined);
  const showCheck = phase === 'playing' && allFilled;

  // Measuring text is the costly part and every drag move re-renders, so each size is worked out once per render.
  const measured = new Map<string, Metrics>();
  const metricsFor = (font: number, areaWidth: number) => {
    const key = `${font}:${areaWidth}`;
    if (!measured.has(key)) measured.set(key, metrics(content, font, areaWidth));
    return measured.get(key)!;
  };

  const storyH = Math.ceil(STORY_FONT * LINE) + GAP;
  const fitConfig = (font: number, withStory: boolean): FitGridConfig => ({
    count: 1,
    columns: [1],
    gap: 0,
    inset: INSET,
    minWidth: 1,
    maxWidth: 1,
    // The one "card" is story + sentences; the cloud is the reserved height below it.
    cardHeight: (_w, areaWidth) => (withStory ? storyH : 0) + metricsFor(font, areaWidth).sentencesH,
    reserveHeight: (_w, areaWidth) => GAP + metricsFor(font, areaWidth).cloudH,
  });
  const fit = useFitGrid(fitConfig(MIN_FONT, false));

  // The biggest sentence font that fits, with the story; else without it. Nothing fits (phone landscape):
  // smallest sizes and the last-resort scroll.
  let layout: FitGridLayout | null = null;
  let m: Metrics | null = null;
  let showStory = false;
  if (fit.area) {
    const { width, height } = fit.area;
    search: for (const withStory of story ? [true, false] : [false]) {
      for (let font = MAX_FONT; font >= MIN_FONT; font -= 4) {
        layout = solveFitGrid(width, height, fitConfig(font, withStory));
        m = metricsFor(font, width - 2 * INSET);
        showStory = withStory;
        if (layout.fits) break search;
      }
    }
  }

  // Drop targets: every blank that is not locked yet, and the cloud (to take a placed chip back).
  const [targetEls] = useState(() => new Map<string, HTMLElement>());
  const [slotEls] = useState(() => new Map<string, HTMLElement>());
  const setTarget = (key: string) => (el: HTMLElement | null) => {
    if (el) targetEls.set(key, el);
    else targetEls.delete(key);
  };
  const { drag, overId, bind } = useDrag<string, string>({
    getTargets: () => [...targetEls].map(([id, el]) => ({ id, rect: el.getBoundingClientRect() })),
    margin: 12,
    canDrag: (id) => phase === 'playing' && !lockedWords.has(id),
    onDrop: dropChip,
    onTap: (id) => {
      // Words are only placed by dragging; a tap wiggles to say "drag me".
      setWiggleChip(id);
      later(() => setWiggleChip((cur) => (cur === id ? null : cur)), WIGGLE_MS);
    },
  });

  /** No judgment here: an empty blank takes the chip, a filled one swaps, the cloud takes it back. */
  function dropChip(wordId: string, target: string): DropResult {
    const from = blankOf.get(wordId);
    if (target === from) return 'wrong'; // dropped on its own blank: it glides home
    const next = { ...placed };
    if (target === CLOUD_TARGET) {
      if (from === undefined) return 'wrong';
      delete next[from];
    } else {
      const occupant = placed[target];
      next[target] = wordId;
      if (from !== undefined) {
        if (occupant !== undefined) next[from] = occupant; // swap with the blank it came from
        else delete next[from];
      } // else the occupant (if any) returns to the cloud
      setPopped((p) => new Set(p).add(target));
      later(() => setPopped((p) => new Set([...p].filter((k) => k !== target))), POP_MS);
    }
    setPlaced(next);
    setHintChip(null);
    return 'correct';
  }

  function check() {
    if (!showCheck) return;
    setPhase('checking');
    const right = content.blanks.filter((b) => b.part.accept.includes(placed[b.key]!) && !locked.has(b.key));
    const wrong = content.blanks.filter((b) => !b.part.accept.includes(placed[b.key]!) && !locked.has(b.key));
    if (firstCorrect === null) setFirstCorrect(right.length);

    const nextLocked = new Set([...locked, ...right.map((b) => b.key)]);
    setLocked(nextLocked);
    setPopped(new Set(right.map((b) => b.key)));
    later(() => setPopped(new Set()), POP_MS);

    if (wrong.length === 0) {
      later(() => setPhase('finished'), FINISH_HOLD_MS);
      return;
    }

    const nextMisses = { ...misses };
    for (const b of wrong) nextMisses[b.key] = (nextMisses[b.key] ?? 0) + 1;
    setMisses(nextMisses);

    const wrongWords = wrong.map((b) => placed[b.key]!);
    const reduced = prefersReducedMotion();
    setShaking(new Set(wrongWords));
    later(() => {
      setShaking(new Set());
      // Each wrong chip flies from its blank to its own slot in the cloud.
      const flight: Record<string, { dx: number; dy: number }> = {};
      for (const id of wrongWords) {
        const from = document.querySelector(`[data-tile="${id}"]`)?.getBoundingClientRect();
        const to = slotEls.get(id)?.getBoundingClientRect();
        if (from && to) {
          flight[id] = { dx: to.left + to.width / 2 - (from.left + from.width / 2), dy: to.top + to.height / 2 - (from.top + from.height / 2) };
        }
      }
      if (!reduced) setFlying(flight);
      later(() => {
        setPlaced((p) => Object.fromEntries(Object.entries(p).filter(([key]) => !wrong.some((b) => b.key === key))));
        setFlying({});
        setPhase('playing');
        // A blank that is wrong for the second time pulses a chip that fits it.
        const lockedIds = new Set([...nextLocked].map((key) => placed[key]!));
        const twice = wrong.find((b) => nextMisses[b.key] === 2);
        const hint = twice?.part.accept.find((id) => !lockedIds.has(id));
        if (hint) {
          setHintChip(hint);
          later(() => setHintChip((cur) => (cur === hint ? null : cur)), HINT_MS);
        }
      }, reduced ? 0 : FLY_MS);
    }, reduced ? 0 : SHAKE_MS);
  }

  const finished = phase === 'finished';
  let overlay = null;
  if (finished) {
    overlay = <GameFinal stars={starsFor(firstCorrect ?? 0, total)} confetti="always" onRestart={onRestart} onExit={onExit} />;
  }

  /** A chip you can drag: in the cloud at its slot, or sitting in a blank. */
  const chip = (id: string, size: { width: number | string; height: number | string; fontSize: number }, extra?: string) => (
    <DraggableTile
      key={id}
      id={id}
      drag={drag}
      bind={bind}
      data={{
        'data-tile': id,
        'data-hint': hintChip === id,
        'data-wiggle': wiggleChip === id,
        'data-shake': shaking.has(id),
      }}
      style={{
        ...size,
        ...(flying[id] && { transform: `translate(${flying[id].dx}px, ${flying[id].dy}px)`, transition: `transform ${FLY_MS}ms ease-in-out` }),
      }}
      className={cn(
        'flex cursor-grab items-center justify-center whitespace-nowrap rounded-2xl border-[3px] border-white bg-white text-vowelled shadow-md',
        shaking.has(id) && 'animate-shake',
        hintChip === id && 'animate-hint',
        wiggleChip === id && 'animate-wiggle',
        flying[id] && 'relative z-30',
        extra,
      )}
    >
      {wordText(id)}
    </DraggableTile>
  );

  return (
    <GameStage
      title={title}
      instruction={instruction}
      progress={{ total, current: finished ? total : locked.size }}
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
          {story && showStory && (
            <p data-story className={cn('shrink-0 text-center text-vowelled', THEME[storyTheme].ink)} style={{ fontSize: STORY_FONT }}>
              {story}
            </p>
          )}

          {/* All the sentences at once, numbered. Dashed boxes are drop targets; a chip sits in its blank until checked. */}
          <div className="flex shrink-0 flex-col" style={{ width: m.contentWidth, gap: ROW_GAP }}>
            {data.sentences.map((sentence, n) => {
              const complete = content.blanks.filter((b) => b.key.startsWith(`${sentence.id}:`)).every((b) => locked.has(b.key));
              return (
                <div
                  key={sentence.id}
                  data-sentence={sentence.id}
                  data-complete={complete}
                  className={cn(
                    'flex items-center rounded-3xl border-[3px] transition-colors',
                    complete ? 'border-emerald-400 bg-emerald-50' : 'border-white bg-white/70',
                  )}
                  style={{ paddingInline: CARD_PAD_X, paddingBlock: CARD_PAD_Y, gap: BADGE_GAP }}
                >
                  <span
                    aria-hidden
                    data-number={n + 1}
                    className="flex shrink-0 items-center justify-center rounded-full bg-amber-100 text-vowelled text-[22px] text-ink/70"
                    style={{ width: BADGE, height: BADGE, lineHeight: 1 }}
                  >
                    {(n + 1).toLocaleString('ar-EG')}
                  </span>
                  <div className="min-w-0 flex-1 text-center text-vowelled" style={{ fontSize: m.font }}>
                    {sentence.parts.map((part, i) => {
                      if (part.type === 'text') return <span key={i}>{part.value}</span>;
                      // No gap on a side where the text is attached to the word (وَ + name).
                      const prev = sentence.parts[i - 1];
                      const next = sentence.parts[i + 1];
                      const attachedBefore = prev?.type === 'text' && !isSpace(prev.value.at(-1));
                      const attachedAfter = next?.type === 'text' && !isSpace(next.value.at(0));
                      const h = blankHeight(m.font);
                      const box = {
                        width: m.blankW,
                        height: h,
                        marginBlock: -h / 2,
                        marginInlineStart: attachedBefore ? 0 : 4,
                        marginInlineEnd: attachedAfter ? 0 : 4,
                      };
                      const key = blankKey(sentence, i);
                      const wordId = placed[key];

                      if (locked.has(key)) {
                        return (
                          <span
                            key={i}
                            data-blank={key}
                            data-state="locked"
                            data-filled-word={wordId}
                            className={cn(
                              'inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-emerald-100 align-middle text-emerald-900',
                              popped.has(key) && 'animate-pop',
                            )}
                            style={box}
                          >
                            {fillText(part, wordText(wordId!))}
                          </span>
                        );
                      }
                      const over = overId === key;
                      return (
                        <span
                          key={i}
                          ref={setTarget(key)}
                          data-blank={key}
                          data-state={wordId === undefined ? 'empty' : 'filled'}
                          data-filled-word={wordId}
                          data-over={over}
                          aria-label={wordId === undefined ? 'فَرَاغ' : undefined}
                          className={cn(
                            'inline-block rounded-2xl align-middle transition-colors',
                            wordId === undefined && 'border-[3px] border-dashed',
                            over ? 'scale-105 border-emerald-400 bg-emerald-50' : wordId === undefined && 'border-amber-400 bg-amber-50',
                            popped.has(key) && 'animate-pop',
                          )}
                          style={box}
                        >
                          {wordId !== undefined && chip(wordId, { width: '100%', height: '100%', fontSize: m.font })}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* The word cloud: every word keeps its slot, so the order never changes; a placed word leaves a ghost. */}
          <div data-cloud className="relative shrink-0" style={{ width: m.contentWidth, height: m.cloudH }}>
            <Puffs theme={cloudTheme} />
            <div
              ref={setTarget(CLOUD_TARGET)}
              data-over={overId === CLOUD_TARGET}
              className={cn(
                'absolute inset-x-0 bottom-0 flex flex-wrap content-center items-center justify-center rounded-[44px] shadow-[inset_0_-6px_0_rgba(59,58,74,.06)] transition-shadow',
                THEME[cloudTheme].bg,
                overId === CLOUD_TARGET && 'ring-4 ring-emerald-300',
              )}
              style={{ top: PUFF, padding: `${CLOUD_PAD_Y}px ${CLOUD_PAD_X}px`, gap: PIECE_GAP }}
            >
              {data.words.map((word) => (
                <div
                  key={word.id}
                  ref={(el) => {
                    if (el) slotEls.set(word.id, el);
                    else slotEls.delete(word.id);
                  }}
                  data-slot={word.id}
                  className={cn(showCheck && 'invisible')}
                  style={{ width: m.chipW[word.id], height: m.chipH }}
                >
                  {blankOf.has(word.id) ? (
                    <div aria-hidden className="h-full w-full rounded-2xl border-[3px] border-dashed border-white/70" />
                  ) : (
                    chip(word.id, { width: '100%', height: '100%', fontSize: m.chipFont })
                  )}
                </div>
              ))}
              {showCheck && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BigButton onClick={check}>تَحَقَّقْ</BigButton>
                </div>
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
