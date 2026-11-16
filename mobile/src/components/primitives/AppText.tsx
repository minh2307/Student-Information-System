/**
 * AppText.tsx
 * Standardized Typography Primitive Component for REDS v2.0.
 * Ensures consistent font sizes, line heights, weights and Vietnamese diacritic support.
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle, StyleSheet, StyleProp } from 'react-native';
import { tokens, textStyles } from '@/theme';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'bodyLarge'
  | 'body'
  | 'bodyMedium'
  | 'bodyBold'
  | 'bodySmall'
  | 'caption'
  | 'captionBold'
  | 'overline';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'subtle'
  | 'inverse'
  | 'link'
  | 'error'
  | 'success'
  | 'brand'
  | (string & {});

export interface AppTextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: TextStyle['fontWeight'] | 'regular' | 'medium' | 'semiBold' | 'bold' | string;
  align?: 'left' | 'center' | 'right' | 'justify';
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color = 'secondary',
  weight,
  align = 'left',
  style,
  children,
  ...restProps
}) => {
  const baseVariant = variant === 'bodySmall' ? 'caption' : variant;
  const baseStyle = textStyles[baseVariant] || textStyles.body;

  let fontWeightStyle: TextStyle['fontWeight'] | undefined;
  if (weight) {
    if (weight === 'regular') fontWeightStyle = '400';
    else if (weight === 'medium') fontWeightStyle = '500';
    else if (weight === 'semiBold') fontWeightStyle = '600';
    else if (weight === 'bold') fontWeightStyle = '700';
    else fontWeightStyle = weight as any;
  }

  let resolvedColor: string;
  switch (color) {
    case 'primary':
      resolvedColor = tokens.text.primary;
      break;
    case 'secondary':
      resolvedColor = tokens.text.secondary;
      break;
    case 'muted':
      resolvedColor = tokens.text.muted;
      break;
    case 'subtle':
      resolvedColor = tokens.text.subtle;
      break;
    case 'inverse':
      resolvedColor = tokens.text.inverse;
      break;
    case 'link':
      resolvedColor = tokens.text.link;
      break;
    case 'error':
      resolvedColor = tokens.text.error;
      break;
    case 'success':
      resolvedColor = tokens.text.success;
      break;
    case 'brand':
      resolvedColor = tokens.brand.crimson;
      break;
    default:
      resolvedColor = color;
  }

  return (
    <RNText
      style={[
        baseStyle,
        fontWeightStyle ? { fontWeight: fontWeightStyle } : undefined,
        { color: resolvedColor, textAlign: align },
        style,
      ]}
      {...restProps}
    >
      {children}
    </RNText>
  );
};
