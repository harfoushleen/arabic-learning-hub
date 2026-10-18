import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { GameId } from '@/data/units';
import type { GameProps } from './types';

const ComingSoon = lazy(() => import('./ComingSoonGame'));

export const gameRegistry: Record<GameId, LazyExoticComponent<ComponentType<GameProps>>> = {
  'word-picture': lazy(() => import('./WordPictureGame')),
  'sentence-picture': ComingSoon,
  'letter-forms': ComingSoon,
  unscramble: ComingSoon,
};
