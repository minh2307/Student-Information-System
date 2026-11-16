/**
 * ConnectedOfflineBanner Unit Tests (REDS v2.0)
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');

import { ConnectedOfflineBanner } from '@/features/offline';

let mockIsOffline = false;
let mockLastOnlineAt: string | null = null;
const mockCheckConnectivity = jest.fn();

jest.mock('@/features/offline/OfflineContext', () => ({
  useOffline: () => ({
    isConnected: !mockIsOffline,
    isInternetReachable: !mockIsOffline,
    isOffline: mockIsOffline,
    type: 'wifi',
    lastOnlineAt: mockLastOnlineAt,
    checkConnectivity: mockCheckConnectivity,
  }),
}));

describe('ConnectedOfflineBanner REDS v2.0', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOffline = false;
    mockLastOnlineAt = null;
  });

  it('renders null when isOffline is false (online)', () => {
    mockIsOffline = false;
    const html = renderToStaticMarkup(<ConnectedOfflineBanner />);
    expect(html).toBe('');
  });

  it('renders offline warning banner when isOffline is true', () => {
    mockIsOffline = true;
    mockLastOnlineAt = '2026-11-12T10:30:00.000Z';
    const html = renderToStaticMarkup(
      <ConnectedOfflineBanner message="Đang xem dữ liệu ngoại tuyến" />
    );
    expect(html).toContain('Đang xem dữ liệu ngoại tuyến');
  });
});
