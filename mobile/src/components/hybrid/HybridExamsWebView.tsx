/**
 * HybridExamsWebView.tsx
 * Secure Hybrid WebView Container for Student Examination Schedule (/student/exams).
 *
 * Implements TASK 7.3 Pilot Expansion:
 * Reuses the shared EduPortalWebView (TASK 7.2) with strict RFC 3986 origin verification,
 * anti-replay protection, monotonic sequence tracking, and zero credential leakage.
 */

import React from 'react';
import { EduPortalWebView } from './EduPortalWebView';

export interface HybridExamsWebViewProps {
  webUrl?: string;
  onLogout?: () => void;
  onNavigate?: (route: string, params?: Record<string, unknown>) => void;
  testID?: string;
}

export const HybridExamsWebView: React.FC<HybridExamsWebViewProps> = ({
  webUrl,
  onLogout,
  onNavigate,
  testID = 'hybrid-exams-webview',
}) => {
  const defaultWebUrl =
    webUrl ||
    (__DEV__
      ? process.env.EXPO_PUBLIC_WEB_URL
        ? `${process.env.EXPO_PUBLIC_WEB_URL}/student/exams`
        : 'http://localhost:5173/student/exams'
      : 'https://rikkeiportal.io.vn/student/exams');

  return (
    <EduPortalWebView
      initialUrl={defaultWebUrl}
      onLogout={onLogout}
      onNavigate={onNavigate}
      testID={testID}
      loadingTitle="Đang tải lịch thi sinh viên..."
      errorTitle="Không thể kết nối đến Lịch thi"
      errorMessage="Không thể tải trang lịch thi sinh viên."
    />
  );
};
