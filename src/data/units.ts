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
  /** The sentence games (matching, unscramble) list their sentences in the order written here; pictures and word tiles still shuffle. */
  inOrder?: boolean;
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

// Unit 2 pictures are in public/images/unit-2/<id>.<ext>; a word without one yet (minshar, shams, lisan) shows its Noto emoji.
// TODO(teacher): confirm شَوْكَة (fork?)، مَدْرَسَة
/** Animated WebP in public/images/unit-2/ with its first-frame still. */
const webpArt = (id: string): Art => ({ src: `/images/unit-2/${id}.webp`, type: 'webp', still: `/images/unit-2/${id}-still.webp` });

const unit2Vocab: VocabWord[] = [
  { id: 'minshar', text: 'مِنْشَارٌ', emoji: '🪚' },
  { id: 'shams', text: 'شَمْسٌ', emoji: '☀️', art: webpArt('shams') },
  { id: 'shaar', text: 'شَعْرٌ', emoji: '💇', art: { src: '/images/unit-2/shaar.webp', type: 'webp', still: '/images/unit-2/shaar-still.webp' } },
  { id: 'khuffash', text: 'خُفَّاشٌ', emoji: '🦇', art: { src: '/images/unit-2/khuffash.webp', type: 'webp', still: '/images/unit-2/khuffash-still.webp' } },
  { id: 'furshah', text: 'فُرْشَاةٌ', emoji: '🪥', art: { src: '/images/unit-2/furshah.webp', type: 'webp', still: '/images/unit-2/furshah-still.webp' } },
  { id: 'risha', text: 'رِيشَةٌ', emoji: '🪶', image: '/images/unit-2/risha.jpg' },
  { id: 'shubbak', text: 'شُبَّاكٌ', emoji: '🪟', art: { src: '/images/unit-2/shubbak.webp', type: 'webp', still: '/images/unit-2/shubbak-still.webp' } },
  { id: 'shahina', text: 'شَاحِنَةٌ', emoji: '🚚', image: '/images/unit-2/shahina.jpg' },
  { id: 'shawka', text: 'شَوْكَةٌ', emoji: '🍴', image: '/images/unit-2/shawka.png' },
  { id: 'risala', text: 'رِسَالَةٌ', emoji: '✉️', image: '/images/unit-2/risala.jpg' },
  { id: 'kursi', text: 'كُرْسِيٌّ', emoji: '🪑', art: { src: '/images/unit-2/kursi.webp', type: 'webp', still: '/images/unit-2/kursi-still.webp' } },
  { id: 'madrasa', text: 'مَدْرَسَةٌ', emoji: '🏫', art: { src: '/images/unit-2/madrasa.webp', type: 'webp', still: '/images/unit-2/madrasa-still.webp' } },
  { id: 'sayyara', text: 'سَيَّارَةٌ', emoji: '🚗', art: { src: '/images/unit-2/sayyara.webp', type: 'webp', still: '/images/unit-2/sayyara-still.webp' } },
  { id: 'timsah', text: 'تِمْسَاحٌ', emoji: '🐊', art: { src: '/images/unit-2/timsah.webp', type: 'webp', still: '/images/unit-2/timsah-still.webp' } },
  { id: 'lisan', text: 'لِسَانٌ', emoji: '👅', art: webpArt('lisan') }, // idle still is the LAST frame (the tongue only shows there)
  { id: 'tawus', text: 'طَاوُوسٌ', emoji: '🦚', art: { src: '/images/unit-2/tawus.webp', type: 'webp', still: '/images/unit-2/tawus-still.webp' } },
  { id: 'samak', text: 'سَمَكٌ', emoji: '🐟', art: { src: '/images/unit-2/samak.webp', type: 'webp', still: '/images/unit-2/samak-still.webp' } },
  { id: 'sinjab', text: 'سِنْجَابٌ', emoji: '🐿️', art: { src: '/images/unit-2/sinjab.webp', type: 'webp', still: '/images/unit-2/sinjab-still.webp' } },
  { id: 'masrah', text: 'مَسْرَحٌ', emoji: '🎭', art: { src: '/images/unit-2/masrah.webp', type: 'webp', still: '/images/unit-2/masrah-still.webp' } },
  { id: 'sulahfat', text: 'سُلَحْفَاةٌ', emoji: '🐢', art: { src: '/images/unit-2/sulahfat.webp', type: 'webp', still: '/images/unit-2/sulahfat-still.webp' } },
  { id: 'dirs', text: 'ضِرْسٌ', emoji: '🦷', art: { src: '/images/unit-2/dirs.webp', type: 'webp', still: '/images/unit-2/dirs-still.webp' } },
  { id: 'nasr', text: 'نَسْرٌ', emoji: '🦅', art: { src: '/images/unit-2/nasr.webp', type: 'webp', still: '/images/unit-2/nasr-still.webp' } },
  { id: 'sahir', text: 'سَاحِرٌ', emoji: '🧙', image: '/images/unit-2/sahir.jpg' },
];

/**
 * A Unit 2 word that also appears in another game uses exactly the same picture there: the picture is
 * taken from the vocab word, never drawn or chosen twice.
 */
const vocabPicture = (id: string): Pick<VocabWord, 'art' | 'image'> => {
  const { art, image } = unit2Vocab.find((w) => w.id === id)!;
  return { art, image };
};

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
    inOrder: true,
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
      {
        id: 'unscramble',
        title: 'تَرْتِيبُ الكَلِمَاتِ',
        instruction: 'أُرَتِّبُ الكَلِمَاتِ التَّالِيَةَ فِي جُمْلَةٍ مُفِيدَةٍ',
        emoji: '🧩',
        short: 'أُرَتِّبُ الكَلِمَاتِ فِي جُمْلَةٍ',
        theme: 'lemon',
      },
    ],
    vocab: unit2Vocab,
    // The story, one sentence per scene, in story order.
    sentencePictures: [
      { id: 'sp-1', sentence: 'سَارَ أَنِيس وَشَادْيَا إِلَى البُسْتَانِ.', image: '/images/unit-2/scene-1.jpg' },
      { id: 'sp-2', sentence: 'خَسِرَتْ شَجَرَةُ المِشْمِشِ أَوْرَاقَهَا.', image: '/images/unit-2/scene-2.jpg' },
      { id: 'sp-3', sentence: 'دَهَنَ أَنِيس وَشَادْيَا شَجَرَةَ المِشْمِشِ بِلَوْنٍ أَخْضَرَ.', image: '/images/unit-2/scene-3.jpg' },
      { id: 'sp-4', sentence: 'شَكَرَتْ شَجَرَةُ المِشْمِشِ أَنِيس وَشَادْيَا.', image: '/images/unit-2/scene-4.png' },
    ],
    letterForms: [
      // TODO(teacher): confirm فَرَاشَة (butterfly), and جَيْش vs حَشِيش
      {
        id: 'seen',
        letter: 'س',
        name: 'حَرْفُ السِّينِ',
        instruction: 'أَضَعُ الحَرْفَ (س) بِالشَّكْلِ المُنَاسِبِ مَكَانَ النُّقَطِ',
        items: [
          { ...letterFormItem('fustan', 'فُسْتَان', 'س', '👗'), art: webpArt('fustan') },
          letterFormItem('samaka', 'سَمَكَة', 'س', '🐟'),
          { ...letterFormItem('kass', 'كَأْس', 'س', '🥛'), art: webpArt('kass') },
          { ...letterFormItem('ananas', 'أَنَانَاس', 'س', '🍍'), art: webpArt('ananas') },
          { ...letterFormItem('jalasa', 'جَلَسَ', 'س', '🪑'), ...vocabPicture('kursi') }, // the same chair as the word game
          letterFormItem('mistara', 'مِسْطَرَة', 'س', '📏'),
        ],
      },
      {
        id: 'sheen',
        letter: 'ش',
        name: 'حَرْفُ الشِّينِ',
        instruction: 'أَضَعُ الحَرْفَ (ش) بِالشَّكْلِ المُنَاسِبِ مَكَانَ النُّقَطِ',
        items: [
          { ...letterFormItem('khashab', 'خَشَب', 'ش', '🪵'), art: webpArt('khashab') },
          { ...letterFormItem('minshafa', 'مِنْشَفَة', 'ش', '🛁'), image: '/images/unit-2/minshafa.png' }, // no towel emoji exists
          letterFormItem('farasha', 'فَرَاشَة', 'ش', '🦋'),
          letterFormItem('qirsh', 'قِرْش', 'ش', '🦈'),
          { ...letterFormItem('jaysh', 'جَيْش', 'ش', '💂'), image: '/images/unit-2/jaysh.png' },
          { ...letterFormItem('shajara', 'شَجَرَة', 'ش', '🌳'), image: '/images/unit-2/shajara.png' },
          { ...letterFormItem('shamaa', 'شَمْعَة', 'ش', '🕯️'), image: '/images/unit-2/shamaa.png' },
        ],
      },
    ],
    // The four story sentences again (same scenes as sentencePictures), one word per tile.
    unscramble: [
      {
        id: 'set-1',
        image: '/images/unit-2/scene-1.jpg',
        tiles: [
          { id: 'bustan', text: 'البُسْتَانِ' },
          { id: 'sara', text: 'سَارَ' },
          { id: 'shadia', text: 'وَشَادْيَا' },
          { id: 'ila', text: 'إِلَى' },
          { id: 'anis', text: 'أَنِيس' },
        ],
        answers: [['sara', 'anis', 'shadia', 'ila', 'bustan']],
      },
      {
        id: 'set-2',
        image: '/images/unit-2/scene-2.jpg',
        tiles: [
          { id: 'awraquha', text: 'أَوْرَاقَهَا' },
          { id: 'shajara', text: 'شَجَرَةُ' },
          { id: 'khasirat', text: 'خَسِرَتْ' },
          { id: 'mishmish', text: 'المِشْمِشِ' },
        ],
        answers: [['khasirat', 'shajara', 'mishmish', 'awraquha']],
      },
      {
        id: 'set-3',
        image: '/images/unit-2/scene-3.jpg',
        tiles: [
          { id: 'akhdar', text: 'أَخْضَرَ' },
          { id: 'shajara', text: 'شَجَرَةَ' },
          { id: 'dahana', text: 'دَهَنَ' },
          { id: 'bilawnin', text: 'بِلَوْنٍ' },
          { id: 'shadia', text: 'وَشَادْيَا' },
          { id: 'mishmish', text: 'المِشْمِشِ' },
          { id: 'anis', text: 'أَنِيس' },
        ],
        answers: [['dahana', 'anis', 'shadia', 'shajara', 'mishmish', 'bilawnin', 'akhdar']],
      },
      {
        id: 'set-4',
        image: '/images/unit-2/scene-4.png',
        tiles: [
          { id: 'shadia', text: 'وَشَادْيَا' },
          { id: 'shakarat', text: 'شَكَرَتْ' },
          { id: 'mishmish', text: 'المِشْمِشِ' },
          { id: 'anis', text: 'أَنِيس' },
          { id: 'shajara', text: 'شَجَرَةُ' },
        ],
        answers: [['shakarat', 'shajara', 'mishmish', 'anis', 'shadia']],
      },
    ],
    // Fixed worksheet order for both the sentences and the cloud: the one game that is not shuffled.
    fillBlank: {
      words: [
        { id: 'awraquha', text: 'أَوْرَاقَهَا' },
        { id: 'mishmish', text: 'المِشْمِش' },
        { id: 'ilal-bustan', text: 'إِلَى البُسْتَان' },
        { id: 'anis', text: 'أَنِيس' },
        { id: 'shadia', text: 'شَادْيَا' },
        { id: 'shajara', text: 'شَجَرَة' },
        { id: 'akhdar', text: 'أَخْضَر' },
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
        {
          id: 's2',
          parts: [
            { type: 'text', value: 'خَسِرَتْ ' },
            { type: 'blank', accept: ['shajara'], fill: 'شَجَرَةُ' },
            { type: 'text', value: ' المِشْمِشِ ' },
            { type: 'blank', accept: ['awraquha'], fill: 'أَوْرَاقَهَا' },
            { type: 'text', value: '.' },
          ],
        },
        {
          id: 's3',
          parts: [
            { type: 'text', value: 'دَهَنَ أَنِيس وَشَادْيَا شَجَرَةَ ' },
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
