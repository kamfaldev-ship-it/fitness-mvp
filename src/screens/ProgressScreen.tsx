import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from '../components/LineChart';
import { useToast } from '../components/Toast';
import { BarChart, Button, Chip, EmptyState, ScreenTitle, SectionTitle, Stat, useStyles } from '../components/ui';
import { exerciseName, getExercise } from '../data/exercises';
import { exerciseSessions, fmtDate, fmtDuration, fmtKg, weeklyCounts, workoutVolume } from '../stats';
import { useStore } from '../store';
import { BodyEntry } from '../types';
import { Colors, font, space, tabular, useTheme } from '../theme';

export default function ProgressScreen() {
  const [tab, setTab] = useState<'lifts' | 'body'>('lifts');
  const s = useStyles(styles);
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <ScreenTitle>Progression</ScreenTitle>
        <View style={s.tabs}>
          <Chip label="Charges" active={tab === 'lifts'} onPress={() => setTab('lifts')} />
          <Chip label="Corps" active={tab === 'body'} onPress={() => setTab('body')} />
        </View>
        {tab === 'lifts' ? <Lifts /> : <Body />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Lifts() {
  const { history, settings } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const s = useStyles(styles);
  const unit = settings.unit;

  const weeks = useMemo(() => weeklyCounts(history, 8), [history]);
  const sessions = useMemo(() => exerciseSessions(history), [history]);
  const totalVolume = history.reduce((t, w) => t + workoutVolume(w), 0);
  const performed = [...sessions.keys()];
  const current = selected && sessions.has(selected) ? selected : performed[0] ?? null;
  const series = current ? sessions.get(current)!.slice(-8) : [];
  const timed = !!series[0]?.timed;
  const val = (x: (typeof series)[number]) => (timed ? x.reps : x.maxWeight);
  const record = series.length ? Math.max(...series.map(val)) : 0;
  const best1rm = series.length ? Math.max(...series.map((x) => x.e1rm)) : 0;
  const gain = (series.length ? val(series[series.length - 1]) : 0) - (series.length ? val(series[0]) : 0);

  return (
    <>
      <View style={s.pad}>
        <View style={s.row}>
          <Stat value={history.length} label="séances" />
          <Stat value={fmtKg(Math.round(totalVolume / 1000))} unit={unit === 'kg' ? 't' : 'k lb'} label="soulevées au total" />
        </View>

        <SectionTitle>Régularité</SectionTitle>
        <View style={s.panel}>
          <BarChart data={weeks.map((w) => ({ label: w.label, value: w.count }))} highlightLast />
        </View>
        <Text style={s.caption}>Séances par semaine, 8 dernières semaines</Text>

        <SectionTitle>Charge par exercice</SectionTitle>
      </View>

      {performed.length === 0 ? (
        <EmptyState icon="stats-chart-outline" title="Rien à suivre pour l’instant" text="Termine une séance avec des séries validées pour voir l’évolution de tes charges." />
      ) : (
        <>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={performed}
            keyExtractor={(id) => id}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: space.md, gap: 8, paddingBottom: space.md }}
            renderItem={({ item: id }) => {
              const ex = getExercise(id);
              return <Chip label={ex ? exerciseName(ex) : id} active={id === current} onPress={() => setSelected(id)} />;
            }}
          />
          <View style={s.pad}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <View style={s.badge}>
                  <Ionicons name="trophy" size={14} color="#16202B" />
                  <Text style={s.badgeText}>Record</Text>
                </View>
                {timed ? <Stat value={fmtDuration(record)} label="sur les 8 dernières séances" /> : <Stat value={fmtKg(record)} unit={unit} label="sur les 8 dernières séances" />}
              </View>
              {timed ? <Stat value={series.length ? fmtDuration(val(series[series.length - 1])) : '0:00'} label="dernière séance" /> : <Stat value={fmtKg(Math.round(best1rm))} unit={unit} label="1RM estimé" />}
            </View>
            {series.length > 1 && <Text style={s.gain}>{gain === 0 ? (timed ? 'Durée stable' : 'Charge stable') : `${gain > 0 ? '+' : ''}${timed ? `${gain} s` : `${fmtKg(gain)} ${unit}`} depuis le ${fmtDate(series[0].date)}`}</Text>}
            <View style={[s.panel, { marginTop: space.md }]}>
              <BarChart highlightLast data={series.map((x) => ({ label: new Date(x.date).getDate() + '/' + (new Date(x.date).getMonth() + 1), value: val(x) }))} />
            </View>
            <Text style={s.caption}>{timed ? 'Meilleure durée par séance, en secondes' : `Charge maximale par séance, en ${unit}`}</Text>
          </View>
        </>
      )}
    </>
  );
}

const FIELDS: { key: Exclude<keyof BodyEntry, 'id' | 'date'>; label: string }[] = [
  { key: 'weight', label: 'Poids' },
  { key: 'waist', label: 'Taille' },
  { key: 'chest', label: 'Poitrine' },
  { key: 'arm', label: 'Bras' },
  { key: 'thigh', label: 'Cuisse' },
];

function Body() {
  const { bodyLog, settings, addBodyEntry, deleteBodyEntry } = useStore();
  const showToast = useToast();
  const [vals, setVals] = useState<Record<string, string>>({});
  const s = useStyles(styles);
  const c = useTheme();
  const unit = settings.unit;
  const toNum = (v?: string) => {
    const n = parseFloat((v ?? '').replace(',', '.'));
    return Number.isNaN(n) ? undefined : n;
  };
  const filled = FIELDS.some((f) => toNum(vals[f.key]) !== undefined);

  const sorted = useMemo(() => [...bodyLog].sort((a, b) => a.date.localeCompare(b.date)), [bodyLog]);
  const weights = sorted.filter((b) => b.weight != null).slice(-12);
  const delta = weights.length > 1 ? weights[weights.length - 1].weight! - weights[0].weight! : 0;

  const save = () => {
    const entry: Omit<BodyEntry, 'id'> = { date: new Date().toISOString() };
    for (const f of FIELDS) {
      const n = toNum(vals[f.key]);
      if (n !== undefined) entry[f.key] = n;
    }
    addBodyEntry(entry);
    setVals({});
    showToast({ message: 'Mesure enregistrée' });
  };

  const remove = (b: BodyEntry) => {
    deleteBodyEntry(b.id);
    showToast({ message: 'Mesure supprimée', actionLabel: 'Annuler', onAction: () => addBodyEntry({ date: b.date, weight: b.weight, waist: b.waist, chest: b.chest, arm: b.arm, thigh: b.thigh }) });
  };

  return (
    <View style={s.pad}>
      <SectionTitle>Nouvelle mesure</SectionTitle>
      <View style={s.fields}>
        {FIELDS.map((f) => (
          <View key={f.key} style={s.field}>
            <Text style={s.fieldLabel}>
              {f.label} ({f.key === 'weight' ? unit : 'cm'})
            </Text>
            <TextInput
              value={vals[f.key] ?? ''}
              onChangeText={(v) => setVals((p) => ({ ...p, [f.key]: v }))}
              keyboardType="decimal-pad"
              placeholder="–"
              placeholderTextColor={c.muted}
              style={s.fieldInput}
              maxFontSizeMultiplier={1.3}
              accessibilityLabel={`${f.label}, en ${f.key === 'weight' ? unit : 'centimètres'}`}
            />
          </View>
        ))}
      </View>
      <Button title="Enregistrer" icon="checkmark" onPress={() => filled && save()} style={{ opacity: filled ? 1 : 0.4, marginTop: 4 }} />

      <SectionTitle>Poids</SectionTitle>
      {weights.length === 0 ? (
        <Text style={s.caption}>Ajoute ton poids pour voir sa courbe.</Text>
      ) : (
        <>
          <View style={s.panel}>
            <LineChart data={weights.map((b) => ({ label: new Date(b.date).getDate() + '/' + (new Date(b.date).getMonth() + 1), value: b.weight! }))} unit={unit} />
          </View>
          {weights.length > 1 && (
            <Text style={s.gain}>
              {delta === 0 ? 'Poids stable' : `${delta > 0 ? '+' : ''}${fmtKg(Math.round(delta * 10) / 10)} ${unit} depuis le ${fmtDate(weights[0].date)}`}
            </Text>
          )}
        </>
      )}

      <SectionTitle>Historique</SectionTitle>
      {sorted.length === 0 && <Text style={s.caption}>Aucune mesure pour l’instant.</Text>}
      {[...sorted].reverse().slice(0, 12).map((b) => (
        <View key={b.id} style={s.entry}>
          <View style={{ flex: 1 }}>
            <Text style={s.entryDate}>{fmtDate(b.date)}</Text>
            <Text style={s.caption}>
              {[b.weight != null && `${fmtKg(b.weight)} ${unit}`, b.waist != null && `taille ${b.waist}`, b.chest != null && `poitrine ${b.chest}`, b.arm != null && `bras ${b.arm}`, b.thigh != null && `cuisse ${b.thigh}`].filter(Boolean).join(', ')}
            </Text>
          </View>
          <Pressable onPress={() => remove(b)} style={s.del} accessibilityRole="button" accessibilityLabel={`Supprimer la mesure du ${fmtDate(b.date)}`}>
            <Ionicons name="trash-outline" size={20} color={c.muted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  tabs: { flexDirection: 'row' as const, gap: 8, paddingHorizontal: space.md, paddingBottom: 8 },
  pad: { paddingHorizontal: space.md },
  row: { flexDirection: 'row' as const, gap: space.md },
  panel: { backgroundColor: c.surface, borderRadius: 18, padding: 14 },
  caption: { color: c.muted, fontFamily: font.body, fontSize: 13, marginTop: 6, lineHeight: 18 },
  badge: { alignSelf: 'flex-start' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#F2B705', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  badgeText: { color: '#16202B', fontFamily: font.semibold, fontSize: 13 },
  gain: { color: c.success, fontFamily: font.semibold, fontSize: 15, marginTop: space.md, fontVariant: tabular },
  fields: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12, marginBottom: 8 },
  field: { width: '47%' as const },
  fieldLabel: { color: c.muted, fontFamily: font.medium, fontSize: 13, marginBottom: 4 },
  fieldInput: { backgroundColor: c.surface, color: c.ink, borderRadius: 12, minHeight: 50, textAlign: 'center' as const, fontFamily: font.display, fontSize: 26, fontVariant: tabular },
  entry: { flexDirection: 'row' as const, alignItems: 'center' as const, minHeight: 60, borderBottomWidth: 1, borderBottomColor: c.line },
  entryDate: { color: c.ink, fontFamily: font.semibold, fontSize: 16, textTransform: 'capitalize' as const },
  del: { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
});
