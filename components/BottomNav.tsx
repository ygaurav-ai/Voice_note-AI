/**
 * components/BottomNav.tsx
 *
 * Custom bottom navigation bar for the Thoughts app.
 *
 * Replaces React Navigation's default tab bar with a premium glass surface:
 *   - Frosted glass via expo-blur (BlurView) on iOS
 *   - Semi-transparent solid fallback on Android < API 31
 *   - Thin white top border
 *   - Active amber indicator bar above the active tab icon
 *   - Custom SVG icons (active = amber, inactive = muted grey)
 *   - Tab label below each icon
 *   - Respects safe area bottom inset (home indicator on iOS)
 *
 * This component is passed to the `tabBar` prop of createBottomTabNavigator
 * in app/index.tsx. React Navigation calls it with state, descriptors,
 * and navigation props.
 *
 * DEBUG TIP: If the blur doesn't appear on Android, check the device API
 * level. API < 31 will always use the solid fallback. Inspect with:
 *   import { Platform } from 'react-native';
 *   console.log(Platform.OS, Platform.Version);
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { HomeIcon } from './icons/HomeIcon';
import { NotesIcon } from './icons/NotesIcon';
import { TodoIcon } from './icons/TodoIcon';
import { accent, chrome, glass } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';
import { fontSize, fontWeight } from '../constants/typography';

// ---------------------------------------------------------------------------
// Icon map — maps route name → icon component
// Add new tab icons here when the navigator grows.
// ---------------------------------------------------------------------------
type IconProps = { color: string; size: number };

const ROUTE_ICONS: Record<string, (props: IconProps) => React.ReactElement> = {
  Home: ({ color, size }) => <HomeIcon color={color} size={size} />,
  Notes: ({ color, size }) => <NotesIcon color={color} size={size} />,
  Todo: ({ color, size }) => <TodoIcon color={color} size={size} />,
};

// ---------------------------------------------------------------------------
// Label map — human-readable labels for each route
// ---------------------------------------------------------------------------
const ROUTE_LABELS: Record<string, string> = {
  Home: 'Home',
  Notes: 'Notes',
  Todo: 'Todo',
};

// ---------------------------------------------------------------------------
// BottomNav component
// ---------------------------------------------------------------------------

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  // Safe area inset — adds padding below the tab bar for iPhone home indicator
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="bottom-nav"
      style={[
        styles.wrapper,
        {
          // Add safe-area bottom inset so the nav bar clears the home indicator
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
    >
      {/*
        Background blur layer.
        On iOS: BlurView renders the native frosted-glass effect.
        On Android API 31+: BlurView uses RenderEffect.
        On older Android: falls back gracefully to the solid style.
        StyleSheet.absoluteFill makes it cover the entire wrapper.
      */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={80}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        // Android fallback — semi-transparent warm surface
        <View style={[StyleSheet.absoluteFill, styles.androidFallback]} />
      )}

      {/* Thin white top border — gives the glass card its rim */}
      <View style={styles.topBorder} />

      {/* Tab item row */}
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const iconColor = isFocused ? accent.primary : chrome.tabInactive;
          const labelColor = isFocused ? accent.primary : chrome.tabInactive;

          // Get the icon renderer for this route, fall back to null if missing
          const renderIcon = ROUTE_ICONS[route.name];
          const label = ROUTE_LABELS[route.name] ?? route.name;

          const onPress = () => {
            // Emit the tabPress event — this is the standard React Navigation pattern
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            // Navigate only if not already focused and event wasn't prevented
            if (!isFocused && !event.defaultPrevented) {
              // `navigate` with merge: true preserves the nested stack state
              navigation.navigate(route.name, { merge: true });
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              testID={`tab-${route.name.toLowerCase()}`}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {/*
                Active amber indicator bar — narrow pill that sits at the
                very top of each tab item, visible only on the active tab.
                Animating this to slide between tabs is a Phase 6 task.
              */}
              <View style={[styles.activeBar, isFocused && styles.activeBarVisible]} />

              {/* Tab icon — amber when active, muted when inactive */}
              <View style={styles.iconContainer}>
                {renderIcon ? renderIcon({ color: iconColor, size: 24 }) : null}
              </View>

              {/* Tab label */}
              <Text
                style={[
                  styles.label,
                  { color: labelColor },
                  isFocused && styles.labelActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  /**
   * Wrapper — the outer container for the entire nav bar.
   * overflow: hidden clips the BlurView to the wrapper bounds.
   */
  wrapper: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  /**
   * Android fallback background — shown when BlurView is not used.
   */
  androidFallback: {
    backgroundColor: glass.fallback,
  },

  /**
   * Thin top border — gives the glass surface a subtle rim.
   * Height 1 pixel using StyleSheet.hairlineWidth for sharpness on all densities.
   */
  topBorder: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: chrome.navBorder,
  },

  /**
   * Tab item row — lays out the three tab items horizontally.
   */
  tabRow: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
  },

  /**
   * Individual tab item — takes equal share of available width.
   * Centred content (icon + label stacked vertically).
   */
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },

  /**
   * Amber indicator bar — sits above the icon.
   * Invisible by default; made visible via activeBarVisible when tab is focused.
   */
  activeBar: {
    width: 28,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: 'transparent',
    marginBottom: spacing.xs,
  },

  /** Visible state of the active bar — amber fill */
  activeBarVisible: {
    backgroundColor: accent.primary,
  },

  /** Icon wrapper — gives consistent hit target around the icon */
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /** Base label style */
  label: {
    fontSize: fontSize.navLabel,
    fontWeight: fontWeight.medium,
    marginTop: 2,
    letterSpacing: 0.3,
  },

  /** Extra weight for the active label */
  labelActive: {
    fontWeight: fontWeight.semibold,
  },
});
