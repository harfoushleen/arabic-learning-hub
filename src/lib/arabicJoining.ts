// Helpers for rendering Arabic words split across elements without breaking letter joining.
// WebKit shapes each text run on its own, so a split word loses its connections unless a
// ZERO WIDTH JOINER sits on both sides of every split where the letters truly connect.

import type { LetterForm, LetterFormItem, LetterFormPart } from '@/data/units';

export const ZWJ = '‍';

const TASHKEEL = /[ً-ٰٟ]/g;
// Arabic letters (excluding tatweel U+0640, digits and punctuation).
const ARABIC_LETTER = /^[ء-ؿف-يٱ-ۓۺ-ۼ]$/;

/** Letters that never connect to the following letter. */
export const NON_FORWARD_JOINERS = new Set([...'اأإآٱدذرزوؤءة']);

export function stripTashkeel(s: string): string {
  return s.replace(TASHKEEL, '');
}

function isArabicLetter(ch: string | null | undefined): ch is string {
  return !!ch && ARABIC_LETTER.test(ch);
}

/** Whether `prevBase` joins forward to `nextBase` (both bare letters, no tashkeel). */
export function connects(prevBase: string, nextBase: string): boolean {
  return (
    isArabicLetter(prevBase) &&
    !NON_FORWARD_JOINERS.has(prevBase) &&
    isArabicLetter(nextBase) &&
    nextBase !== 'ء'
  );
}

export const TATWEEL = 'ـ';

export type FormName = 'initial' | 'medial' | 'final' | 'isolated';

/**
 * The choice tiles for a letter: a dual-joining letter (ب) has 4 forms [بـ ـبـ ـب ب]; a letter that
 * never connects forward (ا د ذ ر ز و) has only [isolated, final], e.g. [ز ـز].
 */
export function formsFor(letter: string): LetterForm[] {
  if (NON_FORWARD_JOINERS.has(letter)) return [letter, TATWEEL + letter];
  return [letter + TATWEEL, TATWEEL + letter + TATWEEL, TATWEEL + letter, letter];
}

/** Which form a tile shows, from where its tatweels are. */
export function formName(form: LetterForm): FormName {
  const before = form.startsWith(TATWEEL);
  const after = form.endsWith(TATWEEL) && form.length > 1;
  if (before && after) return 'medial';
  if (before) return 'final';
  if (after) return 'initial';
  return 'isolated';
}

/** The contextual form `letter` takes between `prev` and `next` base letters (a non-forward-joiner never joins the next one). */
export function expectedForm(letter: string, prev: string | null, next: string | null): LetterForm {
  const joinsPrev = !!prev && connects(prev, letter);
  const joinsNext = !!next && connects(letter, next);
  if (joinsPrev && joinsNext) return TATWEEL + letter + TATWEEL;
  if (joinsPrev) return TATWEEL + letter;
  if (joinsNext) return letter + TATWEEL;
  return letter;
}

/**
 * Builds a letter-forms word from its full vowelled `target`: every `letter` in it becomes a blank
 * whose `fill` is that letter with its own tashkeel and whose `answer` is the form it takes between
 * its neighbors; the text around the blanks becomes the `text` parts. Throws if the letter is missing.
 */
export function letterFormItem(id: string, target: string, letter: string, emoji: string): LetterFormItem {
  // A cluster is a base letter plus the marks that follow it.
  const clusters: string[] = [];
  for (const ch of target) {
    if (stripTashkeel(ch) === '' && clusters.length > 0) clusters[clusters.length - 1] += ch;
    else clusters.push(ch);
  }
  const bases = clusters.map((cluster) => [...cluster][0]!);

  const parts: LetterFormPart[] = [];
  let text = '';
  clusters.forEach((cluster, i) => {
    if (bases[i] !== letter) {
      text += cluster;
      return;
    }
    if (text) parts.push({ type: 'text', value: text });
    text = '';
    parts.push({ type: 'blank', answer: expectedForm(letter, bases[i - 1] ?? null, bases[i + 1] ?? null), fill: cluster });
  });
  if (text) parts.push({ type: 'text', value: text });

  if (!parts.some((part) => part.type === 'blank')) throw new Error(`letterFormItem: ${letter} is not in ${target}`);
  return { id, target, parts, emoji };
}

export interface JoinedSegment {
  text: string;
  isBlank: boolean;
  key: string;
}

function baseLetters(s: string): string[] {
  return [...stripTashkeel(s)].filter(isArabicLetter);
}

/**
 * Builds the text for each part of a split word, adding ZWJs at boundaries where the letters
 * connect. `filled[i]` is what blank part `i` currently shows (its `fill` once answered);
 * an unanswered blank (null/undefined) yields an empty segment and never gets a ZWJ.
 */
export function joinedSegments(
  parts: readonly LetterFormPart[],
  filled: ReadonlyArray<string | null | undefined>,
): JoinedSegment[] {
  const raw = parts.map((part, i) => ({
    text: part.type === 'text' ? part.value : (filled[i] ?? ''),
    isBlank: part.type === 'blank',
    key: `${part.type}-${i}`,
  }));

  const out = raw.map((seg) => ({ ...seg }));
  for (let i = 0; i < raw.length - 1; i++) {
    const last = baseLetters(raw[i]!.text).at(-1);
    const first = baseLetters(raw[i + 1]!.text)[0];
    if (last && first && connects(last, first)) {
      out[i]!.text += ZWJ;
      out[i + 1]!.text = ZWJ + out[i + 1]!.text;
    }
  }
  return out;
}

/**
 * Worksheet view of a word with missing letters: like joinedSegments(), plus a tatweel beside each
 * EMPTY blank wherever the neighboring letter really connects to the missing letter, e.g. طَـ▢ـل
 * for ب; after a ز (which never joins forward) there's no dash, e.g. مَنْـ▢ل.
 * Only for display next to an unfilled blank — a completed word never contains tatweel.
 */
export function worksheetSegments(
  parts: readonly LetterFormPart[],
  filled: ReadonlyArray<string | null | undefined> = [],
): JoinedSegment[] {
  const out = joinedSegments(parts, filled);
  out.forEach((seg, i) => {
    const part = parts[i];
    if (part?.type !== 'blank' || stripTashkeel(seg.text).replaceAll(ZWJ, '') !== '') return;
    const letter = baseLetters(part.fill)[0];
    if (!letter) return;
    const before = out[i - 1];
    const after = out[i + 1];
    const last = before && baseLetters(before.text).at(-1);
    const first = after && baseLetters(after.text)[0];
    if (before && last && connects(last, letter)) before.text += TATWEEL;
    if (after && first && connects(letter, first)) after.text = TATWEEL + after.text;
  });
  return out;
}
