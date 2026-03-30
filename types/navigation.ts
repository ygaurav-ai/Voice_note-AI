/**
 * types/navigation.ts
 *
 * TypeScript route param lists for every navigator in the app.
 *
 * Why centralise navigation types here?
 *   - Typed navigation props prevent runtime errors from typos in route names.
 *   - Screen components can import their own Props type directly from here.
 *   - A single source of truth — rename a route here and TypeScript will flag
 *     every screen that needs updating.
 *
 * Structure:
 *   Each tab has its own Stack navigator, and those stacks sit inside the
 *   Root Tab navigator. The hierarchy is:
 *
 *   RootTabParamList
 *   ├── HomeStack  → HomeStackParamList
 *   ├── NotesStack → NotesStackParamList
 *   └── TodoStack  → TodoStackParamList
 *
 * Usage in a screen component:
 *   import type { HomeStackScreenProps } from '../types/navigation';
 *   function HomeScreen({ navigation }: HomeStackScreenProps<'HomeScreen'>) { ... }
 *
 * DEBUG TIP: If navigation.navigate() gives a TypeScript error, check that
 * the route name and params match exactly what is defined here.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// ---------------------------------------------------------------------------
// Stack param lists — one per tab
// ---------------------------------------------------------------------------

/**
 * Routes inside the Home tab stack.
 * HomeScreen → NoteDetail (passing a noteId when tapping a card)
 */
export type HomeStackParamList = {
  /** Main home screen — no params needed */
  HomeScreen: undefined;
  /** Note detail/editor — receives the id of the note to display */
  NoteDetail: { noteId: string };
};

/**
 * Routes inside the Notes tab stack.
 * NotesScreen → NoteDetail (same NoteDetail screen, different stack entry point)
 */
export type NotesStackParamList = {
  /** Main notes library screen — no params needed */
  NotesScreen: undefined;
  /** Note detail/editor — receives the id of the note to display */
  NoteDetail: { noteId: string };
};

/**
 * Routes inside the Todo tab stack.
 * Todo screen only — no child screen yet.
 */
export type TodoStackParamList = {
  /** Main todo list screen — no params needed */
  TodoScreen: undefined;
};

// ---------------------------------------------------------------------------
// Root Tab param list
// ---------------------------------------------------------------------------

/**
 * The three tabs at the root of the app.
 * Each tab's value is a NavigatorScreenParams to allow deep-linking into stacks.
 */
export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Notes: NavigatorScreenParams<NotesStackParamList>;
  Todo: NavigatorScreenParams<TodoStackParamList>;
};

// ---------------------------------------------------------------------------
// Convenience screen props — import these in individual screen files
// ---------------------------------------------------------------------------

/** Props for any screen inside the HomeStack */
export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  CompositeScreenProps<
    StackScreenProps<HomeStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

/** Props for any screen inside the NotesStack */
export type NotesStackScreenProps<T extends keyof NotesStackParamList> =
  CompositeScreenProps<
    StackScreenProps<NotesStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

/** Props for any screen inside the TodoStack */
export type TodoStackScreenProps<T extends keyof TodoStackParamList> =
  CompositeScreenProps<
    StackScreenProps<TodoStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

// ---------------------------------------------------------------------------
// Global declaration — enables useNavigation() to return typed navigator
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}
