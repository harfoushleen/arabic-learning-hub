import confetti from 'canvas-confetti';
import { prefersReducedMotion } from './utils';

/** Confetti burst; skipped when the user prefers reduced motion. */
export function celebrate() {
  if (prefersReducedMotion()) return;
  void confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, zIndex: 200, disableForReducedMotion: true });
}
