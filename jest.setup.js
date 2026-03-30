/**
 * jest.setup.js
 *
 * Jest global setup file — runs before every test suite.
 *
 * Sets up native module mocks that are required for React Native
 * components to render in the Jest (Node.js) environment.
 *
 * Why react-native-gesture-handler/jestSetup?
 *   GestureHandlerRootView calls a native install() function at mount time.
 *   In the test environment there is no native module, so it throws.
 *   This setup file provides a mock that makes the call a no-op.
 *
 * DEBUG TIP: If tests fail with "install is not a function", verify this
 * file is referenced in the jest.setupFiles config in package.json.
 */

// Provides mock implementations for all gesture handler native modules.
// Must be the first thing imported in the setup chain.
require('react-native-gesture-handler/jestSetup');
