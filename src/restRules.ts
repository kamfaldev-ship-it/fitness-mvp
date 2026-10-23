import { SetLog, Workout } from './types';

export const MAX_REST = 3600;

// Rest that runs after a validated set: its own value, else the default (0 = no rest)
export const restAfter = (set: Pick<SetLog, 'rest'>, defaultSeconds: number) => set.rest ?? defaultSeconds;

// "2" min and "5" s -> 125. Seconds above 59 simply carry over (0 min 90 s = 1:30).
export function parseRest(minutes: string, seconds: string) {
  const m = parseInt(minutes, 10) || 0;
  const s = parseInt(seconds, 10) || 0;
  return Math.min(MAX_REST, Math.max(0, m * 60 + s));
}

export type RestTarget = { scope: 'set' | 'exercise' | 'all'; exIdx?: number; setIdx?: number };

// rest = undefined clears the override (the set follows the default again)
export function applyRest(draft: Workout, target: RestTarget, rest: number | undefined): Workout {
  const patch = (st: SetLog): SetLog => {
    const { rest: _old, ...base } = st;
    return rest === undefined ? base : { ...base, rest };
  };
  return {
    ...draft,
    exercises: draft.exercises.map((ex, i) => {
      if (target.scope === 'all') return { ...ex, sets: ex.sets.map(patch) };
      if (i !== target.exIdx) return ex;
      if (target.scope === 'exercise') return { ...ex, sets: ex.sets.map(patch) };
      return { ...ex, sets: ex.sets.map((st, j) => (j === target.setIdx ? patch(st) : st)) };
    }),
  };
}
