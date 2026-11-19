/**
 * Academic Palette Utility - REDS v2.0
 * Deterministically maps course codes to one of the 5 REDS v2.0 Academic Palettes
 * (blueSapphire, emeraldGreen, amberGold, purpleAmethyst, roseRuby).
 */

import { tokens } from '@/theme';

export interface AcademicPalette {
  bg: string;
  border: string;
  text: string;
  badge: string;
}

export const ACADEMIC_PALETTE_LIST: readonly AcademicPalette[] = [
  tokens.academic.blueSapphire,
  tokens.academic.emeraldGreen,
  tokens.academic.amberGold,
  tokens.academic.purpleAmethyst,
  tokens.academic.roseRuby,
];

/**
 * Deterministically maps a course code to one of the 5 REDS v2.0 Academic Palettes.
 * Empty or null courseCode falls back to index 0 (blueSapphire).
 */
export const getAcademicPaletteForCourse = (
  courseCode?: string | null
): AcademicPalette => {
  const code = courseCode || '';
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash << 5) - hash + code.charCodeAt(i);
    hash |= 0;
  }
  return ACADEMIC_PALETTE_LIST[Math.abs(hash) % ACADEMIC_PALETTE_LIST.length];
};
