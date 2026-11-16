/**
 * Student Grades Screen (Hybrid Pilot Expansion)
 * Embeds Web Student Grades (/student/grades) via EduPortalWebView.
 *
 * Implements TASK 7.3:
 * Seamlessly integrates Web Grades interface inside Native Shell while delegating
 * authentication and security to Native TokenBroker and SecureWebViewBridge.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import { HybridGradesWebView } from '@/components/hybrid/HybridGradesWebView';

export default function GradesScreen() {
  return (
    <View style={styles.container} testID="student-grades-screen">
      <HybridGradesWebView testID="hybrid-grades-webview" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
});
