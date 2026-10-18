import { shuffle } from './shuffle';

interface Confusable {
  id: string;
  confusableWith?: string[];
}

/** Round sizes: rounds of `size`; a remainder of 1–2 is merged into the previous round. */
export function roundSizes(count: number, size = 4): number[] {
  if (count <= 0) return [];
  if (count <= size) return [count];
  const sizes: number[] = Array.from({ length: Math.floor(count / size) }, () => size);
  const rem = count % size;
  if (rem >= 3) sizes.push(rem);
  else if (rem > 0) sizes[sizes.length - 1]! += rem;
  return sizes;
}

function clashes(word: Confusable, round: readonly Confusable[]): boolean {
  return round.some(
    (other) => word.confusableWith?.includes(other.id) || other.confusableWith?.includes(word.id),
  );
}

/**
 * Shuffles `words` into rounds so that confusable words never share a round.
 * Greedy placement over a fresh shuffle, retried a few times; falls back to plain chunks.
 */
export function buildRounds<T extends Confusable>(
  words: readonly T[],
  size = 4,
  random: () => number = Math.random,
): T[][] {
  const sizes = roundSizes(words.length, size);
  let shuffled: T[] = [];
  for (let attempt = 0; attempt < 50; attempt++) {
    shuffled = shuffle(words, random);
    const rounds: T[][] = sizes.map(() => []);
    const ok = shuffled.every((word) => {
      const target = rounds.find((r, i) => r.length < sizes[i]! && !clashes(word, r));
      target?.push(word);
      return !!target;
    });
    if (ok) return shuffle(rounds, random);
  }
  let start = 0;
  return sizes.map((n) => shuffled.slice(start, (start += n)));
}

export function starsFor(firstTryCorrect: number, total: number): 1 | 2 | 3 {
  const ratio = total === 0 ? 1 : firstTryCorrect / total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
}
