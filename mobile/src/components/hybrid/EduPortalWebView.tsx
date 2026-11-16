/**
 * EduPortalWebView.tsx
 * Production-ready Shared WebView Security Wrapper (TASK 7.2)
 *
 * Implements:
 * 1. Hardened Android WebView configuration (Strict HTTPS, sandboxed files, disabled multi-window).
 * 2. Origin Allowlist & Navigation Security via securityPolicy.
 * 3. Deep integration with SecureWebViewBridge & TokenBroker.
 * 4. Android Hardware Back Button navigation interception.
 * 5. Visual loading overlays, offline/error recovery with retry mechanism.
 * 6. Clean lifecycle management and memory leak prevention on unmount.
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  BackHandler,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, textStyles } from '@/theme';
import { secureWebViewBridge } from '@/bridge/SecureWebViewBridge';
import { NativeQRScanner } from '../qr/NativeQRScanner';
import {
  DEFAULT_PRODUCTION_ORIGINS,
  DEFAULT_DEV_ORIGINS,
  evaluateNavigationPolicy,
} from '@/bridge/securityPolicy';

const WebViewComponent = WebView as unknown as React.ComponentType<any>;

export interface EduPortalWebViewRef {
  reload: () => void;
  goBack: () => void;
  canGoBack: () => boolean;
  postMessage: (message: string) => void;
  getWebView: () => any;
}

export interface EduPortalWebViewProps {
  initialUrl: string;
  allowedOrigins?: string[];
  isDev?: boolean;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: string) => void;
  onLogout?: () => void;
  onNavigate?: (route: string, params?: Record<string, unknown>) => void;
  loadingTitle?: string;
  errorTitle?: string;
  errorMessage?: string;
  testID?: string;
  enableBackHandler?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const EduPortalWebView = forwardRef<EduPortalWebViewRef, EduPortalWebViewProps>(
  (
    {
      initialUrl,
      allowedOrigins,
      isDev,
      onLoadStart,
      onLoadEnd,
      onError,
      onLogout,
      onNavigate,
      loadingTitle = 'Đang tải nội dung...',
      errorTitle = 'Không thể kết nối đến máy chủ',
      errorMessage,
      testID = 'eduportal-webview',
      enableBackHandler = true,
      style,
    },
    ref
  ) => {
    const webViewRef = useRef<any>(null);
    const canGoBackRef = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
    const [qrScannerConfig, setQrScannerConfig] = useState<{ title?: string; hint?: string }>({});

    const isDevelopment = isDev ?? (__DEV__ || process.env.NODE_ENV === 'test');
    const resolvedOrigins =
      allowedOrigins ??
      (isDevelopment
        ? [...DEFAULT_PRODUCTION_ORIGINS, ...DEFAULT_DEV_ORIGINS]
        : DEFAULT_PRODUCTION_ORIGINS);

    // Expose imperative methods to parent components
    useImperativeHandle(
      ref,
      () => ({
        reload: () => {
          setLoadError(null);
          setIsLoading(true);
          webViewRef.current?.reload?.();
        },
        goBack: () => {
          if (canGoBackRef.current) {
            webViewRef.current?.goBack?.();
          }
        },
        canGoBack: () => canGoBackRef.current,
        postMessage: (msg: string) => {
          webViewRef.current?.postMessage?.(msg);
        },
        getWebView: () => webViewRef.current,
      }),
      []
    );

    // 1. Bind outbound message dispatcher to this WebView instance
    useEffect(() => {
      secureWebViewBridge.setSendToWeb((jsonString: string) => {
        webViewRef.current?.postMessage?.(jsonString);
      });
      return () => {
        // Prevent orphaned messages when unmounted
        secureWebViewBridge.setSendToWeb(() => {});
      };
    }, []);

    // 2. Android Hardware Back Button Handling
    useEffect(() => {
      if (Platform.OS !== 'android' || !enableBackHandler) {
        return;
      }

      const onHardwareBackPress = () => {
        if (canGoBackRef.current && webViewRef.current) {
          webViewRef.current.goBack();
          return true; // Consume event, prevent app exit
        }
        return false; // Allow default back navigation
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onHardwareBackPress
      );
      return () => subscription.remove();
    }, [enableBackHandler]);

    // 3. Bind QR Scanner request handlers to bridge
    useEffect(() => {
      secureWebViewBridge.setQrScanHandlers({
        onStartScan: (payload) => {
          setQrScannerConfig({ title: payload?.title, hint: payload?.hint });
          setIsQrScannerOpen(true);
        },
        onCancelScan: () => {
          setIsQrScannerOpen(false);
        },
      });
      return () => {
        secureWebViewBridge.setQrScanHandlers({});
      };
    }, []);

    const handleNativeQrScanned = useCallback(async (token: string) => {
      setIsQrScannerOpen(false);
      try {
        await secureWebViewBridge.sendQrScanSuccess(token);
      } catch (err: any) {
        secureWebViewBridge.sendQrScanError('SESSION_ERROR', err?.message || 'Lỗi phiên làm việc');
      }
    }, []);

    const handleNativeQrCancelled = useCallback(() => {
      setIsQrScannerOpen(false);
      secureWebViewBridge.sendQrScanCancel('USER_CANCELLED');
    }, []);

    const handleNativeQrError = useCallback((err: { code: string; message: string }) => {
      setIsQrScannerOpen(false);
      secureWebViewBridge.sendQrScanError(err.code, err.message);
    }, []);

    // 4. Handle messages dispatched from Web via window.ReactNativeWebView.postMessage
    const handleMessage = useCallback(
      async (event: WebViewMessageEvent) => {
        const { data, url } = event.nativeEvent;
        try {
          await secureWebViewBridge.handleMessage(data, url);
        } catch (bridgeErr: any) {
          console.warn('EduPortalWebView: Bridge rejected message:', bridgeErr?.message);
        }
      },
      []
    );

    // 4. Origin & Navigation Security Policy Filter
    const handleShouldStartLoad = useCallback(
      (request: ShouldStartLoadRequest): boolean => {
        const { url } = request;
        const policy = evaluateNavigationPolicy(url, resolvedOrigins, isDevelopment);

        if (policy.action === 'ALLOW') {
          return true;
        }

        if (policy.action === 'EXTERNAL_BROWSER') {
          WebBrowser.openBrowserAsync(url).catch(() => {});
          return false;
        }

        // Dangerous or unverified scheme blocked
        console.warn(`EduPortalWebView: Blocked navigation: ${policy.reason ?? url}`);
        return false;
      },
      [resolvedOrigins, isDevelopment]
    );

    // 5. Track back/forward capability for Android back button
    const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
      canGoBackRef.current = navState.canGoBack;
    }, []);

    // 6. Reload & Error Recovery
    const handleReload = () => {
      setLoadError(null);
      setIsLoading(true);
      webViewRef.current?.reload?.();
    };

    // Injected JavaScript before content loaded
    const injectedJs = `
      (function() {
        window.__EDUPORTAL_HYBRID_NATIVE_READY__ = true;
        window.isEduportalHybrid = true;
      })();
      true;
    `;

    return (
      <View style={[styles.container, style]} testID={testID}>
        {loadError ? (
          <View style={styles.errorContainer} testID={`${testID}-error`}>
            <Ionicons name="cloud-offline-outline" size={54} color={colors.neutral[400]} />
            <Text style={styles.errorTitle}>{errorTitle}</Text>
            <Text style={styles.errorMessage}>{errorMessage || loadError}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={handleReload}
              testID={`${testID}-retry-btn`}
              accessibilityRole="button"
              accessibilityLabel="Thử lại kết nối"
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <WebViewComponent
              ref={webViewRef}
              source={{ uri: initialUrl }}
              onMessage={handleMessage}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadStart={() => {
                setIsLoading(true);
                onLoadStart?.();
              }}
              onLoadEnd={() => {
                setIsLoading(false);
                onLoadEnd?.();
              }}
              onError={(syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                setIsLoading(false);
                const desc = nativeEvent?.description || 'Không thể tải trang web.';
                setLoadError(desc);
                onError?.(desc);
              }}
              injectedJavaScriptBeforeContentLoaded={injectedJs}
              // --- Hardened Android & Cross-Platform Security Props ---
              javaScriptEnabled={true}
              domStorageEnabled={true}
              setSupportMultipleWindows={false}
              allowFileAccess={false}
              allowFileAccessFromFileURLs={false}
              allowUniversalAccessFromFileURLs={false}
              mixedContentMode="never"
              thirdPartyCookiesEnabled={false}
              geolocationEnabled={false}
              mediaPlaybackRequiresUserAction={true}
              textZoom={100}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              allowsBackForwardNavigationGestures={true}
              style={styles.webView}
            />
            {isLoading && (
              <View style={styles.loadingOverlay} testID={`${testID}-loading`}>
                <ActivityIndicator size="large" color={colors.primary[800]} />
                <Text style={styles.loadingText}>{loadingTitle}</Text>
              </View>
            )}
          </>
        )}

        <NativeQRScanner
          isOpen={isQrScannerOpen}
          title={qrScannerConfig.title}
          hint={qrScannerConfig.hint}
          onScan={handleNativeQrScanned}
          onCancel={handleNativeQrCancelled}
          onError={handleNativeQrError}
          testID={`${testID}-native-qr-scanner`}
        />
      </View>
    );
  }
);

EduPortalWebView.displayName = 'EduPortalWebView';

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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    ...textStyles.body2,
    color: colors.neutral[600],
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.neutral[50],
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.neutral[800],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorMessage: {
    ...textStyles.body2,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  retryText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium as any,
    color: '#FFFFFF',
  },
});
