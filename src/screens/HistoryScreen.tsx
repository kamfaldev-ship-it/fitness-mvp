import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, EmptyState, ScreenTitle, useStyles } from '../components/ui';
import { calendarMonth, doneSetCount, fmtKg, workoutVolume } from '../stats';
import { useStore } from '../store';
import { Colors, font, space, tabular, useTheme } from '../theme';
import { RootStackParamList, Workout } from '../types';

export default function HistoryScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { history, draft, settings, startWorkout } = useStore();
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const s = useStyles(styles);
  const c = useTheme();

  const openWorkout = (id: string) => nav.navigate('WorkoutDetail', { id });

  const row = (w: Workout) => {
    const d = new Date(w.startedAt);
    return (
      <Pressable key={w.id} style={s.item} onPress={() => openWorkout(w.id)} accessibilityRole="button">
        <View style={s.dateBlock}>
          <Text style={s.day}>{d.getDate()}</Text>
          <Text style={s.month}>{d.toLocaleDateString('fr-FR', { month: 'short' })}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{w.name}</Text>
          <Text style={s.sub}>
            {w.exercises.length} exercices, {doneSetCount(w)} séries
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.vol}>{fmtKg(Math.round(workoutVolume(w)))}</Text>
          <Text style={s.sub}>{settings.unit}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Pressable>
    );
  };

  const empty = (
    <EmptyState
      icon="calendar-outline"
      title="Pas encore de séance"
      text="Tes séances terminées sont classées ici, de la plus récente à la plus ancienne."
      action={
        !draft ? (
          <Button
            title="Démarrer une séance"
            icon="add"
            onPress={() => {
              startWorkout();
              nav.navigate('Workout');
            }}
          />
        ) : undefined
      }
    />
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScreenTitle>Séances</ScreenTitle>
      <View style={s.modes}>
        <Chip label="Liste" active={mode === 'list'} onPress={() => setMode('list')} />
        <Chip label="Calendrier" active={mode === 'calendar'} onPress={() => setMode('calendar')} />
      </View>
      {mode === 'list' ? (
        <FlatList data={history} keyExtractor={(w) => w.id} contentContainerStyle={{ paddingHorizontal: space.md, paddingBottom: 40 }} ListEmptyComponent={empty} renderItem={({ item }) => row(item)} />
      ) : (
        <CalendarView history={history} row={row} />
      )}
    </SafeAreaView>
  );
}

function CalendarView({ history, row }: { history: Workout[]; row: (w: Workout) => React.ReactNode }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [selected, setSelected] = useState<number | null>(new Date().getDate());
  const [dir, setDir] = useState(1);
  const s = useStyles(styles);
  const c = useTheme();
  const cells = useMemo(() => calendarMonth(history, cursor.y, cursor.m), [history, cursor]);
  const today = new Date();
  const label = new Date(cursor.y, cursor.m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const move = (d: number) => {
    setDir(d);
    const n = new Date(cursor.y, cursor.m + d, 1);
    setCursor({ y: n.getFullYear(), m: n.getMonth() });
    setSelected(null);
  };
  const dayWorkouts = selected ? history.filter((w) => new Date(w.startedAt).toDateString() === new Date(cursor.y, cursor.m, selected).toDateString()) : [];
  // pad to full weeks so the grid keeps its shape
  const padded = [...cells, ...Array.from({ length: (7 - (cells.length % 7)) % 7 }, () => null)];
  const weeks = Array.from({ length: padded.length / 7 }, (_, i) => padded.slice(i * 7, i * 7 + 7));

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: space.md, paddingBottom: 40 }}>
      <View style={s.calHead}>
        <Pressable onPress={() => move(-1)} style={s.calNav} accessibilityRole="button" accessibilityLabel="Mois précédent">
          <Ionicons name="chevron-back" size={22} color={c.ink} />
        </Pressable>
        <Text style={s.calTitle} accessibilityRole="header">
          {label}
        </Text>
        <Pressable onPress={() => move(1)} style={s.calNav} accessibilityRole="button" accessibilityLabel="Mois suivant">
          <Ionicons name="chevron-forward" size={22} color={c.ink} />
        </Pressable>
      </View>
      <View style={s.weekRow}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <Text key={i} style={s.weekLetter}>
            {d}
          </Text>
        ))}
      </View>
      <Animated.View key={`${cursor.y}-${cursor.m}`} entering={(dir > 0 ? SlideInRight : SlideInLeft).duration(240)}>
      {weeks.map((wk, i) => (
        <View key={i} style={s.weekRow}>
          {wk.map((cell, j) => {
            if (!cell) return <View key={j} style={s.cell} />;
            const isToday = cursor.y === today.getFullYear() && cursor.m === today.getMonth() && cell.day === today.getDate();
            const active = selected === cell.day;
            return (
              <Pressable
                key={j}
                style={s.cell}
                onPress={() => setSelected(cell.day)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${cell.day} ${label}${cell.count ? `, ${cell.count} séance${cell.count > 1 ? 's' : ''}` : ''}`}
              >
                <View style={[s.disc, cell.count > 0 && { backgroundColor: c.primary }, !cell.count && isToday && { borderWidth: 2, borderColor: c.primary }, active && { borderWidth: 2, borderColor: c.ink }]}>
                  {cell.count > 0 && <View style={[s.hole, { backgroundColor: c.bg }]} />}
                </View>
                <Text style={[s.dayNum, isToday && { color: c.ink, fontFamily: font.semibold }]}>{cell.day}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      </Animated.View>
      <Animated.View key={`d-${selected}`} entering={FadeIn.duration(220)} style={{ marginTop: space.md }}>
        {selected && dayWorkouts.length === 0 && <Text style={s.sub}>Pas de séance ce jour-là.</Text>}
        {dayWorkouts.map((w) => row(w))}
      </Animated.View>
    </ScrollView>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  modes: { flexDirection: 'row' as const, gap: 8, paddingHorizontal: space.md, paddingVertical: 8 },
  item: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, minHeight: 72, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
  dateBlock: { width: 44, alignItems: 'center' as const },
  day: { color: c.ink, fontFamily: font.display, fontSize: 28, lineHeight: 30, fontVariant: tabular },
  month: { color: c.muted, fontFamily: font.medium, fontSize: 13 },
  title: { color: c.ink, fontFamily: font.semibold, fontSize: 17 },
  sub: { color: c.muted, fontFamily: font.body, fontSize: 14, marginTop: 1 },
  vol: { color: c.ink, fontFamily: font.display, fontSize: 24, lineHeight: 26, fontVariant: tabular },
  calHead: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 8 },
  calNav: { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  calTitle: { color: c.ink, fontFamily: font.display, fontSize: 28, textTransform: 'capitalize' as const },
  weekRow: { flexDirection: 'row' as const },
  weekLetter: { flex: 1, textAlign: 'center' as const, color: c.muted, fontFamily: font.medium, fontSize: 13, paddingBottom: 6 },
  cell: { flex: 1, alignItems: 'center' as const, minHeight: 56, paddingVertical: 4, gap: 2 },
  disc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center' as const, justifyContent: 'center' as const },
  hole: { width: 9, height: 9, borderRadius: 5 },
  dayNum: { color: c.muted, fontFamily: font.body, fontSize: 12 },
});
