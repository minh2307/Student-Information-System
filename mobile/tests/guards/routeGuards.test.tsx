import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { AuthGuard, StudentGuard, LecturerGuard } from '@/guards';

// Configurable mock auth state
let mockAuthState = {
  isInitializing: false,
  isAuthenticated: false,
  role: null as 'STUDENT' | 'LECTURER' | 'ADMIN' | null,
};

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn((selector: any) => selector(mockAuthState)),
}));

// Mock expo-router Redirect and LoadingScreen
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: (props: any) => {
    mockRedirect(props);
    return <span data-testid="redirect" data-href={props.href} />;
  },
}));

const mockLoadingScreen = jest.fn();
jest.mock('@/components/common/LoadingScreen', () => ({
  LoadingScreen: (props: any) => {
    mockLoadingScreen(props);
    return <span data-testid="loading" />;
  },
}));

describe('Role-Based Route Guards', () => {
  const TestChild = () => <div data-testid="child">Authorized Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      isInitializing: false,
      isAuthenticated: false,
      role: null,
    };
  });

  describe('AuthGuard', () => {
    it('renders LoadingScreen while initializing to prevent flash', () => {
      mockAuthState.isInitializing = true;
      const html = renderToStaticMarkup(
        <AuthGuard>
          <TestChild />
        </AuthGuard>
      );
      expect(mockLoadingScreen).toHaveBeenCalled();
      expect(html).toContain('data-testid="loading"');
      expect(html).not.toContain('Authorized Content');
    });

    it('redirects unauthenticated users to (auth)/login', () => {
      mockAuthState.isInitializing = false;
      mockAuthState.isAuthenticated = false;
      const html = renderToStaticMarkup(
        <AuthGuard>
          <TestChild />
        </AuthGuard>
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ href: '/(auth)/login' })
      );
      expect(html).toContain('data-href="/(auth)/login"');
      expect(html).not.toContain('Authorized Content');
    });

    it('allows authenticated users to view content', () => {
      mockAuthState.isInitializing = false;
      mockAuthState.isAuthenticated = true;
      const html = renderToStaticMarkup(
        <AuthGuard>
          <TestChild />
        </AuthGuard>
      );
      expect(html).toContain('Authorized Content');
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe('StudentGuard', () => {
    it('redirects unauthenticated users to (auth)/login', () => {
      mockAuthState.isInitializing = false;
      mockAuthState.isAuthenticated = false;
      renderToStaticMarkup(
        <StudentGuard>
          <TestChild />
        </StudentGuard>
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ href: '/(auth)/login' })
      );
    });

    it('allows users with STUDENT role to view content', () => {
      mockAuthState.isInitializing = false;
      mockAuthState.isAuthenticated = true;
      mockAuthState.role = 'STUDENT';
      const html = renderToStaticMarkup(
        <StudentGuard>
          <TestChild />
        </StudentGuard>
      );
      expect(html).toContain('Authorized Content');
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('redirects LECTURER trying to access student route to (lecturer)/dashboard', () => {
      mockAuthState.isInitializing = false;
      mockAuthState.isAuthenticated = true;
      mockAuthState.role = 'LECTURER';
      renderToStaticMarkup(
        <StudentGuard>
          <TestChild />
        </StudentGuard>
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ href: '/(lecturer)/dashboard' })
      );
    });

    it('redirects ADMIN trying to access student route to /unauthorized', () => {
      mockAuthState.isInitializing = false;
      mockAuthState.isAuthenticated = true;
      mockAuthState.role = 'ADMIN';
      renderToStaticMarkup(
        <StudentGuard>
          <TestChild />
        </StudentGuard>
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ href: '/unauthorized' })
      );
    });
  });

  describe('LecturerGuard', () => {
    it('redirects unauthenticated users to (auth)/login', () => {
      mockAuthState.isInitializing = false;
      mockAuthState.isAuthenticated = false;
      renderToStaticMarkup(
        <LecturerGuard>
          <TestChild />
        </LecturerGuard>
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ href: '/(auth)/login' })
      );
    });

    it('allows users with LECTURER role to view content', () => {
      mockAuthState.isInitializing = false;
      mockAuthState.isAuthenticated = true;
      mockAuthState.role = 'LECTURER';
      const html = renderToStaticMarkup(
        <LecturerGuard>
          <TestChild />
        </LecturerGuard>
      );
      expect(html).toContain('Authorized Content');
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('redirects STUDENT trying to access lecturer route to (student)/dashboard', () => {
      mockAuthState.isInitializing = false;
      mockAuthState.isAuthenticated = true;
      mockAuthState.role = 'STUDENT';
      renderToStaticMarkup(
        <LecturerGuard>
          <TestChild />
        </LecturerGuard>
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ href: '/(student)/dashboard' })
      );
    });

    it('redirects ADMIN trying to access lecturer route to /unauthorized', () => {
      mockAuthState.isInitializing = false;
      mockAuthState.isAuthenticated = true;
      mockAuthState.role = 'ADMIN';
      renderToStaticMarkup(
        <LecturerGuard>
          <TestChild />
        </LecturerGuard>
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ href: '/unauthorized' })
      );
    });
  });
});
