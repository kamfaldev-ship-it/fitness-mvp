import { PersistedState, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = { restSeconds: 90, unit: 'kg', step: 2.5, weeklyGoal: 3 };

export const emptyState = (): PersistedState => ({
  version: 2,
  history: [],
  draft: null,
  templates: [],
  favorites: [],
  customExercises: [],
  bodyLog: [],
  settings: { ...DEFAULT_SETTINGS },
});

const isWorkout = (w: any) =>
  w && typeof w.id === 'string' && typeof w.startedAt === 'string' && Array.isArray(w.exercises) &&
  w.exercises.every((e: any) => e && typeof e.exerciseId === 'string' && Array.isArray(e.sets));

// Accepts the v1 shape ({history, draft, restSeconds}) and v2; returns null when it is not our data
export function normalizeState(raw: any): PersistedState | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.history)) return null;
  if (!raw.history.every(isWorkout)) return null;
  if (raw.draft != null && !isWorkout(raw.draft)) return null;
  const base = emptyState();
  const legacyRest = typeof raw.restSeconds === 'number' ? raw.restSeconds : undefined;
  return {
    version: 2,
    history: raw.history,
    draft: raw.draft ?? null,
    templates: Array.isArray(raw.templates) ? raw.templates : [],
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter((x: any) => typeof x === 'string') : [],
    customExercises: Array.isArray(raw.customExercises) ? raw.customExercises.filter((e: any) => e && typeof e.id === 'string' && typeof e.name === 'string') : [],
    bodyLog: Array.isArray(raw.bodyLog) ? raw.bodyLog : [],
    settings: { ...base.settings, ...(legacyRest ? { restSeconds: legacyRest } : {}), ...(raw.settings ?? {}) },
  };
}
