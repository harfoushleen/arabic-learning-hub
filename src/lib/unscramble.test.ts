import { describe, expect, it } from 'vitest';
import { isComplete, nextTileIds, scrambleTiles } from './unscramble';

// Made-up set with two accepted orders: "a b c d" and "b a c d".
const tiles = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
const answers = [
  ['a', 'b', 'c', 'd'],
  ['b', 'a', 'c', 'd'],
];

describe('nextTileIds', () => {
  it('accepts the first word of any answer', () => {
    expect(nextTileIds(answers, []).sort()).toEqual(['a', 'b']);
  });

  it('follows whichever answer the placed words started', () => {
    expect(nextTileIds(answers, ['a'])).toEqual(['b']);
    expect(nextTileIds(answers, ['b'])).toEqual(['a']);
    expect(nextTileIds(answers, ['b', 'a'])).toEqual(['c']);
    expect(nextTileIds(answers, ['a', 'b', 'c'])).toEqual(['d']);
  });

  it('has nothing next once the sentence is complete', () => {
    expect(nextTileIds(answers, ['b', 'a', 'c', 'd'])).toEqual([]);
    expect(isComplete(answers, ['b', 'a', 'c', 'd'])).toBe(true);
    expect(isComplete(answers, ['b', 'a', 'c'])).toBe(false);
  });
});

describe('scrambleTiles', () => {
  it('never equals any accepted answer', () => {
    for (let i = 0; i < 500; i++) {
      const order = scrambleTiles(tiles, answers).map((t) => t.id);
      expect([...order].sort()).toEqual(['a', 'b', 'c', 'd']);
      for (const answer of answers) expect(order).not.toEqual(answer);
    }
  });

  it('avoids every answer even with a rigged random source', () => {
    // random() = 0.999… makes the Fisher–Yates shuffle the identity, i.e. the first answer.
    const order = scrambleTiles(tiles, answers, () => 0.9999).map((t) => t.id);
    for (const answer of answers) expect(order).not.toEqual(answer);
  });

  it('still avoids two-word answers in both orders when possible', () => {
    const two = [{ id: 'x' }, { id: 'y' }];
    for (let i = 0; i < 100; i++) expect(scrambleTiles(two, [['x', 'y']]).map((t) => t.id)).toEqual(['y', 'x']);
  });
});
