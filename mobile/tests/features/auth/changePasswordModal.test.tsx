/**
 * ChangePasswordModal Unit Tests (REDS v2.0)
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');

import { ChangePasswordModal } from '@/features/auth';

const mockUpdateProfile = jest.fn();
let mockIsUpdating = false;

jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: () => ({
    updateProfile: mockUpdateProfile,
    isUpdating: mockIsUpdating,
  }),
}));

describe('ChangePasswordModal REDS v2.0', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsUpdating = false;
  });

  it('returns null when visible is false', () => {
    const html = renderToStaticMarkup(
      <ChangePasswordModal visible={false} onClose={() => {}} />
    );
    expect(html).toBe('');
  });

  it('renders title, password inputs and action buttons when visible is true', () => {
    const html = renderToStaticMarkup(
      <ChangePasswordModal visible={true} onClose={() => {}} />
    );
    expect(html).toContain('Đổi mật khẩu');
    expect(html).toContain('Mật khẩu hiện tại');
    expect(html).toContain('Mật khẩu mới');
    expect(html).toContain('Xác nhận mật khẩu mới');
    expect(html).toContain('Cập nhật mật khẩu');
    expect(html).toContain('Hủy bỏ');
  });

  it('renders testIDs for automated QA verification', () => {
    const html = renderToStaticMarkup(
      <ChangePasswordModal visible={true} onClose={() => {}} testID="pwd-modal" />
    );
    expect(html).toContain('testID="pwd-modal"');
    expect(html).toContain('testID="pwd-modal-old-password"');
    expect(html).toContain('testID="pwd-modal-new-password"');
    expect(html).toContain('testID="pwd-modal-confirm-password"');
    expect(html).toContain('testID="pwd-modal-submit-button"');
    expect(html).toContain('testID="pwd-modal-cancel-button"');
  });
});
