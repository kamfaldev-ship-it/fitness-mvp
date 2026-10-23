import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useEffect, useMemo } from 'react';
import { ImageStyle, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { CountUp, POP, PressableScale, useReduceMotion } from '../motion';
import { bodyPartLabel, equipmentLabel, exerciseName, mediaUrl } from '../data/exercises';
import { Colors, font, space, tabular, useTheme } from '../theme';
import { Exercise } from '../types';

export { useReduceMotion };

export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const select = () => Haptics.selectionAsync().catch(() => {});

export function useStyles<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(make: (c: Colors) => T): T {
  const c = useTheme();
  return useMemo(() => StyleSheet.create(make(c)), [c]);
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const c = useTheme();
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? c.danger : c.ink;
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      scaleTo={0.97}
      style={[
        {
          minHeight: 52,
          borderRadius: 14,
          paddingHorizontal: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: variant === 'primary' ? c.primary : 'transparent',
          borderWidth: variant === 'primary' ? 0 : 1.5,
          borderColor: variant === 'danger' ? c.danger : c.line,
        },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={20} color={fg} />}
      <Text style={{ color: fg, fontSize: 17, fontFamily: font.semibold }}>{title}</Text>
    </PressableScale>
  );
}

export function ScreenTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontFamily: font.display, fontSize: 40, lineHeight: 44 }}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const c = useTheme();
  return (
    <Text accessibilityRole="header" style={{ color: c.ink, fontFamily: font.display, fontSize: 24, marginTop: space.xl, marginBottom: space.sm }}>
      {children}
    </Text>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; action?: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xl, paddingHorizontal: space.lg, gap: 8 }}>
      <Ionicons name={icon} size={36} color={c.muted} />
      <Text style={{ color: c.ink, fontFamily: font.display, fontSize: 24 }}>{title}</Text>
      <Text style={{ color: c.muted, fontFamily: font.body, fontSize: 16, textAlign: 'center', lineHeight: 22, maxWidth: 300 }}>{text}</Text>
      {action && <View style={{ marginTop: 12, alignSelf: 'stretch' }}>{action}</View>}
    </View>
  );
}

// Exercise picture, or an icon tile for the user's own exercises (they have no media)
export function ExerciseThumb({ exercise, size = 54, radius = 10 }: { exercise: Exercise; size?: number; radius?: number }) {
  const c = useTheme();
  if (exercise.image) {
    return <Image source={{ uri: mediaUrl(exercise.image) }} style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#fff' }} contentFit="cover" transition={200} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: c.sunken, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={exercise.mode === 'time' ? 'timer-outline' : 'barbell-outline'} size={size * 0.46} color={c.muted} />
    </View>
  );
}

export const ROW_HEIGHT = 76;

export function ExerciseRow({ exercise, onPress, onAdd }: { exercise: Exercise; onPress: () => void; onAdd?: () => void }) {
  const s = useStyles(rowStyles);
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${exerciseName(exercise)}, ${bodyPartLabel(exercise.bodyPart)}`}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: c.sunken }]}
    >
      <ExerciseThumb exercise={exercise} />
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={2}>
          {exerciseName(exercise)}
        </Text>
        <Text style={s.sub} numberOfLines={1}>
          {bodyPartLabel(exercise.bodyPart)}, {equipmentLabel(exercise.equipment).toLowerCase()}
          {exercise.custom ? ' · perso' : ''}
        </Text>
      </View>
      {onAdd ? (
        <PressableScale
          scaleTo={0.88}
          onPress={() => {
            tap();
            onAdd();
          }}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`Ajouter ${exercise.name} à la séance`}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={26} color={c.onPrimary} />
        </PressableScale>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      )}
    </Pressable>
  );
}

const rowStyles = (c: Colors) => ({
  row: { minHeight: ROW_HEIGHT, paddingVertical: 8, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, paddingHorizontal: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  title: { color: c.ink, fontSize: 16, fontFamily: font.semibold, lineHeight: 20 },
  sub: { color: c.muted, fontSize: 14, fontFamily: font.body, marginTop: 2 },
});

// A big condensed number with a plain label, no box around it. Plain numbers count up.
export function Stat({ value, unit, label, delay = 0 }: { value: string | number; unit?: string; label: string; delay?: number }) {
  const c = useTheme();
  const text = { color: c.ink, fontFamily: font.display, fontSize: 40, lineHeight: 44, fontVariant: tabular };
  const numeric = typeof value === 'number' ? value : /^\d+(\.\d+)?$/.test(value) ? parseFloat(value) : null;
  const decimals = typeof value === 'string' && value.includes('.') ? value.split('.')[1].length : 0;
  const unitEl = unit ? <Text style={{ fontSize: 20, color: c.muted }}> {unit}</Text> : undefined;
  return (
    <View style={{ flex: 1 }} accessible accessibilityLabel={`${value} ${unit ?? ''} ${label}`}>
      {numeric !== null ? (
        <CountUp value={numeric} decimals={decimals} style={text} suffix={unitEl} delay={delay} />
      ) : (
        <Text style={text}>
          {value}
          {unitEl}
        </Text>
      )}
      <Text style={{ color: c.muted, fontFamily: font.body, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

// A plate seen from the side: filled disc with its center hole. Pops in, staggered by `index`.
export function Plate({ filled, today, label, index = 0 }: { filled: boolean; today?: boolean; label: string; index?: number }) {
  const c = useTheme();
  const reduce = useReduceMotion();
  const scale = useSharedValue(reduce ? 1 : 0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    scale.value = withDelay(120 + index * 70, withSpring(1, POP));
    // today's empty ring breathes: a quiet "this one is for you"
    if (today && !filled) pulse.value = withDelay(900, withRepeat(withSequence(withTiming(0.35, { duration: 900 }), withTiming(1, { duration: 900 })), -1));
  }, [reduce, index, today, filled, scale, pulse]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: today && !filled ? pulse.value : 1 }));
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Animated.View
        style={[
          {
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: filled ? c.primary : 'transparent',
            borderWidth: filled ? 0 : 2,
            borderColor: today ? c.primary : c.line,
          },
          anim,
        ]}
      >
        {filled && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.surface }} />}
      </Animated.View>
      <Text style={{ color: today ? c.ink : c.muted, fontFamily: today ? font.semibold : font.body, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

function Bar({ frac, last, index, color }: { frac: number; last: boolean; index: number; color: string }) {
  const reduce = useReduceMotion();
  const grow = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    grow.value = reduce ? 1 : withDelay(index * 60, withSpring(1, { damping: 14, stiffness: 120 }));
  }, [reduce, index, grow, frac]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));
  return <Animated.View style={[{ width: '100%', height: `${frac * 100}%`, minHeight: 3, borderRadius: 4, backgroundColor: color, transformOrigin: 'bottom' }, anim]} />;
}

export function BarChart({ data, highlightLast }: { data: { label: string; value: number }[]; highlightLast?: boolean }) {
  const c = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ flexDirection: 'row', height: 150, alignItems: 'flex-end', gap: 8 }} accessible accessibilityLabel={data.map((d) => `${d.label}: ${d.value}`).join(', ')}>
      {data.map((d, i) => {
        const last = !!highlightLast && i === data.length - 1;
        return (
          <View key={i} style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ color: c.ink, fontFamily: font.displaySemi, fontSize: 15, height: 20, fontVariant: tabular }}>{d.value || ''}</Text>
            <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
              <Bar frac={d.value / max} last={last} index={i} color={last ? c.primary : c.isDark ? '#3A5B94' : '#9DB8E4'} />
            </View>
            <Text style={{ color: c.muted, fontFamily: font.body, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useTheme();
  const on = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, on]);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [c.bg, c.ink]),
    borderColor: interpolateColor(on.value, [0, 1], [c.line, c.ink]),
  }));
  const txt = useAnimatedStyle(() => ({ color: interpolateColor(on.value, [0, 1], [c.ink, c.bg]) }));
  return (
    <PressableScale
      onPress={() => {
        if (!active) select();
        onPress();
      }}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={[{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 22, borderWidth: 1.5 }, box]}>
        <Animated.Text style={[{ fontFamily: font.semibold, fontSize: 15 }, txt]}>{label}</Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}
