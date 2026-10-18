// Game 4 rules, kept pure so they can be unit-tested. Everything works on tile ids.
import { shuffleAvoiding } from './shuffle';

type Random = () => number;

const startsWith = (answer: readonly string[], placed: readonly string[]) =>
  placed.length < answer.length && placed.every((id, i) => answer[i] === id);

/** Tile ids that some accepted answer, given the words already placed, has next. */
export function nextTileIds(answers: readonly (readonly string[])[], placed: readonly string[]): string[] {
  const out = new Set<string>();
  for (const answer of answers) if (startsWith(answer, placed)) out.add(answer[placed.length]!);
  return [...out];
}

export function isComplete(answers: readonly (readonly string[])[], placed: readonly string[]): boolean {
  return answers.some((a) => a.length === placed.length && a.every((id, i) => placed[i] === id));
}

const sameOrder = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Shuffled tile order that equals none of the accepted answers. */
export function scrambleTiles<T extends { id: string }>(
  tiles: readonly T[],
  answers: readonly (readonly string[])[],
  random: Random = Math.random,
): T[] {
  const matchesAny = (order: readonly T[]) => answers.some((a) => sameOrder(order.map((t) => t.id), a));
  const first = answers[0]?.map((id) => tiles.find((t) => t.id === id)!) ?? [];
  for (let attempt = 0; attempt < 100; attempt++) {
    const out = shuffleAvoiding(tiles, first, random);
    if (!matchesAny(out)) return out;
  }
  // Fallback: the first rotation that matches no answer.
  for (let r = 1; r < tiles.length; r++) {
    const rotated = [...tiles.slice(r), ...tiles.slice(0, r)];
    if (!matchesAny(rotated)) return rotated;
  }
  return [...tiles];
}
