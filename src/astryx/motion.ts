import { expandMotionScale } from './expandMotionScale'

// Astryx's expressive character, from core/src/theme/themeMotion.ts (MIT).
const expressive = 'cubic-bezier(0.3, 1.2, 0.5, 1)'

export const astryxTokens = {
  ...expandMotionScale({ fast: 175, medium: 500, slow: 1000, ratio: 0.75 }),
  '--ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
  '--ease-entrance': expressive,
  '--ease-move': expressive,
  // Light-mode radius and elevation values from Astryx's neutral theme.
  '--radius-element': '0.625rem',
  '--radius-container': '0.75rem',
  '--shadow-low': '0 2px 4px #0000000d, 0 4px 8px #0000001a',
  '--shadow-med': '0 2px 4px #0000000d, 0 4px 12px #0000001a',
  '--shadow-high': '0 4px 6px #0000001a, 0 12px 24px #00000026',
}

export function cardRevealDelay(index: number): number {
  return (Math.max(0, Math.floor(index)) % 6) * 65
}
