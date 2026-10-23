import { RecordHit, SetLog, Workout } from './types';

export const num = (s: string) => parseFloat(String(s).replace(',', '.')) || 0;

// Warm-ups are not work; drop sets are work but cannot set a record; failure sets count like normal ones
export const countsForVolume = (s: SetLog) => s.done && s.kind !== 'warmup';
export const countsForRecord = (s: SetLog) => s.done && s.kind !== 'warmup' && s.kind !== 'drop';

// Timed exercises hold seconds in `reps`, so they carry no lifted volume
export const workoutVolume = (w: Workout) =>
  w.exercises.reduce(
    (t, ex) => (ex.timed ? t : t + ex.sets.filter(countsForVolume).reduce((a, s) => a + num(s.reps) * num(s.weight), 0)),
    0,
  );

export const doneSetCount = (w: Workout) =>
  w.exercises.reduce((t, ex) => t + ex.sets.filter((s) => s.done).length, 0);

const mondayOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

export function weeklyCounts(history: Workout[], weeks = 8) {
  const start = mondayOf(new Date());
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() - 7 * (weeks - 1 - i));
    return { start: d, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 };
  });
  for (const w of history) {
    const t = mondayOf(new Date(w.startedAt)).getTime();
    const b = buckets.find((x) => x.start.getTime() === t);
    if (b) b.count++;
  }
  return buckets;
}

export type Session = { date: string; maxWeight: number; reps: number; e1rm: number; timed: boolean };

// Per exercise: one entry per workout, best set = heaviest (ties -> more reps).
// For timed exercises the best set is the longest one.
export function exerciseSessions(history: Workout[]) {
  const map = new Map<string, Session[]>();
  const sorted = [...history].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const w of sorted) {
    for (const ex of w.exercises) {
      const timed = !!ex.timed;
      let best: Session | null = null;
      for (const s of ex.sets) {
        if (!countsForRecord(s)) continue;
        const weight = num(s.weight);
        const reps = num(s.reps);
        const better = !best || (timed ? reps > best.reps : weight > best.maxWeight || (weight === best.maxWeight && reps > best.reps));
        if (better) best = { date: w.startedAt, maxWeight: weight, reps, e1rm: timed ? 0 : weight * (1 + reps / 30), timed };
      }
      if (best) map.set(ex.exerciseId, [...(map.get(ex.exerciseId) ?? []), best]);
    }
  }
  return map;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

export const fmtKg = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const fmtDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

// Monday-first current week: one entry per day, flagged when a workout happened
export function currentWeek(history: Workout[]) {
  const start = mondayOf(new Date());
  const today = new Date().toDateString();
  return ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { label, today: d.toDateString() === today, filled: history.some((w) => new Date(w.startedAt).toDateString() === d.toDateString()) };
  });
}

const byDateDesc = (a: Workout, b: Workout) => b.startedAt.localeCompare(a.startedAt);

// Sets of the most recent workout that contained this exercise
export function lastSets(history: Workout[], exerciseId: string) {
  for (const w of [...history].sort(byDateDesc)) {
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
    const sets = ex?.sets.filter(countsForVolume);
    if (ex && sets && sets.length) return { date: w.startedAt, sets, timed: !!ex.timed };
  }
  return null;
}

export const e1rm = (weight: number, reps: number) => weight * (1 + reps / 30);

// Best weight / estimated 1RM / longest hold ever logged (null when never done)
export function priorBest(history: Workout[], exerciseId: string) {
  const sessions = exerciseSessions(history).get(exerciseId);
  if (!sessions?.length) return null;
  return {
    weight: Math.max(...sessions.map((x) => x.maxWeight)),
    e1rm: Math.max(...sessions.map((x) => x.e1rm)),
    seconds: Math.max(...sessions.map((x) => (x.timed ? x.reps : 0))),
  };
}

type Prior = { weight: number; e1rm: number; seconds?: number } | null;

// A record needs a previous session to beat: the first time is a baseline, not a record
export function recordKind(prior: Prior, weight: number, reps: number, timed = false): 'weight' | 'e1rm' | 'time' | null {
  if (!prior || reps <= 0) return null;
  if (timed) return reps > (prior.seconds ?? 0) ? 'time' : null;
  if (weight <= 0) return null;
  if (weight > prior.weight) return 'weight';
  if (e1rm(weight, reps) > prior.e1rm + 0.05) return 'e1rm';
  return null;
}

export function computeRecords(history: Workout[], exercises: Workout['exercises']): RecordHit[] {
  const hits: RecordHit[] = [];
  for (const ex of exercises) {
    const prior = priorBest(history, ex.exerciseId);
    let best: RecordHit | null = null;
    let bestScore = 0;
    for (const s of ex.sets) {
      if (!countsForRecord(s)) continue;
      const weight = num(s.weight);
      const reps = num(s.reps);
      const kind = recordKind(prior, weight, reps, ex.timed);
      // a heavier weight record always outranks a rep record
      const score = kind === 'weight' ? 1e6 + weight : kind === 'time' ? reps : e1rm(weight, reps);
      if (kind && score > bestScore) {
        best = { exerciseId: ex.exerciseId, weight, reps, kind };
        bestScore = score;
      }
    }
    if (best) hits.push(best);
  }
  return hits;
}

// Consecutive weeks (ending now, or last week if this one is still open) with >= goal workouts
export function weekStreak(history: Workout[], goal: number, now = new Date()) {
  if (goal < 1) return 0;
  const counts = new Map<number, number>();
  for (const w of history) {
    const t = mondayOf(new Date(w.startedAt)).getTime();
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const cursor = mondayOf(now);
  let streak = 0;
  if ((counts.get(cursor.getTime()) ?? 0) >= goal) streak++;
  for (;;) {
    cursor.setDate(cursor.getDate() - 7);
    if ((counts.get(cursor.getTime()) ?? 0) >= goal) streak++;
    else break;
  }
  return streak;
}

// Monday-first month grid: leading null cells pad the first week
export function calendarMonth(history: Workout[], year: number, month: number) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: ({ day: number; count: number } | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) {
    const key = new Date(year, month, d).toDateString();
    cells.push({ day: d, count: history.filter((w) => new Date(w.startedAt).toDateString() === key).length });
  }
  return cells;
}

// Next template in the cycle after the one used last (falls back to the first template)
export function suggestNext<T extends { id: string }>(history: Workout[], templates: T[]): { next: T; last?: Workout } | null {
  if (!templates.length) return null;
  const last = [...history].sort(byDateDesc).find((w) => w.templateId && templates.some((t) => t.id === w.templateId));
  if (!last) return { next: templates.find((t) => t.id === 'full-body') ?? templates[0] };
  const i = templates.findIndex((t) => t.id === last.templateId);
  return { next: templates[(i + 1) % templates.length], last };
}

export function recentExerciseIds(history: Workout[], n = 20) {
  const seen: string[] = [];
  for (const w of [...history].sort(byDateDesc)) {
    for (const ex of w.exercises) if (!seen.includes(ex.exerciseId)) seen.push(ex.exerciseId);
    if (seen.length >= n) break;
  }
  return seen.slice(0, n);
}

export const daysAgo = (iso: string, now = new Date()) =>
  Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(new Date(iso).getFullYear(), new Date(iso).getMonth(), new Date(iso).getDate()).getTime()) / 864e5);

// "60 kg × 8" for reps, "1:30" (+ load) for timed sets
export function fmtSet(st: Pick<SetLog, 'weight' | 'reps'>, timed: boolean | undefined, unit: string) {
  if (timed) {
    const sec = num(st.reps);
    const w = num(st.weight);
    return `${w ? `${tidyNum(w)} ${unit}, ` : ''}${fmtDuration(sec)}`;
  }
  return `${tidyNum(num(st.weight))} ${unit} × ${num(st.reps)}`;
}
const tidyNum = (n: number) => String(Math.round(n * 10) / 10);

export const KIND_LABEL: Record<NonNullable<SetLog['kind']>, string> = {
  normal: 'Série normale',
  warmup: 'Échauffement',
  drop: 'Dégressive',
  failure: 'Jusqu’à l’échec',
};
export const KIND_BADGE: Record<NonNullable<SetLog['kind']>, string> = { normal: '', warmup: 'É', drop: 'D', failure: 'F' };
