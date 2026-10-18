// Single source of truth for all curriculum content. Static only — no runtime editing.
// Arabic text is stored with full tashkeel and must be displayed exactly as written here.

export type GameId = 'word-picture' | 'sentence-picture' | 'letter-forms' | 'unscramble';
export type LetterForm = 'بـ' | 'ـبـ' | 'ـب' | 'ب';

export interface VocabWord {
  id: string;                 // ascii slug = asset file name
  text: string;               // full tashkeel
  emoji: string;              // fallback if the image is missing or fails to load
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
  image?: string;  // set ONLY if the file exists in public/
}
export interface UnscrambleTile { id: string; text: string; }
export interface UnscrambleSet { id: string; tiles: UnscrambleTile[]; answers: string[][]; needsReview?: string; }
export interface SentencePictureItem { id: string; sentence: string; image: string; }
export interface GameDef { id: GameId; title: string; instruction: string; emoji: string; }
export interface Unit {
  id: string; title: string; letters: string[]; color: string;
  games: GameDef[]; vocab: VocabWord[]; sentencePictures: SentencePictureItem[];
  letterForms: LetterFormItem[]; unscramble: UnscrambleSet[];
}

// Asset conventions (paths are relative to public/, served from the site root):
//   images: /images/characters/<id>.<ext> (razi, zizi) or /images/unit-1/<id>.<ext>
//   audio:  /audio/unit-1/<id>.<ext>
// Add `image` / `audio` to a word only once the file exists; units.test.ts checks every path.
const unit1Vocab: VocabWord[] = [
  { id: 'razi', text: 'رَازِي', emoji: '👦', confusableWith: ['ab'] },
  { id: 'zizi', text: 'زِيزِي', emoji: '👧' },
  { id: 'zara', text: 'زَارَ', emoji: '👋', image: '/images/unit-1/zara.jpg', confusableWith: ['zahra'] },
  { id: 'bayt', text: 'بَيْت', emoji: '🏠' },
  { id: 'sharaha', text: 'شَرَحَ', emoji: '🧑‍🏫' },
  { id: 'arza', text: 'أَرْزَة', emoji: '🌲' },
  { id: 'mawza', text: 'مَوْزَة', emoji: '🍌' },
  { id: 'zahra', text: 'زَهْرَة', emoji: '🌷', confusableWith: ['zara'] },
  { id: 'darz', text: 'دَرْز', emoji: '🪡' },
  { id: 'kalb', text: 'كَلْب', emoji: '🐕', confusableWith: ['barud'] },
  // Barud is the dog's name.
  { id: 'barud', text: 'بَارُود', emoji: '🐩', confusableWith: ['kalb'] },
  { id: 'bab', text: 'بَابُ', emoji: '🚪' },
  { id: 'tabl', text: 'طَبْل', emoji: '🥁' },
  { id: 'zabib', text: 'زَبِيب', emoji: '🍇' },
  { id: 'barid', text: 'بَارِد', emoji: '🥶' },
  { id: 'duroob', text: 'دُرُوب', emoji: '🛣️' },
  { id: 'arnab', text: 'أَرْنَب', emoji: '🐇' },
  { id: 'ab', text: 'أَب', emoji: '👨‍👦', confusableWith: ['razi'] },
  { id: 'laiba', text: 'لَعِبَ', emoji: '🤸', image: '/images/unit-1/laiba.png' },
];

export const units: Unit[] = [
  {
    id: 'unit-1',
    title: 'حَرْفَا الْبَاءِ وَالزَّايِ',
    letters: ['ب', 'ز'],
    color: '#D8ECF7',
    games: [
      {
        id: 'word-picture',
        title: 'رَبْطُ الكَلِمَةِ بِالصُّورَةِ',
        instruction: 'أَخْتَارُ الكَلِمَةَ المُنَاسِبَةَ وَأَضَعُهَا تَحْتَ الصُّورَةِ',
        emoji: '🖼️',
      },
      {
        id: 'sentence-picture',
        title: 'رَبْطُ الجُمْلَةِ بِالرَّسْمِ',
        instruction: 'أَصِلُ الجُمْلَةَ بِالرَّسْمِ المُنَاسِبِ لَهَا',
        emoji: '📖',
      },
      {
        id: 'letter-forms',
        title: 'أَشْكَالُ حَرْفِ البَاءِ',
        instruction: 'أَضَعُ الحَرْفَ (ب) بِالشَّكْلِ المُنَاسِبِ مَكَانَ النُّقَطِ',
        emoji: '🔤',
      },
      {
        id: 'unscramble',
        title: 'تَرْتِيبُ الكَلِمَاتِ',
        instruction: 'أُرَتِّبُ الكَلِمَاتِ التَّالِيَةَ فِي جُمْلَةٍ مُفِيدَةٍ',
        emoji: '🧩',
      },
    ],
    vocab: unit1Vocab,
    sentencePictures: [
      { id: 'sp-1', sentence: 'زَارَ رَازِي بَيْتَ زِيزِي.', image: '/images/game-2/image-3.png' },
      { id: 'sp-2', sentence: 'شَرَحَ رَازِي الدَّرْسَ لِزِيزِي.', image: '/images/game-2/image-1.png' },
      { id: 'sp-3', sentence: 'لَعِبَ الكَلْبُ بَارُود قُرْبَ رَازِي فِي البَيْتِ.', image: '/images/game-2/image-2.png' },
    ],
    letterForms: [
      {
        id: 'dabdoob',
        emoji: '🧸',
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
        emoji: '🔌', image: '/images/unit-1/qarraba.webp',
        target: 'قَرَّبَ',
        parts: [
          { type: 'text', value: 'قَرَّ' },
          { type: 'blank', answer: 'ب', fill: 'بَ' },
        ],
      },
      {
        id: 'laiba',
        emoji: '🤸', image: '/images/unit-1/laiba.png',
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
