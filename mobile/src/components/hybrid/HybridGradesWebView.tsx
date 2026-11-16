/**
 * HybridGradesWebView.tsx
 * Secure Hybrid WebView Container for Student Academic Grades (/student/grades).
 *
 * Implements TASK 7.3 Pilot Expansion:
 * Reuses the shared EduPortalWebView (TASK 7.2) with strict RFC 3986 origin verification,
 * anti-replay protection, monotonic sequence tracking, and zero credential leakage.
 */

import React from 'react';
import { EduPortalWebView } from './EduPortalWebView';

export interface HybridGradesWebViewProps {
  webUrl?: string;
  onLogout?: () => void;
  onNavigate?: (route: string, params?: Record<string, unknown>) => void;
  testID?: string;
}

export const HybridGradesWebView: React.FC<HybridGradesWebViewProps> = ({
  webUrl,
  onLogout,
  onNavigate,
  testID = 'hybrid-grades-webview',
}) => {
  const defaultWebUrl =
    webUrl ||
    (__DEV__
      ? process.env.EXPO_PUBLIC_WEB_URL
        ? `${process.env.EXPO_PUBLIC_WEB_URL}/student/grades`
        : 'http://localhost:5173/student/grades'
      : 'https://rikkeiportal.io.vn/student/grades');

  return (
    <EduPortalWebView
      initialUrl={defaultWebUrl}
      onLogout={onLogout}
      onNavigate={onNavigate}
      testID={testID}
      loadingTitle="Đang tải bảng điểm sinh viên..."
      errorTitle="Không thể kết nối đến Bảng điểm"
      errorMessage="Không thể tải bảng điểm sinh viên."
    />
  );
};
