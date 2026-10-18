import { describe, expect, it } from 'vitest';
import { units, type LetterFormItem } from '@/data/units';
import {
  ZWJ,
  connects,
  expectedForm,
  joinedSegments,
  stripTashkeel,
  worksheetSegments,
} from './arabicJoining';

const letterForms = units.flatMap((u) => u.letterForms);
const byId = (id: string): LetterFormItem => {
  const item = letterForms.find((f) => f.id === id);
  if (!item) throw new Error(`missing letterForms item ${id}`);
  return item;
};
const allFilled = (item: LetterFormItem) =>
  item.parts.map((p) => (p.type === 'blank' ? p.fill : null));

describe('stripTashkeel / connects', () => {
  it('removes harakat, shadda, sukun and superscript alef', () => {
    expect(stripTashkeel('قَرَّبَ')).toBe('قرب');
    expect(stripTashkeel('هٰذَا')).toBe('هذا');
  });

  it('respects non-forward-joining letters and hamza', () => {
    expect(connects('ط', 'ب')).toBe(true);
    expect(connects('ر', 'ب')).toBe(false);
    expect(connects('ب', 'ء')).toBe(false);
    expect(connects('ب', 'ـ')).toBe(false);
    expect(connects('ب', '.')).toBe(false);
  });
});

describe('letterForms data', () => {
  it.each(letterForms.map((f) => [f.id, f] as const))(
    '%s: parts with fills equal target',
    (_id, item) => {
      const joined = item.parts.map((p) => (p.type === 'text' ? p.value : p.fill)).join('');
      expect(joined.normalize('NFC')).toBe(item.target.normalize('NFC'));
    },
  );

  it.each(letterForms.map((f) => [f.id, f] as const))(
    '%s: every blank answer matches its joining context',
    (_id, item) => {
      const bases = [...stripTashkeel(item.target)];
      let index = 0; // base-letter index into the target
      for (const part of item.parts) {
        const partBases = [...stripTashkeel(part.type === 'text' ? part.value : part.fill)];
        if (part.type === 'blank') {
          expect(partBases).toHaveLength(1);
          const prev = bases[index - 1] ?? null;
          const next = bases[index + 1] ?? null;
          expect(part.answer).toBe(expectedForm(prev, next));
        }
        index += partBases.length;
      }
      expect(index).toBe(bases.length);
    },
  );
});

describe('joinedSegments', () => {
  it('adds no ZWJ around ب after ر in قَرَّبَ', () => {
    const segs = joinedSegments(byId('qarraba').parts, allFilled(byId('qarraba')));
    expect(segs.map((s) => s.text).join('')).not.toContain(ZWJ);
  });

  it('adds no ZWJ between د/و and ب in دَبْدُوب, only between ب and د', () => {
    const item = byId('dabdoob');
    const segs = joinedSegments(item.parts, allFilled(item));
    expect(segs.map((s) => s.text)).toEqual(['دَ', `بْ${ZWJ}`, `${ZWJ}دُو`, 'ب']);
  });

  it('puts ZWJ on both sides of ب in طَبْل', () => {
    const item = byId('tabl');
    const segs = joinedSegments(item.parts, allFilled(item));
    expect(segs.map((s) => s.text)).toEqual([`طَ${ZWJ}`, `${ZWJ}بْ${ZWJ}`, `${ZWJ}ل`]);
    expect(segs.map((s) => s.isBlank)).toEqual([false, true, false]);
  });

  it('adds no ZWJ next to an unfilled blank', () => {
    const item = byId('tabl');
    const segs = joinedSegments(item.parts, []);
    expect(segs.map((s) => s.text)).toEqual(['طَ', '', 'ل']);
  });

  it('round-trips to the target once ZWJs are removed', () => {
    for (const item of letterForms) {
      const text = joinedSegments(item.parts, allFilled(item))
        .map((s) => s.text)
        .join('')
        .replaceAll(ZWJ, '');
      expect(text.normalize('NFC')).toBe(item.target.normalize('NFC'));
    }
  });
});

describe('worksheetSegments', () => {
  const ws = (id: string) =>
    worksheetSegments(byId(id).parts)
      .map((s) => (s.isBlank ? '▢' : s.text))
      .join(' ');

  it('adds a tatweel only where the neighbor really connects to the missing ب', () => {
    expect(ws('tabl')).toBe('طَـ ▢ ـل');
    expect(ws('arnab')).toBe('أَرْنَـ ▢');
    expect(ws('laiba')).toBe('لَعِـ ▢');
    expect(ws('alkalb')).toBe('الكَلْـ ▢');
    expect(ws('dabdoob')).toBe('دَ ▢ ـدُو ▢');
    expect(ws('qarraba')).toBe('قَرَّ ▢');
  });

  it('dashes the remaining blank of a half-filled word and joins the filled one', () => {
    const item = byId('dabdoob');
    const segs = worksheetSegments(item.parts, [null, 'بْ', null, null]).map((s) => s.text);
    expect(segs).toEqual(['دَ', `بْ${ZWJ}`, `${ZWJ}دُو`, '']);
  });

  it('adds no tatweel once the word is complete', () => {
    for (const item of letterForms) {
      expect(worksheetSegments(item.parts, allFilled(item))).toEqual(joinedSegments(item.parts, allFilled(item)));
    }
  });
});
