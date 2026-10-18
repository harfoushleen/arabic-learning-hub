// Downloads Noto emoji art for every emoji used in src/data/units.ts (vocab, letter-forms words and
// game cards) into public/emoji/, so the app works offline and never hotlinks.
//
//   <codepoints>.svg   static Noto Emoji (Apache 2.0)         github.com/googlefonts/noto-emoji (2D/svg)
//   <codepoints>.json  Noto Animated Emoji Lottie (CC BY 4.0) googlefonts.github.io/noto-emoji-animation
//
// <codepoints> is lowercase hex joined by "_" with FE0F removed, e.g. 🧑‍🏫 → 1f9d1_200d_1f3eb.
// Also writes src/data/emoji-manifest.json (which codepoints have art, and whether it animates).
// Usage: node scripts/fetch-emoji-assets.mjs [--dry-run]
// Needs Node ≥ 22.18 (imports units.ts directly with type stripping).
import { mkdir, writeFile } from 'node:fs/promises';
import { units } from '../src/data/units.ts';

const OUT = new URL('../public/emoji/', import.meta.url);
const ANIMATED_LIST = 'https://googlefonts.github.io/noto-emoji-animation/data/api.json';
const lottieUrl = (cp) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/lottie.json`;
const svgUrl = (cp) => `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/2D/svg/emoji_u${cp}.svg`;
const dryRun = process.argv.includes('--dry-run');

/** Same rule as src/lib/emoji.ts. */
const codepoints = (emoji) =>
  [...emoji].map((c) => c.codePointAt(0).toString(16)).filter((h) => h !== 'fe0f').join('_');

// emoji → words that use it
const uses = new Map();
const add = (emoji, word) => uses.set(emoji, [...(uses.get(emoji) ?? []), word]);
for (const unit of units) {
  for (const w of unit.vocab) add(w.emoji, w.text);
  for (const f of unit.letterForms.flatMap((set) => set.items)) add(f.emoji, f.target);
  for (const g of unit.games) add(g.emoji, g.title);
}

async function fetchOk(url) {
  const res = await fetch(url);
  return res.ok ? res : null;
}

const animated = new Set((await (await fetch(ANIMATED_LIST)).json()).icons.map((i) => i.codepoint));
if (!dryRun) await mkdir(OUT, { recursive: true });

const rows = [];
for (const [emoji, words] of uses) {
  const cp = codepoints(emoji);
  const svg = await fetchOk(svgUrl(cp));
  const lottie = animated.has(cp) ? await fetchOk(lottieUrl(cp)) : null;
  if (!dryRun) {
    if (svg) await writeFile(new URL(`${cp}.svg`, OUT), await svg.text());
    // Re-serialize to drop whitespace; Lottie files are plain JSON.
    if (lottie) await writeFile(new URL(`${cp}.json`, OUT), JSON.stringify(await lottie.json()));
  }
  rows.push({ emoji, cp, words: [...new Set(words)].join('، '), svg: !!svg, animated: !!lottie });
}

// The app reads this to know which files exist (Vite can't list public/ at build time).
if (!dryRun) {
  const manifest = Object.fromEntries(
    rows.filter((r) => r.svg).map((r) => [r.cp, { animated: r.animated }]).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(new URL('../src/data/emoji-manifest.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n');
}

console.log('| emoji | codepoints | word(s) | static svg | animated |');
console.log('|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.emoji} | ${r.cp} | ${r.words} | ${r.svg ? 'yes' : 'NO'} | ${r.animated ? 'yes' : 'no'} |`);
const missing = rows.filter((r) => !r.svg);
if (missing.length) {
  console.error(`\nNo static SVG for: ${missing.map((r) => r.emoji).join(' ')}`);
  process.exitCode = 1;
}
