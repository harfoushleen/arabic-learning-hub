// Helpers for rendering Arabic words split across elements without breaking letter joining.
// WebKit shapes each text run on its own, so a split word loses its connections unless a
// ZERO WIDTH JOINER sits on both sides of every split where the letters truly connect.

import type { LetterForm, LetterFormPart } from '@/data/units';

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

/** The contextual form a dual-joining letter (ب) takes between `prev` and `next` base letters. */
export function expectedForm(prev: string | null, next: string | null): LetterForm {
  const joinsPrev = !!prev && connects(prev, 'ب');
  const joinsNext = !!next && next !== 'ء';
  if (joinsPrev && joinsNext) return 'ـبـ';
  if (joinsPrev) return 'ـب';
  if (joinsNext) return 'بـ';
  return 'ب';
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
