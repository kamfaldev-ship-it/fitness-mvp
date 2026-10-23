import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, InputAccessoryView, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut, FadeOutDown, FadeOutRight, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RestEditor } from '../components/RestEditor';
import { useToast } from '../components/Toast';
import { Button, EmptyState, ExerciseThumb, tap, useStyles } from '../components/ui';
import { bodyPartLabel, exerciseName, getExercise, muscleLabel } from '../data/exercises';
import { showMenu } from '../menu';
import { POP, PressableScale, SPRING } from '../motion';
import { cancelRestEnd, scheduleRestEnd } from '../rest';
import { restAfter } from '../restRules';
import { KIND_BADGE, KIND_LABEL, countsForRecord, fmtDuration, fmtSet, lastSets, num, priorBest, recordKind } from '../stats';
import { useStore } from '../store';
import { Colors, font, space, tabular, useTheme } from '../theme';
import { tidy } from '../units';
import { RootStackParamList, SetKind, SetLog } from '../types';

const ACCESSORY_ID = 'weightAccessory';
const KIND_COLOR: Record<string, string> = { warmup: '#F2B705', drop: '#7A5CFA', failure: '#D7263D' };

// Check button: pops, and sends out a ring when the set gets validated
function CheckButton({ done, onPress, label }: { done: boolean; onPress: () => void; label: string }) {
  const s = useStyles(styles);
  const c = useTheme();
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (done) {
      scale.value = withSequence(withTiming(0.78, { duration: 70 }), withSpring(1, POP));
      ring.value = 0;
      ring.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    } else {
      scale.value = withSpring(1, SPRING);
    }
  }, [done, scale, ring]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const burst = useAnimatedStyle(() => ({ opacity: (1 - ring.value) * 0.7, transform: [{ scale: 1 + ring.value * 0.9 }] }));
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={label}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 48, height: 48, borderRadius: 12, borderWidth: 3, borderColor: c.success }, burst]} />
      <Animated.View style={[s.check, done && { backgroundColor: c.success }, pop]}>
        <Ionicons name="checkmark" size={26} color={done ? c.onSuccess : c.muted} />
      </Animated.View>
    </Pressable>
  );
}

// Trophy that bounces in when a set becomes a record
function Trophy() {
  const sc = useSharedValue(0);
  useEffect(() => {
    sc.value = withSpring(1, { damping: 6, stiffness: 220 });
  }, [sc]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }, { rotate: `${(1 - sc.value) * -25}deg` }] }));
  return (
    <Animated.View style={a}>
      <Ionicons name="trophy" size={18} color="#F2B705" />
    </Animated.View>
  );
}

export default function WorkoutScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { draft, history, settings, favorites, setSettings, toggleFavorite, addSet, updateSet, removeSet, removeExercise, moveExercise, updateExercise, renameDraft, setRest, finishWorkout, discardWorkout, restoreDraft } = useStore();
  const [now, setNow] = useState(Date.now());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(1000);
  const [restEdit, setRestEdit] = useState<{ mode: 'default' } | { mode: 'set'; ei: number; si: number } | null>(null);
  const [focus, setFocus] = useState<{ ei: number; si: number } | null>(null);
  const [running, setRunning] = useState<{ key: string; startedAt: number } | null>(null);
  const finishing = useRef(false);
  const progress = useSharedValue(1);
  const showToast = useToast();
  const s = useStyles(styles);
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { restSeconds, unit, step } = settings;
  const editing = !!draft?.editingId;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Workout was discarded -> leave (finishing navigates elsewhere on its own)
  useEffect(() => {
    if (!draft && !finishing.current && nav.canGoBack()) nav.goBack();
  }, [draft, nav]);

  // Rest is stored as an end timestamp so it stays correct if the app is backgrounded
  useEffect(() => {
    if (restEnd && now >= restEnd) {
      setRestEnd(null);
      cancelRestEnd();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [now, restEnd]);

  // The bar drains linearly: each second it animates to where it will be one second later
  useEffect(() => {
    if (restEnd) progress.value = withTiming(Math.min(1, Math.max(0, (restEnd - now - 1000) / restTotal)), { duration: 1000, easing: Easing.linear });
  }, [now, restEnd, restTotal, progress]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  // leaving the screen (finish / discard) drops any pending reminder
  useEffect(() => () => void cancelRestEnd(), []);

  // What the user did last time and their best, per exercise of the workout
  const ids = draft?.exercises.map((e) => e.exerciseId).join(',') ?? '';
  const refs = useMemo(() => {
    const m = new Map<string, { last: ReturnType<typeof lastSets>; prior: ReturnType<typeof priorBest> }>();
    for (const id of ids.split(',').filter(Boolean)) m.set(id, { last: lastSets(history, id), prior: priorBest(history, id) });
    return m;
  }, [ids, history]);

  const startRest = (end: number) => {
    const total = Math.max(1000, end - Date.now());
    setRestTotal((t) => (restEnd && end > restEnd ? Math.max(t, total) : total));
    if (!restEnd) progress.value = 1;
    setRestEnd(end);
    scheduleRestEnd((end - Date.now()) / 1000);
  };
  const adjustRest = (deltaMs: number) => {
    if (!restEnd) return;
    const end = Math.max(Date.now() + 1000, restEnd + deltaMs);
    setRestTotal((t) => Math.max(1000, t + (end - restEnd)));
    setRestEnd(end);
    scheduleRestEnd((end - Date.now()) / 1000);
  };
  const skipRest = () => {
    setRestEnd(null);
    cancelRestEnd();
  };

  if (!draft) return null;
  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  const restInitial = restEdit?.mode === 'set' ? restAfter(draft.exercises[restEdit.ei]?.sets[restEdit.si] ?? {}, restSeconds) : restSeconds;
  const elapsed = Math.max(0, Math.floor((now - new Date(draft.startedAt).getTime()) / 1000));
  const doneSets = draft.exercises.reduce((t, e) => t + e.sets.filter((x) => x.done).length, 0);

  const submitRest = (seconds: number, scope: string) => {
    if (!restEdit) return;
    if (restEdit.mode === 'default') {
      setSettings({ restSeconds: seconds });
      // "whole workout" also drops per-set overrides so every set follows the new default
      if (scope === 'all') setRest({ scope: 'all' }, undefined);
    } else {
      setRest({ scope: scope as 'set' | 'exercise' | 'all', exIdx: restEdit.ei, setIdx: restEdit.si }, seconds);
    }
    setRestEdit(null);
  };

  const finish = () => {
    finishing.current = true;
    const id = finishWorkout();
    if (id) {
      if (editing) nav.goBack();
      else nav.replace('Summary', { id });
    } else {
      finishing.current = false;
      Alert.alert('Rien à enregistrer', 'Valide au moins une série avec le bouton ✓ avant de terminer.');
    }
  };

  const discard = () =>
    Alert.alert(editing ? 'Annuler les modifications ?' : 'Abandonner la séance ?', editing ? 'La séance enregistrée reste telle qu’elle était.' : 'Les séries saisies seront perdues.', [
      { text: 'Continuer', style: 'cancel' },
      { text: editing ? 'Annuler les modifications' : 'Abandonner', style: 'destructive', onPress: discardWorkout },
    ]);

  const undoable = (message: string, action: () => void) => {
    const snapshot = draft;
    action();
    showToast({ message, actionLabel: 'Annuler', onAction: () => restoreDraft(snapshot) });
  };

  const stepWeight = (delta: number) => {
    if (!focus) return;
    const cur = num(draft.exercises[focus.ei]?.sets[focus.si]?.weight ?? '');
    updateSet(focus.ei, focus.si, { weight: tidy(Math.max(0, cur + delta)) });
  };
  const fillLast = () => {
    if (!focus) return;
    const ex = draft.exercises[focus.ei];
    const l = refs.get(ex.exerciseId)?.last;
    const ref = l?.sets[focus.si] ?? l?.sets[l.sets.length - 1];
    if (ref) updateSet(focus.ei, focus.si, { weight: ref.weight, reps: ref.reps });
  };

  // Validate / un-validate a set. Validating starts its rest and checks for a record.
  const toggleDone = (ei: number, si: number, forceReps?: string) => {
    const we = draft.exercises[ei];
    const st = we.sets[si];
    const becoming = !st.done;
    tap();
    updateSet(ei, si, { done: becoming, ...(forceReps !== undefined ? { reps: forceReps } : {}) });
    if (!becoming) return;
    if (!editing) {
      const rest = restAfter(st, restSeconds);
      if (rest > 0) startRest(Date.now() + rest * 1000);
      else skipRest();
    }
    const reps = forceReps !== undefined ? num(forceReps) : num(st.reps);
    if (countsForRecord({ ...st, done: true }) && recordKind(refs.get(we.exerciseId)?.prior ?? null, num(st.weight), reps, !!we.timed)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const toggleTimer = (ei: number, si: number, key: string) => {
    if (running?.key === key) {
      const secs = Math.max(1, Math.floor((Date.now() - running.startedAt) / 1000));
      setRunning(null);
      toggleDone(ei, si, String(secs));
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setRunning({ key, startedAt: Date.now() });
    }
  };

  const openExerciseMenu = (ei: number) => {
    const we = draft.exercises[ei];
    const ex = getExercise(we.exerciseId);
    showMenu(ex ? exerciseName(ex) : 'Exercice', [
      ...(ei > 0 ? [{ label: 'Monter', onPress: () => moveExercise(ei, -1) }] : []),
      ...(ei < draft.exercises.length - 1 ? [{ label: 'Descendre', onPress: () => moveExercise(ei, 1) }] : []),
      { label: 'Remplacer l’exercice', onPress: () => nav.navigate('Picker', { replaceIndex: ei }) },
      { label: we.timed ? 'Mesurer en répétitions' : 'Mesurer en durée', onPress: () => updateExercise(ei, { timed: !we.timed }) },
      { label: 'Retirer l’exercice', destructive: true, onPress: () => undoable('Exercice retiré', () => removeExercise(ei)) },
    ]);
  };

  const openSetMenu = (ei: number, si: number) => {
    const st = draft.exercises[ei].sets[si];
    const setKind = (kind: SetKind) => updateSet(ei, si, { kind: kind === 'normal' ? undefined : kind });
    showMenu(`Série ${si + 1}`, [
      ...(['normal', 'warmup', 'drop', 'failure'] as SetKind[]).map((k) => ({ label: `${KIND_LABEL[k]}${(st.kind ?? 'normal') === k ? ' ✓' : ''}`, onPress: () => setKind(k) })),
      { label: st.rpe ? `Effort ressenti : ${st.rpe} (modifier)` : 'Effort ressenti (RPE)', onPress: () => openRpeMenu(ei, si) },
    ], 'Les échauffements ne comptent ni dans le volume ni dans les records. Les dégressives comptent dans le volume, pas dans les records.');
  };

  const openRpeMenu = (ei: number, si: number) =>
    showMenu('Effort ressenti', [
      ...[6, 7, 8, 9, 10].map((n) => ({ label: `RPE ${n}${n === 10 ? ' (impossible d’en faire une de plus)' : n === 6 ? ' (très facile)' : ''}`, onPress: () => updateSet(ei, si, { rpe: n }) })),
      { label: 'Aucun', onPress: () => updateSet(ei, si, { rpe: undefined }) },
    ]);

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: (restEnd && !editing ? 200 : 120) + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={s.head}>
          <TextInput value={draft.name} onChangeText={renameDraft} style={s.name} placeholderTextColor={c.muted} accessibilityLabel="Nom de la séance" maxFontSizeMultiplier={1.3} />
          {editing ? (
            <View style={s.timer} accessible accessibilityLabel="Modification d’une séance enregistrée">
              <Ionicons name="create-outline" size={16} color={c.primary} />
              <Text style={[s.timerText, { color: c.primary, fontSize: 16 }]} maxFontSizeMultiplier={1.3}>Modification</Text>
            </View>
          ) : (
            <View style={s.timer} accessible accessibilityLabel={`Durée ${fmtDuration(elapsed)}`}>
              <Ionicons name="time-outline" size={16} color={c.ink} />
              <Text style={s.timerText} maxFontSizeMultiplier={1.3}>{fmtDuration(elapsed)}</Text>
            </View>
          )}
        </View>

        <View style={s.tools}>
          {!editing && (
            <PressableScale onPress={() => setRestEdit({ mode: 'default' })} style={s.tool} accessibilityRole="button" accessibilityLabel={`Repos par défaut : ${fmtDuration(restSeconds)}. Appuie pour le modifier.`}>
              <Ionicons name="hourglass-outline" size={18} color={c.ink} />
              <Text style={s.toolText}>Repos par défaut {fmtDuration(restSeconds)}</Text>
            </PressableScale>
          )}
          <PressableScale onPress={() => nav.navigate('PlateCalc')} style={s.tool} accessibilityRole="button" accessibilityLabel="Ouvrir le calculateur de disques">
            <Ionicons name="calculator-outline" size={18} color={c.ink} />
            <Text style={s.toolText}>Disques</Text>
          </PressableScale>
        </View>

        {draft.exercises.length === 0 && (
          <EmptyState icon="barbell-outline" title="Séance vide" text="Ajoute un exercice, puis saisis la charge et les répétitions de chaque série." />
        )}

        {draft.exercises.map((we, ei) => {
          const ex = getExercise(we.exerciseId);
          const ref = refs.get(we.exerciseId);
          const linkedPrev = ei > 0 && draft.exercises[ei - 1].superset;
          const linked = we.superset || linkedPrev;
          const fav = favorites.includes(we.exerciseId);
          const timed = !!we.timed;
          return (
            <Animated.View key={we.key ?? String(ei)} layout={LinearTransition.springify().damping(20)} entering={FadeInDown.duration(280)} exiting={FadeOut.duration(150)} style={[s.card, linked && s.cardLinked]}>
              {linked && <Text style={s.superLabel}>Superset</Text>}
              <View style={s.cardHead}>
                <Pressable style={s.exLink} onPress={() => nav.navigate('ExerciseDetail', { id: we.exerciseId })} accessibilityRole="link" accessibilityLabel={`Voir la fiche de ${ex ? exerciseName(ex) : ''}`}>
                  {ex && <ExerciseThumb exercise={ex} size={56} />}
                  <View style={{ flex: 1 }}>
                    <Text style={s.exName}>{ex ? exerciseName(ex) : we.exerciseId}</Text>
                    {ex && (
                      <Text style={s.exSub}>
                        {bodyPartLabel(ex.bodyPart)}
                        {ex.custom ? '' : `, ${muscleLabel(ex.target).toLowerCase()}`}
                        {timed ? ' · durée' : ''}
                      </Text>
                    )}
                  </View>
                </Pressable>
                <Pressable onPress={() => toggleFavorite(we.exerciseId)} hitSlop={8} style={s.iconBtn} accessibilityRole="button" accessibilityState={{ selected: fav }} accessibilityLabel={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                  <Ionicons name={fav ? 'star' : 'star-outline'} size={22} color={fav ? '#F2B705' : c.muted} />
                </Pressable>
                <Pressable onPress={() => openExerciseMenu(ei)} hitSlop={8} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Options de l’exercice : déplacer, remplacer, retirer">
                  <Ionicons name="ellipsis-horizontal" size={22} color={c.muted} />
                </Pressable>
              </View>

              {ref?.last && (
                <Text style={s.lastTime}>
                  Dernière fois{timed ? '' : ` (${unit})`} : {ref.last.sets.map((x) => fmtSet(x, ref.last!.timed, unit)).join(', ')}
                </Text>
              )}

              <View style={s.setRow}>
                <Text style={[s.th, { width: 30 }]}>Série</Text>
                <Text style={[s.th, s.flex]}>{unit}</Text>
                <Text style={[s.th, s.flex]}>{timed ? 'Durée (s)' : 'Reps'}</Text>
                {timed && <View style={{ width: 44 }} />}
                <View style={{ width: 48 }} />
                <View style={{ width: 28 }} />
              </View>
              {we.sets.map((st: SetLog, si) => {
                const prev = ref?.last?.sets[si] ?? ref?.last?.sets[ref.last.sets.length - 1];
                const rec = countsForRecord(st) ? recordKind(ref?.prior ?? null, num(st.weight), num(st.reps), timed) : null;
                const rest = restAfter(st, restSeconds);
                const k = `${we.key ?? ei}:${st.key ?? si}`;
                const live = running?.key === k ? String(Math.max(0, Math.floor((now - running.startedAt) / 1000))) : null;
                const badge = st.kind && st.kind !== 'normal' ? KIND_BADGE[st.kind] : '';
                return (
                  <Animated.View key={st.key ?? String(si)} layout={LinearTransition.springify().damping(20)} entering={FadeInDown.duration(220)} exiting={FadeOutRight.duration(180)}>
                    <View style={s.setRow}>
                      <Pressable
                        onPress={() => openSetMenu(ei, si)}
                        hitSlop={6}
                        style={{ width: 30, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                        accessibilityRole="button"
                        accessibilityLabel={`Série ${si + 1}${st.kind && st.kind !== 'normal' ? `, ${KIND_LABEL[st.kind]}` : ''}${rec ? ', nouveau record' : ''}${st.rpe ? `, RPE ${st.rpe}` : ''}. Appuie pour changer le type ou l’effort ressenti.`}
                      >
                        {rec ? (
                          <Trophy />
                        ) : badge ? (
                          <View style={[s.kindBadge, { backgroundColor: KIND_COLOR[st.kind!] }]}>
                            <Text style={s.kindText}>{badge}</Text>
                          </View>
                        ) : (
                          <Text style={s.setNum}>{si + 1}</Text>
                        )}
                      </Pressable>
                      <TextInput
                        value={st.weight}
                        onChangeText={(v) => updateSet(ei, si, { weight: v })}
                        onFocus={() => setFocus({ ei, si })}
                        keyboardType="decimal-pad"
                        inputAccessoryViewID={ACCESSORY_ID}
                        placeholder={prev ? tidy(num(prev.weight)) : '0'}
                        placeholderTextColor={c.muted}
                        selectTextOnFocus
                        maxFontSizeMultiplier={1.3}
                        style={[s.cell, s.flex, st.done && s.cellDone]}
                        accessibilityLabel={`Série ${si + 1}, charge en ${unit}`}
                      />
                      <TextInput
                        value={live ?? st.reps}
                        editable={live === null}
                        onChangeText={(v) => updateSet(ei, si, { reps: v })}
                        keyboardType="number-pad"
                        placeholder={prev ? String(num(prev.reps)) : '0'}
                        placeholderTextColor={c.muted}
                        selectTextOnFocus
                        maxFontSizeMultiplier={1.3}
                        style={[s.cell, s.flex, st.done && s.cellDone, live !== null && { color: c.primary }]}
                        accessibilityLabel={timed ? `Série ${si + 1}, durée en secondes` : `Série ${si + 1}, répétitions`}
                      />
                      {timed && (
                        <PressableScale scaleTo={0.88} onPress={() => toggleTimer(ei, si, k)} style={[s.play, live !== null && { backgroundColor: c.primary }]} accessibilityRole="button" accessibilityLabel={live !== null ? 'Arrêter le chronomètre et valider la série' : 'Lancer le chronomètre'}>
                          <Ionicons name={live !== null ? 'stop' : 'play'} size={20} color={live !== null ? c.onPrimary : c.ink} />
                        </PressableScale>
                      )}
                      <CheckButton done={st.done} label={`Valider la série ${si + 1}`} onPress={() => toggleDone(ei, si)} />
                      <Pressable onPress={() => undoable('Série supprimée', () => removeSet(ei, si))} hitSlop={8} style={{ width: 28, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={`Supprimer la série ${si + 1}`}>
                        <Ionicons name="trash-outline" size={18} color={c.muted} />
                      </Pressable>
                    </View>
                    {(!editing || st.rpe) && (
                      <Pressable
                        onPress={() => !editing && setRestEdit({ mode: 'set', ei, si })}
                        hitSlop={{ top: 6, bottom: 6 }}
                        style={s.restSep}
                        accessibilityRole={editing ? 'text' : 'button'}
                        accessibilityLabel={editing ? `RPE ${st.rpe}` : `Repos après la série ${si + 1} : ${rest > 0 ? fmtDuration(rest) : 'aucun'}${st.rest !== undefined ? ', personnalisé' : ''}${st.rpe ? `, RPE ${st.rpe}` : ''}. Appuie pour modifier.`}
                      >
                        <View style={s.sepLine} />
                        <View style={s.sepChip}>
                          {!!st.rpe && <Text style={[s.sepText, { color: c.ink }]}>RPE {st.rpe}{editing ? '' : '  ·'}</Text>}
                          {!editing && (
                            <>
                              <Ionicons name="timer-outline" size={14} color={st.rest !== undefined ? c.primary : c.muted} />
                              <Text style={[s.sepText, st.rest !== undefined && { color: c.primary }]}>{rest > 0 ? fmtDuration(rest) : 'Sans repos'}</Text>
                            </>
                          )}
                        </View>
                        <View style={s.sepLine} />
                      </Pressable>
                    )}
                  </Animated.View>
                );
              })}
              <PressableScale onPress={() => addSet(ei)} style={s.addSet} accessibilityRole="button">
                <Ionicons name="add" size={20} color={c.primary} />
                <Text style={s.addSetText}>Ajouter une série</Text>
              </PressableScale>

              {we.note === undefined ? (
                <Pressable onPress={() => updateExercise(ei, { note: '' })} style={s.noteBtn} accessibilityRole="button">
                  <Ionicons name="create-outline" size={18} color={c.muted} />
                  <Text style={s.noteBtnText}>Ajouter une note</Text>
                </Pressable>
              ) : (
                <Animated.View entering={FadeInDown.duration(200)}>
                  <TextInput
                    value={we.note}
                    onChangeText={(v) => updateExercise(ei, { note: v })}
                    placeholder="Réglage de la machine, douleur, ressenti…"
                    placeholderTextColor={c.muted}
                    multiline
                    style={s.note}
                    accessibilityLabel="Note de l’exercice"
                  />
                </Animated.View>
              )}
              {ei < draft.exercises.length - 1 && (
                <Pressable onPress={() => updateExercise(ei, { superset: !we.superset })} style={s.noteBtn} accessibilityRole="switch" accessibilityState={{ checked: !!we.superset }}>
                  <Ionicons name={we.superset ? 'link' : 'link-outline'} size={18} color={we.superset ? c.primary : c.muted} />
                  <Text style={[s.noteBtnText, we.superset && { color: c.primary }]}>{we.superset ? 'Superset avec le suivant' : 'Enchaîner avec le suivant (superset)'}</Text>
                </Pressable>
              )}
            </Animated.View>
          );
        })}

        <Button title="Ajouter un exercice" variant="secondary" icon="add" onPress={() => nav.navigate('Picker')} />
        <Button title={editing ? 'Annuler les modifications' : 'Abandonner la séance'} variant="danger" onPress={discard} style={{ marginTop: 12 }} />
      </ScrollView>

      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {restEnd && !editing && (
          <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(160)} accessibilityLiveRegion="polite" style={{ marginBottom: 12 }}>
            <View style={s.rest}>
              <View style={{ flex: 1 }}>
                <Text style={s.restLabel}>Repos</Text>
                <Animated.Text key={restLeft <= 3 ? restLeft : 'run'} entering={restLeft <= 3 ? ZoomIn.springify().damping(10) : undefined} style={[s.restTime, restLeft <= 5 && { color: c.success }]} maxFontSizeMultiplier={1.3} accessibilityLabel={`${restLeft} secondes restantes`}>
                  {fmtDuration(restLeft)}
                </Animated.Text>
              </View>
              <PressableScale style={s.restBtn} onPress={() => adjustRest(-15000)} accessibilityRole="button" accessibilityLabel="Retirer 15 secondes">
                <Text style={s.restBtnText}>−15 s</Text>
              </PressableScale>
              <PressableScale style={s.restBtn} onPress={() => adjustRest(15000)} accessibilityRole="button" accessibilityLabel="Ajouter 15 secondes">
                <Text style={s.restBtnText}>+15 s</Text>
              </PressableScale>
              <PressableScale style={[s.restBtn, { backgroundColor: c.ink }]} onPress={skipRest} accessibilityRole="button" accessibilityLabel="Passer le repos">
                <Text style={[s.restBtnText, { color: c.bg }]}>Passer</Text>
              </PressableScale>
            </View>
            <View style={s.restTrack}>
              <Animated.View style={[s.restFill, { backgroundColor: restLeft <= 5 ? c.success : c.primary }, fill]} />
            </View>
          </Animated.View>
        )}
        <Button title={editing ? 'Enregistrer les modifications' : doneSets > 0 ? `Terminer · ${doneSets} série${doneSets > 1 ? 's' : ''}` : 'Terminer la séance'} icon={editing ? 'checkmark' : 'flag'} onPress={finish} />
      </View>

      <RestEditor
        visible={!!restEdit}
        title={restEdit?.mode === 'set' ? `Repos après la série ${restEdit.si + 1}` : 'Repos par défaut'}
        initial={restInitial}
        scopes={
          restEdit?.mode === 'set'
            ? [{ key: 'set', label: 'Cette série' }, { key: 'exercise', label: 'Tout l’exercice' }, { key: 'all', label: 'Toute la séance' }]
            : [{ key: 'default', label: 'Par défaut' }, { key: 'all', label: 'Toute la séance' }]
        }
        onSubmit={submitRest}
        onCancel={() => setRestEdit(null)}
      />

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View style={s.accessory}>
            <Pressable style={s.accBtn} onPress={() => stepWeight(-step)} accessibilityRole="button" accessibilityLabel={`Retirer ${step} ${unit}`}>
              <Text style={s.accText}>− {step}</Text>
            </Pressable>
            <Pressable style={s.accBtn} onPress={() => stepWeight(step)} accessibilityRole="button" accessibilityLabel={`Ajouter ${step} ${unit}`}>
              <Text style={s.accText}>+ {step}</Text>
            </Pressable>
            <Pressable style={[s.accBtn, { flex: 1.4 }]} onPress={fillLast} accessibilityRole="button" accessibilityLabel="Reprendre la dernière performance">
              <Text style={s.accText}>Dernière fois</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: space.md },
  head: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 12, marginBottom: space.sm },
  name: { color: c.ink, fontFamily: font.display, fontSize: 32, flex: 1, paddingVertical: 4 },
  timer: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: c.surface, borderRadius: 20, paddingHorizontal: 12, minHeight: 36 },
  timerText: { color: c.ink, fontFamily: font.displaySemi, fontSize: 20, fontVariant: tabular },
  tools: { flexDirection: 'row' as const, gap: 20, marginBottom: space.sm },
  tool: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, minHeight: 44 },
  toolText: { color: c.ink, fontFamily: font.medium, fontSize: 15, textDecorationLine: 'underline' as const },
  restSep: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, minHeight: 28, marginBottom: 6 },
  sepLine: { flex: 1, height: 1, backgroundColor: c.line },
  sepChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  sepText: { color: c.muted, fontFamily: font.medium, fontSize: 13, fontVariant: tabular },
  rest: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 10 },
  restLabel: { color: c.muted, fontFamily: font.medium, fontSize: 13 },
  restTime: { color: c.primary, fontFamily: font.display, fontSize: 40, lineHeight: 42, fontVariant: tabular },
  restBtn: { minHeight: 44, minWidth: 64, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: c.surface },
  restBtnText: { color: c.ink, fontFamily: font.semibold, fontSize: 15 },
  restTrack: { height: 6, borderRadius: 3, backgroundColor: c.line, overflow: 'hidden' as const },
  restFill: { height: 6, borderRadius: 3 },
  card: { backgroundColor: c.surface, borderRadius: 18, padding: 14, marginBottom: 14 },
  cardLinked: { borderLeftWidth: 4, borderLeftColor: c.primary },
  superLabel: { color: c.primary, fontFamily: font.semibold, fontSize: 13, marginBottom: 6 },
  cardHead: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginBottom: 8 },
  exLink: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  exSub: { color: c.muted, fontFamily: font.body, fontSize: 13, marginTop: 2 },
  exName: { color: c.ink, fontSize: 18, fontFamily: font.semibold, lineHeight: 22 },
  iconBtn: { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  lastTime: { color: c.muted, fontFamily: font.body, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  setRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 },
  flex: { flex: 1 },
  th: { color: c.muted, fontSize: 12, fontFamily: font.medium, textAlign: 'center' as const },
  setNum: { color: c.muted, fontFamily: font.displaySemi, fontSize: 20, textAlign: 'center' as const },
  kindBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
  kindText: { color: '#fff', fontFamily: font.display, fontSize: 14 },
  cell: { backgroundColor: c.bg, color: c.ink, borderRadius: 12, minHeight: 48, textAlign: 'center' as const, fontSize: 24, fontFamily: font.display, fontVariant: tabular },
  cellDone: { opacity: 0.55 },
  play: { width: 44, height: 48, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center' as const, justifyContent: 'center' as const },
  check: { width: 48, height: 48, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center' as const, justifyContent: 'center' as const },
  addSet: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 4, minHeight: 44, marginTop: 4 },
  addSetText: { color: c.primary, fontFamily: font.semibold, fontSize: 16 },
  noteBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, minHeight: 44 },
  noteBtnText: { color: c.muted, fontFamily: font.medium, fontSize: 15 },
  note: { backgroundColor: c.bg, color: c.ink, borderRadius: 12, padding: 12, minHeight: 48, fontFamily: font.body, fontSize: 16, marginTop: 4, marginBottom: 4 },
  bar: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: space.md, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line },
  accessory: { flexDirection: 'row' as const, gap: 8, padding: 8, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line },
  accBtn: { flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: c.bg, alignItems: 'center' as const, justifyContent: 'center' as const },
  accText: { color: c.ink, fontFamily: font.semibold, fontSize: 16 },
});
