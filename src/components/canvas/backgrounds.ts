import type { CSSProperties } from 'react';
import type { BackgroundId } from '../../../shared/types';

/** Canvas backgrounds are CSS layers under the transparent drawing layer, so the eraser reveals them. */
export const BACKGROUND_STYLES: Record<BackgroundId, CSSProperties> = {
  white: { backgroundColor: '#ffffff' },
  paper: {
    backgroundColor: '#fdf6e3',
    backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent calc(6.667% - 2px), #bfdbfe calc(6.667% - 2px), #bfdbfe 6.667%)',
  },
  grid: {
    backgroundColor: '#ffffff',
    backgroundImage: 'linear-gradient(#e0e7ff 2px, transparent 2px), linear-gradient(90deg, #e0e7ff 2px, transparent 2px)',
    backgroundSize: '5% 6.667%',
  },
  dots: {
    backgroundColor: '#ffffff',
    backgroundImage: 'radial-gradient(#c7d2fe 2px, transparent 2.5px)',
    backgroundSize: '5% 6.667%',
  },
  chalk: {
    backgroundColor: '#1f3a2e',
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
    backgroundSize: '3% 4%',
  },
  sky: { backgroundImage: 'linear-gradient(#7dd3fc, #e0f2fe 75%, #fef9c3)' },
  midnight: {
    backgroundColor: '#0f172a',
    backgroundImage:
      'radial-gradient(#fff 1px, transparent 1.5px), radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1.5px), linear-gradient(#0f172a, #312e81)',
    backgroundSize: '17% 23%, 11% 13%, 100% 100%',
    backgroundPosition: '0 0, 40px 60px, 0 0',
  },
};
