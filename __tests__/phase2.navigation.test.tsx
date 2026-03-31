/**
 * __tests__/phase2.navigation.test.tsx
 *
 * Phase 2 — Navigation shell tests.
 *
 * What is tested:
 *   1. Navigation type definitions — route names are correct
 *   2. Icon components — render without throwing (active + inactive states)
 *   3. Placeholder screens — each screen renders its testID element
 *   4. BottomNav — renders correct number of tab items with correct testIDs
 *   5. Tab navigation — pressing a tab shows the correct screen
 *   6. Full navigator — App renders without crashing (smoke test)
 *
 * Mocked modules:
 *   - react-native-mmkv (no native binary in Jest env)
 *   - expo-blur (BlurView requires native renderer)
 *   - expo-notifications (requires native permissions API)
 *   - react-native-gesture-handler mock registered in jest.setup.js
 *
 * DEBUG TIP: If a test fails with "invariant violation: navigator is not mounted",
 * wrap the component under test in the withProviders() helper below.
 * If GestureHandlerRootView throws, check that jest.setup.js is listed in
 * jest.setupFiles in package.json.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that use them
// ---------------------------------------------------------------------------

// Mock MMKV — no native binary in Jest
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn().mockReturnValue({
    set: jest.fn(),
    getString: jest.fn().mockReturnValue(undefined),
    remove: jest.fn(),
  }),
}));

// Mock expo-speech-recognition — required by useVoiceRecorder (Phase 7) which is
// now imported by all three screens; no native binary in Jest.
jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: jest.fn().mockResolvedValue(undefined),
    stop:  jest.fn(),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

// Mock expo-blur — BlurView is a native view that can't render in Jest
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: ({ children, style }: any) => <View style={style}>{children}</View>,
  };
});

// Mock expo-notifications — requires native permissions API
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

/**
 * Mock react-native-safe-area-context.
 *
 * WHY: SafeAreaProvider internally renders RNCSafeAreaProvider — a native
 * view. In the Jest test renderer there is no native runtime, so the native
 * component is rendered as a leaf node with no children. This means
 * NavigationContainer and all of its screen children disappear from the
 * test tree, making all getByTestId queries fail.
 *
 * FIX: Replace SafeAreaProvider with a passthrough that simply renders
 * its children, and provide static insets so useSafeAreaInsets() returns
 * real values (rather than undefined) in components like BottomNav.
 */
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  const React = require('react');
  const insets = { top: 44, right: 0, bottom: 34, left: 0 };
  // React Navigation uses SafeAreaInsetsContext.Consumer internally.
  // We must provide a real React context so .Consumer is defined.
  const SafeAreaInsetsContext = React.createContext(insets);
  return {
    SafeAreaProvider: ({ children }: any) =>
      React.createElement(SafeAreaInsetsContext.Provider, { value: insets }, children),
    SafeAreaView: ({ children, style }: any) =>
      React.createElement(View, { style }, children),
    // The context itself — needed by @react-navigation/bottom-tabs
    SafeAreaInsetsContext,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets,
    },
  };
});

/**
 * Mock react-native-reanimated.
 *
 * WHY: Phase 4 introduced TodoItem which uses Reanimated for the opacity
 * fade animation. Since app/index.tsx → app/todo.tsx → TodoItem.tsx all
 * import reanimated, the Phase 2 navigation smoke test now needs this mock
 * to prevent native worklet initialisation errors in Jest.
 *
 * __esModule: true is required so Babel's _interopRequireDefault does not
 * double-wrap the module.
 */
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const AnimatedView = (props: any) => React.createElement(View, props);
  return {
    __esModule: true,
    default: { View: AnimatedView, createAnimatedComponent: (c: any) => c },
    // createAnimatedComponent is used by react-native-gesture-handler's GestureDetector.
    // Return the component unchanged so gesture-handler can import without errors.
    createAnimatedComponent: (c: any) => c,
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: (_fn: () => any) => ({}),
    withTiming: (value: any) => value,
    withSpring: (value: any) => value,
    // Phase 7: RecordButton uses these additional Reanimated APIs
    withRepeat: (value: any) => value,
    withSequence: (...args: any[]) => args[args.length - 1],
    cancelAnimation: jest.fn(),
    runOnJS: (fn: any) => fn,
    Easing: { inOut: (e: any) => e, ease: 0, linear: 0 },
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks are declared)
// ---------------------------------------------------------------------------

import { HomeIcon } from '../components/icons/HomeIcon';
import { NotesIcon } from '../components/icons/NotesIcon';
import { TodoIcon } from '../components/icons/TodoIcon';
import AppNavigator from '../app/index';
import App from '../App';

// ---------------------------------------------------------------------------
// Helper: wrap a component with all required navigation providers
// ---------------------------------------------------------------------------
function withProviders(component: React.ReactElement) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>{component}</NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ---------------------------------------------------------------------------
// 1. Navigation type definitions (compile-time check)
// ---------------------------------------------------------------------------

describe('Navigation type definitions', () => {
  it('app/index.tsx exports a default component', () => {
    // If the import above compiled without errors, navigation types are correct.
    expect(typeof AppNavigator).toBe('function');
  });

  it('RootTabParamList has 3 routes: Home, Notes, Todo', () => {
    // Render the navigator and verify all three tab testIDs are present
    render(withProviders(<AppNavigator />));
    expect(screen.getByTestId('tab-home')).toBeTruthy();
    expect(screen.getByTestId('tab-notes')).toBeTruthy();
    expect(screen.getByTestId('tab-todo')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. SVG Icon components
// ---------------------------------------------------------------------------

describe('HomeIcon', () => {
  it('renders without throwing with active amber colour', () => {
    expect(() => render(<HomeIcon color="#F0B429" size={24} />)).not.toThrow();
  });

  it('renders without throwing with inactive muted colour', () => {
    expect(() => render(<HomeIcon color="#9E9488" size={24} />)).not.toThrow();
  });

  it('renders at custom sizes without throwing', () => {
    expect(() => render(<HomeIcon color="#F0B429" size={20} />)).not.toThrow();
    expect(() => render(<HomeIcon color="#F0B429" size={32} />)).not.toThrow();
  });

  it('renders with default size 24 when size prop is omitted', () => {
    expect(() => render(<HomeIcon color="#F0B429" />)).not.toThrow();
  });
});

describe('NotesIcon', () => {
  it('renders without throwing with active colour', () => {
    expect(() => render(<NotesIcon color="#F0B429" size={24} />)).not.toThrow();
  });

  it('renders without throwing with inactive colour', () => {
    expect(() => render(<NotesIcon color="#9E9488" size={24} />)).not.toThrow();
  });

  it('renders at custom sizes without throwing', () => {
    expect(() => render(<NotesIcon color="#F0B429" size={20} />)).not.toThrow();
    expect(() => render(<NotesIcon color="#F0B429" size={28} />)).not.toThrow();
  });

  it('renders with default size 24 when size prop is omitted', () => {
    expect(() => render(<NotesIcon color="#F0B429" />)).not.toThrow();
  });
});

describe('TodoIcon', () => {
  it('renders without throwing with active colour', () => {
    expect(() => render(<TodoIcon color="#F0B429" size={24} />)).not.toThrow();
  });

  it('renders without throwing with inactive colour', () => {
    expect(() => render(<TodoIcon color="#9E9488" size={24} />)).not.toThrow();
  });

  it('renders at custom sizes without throwing', () => {
    expect(() => render(<TodoIcon color="#F0B429" size={20} />)).not.toThrow();
    expect(() => render(<TodoIcon color="#F0B429" size={32} />)).not.toThrow();
  });

  it('renders with default size 24 when size prop is omitted', () => {
    expect(() => render(<TodoIcon color="#F0B429" />)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. Screen presence checks
//
// NOTE: The placeholder screens from Phase 2 have been replaced by the full
// Phase 3 implementations.  We verify the real screens render correctly
// by checking their canonical testIDs instead of the old placeholder ones.
// ---------------------------------------------------------------------------

describe('HomeScreen (Phase 3 implementation)', () => {
  it('renders the home FAB on the Home tab', () => {
    render(withProviders(<AppNavigator />));
    // home-fab is always present on the redesigned HomeScreen (Phase 6 layout)
    expect(screen.getByTestId('home-fab')).toBeTruthy();
  });

  it('renders the Home FAB on the Home tab', () => {
    render(withProviders(<AppNavigator />));
    expect(screen.getByTestId('home-fab')).toBeTruthy();
  });
});

describe('NotesScreen (Phase 3 implementation)', () => {
  it('renders notes-search-input when Notes tab is pressed', () => {
    render(withProviders(<AppNavigator />));
    fireEvent.press(screen.getByTestId('tab-notes'));
    expect(screen.getByTestId('notes-search-input')).toBeTruthy();
  });

  it('renders notes-grid when Notes tab is pressed', () => {
    render(withProviders(<AppNavigator />));
    fireEvent.press(screen.getByTestId('tab-notes'));
    expect(screen.getByTestId('notes-grid')).toBeTruthy();
  });
});

describe('TodoScreen placeholder', () => {
  it('renders todo-screen-title when Todo tab is pressed', () => {
    render(withProviders(<AppNavigator />));
    fireEvent.press(screen.getByTestId('tab-todo'));
    expect(screen.getByTestId('todo-screen-title')).toBeTruthy();
  });

  it('displays "Todo" as the title text', () => {
    render(withProviders(<AppNavigator />));
    fireEvent.press(screen.getByTestId('tab-todo'));
    expect(screen.getByTestId('todo-screen-title').props.children).toBe('Todo');
  });
});

// ---------------------------------------------------------------------------
// 4. BottomNav
// ---------------------------------------------------------------------------

describe('BottomNav', () => {
  it('renders the bottom-nav container', () => {
    render(withProviders(<AppNavigator />));
    expect(screen.getByTestId('bottom-nav')).toBeTruthy();
  });

  it('renders exactly 3 tab items (Home, Notes, Todo)', () => {
    render(withProviders(<AppNavigator />));
    expect(screen.getByTestId('tab-home')).toBeTruthy();
    expect(screen.getByTestId('tab-notes')).toBeTruthy();
    expect(screen.getByTestId('tab-todo')).toBeTruthy();
  });

  it('Home tab is selected by default (accessibilityState.selected = true)', () => {
    render(withProviders(<AppNavigator />));
    expect(screen.getByTestId('tab-home').props.accessibilityState).toEqual({ selected: true });
  });

  it('Notes and Todo tabs are not selected by default', () => {
    render(withProviders(<AppNavigator />));
    expect(screen.getByTestId('tab-notes').props.accessibilityState).toEqual({});
    expect(screen.getByTestId('tab-todo').props.accessibilityState).toEqual({});
  });

  it('Notes tab becomes selected after pressing it', () => {
    render(withProviders(<AppNavigator />));
    fireEvent.press(screen.getByTestId('tab-notes'));
    expect(screen.getByTestId('tab-notes').props.accessibilityState).toEqual({ selected: true });
  });

  it('Home tab loses selection after pressing Notes tab', () => {
    render(withProviders(<AppNavigator />));
    fireEvent.press(screen.getByTestId('tab-notes'));
    expect(screen.getByTestId('tab-home').props.accessibilityState).toEqual({});
  });

  it('Todo tab becomes selected after pressing it', () => {
    render(withProviders(<AppNavigator />));
    fireEvent.press(screen.getByTestId('tab-todo'));
    expect(screen.getByTestId('tab-todo').props.accessibilityState).toEqual({ selected: true });
  });

  it('each tab has a correct accessibilityLabel', () => {
    render(withProviders(<AppNavigator />));
    expect(screen.getByTestId('tab-home').props.accessibilityLabel).toBe('Home');
    expect(screen.getByTestId('tab-notes').props.accessibilityLabel).toBe('Notes');
    expect(screen.getByTestId('tab-todo').props.accessibilityLabel).toBe('Todo');
  });

  it('each tab has accessibilityRole="button"', () => {
    render(withProviders(<AppNavigator />));
    expect(screen.getByTestId('tab-home').props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('tab-notes').props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('tab-todo').props.accessibilityRole).toBe('button');
  });
});

// ---------------------------------------------------------------------------
// 5. Tab switching — navigation flows
// ---------------------------------------------------------------------------

describe('Tab navigation flow', () => {
  it('pressing Home → Notes → Todo navigates to each screen', () => {
    render(withProviders(<AppNavigator />));

    // Start on Home (default) — verify with home-specific element
    expect(screen.getByTestId('home-fab')).toBeTruthy();

    // Navigate to Notes — verify with notes-specific element
    fireEvent.press(screen.getByTestId('tab-notes'));
    expect(screen.getByTestId('notes-search-input')).toBeTruthy();

    // Navigate to Todo — still a placeholder screen
    fireEvent.press(screen.getByTestId('tab-todo'));
    expect(screen.getByTestId('todo-screen-title')).toBeTruthy();
  });

  it('pressing a tab twice does not crash', () => {
    render(withProviders(<AppNavigator />));
    expect(() => {
      fireEvent.press(screen.getByTestId('tab-home'));
      fireEvent.press(screen.getByTestId('tab-home'));
    }).not.toThrow();
  });

  it('switching from Todo back to Home shows Home screen', () => {
    render(withProviders(<AppNavigator />));
    fireEvent.press(screen.getByTestId('tab-todo'));
    fireEvent.press(screen.getByTestId('tab-home'));
    expect(screen.getByTestId('home-fab')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 6. Full App smoke test
// ---------------------------------------------------------------------------

describe('App — full render smoke test', () => {
  it('renders the full App without throwing', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('renders the bottom nav bar', () => {
    render(<App />);
    expect(screen.getByTestId('bottom-nav')).toBeTruthy();
  });

  it('renders the Home screen on launch', () => {
    render(<App />);
    // home-fab is always rendered on the redesigned HomeScreen (Phase 6 layout)
    expect(screen.getByTestId('home-fab')).toBeTruthy();
  });

  it('all three tab buttons are present in the full App', () => {
    render(<App />);
    expect(screen.getByTestId('tab-home')).toBeTruthy();
    expect(screen.getByTestId('tab-notes')).toBeTruthy();
    expect(screen.getByTestId('tab-todo')).toBeTruthy();
  });
});

// Clear all pending timers after the full suite completes.
// React Navigation's stack card animations schedule setTimeout callbacks that
// can fire after Jest tears down the environment, causing a Node process crash
// with "Cannot read properties of undefined (reading 'spring')".
afterAll(() => {
  jest.clearAllTimers();
});
