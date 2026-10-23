import { SetLog, WorkoutExercise, Workout } from './types';

export const newKey = () => Math.random().toString(36).slice(2, 9);
export const withKey = (st: SetLog): SetLog => ({ ...st, key: st.key ?? newKey() });

// Move one exercise up (-1) or down (+1); superset links follow the position they were set on
export function moveExercise(draft: Workout, idx: number, dir: -1 | 1): Workout {
  const to = idx + dir;
  if (to < 0 || to >= draft.exercises.length) return draft;
  const list = [...draft.exercises];
  [list[idx], list[to]] = [list[to], list[idx]];
  // a superset flag means "linked with the next one": the last exercise cannot have it
  list[list.length - 1] = { ...list[list.length - 1], superset: false };
  return { ...draft, exercises: list };
}

// Swap the exercise but keep the set structure (count, reps, rests); weights come from `weightFor`
export function replaceExercise(draft: Workout, idx: number, newId: string, timed: boolean, weightFor: string): Workout {
  return {
    ...draft,
    exercises: draft.exercises.map((ex, i): WorkoutExercise =>
      i !== idx
        ? ex
        : {
            key: ex.key ?? newKey(),
            exerciseId: newId,
            timed,
            superset: ex.superset,
            sets: ex.sets.map((s) => ({ ...s, done: false, weight: weightFor, kind: s.kind === 'warmup' ? 'warmup' as const : undefined, rpe: undefined })),
          },
    ),
  };
}

// Open a saved workout for editing: a copy that replaces the original when saved
export function openForEdit(w: Workout): Workout {
  const copy: Workout = JSON.parse(JSON.stringify({ ...w, editingId: w.id }));
  copy.exercises = copy.exercises.map((ex) => ({ ...ex, key: ex.key ?? newKey(), sets: ex.sets.map(withKey) }));
  return copy;
}

// Result of saving the draft. When editing, the original keeps its place, date and duration.
export function commitDraft(
  draft: Workout,
  history: Workout[],
  records: (others: Workout[], exercises: Workout['exercises']) => Workout['records'],
  usable: (set: Workout['exercises'][number]['sets'][number]) => boolean,
  now = new Date(),
): { workout: Workout; history: Workout[] } | null {
  const exercises = draft.exercises
    .map((ex) => ({ ...ex, sets: ex.sets.filter(usable) }))
    .filter((ex) => ex.sets.length > 0);
  if (exercises.length === 0) return null;
  const { editingId, ...rest } = draft;
  const others = editingId ? history.filter((w) => w.id !== editingId) : history;
  const workout: Workout = { ...rest, exercises, endedAt: editingId ? draft.endedAt : now.toISOString(), records: records(others, exercises) };
  const next = editingId ? history.map((w) => (w.id === editingId ? { ...workout, id: editingId } : w)) : [workout, ...history];
  return { workout, history: next };
}
