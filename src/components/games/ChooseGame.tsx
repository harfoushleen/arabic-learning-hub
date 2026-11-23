import { useState } from 'react';
import { EmojiArt } from '@/components/EmojiArt';
import { getUnit, type ChooseOption, type ChooseQuestion } from '@/data/units';
import { celebrate } from '@/lib/celebrate';
import { useTimers } from '@/hooks/useTimers';
import { starsFor } from '@/lib/rounds';
import { shuffleAvoiding } from '@/lib/shuffle';
import { cn } from '@/lib/utils';
import { GameFinal } from './GameFinal';
import { GameStage } from './GameStage';
import type { GameProps } from './types';

const SHAKE_MS = 500;
const NEXT_MS = 1900; // long enough to see the confetti and the green answer
const BLANK = /ـ+/; // the stem's blank (ـــ)

export default function ChooseGame({ unitId, gameId = 'choose', onExit }: GameProps) {
  const [sessionKey, setSessionKey] = useState(0);
  const unit = getUnit(unitId);
  const game = unit?.games.find((g) => g.id === gameId);
  const questions = gameId === 'demonstratives' ? unit?.demonstratives : unit?.choose;
  if (!unit || !game || !questions?.length) {
    return (
      <GameStage onClose={onExit}>
        <p className="p-8 text-center text-vowelled text-3xl">لَا تُوجَدُ أَسْئِلَةٌ</p>
      </GameStage>
    );
  }
  return (
    <Session
      key={sessionKey}
      questions={questions}
      title={game.title}
      instruction={game.instruction}
      onRestart={() => setSessionKey((k) => k + 1)}
      onExit={onExit}
    />
  );
}

interface SessionProps {
  questions: ChooseQuestion[];
  title: string;
  instruction: string;
  onRestart: () => void;
  onExit?: () => void;
}

function Session({ questions, title, instruction, onRestart, onExit }: SessionProps) {
  // Questions keep the worksheet (story) order; the options are shuffled on every open and replay,
  // and never left in the data's order.
  const [optionOrders] = useState(() => questions.map((q) => shuffleAvoiding(q.options, q.options)));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null); // the correct option, once chosen
  const [wrong, setWrong] = useState<ReadonlySet<string>>(() => new Set()); // options already tried on this question
  const [shaking, setShaking] = useState<string | null>(null);
  const [missed, setMissed] = useState<ReadonlySet<string>>(() => new Set()); // questions with a wrong tap
  const [finished, setFinished] = useState(false);
  const later = useTimers();

  const q = questions[index]!;
  const options = optionOrders[index]!;
  const chosen = picked ? options.find((o) => o.id === picked)! : null;
  // Pictures sit above the text: bigger when there are only two options, smaller for a 2×2 grid.
  const pictureSize = options.length <= 2 ? 'clamp(96px, 20vh, 180px)' : 'clamp(72px, 13vh, 120px)';

  function choose(id: string) {
    if (picked || wrong.has(id)) return;
    if (id === q.answerId) {
      setPicked(id);
      celebrate();
      later(() => {
        if (index + 1 < questions.length) {
          setIndex(index + 1);
          setPicked(null);
          setWrong(new Set());
        } else {
          setFinished(true);
        }
      }, NEXT_MS);
      return;
    }
    setWrong(new Set(wrong).add(id));
    setMissed(new Set(missed).add(q.id));
    setShaking(id);
    later(() => setShaking((cur) => (cur === id ? null : cur)), SHAKE_MS);
  }

  const overlay = finished ? (
    <GameFinal stars={starsFor(questions.length - missed.size, questions.length)} confetti="always" onRestart={onRestart} onExit={onExit} />
  ) : null;

  return (
    <GameStage
      title={title}
      instruction={instruction}
      progress={{ total: questions.length, current: finished ? questions.length : index }}
      onClose={onExit}
      overlay={overlay}
      overlayOpaque
    >
      {!finished && (
        <div data-question={q.id} className="flex h-full flex-col items-center justify-center gap-[clamp(12px,3vh,32px)] p-2">
          {(q.emoji || q.art || q.image) && (
            <div data-picture className="flex shrink-0 items-center justify-center rounded-3xl bg-white shadow-md" style={{ width: 'clamp(120px, 30vh, 240px)', height: 'clamp(120px, 30vh, 240px)' }}>
              {q.image && !q.art ? (
                <img src={q.image} alt="" draggable={false} className="pointer-events-none h-full w-full object-contain p-2" />
              ) : (
                <EmojiArt emoji={q.emoji ?? ''} art={q.art} size="85%" play loop />
              )}
            </div>
          )}
          {q.question && (
            <h2 className="text-center text-vowelled text-[clamp(32px,6vh,52px)] text-ink">{q.question}</h2>
          )}
          {q.stem && (
            <p data-stem className="text-center text-vowelled text-[clamp(32px,5.5vh,48px)] text-sky-ink">
              {chosen ? (
                // One text node once filled, so the letters join.
                <span data-filled className="text-emerald-700">{q.stem.replace(BLANK, chosen.text)}</span>
              ) : (
                <>
                  {q.stem.split(BLANK)[0]}
                  <span className="mx-2 inline-block h-[1.1em] w-[3.5em] translate-y-[0.25em] rounded-2xl border-[3px] border-dashed border-amber-400 bg-amber-50" />
                  {q.stem.split(BLANK)[1]}
                </>
              )}
            </p>
          )}
          <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {options.map((o) => {
              const isRight = picked === o.id;
              const isWrong = wrong.has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  data-option={o.id}
                  data-state={isRight ? 'correct' : isWrong ? 'wrong' : 'idle'}
                  disabled={isWrong || (picked !== null && !isRight)}
                  onClick={() => choose(o.id)}
                  className={cn(
                    'game-piece flex min-h-[64px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-white px-5 py-2 text-center text-vowelled text-[clamp(32px,5vh,40px)] shadow-md transition-colors',
                    isRight && 'animate-pop',
                    isRight ? 'bg-emerald-300 text-emerald-950' : isWrong ? 'bg-slate-200 text-slate-400' : 'bg-white text-ink',
                    shaking === o.id && 'animate-shake',
                  )}
                >
                  {o.emoji && <EmojiArt emoji={o.emoji} size={pictureSize} play loop className="shrink-0" />}
                  <OptionText option={o} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GameStage>
  );
}

/** The option's text, with its key words stressed. Split only at spaces, so every word stays one text node. */
function OptionText({ option }: { option: ChooseOption }) {
  const at = option.highlight ? option.text.indexOf(option.highlight) : -1;
  if (!option.highlight || at < 0) return <span>{option.text}</span>;
  const end = at + option.highlight.length;
  return (
    <span>
      {option.text.slice(0, at)}
      <mark className="rounded-xl bg-amber-200 px-2 text-amber-950 [box-decoration-break:clone]">{option.highlight}</mark>
      {option.text.slice(end)}
    </span>
  );
}
