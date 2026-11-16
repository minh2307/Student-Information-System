/**
 * Centralized Design System - Elevation & Shadows (REDS v2.0)
 * ViewStyle shadow & elevation objects optimized for both Android elevation and iOS shadow rendering.
 */

import { ViewStyle } from 'react-native';

export const elevationLevels = {
  none: 0,
  sm: 1.5,
  md: 3,
  lg: 6,
  floating: 8,
} as const;

export const elevation = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
  } as ViewStyle,

  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 1.5,
  } as ViewStyle,

  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,

  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  } as ViewStyle,

  floating: {
    shadowColor: '#7F1D1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,
} as const;

export const shadows = elevation;

export type ElevationTokens = typeof elevation;
export type ShadowTokens = typeof shadows;
