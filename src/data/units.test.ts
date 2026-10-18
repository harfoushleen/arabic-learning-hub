import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getUnit, units } from './units';

const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));

describe('units data', () => {
  it('has unique unit ids and getUnit finds them', () => {
    const ids = units.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getUnit(id)?.id).toBe(id);
    expect(getUnit('nope')).toBeUndefined();
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
    expect(new Set(pairs)).toEqual(new Set(['ab|razi', 'barud|kalb', 'zahra|zara']));
  });

  it('every letter-forms word has a picture emoji', () => {
    for (const item of units.flatMap((u) => u.letterForms)) {
      expect(item.emoji.trim(), `${item.id} emoji`).not.toBe('');
    }
  });

  it('every image/audio path exists under public/', () => {
    const paths = units.flatMap((u) => [
      ...u.vocab.flatMap((w) => [w.image, w.audio]),
      ...u.sentencePictures.map((s) => s.image),
      ...u.letterForms.map((f) => f.image),
      ...u.unscramble.map((set) => set.image),
    ]);
    const missing = paths
      .filter((p): p is string => p !== undefined)
      .filter((p) => !p.startsWith('/') || !existsSync(publicDir + p.slice(1)));
    expect(missing).toEqual([]);
  });
});
