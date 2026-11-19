/**
 * Login Redesign Component Unit Tests (REDS v2.0)
 * Uses react-dom/server renderToStaticMarkup for deterministic markup verification.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');

import LoginScreen from '@/app/(auth)/login';

// Mock useLogin
const mockHandleSubmitLogin = jest.fn();
const mockClearError = jest.fn();
let mockIsLoading = false;
let mockErrorMessage: string | null = null;

jest.mock('@/features/auth', () => ({
  useLogin: () => ({
    isLoading: mockIsLoading,
    errorMessage: mockErrorMessage,
    clearError: mockClearError,
    handleSubmitLogin: mockHandleSubmitLogin,
  }),
}));

describe('LoginScreen REDS v2.0 Redesign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoading = false;
    mockErrorMessage = null;
  });

  it('renders brand institutional header and Burgundy theme elements', () => {
    const html = renderToStaticMarkup(<LoginScreen />);
    expect(html).toContain('RIKKEI EDUPORTAL');
    expect(html).toContain('Cổng Thông Tin Đào Tạo');
    expect(html).toContain('Hệ thống phục vụ Sinh viên');
  });

  it('renders form inputs for username and password with labels and testIDs', () => {
    const html = renderToStaticMarkup(<LoginScreen />);
    expect(html).toContain('Tên đăng nhập / Mã SV / Mã GV / Email');
    expect(html).toContain('testID="username-input"');
    expect(html).toContain('Mật khẩu');
    expect(html).toContain('testID="password-input"');
    expect(html).toContain('testID="login-button"');
  });

  it('does not render demo account chips and initializes with clean inputs', () => {
    const html = renderToStaticMarkup(<LoginScreen />);
    expect(html).not.toContain('Tài khoản mẫu thử nghiệm:');
    expect(html).not.toContain('🎓 SV (sv2024001)');
    expect(html).not.toContain('👨‍🏫 GV (gv001)');
    expect(html).not.toContain('🛡️ Admin');
  });

  it('renders error alert banner when error message is returned from hook', () => {
    mockErrorMessage = 'Tài khoản hoặc mật khẩu không chính xác';
    const html = renderToStaticMarkup(<LoginScreen />);
    expect(html).toContain('testID="login-error-banner"');
    expect(html).toContain('Tài khoản hoặc mật khẩu không chính xác');
  });

  it('renders submit button with accessible label', () => {
    const html = renderToStaticMarkup(<LoginScreen />);
    expect(html).toContain('Đăng nhập');
  });
});
