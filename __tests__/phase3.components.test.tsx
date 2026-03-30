/**
 * __tests__/phase3.components.test.tsx
 *
 * Phase 3 — Component and screen render tests.
 *
 * What is tested:
 *   1. TagChip — renders label, active/inactive styles, onPress
 *   2. FAB — renders, onPress
 *   3. RecordButton — renders without crashing
 *   4. UserAvatar — renders with initials
 *   5. NoteCard — title, body preview, tag pill, onPress, empty title fallback
 *   6. NoteGridCard — title, body preview, category dot, no-body case, onPress
 *   7. NoteCreateSheet — visible/hidden, save disabled, title enables save,
 *                        onSave payload, onClose, tag selection, form reset
 *   8. HomeScreen — smoke test, empty state, note count label, FAB opens sheet
 *   9. NotesScreen — smoke test, empty state, search input, filter chips
 *
 * Mocked modules:
 *   - react-native-mmkv (no native binary in Jest)
 *   - expo-blur (BlurView requires native renderer)
 *   - expo-notifications (requires native API)
 *   - react-native-safe-area-context (native provider → passthrough in tests)
 *
 * DEBUG TIP: If getByTestId fails, log the output of render().toJSON() or
 * debug() to inspect what the test renderer actually produced.
 */

// ---------------------------------------------------------------------------
// Module mocks — must come before any import that transitively uses them
// ---------------------------------------------------------------------------

// MMKV — used by notesStore which is imported by screen components
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn().mockReturnValue({
    set: jest.fn(),
    getString: jest.fn().mockReturnValue(undefined),
    remove: jest.fn(),
  }),
}));

// expo-blur — BlurView is a native view that cannot render in Jest
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: ({ children, style }: any) => <View style={style}>{children}</View>,
  };
});

// expo-notifications — requires native permissions API not present in Jest
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

/**
 * react-native-reanimated mock.
 *
 * WHY: FAB and RecordButton now use Reanimated spring animations (Phase 6).
 * The native worklets runtime doesn't initialise in Jest, so we replace
 * Animated.View with a plain View and stub animation helpers.
 * __esModule: true prevents Babel from double-wrapping the default export.
 */
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const AnimatedView = (props: any) => React.createElement(View, props);
  return {
    __esModule: true,
    default: { View: AnimatedView },
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: (_fn: () => any) => ({}),
    withTiming: (value: any) => value,
    withSpring: (value: any) => value,
  };
});

/**
 * react-native-safe-area-context mock.
 *
 * WHY: SafeAreaProvider wraps a native RNCSafeAreaProvider which is a leaf
 * node in the Jest renderer — it never renders children. The screens use
 * SafeAreaView and useSafeAreaInsets() so we need this to work correctly.
 *
 * FIX: Replace all exports with passthrough implementations that render
 * children and return static insets.
 */
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 44, right: 0, bottom: 34, left: 0 };
  const SafeAreaInsetsContext = React.createContext(insets);

  return {
    SafeAreaProvider: ({ children }: any) => <View>{children}</View>,
    SafeAreaView: ({ children, style }: any) => <View style={style}>{children}</View>,
    useSafeAreaInsets: () => insets,
    SafeAreaInsetsContext,
  };
});

// ---------------------------------------------------------------------------
// Imports — after mocks are set up
// ---------------------------------------------------------------------------

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { TagChip } from '../components/TagChip';
import { FAB } from '../components/FAB';
import { RecordButton } from '../components/RecordButton';
import { UserAvatar } from '../components/UserAvatar';
import { NoteCard } from '../components/NoteCard';
import { NoteGridCard } from '../components/NoteGridCard';
import { NoteCreateSheet } from '../components/NoteCreateSheet';
import { useNotesStore } from '../store/notesStore';
import { createNote } from '../types';
import type { Note } from '../types';

// Screen imports — static imports are safe because jest.mock() is hoisted
// by Babel to run BEFORE any require()/import resolution.
import HomeScreen from '../app/home';
import NotesScreen from '../app/notes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a Note fixture with sensible defaults for component tests.
 * Overrides accepted for any field.
 */
function makeNote(overrides: Partial<Note> = {}): Note {
  return createNote({
    id: 'test-note-1',
    title: 'Test Note Title',
    body: 'Test note body text.',
    tag: 'work',
    ...overrides,
  });
}

/**
 * Mock navigation object for screen components.
 * Screens receive `navigation` and `route` as props from React Navigation.
 */
function makeMockNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    // addListener must return an unsubscribe function (used in NoteDetail's beforeRemove)
    addListener: jest.fn().mockReturnValue(jest.fn()),
    setOptions: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(false),
    isFocused: jest.fn().mockReturnValue(true),
  };
}

// ---------------------------------------------------------------------------
// Reset store before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Clean slate — no notes, default UI state
  useNotesStore.setState({ notes: [], activeTag: 'all', searchQuery: '' });
});

// ===========================================================================
// 1. TagChip
// ===========================================================================

describe('<TagChip />', () => {
  it('renders the label text', () => {
    render(
      <TagChip label="Work" tag="work" isActive={false} onPress={jest.fn()} />
    );
    expect(screen.getByText('Work')).toBeTruthy();
  });

  it('renders with a testID', () => {
    render(
      <TagChip
        testID="chip-work"
        label="Work"
        tag="work"
        isActive={false}
        onPress={jest.fn()}
      />
    );
    expect(screen.getByTestId('chip-work')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(
      <TagChip
        testID="chip-test"
        label="Reading"
        tag="reading"
        isActive={false}
        onPress={onPress}
      />
    );
    fireEvent.press(screen.getByTestId('chip-test'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders in active state without crashing', () => {
    render(
      <TagChip label="Personal" tag="personal" isActive={true} onPress={jest.fn()} />
    );
    expect(screen.getByText('Personal')).toBeTruthy();
  });

  it('renders in inactive state without crashing', () => {
    render(
      <TagChip label="Ideas" tag="ideas" isActive={false} onPress={jest.fn()} />
    );
    expect(screen.getByText('Ideas')).toBeTruthy();
  });

  it('renders the "All" chip (no tag prop) without crashing', () => {
    render(<TagChip label="All" isActive={true} onPress={jest.fn()} />);
    expect(screen.getByText('All')).toBeTruthy();
  });

  it('renders all four tag variants without crashing', () => {
    const tags: Array<'work' | 'reading' | 'personal' | 'ideas'> = [
      'work', 'reading', 'personal', 'ideas',
    ];
    tags.forEach((tag) => {
      const { unmount } = render(
        <TagChip label={tag} tag={tag} isActive={false} onPress={jest.fn()} />
      );
      expect(screen.getByText(tag)).toBeTruthy();
      unmount();
    });
  });
});

// ===========================================================================
// 2. FAB
// ===========================================================================

describe('<FAB />', () => {
  it('renders without crashing', () => {
    render(<FAB onPress={jest.fn()} />);
    expect(screen.getByTestId('fab-button')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    render(<FAB testID="my-fab" onPress={jest.fn()} />);
    expect(screen.getByTestId('my-fab')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<FAB testID="fab-btn" onPress={onPress} />);
    fireEvent.press(screen.getByTestId('fab-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the "+" label', () => {
    render(<FAB onPress={jest.fn()} />);
    expect(screen.getByText('+')).toBeTruthy();
  });
});

// ===========================================================================
// 3. RecordButton
// ===========================================================================

describe('<RecordButton />', () => {
  it('renders without crashing', () => {
    render(<RecordButton />);
    expect(screen.getByTestId('record-button')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    render(<RecordButton testID="my-record-btn" />);
    expect(screen.getByTestId('my-record-btn')).toBeTruthy();
  });
});

// ===========================================================================
// 4. UserAvatar
// ===========================================================================

describe('<UserAvatar />', () => {
  it('renders without crashing', () => {
    render(<UserAvatar />);
    expect(screen.getByTestId('user-avatar')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    render(<UserAvatar testID="my-avatar" />);
    expect(screen.getByTestId('my-avatar')).toBeTruthy();
  });

  it('displays default initials "Y"', () => {
    render(<UserAvatar />);
    expect(screen.getByText('Y')).toBeTruthy();
  });
});

// ===========================================================================
// 5. NoteCard
// ===========================================================================

describe('<NoteCard />', () => {
  it('renders without crashing', () => {
    render(<NoteCard note={makeNote()} width={320} onPress={jest.fn()} />);
    expect(screen.getByTestId('note-card-test-note-1')).toBeTruthy();
  });

  it('displays the note title', () => {
    render(
      <NoteCard
        note={makeNote({ title: 'My Important Note' })}
        width={320}
        onPress={jest.fn()}
      />
    );
    expect(screen.getByTestId('note-card-title-test-note-1')).toBeTruthy();
    expect(screen.getByText('My Important Note')).toBeTruthy();
  });

  it('displays "Untitled" when title is empty', () => {
    render(<NoteCard note={makeNote({ title: '' })} width={320} onPress={jest.fn()} />);
    expect(screen.getByText('Untitled')).toBeTruthy();
  });

  it('displays the body preview text', () => {
    render(
      <NoteCard
        note={makeNote({ body: 'This is the body preview.' })}
        width={320}
        onPress={jest.fn()}
      />
    );
    expect(screen.getByText('This is the body preview.')).toBeTruthy();
  });

  it('calls onPress when the card is tapped', () => {
    const onPress = jest.fn();
    render(<NoteCard note={makeNote()} width={320} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('note-card-test-note-1'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with a custom testID', () => {
    render(
      <NoteCard testID="custom-card" note={makeNote()} width={320} onPress={jest.fn()} />
    );
    expect(screen.getByTestId('custom-card')).toBeTruthy();
  });

  it('renders for each tag without crashing', () => {
    const tags: Array<'work' | 'reading' | 'personal' | 'ideas'> = [
      'work', 'reading', 'personal', 'ideas',
    ];
    tags.forEach((tag) => {
      const { unmount } = render(
        <NoteCard note={makeNote({ tag })} width={320} onPress={jest.fn()} />
      );
      expect(screen.getByTestId('note-card-test-note-1')).toBeTruthy();
      unmount();
    });
  });
});

// ===========================================================================
// 6. NoteGridCard
// ===========================================================================

describe('<NoteGridCard />', () => {
  it('renders without crashing', () => {
    render(<NoteGridCard note={makeNote()} onPress={jest.fn()} />);
    expect(screen.getByTestId('note-grid-card-test-note-1')).toBeTruthy();
  });

  it('displays the note title', () => {
    render(
      <NoteGridCard
        note={makeNote({ title: 'Grid Card Title' })}
        onPress={jest.fn()}
      />
    );
    expect(screen.getByTestId('note-grid-title-test-note-1')).toBeTruthy();
    expect(screen.getByText('Grid Card Title')).toBeTruthy();
  });

  it('displays "Untitled" when title is empty', () => {
    render(<NoteGridCard note={makeNote({ title: '' })} onPress={jest.fn()} />);
    expect(screen.getByText('Untitled')).toBeTruthy();
  });

  it('renders body preview when body is non-empty', () => {
    render(
      <NoteGridCard
        note={makeNote({ body: 'Grid body preview.' })}
        onPress={jest.fn()}
      />
    );
    expect(screen.getByText('Grid body preview.')).toBeTruthy();
  });

  it('does not render body text when body is empty', () => {
    render(<NoteGridCard note={makeNote({ body: '' })} onPress={jest.fn()} />);
    // Body text element should not exist
    expect(screen.queryByText('Grid body preview.')).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<NoteGridCard note={makeNote()} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('note-grid-card-test-note-1'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with a custom testID', () => {
    render(
      <NoteGridCard testID="grid-card-custom" note={makeNote()} onPress={jest.fn()} />
    );
    expect(screen.getByTestId('grid-card-custom')).toBeTruthy();
  });

  it('renders for each tag variant without crashing', () => {
    const tags: Array<'work' | 'reading' | 'personal' | 'ideas'> = [
      'work', 'reading', 'personal', 'ideas',
    ];
    tags.forEach((tag) => {
      const { unmount } = render(
        <NoteGridCard note={makeNote({ tag })} onPress={jest.fn()} />
      );
      expect(screen.getByTestId('note-grid-card-test-note-1')).toBeTruthy();
      unmount();
    });
  });
});

// ===========================================================================
// 7. NoteCreateSheet
// ===========================================================================

describe('<NoteCreateSheet />', () => {
  it('renders without crashing when visible=true', () => {
    render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByTestId('note-create-sheet')).toBeTruthy();
  });

  it('shows the title and body inputs when visible', () => {
    render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByTestId('note-title-input')).toBeTruthy();
    expect(screen.getByTestId('note-body-input')).toBeTruthy();
  });

  it('shows the save button when visible', () => {
    render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByTestId('note-save-button')).toBeTruthy();
  });

  it('save button is disabled when title is empty', () => {
    render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    // The save button element should have accessibilityState.disabled=true
    // or just verify onSave is not called when pressed with empty title
    const saveBtn = screen.getByTestId('note-save-button');
    // accessibilityState disabled is set via the disabled prop on TouchableOpacity
    expect(saveBtn.props.accessibilityState?.disabled ?? saveBtn.props.disabled).toBeTruthy();
  });

  it('save button is enabled after typing a title', () => {
    render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    fireEvent.changeText(screen.getByTestId('note-title-input'), 'My New Note');
    const saveBtn = screen.getByTestId('note-save-button');
    // Should no longer be disabled
    const isDisabled = saveBtn.props.accessibilityState?.disabled ?? saveBtn.props.disabled;
    expect(isDisabled).toBeFalsy();
  });

  it('calling onSave with correct data when save is tapped', () => {
    const onSave = jest.fn();
    render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );

    fireEvent.changeText(screen.getByTestId('note-title-input'), 'Save Title');
    fireEvent.changeText(screen.getByTestId('note-body-input'), 'Save body text');
    fireEvent.press(screen.getByTestId('note-save-button'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      title: 'Save Title',
      body: 'Save body text',
      tag: 'ideas', // default tag
    });
  });

  it('trims whitespace from title and body before saving', () => {
    const onSave = jest.fn();
    render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );

    fireEvent.changeText(screen.getByTestId('note-title-input'), '  Padded Title  ');
    fireEvent.changeText(screen.getByTestId('note-body-input'), '  Padded body  ');
    fireEvent.press(screen.getByTestId('note-save-button'));

    expect(onSave).toHaveBeenCalledWith({
      title: 'Padded Title',
      body: 'Padded body',
      tag: 'ideas',
    });
  });

  it('calls onClose after save', () => {
    const onClose = jest.fn();
    render(
      <NoteCreateSheet visible={true} onClose={onClose} onSave={jest.fn()} />
    );

    fireEvent.changeText(screen.getByTestId('note-title-input'), 'Close after save');
    fireEvent.press(screen.getByTestId('note-save-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    render(
      <NoteCreateSheet visible={true} onClose={onClose} onSave={jest.fn()} />
    );

    fireEvent.press(screen.getByTestId('sheet-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the overlay is pressed', () => {
    const onClose = jest.fn();
    render(
      <NoteCreateSheet visible={true} onClose={onClose} onSave={jest.fn()} />
    );

    fireEvent.press(screen.getByTestId('sheet-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave when title is whitespace-only', () => {
    const onSave = jest.fn();
    render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );

    // Only whitespace — canSave should still be false after trim
    fireEvent.changeText(screen.getByTestId('note-title-input'), '   ');
    fireEvent.press(screen.getByTestId('note-save-button'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('selecting a tag updates it in the saved payload', () => {
    const onSave = jest.fn();
    render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );

    // Select 'work' tag
    fireEvent.press(screen.getByTestId('sheet-tag-work'));
    fireEvent.changeText(screen.getByTestId('note-title-input'), 'Tagged note');
    fireEvent.press(screen.getByTestId('note-save-button'));

    expect(onSave).toHaveBeenCalledWith({
      title: 'Tagged note',
      body: '',
      tag: 'work',
    });
  });

  it('renders all four tag chip buttons', () => {
    render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );

    expect(screen.getByTestId('sheet-tag-work')).toBeTruthy();
    expect(screen.getByTestId('sheet-tag-reading')).toBeTruthy();
    expect(screen.getByTestId('sheet-tag-personal')).toBeTruthy();
    expect(screen.getByTestId('sheet-tag-ideas')).toBeTruthy();
  });

  it('resets form fields when sheet is reopened (visible goes false → true)', () => {
    const { rerender } = render(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );

    // Type something
    fireEvent.changeText(screen.getByTestId('note-title-input'), 'Draft title');

    // Close (simulate visible going false)
    rerender(
      <NoteCreateSheet visible={false} onClose={jest.fn()} onSave={jest.fn()} />
    );

    // Reopen
    rerender(
      <NoteCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );

    // Title should be cleared
    const titleInput = screen.getByTestId('note-title-input');
    expect(titleInput.props.value).toBe('');
  });
});

// ===========================================================================
// 8. HomeScreen
// ===========================================================================
// Updated for the Phase 6 redesign:
//   - note count subtitle removed → FAB / RecordButton are the canonical smoke
//     test anchors (both have stable testIDs that survive layout changes)
//   - Empty state is now in the "RECENT NOTES" section (no testID on the View)
//     so we assert on the empty state text string directly
//   - Card FlatList testID changed from "home-card-list" → "home-notes-list"
//   - Dot indicator testID unchanged ("home-dot-indicator"), but now appears
//     when allNotes.length > 1 rather than todayNotes.length > 1

describe('<HomeScreen />', () => {
  function renderHomeScreen(notes: Note[] = []) {
    // Seed notes store with the provided notes
    useNotesStore.setState({ notes });
    // Reset todos store so progress card stats start at 0
    const { useTodoStore } = require('../store/todoStore');
    useTodoStore.setState({ todos: [] });

    const navigation = makeMockNavigation() as any;
    const route = { key: 'HomeScreen', name: 'HomeScreen', params: undefined } as any;

    return render(<HomeScreen navigation={navigation} route={route} />);
  }

  it('renders without crashing', () => {
    renderHomeScreen();
    // FAB is always rendered regardless of data state — stable smoke-test anchor
    expect(screen.getByTestId('home-fab')).toBeTruthy();
  });

  it('shows empty state text when there are no notes', () => {
    renderHomeScreen([]);
    // The Recent Notes section renders an empty hint when notes array is empty
    expect(screen.getByText('No notes yet — tap + to create one')).toBeTruthy();
  });

  it('shows the progress card with zero counts when todos are empty', () => {
    renderHomeScreen([]);
    // Progress label is always visible
    expect(screen.getByText('TODAY\'S PROGRESS')).toBeTruthy();
    expect(screen.getByText('0 / 0 done')).toBeTruthy();
  });

  it('shows note cards when notes exist', () => {
    const note = createNote({ id: 'note-abc', title: 'Visible note', body: 'body', tag: 'work' });
    renderHomeScreen([note]);
    // Recent notes FlatList has testID "home-notes-list"
    expect(screen.getByTestId('home-notes-list')).toBeTruthy();
  });

  it('renders the FAB', () => {
    renderHomeScreen();
    expect(screen.getByTestId('home-fab')).toBeTruthy();
  });

  it('renders the RecordButton', () => {
    renderHomeScreen();
    expect(screen.getByTestId('home-record-button')).toBeTruthy();
  });

  it('tapping the FAB shows the create sheet', () => {
    renderHomeScreen();
    fireEvent.press(screen.getByTestId('home-fab'));
    expect(screen.getByTestId('note-create-sheet')).toBeTruthy();
  });

  it('shows dot indicators when more than 1 note exists', () => {
    const notes = [
      createNote({ id: 'n1', title: 'Note 1', body: '', tag: 'work' }),
      createNote({ id: 'n2', title: 'Note 2', body: '', tag: 'ideas' }),
    ];
    renderHomeScreen(notes);
    expect(screen.getByTestId('home-dot-indicator')).toBeTruthy();
  });

  it('does not show dot indicators for a single note', () => {
    const note = createNote({ id: 'n1', title: 'Solo note', body: '', tag: 'work' });
    renderHomeScreen([note]);
    expect(screen.queryByTestId('home-dot-indicator')).toBeNull();
  });

  it('shows "All caught up" when there are no active todos', () => {
    renderHomeScreen([]);
    expect(screen.getByText('All caught up ✓')).toBeTruthy();
  });
});

// ===========================================================================
// 9. NotesScreen
// ===========================================================================

describe('<NotesScreen />', () => {
  function renderNotesScreen(notes: Note[] = []) {
    useNotesStore.setState({ notes, activeTag: 'all', searchQuery: '' });

    const navigation = makeMockNavigation() as any;
    const route = { key: 'NotesScreen', name: 'NotesScreen', params: undefined } as any;

    return render(<NotesScreen navigation={navigation} route={route} />);
  }

  it('renders without crashing', () => {
    renderNotesScreen();
    expect(screen.getByTestId('notes-grid')).toBeTruthy();
  });

  it('shows empty state when there are no notes', () => {
    renderNotesScreen([]);
    expect(screen.getByTestId('notes-empty-state')).toBeTruthy();
  });

  it('shows "No notes yet" text when completely empty', () => {
    renderNotesScreen([]);
    expect(screen.getByText('No notes yet')).toBeTruthy();
  });

  it('renders the search input', () => {
    renderNotesScreen();
    expect(screen.getByTestId('notes-search-input')).toBeTruthy();
  });

  it('renders all five filter chips (All + 4 tags)', () => {
    renderNotesScreen();
    expect(screen.getByTestId('notes-filter-all')).toBeTruthy();
    expect(screen.getByTestId('notes-filter-work')).toBeTruthy();
    expect(screen.getByTestId('notes-filter-reading')).toBeTruthy();
    expect(screen.getByTestId('notes-filter-personal')).toBeTruthy();
    expect(screen.getByTestId('notes-filter-ideas')).toBeTruthy();
  });

  it('renders the FAB', () => {
    renderNotesScreen();
    expect(screen.getByTestId('notes-fab')).toBeTruthy();
  });

  it('renders the RecordButton', () => {
    renderNotesScreen();
    expect(screen.getByTestId('notes-record-button')).toBeTruthy();
  });

  it('shows note cards in the grid when notes exist', () => {
    const notes = [
      createNote({ id: 'gn1', title: 'Grid note 1', body: '', tag: 'work' }),
      createNote({ id: 'gn2', title: 'Grid note 2', body: '', tag: 'ideas' }),
    ];
    renderNotesScreen(notes);
    expect(screen.getByTestId('note-grid-card-gn1')).toBeTruthy();
    expect(screen.getByTestId('note-grid-card-gn2')).toBeTruthy();
  });

  it('shows "No notes match your filter" when active tag has no matches', () => {
    // Set activeTag to 'work' but only have an 'ideas' note
    const note = createNote({ id: 'n1', title: 'Ideas note', body: '', tag: 'ideas' });
    useNotesStore.setState({ notes: [note], activeTag: 'work', searchQuery: '' });

    const navigation = makeMockNavigation() as any;
    const route = { key: 'NotesScreen', name: 'NotesScreen', params: undefined } as any;
    render(<NotesScreen navigation={navigation} route={route} />);

    expect(screen.getByText('No notes match your filter')).toBeTruthy();
  });

  it('tapping the FAB shows the create sheet', () => {
    renderNotesScreen();
    fireEvent.press(screen.getByTestId('notes-fab'));
    expect(screen.getByTestId('note-create-sheet')).toBeTruthy();
  });

  it('updates search query when user types in the search bar', () => {
    renderNotesScreen();
    fireEvent.changeText(screen.getByTestId('notes-search-input'), 'hello world');
    // Store should have updated the search query
    expect(useNotesStore.getState().searchQuery).toBe('hello world');
  });

  it('updates active tag when a filter chip is pressed', () => {
    renderNotesScreen();
    fireEvent.press(screen.getByTestId('notes-filter-work'));
    expect(useNotesStore.getState().activeTag).toBe('work');
  });

  it('navigates to NoteDetail when a grid card is tapped', () => {
    const note = createNote({ id: 'nav-note', title: 'Navigate me', body: '', tag: 'work' });
    useNotesStore.setState({ notes: [note], activeTag: 'all', searchQuery: '' });

    const navigation = makeMockNavigation() as any;
    const route = { key: 'NotesScreen', name: 'NotesScreen', params: undefined } as any;
    render(<NotesScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByTestId('note-grid-card-nav-note'));
    expect(navigation.navigate).toHaveBeenCalledWith('NoteDetail', { noteId: 'nav-note' });
  });
});
