/**
 * app/index.tsx
 *
 * Root navigator — entry point for all in-app screens.
 *
 * Structure:
 *   createBottomTabNavigator (RootTabParamList)
 *   ├── Home tab  → createStackNavigator (HomeStackParamList)
 *   │     HomeScreen → NoteDetail
 *   ├── Notes tab → createStackNavigator (NotesStackParamList)
 *   │     NotesScreen → NoteDetail
 *   └── Todo tab  → createStackNavigator (TodoStackParamList)
 *         TodoScreen
 *
 * Why a stack inside each tab?
 *   React Navigation best practice: each tab owns its navigation stack so
 *   pressing the Home tab always returns to the root of Home, not to a
 *   note detail that was open in the Notes tab.
 *
 * The custom BottomNav component replaces the default tab bar. It receives
 * state, descriptors, and navigation via the tabBar prop.
 *
 * No screen headers are shown here — each screen manages its own header.
 * This gives us full control over the premium header design in Phase 3.
 *
 * DEBUG TIP: If a tab appears blank, check that the stack navigator inside
 * that tab has an initialRouteName that matches a defined screen.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import { BottomNav } from '../components/BottomNav';
import HomeScreen from './home';
import NotesScreen from './notes';
import NoteDetailScreen from './note-detail';
import TodoScreen from './todo';

import type {
  RootTabParamList,
  HomeStackParamList,
  NotesStackParamList,
  TodoStackParamList,
} from '../types/navigation';

// ---------------------------------------------------------------------------
// Navigator instances — typed with their param lists
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const NotesStack = createStackNavigator<NotesStackParamList>();
const TodoStack = createStackNavigator<TodoStackParamList>();

// ---------------------------------------------------------------------------
// Stack navigators — one per tab
// ---------------------------------------------------------------------------

/**
 * HomeStackNavigator — wraps the Home screen and the Note Detail screen.
 * NoteDetail is accessible by tapping a card on the Home screen.
 * headerShown: false — screens manage their own header in Phase 3.
 */
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeScreen"
    >
      <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
      <HomeStack.Screen name="NoteDetail" component={NoteDetailScreen} />
    </HomeStack.Navigator>
  );
}

/**
 * NotesStackNavigator — wraps the Notes screen and Note Detail screen.
 * Users reach Note Detail by tapping a card in the notes grid.
 */
function NotesStackNavigator() {
  return (
    <NotesStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="NotesScreen"
    >
      <NotesStack.Screen name="NotesScreen" component={NotesScreen} />
      <NotesStack.Screen name="NoteDetail" component={NoteDetailScreen} />
    </NotesStack.Navigator>
  );
}

/**
 * TodoStackNavigator — wraps only the Todo screen for now.
 * No child screens in the Todo tab — tasks don't have a detail view.
 */
function TodoStackNavigator() {
  return (
    <TodoStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="TodoScreen"
    >
      <TodoStack.Screen name="TodoScreen" component={TodoScreen} />
    </TodoStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root tab navigator
// ---------------------------------------------------------------------------

/**
 * AppNavigator — the root of the in-app navigation tree.
 * Rendered inside the NavigationContainer in App.tsx.
 *
 * tabBar={BottomNav} — replaces the default React Navigation tab bar with
 * our custom glass/blur component.
 *
 * tabBarHideOnKeyboard: true — hides the nav bar when the keyboard is open
 * so text inputs have more room.
 */
export default function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
      initialRouteName="Home"
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Notes"
        component={NotesStackNavigator}
        options={{ title: 'Notes' }}
      />
      <Tab.Screen
        name="Todo"
        component={TodoStackNavigator}
        options={{ title: 'Todo' }}
      />
    </Tab.Navigator>
  );
}
