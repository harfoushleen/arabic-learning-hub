# Arabic Letter Games — project rules



## Product

- Zero login, zero roles, zero settings. Open app → pick unit → pick game → play.

- All curriculum content is static in `src/data/units.ts`. No localStorage, no runtime editing.

- Audience: Arabic-speaking children ages 6–8, on iPad Safari (primary) and classroom laptops/projectors.

- NO sound effects. Feedback is visual only. The only audio allowed is optional per-word teacher recordings, used only if the file exists.



## Stack

Vite + React 19 + TypeScript (strict) + Tailwind CSS v3 + shadcn/ui. RTL everywhere (`<html lang="ar" dir="rtl">`).

Fonts (self-hosted via @fontsource, Arabic subset only): Noto Naskh Arabic 700 for all vowelled text; Cairo 800 only for unvowelled display letters. Pastel palette; background #FBF7EF.



## Touch & accessibility

- Min tap target 48×48px (game pieces ≥ 64px). Min 12px gap between targets.

- No HTML5 drag-and-drop (broken on iOS). Primary interaction = tap to select, tap to place. Drag via @dnd-kit is optional.

- `touch-action: manipulation`; no double-tap zoom; `-webkit-tap-highlight-color: transparent`; `user-select: none` on game pieces.

- Game Arabic text ≥ 32px with full tashkeel exactly as in the data. Never strip diacritics for display.

- Respect `prefers-reduced-motion`.

- No scrolling inside a game at any supported viewport (phones excepted). Every game renders inside GameStage and sizes its pieces with useFitGrid or a similar fit hook. `npm run test:e2e` must pass.



## Arabic letter joining (critical)

- Splitting a word across elements (spans) breaks joining in WebKit/Safari. When a word must be split (e.g. to highlight one letter), use `src/lib/arabicJoining.ts`, which inserts U+200D ZERO WIDTH JOINER on both sides of a split ONLY where the letters truly connect.

- Letters that never connect to the following letter: ا أ إ آ ٱ د ذ ر ز و ؤ ء ة. Never put a ZWJ after these.

- Tatweel (ـ) is only for showing a standalone letter form on a choice tile (بـ ـبـ ـب ب). Never insert tatweel into a word.

- Wherever possible, render a completed word as ONE text node.

## Tashkeel rendering

- All vowelled text (game content and vowelled buttons/labels) uses the `text-vowelled` class: Noto Naskh Arabic 700, line-height ≥ 1.8, no letter-spacing. Cairo misplaces stacked marks (e.g. shadda + damma on lam), so never use it for vowelled text.
- Leave enough vertical room that marks are never clipped by `overflow-hidden`; never use a weight that isn't loaded (no faux bold) — load only the weights we use, Arabic subset only.



## Conventions

- Games live in `src/components/games/`, one file per game, registered in `src/components/games/registry.ts`.

- Answers are checked by id, never by comparing Arabic strings.

- Games read content from `units.ts` via `unitId` prop; no hardcoded words in components.

- Every game randomizes its content order on every open and every replay. Answer options never line up with their targets or match the correct order. Use src/lib/shuffle.ts. Games 2–4 follow this too: Game 2 shuffles sentences and pictures independently with no row aligned with its match; Game 3 shuffles the word order and the 4 choice tiles per word; Game 4 shuffles set order, and its tiles are never in the correct order.

- Before finishing any task, run `npm run build`, `npx tsc --noEmit`, and `npx vitest run`.

## Images
- Cartoon/illustrated style only — no photos or realistic renders.
- Only licensed sources, recorded in `public/images/CREDITS.md` (file, source URL, author, license).
- Vocab images: `public/images/characters/` (razi, zizi) and `public/images/unit-1/<word-id>.<ext>`.
- Game 2 scene images: `public/images/game-2/image-1..3.<ext>` (supplied by us, don't replace).
- Every image/audio path in `units.ts` must exist in `public/` (enforced by a vitest test).

## Git
- Never commit, branch, or push — the user does git.
- At the end of every task: list the changed files and give one `git add` line and a one-line commit message.
