import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { NameModal } from '../components/NameModal';
import { useToast } from '../components/Toast';
import { Button, Stat, useStyles } from '../components/ui';
import { exerciseName, getExercise } from '../data/exercises';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { KIND_LABEL, doneSetCount, fmtDate, fmtDuration, fmtKg, fmtSet, workoutVolume } from '../stats';
import { useStore } from '../store';
import { Colors, font, space, tabular } from '../theme';
import { RootStackParamList } from '../types';

export default function WorkoutDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = useRoute<RouteProp<RootStackParamList, 'WorkoutDetail'>>().params;
  const { history, draft, settings, startWorkout, editWorkout, deleteWorkout, restoreWorkout, saveTemplateFromWorkout } = useStore();
  const [naming, setNaming] = useState(false);
  const showToast = useToast();
  const s = useStyles(styles);
  const w = history.find((x) => x.id === id);

  // deleted -> leave
  React.useEffect(() => {
    if (!w && nav.canGoBack()) nav.goBack();
  }, [w, nav]);
  if (!w) return null;

  const duration = w.endedAt ? Math.round((new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime()) / 1000) : 0;

  const repeat = () => {
    if (draft) {
      Alert.alert('Séance en cours', 'Termine ou abandonne ta séance en cours avant d’en démarrer une autre.');
      return;
    }
    startWorkout(w);
    nav.navigate('Workout');
  };

  const edit = () => {
    if (!editWorkout(w.id)) {
      Alert.alert('Séance en cours', 'Termine ou abandonne ta séance en cours avant d’en modifier une autre.');
      return;
    }
    nav.navigate('Workout');
  };

  const remove = () => {
    const snapshot = w;
    deleteWorkout(w.id);
    showToast({ message: 'Séance supprimée', actionLabel: 'Annuler', onAction: () => restoreWorkout(snapshot) });
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: space.md, paddingBottom: 48 }}>
      <Text style={s.date}>{fmtDate(w.startedAt)}</Text>
      <Text accessibilityRole="header" style={s.title}>
        {w.name}
      </Text>
      <View style={s.stats}>
        <Stat value={fmtKg(Math.round(workoutVolume(w)))} unit={settings.unit} label="volume" />
        <Stat value={doneSetCount(w)} label="séries" />
        <Stat value={fmtDuration(duration)} label="durée" />
      </View>

      {w.exercises.map((we, i) => {
        const ex = getExercise(we.exerciseId);
        const rec = w.records?.find((r) => r.exerciseId === we.exerciseId);
        return (
          <Animated.View key={i} entering={FadeInDown.duration(300).delay(i * 60)} style={s.block}>
            <View style={s.blockHead}>
              <Text style={s.exName}>{ex ? exerciseName(ex) : we.exerciseId}</Text>
              {rec && (
                <View style={s.badge} accessible accessibilityLabel="Record battu">
                  <Ionicons name="trophy" size={14} color="#16202B" />
                  <Text style={s.badgeText}>Record</Text>
                </View>
              )}
            </View>
            {we.superset && <Text style={s.superset}>Superset avec l’exercice suivant</Text>}
            {we.sets.map((st, j) => (
              <View key={j} style={s.set}>
                <Text style={s.setNum}>{j + 1}</Text>
                <Text style={s.setVal}>{fmtSet(st, we.timed, settings.unit)}</Text>
                {(!!st.kind && st.kind !== 'normal') || !!st.rpe ? (
                  <Text style={s.tag}>
                    {[st.kind && st.kind !== 'normal' ? KIND_LABEL[st.kind] : '', st.rpe ? `RPE ${st.rpe}` : ''].filter(Boolean).join(', ')}
                  </Text>
                ) : null}
              </View>
            ))}
            {!!we.note && <Text style={s.note}>{we.note}</Text>}
          </Animated.View>
        );
      })}
      <Button title="Modifier la séance" icon="create-outline" onPress={edit} style={{ marginTop: space.md }} />
      <Button title="Refaire cette séance" variant="secondary" icon="repeat" onPress={repeat} style={{ marginTop: 12 }} />
      <Button title="Enregistrer comme modèle" variant="secondary" icon="bookmark-outline" onPress={() => setNaming(true)} style={{ marginTop: 12 }} />
      <Button title="Supprimer la séance" variant="danger" onPress={remove} style={{ marginTop: 12 }} />

      <NameModal
        visible={naming}
        title="Nom du modèle"
        initial={w.name}
        onCancel={() => setNaming(false)}
        onSubmit={(name) => {
          saveTemplateFromWorkout(w, name);
          setNaming(false);
          showToast({ message: `Modèle « ${name} » ajouté aux séances types` });
        }}
      />
    </ScrollView>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  date: { color: c.muted, fontFamily: font.medium, fontSize: 15, textTransform: 'capitalize' as const },
  title: { color: c.ink, fontFamily: font.display, fontSize: 40, lineHeight: 44 },
  stats: { flexDirection: 'row' as const, gap: space.md, marginVertical: space.lg },
  block: { backgroundColor: c.surface, borderRadius: 18, padding: 14, marginBottom: 12 },
  blockHead: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8, marginBottom: 6 },
  exName: { flex: 1, color: c.ink, fontFamily: font.semibold, fontSize: 17 },
  badge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#F2B705', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#16202B', fontFamily: font.semibold, fontSize: 13 },
  superset: { color: c.primary, fontFamily: font.medium, fontSize: 13, marginBottom: 4 },
  set: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, minHeight: 36 },
  setNum: { color: c.muted, fontFamily: font.displaySemi, fontSize: 20, width: 22, textAlign: 'center' as const },
  setVal: { color: c.ink, fontFamily: font.displaySemi, fontSize: 22, fontVariant: tabular },
  tag: { color: c.muted, fontFamily: font.medium, fontSize: 13 },
  note: { color: c.muted, fontFamily: font.body, fontSize: 15, lineHeight: 21, marginTop: 8 },
});
