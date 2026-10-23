import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, EmptyState, ExerciseThumb, Plate, SectionTitle, Stat, useStyles } from '../components/ui';
import { PressableScale } from '../motion';
import { getExercise } from '../data/exercises';
import { currentWeek, daysAgo, doneSetCount, fmtKg, suggestNext, weekStreak, workoutVolume } from '../stats';
import { useAllTemplates, useStore } from '../store';
import { Colors, font, space, useTheme } from '../theme';
import { RootStackParamList } from '../types';

export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { history, draft, settings, startWorkout } = useStore();
  const templates = useAllTemplates();
  const s = useStyles(styles);
  const c = useTheme();
  const week = currentWeek(history);
  const weekCount = week.filter((d) => d.filled).length;
  const goal = settings.weeklyGoal;
  const streak = weekStreak(history, goal);
  const weekVolume = history.filter((w) => new Date(w.startedAt).getTime() > Date.now() - 7 * 864e5).reduce((t, w) => t + workoutVolume(w), 0);
  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const suggestion = suggestNext(history, templates);

  const start = () => {
    startWorkout();
    nav.navigate('Workout');
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.top}>
          <Text style={s.date}>{dateLabel}</Text>
          <Pressable onPress={() => nav.navigate('Settings')} style={s.gear} accessibilityRole="button" accessibilityLabel="Réglages">
            <Ionicons name="settings-outline" size={24} color={c.ink} />
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={s.h1}>
          {draft ? 'Séance en cours' : 'On s’entraîne ?'}
        </Text>

        <Animated.View entering={FadeInDown.duration(380).delay(60)} style={s.week} accessible accessibilityLabel={`Cette semaine : ${weekCount} séances sur un objectif de ${goal}`}>
          <View style={s.weekDays}>
            {week.map((d, i) => (
              <Plate key={i} index={i} filled={d.filled} today={d.today} label={d.label} />
            ))}
          </View>
          <View style={s.goalRow}>
            <Text style={s.goalText}>
              {weekCount} sur {goal} cette semaine
            </Text>
            {streak > 0 && (
              <View style={s.streak}>
                <Ionicons name="flame" size={16} color="#F2B705" />
                <Text style={s.streakText}>
                  {streak} semaine{streak > 1 ? 's' : ''} de suite
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {draft ? (
          <Button title={`Reprendre « ${draft.name} »`} icon="play" onPress={() => nav.navigate('Workout')} />
        ) : (
          <>
            {suggestion && (
              <PressableScale scaleTo={0.98} style={s.today} onPress={() => nav.navigate('Template', { id: suggestion.next.id })} accessibilityRole="button" accessibilityLabel={`Séance suggérée : ${suggestion.next.name}`}>
                <View style={{ flex: 1 }}>
                  <Text style={s.todayKicker}>Aujourd’hui</Text>
                  <Text style={s.todayTitle}>{suggestion.next.name}</Text>
                  <Text style={s.todaySub}>
                    {suggestion.last ? `Après ${suggestion.last.name}, il y a ${daysAgo(suggestion.last.startedAt) <= 0 ? 'moins d’un jour' : daysAgo(suggestion.last.startedAt) + ' j'}` : suggestion.next.focus}
                  </Text>
                </View>
                <View style={s.thumbs}>
                  {suggestion.next.exercises.slice(0, 3).map((e, i) => {
                    const ex = getExercise(e.id);
                    return ex ? (
                      <View key={e.id} style={[s.thumb, { marginLeft: i === 0 ? 0 : -16 }]}>
                        <ExerciseThumb exercise={ex} size={44} radius={22} />
                      </View>
                    ) : null;
                  })}
                </View>
              </PressableScale>
            )}
            <Button title="Séance libre" variant="secondary" icon="add" onPress={start} style={{ marginTop: 12 }} />
          </>
        )}

        <View style={s.stats}>
          <Stat value={weekCount} unit={weekCount > 1 ? 'séances' : 'séance'} label="cette semaine" delay={200} />
          <Stat value={Math.round(weekVolume)} unit={settings.unit} label="soulevés sur 7 jours" delay={300} />
        </View>

        <SectionTitle>Séances types</SectionTitle>
        {templates.map((t) => (
          <Pressable key={t.id} style={s.item} onPress={() => nav.navigate('Template', { id: t.id })} accessibilityRole="button" accessibilityLabel={`${t.name}, ${t.focus}`}>
            <View style={s.thumbsSm}>
              {t.exercises.slice(0, 3).map((e, i) => {
                const ex = getExercise(e.id);
                return ex ? (
                  <View key={e.id + i} style={[s.thumbSm, { marginLeft: i === 0 ? 0 : -16 }]}>
                    <ExerciseThumb exercise={ex} size={36} radius={18} />
                  </View>
                ) : null;
              })}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitle}>{t.name}</Text>
              <Text style={s.itemSub}>{t.focus}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </Pressable>
        ))}

        <SectionTitle>Dernières séances</SectionTitle>
        {history.length === 0 ? (
          <EmptyState icon="barbell-outline" title="Aucune séance" text="Ta première séance apparaîtra ici avec son volume et ses séries." />
        ) : (
          history.slice(0, 4).map((w) => {
            const d = new Date(w.startedAt);
            return (
              <Pressable key={w.id} style={s.item} onPress={() => nav.navigate('WorkoutDetail', { id: w.id })} accessibilityRole="button">
                <View style={s.dateBlock}>
                  <Text style={s.day}>{d.getDate()}</Text>
                  <Text style={s.month}>{d.toLocaleDateString('fr-FR', { month: 'short' })}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{w.name}</Text>
                  <Text style={s.itemSub}>
                    {w.exercises.length} exercices, {doneSetCount(w)} séries, {fmtKg(Math.round(workoutVolume(w)))} {settings.unit}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: space.md, paddingBottom: 48 },
  top: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  gear: { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: -10 },
  date: { color: c.muted, fontFamily: font.medium, fontSize: 15, textTransform: 'capitalize' as const },
  h1: { color: c.ink, fontFamily: font.display, fontSize: 44, lineHeight: 48, marginBottom: space.md },
  week: { backgroundColor: c.surface, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16, marginBottom: space.md },
  weekDays: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  goalRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginTop: 14, flexWrap: 'wrap' as const, gap: 8 },
  goalText: { color: c.ink, fontFamily: font.semibold, fontSize: 15 },
  streak: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  streakText: { color: c.muted, fontFamily: font.medium, fontSize: 14 },
  today: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, backgroundColor: c.primary, borderRadius: 18, padding: 16, minHeight: 96 },
  todayKicker: { color: c.onPrimary, opacity: 0.8, fontFamily: font.medium, fontSize: 14 },
  todayTitle: { color: c.onPrimary, fontFamily: font.display, fontSize: 34, lineHeight: 38 },
  todaySub: { color: c.onPrimary, opacity: 0.85, fontFamily: font.body, fontSize: 14, marginTop: 2 },
  thumbs: { flexDirection: 'row' as const },
  thumb: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: c.primary, alignItems: 'center' as const, justifyContent: 'center' as const },
  stats: { flexDirection: 'row' as const, gap: space.md, marginTop: space.lg },
  item: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16, minHeight: 64, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line },
  thumbsSm: { flexDirection: 'row' as const, width: 88 },
  thumbSm: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: c.bg, alignItems: 'center' as const, justifyContent: 'center' as const },
  dateBlock: { width: 44, alignItems: 'center' as const },
  day: { color: c.ink, fontFamily: font.display, fontSize: 28, lineHeight: 30, fontVariant: ['tabular-nums' as const] },
  month: { color: c.muted, fontFamily: font.medium, fontSize: 13 },
  itemTitle: { color: c.ink, fontFamily: font.semibold, fontSize: 17 },
  itemSub: { color: c.muted, fontFamily: font.body, fontSize: 14, marginTop: 2 },
});
