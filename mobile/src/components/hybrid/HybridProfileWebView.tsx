/**
 * HybridProfileWebView.tsx
 * Secure WebView Container for /student/profile.
 *
 * Implements TASK 7.1.2 Security Directives:
 * 1. Strict Origin-based navigation lockdown (onShouldStartLoadWithRequest).
 * 2. Message passing integrated with SecureWebViewBridge.
 * 3. Loading skeleton, error recovery with Retry button.
 * 4. External URL containment via expo-web-browser.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, textStyles } from '@/theme';
import { secureWebViewBridge } from '@/bridge/SecureWebViewBridge';

const WebViewComponent = WebView as unknown as React.ComponentType<any>;

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
  const webViewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Bind outbound message sender to this WebView instance
  useEffect(() => {
    secureWebViewBridge.setSendToWeb((jsonString: string) => {
      webViewRef.current?.postMessage?.(jsonString);
    });
    return () => {
      secureWebViewBridge.setSendToWeb(() => {});
    };
  }, []);

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const { data, url } = event.nativeEvent;
      try {
        await secureWebViewBridge.handleMessage(data, url);
      } catch (bridgeErr: any) {
        console.warn('HybridProfileWebView: Bridge rejected message:', bridgeErr?.message);
      }
    },
    []
  );

  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      const { url } = request;
      // Allow internal allowlisted origin navigation
      if (secureWebViewBridge.isValidOrigin(url)) {
        return true;
      }

      // External link: open in system WebBrowser and prevent WebView from navigating away
      WebBrowser.openBrowserAsync(url).catch(() => {});
      return false;
    },
    []
  );

  const handleReload = () => {
    setLoadError(null);
    setIsLoading(true);
    webViewRef.current?.reload?.();
  };

  // Injected JavaScript to notify Web that Native Bridge Shell is active
  const injectedJs = `
    (function() {
      window.__EDUPORTAL_HYBRID_NATIVE_READY__ = true;
      window.isEduportalHybrid = true;
    })();
    true;
  `;

  return (
    <View style={styles.container} testID={testID}>
      {loadError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={54} color={colors.neutral[400]} />
          <Text style={styles.errorTitle}>Không thể kết nối đến Hồ sơ</Text>
          <Text style={styles.errorMessage}>{loadError}</Text>
          <Pressable style={styles.retryButton} onPress={handleReload}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <WebViewComponent
            ref={webViewRef}
            source={{ uri: webUrl }}
            onMessage={handleMessage}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={(syntheticEvent: any) => {
              const { nativeEvent } = syntheticEvent;
              setIsLoading(false);
              setLoadError(nativeEvent?.description || 'Không thể tải trang web hồ sơ.');
            }}
            injectedJavaScriptBeforeContentLoaded={injectedJs}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures={true}
            style={styles.webView}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary[800]} />
              <Text style={styles.loadingText}>Đang tải hồ sơ sinh viên...</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  webView: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
});
