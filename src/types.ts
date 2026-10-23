export type Exercise = {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondary: string[];
  steps: { en: string[]; fr: string[] };
  image: string;
  gif: string;
  // user-made exercises have no media and no instructions
  custom?: boolean;
  // how the exercise is measured by default
  mode?: 'reps' | 'time';
};

// reps / weight are kept as strings so the inputs can hold "62." while typing
// rest: seconds to wait after this set. undefined = follow the default, 0 = no rest.
export type SetKind = 'normal' | 'warmup' | 'drop' | 'failure';
// For timed exercises `reps` holds the duration in seconds.
export type SetLog = { reps: string; weight: string; done: boolean; rest?: number; kind?: SetKind; rpe?: number; key?: string };
export type WorkoutExercise = {
  // stable id so lists can animate moves and removals
  key?: string;
  exerciseId: string;
  sets: SetLog[];
  note?: string;
  // linked with the next exercise of the workout
  superset?: boolean;
  // measured in seconds instead of repetitions
  timed?: boolean;
};
export type RecordHit = { exerciseId: string; weight: number; reps: number; kind: 'weight' | 'e1rm' | 'time' };
export type Workout = {
  id: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  templateId?: string;
  // set while an already saved workout is being edited (it is replaced when saved)
  editingId?: string;
  records?: RecordHit[];
  exercises: WorkoutExercise[];
};

export type Unit = 'kg' | 'lb';
export type Settings = { restSeconds: number; unit: Unit; step: number; weeklyGoal: number };

export type Template = {
  id: string;
  name: string;
  focus: string;
  custom?: boolean;
  exercises: { id: string; sets: number; reps: number }[];
};

export type BodyEntry = {
  id: string;
  date: string;
  weight?: number;
  waist?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
};

export type PersistedState = {
  version: 2;
  history: Workout[];
  draft: Workout | null;
  templates: Template[];
  favorites: string[];
  customExercises: Exercise[];
  bodyLog: BodyEntry[];
  settings: Settings;
};

export type RootStackParamList = {
  Tabs: undefined;
  ExerciseDetail: { id: string };
  Picker: { templateId?: string; replaceIndex?: number } | undefined;
  CustomExercise: undefined;
  Workout: undefined;
  Summary: { id: string };
  Template: { id: string };
  TemplateEdit: { id: string };
  WorkoutDetail: { id: string };
  PlateCalc: undefined;
  Settings: undefined;
};
