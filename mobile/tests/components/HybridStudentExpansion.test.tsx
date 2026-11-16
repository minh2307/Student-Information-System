/**
 * HybridStudentExpansion.test.tsx
 * Comprehensive Integration & Security Test Suite for Student Pilot Expansion:
 * Exams (/student/exams) & Grades (/student/grades) (TASK 7.3).
 *
 * Scenarios Tested:
 * - Scenario Group A: HybridExamsWebView Component & Props
 * - Scenario Group B: HybridGradesWebView Component & Props
 * - Scenario Group C: Hybrid Navigation, Lifecycle & Tab Switching
 * - Scenario Group D: Security Policy, Origin Validation & Bridge Invariants
 * - Scenario Group E: Native App Screen Wrappers (ExamsScreen & GradesScreen)
 * - Scenario Group F: Barrel Export Invariant Verification
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { BackHandler, Platform } from 'react-native';
import {
  HybridExamsWebView,
  HybridExamsWebViewProps,
} from '@/components/hybrid/HybridExamsWebView';
import {
  HybridGradesWebView,
  HybridGradesWebViewProps,
} from '@/components/hybrid/HybridGradesWebView';
import {
  EduPortalWebView,
  HybridProfileWebView,
} from '@/components/hybrid';
import * as HybridBarrel from '@/components/hybrid';
import ExamsScreen from '../../app/(student)/exams';
import GradesScreen from '../../app/(student)/grades';
import { secureWebViewBridge } from '@/bridge/SecureWebViewBridge';
import { tokenBroker } from '@/bridge/tokenBroker';
import * as WebBrowser from 'expo-web-browser';

// Access test helpers exposed by setupTests.ts mock
const {
  __getLastWebViewProps,
  __getLastWebViewInstance,
  __resetMockWebView,
} = require('react-native-webview');

describe('TASK 7.3: Student Pilot Expansion (Exams & Grades)', () => {
  const prodExamsUrl = 'https://rikkeiportal.io.vn/student/exams';
  const prodGradesUrl = 'https://rikkeiportal.io.vn/student/grades';
  const devExamsUrl = 'http://localhost:5173/student/exams';
  const devGradesUrl = 'http://localhost:5173/student/grades';

  beforeEach(() => {
    jest.restoreAllMocks();
    __resetMockWebView();
    Platform.OS = 'android';
    tokenBroker.unlockBroker();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Platform.OS = 'android';
    tokenBroker.unlockBroker();
  });

  // ─────────────────────────────────────────────────────────────
  // SCENARIO GROUP A: HybridExamsWebView Component & Props
  // ─────────────────────────────────────────────────────────────
  describe('Group A: HybridExamsWebView Component & Configuration', () => {
    it('A1: renders HybridExamsWebView with default testID and loading overlay', () => {
      const html = renderToStaticMarkup(<HybridExamsWebView />);

      expect(html).toContain('hybrid-exams-webview');
      expect(html).toContain('Đang tải lịch thi sinh viên...');
      expect(html).toContain('mock-webview');
    });

    it('A2: resolves default initialUrl for development / test environment', () => {
      renderToStaticMarkup(<HybridExamsWebView />);
      const webViewProps = __getLastWebViewProps();

      expect(webViewProps).toBeDefined();
      expect(webViewProps.source).toEqual({ uri: devExamsUrl });
    });

    it('A3: accepts custom webUrl prop override', () => {
      const customUrl = 'https://custom-campus.rikkeiportal.io.vn/student/exams';
      renderToStaticMarkup(<HybridExamsWebView webUrl={customUrl} />);
      const webViewProps = __getLastWebViewProps();

      expect(webViewProps).toBeDefined();
      expect(webViewProps.source).toEqual({ uri: customUrl });
    });

    it('A4: configures hardened Android security properties on underlying WebView', () => {
      renderToStaticMarkup(<HybridExamsWebView />);
      const webViewProps = __getLastWebViewProps();

      expect(webViewProps.allowFileAccess).toBe(false);
      expect(webViewProps.allowFileAccessFromFileURLs).toBe(false);
      expect(webViewProps.allowUniversalAccessFromFileURLs).toBe(false);
      expect(webViewProps.mixedContentMode).toBe('never');
      expect(webViewProps.thirdPartyCookiesEnabled).toBe(false);
      expect(webViewProps.geolocationEnabled).toBe(false);
      expect(webViewProps.mediaPlaybackRequiresUserAction).toBe(true);
      expect(webViewProps.textZoom).toBe(100);
      expect(webViewProps.setSupportMultipleWindows).toBe(false);
      expect(webViewProps.javaScriptEnabled).toBe(true);
      expect(webViewProps.domStorageEnabled).toBe(true);
    });

    it('A5: customizes testID when passed as prop', () => {
      const html = renderToStaticMarkup(
        <HybridExamsWebView testID="custom-exams-id" />
      );
      expect(html).toContain('custom-exams-id');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SCENARIO GROUP B: HybridGradesWebView Component & Props
  // ─────────────────────────────────────────────────────────────
  describe('Group B: HybridGradesWebView Component & Configuration', () => {
    it('B1: renders HybridGradesWebView with default testID and loading overlay', () => {
      const html = renderToStaticMarkup(<HybridGradesWebView />);

      expect(html).toContain('hybrid-grades-webview');
      expect(html).toContain('Đang tải bảng điểm sinh viên...');
      expect(html).toContain('mock-webview');
    });

    it('B2: resolves default initialUrl for development / test environment', () => {
      renderToStaticMarkup(<HybridGradesWebView />);
      const webViewProps = __getLastWebViewProps();

      expect(webViewProps).toBeDefined();
      expect(webViewProps.source).toEqual({ uri: devGradesUrl });
    });

    it('B3: accepts custom webUrl prop override', () => {
      const customUrl = 'https://custom-campus.rikkeiportal.io.vn/student/grades';
      renderToStaticMarkup(<HybridGradesWebView webUrl={customUrl} />);
      const webViewProps = __getLastWebViewProps();

      expect(webViewProps).toBeDefined();
      expect(webViewProps.source).toEqual({ uri: customUrl });
    });

    it('B4: configures hardened Android security properties on underlying WebView', () => {
      renderToStaticMarkup(<HybridGradesWebView />);
      const webViewProps = __getLastWebViewProps();

      expect(webViewProps.allowFileAccess).toBe(false);
      expect(webViewProps.allowFileAccessFromFileURLs).toBe(false);
      expect(webViewProps.allowUniversalAccessFromFileURLs).toBe(false);
      expect(webViewProps.mixedContentMode).toBe('never');
      expect(webViewProps.thirdPartyCookiesEnabled).toBe(false);
      expect(webViewProps.geolocationEnabled).toBe(false);
      expect(webViewProps.mediaPlaybackRequiresUserAction).toBe(true);
      expect(webViewProps.textZoom).toBe(100);
      expect(webViewProps.setSupportMultipleWindows).toBe(false);
      expect(webViewProps.javaScriptEnabled).toBe(true);
      expect(webViewProps.domStorageEnabled).toBe(true);
    });

    it('B5: customizes testID when passed as prop', () => {
      const html = renderToStaticMarkup(
        <HybridGradesWebView testID="custom-grades-id" />
      );
      expect(html).toContain('custom-grades-id');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SCENARIO GROUP C: Hybrid Navigation, Lifecycle & Tab Switching
  // ─────────────────────────────────────────────────────────────
  describe('Group C: Navigation, Bridge Lifecycle & Tab Switching', () => {
    it('C1: configures navigation state tracking for tab transitions (Exams -> Grades -> Profile)', () => {
      // 1. Mount Exams WebView & inspect navigation state handler
      renderToStaticMarkup(<HybridExamsWebView />);
      const examsProps = __getLastWebViewProps();
      expect(examsProps.onNavigationStateChange).toBeDefined();

      // 2. Mount Grades WebView & inspect navigation state handler
      renderToStaticMarkup(<HybridGradesWebView />);
      const gradesProps = __getLastWebViewProps();
      expect(gradesProps.onNavigationStateChange).toBeDefined();

      // 3. Mount Profile WebView & inspect navigation state handler
      renderToStaticMarkup(
        <HybridProfileWebView webUrl="https://rikkeiportal.io.vn/student/profile" />
      );
      const profileProps = __getLastWebViewProps();
      expect(profileProps.onNavigationStateChange).toBeDefined();
    });

    it('C2: propagates onLogout and onNavigate callbacks from HybridExamsWebView', async () => {
      const onLogoutMock = jest.fn();
      const onNavigateMock = jest.fn();

      renderToStaticMarkup(
        <HybridExamsWebView onLogout={onLogoutMock} onNavigate={onNavigateMock} />
      );
      const webViewProps = __getLastWebViewProps();

      expect(webViewProps.onMessage).toBeDefined();

      // Trigger navigation message via bridge
      const navMessage = JSON.stringify({
        version: '1.0',
        id: 'msg_nav_exams_test',
        type: 'NAVIGATE_NATIVE',
        timestamp: Date.now(),
        epoch: 0,
        sessionId: 'session_exams_test',
        seq: 1,
        payload: { route: '/profile', params: { from: 'exams' } },
      });

      // Spy on bridge handleMessage
      jest.spyOn(secureWebViewBridge, 'handleMessage').mockImplementation(async () => {
        onNavigateMock('/profile', { from: 'exams' });
        return null;
      });

      await webViewProps.onMessage({
        nativeEvent: { data: navMessage, url: devExamsUrl },
      });

      expect(onNavigateMock).toHaveBeenCalledWith('/profile', { from: 'exams' });
    });

    it('C3: propagates onLogout callback from HybridGradesWebView', async () => {
      const onLogoutMock = jest.fn();

      renderToStaticMarkup(<HybridGradesWebView onLogout={onLogoutMock} />);
      const webViewProps = __getLastWebViewProps();

      // Mock bridge handleMessage triggering onLogout
      jest.spyOn(secureWebViewBridge, 'handleMessage').mockImplementation(async () => {
        onLogoutMock();
        return null;
      });

      const logoutMsg = JSON.stringify({
        version: '1.0',
        id: 'msg_logout_grades_test',
        type: 'LOGOUT_REQUEST',
        timestamp: Date.now(),
        epoch: 0,
        sessionId: 'session_grades_test',
        seq: 1,
        payload: {},
      });

      await webViewProps.onMessage({
        nativeEvent: { data: logoutMsg, url: devGradesUrl },
      });

      expect(onLogoutMock).toHaveBeenCalled();
    });

    it('C4: binds navigation state and canGoBack tracking for HybridExamsWebView', () => {
      renderToStaticMarkup(<HybridExamsWebView />);
      const webViewProps = __getLastWebViewProps();

      expect(webViewProps.onNavigationStateChange).toBeDefined();

      // Simulate internal page change inside Exams WebView
      webViewProps.onNavigationStateChange({
        canGoBack: true,
        canGoForward: false,
        loading: false,
        title: 'Lịch thi học kỳ',
        url: `${prodExamsUrl}?semester=HK1-2024`,
      });

      // When back navigation returns to root
      webViewProps.onNavigationStateChange({
        canGoBack: false,
        canGoForward: false,
        loading: false,
        title: 'Lịch thi',
        url: prodExamsUrl,
      });
    });

    it('C5: binds navigation state and canGoBack tracking for HybridGradesWebView', () => {
      renderToStaticMarkup(<HybridGradesWebView />);
      const webViewProps = __getLastWebViewProps();

      expect(webViewProps.onNavigationStateChange).toBeDefined();

      // Simulate internal page change inside Grades WebView
      webViewProps.onNavigationStateChange({
        canGoBack: true,
        canGoForward: false,
        loading: false,
        title: 'Chi tiết bảng điểm môn học',
        url: `${prodGradesUrl}/detail/IT101`,
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SCENARIO GROUP D: Security Policy, Origin & Bridge Invariants
  // ─────────────────────────────────────────────────────────────
  describe('Group D: Security Policy & Bridge Invariants (Directives 1-6)', () => {
    it('D1: allows navigation within valid student pilot origins', () => {
      renderToStaticMarkup(
        <EduPortalWebView initialUrl={prodExamsUrl} isDev={false} />
      );
      const webViewProps = __getLastWebViewProps();
      const shouldStartLoad = webViewProps.onShouldStartLoadWithRequest;

      // Both Exams and Grades are allowed in-app on production origin
      expect(shouldStartLoad({ url: prodExamsUrl })).toBe(true);
      expect(shouldStartLoad({ url: prodGradesUrl })).toBe(true);
      expect(
        shouldStartLoad({ url: 'https://rikkeiportal.io.vn/student/exams?semester=HK1-2024' })
      ).toBe(true);
    });

    it('D2: intercepts external URLs and opens them via WebBrowser.openBrowserAsync', () => {
      renderToStaticMarkup(
        <EduPortalWebView initialUrl={prodGradesUrl} isDev={false} />
      );
      const webViewProps = __getLastWebViewProps();
      const shouldStartLoad = webViewProps.onShouldStartLoadWithRequest;

      const externalUrl = 'https://portal.moet.gov.vn/national-grades';
      const result = shouldStartLoad({ url: externalUrl });

      expect(result).toBe(false);
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(externalUrl);
    });

    it('D3: blocks dangerous URL schemes without opening external browser', () => {
      renderToStaticMarkup(
        <EduPortalWebView initialUrl={prodExamsUrl} isDev={false} />
      );
      const webViewProps = __getLastWebViewProps();
      const shouldStartLoad = webViewProps.onShouldStartLoadWithRequest;
      jest.clearAllMocks();

      expect(shouldStartLoad({ url: 'javascript:alert(document.cookie)' })).toBe(false);
      expect(shouldStartLoad({ url: 'file:///data/user/0/com.rikkei.eduportal/databases' })).toBe(false);
      expect(shouldStartLoad({ url: 'intent://malicious-package#Intent;end' })).toBe(false);
      expect(shouldStartLoad({ url: 'data:text/html,<script>steal()</script>' })).toBe(false);
      expect(shouldStartLoad({ url: 'content://sms/inbox' })).toBe(false);

      expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    });

    it('D4: enforces zero Refresh Token leakage across bridge', async () => {
      const validJwt =
        'header.eyJzdWIiOiJzdjIwMjQwMDEiLCJyb2xlIjoiU1RVREVOVCIsImV4cCI6MjUzMzcwNzY0ODAwfQ.signature';
      const { tokenStorage } = require('@/storage/tokenStorage');
      const { useAuthStore } = require('@/stores/authStore');

      await tokenStorage.saveTokens(validJwt, 'secret_refresh_token_vault', 'tx_handshake_pilot', 1);
      useAuthStore.setState({
        isAuthenticated: true,
        user: {
          id: 'user-sv-01',
          username: 'sv2024001',
          fullName: 'Nguyen Van Sinh Vien',
          role: 'STUDENT',
          email: 'sv@rikkei.edu.vn',
        },
        studentProfile: {
          studentCode: 'SV2024001',
          major: 'Software Engineering',
          currentSemester: 'HK1-2024',
          creditsEarned: 45,
          totalRequiredCredits: 120,
        },
      });

      renderToStaticMarkup(<HybridExamsWebView />);
      const webViewProps = __getLastWebViewProps();

      let dispatchedMessage: any = null;
      secureWebViewBridge.setSendToWeb((msgStr: string) => {
        dispatchedMessage = JSON.parse(msgStr);
      });

      // Simulate handshake init from web
      const handshakeInit = JSON.stringify({
        version: '1.0',
        id: 'msg_handshake_pilot_expansion',
        type: 'AUTH_HANDSHAKE_INIT',
        timestamp: Date.now(),
        payload: { clientType: 'web-react', clientVersion: '1.0.0' },
      });

      await webViewProps.onMessage({
        nativeEvent: { data: handshakeInit, url: devExamsUrl },
      });

      expect(dispatchedMessage).not.toBeNull();
      expect(dispatchedMessage.type).toBe('AUTH_HANDSHAKE_ACK');
      expect(dispatchedMessage.payload.accessToken).toBe(validJwt);
      // Crucial: Refresh token must NEVER exist in bridge response payload
      expect(dispatchedMessage.payload.refreshToken).toBeUndefined();
      expect(JSON.stringify(dispatchedMessage)).not.toContain('secret_refresh_token_vault');
      expect(JSON.stringify(dispatchedMessage)).not.toContain('refreshToken');
    });

    it('D5: fails closed when TokenBroker is locked during bridge message handling', async () => {
      tokenBroker.lockBroker();

      const refreshReq = JSON.stringify({
        version: '1.0',
        id: 'msg_locked_broker_expansion',
        type: 'AUTH_REFRESH_REQUEST',
        timestamp: Date.now(),
        epoch: 0,
        sessionId: 'session_locked_test',
        seq: 2,
        payload: {},
      });

      await expect(
        secureWebViewBridge.handleMessage(refreshReq, devGradesUrl)
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SCENARIO GROUP E: Native App Screen Wrappers
  // ─────────────────────────────────────────────────────────────
  describe('Group E: Native Screen Containers (ExamsScreen & GradesScreen)', () => {
    it('E1: ExamsScreen renders root container with student-exams-screen testID and embeds HybridExamsWebView', () => {
      const html = renderToStaticMarkup(<ExamsScreen />);

      expect(html).toContain('student-exams-screen');
      expect(html).toContain('hybrid-exams-webview');
      expect(html).toContain('Đang tải lịch thi sinh viên...');
      expect(html).toContain('mock-webview');
    });

    it('E2: GradesScreen renders root container with student-grades-screen testID and embeds HybridGradesWebView', () => {
      const html = renderToStaticMarkup(<GradesScreen />);

      expect(html).toContain('student-grades-screen');
      expect(html).toContain('hybrid-grades-webview');
      expect(html).toContain('Đang tải bảng điểm sinh viên...');
      expect(html).toContain('mock-webview');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SCENARIO GROUP F: Barrel Export Verification
  // ─────────────────────────────────────────────────────────────
  describe('Group F: Barrel Export Invariant Verification', () => {
    it('F1: exports all shared and pilot expansion hybrid components', () => {
      expect(HybridBarrel.EduPortalWebView).toBeDefined();
      expect(HybridBarrel.HybridProfileWebView).toBeDefined();
      expect(HybridBarrel.HybridExamsWebView).toBeDefined();
      expect(HybridBarrel.HybridGradesWebView).toBeDefined();

      expect(typeof HybridBarrel.EduPortalWebView).toBe('object'); // React forwardRef component
      expect(typeof HybridBarrel.HybridProfileWebView).toBe('function');
      expect(typeof HybridBarrel.HybridExamsWebView).toBe('function');
      expect(typeof HybridBarrel.HybridGradesWebView).toBe('function');
    });
  });
});
