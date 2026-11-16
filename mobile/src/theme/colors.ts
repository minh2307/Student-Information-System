/**
 * Centralized Design System - Color Tokens (REDS v2.0)
 * Aligned with Rikkei EduPortal brand guidelines.
 *
 * Primary: Burgundy #7F1D1D (Headers, Student Pass, Institutional Identity)
 * Primary Action: #991B1B (Buttons, Active Highlights, Key Calls-To-Action)
 */

export const colors = {
  // Brand Reds & Burgundy
  brand: '#991B1B', // Primary action color
  burgundy: '#7F1D1D', // Institutional identity / deep headers

  primary: {
    50: '#FFF1F2',  // Subtle tint, badge background
    100: '#FFE4E6', // Light pill highlight
    200: '#FECDD3', // Light warning/notice border
    300: '#FDA4AF', // Secondary accent
    400: '#FB7185', // Accent detail
    500: '#F43F5E', // Vivid accent
    600: '#E11D48', // Interactive press/hover
    700: '#BE123C', // Deep crimson
    800: '#991B1B', // PRIMARY BRAND COLOR (Buttons, active tabs)
    900: '#7F1D1D', // DEEP BURGUNDY (Headers, Student/Faculty Card)
    950: '#450A0A', // Ultra-deep anchor
  },

  crimson: {
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
  },

  // Secondary Accents (Sky / Blue / Slate)
  secondary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },

  // Neutrals & Surface Colors (Slate Palette)
  neutral: {
    0: '#FFFFFF',   // Pure White
    50: '#F8FAFC',  // App Canvas Background (Soft slate)
    100: '#F1F5F9', // Subtle card surface / Input background
    200: '#E2E8F0', // Border divider
    300: '#CBD5E1', // Inactive border / disabled text
    400: '#94A3B8', // Placeholder text
    500: '#64748B', // Metadata & secondary label
    600: '#475569', // Secondary text
    700: '#334155', // Body text
    800: '#1E293B', // High-contrast text
    900: '#0F172A', // Heading text
    950: '#020617', // Black anchor
  },

  surface: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    input: '#FFFFFF',
    modal: '#FFFFFF',
    border: '#E2E8F0',
    divider: '#E2E8F0',
  },

  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
    disabled: '#CBD5E1',
    brand: '#991B1B',
    burgundy: '#7F1D1D',
  },

  paper: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
  },

  // Semantic Status Colors (WCAG AA Compliant text vs background)
  success: {
    light: '#ECFDF5',
    main: '#10B981',
    dark: '#047857',
    border: '#A7F3D0',
  },
  warning: {
    light: '#FFFBEB',
    main: '#F59E0B',
    dark: '#B45309',
    border: '#FDE68A',
  },
  error: {
    light: '#FEF2F2',
    main: '#EF4444',
    dark: '#B91C1C',
    border: '#FECACA',
  },
  info: {
    light: '#EFF6FF',
    main: '#3B82F6',
    dark: '#1D4ED8',
    border: '#BFDBFE',
  },
  offline: {
    light: '#FEF3C7',
    main: '#D97706',
    dark: '#92400E',
    border: '#FDE68A',
  },

  // Academic Course Categorization Palettes (Vick Lohvynenko style for Timetable)
  academicNamed: {
    blueSapphire: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', badge: '#DBEAFE' },
    emeraldGreen: { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', badge: '#D1FAE5' },
    amberGold: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', badge: '#FEF3C7' },
    purpleAmethyst: { bg: '#FAF5FF', border: '#E9D5FF', text: '#6D28D9', badge: '#F3E8FF' },
    roseRuby: { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', badge: '#FFE4E6' },
  },

  // Backward-compatible array for existing timetable loops
  academic: [
    { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', badge: '#FEE2E2' },
    { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', badge: '#DBEAFE' },
    { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', badge: '#D1FAE5' },
    { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', badge: '#FEF3C7' },
    { bg: '#FAF5FF', border: '#E9D5FF', text: '#6B21A8', badge: '#F3E8FF' },
    { bg: '#FFF7ED', border: '#FFEDD5', text: '#9A3412', badge: '#FFEDD5' },
  ],
} as const;

export type ColorTokens = typeof colors;
export type PrimaryScale = typeof colors.primary;
