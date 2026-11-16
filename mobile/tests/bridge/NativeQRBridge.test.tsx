/**
 * NativeQRBridge.test.tsx
 * Unit & Security Test Suite for Native QR Bridge Protocol (TASK 7.4)
 *
 * Test Groups:
 * - Group A: Web-to-Native QR Messages (QR_SCAN_START, QR_SCAN_CANCEL)
 * - Group B: Native-to-Web QR Messages (QR_SCAN_SUCCESS, QR_SCAN_CANCEL, QR_SCAN_ERROR)
 * - Group C: Security, Anti-Replay, Session Invariants & Fail-Closed Behavior
 * - Group D: Zero Credential Leakage Verification
 */

import {
  SecureWebViewBridge,
  DEFAULT_PRODUCTION_ORIGINS,
} from '@/bridge/SecureWebViewBridge';
import { tokenBroker } from '@/bridge/tokenBroker';
import { tokenStorage } from '@/storage/tokenStorage';
import { useAuthStore, getGlobalEpoch, setGlobalEpochForTesting } from '@/stores/authStore';
import {
  InvalidOriginError,
  InvalidEnvelopeError,
  ReplayAttackError,
  StaleEpochError,
  SessionTerminatedError,
} from '@/bridge/errors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BridgeEnvelope, QrScanSuccessPayload, QrScanErrorPayload, QrScanCancelPayload } from '@/bridge/types';

describe('NativeQRBridge Protocol & Security (TASK 7.4)', () => {
  let bridge: SecureWebViewBridge;
  let sentResponses: any[] = [];

  const validProductionUrl = 'https://rikkeiportal.io.vn/student/profile';
  const validDevUrl = 'http://localhost:5173/student/profile';
  const maliciousUrl = 'http://evil.com/phishing';

  const mockUser = {
    id: 1,
    username: 'sv2024001',
    email: 'student@rikkei.edu.vn',
    fullName: 'Nguyễn Văn C',
    role: 'STUDENT' as const,
    status: 'ACTIVE' as const,
  };

  const validJwt =
    'header.eyJzdWIiOiJzdjIwMjQwMDEiLCJyb2xlIjoiU1RVREVOVCIsImV4cCI6MjUzMzcwNzY0ODAwfQ.signature';
  const validRefreshToken = 'mock_rt_student_123456';
  const testSessionTxId = 'tx_student_session_74';

  beforeEach(async () => {
    jest.restoreAllMocks();
    sentResponses = [];
    setGlobalEpochForTesting(0);
    await AsyncStorage.clear();
    await tokenStorage.clearTokens();
    tokenBroker.unlockBroker();

    useAuthStore.setState({
      user: mockUser,
      studentProfile: null,
      lecturerProfile: null,
      role: 'STUDENT',
      isAuthenticated: true,
      isInitializing: false,
    });

    await tokenStorage.saveTokens(validJwt, validRefreshToken, testSessionTxId, 1);

    bridge = new SecureWebViewBridge({
      allowedOrigins: ['https://rikkeiportal.io.vn', 'http://localhost:5173'],
      isDev: true,
      sendToWeb: (jsonString: string) => {
        sentResponses.push(JSON.parse(jsonString));
      },
    });

    bridge.setActiveChallengeForTesting('chal_test_qr_session');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    tokenBroker.unlockBroker();
  });

  // ── Group A: Web-to-Native QR Messages (QR_SCAN_START, QR_SCAN_CANCEL) ──
  describe('Group A: Web-to-Native QR Messages', () => {
    it('A1: handles valid QR_SCAN_START from Web and triggers onStartScan handler', async () => {
      const onStartScanMock = jest.fn();
      const onCancelScanMock = jest.fn();

      bridge.setQrScanHandlers({
        onStartScan: onStartScanMock,
        onCancelScan: onCancelScanMock,
      });

      const messagePayload = JSON.stringify({
        version: '1.0',
        id: 'msg_qr_start_1',
        type: 'QR_SCAN_START',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: testSessionTxId,
        seq: 1,
        payload: {
          title: 'Quét Mã Điểm Danh',
          hint: 'Đưa mã QR vào khung ngắm',
        },
      });

      const response = await bridge.handleMessage(messagePayload, validProductionUrl);

      expect(response).not.toBeNull();
      expect(response!.type).toBe('QR_SCAN_START');
      expect(onStartScanMock).toHaveBeenCalledTimes(1);
      expect(onStartScanMock).toHaveBeenCalledWith({
        title: 'Quét Mã Điểm Danh',
        hint: 'Đưa mã QR vào khung ngắm',
      });
      expect(onCancelScanMock).not.toHaveBeenCalled();
    });

    it('A2: handles valid QR_SCAN_CANCEL from Web and triggers onCancelScan handler', async () => {
      const onStartScanMock = jest.fn();
      const onCancelScanMock = jest.fn();

      bridge.setQrScanHandlers({
        onStartScan: onStartScanMock,
        onCancelScan: onCancelScanMock,
      });

      const messagePayload = JSON.stringify({
        version: '1.0',
        id: 'msg_qr_cancel_1',
        type: 'QR_SCAN_CANCEL',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: testSessionTxId,
        seq: 1,
        payload: {
          reason: 'USER_CLOSED_MODAL',
        },
      });

      const response = await bridge.handleMessage(messagePayload, validProductionUrl);

      expect(response).not.toBeNull();
      expect(response!.type).toBe('QR_SCAN_CANCEL');
      expect(onCancelScanMock).toHaveBeenCalledTimes(1);
      expect(onCancelScanMock).toHaveBeenCalledWith({
        reason: 'USER_CLOSED_MODAL',
      });
      expect(onStartScanMock).not.toHaveBeenCalled();
    });

    it('A3: cleans up QR scan handlers gracefully via setQrScanHandlers({})', async () => {
      const onStartScanMock = jest.fn();
      bridge.setQrScanHandlers({ onStartScan: onStartScanMock });
      bridge.setQrScanHandlers({});

      const messagePayload = JSON.stringify({
        version: '1.0',
        id: 'msg_qr_start_cleanup',
        type: 'QR_SCAN_START',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: testSessionTxId,
        seq: 1,
        payload: {},
      });

      await bridge.handleMessage(messagePayload, validProductionUrl);

      expect(onStartScanMock).not.toHaveBeenCalled();
    });
  });

  // ── Group B: Native-to-Web QR Messages ──
  describe('Group B: Native-to-Web QR Messages', () => {
    it('B1: sendQrScanSuccess dispatches QR_SCAN_SUCCESS envelope with session transaction and seq', async () => {
      const sampleQrToken = '12.4.11962500.a3f89e81b2c45d6e7f8a9b0c';

      const envelope = await bridge.sendQrScanSuccess(sampleQrToken);

      expect(envelope.type).toBe('QR_SCAN_SUCCESS');
      expect(envelope.payload.qrToken).toBe(sampleQrToken);
      expect(envelope.payload.scannedAt).toBeGreaterThan(0);
      expect(envelope.sessionId).toBe(testSessionTxId);
      expect(envelope.seq).toBe(1);

      // Verify sent through sendToWeb
      expect(sentResponses.length).toBe(1);
      const dispatched = sentResponses[0] as BridgeEnvelope<QrScanSuccessPayload>;
      expect(dispatched.type).toBe('QR_SCAN_SUCCESS');
      expect(dispatched.payload.qrToken).toBe(sampleQrToken);
      expect(dispatched.sessionId).toBe(testSessionTxId);
      expect(dispatched.seq).toBe(1);
    });

    it('B2: sendQrScanCancel dispatches QR_SCAN_CANCEL envelope to Web', () => {
      const envelope = bridge.sendQrScanCancel('USER_DISMISSED');

      expect(envelope.type).toBe('QR_SCAN_CANCEL');
      expect(envelope.payload.reason).toBe('USER_DISMISSED');

      expect(sentResponses.length).toBe(1);
      const dispatched = sentResponses[0] as BridgeEnvelope<QrScanCancelPayload>;
      expect(dispatched.type).toBe('QR_SCAN_CANCEL');
      expect(dispatched.payload.reason).toBe('USER_DISMISSED');
    });

    it('B3: sendQrScanError dispatches QR_SCAN_ERROR envelope to Web', () => {
      const envelope = bridge.sendQrScanError('CAMERA_UNAVAILABLE', 'Không thể khởi động máy ảnh');

      expect(envelope.type).toBe('QR_SCAN_ERROR');
      expect(envelope.payload.code).toBe('CAMERA_UNAVAILABLE');
      expect(envelope.payload.message).toBe('Không thể khởi động máy ảnh');

      expect(sentResponses.length).toBe(1);
      const dispatched = sentResponses[0] as BridgeEnvelope<QrScanErrorPayload>;
      expect(dispatched.type).toBe('QR_SCAN_ERROR');
      expect(dispatched.payload.code).toBe('CAMERA_UNAVAILABLE');
      expect(dispatched.payload.message).toBe('Không thể khởi động máy ảnh');
    });
  });

  // ── Group C: Security, Anti-Replay, Session Invariants & Fail-Closed Behavior ──
  describe('Group C: Security, Anti-Replay, Session Invariants & Fail-Closed Behavior', () => {
    it('C1: rejects QR_SCAN_START if originating from untrusted origin', async () => {
      const payload = JSON.stringify({
        version: '1.0',
        id: 'msg_malicious_qr',
        type: 'QR_SCAN_START',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: testSessionTxId,
        seq: 1,
        payload: {},
      });

      await expect(bridge.handleMessage(payload, maliciousUrl)).rejects.toThrow(
        InvalidOriginError
      );
    });

    it('C2: rejects QR_SCAN_START if tokenBroker is locked (fail-closed)', async () => {
      tokenBroker.lockBroker();

      const payload = JSON.stringify({
        version: '1.0',
        id: 'msg_locked_broker',
        type: 'QR_SCAN_START',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: testSessionTxId,
        seq: 1,
        payload: {},
      });

      await expect(bridge.handleMessage(payload, validProductionUrl)).rejects.toThrow(
        SessionTerminatedError
      );
    });

    it('C3: rejects sendQrScanSuccess if tokenBroker is locked (fail-closed)', async () => {
      tokenBroker.lockBroker();

      await expect(
        bridge.sendQrScanSuccess('valid.qr.token.hmac')
      ).rejects.toThrow(SessionTerminatedError);
    });

    it('C4: rejects sendQrScanSuccess if no active session transaction in storage', async () => {
      await tokenStorage.clearTokens();

      await expect(
        bridge.sendQrScanSuccess('valid.qr.token.hmac')
      ).rejects.toThrow(SessionTerminatedError);
    });

    it('C5: rejects replayed QR_SCAN_START message with same ID', async () => {
      const payload = JSON.stringify({
        version: '1.0',
        id: 'msg_replay_qr_1',
        type: 'QR_SCAN_START',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: testSessionTxId,
        seq: 1,
        payload: {},
      });

      await bridge.handleMessage(payload, validProductionUrl);

      // Same message ID replayed:
      await expect(bridge.handleMessage(payload, validProductionUrl)).rejects.toThrow(
        ReplayAttackError
      );
    });

    it('C6: rejects QR_SCAN_START with stale epoch', async () => {
      const payload = JSON.stringify({
        version: '1.0',
        id: 'msg_stale_epoch_qr',
        type: 'QR_SCAN_START',
        timestamp: Date.now(),
        epoch: 9999, // Stale!
        sessionId: testSessionTxId,
        seq: 1,
        payload: {},
      });

      await expect(bridge.handleMessage(payload, validProductionUrl)).rejects.toThrow(
        StaleEpochError
      );
    });
  });

  // ── Group D: Zero Credential Leakage Verification ──
  describe('Group D: Zero Credential Leakage Verification', () => {
    it('D1: verifies that sendQrScanSuccess payload and envelope contain NO accessToken or refreshToken', async () => {
      const envelope = await bridge.sendQrScanSuccess('sample_attendance_token');

      const rawJson = JSON.stringify(envelope);

      expect(rawJson).not.toContain(validJwt);
      expect(rawJson).not.toContain(validRefreshToken);
      expect(rawJson).not.toContain('accessToken');
      expect(rawJson).not.toContain('refreshToken');
    });

    it('D2: verifies that QR_SCAN_START and QR_SCAN_CANCEL responses contain NO credential tokens', async () => {
      const startPayload = JSON.stringify({
        version: '1.0',
        id: 'msg_leak_check_1',
        type: 'QR_SCAN_START',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: testSessionTxId,
        seq: 1,
        payload: {},
      });

      const startResp = await bridge.handleMessage(startPayload, validProductionUrl);
      const startJson = JSON.stringify(startResp);
      expect(startJson).not.toContain(validJwt);
      expect(startJson).not.toContain(validRefreshToken);

      const cancelPayload = JSON.stringify({
        version: '1.0',
        id: 'msg_leak_check_2',
        type: 'QR_SCAN_CANCEL',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: testSessionTxId,
        seq: 2,
        payload: {},
      });

      const cancelResp = await bridge.handleMessage(cancelPayload, validProductionUrl);
      const cancelJson = JSON.stringify(cancelResp);
      expect(cancelJson).not.toContain(validJwt);
      expect(cancelJson).not.toContain(validRefreshToken);
    });
  });
});
