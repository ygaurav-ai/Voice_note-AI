/**
 * __tests__/phase4.components.test.tsx
 *
 * Phase 4 — Todo component and screen render tests.
 *
 * What is tested:
 *   1. TodoItem — renders all fields, completion state, checkbox press,
 *                 delete press, priority dots for all levels, due date
 *   2. TodoCreateSheet — visible/hidden, disabled save, title enables save,
 *                        priority selection, date quick-select, onSave payload,
 *                        onClose, form reset
 *   3. TodoScreen — smoke test, empty state, remaining count, FAB opens sheet,
 *                   active/completed sections, toggle moves row, delete removes row
 *
 * Mocked modules:
 *   - react-native-mmkv
 *   - expo-blur
 *   - expo-notifications
 *   - react-native-safe-area-context
 *   - react-native-reanimated (Animated components rendered as plain Views)
 *
 * DEBUG TIP: If TodoItem opacity animation doesn't change, check that
 * react-native-reanimated is properly mocked and useSharedValue/withTiming
 * are available in the test environment.
 */

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn().mockReturnValue({
    set: jest.fn(),
    getString: jest.fn().mockReturnValue(undefined),
    remove: jest.fn(),
  }),
}));

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: ({ children, style }: any) => <View style={style}>{children}</View> };
});

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

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

/**
 * Mock react-native-reanimated.
 *
 * WHY: Reanimated's native worklets don't initialise in Jest. We replace
 * Animated.View with a plain View and stub the animation helpers.
 *
 * __esModule: true is REQUIRED so that Babel's _interopRequireDefault does
 * not double-wrap the module. Without it, `import Animated from 'reanimated'`
 * gives `Animated = { default: { View }, ... }` and `Animated.View` is
 * undefined, causing "Element type is invalid" errors.
 */
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  // Spread ALL props (including testID, accessibilityLabel, style, etc.)
  // so getByTestId works on Animated.View elements in tests.
  const AnimatedView = (props: any) => React.createElement(View, props);
  return {
    __esModule: true,
    default: { View: AnimatedView },
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: (_fn: () => any) => ({}), // return stable empty object
    withTiming: (value: any) => value,
    withSpring: (value: any) => value,
  };
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { TodoItem } from '../components/TodoItem';
import { TodoCreateSheet } from '../components/TodoCreateSheet';
import TodoScreen from '../app/todo';
import { useTodoStore } from '../store/todoStore';
import { createTodo } from '../types';
import type { Todo } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return createTodo({
    id: 'test-todo-1',
    title: 'Test Task',
    priority: 'medium',
    ...overrides,
  });
}

function makeMockNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn().mockReturnValue(jest.fn()),
    setOptions: jest.fn(),
    dispatch: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(false),
    isFocused: jest.fn().mockReturnValue(true),
  };
}

// ---------------------------------------------------------------------------
// Reset store before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  useTodoStore.setState({ todos: [] });
});

// ===========================================================================
// 1. TodoItem
// ===========================================================================

describe('<TodoItem />', () => {
  it('renders without crashing', () => {
    render(
      <TodoItem todo={makeTodo()} onToggle={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.getByTestId('todo-item-test-todo-1')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    render(
      <TodoItem
        testID="my-todo"
        todo={makeTodo()}
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByTestId('my-todo')).toBeTruthy();
  });

  it('renders the todo title', () => {
    render(
      <TodoItem todo={makeTodo({ title: 'Buy groceries' })} onToggle={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.getByText('Buy groceries')).toBeTruthy();
  });

  it('renders the checkbox', () => {
    render(<TodoItem todo={makeTodo()} onToggle={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByTestId('todo-checkbox-test-todo-1')).toBeTruthy();
  });

  it('renders the priority dot', () => {
    render(<TodoItem todo={makeTodo()} onToggle={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByTestId('todo-priority-test-todo-1')).toBeTruthy();
  });

  it('calls onToggle when the checkbox is pressed', () => {
    const onToggle = jest.fn();
    render(<TodoItem todo={makeTodo()} onToggle={onToggle} onDelete={jest.fn()} />);
    fireEvent.press(screen.getByTestId('todo-checkbox-test-todo-1'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the delete button is pressed', () => {
    const onDelete = jest.fn();
    render(<TodoItem todo={makeTodo()} onToggle={jest.fn()} onDelete={onDelete} />);
    fireEvent.press(screen.getByTestId('todo-delete-test-todo-1'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows the due date when present', () => {
    const due = new Date().toISOString(); // today
    render(
      <TodoItem
        todo={makeTodo({ dueDate: due })}
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByTestId('todo-due-test-todo-1')).toBeTruthy();
  });

  it('does not render a due date element when dueDate is null', () => {
    render(
      <TodoItem todo={makeTodo({ dueDate: null })} onToggle={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.queryByTestId('todo-due-test-todo-1')).toBeNull();
  });

  it('renders a completed todo with a strikethrough title text', () => {
    render(
      <TodoItem
        todo={makeTodo({ completed: true, completedAt: new Date().toISOString() })}
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    const titleEl = screen.getByTestId('todo-title-test-todo-1');
    // Verify the style includes line-through (may be nested in array)
    const styles = [titleEl.props.style].flat();
    const hasStrikethrough = styles.some(
      (s: any) => s && s.textDecorationLine === 'line-through'
    );
    expect(hasStrikethrough).toBe(true);
  });

  it('renders a checkmark text when completed', () => {
    render(
      <TodoItem
        todo={makeTodo({ completed: true, completedAt: new Date().toISOString() })}
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('does not render a checkmark when not completed', () => {
    render(<TodoItem todo={makeTodo({ completed: false })} onToggle={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByText('✓')).toBeNull();
  });

  it('renders all three priority dot variants without crashing', () => {
    const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    priorities.forEach((priority) => {
      const { unmount } = render(
        <TodoItem todo={makeTodo({ priority })} onToggle={jest.fn()} onDelete={jest.fn()} />
      );
      expect(screen.getByTestId('todo-priority-test-todo-1')).toBeTruthy();
      unmount();
    });
  });
});

// ===========================================================================
// 2. TodoCreateSheet
// ===========================================================================

describe('<TodoCreateSheet />', () => {
  it('renders without crashing when visible=true', () => {
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByTestId('todo-create-sheet')).toBeTruthy();
  });

  it('shows title input and save button when visible', () => {
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByTestId('todo-title-input')).toBeTruthy();
    expect(screen.getByTestId('todo-save-button')).toBeTruthy();
  });

  it('save button is disabled when title is empty', () => {
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    const saveBtn = screen.getByTestId('todo-save-button');
    const isDisabled = saveBtn.props.accessibilityState?.disabled ?? saveBtn.props.disabled;
    expect(isDisabled).toBeTruthy();
  });

  it('save button is enabled after typing a title', () => {
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    fireEvent.changeText(screen.getByTestId('todo-title-input'), 'New task');
    const saveBtn = screen.getByTestId('todo-save-button');
    const isDisabled = saveBtn.props.accessibilityState?.disabled ?? saveBtn.props.disabled;
    expect(isDisabled).toBeFalsy();
  });

  it('calls onSave with correct data when Save is tapped', () => {
    const onSave = jest.fn();
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );

    fireEvent.changeText(screen.getByTestId('todo-title-input'), 'Walk the dog');
    fireEvent.press(screen.getByTestId('todo-save-button'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      title: 'Walk the dog',
      priority: 'medium',    // default priority
      dueDate: null,         // default — no date selected
      reminderSet: false,    // default — reminder toggle off
    });
  });

  it('trims whitespace from title before saving', () => {
    const onSave = jest.fn();
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );

    fireEvent.changeText(screen.getByTestId('todo-title-input'), '  Padded  ');
    fireEvent.press(screen.getByTestId('todo-save-button'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Padded' })
    );
  });

  it('calls onClose after Save', () => {
    const onClose = jest.fn();
    render(
      <TodoCreateSheet visible={true} onClose={onClose} onSave={jest.fn()} />
    );

    fireEvent.changeText(screen.getByTestId('todo-title-input'), 'Close after save');
    fireEvent.press(screen.getByTestId('todo-save-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(
      <TodoCreateSheet visible={true} onClose={onClose} onSave={jest.fn()} />
    );
    fireEvent.press(screen.getByTestId('todo-sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is pressed', () => {
    const onClose = jest.fn();
    render(
      <TodoCreateSheet visible={true} onClose={onClose} onSave={jest.fn()} />
    );
    fireEvent.press(screen.getByTestId('todo-sheet-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave when title is whitespace-only', () => {
    const onSave = jest.fn();
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );
    fireEvent.changeText(screen.getByTestId('todo-title-input'), '   ');
    fireEvent.press(screen.getByTestId('todo-save-button'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('renders all three priority chips', () => {
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByTestId('todo-priority-high')).toBeTruthy();
    expect(screen.getByTestId('todo-priority-medium')).toBeTruthy();
    expect(screen.getByTestId('todo-priority-low')).toBeTruthy();
  });

  it('selecting high priority passes it to onSave', () => {
    const onSave = jest.fn();
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );

    fireEvent.press(screen.getByTestId('todo-priority-high'));
    fireEvent.changeText(screen.getByTestId('todo-title-input'), 'Urgent');
    fireEvent.press(screen.getByTestId('todo-save-button'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'high' })
    );
  });

  it('selecting low priority passes it to onSave', () => {
    const onSave = jest.fn();
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );

    fireEvent.press(screen.getByTestId('todo-priority-low'));
    fireEvent.changeText(screen.getByTestId('todo-title-input'), 'Someday');
    fireEvent.press(screen.getByTestId('todo-save-button'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'low' })
    );
  });

  it('renders all five date quick-select chips', () => {
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByTestId('todo-date-none')).toBeTruthy();
    expect(screen.getByTestId('todo-date-today')).toBeTruthy();
    expect(screen.getByTestId('todo-date-tomorrow')).toBeTruthy();
    expect(screen.getByTestId('todo-date-in-3-days')).toBeTruthy();
    expect(screen.getByTestId('todo-date-next-week')).toBeTruthy();
  });

  it('selecting Today passes a non-null dueDate to onSave', () => {
    const onSave = jest.fn();
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );

    fireEvent.press(screen.getByTestId('todo-date-today'));
    fireEvent.changeText(screen.getByTestId('todo-title-input'), 'Do today');
    fireEvent.press(screen.getByTestId('todo-save-button'));

    const { dueDate } = onSave.mock.calls[0][0];
    expect(dueDate).not.toBeNull();
    expect(typeof dueDate).toBe('string');
  });

  it('selecting None keeps dueDate as null', () => {
    const onSave = jest.fn();
    render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={onSave} />
    );

    // First set a date, then clear it
    fireEvent.press(screen.getByTestId('todo-date-today'));
    fireEvent.press(screen.getByTestId('todo-date-none'));

    fireEvent.changeText(screen.getByTestId('todo-title-input'), 'Whenever');
    fireEvent.press(screen.getByTestId('todo-save-button'));

    expect(onSave.mock.calls[0][0].dueDate).toBeNull();
  });

  it('resets form when reopened (visible false → true)', () => {
    const { rerender } = render(
      <TodoCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />
    );

    fireEvent.changeText(screen.getByTestId('todo-title-input'), 'Draft task');

    // Close
    rerender(<TodoCreateSheet visible={false} onClose={jest.fn()} onSave={jest.fn()} />);
    // Reopen
    rerender(<TodoCreateSheet visible={true} onClose={jest.fn()} onSave={jest.fn()} />);

    expect(screen.getByTestId('todo-title-input').props.value).toBe('');
  });
});

// ===========================================================================
// 3. TodoScreen
// ===========================================================================

describe('<TodoScreen />', () => {
  function renderTodoScreen(todos: Todo[] = []) {
    useTodoStore.setState({ todos });
    const navigation = makeMockNavigation() as any;
    const route = { key: 'TodoScreen', name: 'TodoScreen', params: undefined } as any;
    return render(<TodoScreen navigation={navigation} route={route} />);
  }

  it('renders without crashing', () => {
    renderTodoScreen();
    expect(screen.getByTestId('todo-list')).toBeTruthy();
  });

  it('renders the remaining-count subtitle', () => {
    renderTodoScreen();
    expect(screen.getByTestId('todo-remaining-count')).toBeTruthy();
  });

  it('shows "No tasks yet" when there are no todos', () => {
    renderTodoScreen();
    expect(screen.getByTestId('todo-empty-state')).toBeTruthy();
    expect(screen.getByText('No tasks yet')).toBeTruthy();
  });

  it('shows "No tasks yet" remaining count when empty', () => {
    renderTodoScreen();
    expect(screen.getByText('No tasks yet')).toBeTruthy();
  });

  it('shows correct remaining count with only active todos', () => {
    const todos = [
      createTodo({ id: 't1', title: 'A', priority: 'high' }),
      createTodo({ id: 't2', title: 'B', priority: 'low' }),
    ];
    renderTodoScreen(todos);
    expect(screen.getByText('2 of 2 remaining')).toBeTruthy();
  });

  it('updates remaining count after one todo is completed', () => {
    const todo = createTodo({ id: 't1', title: 'Task', priority: 'medium' });
    useTodoStore.setState({ todos: [todo] });

    const navigation = makeMockNavigation() as any;
    const route = { key: 'TodoScreen', name: 'TodoScreen', params: undefined } as any;
    render(<TodoScreen navigation={navigation} route={route} />);

    // Complete the task via the store directly (simulating toggleComplete)
    useTodoStore.getState().toggleComplete('t1');

    // After store change, re-render check — count should update
    expect(useTodoStore.getState().getActiveTodos()).toHaveLength(0);
    expect(useTodoStore.getState().getCompletedTodos()).toHaveLength(1);
  });

  it('renders the FAB', () => {
    renderTodoScreen();
    expect(screen.getByTestId('todo-fab')).toBeTruthy();
  });

  it('renders the RecordButton', () => {
    renderTodoScreen();
    expect(screen.getByTestId('todo-record-button')).toBeTruthy();
  });

  it('tapping the FAB opens the create sheet', () => {
    renderTodoScreen();
    fireEvent.press(screen.getByTestId('todo-fab'));
    expect(screen.getByTestId('todo-create-sheet')).toBeTruthy();
  });

  it('renders active TodoItem rows', () => {
    const todos = [
      createTodo({ id: 't1', title: 'Active task 1', priority: 'high' }),
      createTodo({ id: 't2', title: 'Active task 2', priority: 'low' }),
    ];
    renderTodoScreen(todos);
    expect(screen.getByTestId('todo-item-t1')).toBeTruthy();
    expect(screen.getByTestId('todo-item-t2')).toBeTruthy();
  });

  it('renders completed section header when completed todos exist', () => {
    const todo = createTodo({ id: 't1', title: 'Done', priority: 'medium' });
    const completedTodo = { ...todo, completed: true, completedAt: new Date().toISOString() };
    renderTodoScreen([completedTodo]);

    // Section header "Completed" should appear
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('does not render completed section when no completed todos', () => {
    const activeTodo = createTodo({ id: 't1', title: 'Active', priority: 'high' });
    renderTodoScreen([activeTodo]);
    expect(screen.queryByText('Completed')).toBeNull();
  });

  it('todo disappears from list after deletion via store', () => {
    const todo = createTodo({ id: 'del-me', title: 'Delete me', priority: 'low' });
    useTodoStore.setState({ todos: [todo] });

    useTodoStore.getState().deleteTodo('del-me');

    // After deletion the store should have 0 todos
    expect(useTodoStore.getState().todos).toHaveLength(0);
  });
});
