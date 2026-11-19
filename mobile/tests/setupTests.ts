/**
 * Jest Global Test Setup & Native Mocks
 */

// Mock SecureStore
jest.mock('expo-secure-store', () => {
  let store: Record<string, string> = {};
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    getItemAsync: jest.fn(async (key: string) => {
      return store[key] ?? null;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    __resetStore: () => {
      store = {};
    },
  };
});

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => {
  let isConnected = true;
  let isInternetReachable = true;
  const listeners: Array<(state: any) => void> = [];

  return {
    addEventListener: jest.fn((listener: (state: any) => void) => {
      listeners.push(listener);
      listener({
        isConnected,
        isInternetReachable,
        type: 'wifi',
        details: null,
      });
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    }),
    fetch: jest.fn(async () => ({
      isConnected,
      isInternetReachable,
      type: isConnected ? 'wifi' : 'none',
      details: null,
    })),
    __setConnected: (connected: boolean, reachable: boolean = true) => {
      isConnected = connected;
      isInternetReachable = connected ? reachable : false;
      listeners.forEach((l) =>
        l({
          isConnected,
          isInternetReachable,
          type: connected ? 'wifi' : 'none',
          details: null,
        })
      );
    },
  };
});

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
    NONE: 0,
  },
  getPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  requestPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  getExpoPushTokenAsync: jest.fn(async () => ({
    data: 'ExponentPushToken[mock-token-12345]',
  })),
  getDevicePushTokenAsync: jest.fn(async () => ({
    type: 'fcm',
    data: 'mock-fcm-device-token-12345',
  })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    getItem: jest.fn(async (key: string) => {
      return store[key] ?? null;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => delete store[k]);
    }),
    multiGet: jest.fn(async (keys: string[]) => {
      return keys.map((k) => [k, store[k] ?? null]);
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
    __resetStore: () => {
      store = {};
    },
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  }),
  usePathname: () => '/',
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  Link: (props: any) => props.children,
  Redirect: (props: any) => null,
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => null,
  MaterialIcons: (props: any) => null,
  FontAwesome: (props: any) => null,
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'opened' }),
  dismissBrowser: jest.fn(),
}));

// Mock react-native-webview
let mockLastWebViewProps: any = null;
let mockLastWebViewInstance: any = null;

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  class MockWebView extends React.Component {
    postMessage = jest.fn();
    injectJavaScript = jest.fn();
    reload = jest.fn();
    goBack = jest.fn();
    constructor(props: any) {
      super(props);
      mockLastWebViewInstance = this;
      mockLastWebViewProps = props;
    }
    render() {
      mockLastWebViewInstance = this;
      mockLastWebViewProps = this.props;
      return React.createElement(View, { ...this.props, testID: 'mock-webview' });
    }
  }
  return {
    WebView: MockWebView,
    default: MockWebView,
    __getLastWebViewProps: () => mockLastWebViewProps,
    __getLastWebViewInstance: () => mockLastWebViewInstance,
    __resetMockWebView: () => {
      mockLastWebViewProps = null;
      mockLastWebViewInstance = null;
    },
  };
});

// Mock expo-camera
let mockCameraPermission = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
};
let mockLastCameraProps: any = null;

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  const CameraView = React.forwardRef((props: any, ref: any) => {
    mockLastCameraProps = props;
    return React.createElement(View, { ...props, testID: props.testID || 'mock-camera-view' });
  });

  return {
    CameraView,
    useCameraPermissions: jest.fn(() => [
      mockCameraPermission,
      jest.fn().mockImplementation(async () => mockCameraPermission),
      jest.fn().mockImplementation(async () => mockCameraPermission),
    ]),
    Camera: {
      requestCameraPermissionsAsync: jest.fn(async () => mockCameraPermission),
      getCameraPermissionsAsync: jest.fn(async () => mockCameraPermission),
    },
    PermissionStatus: {
      GRANTED: 'granted',
      UNDETERMINED: 'undetermined',
      DENIED: 'denied',
    },
    __setMockCameraPermission: (perm: any) => {
      mockCameraPermission = perm;
    },
    __getLastCameraProps: () => mockLastCameraProps,
    __resetMockCamera: () => {
      mockCameraPermission = {
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      };
      mockLastCameraProps = null;
    },
  };
});
