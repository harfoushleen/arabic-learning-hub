# Arabic Letter Games · أَلْعَابُ الحُرُوفِ

**Live app: https://arabic-learning-hub-sand.vercel.app/**

Arabic letter games for children aged 6–8. It is built for iPads in the classroom and also works on laptops and projectors. There is no login, no settings and no sound effects: open the app, pick a unit, pick a game and play.

## The games

Each unit lists its own games, with its own wording for each. Unit 1 is حَرْفَا البَاءِ وَالزَّايِ (ب and ز) and Unit 2 is حَرْفَا السِّينِ وَالشِّينِ (س and ش, the story فِي البُسْتَانِ). A game that has no content yet shows as "قَرِيبًا" and can't be opened. All of the games are played by dragging with a finger or a mouse:

| Game | What the child does |
|---|---|
| 🖼️ **رَبْطُ الكَلِمَةِ بِالصُّورَةِ** (word → picture) | Drags each word onto its picture. |
| 📖 **رَبْطُ الجُمْلَةِ بِالرَّسْمِ** (sentence → scene) | Draws a line from each sentence to the scene it describes. |
| 🔤 **أَشْكَالُ الحُرُوفِ** (letter forms) | Picks a letter (ب or ز, س or ش), then drags the right form of it (بـ ـبـ ـب ب, or ز ـز) into the gap in each word. |
| 🧩 **تَرْتِيبُ الكَلِمَاتِ** (unscramble, Unit 1) | Drags the words into the right order to build a sentence, with a scene picture as a hint. |
| ✏️ **مَلْءُ الفَرَاغِ** (fill in the blank, Unit 2) | Drags words from a word cloud into the blanks of the story's sentences, one sentence at a time. |

Every game gives visual feedback only:
- A correct answer pops into place; a wrong one glides back and shakes.
- After two wrong tries, the right answer gently pulses.
- At the end the child sees 1–3 stars and confetti, then can play again.
- Content is shuffled on every play, so answers never line up with their targets (fill-blank, and the sentence games of a unit marked `inOrder` like Unit 2, keep their sentences in the textbook's order; pictures and word tiles still shuffle).

## Built for children and classrooms

- **No scrolling:** every game fits the screen on every iPad, laptop and projector size, and the e2e tests check this.
- **Proper Arabic:** all Arabic is set in Noto Naskh with full tashkeel. Words split around a missing letter still join correctly in Safari.
- **Big targets:** large touch targets, no double-tap zoom, and drag-and-drop that works on iOS.
- **Animated pictures:** cartoon art and Google Noto emoji play at key moments, and stay still for users who prefer reduced motion.
- **Links:** each unit and game has its own link, e.g. `/#/unit/unit-1/letter-forms/zay` opens the ز letter-forms game directly.

## Running it locally

Requires Node.js 22.18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest): data, Arabic joining rules, game logic |
| `npm run test:e2e` | Browser tests (Playwright, WebKit + Chromium): no-scroll on 12 screen sizes, drag rules, navigation |

The first time you run the e2e tests, install the browsers with `npx playwright install`.

## Adding or changing content

All curriculum content lives in one file, **[`src/data/units.ts`](src/data/units.ts)**: units, vocabulary, sentences, letter-form words and unscramble sets. Arabic is stored with full tashkeel exactly as it should appear.

- **New word:** give it an `emoji`, and optionally `art` (a Lottie JSON or WebP in `public/art/`) or an `image`. Then run `node scripts/fetch-emoji-assets.mjs` to download the Noto art for any new emoji.
- **New letter in the letter-forms game:** add a set to `letterForms`. The letter chooser picks it up automatically, and its tiles (4 forms, or 2 for letters like ز that never join forward) are worked out for you.
- **New letter-forms word:** write it with `letterFormItem(id, target, letter, emoji)` (in `src/lib/arabicJoining.ts`). It splits the vowelled word at the letter and works out each blank's fill and form, so there are no parts to write by hand.
- **New unit:** add it to `units`, with its own `games` list. A game whose data is empty (for example `sentencePictures: []`) shows as "قَرِيبًا". An optional `story` shows under the unit title.
- **Fill-blank:** a `fillBlank` with `words` (the word cloud) and `sentences`. Each blank lists the cloud words it `accept`s; two blanks that accept the same two words are filled in either order. All sentences show at once, numbered, in the order you list them, with the cloud words below in their listed order.
- `npm test` checks the data: every word's parts rebuild the target word, every answer matches its joining context, and every picture file exists.

## Tech

Vite · React 19 · TypeScript (strict) · Tailwind CSS · Radix Dialog · lottie-web. Deployed on Vercel.

Project rules (fonts, Arabic joining, touch sizes, no-scroll) are in [`CLAUDE.md`](CLAUDE.md), and the home/unit screen design is in [`docs/design/home-mockup.html`](docs/design/home-mockup.html).

## Credits

Emoji art: [Noto Emoji](https://github.com/googlefonts/noto-emoji) (Apache 2.0) and [Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/) (CC BY 4.0) by Google. Cartoon animations from [LottieFiles](https://lottiefiles.com) (Lottie Simple License). Full list: [`public/images/CREDITS.md`](public/images/CREDITS.md).
