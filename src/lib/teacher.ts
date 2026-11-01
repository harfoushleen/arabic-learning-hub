import { useSyncExternalStore } from 'react';

/**
 * Teacher mode shows the units flagged `teacherOnly` in units.ts (lessons not yet released to students).
 * The code itself is not in the source: only a salted PBKDF2 hash is, so the repo and the bundle never hold it.
 * Still a classroom gate, not strong security (an 8-digit code can be brute-forced offline from the hash).
 * To change the code: `TEACHER_CODE=<8 digits> node scripts/teacher-code-hash.mjs`, paste SALT and HASH here.
 * The state lives in memory only, so a reload locks it again.
 */
export const CODE_LENGTH = 8;
const ITERATIONS = 600_000;
const SALT = 'efa9fb60c5681098c7fa4576cd5a9c7a';
const HASH = 'c3be828959fb05cd24fa36d65aa3fd38134a13dd5fcdb7acd37c1f8276a4d688';

const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g)!, (b) => parseInt(b, 16));
const toHex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

let unlocked = false;
const listeners = new Set<() => void>();

function setUnlocked(next: boolean) {
  if (unlocked === next) return;
  unlocked = next;
  listeners.forEach((l) => l());
}

/** Whether `code` hashes to the stored hash. Needs WebCrypto (https or localhost); without it nothing unlocks. */
export async function checkTeacherCode(code: string): Promise<boolean> {
  if (!/^\d+$/.test(code) || !globalThis.crypto?.subtle) return false;
  const { subtle } = globalThis.crypto;
  const key = await subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(SALT), iterations: ITERATIONS }, key, 256);
  return toHex(bits) === HASH;
}

/** Unlocks teacher mode if `code` is right; returns whether it was. */
export async function unlockTeacher(code: string): Promise<boolean> {
  if (!(await checkTeacherCode(code))) return false;
  setUnlocked(true);
  return true;
}

export const lockTeacher = () => setUnlocked(false);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useTeacherMode = () => useSyncExternalStore(subscribe, () => unlocked);
