import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { emojiCodepoints } from '../lib/emoji';
import { getUnit, letterFormItems, units } from './units';

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
      .filter((p) => !p.startsWith('/art/') || !existsSync(publicDir + p.slice(1)));
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

  it('every emoji in units.ts has at least a static Noto SVG in public/emoji/', () => {
    const emoji = units.flatMap((u) => [...u.vocab.map((w) => w.emoji), ...letterFormItems(u).map((f) => f.emoji), ...u.games.map((g) => g.emoji)]);
    const missing = [...new Set(emoji)].filter((e) => !existsSync(`${publicDir}emoji/${emojiCodepoints(e)}.svg`));
    expect(missing, 'run: node scripts/fetch-emoji-assets.mjs').toEqual([]);
  });
});
