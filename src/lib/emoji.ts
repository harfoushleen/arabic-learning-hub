import manifest from '@/data/emoji-manifest.json';

// Noto emoji art in public/emoji/, fetched by scripts/fetch-emoji-assets.mjs (re-run it after adding
// a new emoji to units.ts). The manifest says which files exist, so nothing is requested blindly.

/** Lowercase hex code points joined by "_", FE0F removed: 🧑‍🏫 → "1f9d1_200d_1f3eb". */
export function emojiCodepoints(emoji: string): string {
  return [...emoji]
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((h) => h !== 'fe0f')
    .join('_');
}

export interface EmojiAssets {
  svg: string;
  lottie: string | null;
}

export function emojiAssets(emoji: string): EmojiAssets | null {
  const cp = emojiCodepoints(emoji);
  const entry = (manifest as Record<string, { animated: boolean }>)[cp];
  if (!entry) return null;
  return { svg: `/emoji/${cp}.svg`, lottie: entry.animated ? `/emoji/${cp}.json` : null };
}
