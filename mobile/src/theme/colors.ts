/**
 * Centralized Design System - Color Tokens
 * Aligned with Rikkei EduPortal brand guidelines.
 */

export const colors = {
  // Brand Reds
  primary: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#E11D48',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B', // Primary Brand Color
    900: '#7F1D1D', // Deep Burgundy (Card / Header)
    950: '#450A0A',
  },

  crimson: {
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
  },

  // Secondary Accents (Blue / Sky)
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

  // Neutrals / Surfaces
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  paper: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
  },

  // Semantic Status Colors
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

  // Academic Course Categorization Palettes (for Timetables & Badges)
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
