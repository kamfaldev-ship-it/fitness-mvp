import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useToast } from '../components/Toast';
import { Button, Chip, useStyles } from '../components/ui';
import { BODY_PARTS } from '../data/exercises';
import { useStore } from '../store';
import { Colors, font, space, useTheme } from '../theme';
import { RootStackParamList } from '../types';

const EQUIPMENT: { key: string; label: string }[] = [
  { key: 'body weight', label: 'Poids du corps' },
  { key: 'dumbbell', label: 'Haltères' },
  { key: 'barbell', label: 'Barre' },
  { key: 'cable', label: 'Poulie' },
  { key: 'leverage machine', label: 'Machine' },
  { key: 'kettlebell', label: 'Kettlebell' },
  { key: 'band', label: 'Élastique' },
  { key: 'other', label: 'Autre' },
];

export default function CustomExerciseScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addCustomExercise } = useStore();
  const showToast = useToast();
  const s = useStyles(styles);
  const c = useTheme();
  const [name, setName] = useState('');
  const [bodyPart, setBodyPart] = useState('chest');
  const [equipment, setEquipment] = useState('body weight');
  const [timed, setTimed] = useState(false);
  const ok = name.trim().length > 0;

  const save = () => {
    if (!ok) return;
    const id = addCustomExercise({ name, bodyPart, equipment, timed });
    showToast({ message: `« ${name.trim()} » ajouté à tes exercices` });
    nav.replace('ExerciseDetail', { id });
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: space.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Nom</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Ex : Tractions lestées" placeholderTextColor={c.muted} autoFocus style={s.input} accessibilityLabel="Nom de l’exercice" maxFontSizeMultiplier={1.3} />

      <Text style={s.label}>Zone du corps</Text>
      <View style={s.chips}>
        {Object.keys(BODY_PARTS).map((k) => (
          <Chip key={k} label={BODY_PARTS[k]} active={bodyPart === k} onPress={() => setBodyPart(k)} />
        ))}
      </View>

      <Text style={s.label}>Matériel</Text>
      <View style={s.chips}>
        {EQUIPMENT.map((e) => (
          <Chip key={e.key} label={e.label} active={equipment === e.key} onPress={() => setEquipment(e.key)} />
        ))}
      </View>

      <Text style={s.label}>Se mesure en</Text>
      <View style={s.chips}>
        <Chip label="Répétitions" active={!timed} onPress={() => setTimed(false)} />
        <Chip label="Durée" active={timed} onPress={() => setTimed(true)} />
      </View>
      <Text style={s.hint}>{timed ? 'Chaque série enregistre un temps, par exemple 45 secondes de gainage.' : 'Chaque série enregistre une charge et un nombre de répétitions.'}</Text>

      <Button title="Créer l’exercice" icon="checkmark" onPress={save} style={{ marginTop: space.lg, opacity: ok ? 1 : 0.4 }} />
    </ScrollView>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  label: { color: c.muted, fontFamily: font.medium, fontSize: 15, marginTop: space.md, marginBottom: 8 },
  input: { backgroundColor: c.surface, color: c.ink, borderRadius: 14, paddingHorizontal: 14, minHeight: 54, fontFamily: font.semibold, fontSize: 18 },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  hint: { color: c.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: 8 },
});
