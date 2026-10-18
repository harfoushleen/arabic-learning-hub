import type { Theme } from '@/data/units';

// Static class names per theme (Tailwind only generates classes it can see written out).
export const THEME: Record<Theme, { bg: string; ink: string; border: string }> = {
  sky: { bg: 'bg-sky', ink: 'text-sky-ink', border: 'border-sky' },
  mint: { bg: 'bg-mint', ink: 'text-mint-ink', border: 'border-mint' },
  peach: { bg: 'bg-peach', ink: 'text-peach-ink', border: 'border-peach' },
  lavender: { bg: 'bg-lavender', ink: 'text-lavender-ink', border: 'border-lavender' },
  lemon: { bg: 'bg-lemon', ink: 'text-lemon-ink', border: 'border-lemon' },
};
