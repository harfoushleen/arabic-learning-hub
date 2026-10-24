import { describe, expect, it } from 'vitest';
import { letterFormItems, units, type LetterFormItem } from '@/data/units';
import {
  ZWJ,
  connects,
  expectedForm,
  formName,
  formsFor,
  joinedSegments,
  letterFormItem,
  stripTashkeel,
  worksheetSegments,
} from './arabicJoining';

const letterForms = units.flatMap(letterFormItems);
const setOf = (id: string) => units.flatMap((u) => u.letterForms).find((s) => s.items.some((i) => i.id === id))!;
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
          expect(part.answer).toBe(expectedForm(setOf(item.id).letter, prev, next));
        }
        index += partBases.length;
      }
      expect(index).toBe(bases.length);
    },
  );
});

describe('letterFormItem', () => {
  it('rebuilds every hand-written Unit 1 word exactly', () => {
    for (const set of units[0]!.letterForms) {
      for (const item of set.items) {
        const built = letterFormItem(item.id, item.target, set.letter, item.emoji);
        expect(built.parts, item.id).toEqual(item.parts);
      }
    }
  });

  it('splits at every occurrence of the letter, each with its own tashkeel and context', () => {
    expect(letterFormItem('x', 'دَبْدُوب', 'ب', '🧸').parts).toEqual([
      { type: 'text', value: 'دَ' },
      { type: 'blank', answer: 'بـ', fill: 'بْ' },
      { type: 'text', value: 'دُو' },
      { type: 'blank', answer: 'ب', fill: 'ب' },
    ]);
  });

  it('throws when the word does not contain the letter', () => {
    expect(() => letterFormItem('x', 'بَيْت', 'س', '🏠')).toThrow();
  });

  // The Unit 2 table (word, picture, expected form of the letter in it).
  const UNIT_2: Record<string, [target: string, emoji: string, answer: string][]> = {
    seen: [
      ['فُسْتَان', '👗', 'ـسـ'],
      ['سَمَكَة', '🐟', 'سـ'],
      ['كَأْس', '🥛', 'س'],
      ['أَنَانَاس', '🍍', 'س'],
      ['جَلَسَ', '🪑', 'ـس'],
      ['مِسْطَرَة', '📏', 'ـسـ'],
    ],
    sheen: [
      ['خَشَب', '🪵', 'ـشـ'],
      ['مِنْشَفَة', '🧺', 'ـشـ'],
      ['فَرَاش', '🦋', 'ش'],
      ['قِرْش', '🦈', 'ش'],
      ['جَيْش', '💂', 'ـش'],
      ['شَجَرَة', '🌳', 'شـ'],
      ['شَمْعَة', '🕯️', 'شـ'],
    ],
  };

  it.each(Object.entries(UNIT_2))('Unit 2 %s: every word and answer matches the table', (setId, rows) => {
    const set = units.find((u) => u.id === 'unit-2')!.letterForms.find((s) => s.id === setId)!;
    expect(set.items.map((item) => [item.target, item.emoji, item.parts.filter((p) => p.type === 'blank').map((p) => p.answer)])).toEqual(
      rows.map(([target, emoji, answer]) => [target, emoji, [answer]]),
    );
  });
});

describe('formsFor / formName', () => {
  it('gives a dual-joining letter 4 forms and a non-forward-joiner 2', () => {
    expect(formsFor('ب')).toEqual(['بـ', 'ـبـ', 'ـب', 'ب']);
    expect(formsFor('ز')).toEqual(['ز', 'ـز']);
    expect(formsFor('ب').map(formName)).toEqual(['initial', 'medial', 'final', 'isolated']);
    expect(formsFor('ز').map(formName)).toEqual(['isolated', 'final']);
  });

  it('never gives ز a joined-forward form', () => {
    expect(expectedForm('ز', 'ن', 'ل')).toBe('ـز');
    expect(expectedForm('ز', 'ر', null)).toBe('ز');
    expect(expectedForm('ز', null, 'ر')).toBe('ز');
    expect(expectedForm('ب', 'ط', 'ل')).toBe('ـبـ');
  });

  it('every answer is one of its letter tiles', () => {
    for (const set of units.flatMap((u) => u.letterForms)) {
      for (const item of set.items) {
        for (const part of item.parts) if (part.type === 'blank') expect(formsFor(set.letter)).toContain(part.answer);
      }
    }
  });
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

  it('dashes before ز where the previous letter joins it, never after it', () => {
    expect(ws('manzil')).toBe('مَنْـ ▢ ل');
    expect(ws('nazala')).toBe('نَـ ▢ لَ');
    expect(ws('karaz')).toBe('كَرَ ▢');
    expect(ws('jazar')).toBe('جَـ ▢ ر');
    expect(ws('zarafa')).toBe('▢ رَافَة');
  });

  it('puts no ZWJ after ز in a completed word', () => {
    for (const item of setOf('manzil').items) {
      const text = joinedSegments(item.parts, allFilled(item)).map((s) => s.text).join('');
      expect(stripTashkeel(text), item.id).not.toMatch(new RegExp(`ز${ZWJ}`));
    }
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
