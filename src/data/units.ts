// Single source of truth for all curriculum content. Static only — no runtime editing.
// Arabic text is stored with full tashkeel and must be displayed exactly as written here.

// A relative path with the extension (not the @/ alias): scripts/fetch-emoji-assets.mjs imports this
// file straight into Node, which resolves neither.
import { letterFormItem } from '../lib/arabicJoining.ts';

export type GameId = 'word-picture' | 'sentence-picture' | 'letter-forms' | 'unscramble' | 'fill-blank' | 'demonstratives' | 'choose';
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
  /** Other letters whose tiles are offered too (Unit 3's set ت also has the ة tiles). */
  alsoLetters?: string[];
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
/** One multiple-choice question (Game 6); the answer is checked by option id. */
export interface ChooseOption {
  id: string; text: string;
  /** Whole words of `text` to stress (split only at spaces, so the letters still join). */
  highlight?: string;
  /** A picture of what the option is about, shown beside the text (Noto emoji art). */
  emoji?: string;
}
export interface ChooseQuestion {
  id: string;
  question: string;  // may be '' when a picture and a stem carry the question
  /** A picture of what the question is about, shown above it (art or image, else the emoji). */
  emoji?: string; art?: Art; image?: string;
  stem?: string;  // a sentence with a blank (ـــ) that fills with the right option
  options: ChooseOption[]; answerId: string;
}
/** One letter's words in Game 1 when a unit has several (the child picks a letter first). */
export interface WordSet { id: string; letter: string; name: string; wordIds: string[]; }
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
  /** Hidden from the home screen (and its links) until the teacher unlocks teacher mode (src/lib/teacher.ts). */
  teacherOnly?: boolean;
  /** Sentence–picture pairs per round (default: all on one screen). */
  roundSize?: number;
  /** Game 1 plays one set at a time, after a letter chooser; without sets it plays all of `vocab`. */
  wordSets?: WordSet[];
  choose?: ChooseQuestion[];
  games: GameDef[]; vocab: VocabWord[]; sentencePictures: SentencePictureItem[];
  letterForms: LetterFormSet[]; unscramble: UnscrambleSet[];
  fillBlank?: FillBlankData;
  /** Unit 3's هٰذا / هٰذِهِ game: one picture per screen, same shape as `choose`. */
  demonstratives?: ChooseQuestion[];
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

// Unit 3 pictures are in public/images/unit-3/: animated WebP + first-frame still for the GIFs
// (scripts/convert-unit3.mjs), the original jpg/png otherwise. Word ids are the picture file ids.
// fahd and miyah have no `art`: their slides were real-life footage, so they show a
// cartoon Noto emoji instead (the GIF conversions stay in the folder as spares).
const webp3 = (id: string): Art => ({ src: `/images/unit-3/${id}.webp`, type: 'webp', still: `/images/unit-3/${id}-still.webp` });

const unit3Vocab: VocabWord[] = [
  // Set ت
  { id: 'zayt', text: 'زَيْتٌ', emoji: '🫒', image: '/images/unit-3/zayt.jpg', confusableWith: ['zaytun'] },
  { id: 'zaytun', text: 'زَيْتونٌ', emoji: '🫒', image: '/images/unit-3/zaytun.jpg', confusableWith: ['zayt'] },
  { id: 'taj', text: 'تاجٌ', emoji: '👑', art: webp3('taj') },
  { id: 'bustan', text: 'بُسْتانٌ', emoji: '🌳', image: '/images/unit-3/bustan.jpg' },
  { id: 'tamr', text: 'تَمْرٌ', emoji: '🌴', image: '/images/unit-3/tamr.jpg' },
  { id: 'tut', text: 'توتٌ', emoji: '🫐', image: '/images/unit-3/tut.jpg' },
  { id: 'timsah', text: 'تِمْساحٌ', emoji: '🐊', art: webp3('timsah') },
  { id: 'rawat', text: 'رَوَتْ', emoji: '🪴', art: webp3('rawat') },
  { id: 'mizalla', text: 'مِظَلَّةٌ', emoji: '☂️', art: webp3('mizalla') },
  { id: 'zahra', text: 'زَهْرَةٌ', emoji: '🌺', art: webp3('zahra') },
  { id: 'namla', text: 'نَمْلَةٌ', emoji: '🐜', art: webp3('namla') },
  { id: 'hamama', text: 'حَمامَةٌ', emoji: '🕊️', art: webp3('hamama') },
  { id: 'urjuha', text: 'أُرْجوحَةٌ', emoji: '🛝', art: webp3('urjuha') },
  { id: 'ibra', text: 'إِبْرَةٌ', emoji: '🪡', art: webp3('ibra') },
  { id: 'arza', text: 'أَرْزَةٌ', emoji: '🌲', image: '/images/unit-3/arza.jpg' },
  { id: 'shawka', text: 'شَوْكَةٌ', emoji: '🍴', image: '/images/unit-3/shawka.png' },
  { id: 'shajara', text: 'شَجَرَةٌ', emoji: '🌳', image: '/images/unit-3/shajara.jpg' },
  { id: 'labna', text: 'لَبْنَةٌ', emoji: '🥣', image: '/images/unit-3/labna.jpg' },
  { id: 'duda', text: 'دودَةٌ', emoji: '🐛', art: webp3('duda') },
  { id: 'salla', text: 'سَلَّةٌ', emoji: '🧺', art: webp3('salla') },
  { id: 'nahla', text: 'نَحْلَةٌ', emoji: '🐝', art: webp3('nahla') },
  { id: 'tawila', text: 'طاوِلَةٌ', emoji: '🪑', art: webp3('tawila') },
  { id: 'wazza', text: 'وَزَّةٌ', emoji: '🦢', art: webp3('wazza') },
  { id: 'mawja', text: 'مَوْجَةٌ', emoji: '🌊', art: webp3('mawja') },
  // Set ه
  { id: 'nuzha', text: 'نُزْهَةٌ هادِئَةٌ', emoji: '🧺', art: webp3('nuzha') },
  { id: 'hudhud', text: 'هُدْهُدٌ', emoji: '🐦', art: webp3('hudhud') },
  { id: 'hilal', text: 'هِلالٌ', emoji: '🌙', art: webp3('hilal') },
  { id: 'fahd', text: 'فَهْدٌ', emoji: '🐅' },
  { id: 'hadiyya', text: 'هَدِيَّةٌ', emoji: '🎁', art: webp3('hadiyya') },
  { id: 'zahra_jamila', text: 'زَهْرَةٌ', emoji: '🌸', art: webp3('zahra_jamila') },
  { id: 'wajh', text: 'وَجْهٌ', emoji: '🙂', art: webp3('wajh') },
  { id: 'dhahab', text: 'ذَهَبٌ', emoji: '🪙', art: webp3('dhahab') },
  { id: 'nahr', text: 'نَهْرٌ', emoji: '🏞️', art: webp3('nahr') },
  { id: 'kahf', text: 'كَهْفٌ', emoji: '⛰️', art: webp3('kahf') },
  { id: 'haram', text: 'هَرَمٌ', emoji: '🔺', art: webp3('haram') },
  { id: 'miyah', text: 'مِياهٌ', emoji: '💧' },
  { id: 'sahm', text: 'سَهْمٌ', emoji: '⬇️', art: webp3('sahm') },
  { id: 'hawa', text: 'هَواءٌ', emoji: '🌬️', art: webp3('hawa') },
  { id: 'hajama', text: 'هَجَمَ', emoji: '🐯', art: webp3('hajama') },
  { id: 'haraba', text: 'هَرَبَ', emoji: '🏃', art: webp3('haraba') },
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
          { ...letterFormItem('shamaa', 'شَمْعَة', 'ش', '🕯️'), art: webpArt('shamaa') },
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
  {
    id: 'unit-3',
    label: 'الوَحْدَةُ الثَّالِثَةُ',
    title: 'ت ه',
    letters: ['ت', 'ه'],
    theme: 'peach',
    inOrder: true, // story order for the sentence games (unscramble and sentence-picture); words and pictures still shuffle
    games: [
      {
        id: 'letter-forms',
        title: 'أَشْكَالُ الحُرُوفِ',
        instruction: 'أَخْتَارُ الحَرْفَ', // the letter chooser; each set has its own instruction
        emoji: '🔤',
        short: 'أَخْتَارُ حَرْفًا وَأُكْمِلُ الكَلِمَةَ',
        theme: 'mint',
      },
      {
        id: 'word-picture',
        title: 'رَبْطُ الكَلِمَةِ بِالصُّورَةِ',
        instruction: 'أَضَعُ الكَلِمَةَ المُناسِبَةَ تَحْتَ الرَّسْمِ.',
        emoji: '🖼️',
        short: 'أَضَعُ الكَلِمَةَ تَحْتَ صُورَتِهَا',
        theme: 'sky',
      },
      {
        id: 'unscramble',
        title: 'تَرْتِيبُ الكَلِمَاتِ',
        instruction: 'أُرَتِّبُ الكَلِماتِ لِأَحْصُلَ عَلى جُمَلٍ مُفيدَةٍ.',
        emoji: '🧩',
        short: 'أُرَتِّبُ الكَلِمَاتِ فِي جُمْلَةٍ',
        theme: 'lemon',
      },
      {
        id: 'choose',
        title: 'اخْتِيَارُ الجَوَابِ',
        instruction: 'أَخْتارُ الجَوابَ الصَّحيحَ.',
        emoji: '✅',
        short: 'أَخْتَارُ الجَوَابَ الصَّحِيحَ',
        theme: 'sky',
      },
      {
        id: 'demonstratives',
        title: 'أَسْمَاءُ الإِشَارَةِ',
        instruction: 'أَخْتارُ اسْمَ الإِشارَةِ المُناسِبَ وَأَضَعُهُ مَكانَ الفَراغِ.',
        emoji: '👉',
        short: 'هٰذَا أَمْ هٰذِهِ؟',
        theme: 'mint',
      },
      {
        id: 'fill-blank',
        title: 'مَلْءُ الفَرَاغِ',
        instruction: 'أَمْلَأُ الفَراغَ بِالكَلِمَةِ المُناسِبَةِ.',
        emoji: '✏️',
        short: 'أَضَعُ الكَلِمَةَ فِي مَكَانِهَا',
        theme: 'lavender',
      },
      {
        id: 'sentence-picture',
        title: 'رَبْطُ الجُمْلَةِ بِالرَّسْمِ',
        instruction: 'أَصِلُ الجُمْلَةَ بِالرَّسْمِ المُناسِبِ لَها.',
        emoji: '📖',
        short: 'أَصِلُ الجُمْلَةَ بِرَسْمِهَا',
        theme: 'peach',
      },
    ],
    vocab: unit3Vocab,
    wordSets: [
      { id: 'ta', letter: 'ت', name: 'حَرْفُ التَّاءِ', wordIds: ['zayt', 'zaytun', 'taj', 'bustan', 'tamr', 'tut', 'timsah', 'rawat', 'mizalla', 'zahra', 'namla', 'hamama', 'urjuha', 'ibra', 'arza', 'shawka', 'shajara', 'labna', 'duda', 'salla', 'nahla', 'tawila', 'wazza', 'mawja'] },
      { id: 'ha', letter: 'ه', name: 'حَرْفُ الهَاءِ', wordIds: ['nuzha', 'hudhud', 'hilal', 'fahd', 'hadiyya', 'zahra_jamila', 'wajh', 'dhahab', 'nahr', 'kahf', 'haram', 'miyah', 'sahm', 'hawa', 'hajama', 'haraba'] },
    ],
    // The 5 story sentences, completed, with the same scenes as the unscramble game.
    sentencePictures: [
      { id: 'sp-1', sentence: 'سَتَرَتْ غُيومُ الخَريفِ الشَّمْسَ.', image: '/images/unit-3/scene-1.webp' },
      { id: 'sp-2', sentence: 'فَتَّشَ الأَرْنَبُ فَرْحان عَنْها في غابَةٍ بَعيدَةٍ.', image: '/images/unit-3/scene-2.webp' },
      { id: 'sp-3', sentence: 'قالَتْ لَهُ العُصْفورَةُ: «الشَّمْسُ سَتَعودُ».', image: '/images/unit-3/bird-sun.webp' },
      { id: 'sp-4', sentence: 'عادَ فَرْحان إِلى أَهْلِهِ وَوَكْرِهِ.', image: '/images/unit-3/scene-3.webp' },
      { id: 'sp-5', sentence: 'شاهَدَ فَرْحان عَوْدَةَ الشَّمْسِ السّاطِعَةِ.', image: '/images/unit-3/scene-4.webp' },
    ],
    letterForms: [
      {
        id: 'ta',
        letter: 'ت',
        alsoLetters: ['ة'], // the worksheet mixes ت and ة words, so the set shows 6 tiles
        name: 'حَرْفُ التَّاءِ',
        instruction: 'أَخْتارُ الحَرْفَ المُناسِبَ وَأَضَعُهُ مَكانَ النُّقَطِ.',
        items: [
          { ...letterFormItem('farasha', 'فَراشَةٌ', 'ة', '🦋'), art: webp3('farasha') },
          { ...letterFormItem('namat', 'نامَتْ', 'ت', '😴'), art: webp3('namat') },
          { ...letterFormItem('turab', 'تُرابٌ', 'ت', '🌱'), art: webp3('turab') },
          letterFormItem('hut', 'حوتٌ', 'ت', '🐳'),
          { ...letterFormItem('warda', 'وَرْدَةٌ', 'ة', '🌹'), art: webp3('warda') },
          { ...letterFormItem('kataba', 'كَتَبَ', 'ت', '✍️'), art: webp3('kataba') },
        ],
      },
      {
        id: 'ha',
        letter: 'ه',
        name: 'حَرْفُ الهَاءِ',
        instruction: 'أَخْتارُ الحَرْفَ المُناسِبَ وَأَضَعُهُ مَكانَ النُّقَطِ.',
        items: [
          { ...letterFormItem('muharrij', 'مُهَرِّجٌ', 'ه', '🤡'), art: webp3('muharrij') },
          { ...letterFormItem('fawakih', 'فَواكِهْ', 'ه', '🍇'), art: webp3('fawakih') },
          { ...letterFormItem('zuhur', 'زُهورٌ', 'ه', '💐'), art: webp3('zuhur') },
          { ...letterFormItem('wujuh', 'وُجوهٌ', 'ه', '👥'), image: '/images/unit-3/wujuh.jpg' },
          { ...letterFormItem('hadaf', 'هَدَفٌ', 'ه', '🥅'), art: webp3('hadaf_2') }, // the football goal
        ],
      },
    ],
    // The 5 story sentences (textbook order), tiles listed in the correct order here (the game shuffles them).
    unscramble: [
      {
        id: 'set-1',
        image: '/images/unit-3/scene-1.webp',
        tiles: [
          { id: 'satarat', text: 'سَتَرَتْ' },
          { id: 'ghuyum', text: 'غُيومُ' },
          { id: 'alkharif', text: 'الخَريفِ' },
          { id: 'ashams', text: 'الشَّمْسَ' },
        ],
        answers: [['satarat', 'ghuyum', 'alkharif', 'ashams']],
      },
      {
        id: 'set-2',
        image: '/images/unit-3/scene-2.webp',
        tiles: [
          { id: 'fattasha', text: 'فَتَّشَ' },
          { id: 'alarnab', text: 'الأَرْنَبُ' },
          { id: 'farhan', text: 'فَرْحان' },
          { id: 'anha', text: 'عَنْها' },
          { id: 'fi-gaba', text: 'في غابَةٍ' },
          { id: 'baida', text: 'بَعيدَةٍ' },
        ],
        answers: [['fattasha', 'alarnab', 'farhan', 'anha', 'fi-gaba', 'baida']],
      },
      {
        // The colon and the quotation marks stay attached to their words; the game adds the final full stop.
        id: 'set-3',
        image: '/images/unit-3/bird-sun.webp',
        tiles: [
          { id: 'qalat', text: 'قالَتْ' },
          { id: 'lahu', text: 'لَهُ' },
          { id: 'alusfura', text: 'العُصْفورَةُ:' },
          { id: 'ashams', text: '«الشَّمْسُ' },
          { id: 'sataud', text: 'سَتَعودُ»' },
        ],
        answers: [['qalat', 'lahu', 'alusfura', 'ashams', 'sataud']],
      },
      {
        id: 'set-4',
        image: '/images/unit-3/scene-3.webp',
        tiles: [
          { id: 'ada', text: 'عادَ' },
          { id: 'farhan', text: 'فَرْحان' },
          { id: 'ila-ahlihi', text: 'إِلى أَهْلِهِ' },
          { id: 'wawakrihi', text: 'وَوَكْرِهِ' },
        ],
        answers: [['ada', 'farhan', 'ila-ahlihi', 'wawakrihi']],
      },
      {
        id: 'set-5',
        image: '/images/unit-3/scene-4.webp',
        tiles: [
          { id: 'shahada', text: 'شاهَدَ' },
          { id: 'farhan', text: 'فَرْحان' },
          { id: 'awda', text: 'عَوْدَةَ' },
          { id: 'ashams', text: 'الشَّمْسِ' },
          { id: 'assatia', text: 'السّاطِعَةِ' },
        ],
        answers: [['shahada', 'farhan', 'awda', 'ashams', 'assatia']],
      },
    ],
    // Questions follow the story, so they keep this order; only the options shuffle.
    choose: [
      {
        id: 'q1',
        question: 'ماذا سَتَرَتْ غُيومُ الخَريفِ؟',
        stem: 'سَتَرَتْ غُيومُ الخَريفِ ـــ.',
        options: [
          { id: 'qamar', text: 'القَمَرَ', emoji: '🌙' },
          { id: 'shams', text: 'الشَّمْسَ', emoji: '☀️' },
        ],
        answerId: 'shams',
      },
      {
        id: 'q2',
        question: 'مَنْ فَتَّشَ عَنِ الشَّمْسِ في غابَةٍ بَعيدَةٍ؟',
        options: [
          { id: 'dog', text: 'فَتَّشَ الكَلْبُ بارودُ عَنِ الشَّمْسِ في غابَةٍ بَعيدَةٍ.', highlight: 'الكَلْبُ بارودُ', emoji: '🐩' },
          { id: 'rabbit', text: 'فَتَّشَ الأَرْنَبُ فَرْحان عَنِ الشَّمْسِ في غابَةٍ بَعيدَةٍ.', highlight: 'الأَرْنَبُ فَرْحان', emoji: '🐇' },
        ],
        answerId: 'rabbit',
      },
      {
        id: 'q3',
        question: 'في أَيِّ فَصْلٍ جَرَتْ أَحْداثُ القِصَّةِ؟',
        options: [
          { id: 'autumn', text: 'الخَريفُ', emoji: '🍂' },
          { id: 'winter', text: 'الشِّتاءُ', emoji: '❄️' },
          { id: 'spring', text: 'الرَّبيعُ', emoji: '🌷' },
          { id: 'summer', text: 'الصَّيْفُ', emoji: '🏖️' },
        ],
        answerId: 'autumn',
      },
    ],
    // One picture per screen with its word underneath; the child picks هٰذا or هٰذِهِ. Worksheet order.
    demonstratives: [
      { id: 'hirr', question: '', emoji: '🐈', art: webp3('hirr'), stem: 'ـــ هِرٌّ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hatha' },
      { id: 'bint', question: '', emoji: '👧', art: webp3('bint'), stem: 'ـــ بِنْتٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hathihi' },
      { id: 'kitab', question: '', emoji: '📖', stem: 'ـــ كِتابٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hatha' },
      { id: 'warda', question: '', emoji: '🌹', art: webp3('warda'), stem: 'ـــ وَرْدَةٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hathihi' },
      { id: 'arnab', question: '', emoji: '🐇', stem: 'ـــ أَرْنَبٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hatha' },
      { id: 'qalam', question: '', emoji: '✏️', stem: 'ـــ قَلَمٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hatha' },
      { id: 'zarafa', question: '', emoji: '🦒', art: webp3('zarafa'), stem: 'ـــ زَرافَةٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hathihi' },
      { id: 'farasha', question: '', emoji: '🦋', art: webp3('farasha'), stem: 'ـــ فَراشَةٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hathihi' },
      { id: 'alam', question: '', emoji: '🚩', stem: 'ـــ عَلَمٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hatha' },
      { id: 'dulab', question: '', emoji: '🛞', stem: 'ـــ دولابٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hatha' },
      { id: 'bayt', question: '', emoji: '🏠', art: webp3('bayt'), stem: 'ـــ بَيْتٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hatha' },
      { id: 'sayyara', question: '', emoji: '🚗', art: { src: '/images/unit-2/sayyara.webp', type: 'webp', still: '/images/unit-2/sayyara-still.webp' }, stem: 'ـــ سَيّارَةٌ.', options: [{ id: 'hatha', text: 'هٰذا' }, { id: 'hathihi', text: 'هٰذِهِ' }], answerId: 'hathihi' },
    ],
    // Worksheet order for the sentences and the cloud: the one game that is not shuffled.
    fillBlank: {
      words: [
        { id: 'shams', text: 'الشَّمْسَ' },
        { id: 'baida', text: 'بَعيدَةٍ' },
        { id: 'ghuyum', text: 'غُيومُ' },
        { id: 'farhan', text: 'فَرْحان' },
      ],
      sentences: [
        {
          id: 's1',
          parts: [
            { type: 'text', value: 'سَتَرَتْ ' },
            { type: 'blank', accept: ['ghuyum'] },
            { type: 'text', value: ' الخَريفِ ' },
            { type: 'blank', accept: ['shams'] },
            { type: 'text', value: '.' },
          ],
        },
        {
          id: 's2',
          parts: [
            { type: 'text', value: 'فَتَّشَ الأَرْنَبُ ' },
            { type: 'blank', accept: ['farhan'] },
            { type: 'text', value: ' عَنْها في غابَةٍ ' },
            { type: 'blank', accept: ['baida'] },
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
    case 'demonstratives':
      return (unit.demonstratives?.length ?? 0) > 0;
    case 'choose':
      return (unit.choose?.length ?? 0) > 0;
  }
}

export function getUnit(id: string): Unit | undefined {
  return units.find((unit) => unit.id === id);
}
