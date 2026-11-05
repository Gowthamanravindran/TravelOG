/* Reanimated 4 runs its JS implementation in tests (Plan 28). */
require('react-native-reanimated').setUpTests();

// Gesture-handler asks worklets for the UI runtime to install native bindings; there is
// no UI thread in Jest, and the JS build of worklets refuses that call.
jest.mock('react-native-worklets', () => ({
  ...jest.requireActual('react-native-worklets'),
  getUIRuntimeHolder: () => ({}),
}));
