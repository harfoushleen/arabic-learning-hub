import { describe, expect, it } from 'vitest';
import { derange, shuffle, shuffleAvoiding } from './shuffle';

const items = ['a', 'b', 'c', 'd', 'e'];
const sorted = (xs: string[]) => [...xs].sort();

describe('shuffle', () => {
  it('returns a new permutation without touching the input', () => {
    const input = [...items];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect(input).toEqual(items);
    expect(sorted(out)).toEqual(items);
  });

  it('produces different orders across calls', () => {
    const seen = new Set(Array.from({ length: 50 }, () => shuffle(items).join('')));
    expect(seen.size).toBeGreaterThan(10);
  });
});

describe('shuffleAvoiding', () => {
  it('never returns the forbidden order', () => {
    for (let i = 0; i < 500; i++) {
      const out = shuffleAvoiding(['x', 'y'], ['x', 'y']);
      expect(out).toEqual(['y', 'x']);
    }
    for (let i = 0; i < 500; i++) expect(shuffleAvoiding(items, items)).not.toEqual(items);
  });

  it('still avoids the order when the random source always yields the identity', () => {
    const identity = () => 0.999999; // Fisher–Yates keeps every element in place
    expect(shuffleAvoiding(items, items, identity)).not.toEqual(items);
  });
});

describe('derange', () => {
  it('moves every item off its original index', () => {
    for (let i = 0; i < 500; i++) {
      const out = derange(items);
      expect(sorted(out)).toEqual(items);
      out.forEach((x, idx) => expect(x).not.toBe(items[idx]));
    }
  });

  it('falls back to a cycle when the random source is degenerate', () => {
    const out = derange(items, () => 0.999999);
    out.forEach((x, idx) => expect(x).not.toBe(items[idx]));
  });

  it('returns a single item (or none) as is', () => {
    expect(derange(['only'])).toEqual(['only']);
    expect(derange([])).toEqual([]);
  });
});
