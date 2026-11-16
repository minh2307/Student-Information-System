/**
 * Centralized Design System - Master Tokens Registry (REDS v2.0)
 * Aggregates all atomic tokens for Rikkei EduPortal.
 * Fully compatible with Theme consumers and Primitives components.
 */

import { colors } from './colors';
import { typography, textStyles } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { elevation, shadows, elevationLevels } from './elevation';

export const REDS_TOKENS = {
  // Brand Reds & Burgundy
  brand: {
    crimson: '#991B1B',           // Primary Action Red
    crimsonLight: '#FFE4E6',      // Light Tint (#FFE4E6 / #FFF1F2)
    burgundy: '#7F1D1D',          // Deep Institutional Burgundy
    primary: '#991B1B',
    primaryScale: colors.primary, // 50-950 scale for index access
  },

  // Surfaces & Layered Canvas
  surface: {
    canvas: '#F8FAFC',    // App background
    card: '#FFFFFF',      // Card surface
    elevated: '#FFFFFF',  // Floating dialogs & modals
    background: '#F8FAFC',
    input: '#FFFFFF',     // Input surface
    modal: '#FFFFFF',     // Modal dialogs
    backdrop: 'rgba(15, 23, 42, 0.6)', // Modal overlay backdrop
    border: '#E2E8F0',
    divider: '#E2E8F0',
  },

  // Borders
  border: {
    default: '#E2E8F0',
    subtle: '#F1F5F9',
    strong: '#CBD5E1',
    focus: '#991B1B',
    error: '#EF4444',
  },

  // Typography Text Tokens
  text: {
    primary: '#1E293B',
    secondary: '#475569',
    muted: '#64748B',
    subtle: '#64748B',      // Slate 500 (WCAG AA 4.76:1 on White, 4.55:1 on Canvas)
    placeholder: '#64748B', // Accessible Placeholder (WCAG AA 4.76:1)
    inverse: '#FFFFFF',
    disabled: '#CBD5E1',
    link: '#991B1B',
    error: '#EF4444',
    success: '#10B981',
    brand: '#991B1B',
    burgundy: '#7F1D1D',
  },

  // Semantic Status Colors
  semantic: {
    error: {
      light: '#FEF2F2',
      main: '#EF4444',
      button: '#DC2626', // Red 600 - WCAG AA 4.83:1 with white text for action buttons
      dark: '#B91C1C',   // Red 700 - WCAG AA 6.47:1 with white text
      border: '#FECACA',
    },
    warning: {
      light: '#FFFBEB',
      main: '#F59E0B',
      dark: '#B45309',
      border: '#FDE68A',
    },
    success: {
      light: '#ECFDF5',
      main: '#10B981',
      dark: '#047857',
      border: '#A7F3D0',
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
    academic: colors.academic, // Academic palette array
  },

  // Academic Course Categorization Palettes (Vick Lohvynenko style)
  academic: colors.academicNamed,
  academicList: colors.academic,

  // Android Native Touch Target (48dp minimum)
  touchTarget: {
    min: 48,
  },

  // Base Atoms
  spacing,
  radius,
  elevation,
  elevationLevels,
  shadows,
  typography,
  textStyles,
  colors,
} as const;

export const tokens = REDS_TOKENS;
export type RedsTokens = typeof REDS_TOKENS;
export type Tokens = typeof REDS_TOKENS;
export default REDS_TOKENS;
