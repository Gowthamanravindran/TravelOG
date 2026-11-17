/* Reanimated 4 runs its JS implementation in tests (Plan 28). */
require('react-native-reanimated').setUpTests();

// Gesture-handler asks worklets for the UI runtime to install native bindings; there is
// no UI thread in Jest, and the JS build of worklets refuses that call.
jest.mock('react-native-worklets', () => ({
  ...jest.requireActual('react-native-worklets'),
  getUIRuntimeHolder: () => ({}),
}));

// The globe's web view (Plan 66): a plain view in tests. `mockWebViews` holds every mounted one, so a
// test can read what was injected (`injected`) and send page messages (`props.onMessage`).
global.mockWebViews = [];
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef((props, ref) => {
    const self = React.useRef({ props, injected: [] });
    self.current.props = props;
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: (js) => self.current.injected.push(js),
    }));
    React.useEffect(() => {
      const entry = self.current;
      global.mockWebViews.push(entry);
      return () => {
        global.mockWebViews.splice(global.mockWebViews.indexOf(entry), 1);
      };
    }, []);
    return React.createElement(View, { testID: 'webview' });
  });
  return { WebView, default: WebView };
});
