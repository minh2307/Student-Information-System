/**
 * Student Examination Schedule Screen (Hybrid Pilot Expansion)
 * Embeds Web Student Exams (/student/exams) via EduPortalWebView.
 *
 * Implements TASK 7.3:
 * Seamlessly integrates Web Exams interface inside Native Shell while delegating
 * authentication and security to Native TokenBroker and SecureWebViewBridge.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import { HybridExamsWebView } from '@/components/hybrid/HybridExamsWebView';

export default function ExamsScreen() {
  return (
    <View style={styles.container} testID="student-exams-screen">
      <HybridExamsWebView testID="hybrid-exams-webview" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
});
