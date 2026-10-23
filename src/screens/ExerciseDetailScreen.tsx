import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Alert } from 'react-native';
import React, { useLayoutEffect, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, SectionTitle, useStyles } from '../components/ui';
import { ATTRIBUTION, bodyPartLabel, equipmentLabel, exerciseName, getExercise, hasFrenchName, mediaUrl, muscleLabel } from '../data/exercises';
import { exerciseSessions, fmtDate, fmtDuration, fmtKg } from '../stats';
import { useStore } from '../store';
import { Colors, font, space, tabular, useTheme } from '../theme';
import { RootStackParamList } from '../types';

export default function ExerciseDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = useRoute<RouteProp<RootStackParamList, 'ExerciseDetail'>>().params;
  const { history, templates, favorites, settings, toggleFavorite, addExercise, deleteCustomExercise } = useStore();
  const c = useTheme();
  const fav = favorites.includes(id);
  const s = useStyles(styles);
  const insets = useSafeAreaInsets();
  const ex = getExercise(id);

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <Pressable onPress={() => toggleFavorite(id)} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityState={{ selected: fav }} accessibilityLabel={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
          <Ionicons name={fav ? 'star' : 'star-outline'} size={24} color={fav ? '#F2B705' : c.muted} />
        </Pressable>
      ),
    });
  }, [nav, fav, id, c.muted, toggleFavorite]);
  const sessions = useMemo(() => exerciseSessions(history).get(id) ?? [], [history, id]);
  const timedHistory = sessions[0]?.timed;
  if (!ex) return null;

  const record = sessions.reduce((m, x) => Math.max(m, timedHistory ? x.reps : x.maxWeight), 0);
  const steps = ex.steps.fr?.length ? ex.steps.fr : ex.steps.en;
  const facts: [string, string][] = [
    ...(ex.custom ? [] : ([['Muscle ciblé', muscleLabel(ex.target)]] as [string, string][])),
    ['Zone', bodyPartLabel(ex.bodyPart)],
    ...(ex.mode === 'time' ? ([['Mesure', 'Durée']] as [string, string][]) : []),
    ['Matériel', equipmentLabel(ex.equipment)],
    ...(ex.secondary.length ? ([['Muscles associés', ex.secondary.map(muscleLabel).join(', ')]] as [string, string][]) : []),
  ];

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 110 + insets.bottom }]}>
        {ex.custom ? (
          <View style={[s.gif, s.noGif]}>
            <Ionicons name={ex.mode === 'time' ? 'timer-outline' : 'barbell-outline'} size={64} color={c.muted} />
            <Text style={s.attr}>Exercice personnel, sans démonstration</Text>
          </View>
        ) : (
          <>
            <Image source={{ uri: mediaUrl(ex.gif) }} style={s.gif} contentFit="contain" transition={250} accessibilityLabel={`Démonstration : ${exerciseName(ex)}`} />
            <Text style={s.attr}>{ATTRIBUTION}</Text>
          </>
        )}
        <Text accessibilityRole="header" style={s.title}>
          {exerciseName(ex)}
        </Text>
        {hasFrenchName(ex) && <Text style={s.original}>{ex.name}</Text>}

        {facts.map(([k, v]) => (
          <View key={k} style={s.fact}>
            <Text style={s.factKey}>{k}</Text>
            <Text style={s.factVal}>{v}</Text>
          </View>
        ))}

        {steps.length > 0 && <SectionTitle>Exécution</SectionTitle>}
        {steps.map((st, i) => (
          <View key={i} style={s.step}>
            <Text style={s.stepNum}>{i + 1}</Text>
            <Text style={s.stepText}>{st}</Text>
          </View>
        ))}

        {sessions.length > 0 && (
          <>
            <SectionTitle>Ta progression</SectionTitle>
            <View style={s.record}>
              <Ionicons name="trophy" size={20} color="#16202B" />
              <Text style={s.recordText}>Record : {timedHistory ? fmtDuration(record) : `${fmtKg(record)} ${settings.unit}`}</Text>
            </View>
            {sessions
              .slice(-5)
              .reverse()
              .map((x, i) => (
                <View key={i} style={s.fact}>
                  <Text style={s.factKey}>{fmtDate(x.date)}</Text>
                  <Text style={s.factVal}>
                    {timedHistory ? fmtDuration(x.reps) : `${fmtKg(x.maxWeight)} ${settings.unit} × ${x.reps}`}
                  </Text>
                </View>
              ))}
          </>
        )}
        {ex.custom && (
          <Button
            title="Supprimer cet exercice"
            variant="danger"
            icon="trash-outline"
            style={{ marginTop: space.lg }}
            onPress={() => {
              const used = history.some((w) => w.exercises.some((e) => e.exerciseId === id)) || templates.some((t) => t.exercises.some((e) => e.id === id));
              if (used) {
                Alert.alert('Exercice utilisé', 'Cet exercice apparaît dans une séance ou un modèle. Retire-le d’abord de ces séances pour le supprimer.');
                return;
              }
              deleteCustomExercise(id);
              nav.goBack();
            }}
          />
        )}
      </ScrollView>
      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button
          title="Ajouter à ma séance"
          icon="add"
          onPress={() => {
            addExercise(ex.id);
            nav.popTo('Workout');
          }}
        />
      </View>
    </View>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: space.md },
  gif: { width: '100%' as const, maxWidth: 340, aspectRatio: 1, alignSelf: 'center' as const, backgroundColor: '#fff', borderRadius: 18 },
  original: { color: c.muted, fontFamily: font.body, fontSize: 14, marginBottom: 4 },
  noGif: { backgroundColor: c.surface, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  attr: { color: c.muted, fontSize: 11, fontFamily: font.body, textAlign: 'center' as const, marginTop: 6 },
  title: { color: c.ink, fontFamily: font.display, fontSize: 36, lineHeight: 40, marginTop: space.md, marginBottom: space.sm },
  fact: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
  factKey: { color: c.muted, fontFamily: font.body, fontSize: 15 },
  factVal: { color: c.ink, fontFamily: font.semibold, fontSize: 15, flexShrink: 1, textAlign: 'right' as const, fontVariant: tabular },
  step: { flexDirection: 'row' as const, gap: 14, marginBottom: 14 },
  stepNum: { color: c.primary, fontFamily: font.display, fontSize: 24, width: 24, lineHeight: 26, fontVariant: tabular },
  stepText: { color: c.ink, flex: 1, fontFamily: font.body, fontSize: 16, lineHeight: 24 },
  record: { alignSelf: 'flex-start' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, backgroundColor: '#F2B705', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  recordText: { color: '#16202B', fontFamily: font.display, fontSize: 20 },
  bar: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: space.md, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line },
});
