// Single source of truth for all curriculum content. Static only — no runtime editing.
// Arabic text is stored with full tashkeel and must be displayed exactly as written here.

export type GameId = 'word-picture' | 'sentence-picture' | 'letter-forms' | 'unscramble';
export type LetterForm = 'بـ' | 'ـبـ' | 'ـب' | 'ب';

/**
 * Cartoon art for a word, in public/art/. Shown instead of the
 * Noto emoji. lottie: a Lottie JSON. webp: an animated WebP plus a still first frame shown when idle;
 * without `still` it's a static picture that gets the gentle CSS motion.
 */
export interface Art { src: string; type: 'lottie' | 'webp'; still?: string; }

export interface VocabWord {
  id: string;                 // ascii slug = asset file name
  text: string;               // full tashkeel
  emoji: string;              // fallback if the image is missing or fails to load
  art?: Art;                  // preferred over image and emoji; set ONLY if the files exist in public/
  image?: string;             // set ONLY if the file exists in public/
  audio?: string;             // set ONLY if the file exists in public/
  confusableWith?: string[];  // never in the same round
}
export type LetterFormPart =
  | { type: 'text'; value: string }
  | { type: 'blank'; answer: LetterForm; fill: string }; // fill = letter WITH tashkeel as it appears in the word
export interface LetterFormItem {
  id: string; target: string; parts: LetterFormPart[];
  emoji: string;   // picture of the word; fallback if the image is missing or fails to load
  art?: Art;       // preferred over image and emoji; set ONLY if the files exist in public/
  image?: string;  // set ONLY if the file exists in public/
}
export interface UnscrambleTile { id: string; text: string; }
export interface UnscrambleSet {
  id: string; tiles: UnscrambleTile[]; answers: string[][]; needsReview?: string;
  image?: string;  // scene picture shown as a hint; set ONLY if the file exists in public/
}
export interface SentencePictureItem { id: string; sentence: string; image: string; }
export type Theme = 'sky' | 'mint' | 'peach' | 'lavender' | 'lemon';
export interface GameDef {
  id: GameId; title: string; instruction: string; emoji: string;
  short: string;  // one-line subtitle on the game card
  theme: Theme;
}
export interface Unit {
  id: string; title: string; letters: string[];
  label: string;  // e.g. 'الوَحْدَةُ الأُولَى'
  theme: Theme;
  games: GameDef[]; vocab: VocabWord[]; sentencePictures: SentencePictureItem[];
  letterForms: LetterFormItem[]; unscramble: UnscrambleSet[];
}

// Asset conventions (paths are relative to public/, served from the site root):
//   images: /images/characters/<id>.<ext> (razi, zizi) or /images/unit-1/<id>.<ext>
//   audio:  /audio/unit-1/<id>.<ext>
// Add `image` / `audio` to a word only once the file exists; units.test.ts checks every path.
const unit1Vocab: VocabWord[] = [
  { id: 'razi', text: 'رَازِي', emoji: '👦', art: { src: '/art/razi.webp', type: 'webp', still: '/art/razi-still.webp' }, confusableWith: ['ab', 'barid'] },
  { id: 'zizi', text: 'زِيزِي', emoji: '👧', art: { src: '/art/zizi.json', type: 'lottie' }, confusableWith: ['ab'] },
  { id: 'zara', text: 'زَارَ', emoji: '👋', image: '/images/unit-1/zara.jpg', confusableWith: ['zahra', 'bab', 'bayt'] },
  { id: 'bayt', text: 'بَيْت', emoji: '🏠', confusableWith: ['zara'] },
  { id: 'sharaha', text: 'شَرَحَ', emoji: '🧑‍🏫', art: { src: '/art/sharaha.json', type: 'lottie' } },
  { id: 'arza', text: 'أَرْزَة', emoji: '🌲' },
  { id: 'mawza', text: 'مَوْزَة', emoji: '🍌', art: { src: '/art/mawza.json', type: 'lottie' } },
  { id: 'zahra', text: 'زَهْرَة', emoji: '🌷', confusableWith: ['zara'] },
  { id: 'darz', text: 'دَرْز', emoji: '🪡', art: { src: '/art/darz.json', type: 'lottie' } },
  { id: 'kalb', text: 'كَلْب', emoji: '🐕', confusableWith: ['barud'] },
  // Barud is the dog's name.
  { id: 'barud', text: 'بَارُود', emoji: '🐩', confusableWith: ['kalb'] },
  { id: 'bab', text: 'بَابُ', emoji: '🚪', art: { src: '/art/bab.json', type: 'lottie' }, confusableWith: ['zara'] },
  { id: 'tabl', text: 'طَبْل', emoji: '🥁' },
  { id: 'zabib', text: 'زَبِيب', emoji: '🍇', art: { src: '/art/zabib.webp', type: 'webp' } },
  { id: 'barid', text: 'بَارِد', emoji: '🥶', art: { src: '/art/barid.webp', type: 'webp', still: '/art/barid-still.webp' }, confusableWith: ['razi'] },
  { id: 'darb', text: 'دَرْب', emoji: '🛣️', art: { src: '/art/darb.json', type: 'lottie' } },
  { id: 'arnab', text: 'أَرْنَب', emoji: '🐇' },
  { id: 'ab', text: 'أَب', emoji: '👨‍👦', art: { src: '/art/ab.webp', type: 'webp', still: '/art/ab-still.webp' }, confusableWith: ['razi', 'zizi'] },
  { id: 'laiba', text: 'لَعِبَ', emoji: '🤸', art: { src: '/art/laiba.json', type: 'lottie' } },
];

export const units: Unit[] = [
  {
    id: 'unit-1',
    title: 'حَرْفَا الْبَاءِ وَالزَّايِ',
    letters: ['ب', 'ز'],
    label: 'الوَحْدَةُ الأُولَى',
    theme: 'sky',
    games: [
      {
        id: 'word-picture',
        title: 'رَبْطُ الكَلِمَةِ بِالصُّورَةِ',
        instruction: 'أَخْتَارُ الكَلِمَةَ المُنَاسِبَةَ وَأَضَعُهَا تَحْتَ الصُّورَةِ',
        emoji: '🖼️',
        short: 'أَضَعُ الكَلِمَةَ تَحْتَ صُورَتِهَا',
        theme: 'sky',
      },
      {
        id: 'sentence-picture',
        title: 'رَبْطُ الجُمْلَةِ بِالرَّسْمِ',
        instruction: 'أَصِلُ الجُمْلَةَ بِالرَّسْمِ المُنَاسِبِ لَهَا',
        emoji: '📖',
        short: 'أَصِلُ الجُمْلَةَ بِرَسْمِهَا',
        theme: 'peach',
      },
      {
        id: 'letter-forms',
        title: 'أَشْكَالُ حَرْفِ البَاءِ',
        instruction: 'أَضَعُ الحَرْفَ (ب) بِالشَّكْلِ المُنَاسِبِ مَكَانَ النُّقَطِ',
        emoji: '🔤',
        short: 'أُكْمِلُ الكَلِمَةَ بِالشَّكْلِ المُنَاسِبِ',
        theme: 'mint',
      },
      {
        id: 'unscramble',
        title: 'تَرْتِيبُ الكَلِمَاتِ',
        instruction: 'أُرَتِّبُ الكَلِمَاتِ التَّالِيَةَ فِي جُمْلَةٍ مُفِيدَةٍ',
        emoji: '🧩',
        short: 'أُرَتِّبُ الكَلِمَاتِ فِي جُمْلَةٍ',
        theme: 'lavender',
      },
    ],
    vocab: unit1Vocab,
    sentencePictures: [
      { id: 'sp-1', sentence: 'زَارَ رَازِي بَيْتَ زِيزِي.', image: '/images/game-2/image-3.jpg' },
      { id: 'sp-2', sentence: 'شَرَحَ رَازِي الدَّرْسَ لِزِيزِي.', image: '/images/game-2/image-1.png' },
      { id: 'sp-3', sentence: 'لَعِبَ الكَلْبُ بَارُود قُرْبَ رَازِي فِي البَيْتِ.', image: '/images/game-2/image-2.jpg' },
    ],
    letterForms: [
      {
        id: 'dabdoob',
        emoji: '🧸', art: { src: '/art/dabdoob.json', type: 'lottie' },
        target: 'دَبْدُوب',
        parts: [
          { type: 'text', value: 'دَ' },
          { type: 'blank', answer: 'بـ', fill: 'بْ' },
          { type: 'text', value: 'دُو' },
          { type: 'blank', answer: 'ب', fill: 'ب' },
        ],
      },
      {
        id: 'arnab',
        emoji: '🐇',
        target: 'أَرْنَب',
        parts: [
          { type: 'text', value: 'أَرْنَ' },
          { type: 'blank', answer: 'ـب', fill: 'ب' },
        ],
      },
      {
        id: 'tabl',
        emoji: '🥁',
        target: 'طَبْل',
        parts: [
          { type: 'text', value: 'طَ' },
          { type: 'blank', answer: 'ـبـ', fill: 'بْ' },
          { type: 'text', value: 'ل' },
        ],
      },
      {
        id: 'qarraba',
        emoji: '🔌', art: { src: '/art/qarraba.json', type: 'lottie' },
        target: 'قَرَّبَ',
        parts: [
          { type: 'text', value: 'قَرَّ' },
          { type: 'blank', answer: 'ب', fill: 'بَ' },
        ],
      },
      {
        id: 'laiba',
        emoji: '🤸', art: { src: '/art/laiba.json', type: 'lottie' },
        target: 'لَعِبَ',
        parts: [
          { type: 'text', value: 'لَعِ' },
          { type: 'blank', answer: 'ـب', fill: 'بَ' },
        ],
      },
      {
        id: 'alkalb',
        emoji: '🐕',
        target: 'الكَلْب',
        parts: [
          { type: 'text', value: 'الكَلْ' },
          { type: 'blank', answer: 'ـب', fill: 'ب' },
        ],
      },
    ],
    unscramble: [
      {
        id: 'set-1',
        image: '/images/game-2/image-2.jpg',
        tiles: [
          { id: 'fi', text: 'فِي' },
          { id: 'laiba', text: 'لَعِبَ' },
          { id: 'albayti', text: 'البَيْتِ' },
          { id: 'qurba', text: 'قُرْبَ' },
          { id: 'barud', text: 'بَارُود' },
          { id: 'razi', text: 'رَازِي' },
        ],
        answers: [['laiba', 'barud', 'qurba', 'razi', 'fi', 'albayti']],
        needsReview: 'Derived from the textbook sentence minus الكَلْبُ — confirm with teacher.',
      },
      {
        id: 'set-2',
        image: '/images/game-2/image-1.png',
        tiles: [
          { id: 'lizizi', text: 'لِزِيزِي' },
          { id: 'sharaha', text: 'شَرَحَ' },
          { id: 'addarsa', text: 'الدَّرْسَ' },
          { id: 'razi', text: 'رَازِي' },
        ],
        answers: [['sharaha', 'razi', 'addarsa', 'lizizi']],
      },
      {
        id: 'set-3',
        image: '/images/game-2/image-3.jpg',
        tiles: [
          { id: 'razi', text: 'رَازِي' },
          { id: 'zizi', text: 'زِيزِي' },
          { id: 'zara', text: 'زَارَ' },
          { id: 'bayta', text: 'بَيْتَ' },
        ],
        answers: [['zara', 'razi', 'bayta', 'zizi']],
      },
    ],
  },
];

export function getUnit(id: string): Unit | undefined {
  return units.find((unit) => unit.id === id);
}
