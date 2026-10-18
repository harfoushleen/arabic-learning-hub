// Randomizing helpers. Every game reorders its content on every open and every replay.

type Random = () => number;

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const sameOrder = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** A shuffle that is never exactly `forbiddenOrder` (e.g. the correct answer order). */
export function shuffleAvoiding<T>(
  items: readonly T[],
  forbiddenOrder: readonly T[],
  random: Random = Math.random,
): T[] {
  for (let attempt = 0; attempt < 100; attempt++) {
    const out = shuffle(items, random);
    if (!sameOrder(out, forbiddenOrder)) return out;
  }
  // Unlucky or near-degenerate input: rotating by one always differs unless every item is equal.
  const rotated = [...items.slice(1), ...items.slice(0, 1)];
  return sameOrder(rotated, forbiddenOrder) ? [...items] : rotated;
}

/** A shuffle where no item stays at its original index. One item is returned as is. */
export function derange<T>(items: readonly T[], random: Random = Math.random): T[] {
  if (items.length < 2) return [...items];
  for (let attempt = 0; attempt < 100; attempt++) {
    const out = shuffle(items, random);
    if (out.every((x, i) => x !== items[i])) return out;
  }
  // Sattolo's algorithm: a random single cycle, which is always a derangement.
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
