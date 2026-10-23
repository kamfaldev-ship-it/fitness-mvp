import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useToast } from '../components/Toast';
import { Button, ExerciseThumb, useStyles } from '../components/ui';
import { exerciseName, getExercise, mediaUrl } from '../data/exercises';
import { useStore } from '../store';
import { Colors, font, space, tabular, useTheme } from '../theme';
import { RootStackParamList } from '../types';

function Stepper({ label, value, onChange, min = 1, max = 99 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const s = useStyles(styles);
  const c = useTheme();
  return (
    <View style={s.stepper} accessible accessibilityLabel={`${label} : ${value}`} accessibilityRole="adjustable" accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}>
      <Text style={s.stepLabel}>{label}</Text>
      <View style={s.stepRow}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={s.stepBtn} hitSlop={4}>
          <Ionicons name="remove" size={20} color={c.ink} />
        </Pressable>
        <Text style={s.stepVal}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={s.stepBtn} hitSlop={4}>
          <Ionicons name="add" size={20} color={c.ink} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TemplateEditScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = useRoute<RouteProp<RootStackParamList, 'TemplateEdit'>>().params;
  const { templates, updateTemplate } = useStore();
  const showToast = useToast();
  const s = useStyles(styles);
  const c = useTheme();
  const t = templates.find((x) => x.id === id);
  if (!t) return null;

  const setExercise = (i: number, patch: Partial<(typeof t.exercises)[number]>) =>
    updateTemplate(id, { exercises: t.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  const remove = (i: number) => {
    const before = t.exercises;
    updateTemplate(id, { exercises: before.filter((_, j) => j !== i) });
    showToast({ message: 'Exercice retiré', actionLabel: 'Annuler', onAction: () => updateTemplate(id, { exercises: before }) });
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: space.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Nom</Text>
      <TextInput value={t.name} onChangeText={(v) => updateTemplate(id, { name: v })} style={s.nameInput} placeholderTextColor={c.muted} accessibilityLabel="Nom du modèle" maxFontSizeMultiplier={1.3} />
      <Text style={s.label}>Description</Text>
      <TextInput value={t.focus} onChangeText={(v) => updateTemplate(id, { focus: v })} style={s.focusInput} placeholderTextColor={c.muted} accessibilityLabel="Description du modèle" />

      <Text style={[s.label, { marginTop: space.lg }]}>Exercices</Text>
      {t.exercises.length === 0 && <Text style={s.muted}>Aucun exercice. Ajoute-en pour pouvoir démarrer cette séance.</Text>}
      {t.exercises.map((e, i) => {
        const ex = getExercise(e.id);
        return (
          <View key={e.id + i} style={s.card}>
            <View style={s.cardHead}>
              {ex && <ExerciseThumb exercise={ex} size={48} />}
              <Text style={s.name}>{ex ? exerciseName(ex) : e.id}</Text>
              <Pressable onPress={() => remove(i)} hitSlop={8} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Retirer l’exercice du modèle">
                <Ionicons name="close" size={22} color={c.muted} />
              </Pressable>
            </View>
            <View style={s.steppers}>
              <Stepper label="Séries" value={e.sets} onChange={(n) => setExercise(i, { sets: n })} max={10} />
              <Stepper label="Répétitions" value={e.reps} onChange={(n) => setExercise(i, { reps: n })} max={100} />
            </View>
          </View>
        );
      })}
      <Button title="Ajouter un exercice" variant="secondary" icon="add" onPress={() => nav.navigate('Picker', { templateId: id })} />
      <Button title="Terminé" onPress={() => nav.goBack()} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  label: { color: c.muted, fontFamily: font.medium, fontSize: 15, marginBottom: 6 },
  muted: { color: c.muted, fontFamily: font.body, fontSize: 15, marginBottom: 12 },
  nameInput: { backgroundColor: c.surface, color: c.ink, borderRadius: 12, paddingHorizontal: 14, minHeight: 52, fontFamily: font.display, fontSize: 28, marginBottom: space.md },
  focusInput: { backgroundColor: c.surface, color: c.ink, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, fontFamily: font.body, fontSize: 16 },
  card: { backgroundColor: c.surface, borderRadius: 18, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  name: { flex: 1, color: c.ink, fontFamily: font.semibold, fontSize: 16, lineHeight: 20 },
  iconBtn: { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  steppers: { flexDirection: 'row' as const, gap: 16, marginTop: 8 },
  stepper: { flex: 1 },
  stepLabel: { color: c.muted, fontFamily: font.medium, fontSize: 13, marginBottom: 4 },
  stepRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, backgroundColor: c.bg, borderRadius: 12 },
  stepBtn: { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  stepVal: { color: c.ink, fontFamily: font.display, fontSize: 24, fontVariant: tabular },
});
