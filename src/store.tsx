import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { stableContext } from './stableContext';
import { TEMPLATES } from './data/templates';
import { defaultTimed, getExercise, registerCustomExercises } from './data/exercises';
import { normalizeState, emptyState } from './persist';
import { applyRest, RestTarget } from './restRules';
import { computeRecords, exerciseSessions, lastSets, num } from './stats';
import { convertWeightString, defaultStep } from './units';
import { BodyEntry, Exercise, PersistedState, SetLog, Settings, Template, Unit, Workout, WorkoutExercise } from './types';
import { commitDraft, moveExercise, newKey, openForEdit, replaceExercise, withKey } from './workoutOps';

const KEY = 'fitness-mvp/v1';

type Actions = {
  startWorkout: (template?: Workout) => void;
  startFromTemplate: (t: Template) => boolean;
  addExercise: (exerciseId: string) => void;
  removeExercise: (idx: number) => void;
  updateExercise: (idx: number, patch: Partial<Pick<WorkoutExercise, 'note' | 'superset' | 'timed'>>) => void;
  moveExercise: (idx: number, dir: -1 | 1) => void;
  replaceExercise: (idx: number, newId: string) => void;
  // opens a saved workout for editing; false when another workout is in progress
  editWorkout: (id: string) => boolean;
  addCustomExercise: (input: { name: string; bodyPart: string; equipment: string; timed: boolean }) => string;
  deleteCustomExercise: (id: string) => void;
  addSet: (exIdx: number) => void;
  updateSet: (exIdx: number, setIdx: number, patch: Partial<SetLog>) => void;
  removeSet: (exIdx: number, setIdx: number) => void;
  renameDraft: (name: string) => void;
  // rest = undefined puts the set(s) back on the default rest
  setRest: (target: RestTarget, rest: number | undefined) => void;
  // returns the id of the saved workout, or null when nothing was validated
  finishWorkout: () => string | null;
  discardWorkout: () => void;
  restoreDraft: (d: Workout | null) => void;
  deleteWorkout: (id: string) => void;
  restoreWorkout: (w: Workout) => void;
  saveTemplate: (name: string, exercises: Template['exercises'], focus?: string) => string;
  saveTemplateFromWorkout: (w: Workout, name: string) => string;
  updateTemplate: (id: string, patch: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  restoreTemplate: (t: Template) => void;
  addToTemplate: (templateId: string, exerciseId: string) => void;
  toggleFavorite: (exerciseId: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setUnit: (to: Unit) => void;
  addBodyEntry: (e: Omit<BodyEntry, 'id'>) => void;
  deleteBodyEntry: (id: string) => void;
  importData: (raw: unknown) => boolean;
};

const Ctx = stableContext<(PersistedState & Actions) | null>('fitness.store', null);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const emptyDraft = (name = 'Séance'): Workout => ({
  id: uid(),
  name,
  startedAt: new Date().toISOString(),
  exercises: [],
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(emptyState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  registerCustomExercises(state.customExercises ?? []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const parsed = raw ? normalizeState(JSON.parse(raw)) : null;
        if (parsed) setState(parsed);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const actions = useMemo<Actions>(() => {
    const patchDraft = (fn: (d: Workout, s: PersistedState) => Workout) =>
      setState((s) => (s.draft ? { ...s, draft: fn(s.draft, s) } : s));
    const mapSets = (d: Workout, fn: (s: SetLog) => SetLog): Workout => ({
      ...d,
      exercises: d.exercises.map((ex) => ({ ...ex, sets: ex.sets.map(fn) })),
    });

    return {
      startWorkout: (template) =>
        setState((s) => {
          if (s.draft) return s;
          const d = emptyDraft(template?.name);
          if (template) {
            d.exercises = template.exercises.map((ex) => ({
              key: newKey(),
              exerciseId: ex.exerciseId,
              timed: ex.timed,
              superset: ex.superset,
              sets: ex.sets.map((x) => ({ ...x, key: newKey(), done: false, rpe: undefined })),
            }));
          }
          return { ...s, draft: d };
        }),

      // returns false when a workout is already in progress
      startFromTemplate: (t) => {
        const { draft, history } = stateRef.current;
        if (draft) return false;
        const past = exerciseSessions(history);
        const d = { ...emptyDraft(t.name), templateId: t.id };
        d.exercises = t.exercises.map((e) => {
          const last = past.get(e.id)?.slice(-1)[0];
          const set: SetLog = { reps: String(e.reps), weight: last?.maxWeight ? String(last.maxWeight) : '', done: false };
          const ex = getExercise(e.id);
          return { key: newKey(), exerciseId: e.id, timed: ex ? defaultTimed(ex) : false, sets: Array.from({ length: e.sets }, () => ({ ...set, key: newKey() })) };
        });
        setState((s) => ({ ...s, draft: d }));
        return true;
      },

      addExercise: (exerciseId) =>
        setState((s) => {
          const d = s.draft ?? emptyDraft();
          const ex = getExercise(exerciseId);
          const timed = ex ? defaultTimed(ex) : false;
          // prefill with the last performed set, if any
          const last = exerciseSessions(s.history).get(exerciseId)?.slice(-1)[0];
          const first: SetLog = last
            ? { reps: String(last.reps), weight: String(last.maxWeight || ''), done: false }
            : { reps: timed ? '30' : '10', weight: '', done: false };
          return { ...s, draft: { ...d, exercises: [...d.exercises, { key: newKey(), exerciseId, timed, sets: [withKey(first)] }] } };
        }),

      moveExercise: (idx, dir) => patchDraft((d) => moveExercise(d, idx, dir)),

      replaceExercise: (idx, newId) =>
        patchDraft((d, s) => {
          const ex = getExercise(newId);
          const last = lastSets(s.history, newId);
          const ref = last?.sets[last.sets.length - 1];
          return replaceExercise(d, idx, newId, ex ? defaultTimed(ex) : false, ref?.weight ?? '');
        }),

      editWorkout: (id) => {
        const { draft, history } = stateRef.current;
        const w = history.find((x) => x.id === id);
        if (draft || !w) return false;
        setState((s) => ({ ...s, draft: openForEdit(w) }));
        return true;
      },

      addCustomExercise: ({ name, bodyPart, equipment, timed }) => {
        const id = 'c-' + uid();
        const e: Exercise = {
          id,
          name: name.trim(),
          bodyPart,
          equipment,
          target: bodyPart,
          secondary: [],
          steps: { en: [], fr: [] },
          image: '',
          gif: '',
          custom: true,
          mode: timed ? 'time' : 'reps',
        };
        setState((s) => ({ ...s, customExercises: [e, ...s.customExercises] }));
        return id;
      },
      deleteCustomExercise: (id) =>
        setState((s) => ({ ...s, customExercises: s.customExercises.filter((e) => e.id !== id), favorites: s.favorites.filter((f) => f !== id) })),

      removeExercise: (idx) =>
        patchDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== idx) })),

      updateExercise: (idx, patch) =>
        patchDraft((d) => ({ ...d, exercises: d.exercises.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)) })),

      addSet: (exIdx) =>
        patchDraft((d) => ({
          ...d,
          exercises: d.exercises.map((ex, i) => {
            if (i !== exIdx) return ex;
            const prev = ex.sets[ex.sets.length - 1];
            return { ...ex, sets: [...ex.sets, { key: newKey(), reps: prev?.reps ?? '10', weight: prev?.weight ?? '', done: false }] };
          }),
        })),

      updateSet: (exIdx, setIdx, patch) =>
        patchDraft((d) => ({
          ...d,
          exercises: d.exercises.map((ex, i) =>
            i !== exIdx ? ex : { ...ex, sets: ex.sets.map((st, j) => (j === setIdx ? { ...st, ...patch } : st)) },
          ),
        })),

      removeSet: (exIdx, setIdx) =>
        patchDraft((d) => ({
          ...d,
          exercises: d.exercises.map((ex, i) =>
            i !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) },
          ),
        })),

      renameDraft: (name) => patchDraft((d) => ({ ...d, name })),
      setRest: (target, rest) => patchDraft((d) => applyRest(d, target, rest)),

      finishWorkout: () => {
        const { draft, history } = stateRef.current;
        if (!draft) return null;
        const res = commitDraft(draft, history, computeRecords, (st) => st.done && (num(st.reps) > 0 || num(st.weight) > 0));
        if (!res) return null;
        setState((s) => ({ ...s, history: res.history, draft: null }));
        return draft.editingId ?? res.workout.id;
      },

      discardWorkout: () => setState((s) => ({ ...s, draft: null })),
      restoreDraft: (d) => setState((s) => ({ ...s, draft: d })),

      deleteWorkout: (id) => setState((s) => ({ ...s, history: s.history.filter((w) => w.id !== id) })),
      restoreWorkout: (w) => setState((s) => ({ ...s, history: [w, ...s.history.filter((x) => x.id !== w.id)] })),

      saveTemplate: (name, exercises, focus) => {
        const id = 't-' + uid();
        setState((s) => ({ ...s, templates: [...s.templates, { id, name, focus: focus ?? 'Séance personnalisée', custom: true, exercises }] }));
        return id;
      },

      saveTemplateFromWorkout: (w, name) => {
        const id = 't-' + uid();
        const exercises = w.exercises.map((ex) => ({
          id: ex.exerciseId,
          sets: Math.max(1, ex.sets.length),
          reps: Math.max(1, Math.round(num(ex.sets[0]?.reps)) || 10),
        }));
        setState((s) => ({ ...s, templates: [...s.templates, { id, name, focus: 'Séance personnalisée', custom: true, exercises }] }));
        return id;
      },

      updateTemplate: (id, patch) =>
        setState((s) => ({ ...s, templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTemplate: (id) => setState((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) })),
      restoreTemplate: (t) => setState((s) => ({ ...s, templates: [...s.templates.filter((x) => x.id !== t.id), t] })),
      addToTemplate: (templateId, exerciseId) =>
        setState((s) => ({
          ...s,
          templates: s.templates.map((t) => (t.id === templateId ? { ...t, exercises: [...t.exercises, { id: exerciseId, sets: 3, reps: 10 }] } : t)),
        })),

      toggleFavorite: (exerciseId) =>
        setState((s) => ({
          ...s,
          favorites: s.favorites.includes(exerciseId) ? s.favorites.filter((x) => x !== exerciseId) : [exerciseId, ...s.favorites],
        })),

      setSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

      // Weights are stored as typed, so switching units converts every stored value once
      setUnit: (to) =>
        setState((s) => {
          const from = s.settings.unit;
          if (from === to) return s;
          const conv = (st: SetLog): SetLog => ({ ...st, weight: convertWeightString(st.weight, from, to) });
          const stepWasDefault = s.settings.step === defaultStep(from);
          return {
            ...s,
            history: s.history.map((w) => mapSets(w, conv)),
            draft: s.draft ? mapSets(s.draft, conv) : null,
            bodyLog: s.bodyLog.map((b) => (b.weight != null ? { ...b, weight: Number(convertWeightString(String(b.weight), from, to)) } : b)),
            settings: { ...s.settings, unit: to, step: stepWasDefault ? defaultStep(to) : s.settings.step },
          };
        }),

      addBodyEntry: (e) => setState((s) => ({ ...s, bodyLog: [{ ...e, id: uid() }, ...s.bodyLog] })),
      deleteBodyEntry: (id) => setState((s) => ({ ...s, bodyLog: s.bodyLog.filter((b) => b.id !== id) })),

      importData: (raw) => {
        const parsed = normalizeState(raw);
        if (!parsed) return false;
        setState(parsed);
        return true;
      },
    };
  }, []);

  // After a hot reload the mounted state may predate a field that was just added: fill the gaps
  const value = useMemo(() => {
    const base = emptyState();
    return { ...base, ...state, settings: { ...base.settings, ...state.settings }, ...actions };
  }, [state, actions]);

  if (!ready) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
};

// Built-in templates followed by the user's own
export const useAllTemplates = (): Template[] => {
  const { templates } = useStore();
  return useMemo(() => [...TEMPLATES, ...templates], [templates]);
};
