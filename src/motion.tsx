import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, PressableProps, StyleProp, Text, TextStyle, useWindowDimensions, View, ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

// Animations are skipped when the user asked iOS to reduce motion
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

// One spring for everything that answers a touch, so the whole app feels the same
export const SPRING = { damping: 14, stiffness: 380, mass: 0.6 };
export const POP = { damping: 9, stiffness: 260, mass: 0.7 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Pressable that squeezes slightly under the finger and springs back
export function PressableScale({ scaleTo = 0.96, style, onPressIn, onPressOut, children, ...rest }: Omit<PressableProps, 'style'> & { scaleTo?: number; style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

// Numbers that count up to their value (stats, volume). Plain text when reduced motion is on.
export function CountUp({ value, decimals = 0, duration = 700, style, suffix, delay = 0 }: { value: number; decimals?: number; duration?: number; style?: StyleProp<TextStyle>; suffix?: React.ReactNode; delay?: number }) {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const start = from.current;
    let raf = 0;
    let t0 = 0;
    const timer = setTimeout(() => {
      const tick = (t: number) => {
        if (!t0) t0 = t;
        const p = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = start + (value - start) * eased;
        setShown(v);
        if (p < 1) raf = requestAnimationFrame(tick);
        else from.current = value;
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay, reduce]);
  const text = decimals ? shown.toFixed(decimals) : String(Math.round(shown));
  return (
    <Text style={style} accessibilityLabel={String(value)}>
      {text}
      {suffix}
    </Text>
  );
}

const CONFETTI = ['#D7263D', '#1F5FBF', '#F2B705', '#1E9E5A', '#F4F4F4'];

function Piece({ x, size, color, delay, drift, spin, fall }: { x: number; size: number; color: string; delay: number; drift: number; spin: number; fall: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: fall, easing: Easing.out(Easing.quad) }));
  }, [p, delay, fall]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.08, 0.75, 1], [0, 1, 1, 0]),
    transform: [{ translateY: interpolate(p.value, [0, 1], [-30, 520]) }, { translateX: interpolate(p.value, [0, 1], [0, drift]) }, { rotate: `${interpolate(p.value, [0, 1], [0, spin])}deg` }],
  }));
  return <Animated.View style={[{ position: 'absolute', top: 0, left: x, width: size, height: size * 0.5, borderRadius: 2, backgroundColor: color }, style]} />;
}

// A short burst of plate-coloured confetti, played once
export function Confetti({ count = 28 }: { count?: number }) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        size: 8 + Math.random() * 8,
        color: CONFETTI[i % CONFETTI.length],
        delay: Math.random() * 500,
        drift: (Math.random() - 0.5) * 140,
        spin: (Math.random() - 0.5) * 900,
        fall: 1500 + Math.random() * 900,
      })),
    [count, width],
  );
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 560, overflow: 'hidden' }}>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} />
      ))}
    </View>
  );
}
