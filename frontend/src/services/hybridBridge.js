/**
 * frontend/src/services/hybridBridge.js
 * Web-side Adapter for Secure Native <-> WebView Bridge.
 *
 * Implements TASK 7.1.2 Security Requirements:
 * 1. Headless Token Mode: Never stores Refresh Token in localStorage, sessionStorage, or Cookies.
 * 2. Handshake Protocol: Establishes session binding (epoch, sessionId, challengeId).
 * 3. Token Refresh Delegation: Delegates all 401 refresh requests to Native TokenBroker.
 * 4. Anti-Replay: Appends Native-bound session ID, epoch, and monotonic sequence number.
 * 5. Desktop Backward Compatibility: Pure no-op when running in standalone Web browser.
 */

import { useAuthStore } from '../store/authStore.js';

class WebHybridBridge {
  constructor() {
    this.sessionContext = {
      challengeId: null,
      epoch: null,
      sessionId: null,
      expiresIn: null,
    };
    this.sequenceCounter = 0;
    this.pendingRequests = new Map();
    this.isInitialized = false;

    if (typeof window !== 'undefined') {
      // Expose globally for Native injectJavaScript or direct callback
      window.__EDUPORTAL_HYBRID_BRIDGE__ = this;

      if (this.isHybridEnvironment() && typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem('eduportal_refresh_token');
          localStorage.removeItem('eduportal_token');
          localStorage.removeItem('eduportal_user');
        } catch {}
      }

      // Listen for postMessage from React Native WebView
      window.addEventListener('message', (event) => {
        if (event && event.data) {
          this.handleIncomingMessage(event.data);
        }
      });
      // iOS / WebKit specific postMessage listener
      if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('message', (event) => {
          if (event && event.data) {
            this.handleIncomingMessage(event.data);
          }
        });
      }
    }
  }

  /**
   * Check if running inside React Native WebView.
   */
  isHybridEnvironment() {
    return typeof window !== 'undefined' && Boolean(window.ReactNativeWebView);
  }

  /**
   * Check if Hybrid Bridge has completed Handshake and is actively managing tokens.
   */
  isHybridActive() {
    return this.isHybridEnvironment() && Boolean(this.sessionContext.sessionId);
  }

  /**
   * Post standard BridgeEnvelope v1.0 to Native Shell.
   */
  postToNative(type, payload = {}) {
    if (!this.isHybridEnvironment()) {
      return Promise.reject(new Error('ReactNativeWebView bridge is not available'));
    }

    const messageId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const envelope = {
      version: '1.0',
      id: messageId,
      type,
      timestamp: Date.now(),
      epoch: this.sessionContext.epoch ?? 0,
      sessionId: this.sessionContext.sessionId ?? '',
      seq: ++this.sequenceCounter,
      payload,
    };

    return new Promise((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        if (this.pendingRequests.has(messageId)) {
          this.pendingRequests.delete(messageId);
          reject(new Error(`Bridge request timeout for ${type}`));
        }
      }, 15000); // 15s timeout

      this.pendingRequests.set(messageId, { resolve, reject, timer: timeoutTimer, type });

      try {
        window.ReactNativeWebView.postMessage(JSON.stringify(envelope));
      } catch (err) {
        clearTimeout(timeoutTimer);
        this.pendingRequests.delete(messageId);
        reject(err);
      }
    });
  }

  /**
   * Process message received from Native Shell.
   */
  handleIncomingMessage(rawData) {
    let envelope;
    try {
      envelope = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch {
      return;
    }

    if (!envelope || envelope.version !== '1.0') return;

    // Check if this envelope answers a pending request
    if (envelope.type === 'AUTH_HANDSHAKE_ACK' || envelope.type === 'AUTH_HANDSHAKE_REJECT') {
      const pending = [...this.pendingRequests.values()].find((p) => p.type === 'AUTH_HANDSHAKE_INIT');
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.clear();
        if (envelope.type === 'AUTH_HANDSHAKE_ACK') {
          this.onHandshakeAck(envelope.payload);
          pending.resolve(envelope.payload);
        } else {
          pending.reject(new Error(envelope.payload?.reason || 'Handshake rejected'));
        }
        return;
      }
    }

    if (envelope.type === 'AUTH_REFRESH_SUCCESS' || envelope.type === 'AUTH_REFRESH_FAILURE') {
      const pending = [...this.pendingRequests.values()].find((p) => p.type === 'AUTH_REFRESH_REQUEST');
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.clear();
        if (envelope.type === 'AUTH_REFRESH_SUCCESS') {
          this.onRefreshSuccess(envelope.payload);
          pending.resolve(envelope.payload.accessToken);
        } else {
          pending.reject(new Error(envelope.payload?.reason || 'Refresh failed'));
        }
        return;
      }
    }

    if (envelope.type === 'AUTH_SESSION_INVALIDATED') {
      this.clearSession();
      useAuthStore.getState().logout();
    }
  }

  /**
   * Execute Handshake on mount / reload.
   */
  async initHandshake() {
    if (!this.isHybridEnvironment()) {
      return null;
    }

    try {
      const result = await this.postToNative('AUTH_HANDSHAKE_INIT', {
        clientVersion: '1.0',
        url: window.location.href,
      });
      return result;
    } catch (err) {
      console.warn('HybridBridge: Handshake failed', err);
      return null;
    }
  }

  /**
   * Called when AUTH_HANDSHAKE_ACK is received.
   */
  onHandshakeAck(payload) {
    this.sessionContext = {
      challengeId: payload.challengeId,
      epoch: payload.epoch,
      sessionId: payload.sessionId,
      expiresIn: payload.expiresIn,
    };
    this.sequenceCounter = 0;
    this.isInitialized = true;

    // CRITICAL SECURITY RULE: Ensure localStorage has NO Refresh Token in Hybrid Mode!
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('eduportal_refresh_token');
      localStorage.removeItem('eduportal_token');
    }

    // Set ephemeral in-memory access token & user in store
    const store = useAuthStore.getState();
    if (payload.accessToken) {
      store.setTokens(payload.accessToken, null);
    }
    if (payload.user) {
      store.updateUser(payload.user);
    }
  }

  /**
   * Called when 401 triggers an AUTH_REFRESH_REQUEST.
   */
  async requestTokenRefresh() {
    if (!this.isHybridEnvironment()) {
      throw new Error('Not running in Hybrid environment');
    }

    const newAccessToken = await this.postToNative('AUTH_REFRESH_REQUEST', {
      reason: 'UNAUTHORIZED_401',
      url: window.location.href,
    });
    return newAccessToken;
  }

  onRefreshSuccess(payload) {
    if (payload?.sessionId) {
      this.sessionContext.sessionId = payload.sessionId;
    }
    if (payload?.epoch !== undefined) {
      this.sessionContext.epoch = payload.epoch;
    }
    if (payload?.accessToken) {
      useAuthStore.getState().setTokens(payload.accessToken, null);
    }
  }

  /**
   * Notify Native that user clicked Logout in Web.
   */
  async requestLogout() {
    if (this.isHybridEnvironment()) {
      try {
        await this.postToNative('APP_LOGOUT_REQUEST', {});
      } catch {}
    }
    this.clearSession();
  }

  clearSession() {
    this.sessionContext = {
      challengeId: null,
      epoch: null,
      sessionId: null,
      expiresIn: null,
    };
    this.sequenceCounter = 0;
    this.isInitialized = false;

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('eduportal_refresh_token');
      localStorage.removeItem('eduportal_token');
    }
  }
}

export const hybridBridge = new WebHybridBridge();
export default hybridBridge;
