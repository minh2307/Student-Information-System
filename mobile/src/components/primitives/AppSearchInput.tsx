/**
 * AppSearchInput.tsx
 * Standard Search Bar Primitive for REDS v2.0.
 * Provides instant search with clear action and magnifying glass indicator.
 */

import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';

export interface AppSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  containerStyle?: ViewStyle | ViewStyle[];
  testID?: string;
  accessibilityLabel?: string;
}

export const AppSearchInput: React.FC<AppSearchInputProps> = ({
  value,
  onChangeText,
  onClear,
  placeholder = 'Tìm kiếm môn học, lớp học phần...',
  containerStyle,
  testID = 'app-search-input',
  accessibilityLabel = 'Ô tìm kiếm',
}) => {
  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons
        name="search-outline"
        size={18}
        color={tokens.text.muted}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.text.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      />
      {value ? (
        <Pressable
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Xóa nội dung tìm kiếm"
          testID={`${testID}-clear`}
        >
          <Ionicons name="close-circle" size={18} color={tokens.text.muted} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.surface.elevated,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.spacing.md,
    minHeight: 44,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  searchIcon: {
    marginRight: tokens.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: tokens.typography.sizes.sm,
    color: tokens.text.primary,
    paddingVertical: tokens.spacing.sm,
  },
  clearButton: {
    padding: tokens.spacing.xs,
  },
});

export const SearchInput = AppSearchInput;
export type SearchInputProps = AppSearchInputProps;
export default AppSearchInput;

