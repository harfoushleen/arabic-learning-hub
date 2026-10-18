import { describe, expect, it } from 'vitest';
import { units } from '@/data/units';
import { buildRounds, roundSizes, starsFor } from './rounds';

describe('roundSizes', () => {
  it('splits into fours and merges a remainder of 1–2', () => {
    expect(roundSizes(19)).toEqual([4, 4, 4, 4, 3]);
    expect(roundSizes(16)).toEqual([4, 4, 4, 4]);
    expect(roundSizes(17)).toEqual([4, 4, 4, 5]);
    expect(roundSizes(18)).toEqual([4, 4, 4, 6]);
    expect(roundSizes(3)).toEqual([3]);
    expect(roundSizes(0)).toEqual([]);
  });
});

describe('buildRounds', () => {
  const vocab = units[0]!.vocab;

  it('uses every word once and never puts confusables together', () => {
    for (let i = 0; i < 200; i++) {
      const rounds = buildRounds(vocab);
      expect(rounds.map((r) => r.length).sort()).toEqual([3, 4, 4, 4, 4]);
      expect(rounds.flat().map((w) => w.id).sort()).toEqual(vocab.map((w) => w.id).sort());
      for (const round of rounds) {
        const ids = new Set(round.map((w) => w.id));
        for (const word of round) {
          for (const other of word.confusableWith ?? []) expect(ids.has(other)).toBe(false);
        }
      }
    }
  });
});

describe('starsFor', () => {
  it('scales with first-try accuracy', () => {
    expect(starsFor(19, 19)).toBe(3);
    expect(starsFor(12, 19)).toBe(2);
    expect(starsFor(5, 19)).toBe(1);
  });
});
