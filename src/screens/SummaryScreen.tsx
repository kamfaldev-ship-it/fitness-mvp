import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NameModal } from '../components/NameModal';
import { useToast } from '../components/Toast';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, SectionTitle, Stat, useStyles } from '../components/ui';
import { Confetti } from '../motion';
import { exerciseName, getExercise } from '../data/exercises';
import { doneSetCount, fmtDuration, fmtKg, workoutVolume } from '../stats';
import { useStore } from '../store';
import { Colors, font, space, tabular } from '../theme';
import { RootStackParamList } from '../types';

export default function SummaryScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = useRoute<RouteProp<RootStackParamList, 'Summary'>>().params;
  const { history, settings, saveTemplateFromWorkout } = useStore();
  const [naming, setNaming] = useState(false);
  const [saved, setSaved] = useState(false);
  const showToast = useToast();
  const s = useStyles(styles);
  const insets = useSafeAreaInsets();
  const w = history.find((x) => x.id === id);
  const records = w?.records ?? [];

  useEffect(() => {
    if (records.length) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [records.length]);

  if (!w) return null;
  const duration = w.endedAt ? Math.round((new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime()) / 1000) : 0;

  return (
    <View style={s.screen}>
      <Confetti count={records.length ? 44 : 20} />
      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: 120 + insets.bottom }}>
        <Text style={s.kicker}>Séance terminée</Text>
        <Text accessibilityRole="header" style={s.title}>
          {w.name}
        </Text>

        <View style={s.stats}>
          <Stat value={fmtDuration(duration)} label="durée" />
          <Stat value={Math.round(workoutVolume(w))} unit={settings.unit} label="volume" delay={150} />
          <Stat value={doneSetCount(w)} label="séries" delay={300} />
        </View>

        <SectionTitle>{records.length ? (records.length > 1 ? 'Records battus' : 'Record battu') : 'Records'}</SectionTitle>
        {records.length === 0 ? (
          <Text style={s.muted}>Pas de record cette fois. Chaque séance enregistrée te donne une référence pour la prochaine.</Text>
        ) : (
          records.map((r, i) => {
            const ex = getExercise(r.exerciseId);
            return (
              <Animated.View key={i} entering={FadeInDown.springify().damping(14).delay(500 + i * 140)} style={s.record}>
                <View style={s.trophy}>
                  <Ionicons name="trophy" size={20} color="#16202B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.recName}>{ex ? exerciseName(ex) : r.exerciseId}</Text>
                  <Text style={s.muted}>{r.kind === 'weight' ? 'Charge la plus lourde' : r.kind === 'time' ? 'Durée la plus longue' : '1RM estimé en hausse'}</Text>
                </View>
                <Text style={s.recVal}>{r.kind === 'time' ? fmtDuration(r.reps) : `${fmtKg(r.weight)} ${settings.unit} × ${r.reps}`}</Text>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button
          title={saved ? 'Modèle enregistré' : 'Enregistrer comme modèle'}
          variant="secondary"
          icon={saved ? 'checkmark' : 'bookmark-outline'}
          onPress={() => !saved && setNaming(true)}
        />
        <Button title="Terminé" onPress={() => nav.popTo('Tabs')} style={{ marginTop: 10 }} />
      </View>

      <NameModal
        visible={naming}
        title="Nom du modèle"
        initial={w.name}
        onCancel={() => setNaming(false)}
        onSubmit={(name) => {
          saveTemplateFromWorkout(w, name);
          setNaming(false);
          setSaved(true);
          showToast({ message: `Modèle « ${name} » ajouté aux séances types` });
        }}
      />
    </View>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  kicker: { color: c.success, fontFamily: font.semibold, fontSize: 16 },
  title: { color: c.ink, fontFamily: font.display, fontSize: 44, lineHeight: 48 },
  stats: { flexDirection: 'row' as const, gap: space.md, marginTop: space.lg },
  muted: { color: c.muted, fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  record: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 64, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line },
  trophy: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F2B705', alignItems: 'center' as const, justifyContent: 'center' as const },
  recName: { color: c.ink, fontFamily: font.semibold, fontSize: 16 },
  recVal: { color: c.ink, fontFamily: font.display, fontSize: 24, fontVariant: tabular },
  bar: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: space.md, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line },
});
