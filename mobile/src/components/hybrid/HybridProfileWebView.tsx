/**
 * HybridProfileWebView.tsx
 * Secure WebView Container for /student/profile.
 *
 * Implements TASK 7.1.2 Pilot by delegating to the shared EduPortalWebView (TASK 7.2),
 * maintaining 100% backward compatibility while adhering to DRY & SOLID principles.
 */

import React from 'react';
import { EduPortalWebView } from './EduPortalWebView';

export interface HybridProfileWebViewProps {
  webUrl: string;
  onLogout?: () => void;
  onNavigate?: (route: string, params?: Record<string, unknown>) => void;
  testID?: string;
}

export const HybridProfileWebView: React.FC<HybridProfileWebViewProps> = ({
  webUrl,
  onLogout,
  onNavigate,
  testID = 'hybrid-profile-webview',
}) => {
  return (
    <EduPortalWebView
      initialUrl={webUrl}
      onLogout={onLogout}
      onNavigate={onNavigate}
      testID={testID}
      loadingTitle="Đang tải hồ sơ sinh viên..."
      errorTitle="Không thể kết nối đến Hồ sơ"
      errorMessage="Không thể tải trang web hồ sơ."
    />
  );
};
