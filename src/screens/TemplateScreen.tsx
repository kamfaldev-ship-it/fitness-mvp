import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../components/Toast';
import { Button, ExerciseThumb, useStyles } from '../components/ui';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { bodyPartLabel, equipmentLabel, exerciseName, getExercise, mediaUrl } from '../data/exercises';
import { useAllTemplates, useStore } from '../store';
import { Colors, font, space, tabular } from '../theme';
import { RootStackParamList } from '../types';

export default function TemplateScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = useRoute<RouteProp<RootStackParamList, 'Template'>>().params;
  const { startFromTemplate, saveTemplate, deleteTemplate, restoreTemplate } = useStore();
  const templates = useAllTemplates();
  const showToast = useToast();
  const s = useStyles(styles);
  const insets = useSafeAreaInsets();
  const t = templates.find((x) => x.id === id);

  // deleted -> leave
  React.useEffect(() => {
    if (!t && nav.canGoBack()) nav.goBack();
  }, [t, nav]);
  if (!t) return null;

  const totalSets = t.exercises.reduce((n, e) => n + e.sets, 0);

  const start = () => {
    if (startFromTemplate(t)) {
      nav.navigate('Workout');
    } else {
      Alert.alert('Séance en cours', 'Termine ou abandonne ta séance en cours avant d’en démarrer une autre.', [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Reprendre la séance', onPress: () => nav.navigate('Workout') },
      ]);
    }
  };

  const duplicate = () => {
    const newId = saveTemplate(`${t.name} (copie)`, t.exercises.map((e) => ({ ...e })), t.focus);
    nav.replace('TemplateEdit', { id: newId });
  };

  const remove = () => {
    const snapshot = t;
    deleteTemplate(t.id);
    showToast({ message: `« ${t.name} » supprimé`, actionLabel: 'Annuler', onAction: () => restoreTemplate(snapshot) });
  };

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: 110 + insets.bottom }}>
        <Text accessibilityRole="header" style={s.title}>
          {t.name}
        </Text>
        <Text style={s.focus}>{t.focus}</Text>
        <Text style={s.meta}>
          {t.exercises.length} exercices, {totalSets} séries
        </Text>

        <View style={s.actions}>
          {t.custom ? (
            <>
              <Button title="Modifier" variant="secondary" icon="create-outline" onPress={() => nav.navigate('TemplateEdit', { id: t.id })} style={{ flex: 1 }} />
              <Button title="Supprimer" variant="danger" icon="trash-outline" onPress={remove} style={{ flex: 1 }} />
            </>
          ) : (
            <Button title="Dupliquer pour modifier" variant="secondary" icon="copy-outline" onPress={duplicate} style={{ flex: 1 }} />
          )}
        </View>

        {t.exercises.map((e, i) => {
          const ex = getExercise(e.id);
          if (!ex) return null;
          return (
            <Pressable key={e.id + i} style={s.row} onPress={() => nav.navigate('ExerciseDetail', { id: ex.id })} accessibilityRole="link" accessibilityLabel={`Voir la fiche de ${exerciseName(ex)}`}>
              {ex.gif ? <Image source={{ uri: mediaUrl(ex.gif) }} style={s.gif} contentFit="cover" transition={200} /> : <ExerciseThumb exercise={ex} size={72} radius={12} />}
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{exerciseName(ex)}</Text>
                <Text style={s.sub}>
                  {bodyPartLabel(ex.bodyPart)}, {equipmentLabel(ex.equipment).toLowerCase()}
                </Text>
              </View>
              <Text style={s.scheme}>
                {e.sets} × {e.reps}
              </Text>
            </Pressable>
          );
        })}
        <Text style={s.hint}>Tu pourras modifier les charges, les répétitions et les exercices pendant la séance.</Text>
      </ScrollView>
      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title="Démarrer cette séance" icon="play" onPress={start} />
      </View>
    </View>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  title: { color: c.ink, fontFamily: font.display, fontSize: 40, lineHeight: 44 },
  focus: { color: c.ink, fontFamily: font.medium, fontSize: 17, marginTop: 2 },
  meta: { color: c.muted, fontFamily: font.body, fontSize: 14, marginTop: 4, marginBottom: space.md },
  actions: { flexDirection: 'row' as const, gap: 10, marginBottom: space.sm },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
  gif: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#fff' },
  name: { color: c.ink, fontFamily: font.semibold, fontSize: 17, lineHeight: 21 },
  sub: { color: c.muted, fontFamily: font.body, fontSize: 14, marginTop: 2 },
  scheme: { color: c.ink, fontFamily: font.display, fontSize: 24, fontVariant: tabular },
  hint: { color: c.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginTop: space.md },
  bar: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: space.md, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line },
});
