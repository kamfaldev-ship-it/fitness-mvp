import { Template } from '../types';

export type { Template };

// Exercise ids come from the dataset (see data/exercises.json)
export const TEMPLATES: Template[] = [
  {
    id: 'push',
    name: 'Push',
    focus: 'Pectoraux, épaules, triceps',
    exercises: [
      { id: '0025', sets: 4, reps: 8 },
      { id: '0314', sets: 3, reps: 10 },
      { id: '0405', sets: 3, reps: 10 },
      { id: '0334', sets: 3, reps: 12 },
      { id: '0201', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'pull',
    name: 'Pull',
    focus: 'Dos, arrière d’épaules, biceps',
    exercises: [
      { id: '0652', sets: 4, reps: 8 },
      { id: '0027', sets: 4, reps: 8 },
      { id: '0861', sets: 3, reps: 10 },
      { id: '0380', sets: 3, reps: 12 },
      { id: '0294', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'legs',
    name: 'Legs',
    focus: 'Cuisses, fessiers, mollets',
    exercises: [
      { id: '0043', sets: 4, reps: 8 },
      { id: '0085', sets: 3, reps: 10 },
      { id: '1463', sets: 3, reps: 12 },
      { id: '0586', sets: 3, reps: 12 },
      { id: '1372', sets: 4, reps: 15 },
    ],
  },
  {
    id: 'full-body',
    name: 'Full body',
    focus: 'Tout le corps, 3 fois par semaine',
    exercises: [
      { id: '0043', sets: 3, reps: 8 },
      { id: '0025', sets: 3, reps: 8 },
      { id: '0027', sets: 3, reps: 8 },
      { id: '0091', sets: 3, reps: 10 },
      { id: '0472', sets: 3, reps: 10 },
    ],
  },
  {
    id: 'home',
    name: 'Maison, sans matériel',
    focus: 'Poids du corps uniquement',
    exercises: [
      { id: '0662', sets: 4, reps: 12 },
      { id: '0814', sets: 3, reps: 10 },
      { id: '1460', sets: 3, reps: 12 },
      { id: '3013', sets: 3, reps: 15 },
      { id: '0630', sets: 3, reps: 20 },
    ],
  },
  {
    id: 'abs',
    name: 'Abdos',
    focus: 'Sangle abdominale, 15 minutes',
    exercises: [
      { id: '0274', sets: 3, reps: 20 },
      { id: '0472', sets: 3, reps: 10 },
      { id: '0687', sets: 3, reps: 20 },
      { id: '0735', sets: 3, reps: 15 },
      { id: '0630', sets: 3, reps: 20 },
    ],
  },
];

export const getBuiltinTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
