// Minimal stand-in for react-native-reanimated: same API surface the app uses, no native runtime
const React = require('react');
const RN = require('react-native');

// Animation builders are chainable: FadeInDown.duration(200).delay(50).springify()...
const builder = () => new Proxy(function () {}, { get: () => builder(), apply: () => builder() });
const identity = (v) => v;

const Animated = {
  View: RN.View,
  Text: RN.Text,
  ScrollView: RN.ScrollView,
  createAnimatedComponent: identity,
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue: (v) => React.useRef({ value: v }).current,
  useAnimatedStyle: (fn) => {
    try {
      return fn();
    } catch {
      return {};
    }
  },
  withTiming: identity,
  withSpring: identity,
  withDelay: (_d, v) => v,
  withSequence: (...v) => v[v.length - 1],
  withRepeat: identity,
  interpolate: (v, _i, out) => out[0],
  interpolateColor: (v, _i, out) => out[0],
  Easing: new Proxy({}, { get: () => () => identity }),
  FadeIn: builder(), FadeInDown: builder(), FadeOut: builder(), FadeOutDown: builder(), FadeOutRight: builder(), FadeOutUp: builder(),
  SlideInUp: builder(), SlideInLeft: builder(), SlideInRight: builder(), ZoomIn: builder(), LinearTransition: builder(),
};
