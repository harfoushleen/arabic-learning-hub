import { useState } from 'react';
import { Dialog, DialogCard, DialogTitle } from '@/components/ui/dialog';
import { useTimers } from '@/hooks/useTimers';
import { CODE_LENGTH, lockTeacher, unlockTeacher, useTeacherMode } from '@/lib/teacher';
import { cn } from '@/lib/utils';

const KEY = 'game-piece flex h-14 w-full items-center justify-center rounded-card-md bg-white font-sans text-[28px] font-bold leading-none text-ink shadow-card transition-[transform,box-shadow] duration-150 active:translate-y-[3px] active:shadow-card-pressed focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink';

function Lock({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d={open ? 'M8 11V7a4 4 0 0 1 7.5-1.9' : 'M8 11V7a4 4 0 0 1 8 0v4'} />
    </svg>
  );
}

/** A small button on the side of the home screen: asks for the teacher code, and locks teacher mode again. */
export function TeacherLock() {
  const teacher = useTeacherMode();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-teacher-lock={teacher ? 'unlocked' : 'locked'}
        aria-label={teacher ? 'قَفْلُ وَضْعِ المُعَلِّمَةِ' : 'وَضْعُ المُعَلِّمَةِ'}
        onClick={() => (teacher ? lockTeacher() : setOpen(true))}
        className={cn(
          'game-piece fixed left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-ink shadow-card transition-opacity',
          'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink',
          teacher ? 'bg-mint opacity-100' : 'bg-white/70 opacity-60 hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        <Lock open={teacher} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogCard aria-describedby={undefined}>
            <CodePad onDone={() => setOpen(false)} />
          </DialogCard>
        )}
      </Dialog>
    </>
  );
}

function CodePad({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const [checking, setChecking] = useState(false);
  const later = useTimers();
  const busy = wrong || checking;

  const enter = async (next: string) => {
    if (busy) return;
    setCode(next);
    if (next.length < CODE_LENGTH) return;
    setChecking(true);
    const ok = await unlockTeacher(next);
    setChecking(false);
    if (ok) return onDone();
    setWrong(true);
    later(() => {
      setWrong(false);
      setCode('');
    }, 600);
  };
  const press = (digit: string) => code.length < CODE_LENGTH && enter(code + digit);
  const erase = () => !busy && setCode(code.slice(0, -1));

  return (
    <div
      className="flex flex-col items-center gap-4"
      onKeyDown={(e) => {
        if (/^\d$/.test(e.key)) press(e.key);
        else if (e.key === 'Backspace') erase();
      }}
    >
      <DialogTitle className="text-vowelled text-[26px]">رَمْزُ المُعَلِّمَةِ</DialogTitle>

      <div className={cn('flex gap-3', wrong && 'motion-safe:animate-shake')} dir="ltr" data-code-dots data-wrong={wrong}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-4 w-4 rounded-full border-2 transition-colors',
              wrong ? 'border-peach-ink bg-peach-ink' : i < code.length ? 'border-ink bg-ink' : 'border-ink/40 bg-white',
            )}
          />
        ))}
      </div>
      <p role="status" className={cn('text-vowelled min-h-[1.8em] text-[18px] text-peach-ink', !wrong && 'invisible')}>
        الرَّمْزُ غَيْرُ صَحِيحٍ
      </p>

      <div className="grid w-full grid-cols-3 gap-3" dir="ltr">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className={KEY} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button type="button" className={cn(KEY, 'bg-transparent text-[22px] shadow-none')} aria-label="إِغْلَاق" onClick={onDone}>
          ✕
        </button>
        <button type="button" className={KEY} onClick={() => press('0')}>
          0
        </button>
        <button type="button" className={cn(KEY, 'bg-transparent text-[22px] shadow-none')} aria-label="مَسْح" onClick={erase}>
          ⌫
        </button>
      </div>
    </div>
  );
}
