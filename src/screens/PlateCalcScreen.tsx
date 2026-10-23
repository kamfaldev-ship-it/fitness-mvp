import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Chip, useStyles } from '../components/ui';
import { BARS, PLATE_COLORS, PLATES, computePlates } from '../plates';
import { useStore } from '../store';
import { Colors, font, space, tabular } from '../theme';
import { tidy } from '../units';

export default function PlateCalcScreen() {
  const { settings } = useStore();
  const { unit, step } = settings;
  const [target, setTarget] = useState('');
  const [bar, setBar] = useState(BARS[unit][0]);
  const s = useStyles(styles);

  const value = parseFloat(target.replace(',', '.')) || 0;
  const res = useMemo(() => computePlates(value, bar, PLATES[unit]), [value, bar, unit]);
  const biggest = PLATES[unit][0];
  const nudge = (d: number) => setTarget(tidy(Math.max(0, (value || bar) + d)));

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: space.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Charge totale ({unit})</Text>
      <View style={s.inputRow}>
        <Pressable style={s.nudge} onPress={() => nudge(-2 * step)} accessibilityRole="button" accessibilityLabel={`Retirer ${2 * step} ${unit}`}>
          <Text style={s.nudgeText}>−</Text>
        </Pressable>
        <TextInput
          value={target}
          onChangeText={setTarget}
          keyboardType="decimal-pad"
          placeholder={String(bar + 40)}
          placeholderTextColor="#8A93A0"
          style={s.input}
          maxFontSizeMultiplier={1.3}
          accessibilityLabel={`Charge totale en ${unit}`}
        />
        <Pressable style={s.nudge} onPress={() => nudge(2 * step)} accessibilityRole="button" accessibilityLabel={`Ajouter ${2 * step} ${unit}`}>
          <Text style={s.nudgeText}>+</Text>
        </Pressable>
      </View>

      <Text style={s.label}>Barre</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {BARS[unit].map((b) => (
          <Chip key={b} label={`${b} ${unit}`} active={bar === b} onPress={() => setBar(b)} />
        ))}
      </View>

      <Text style={[s.label, { marginTop: space.lg }]}>À charger de chaque côté</Text>
      {value <= 0 ? (
        <Text style={s.muted}>Saisis la charge totale, barre comprise.</Text>
      ) : res.tooLight ? (
        <Text style={s.muted}>La barre seule pèse déjà {bar} {unit}.</Text>
      ) : (
        <>
          <View style={s.bench} accessible accessibilityLabel={res.perSide.length ? `Par côté : ${res.perSide.join(', ')} ${unit}` : 'Barre seule'}>
            <View style={s.collar} />
            {res.perSide.map((p, i) => (
              <Animated.View key={`${p}-${i}`} entering={ZoomIn.delay(i * 90).springify().damping(11)} style={[s.plate, { height: 40 + (p / biggest) * 90, backgroundColor: PLATE_COLORS[String(p)] ?? '#8A93A0' }]}>
                <Text style={[s.plateText, { color: p === 5 ? '#16202B' : p === 15 || p === 35 ? '#16202B' : '#fff' }]}>{p}</Text>
              </Animated.View>
            ))}
            <View style={s.sleeve} />
          </View>
          <Animated.Text key={res.perSide.join('+')} entering={FadeIn.duration(250).delay(res.perSide.length * 90)} style={s.result}>{res.perSide.length ? res.perSide.join(' + ') : 'Barre seule'}</Animated.Text>
          {res.rest > 0 && (
            <Text style={[s.muted, { color: s.warn.color }]}>
              Reste {tidy(res.rest)} {unit} impossible à charger avec ces disques.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  label: { color: c.muted, fontFamily: font.medium, fontSize: 15, marginBottom: 8 },
  muted: { color: c.muted, fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  warn: { color: c.danger },
  inputRow: { flexDirection: 'row' as const, gap: 10, marginBottom: space.lg },
  nudge: { width: 56, minHeight: 56, borderRadius: 14, backgroundColor: c.surface, alignItems: 'center' as const, justifyContent: 'center' as const },
  nudgeText: { color: c.ink, fontFamily: font.display, fontSize: 32 },
  input: { flex: 1, minHeight: 56, borderRadius: 14, backgroundColor: c.surface, color: c.ink, textAlign: 'center' as const, fontFamily: font.display, fontSize: 36, fontVariant: tabular },
  bench: { flexDirection: 'row' as const, alignItems: 'center' as const, minHeight: 150, backgroundColor: c.surface, borderRadius: 18, paddingHorizontal: 12, gap: 3 },
  collar: { width: 10, height: 36, backgroundColor: '#8A93A0', borderRadius: 2 },
  sleeve: { flex: 1, height: 14, backgroundColor: '#B6BDC7', borderTopRightRadius: 7, borderBottomRightRadius: 7, minWidth: 24 },
  plate: { width: 22, borderRadius: 5, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  plateText: { fontFamily: font.displaySemi, fontSize: 12, transform: [{ rotate: '-90deg' as const }], width: 40, textAlign: 'center' as const },
  result: { color: c.ink, fontFamily: font.display, fontSize: 32, marginTop: space.md, fontVariant: tabular },
});
