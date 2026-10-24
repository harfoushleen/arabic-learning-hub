import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stripTashkeel } from '../lib/arabicJoining';
import { emojiCodepoints } from '../lib/emoji';
import { gameHasContent, getUnit, letterFormItems, units, type FillBlankPart } from './units';

const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));

describe('units data', () => {
  it('has unique unit ids and getUnit finds them', () => {
    const ids = units.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getUnit(id)?.id).toBe(id);
    expect(getUnit('nope')).toBeUndefined();
  });

  it.each(units.map((u) => [u.id, u] as const))('%s: has a label and theme; every game has a short and a theme', (_id, unit) => {
    const themes = ['sky', 'mint', 'peach', 'lavender', 'lemon'];
    expect(unit.label.trim()).not.toBe('');
    expect(themes).toContain(unit.theme);
    for (const game of unit.games) {
      expect(game.short.trim(), `${game.id} short`).not.toBe('');
      expect(themes, `${game.id} theme`).toContain(game.theme);
    }
  });

  it.each(units.map((u) => [u.id, u] as const))('%s: unique vocab ids', (_id, unit) => {
    const ids = unit.vocab.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(units.map((u) => [u.id, u] as const))(
    '%s: unscramble answers use each existing tile id exactly once',
    (_id, unit) => {
      for (const set of unit.unscramble) {
        const tileIds = set.tiles.map((t) => t.id);
        expect(new Set(tileIds).size, `${set.id} duplicate tile ids`).toBe(tileIds.length);
        expect(set.answers.length, `${set.id} has no answers`).toBeGreaterThan(0);
        for (const answer of set.answers) {
          expect([...answer].sort(), `${set.id} answer`).toEqual([...tileIds].sort());
        }
      }
    },
  );

  it.each(units.map((u) => [u.id, u] as const))(
    '%s: confusableWith ids exist and are symmetric',
    (_id, unit) => {
      const byId = new Map(unit.vocab.map((w) => [w.id, w]));
      for (const word of unit.vocab) {
        for (const other of word.confusableWith ?? []) {
          expect(other, `${word.id} lists itself`).not.toBe(word.id);
          const target = byId.get(other);
          expect(target, `${word.id} → unknown id ${other}`).toBeDefined();
          expect(target?.confusableWith ?? [], `${other} should list ${word.id}`).toContain(word.id);
        }
      }
    },
  );

  it('keeps look-alike words apart', () => {
    const vocab = getUnit('unit-1')!.vocab;
    const pairs = vocab.flatMap((w) => (w.confusableWith ?? []).map((o) => [w.id, o].sort().join('|')));
    expect(new Set(pairs)).toEqual(
      new Set(['ab|razi', 'ab|zizi', 'barid|razi', 'bab|zara', 'bayt|zara', 'barud|kalb', 'zahra|zara']),
    );
  });

  it('every letter-forms word has a picture emoji', () => {
    for (const item of units.flatMap((u) => letterFormItems(u))) {
      expect(item.emoji.trim(), `${item.id} emoji`).not.toBe('');
    }
  });

  it('every art file (src and still) exists under public/', () => {
    const paths = units.flatMap((u) => [...u.vocab, ...letterFormItems(u)].flatMap((w) => (w.art ? [w.art.src, w.art.still] : [])));
    expect(paths.length).toBeGreaterThan(0);
    const missing = paths
      .filter((p): p is string => p !== undefined)
      .filter((p) => !(p.startsWith('/art/') || p.startsWith('/images/')) || !existsSync(publicDir + p.slice(1)));
    expect(missing).toEqual([]);
  });

  it('every image/audio path exists under public/', () => {
    const paths = units.flatMap((u) => [
      ...u.vocab.flatMap((w) => [w.image, w.audio]),
      ...u.sentencePictures.map((s) => s.image),
      ...letterFormItems(u).map((f) => f.image),
      ...u.unscramble.map((set) => set.image),
    ]);
    const missing = paths
      .filter((p): p is string => p !== undefined)
      .filter((p) => !p.startsWith('/') || !existsSync(publicDir + p.slice(1)));
    expect(missing).toEqual([]);
  });

  it('Unit 2: the story, the four games, and "coming soon" for the one without content', () => {
    const unit = getUnit('unit-2')!;
    expect(unit.story).toBe('فِي البُسْتَانِ');
    expect(unit.letters).toEqual(['س', 'ش']);
    expect(unit.games.map((g) => g.id)).toEqual(['word-picture', 'sentence-picture', 'letter-forms', 'fill-blank']);
    expect(unit.games.filter((g) => !gameHasContent(unit, g.id)).map((g) => g.id)).toEqual(['sentence-picture']);
    expect(unit.vocab).toHaveLength(23);
    expect(unit.letterForms.map((s) => [s.id, s.letter, s.items.length])).toEqual([
      ['seen', 'س', 6],
      ['sheen', 'ش', 7],
    ]);
  });

  it('Unit 1 has content for every one of its games', () => {
    const unit = getUnit('unit-1')!;
    expect(unit.games.filter((g) => !gameHasContent(unit, g.id))).toEqual([]);
  });

  const withFillBlank = units.filter((u) => u.fillBlank).map((u) => [u.id, u] as const);

  it.each(withFillBlank)(
    '%s: every fill-blank cloud word is used by exactly one blank (an either-order pair counts together) and every accept id exists',
    (_id, unit) => {
      const { words, sentences } = unit.fillBlank!;
      const wordIds = words.map((w) => w.id);
      expect(new Set(wordIds).size, 'duplicate word ids').toBe(wordIds.length);
      expect(new Set(sentences.map((s) => s.id)).size, 'duplicate sentence ids').toBe(sentences.length);

      const usedBy = new Map<string, string>(); // word id → the blank group that takes it
      for (const sentence of sentences) {
        const blanks = sentence.parts.filter((p): p is Extract<FillBlankPart, { type: 'blank' }> => p.type === 'blank');
        expect(blanks.length, `${sentence.id} has no blank`).toBeGreaterThan(0);
        const groups = new Map<string, typeof blanks>();
        for (const blank of blanks) {
          const key = [...blank.accept].sort().join('|');
          groups.set(key, [...(groups.get(key) ?? []), blank]);
        }
        for (const [key, group] of groups) {
          const accept = group[0]!.accept;
          // N blanks that accept the same N words are filled in either order; each word still fills one.
          expect(group.length, `${sentence.id} ${key}: blanks vs accepted words`).toBe(accept.length);
          for (const id of accept) {
            expect(wordIds, `${sentence.id} accepts unknown word ${id}`).toContain(id);
            expect(usedBy.has(id), `${id} is used by more than one blank`).toBe(false);
            usedBy.set(id, `${sentence.id}:${key}`);
          }
        }
        // A fill is the same word as the one it accepts, plus its case ending.
        for (const blank of blanks) {
          if (blank.fill === undefined) continue;
          const word = words.find((w) => w.id === blank.accept[0])!;
          expect(stripTashkeel(blank.fill), `${sentence.id} fill`).toBe(stripTashkeel(word.text));
        }
      }
      expect([...usedBy.keys()].sort(), 'cloud words no blank uses').toEqual([...wordIds].sort());
    },
  );

  it('Unit 2 fill-blank: the worksheet\'s 7 cloud words and 4 sentences, in their fixed order, 7 blanks', () => {
    const { words, sentences } = getUnit('unit-2')!.fillBlank!;
    expect(words.map((w) => [w.id, w.text])).toEqual([
      ['awraquha', 'أَوْرَاقَهَا'],
      ['mishmish', 'المِشْمِش'],
      ['ilal-bustan', 'إِلَى البُسْتَان'],
      ['anis', 'أَنِيس'],
      ['shadia', 'شَادْيَا'],
      ['shajara', 'شَجَرَة'],
      ['akhdar', 'أَخْضَر'],
    ]);
    // Each sentence as text with its blanks' accepted words in brackets.
    const outline = sentences.map((s) =>
      s.parts.map((p) => (p.type === 'text' ? p.value : `[${p.accept.join(',')}${p.fill ? `=${p.fill}` : ''}]`)).join(''),
    );
    expect(outline).toEqual([
      'سَارَ أَنِيس وَشَادْيَا [ilal-bustan=إِلَى البُسْتَانِ].',
      'خَسِرَتْ [shajara=شَجَرَةُ] المِشْمِشِ [awraquha=أَوْرَاقَهَا].',
      'دَهَنَ أَنِيس وَشَادْيَا شَجَرَةَ [mishmish=المِشْمِشِ] بِلَوْنٍ [akhdar=أَخْضَرَ].',
      'شَكَرَتْ شَجَرَةُ المِشْمِشِ [anis,shadia] وَ[anis,shadia].',
    ]);
    const blanks = sentences.flatMap((s) => s.parts.filter((p) => p.type === 'blank'));
    expect(blanks).toHaveLength(7);
    // Every word is used exactly once; the name pair counts once each.
    const uses = new Map<string, number>();
    for (const b of blanks) {
      const share = 1 / b.accept.length;
      for (const id of b.accept) uses.set(id, (uses.get(id) ?? 0) + share);
    }
    expect([...uses.values()].every((n) => n === 1)).toBe(true);
    expect([...uses.keys()].sort()).toEqual(words.map((w) => w.id).sort());
  });

  it('every emoji in units.ts has at least a static Noto SVG in public/emoji/', () => {
    const emoji = units.flatMap((u) => [...u.vocab.map((w) => w.emoji), ...letterFormItems(u).map((f) => f.emoji), ...u.games.map((g) => g.emoji)]);
    const missing = [...new Set(emoji)].filter((e) => !existsSync(`${publicDir}emoji/${emojiCodepoints(e)}.svg`));
    expect(missing, 'run: node scripts/fetch-emoji-assets.mjs').toEqual([]);
  });
});
