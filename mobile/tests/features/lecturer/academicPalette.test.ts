/**
 * Unit Tests for Academic Palette Utility
 * Validates deterministic DJB2 mapping to REDS v2.0 Academic Palettes.
 */

import {
  getAcademicPaletteForCourse,
  ACADEMIC_PALETTE_LIST,
} from '@/features/lecturer/utils/academicPalette';
import { tokens } from '@/theme';

describe('academicPalette utility', () => {
  it('contains exactly 5 REDS v2.0 academic palettes in correct order', () => {
    expect(ACADEMIC_PALETTE_LIST).toHaveLength(5);
    expect(ACADEMIC_PALETTE_LIST[0]).toEqual(tokens.academic.blueSapphire);
    expect(ACADEMIC_PALETTE_LIST[1]).toEqual(tokens.academic.emeraldGreen);
    expect(ACADEMIC_PALETTE_LIST[2]).toEqual(tokens.academic.amberGold);
    expect(ACADEMIC_PALETTE_LIST[3]).toEqual(tokens.academic.purpleAmethyst);
    expect(ACADEMIC_PALETTE_LIST[4]).toEqual(tokens.academic.roseRuby);
  });

  it('maps CS101 deterministically to emeraldGreen (index 1)', () => {
    const palette = getAcademicPaletteForCourse('CS101');
    expect(palette).toEqual(tokens.academic.emeraldGreen);
    expect(palette.text).toBe(tokens.academic.emeraldGreen.text);
    expect(palette.badge).toBe(tokens.academic.emeraldGreen.badge);
  });

  it('maps SWE201 deterministically to blueSapphire (index 0)', () => {
    const palette = getAcademicPaletteForCourse('SWE201');
    expect(palette).toEqual(tokens.academic.blueSapphire);
  });

  it('maps LIT101 deterministically to amberGold (index 2)', () => {
    const palette = getAcademicPaletteForCourse('LIT101');
    expect(palette).toEqual(tokens.academic.amberGold);
  });

  it('maps MATH101 deterministically to purpleAmethyst (index 3)', () => {
    const palette = getAcademicPaletteForCourse('MATH101');
    expect(palette).toEqual(tokens.academic.purpleAmethyst);
  });

  it('maps ENG101 deterministically to roseRuby (index 4)', () => {
    const palette = getAcademicPaletteForCourse('ENG101');
    expect(palette).toEqual(tokens.academic.roseRuby);
  });

  it('falls back safely to blueSapphire (index 0) for empty string', () => {
    const palette = getAcademicPaletteForCourse('');
    expect(palette).toEqual(tokens.academic.blueSapphire);
  });

  it('falls back safely to blueSapphire (index 0) for null and undefined', () => {
    expect(getAcademicPaletteForCourse(null)).toEqual(tokens.academic.blueSapphire);
    expect(getAcademicPaletteForCourse(undefined)).toEqual(tokens.academic.blueSapphire);
  });
});
