// Single source of truth for all curriculum content. Static only — no runtime editing.
// Arabic text is stored with full tashkeel and must be displayed exactly as written here.

// A relative path with the extension (not the @/ alias): scripts/fetch-emoji-assets.mjs imports this
// file straight into Node, which resolves neither.
import { letterFormItem } from '../lib/arabicJoining.ts';

export type GameId = 'word-picture' | 'sentence-picture' | 'letter-forms' | 'unscramble' | 'fill-blank';
/** A contextual letter form as shown on a choice tile, e.g. 'بـ' 'ـبـ' 'ـب' 'ب' or 'ز' 'ـز'. */
export type LetterForm = string;

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
/** One letter's words in Game 3; the child picks a set (letter) first. */
export interface LetterFormSet {
  id: string; letter: string;
  name: string;         // e.g. 'حَرْفُ البَاءِ', shown under the letter in the chooser
  instruction: string;
  items: LetterFormItem[];
}
export interface UnscrambleTile { id: string; text: string; }
export interface UnscrambleSet {
  id: string; tiles: UnscrambleTile[]; answers: string[][]; needsReview?: string;
  image?: string;  // scene picture shown as a hint; set ONLY if the file exists in public/
}
export interface SentencePictureItem { id: string; sentence: string; image: string; }
/** A chip in the fill-blank word cloud. */
export interface FillBlankWord { id: string; text: string; }
export type FillBlankPart =
  | { type: 'text'; value: string }
  // accept: the cloud words that fit this blank (several = either order, each used by one blank of the
  // sentence). fill: the text shown once filled; omitted = the dropped word's own text.
  | { type: 'blank'; accept: string[]; fill?: string };
export interface FillBlankSentence { id: string; parts: FillBlankPart[]; }
/** One word cloud shared by all of a unit's sentences: every word fills exactly one blank. */
export interface FillBlankData { words: FillBlankWord[]; sentences: FillBlankSentence[]; }
export type Theme = 'sky' | 'mint' | 'peach' | 'lavender' | 'lemon';
export interface GameDef {
  id: GameId; title: string; instruction: string; emoji: string;
  short: string;  // one-line subtitle on the game card
  theme: Theme;
}
export interface Unit {
  id: string; title: string; letters: string[];
  label: string;  // e.g. 'الوَحْدَةُ الأُولَى'
  story?: string; // e.g. 'فِي البُسْتَانِ', shown under the unit title and on the fill-blank game
  theme: Theme;
  games: GameDef[]; vocab: VocabWord[]; sentencePictures: SentencePictureItem[];
  letterForms: LetterFormSet[]; unscramble: UnscrambleSet[];
  fillBlank?: FillBlankData;
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
  { id: 'darz', text: 'دَرَز', emoji: '🪡', art: { src: '/art/darz.webp', type: 'webp', still: '/art/darz-still.webp' } },
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

// Unit 2 pictures are Noto emoji for now; drop real pictures in later with `image` / `art`.
// TODO(teacher): confirm مُشْط، حَشَائِش، شَوْكَة (fork?)، مَدْرَسَة
const unit2Vocab: VocabWord[] = [
  { id: 'minshar', text: 'مِنْشَارٌ', emoji: '🪚' },
  { id: 'shams', text: 'شَمْسٌ', emoji: '☀️' },
  { id: 'musht', text: 'مُشْطٌ', emoji: '🪮' },
  { id: 'hashaish', text: 'حَشَائِشُ', emoji: '🌿' },
  { id: 'farasha', text: 'فَرَاشَةٌ', emoji: '🦋' },
  { id: 'risha', text: 'رِيشَةٌ', emoji: '🪶' },
  { id: 'shubbak', text: 'شُبَّاكٌ', emoji: '🪟' },
  { id: 'shahina', text: 'شَاحِنَةٌ', emoji: '🚚' },
  { id: 'shawka', text: 'شَوْكَةٌ', emoji: '🍴' },
  { id: 'risala', text: 'رِسَالَةٌ', emoji: '✉️' },
  { id: 'kursi', text: 'كُرْسِيٌّ', emoji: '🪑' },
  { id: 'madrasa', text: 'مَدْرَسَةٌ', emoji: '🏫' },
  { id: 'sayyara', text: 'سَيَّارَةٌ', emoji: '🚗' },
  { id: 'timsah', text: 'تِمْسَاحٌ', emoji: '🐊' },
  { id: 'lisan', text: 'لِسَانٌ', emoji: '👅' },
  { id: 'tawus', text: 'طَاوُوسٌ', emoji: '🦚' },
  { id: 'samak', text: 'سَمَكٌ', emoji: '🐟' },
  { id: 'sinjab', text: 'سِنْجَابٌ', emoji: '🐿️' },
  { id: 'masrah', text: 'مَسْرَحٌ', emoji: '🎭' },
  { id: 'sulahfat', text: 'سُلَحْفَاةٌ', emoji: '🐢' },
  { id: 'dirs', text: 'ضِرْسٌ', emoji: '🦷' },
  { id: 'nasr', text: 'نَسْرٌ', emoji: '🦅' },
  { id: 'sahir', text: 'سَاحِرٌ', emoji: '🧙' },
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
        title: 'أَشْكَالُ الحُرُوفِ',
        instruction: 'أَخْتَارُ الحَرْفَ', // the letter chooser; each set has its own instruction
        emoji: '🔤',
        short: 'أَخْتَارُ حَرْفًا وَأُكْمِلُ الكَلِمَةَ',
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
        id: 'baa',
        letter: 'ب',
        name: 'حَرْفُ البَاءِ',
        instruction: 'أَضَعُ الحَرْفَ (ب) بِالشَّكْلِ المُنَاسِبِ مَكَانَ النُّقَطِ',
        items: [
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
      },
      // TODO(teacher): confirm كَرَز and the tashkeel of the ز words.
      {
        id: 'zay',
        letter: 'ز',
        name: 'حَرْفُ الزَّايِ',
        instruction: 'أَضَعُ الحَرْفَ (ز) بِالشَّكْلِ المُنَاسِبِ مَكَانَ النُّقَطِ',
        items: [
          {
            id: 'manzil',
            emoji: '🏠',
            target: 'مَنْزِل',
            parts: [
              { type: 'text', value: 'مَنْ' },
              { type: 'blank', answer: 'ـز', fill: 'زِ' },
              { type: 'text', value: 'ل' },
            ],
          },
          {
            id: 'nazala',
            emoji: '🧒', art: { src: '/art/nazala.webp', type: 'webp' }, // a boy walking down stairs
            target: 'نَزَلَ',
            parts: [
              { type: 'text', value: 'نَ' },
              { type: 'blank', answer: 'ـز', fill: 'زَ' },
              { type: 'text', value: 'لَ' },
            ],
          },
          {
            id: 'karaz',
            emoji: '🍒',
            target: 'كَرَز',
            parts: [
              { type: 'text', value: 'كَرَ' },
              { type: 'blank', answer: 'ز', fill: 'ز' },
            ],
          },
          {
            id: 'jazar',
            emoji: '🥕', art: { src: '/art/jazar.webp', type: 'webp', still: '/art/jazar-still.webp' },
            target: 'جَزَر',
            parts: [
              { type: 'text', value: 'جَ' },
              { type: 'blank', answer: 'ـز', fill: 'زَ' },
              { type: 'text', value: 'ر' },
            ],
          },
          {
            id: 'zarafa',
            emoji: '🦒', art: { src: '/art/zarafa.json', type: 'lottie' },
            target: 'زَرَافَة',
            parts: [
              { type: 'blank', answer: 'ز', fill: 'زَ' },
              { type: 'text', value: 'رَافَة' },
            ],
          },
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
  {
    id: 'unit-2',
    label: 'الوَحْدَةُ الثَّانِيَةُ',
    title: 'حَرْفَا السِّينِ وَالشِّينِ',
    letters: ['س', 'ش'],
    story: 'فِي البُسْتَانِ',
    theme: 'mint',
    games: [
      {
        id: 'word-picture',
        title: 'رَبْطُ الكَلِمَةِ بِالصُّورَةِ',
        instruction: 'أَرْبِطُ الكَلِمَةَ بِالصُّورَةِ',
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
        title: 'أَشْكَالُ الحُرُوفِ',
        instruction: 'أَخْتَارُ الحَرْفَ', // the letter chooser; each set has its own instruction
        emoji: '🔤',
        short: 'أَخْتَارُ حَرْفًا وَأُكْمِلُ الكَلِمَةَ',
        theme: 'mint',
      },
      {
        id: 'fill-blank',
        title: 'مَلْءُ الفَرَاغِ',
        instruction: 'أَخْتَارُ الكَلِمَةَ المُنَاسِبَةَ وَأَضَعُهَا مَكَانَ الفَرَاغِ',
        emoji: '✏️',
        short: 'أَضَعُ الكَلِمَةَ فِي مَكَانِهَا',
        theme: 'lavender',
      },
    ],
    vocab: unit2Vocab,
    sentencePictures: [], // TODO: sentences + pictures coming
    letterForms: [
      // TODO(teacher): confirm فَرَاش vs فِرَاش, and جَيْش vs حَشِيش
      {
        id: 'seen',
        letter: 'س',
        name: 'حَرْفُ السِّينِ',
        instruction: 'أَضَعُ الحَرْفَ (س) بِالشَّكْلِ المُنَاسِبِ مَكَانَ النُّقَطِ',
        items: [
          letterFormItem('fustan', 'فُسْتَان', 'س', '👗'),
          letterFormItem('samaka', 'سَمَكَة', 'س', '🐟'),
          letterFormItem('kass', 'كَأْس', 'س', '🥛'),
          letterFormItem('ananas', 'أَنَانَاس', 'س', '🍍'),
          letterFormItem('jalasa', 'جَلَسَ', 'س', '🪑'),
          letterFormItem('mistara', 'مِسْطَرَة', 'س', '📏'),
        ],
      },
      {
        id: 'sheen',
        letter: 'ش',
        name: 'حَرْفُ الشِّينِ',
        instruction: 'أَضَعُ الحَرْفَ (ش) بِالشَّكْلِ المُنَاسِبِ مَكَانَ النُّقَطِ',
        items: [
          letterFormItem('khashab', 'خَشَب', 'ش', '🪵'),
          letterFormItem('minshafa', 'مِنْشَفَة', 'ش', '🧺'),
          letterFormItem('farash', 'فَرَاش', 'ش', '🦋'),
          letterFormItem('qirsh', 'قِرْش', 'ش', '🦈'),
          letterFormItem('jaysh', 'جَيْش', 'ش', '💂'),
          letterFormItem('shajara', 'شَجَرَة', 'ش', '🌳'),
          letterFormItem('shamaa', 'شَمْعَة', 'ش', '🕯️'),
        ],
      },
    ],
    unscramble: [],
    fillBlank: {
      words: [
        { id: 'ilal-bustan', text: 'إِلَى البُسْتَان' },
        { id: 'awraq', text: 'أَوْرَاق' },
        { id: 'shajara', text: 'شَجَرَة' },
        { id: 'mishmish', text: 'المِشْمِش' },
        { id: 'akhdar', text: 'أَخْضَر' },
        { id: 'anis', text: 'أَنِيس' },
        { id: 'shadia', text: 'شَادْيَا' },
      ],
      sentences: [
        {
          id: 's1',
          parts: [
            { type: 'text', value: 'سَارَ أَنِيس وَشَادْيَا ' },
            { type: 'blank', accept: ['ilal-bustan'], fill: 'إِلَى البُسْتَانِ' },
            { type: 'text', value: '.' },
          ],
        },
        // TODO(teacher): confirm the first word (اِخْضَرَّتْ أَوْرَاقُ ...)
        {
          id: 's2',
          parts: [
            { type: 'text', value: 'اِخْضَرَّتْ ' },
            { type: 'blank', accept: ['awraq'], fill: 'أَوْرَاقُ' },
            { type: 'text', value: ' ' },
            { type: 'blank', accept: ['shajara'], fill: 'شَجَرَةِ' },
            { type: 'text', value: ' المِشْمِشِ.' },
          ],
        },
        {
          id: 's3',
          parts: [
            { type: 'text', value: 'رَسَمَ أَنِيس وَشَادْيَا شَجَرَةَ ' },
            { type: 'blank', accept: ['mishmish'], fill: 'المِشْمِشِ' },
            { type: 'text', value: ' بِلَوْنٍ ' },
            { type: 'blank', accept: ['akhdar'], fill: 'أَخْضَرَ' },
            { type: 'text', value: '.' },
          ],
        },
        {
          // The two names fill the two blanks in either order (no fill: each shows its own text).
          id: 's4',
          parts: [
            { type: 'text', value: 'شَكَرَتْ شَجَرَةُ المِشْمِشِ ' },
            { type: 'blank', accept: ['anis', 'shadia'] },
            { type: 'text', value: ' وَ' },
            { type: 'blank', accept: ['anis', 'shadia'] },
            { type: 'text', value: '.' },
          ],
        },
      ],
    },
  },
];

/** Every Game 3 word of a unit, across its letter sets. */
export function letterFormItems(unit: Unit): LetterFormItem[] {
  return unit.letterForms.flatMap((set) => set.items);
}

/** Whether a unit has content for one of its games; a game without any shows as "coming soon". */
export function gameHasContent(unit: Unit, gameId: GameId): boolean {
  switch (gameId) {
    case 'word-picture':
      return unit.vocab.length > 0;
    case 'sentence-picture':
      return unit.sentencePictures.length > 0;
    case 'letter-forms':
      return letterFormItems(unit).length > 0;
    case 'unscramble':
      return unit.unscramble.some((set) => set.answers.length > 0);
    case 'fill-blank':
      return (unit.fillBlank?.sentences.length ?? 0) > 0;
  }
}

export function getUnit(id: string): Unit | undefined {
  return units.find((unit) => unit.id === id);
}
