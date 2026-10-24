import type { Unit } from '@/data/units';

/**
 * Unit-screen card art for the fill-blank game: the unit's first sentence with a dashed blank and one
 * word floating beside it. Decorative only. It is `height` tall (any CSS length, the same as the other
 * cards' picture) on screens wide enough for one line, and wraps to a second line on narrow ones.
 */
export function FillBlankPreview({ unit, height }: { unit: Unit; height: string }) {
  const sentence = unit.fillBlank?.sentences[0];
  const firstBlank = sentence?.parts.find((part) => part.type === 'blank');
  const chip = firstBlank && unit.fillBlank?.words.find((word) => word.id === firstBlank.accept[0]);
  if (!sentence) return null;

  return (
    <span
      aria-hidden
      data-fill-blank-preview
      className="flex max-w-full flex-wrap items-center justify-center gap-x-3 rounded-[18px] bg-white/80 px-3"
      style={{ minHeight: height, fontSize: `min(calc(${height} * 0.34), 22px)` }}
    >
      <span className="whitespace-nowrap text-vowelled">
        {sentence.parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={i}>{part.value}</span>
          ) : (
            <span
              key={i}
              className="inline-block rounded-md border-2 border-dashed border-amber-400 bg-amber-50 align-middle"
              style={{ width: '3.2em', height: '1.2em', marginBlock: '-0.6em' }}
            />
          ),
        )}
      </span>
      {chip && <span className="animate-sway whitespace-nowrap rounded-lg bg-lavender px-2 text-vowelled">{chip.text}</span>}
    </span>
  );
}
