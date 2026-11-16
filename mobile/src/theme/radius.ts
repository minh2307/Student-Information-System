/**
 * Centralized Design System - Border Radius Tokens (REDS v2.0)
 */

export const radius = {
  none: 0,
  xs: 4,      // Tiny badge, progress bar
  sm: 8,      // Chip, status tag
  md: 12,     // Button, standard input field
  lg: 16,     // Card, class item
  xl: 20,     // Bento grid card, Student/Faculty Pass
  xxl: 24,    // Modal, Bottom Sheet top corners
  full: 9999, // Circular button, Pill badge, Avatar
} as const;

export type RadiusTokens = typeof radius;
