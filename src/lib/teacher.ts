import { useSyncExternalStore } from 'react';

/**
 * Teacher mode shows the units flagged `teacherOnly` in units.ts (lessons not yet released to students).
 * It is a classroom gate, not security: the code ships in the bundle. The state lives in memory only,
 * so a reload locks it again.
 */
export const TEACHER_CODE = '123456';

let unlocked = false;
const listeners = new Set<() => void>();

function setUnlocked(next: boolean) {
  if (unlocked === next) return;
  unlocked = next;
  listeners.forEach((l) => l());
}

/** Unlocks teacher mode if `code` is right; returns whether it was. */
export function unlockTeacher(code: string): boolean {
  if (code !== TEACHER_CODE) return false;
  setUnlocked(true);
  return true;
}

export const lockTeacher = () => setUnlocked(false);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useTeacherMode = () => useSyncExternalStore(subscribe, () => unlocked);
