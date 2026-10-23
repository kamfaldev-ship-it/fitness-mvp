import React, { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { font, tabular, useTheme } from '../theme';

// Simple trend line: min/max on the left, first and last label under the axis
export function LineChart({ data, unit, height = 170 }: { data: { label: string; value: number }[]; unit: string; height?: number }) {
  const c = useTheme();
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  if (data.length === 0) return null;

  const padX = 8;
  const padY = 14;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (data.length === 1 ? w / 2 : padX + (i * (w - 2 * padX)) / (data.length - 1));
  const y = (v: number) => padY + (1 - (v - min) / span) * (height - 2 * padY);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const summary = `Courbe de ${data.length} mesures, de ${data[0].value} à ${data[data.length - 1].value} ${unit}`;

  return (
    <View onLayout={onLayout} accessible accessibilityLabel={summary}>
      {w > 0 && (
        <Animated.View entering={FadeIn.duration(500)}>
        <Svg width={w} height={height}>
          <Line x1={padX} x2={w - padX} y1={y(min)} y2={y(min)} stroke={c.line} strokeWidth={1} />
          <Line x1={padX} x2={w - padX} y1={y(max)} y2={y(max)} stroke={c.line} strokeWidth={1} />
          {data.length > 1 && <Polyline points={pts} fill="none" stroke={c.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />}
          {data.map((d, i) => (
            <Circle key={i} cx={x(i)} cy={y(d.value)} r={i === data.length - 1 ? 6 : 3.5} fill={c.primary} />
          ))}
        </Svg>
        </Animated.View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: c.muted, fontFamily: font.body, fontSize: 12 }}>{data[0].label}</Text>
        <Text style={{ color: c.ink, fontFamily: font.displaySemi, fontSize: 14, fontVariant: tabular }}>
          {min} à {max} {unit}
        </Text>
        <Text style={{ color: c.muted, fontFamily: font.body, fontSize: 12 }}>{data[data.length - 1].label}</Text>
      </View>
    </View>
  );
}
