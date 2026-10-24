import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { GameId } from '@/data/units';
import type { GameProps } from './types';

export const gameRegistry: Record<GameId, LazyExoticComponent<ComponentType<GameProps>>> = {
  'word-picture': lazy(() => import('./WordPictureGame')),
  'sentence-picture': lazy(() => import('./SentencePictureGame')),
  'letter-forms': lazy(() => import('./LetterFormsGame')),
  unscramble: lazy(() => import('./UnscrambleGame')),
  'fill-blank': lazy(() => import('./FillBlankGame')),
};
