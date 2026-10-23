import raw from './exercises.json';
import { Exercise } from '../types';

export const BUILTIN_EXERCISES = raw as Exercise[];
const byId = new Map(BUILTIN_EXERCISES.map((e) => [e.id, e]));

// The user's own exercises live in the store; this registry lets getExercise() find them anywhere.
let customList: Exercise[] = [];
const customById = new Map<string, Exercise>();
export function registerCustomExercises(list: Exercise[]) {
  customList = list;
  customById.clear();
  list.forEach((e) => customById.set(e.id, e));
}
export const getExercise = (id: string) => byId.get(id) ?? customById.get(id);
export const allExercises = () => (customList.length ? [...customList, ...BUILTIN_EXERCISES] : BUILTIN_EXERCISES);

// Plank, stretches, cardio and holds are counted in seconds by default
export const defaultTimed = (e: Exercise) =>
  e.mode === 'time' || (e.mode !== 'reps' && (e.bodyPart === 'cardio' || /\b(plank|stretch|isometric|wall sit|hold)\b/.test(e.name)));

// Media hosted in the dataset repo (© Gym visual, 180x180)
const MEDIA_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';
export const mediaUrl = (path: string) => MEDIA_BASE + path;

export const ATTRIBUTION = '© Gym visual — https://gymvisual.com/';

export const BODY_PARTS: Record<string, string> = {
  chest: 'Pectoraux',
  back: 'Dos',
  shoulders: 'Épaules',
  'upper arms': 'Bras',
  'lower arms': 'Avant-bras',
  'upper legs': 'Cuisses',
  'lower legs': 'Mollets',
  waist: 'Abdos',
  cardio: 'Cardio',
  neck: 'Cou',
};

const EQUIPMENT: Record<string, string> = {
  'body weight': 'Poids du corps',
  dumbbell: 'Haltères',
  barbell: 'Barre',
  cable: 'Poulie',
  'leverage machine': 'Machine',
  band: 'Élastique',
  'smith machine': 'Smith machine',
  kettlebell: 'Kettlebell',
  'ez barbell': 'Barre EZ',
  weighted: 'Lesté',
  'stability ball': 'Swiss ball',
};

export const bodyPartLabel = (k: string) => BODY_PARTS[k] ?? k;
export const equipmentLabel = (k: string) => EQUIPMENT[k] ?? k;
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

import namesFr from './names.fr.json';

const FR_NAMES = namesFr as Record<string, string>;

// French name when we have one, otherwise the dataset's English name
export const exerciseName = (e: Exercise) => FR_NAMES[e.id] ?? capitalize(e.name);
export const hasFrenchName = (e: Exercise) => e.id in FR_NAMES;

const MUSCLES: Record<string, string> = {
  abdominals: 'abdominaux',
  abductors: 'abducteurs',
  abs: 'abdos',
  adductors: 'adducteurs',
  'ankle stabilizers': 'stabilisateurs de cheville',
  ankles: 'chevilles',
  back: 'dos',
  biceps: 'biceps',
  brachialis: 'brachial',
  calves: 'mollets',
  'cardiovascular system': 'système cardio-vasculaire',
  chest: 'pectoraux',
  core: 'tronc',
  deltoids: 'deltoïdes',
  delts: 'deltoïdes',
  feet: 'pieds',
  forearms: 'avant-bras',
  glutes: 'fessiers',
  'grip muscles': 'muscles de la prise',
  groin: 'aine',
  hamstrings: 'ischio-jambiers',
  hands: 'mains',
  'hip flexors': 'fléchisseurs de hanche',
  'inner thighs': 'intérieur des cuisses',
  'latissimus dorsi': 'grand dorsal',
  lats: 'grand dorsal',
  'levator scapulae': 'élévateur de la scapula',
  'lower abs': 'bas des abdos',
  'lower back': 'lombaires',
  obliques: 'obliques',
  pectorals: 'pectoraux',
  quadriceps: 'quadriceps',
  quads: 'quadriceps',
  'rear deltoids': 'deltoïdes postérieurs',
  rhomboids: 'rhomboïdes',
  'rotator cuff': 'coiffe des rotateurs',
  'serratus anterior': 'dentelé antérieur',
  shins: 'tibias',
  shoulders: 'épaules',
  soleus: 'soléaire',
  spine: 'colonne vertébrale',
  sternocleidomastoid: 'sterno-cléido-mastoïdien',
  trapezius: 'trapèzes',
  traps: 'trapèzes',
  triceps: 'triceps',
  'upper back': 'haut du dos',
  'upper chest': 'haut des pectoraux',
  'wrist extensors': 'extenseurs du poignet',
  'wrist flexors': 'fléchisseurs du poignet',
  wrists: 'poignets',
};

export const muscleLabel = (m: string) => capitalize(MUSCLES[m] ?? m);

// Matches the French name, the English name, the target muscle (both languages) and the equipment
export function matchesQuery(e: Exercise, q: string) {
  if (!q) return true;
  const hay = [e.name, FR_NAMES[e.id] ?? '', e.target, MUSCLES[e.target] ?? '', e.equipment, EQUIPMENT[e.equipment] ?? ''].join(' ').toLowerCase();
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return fold(hay).includes(fold(q));
}
