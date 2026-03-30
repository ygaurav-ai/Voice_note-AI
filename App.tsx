/**
 * App.tsx
 *
 * Root component — wraps the entire app in required providers.
 *
 * Provider order matters:
 *   1. GestureHandlerRootView — must be the outermost wrapper for
 *      react-native-gesture-handler to work correctly. This powers
 *      the swipe gestures on cards and the bottom sheet dismissal.
 *
 *   2. SafeAreaProvider — provides safe area insets (notch, home indicator)
 *      to all child components via useSafeAreaInsets().
 *
 *   3. NavigationContainer — owns the navigation state tree. Every
 *      navigator (tabs, stacks) must be a descendant of this.
 *
 *   4. AppNavigator — the actual tab + stack navigator defined in app/index.tsx.
 *
 * Note: StatusBar is configured here so it applies globally regardless of
 * which screen is active.
 *
 * DEBUG TIP: If gestures don't work anywhere in the app, check that
 * GestureHandlerRootView has flex: 1. Without it, the touch area collapses.
 */

// IMPORTANT: react-native-gesture-handler must be imported before any
// navigator import. This registers the gesture recogniser at startup.
import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import AppNavigator from './app/index';
import { background } from './constants/colors';
import { requestNotificationPermissions } from './utils/notifications';

export default function App() {
  // Request notification permissions on first launch.
  // iOS shows the system prompt only once — safe to call on every mount.
  // Android pre-API 33 grants automatically; API 33+ prompts like iOS.
  useEffect(() => {
    requestNotificationPermissions();
    // DEBUG: console.debug('[App] notification permission requested');
  }, []);

  return (
    // GestureHandlerRootView must wrap everything — flex: 1 is mandatory
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/*
          NavigationContainer manages the navigation state.
          theme could be passed here in a future phase to support dark mode.
        */}
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>

        {/*
          StatusBar style="dark" because the app background is warm off-white.
          On iOS this sets the status bar text to dark (black clock/battery).
        */}
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: background.primary,
  },
});
