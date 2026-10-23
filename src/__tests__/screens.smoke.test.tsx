import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: async () => {}, isLoading: () => false }));
jest.mock('react-native-reanimated', () => require('./reanimatedStub'));
jest.mock('react-native-worklets', () => ({}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: async () => ({ granted: false, canAskAgain: false }),
  cancelScheduledNotificationAsync: async () => {},
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

const KEY = 'fitness-mvp/v1';
const set = (weight: string, reps: string, extra: object = {}) => ({ weight, reps, done: true, ...extra });

const state = {
  version: 2,
  settings: { restSeconds: 90, unit: 'kg', step: 2.5, weeklyGoal: 3 },
  customExercises: [{ id: 'c-1', name: 'Tractions lestées', bodyPart: 'back', equipment: 'body weight', target: 'back', secondary: [], steps: { en: [], fr: [] }, image: '', gif: '', custom: true, mode: 'reps' }],
  favorites: ['0025'],
  bodyLog: [{ id: 'b1', date: '2026-01-05T08:00:00Z', weight: 80 }, { id: 'b2', date: '2026-01-12T08:00:00Z', weight: 79.5 }],
  templates: [{ id: 't-1', name: 'Mon push', focus: 'Perso', custom: true, exercises: [{ id: '0025', sets: 3, reps: 8 }, { id: 'c-1', sets: 3, reps: 5 }] }],
  history: [
    {
      id: 'w2', name: 'Push', templateId: 'push', startedAt: '2026-01-12T10:00:00.000Z', endedAt: '2026-01-12T11:00:00.000Z',
      records: [{ exerciseId: '0025', weight: 65, reps: 5, kind: 'weight' }, { exerciseId: '0464', weight: 0, reps: 60, kind: 'time' }],
      exercises: [
        { exerciseId: '0025', superset: true, note: 'épaule ok', sets: [set('20', '10', { kind: 'warmup' }), set('65', '5', { rpe: 9 }), set('50', '8', { kind: 'drop' })] },
        { exerciseId: '0464', timed: true, sets: [set('', '60'), set('', '45', { kind: 'failure' })] },
        { exerciseId: 'c-1', sets: [set('10', '5', { rest: 0 })] },
      ],
    },
    { id: 'w1', name: 'Push', templateId: 'push', startedAt: '2026-01-05T10:00:00.000Z', endedAt: '2026-01-05T11:00:00.000Z', exercises: [{ exerciseId: '0025', sets: [set('60', '8')] }, { exerciseId: '0464', timed: true, sets: [set('', '50')] }] },
  ],
  draft: {
    id: 'd', name: 'Séance du jour', startedAt: new Date().toISOString(),
    exercises: [
      { key: 'e1', exerciseId: '0025', superset: true, note: '', sets: [{ key: 's1', weight: '60', reps: '8', done: false, kind: 'warmup', rest: 30 }, { key: 's2', weight: '65', reps: '5', done: true, rpe: 8 }] },
      { key: 'e2', exerciseId: '0464', timed: true, sets: [{ key: 's3', weight: '', reps: '30', done: false }] },
      { key: 'e3', exerciseId: 'c-1', sets: [{ weight: '', reps: '5', done: false }] },
    ],
  },
};

const Stack = createNativeStackNavigator();

async function render(name: string, params?: object, seed: unknown = state) {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(KEY, JSON.stringify(seed));
  const screens: Record<string, React.ComponentType<any>> = {
    Workout: require('../screens/WorkoutScreen').default,
    Summary: require('../screens/SummaryScreen').default,
    WorkoutDetail: require('../screens/WorkoutDetailScreen').default,
    Template: require('../screens/TemplateScreen').default,
    TemplateEdit: require('../screens/TemplateEditScreen').default,
    ExerciseDetail: require('../screens/ExerciseDetailScreen').default,
    CustomExercise: require('../screens/CustomExerciseScreen').default,
    PlateCalc: require('../screens/PlateCalcScreen').default,
    Settings: require('../screens/SettingsScreen').default,
    Tabs: () => {
      const Home = require('../screens/HomeScreen').default;
      const History = require('../screens/HistoryScreen').default;
      const Progress = require('../screens/ProgressScreen').default;
      const Exercises = require('../screens/ExercisesScreen').default;
      return (
        <>
          <Home />
          <History />
          <Progress />
          <Exercises />
        </>
      );
    },
  };
  const { StoreProvider } = require('../store');
  const { ToastProvider } = require('../components/Toast');
  const { SafeAreaProvider } = require('react-native-safe-area-context');
  const errors: unknown[] = [];
  const spy = jest.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a));
  let tree!: any;
  await act(async () => {
    tree = renderer.create(
      <SafeAreaProvider>
        <StoreProvider>
          <ToastProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName={name}>
                <Stack.Screen name={name} component={screens[name]} initialParams={params} />
                <Stack.Screen name="Picker" component={screens.Tabs} />
              </Stack.Navigator>
            </NavigationContainer>
          </ToastProvider>
        </StoreProvider>
      </SafeAreaProvider>,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 80));
  });
  spy.mockRestore();
  // only the text that ended up on screen
  const collect = (n: any): string[] => (n == null ? [] : typeof n === 'string' ? [n] : Array.isArray(n) ? n.flatMap(collect) : collect(n.children));
  const out = collect(tree.toJSON()).join(' | ');
  await act(async () => {
    tree.unmount();
  });
  return { out, errors };
}

describe('every screen renders with rich data', () => {
  const cases: [string, object | undefined, string][] = [
    ['Workout', undefined, 'Superset'],
    ['Summary', { id: 'w2' }, 'Séance terminée'],
    ['WorkoutDetail', { id: 'w2' }, 'Modifier la séance'],
    ['Template', { id: 't-1' }, 'Mon push'],
    ['Template', { id: 'push' }, 'Dupliquer'],
    ['TemplateEdit', { id: 't-1' }, 'Tractions lestées'],
    ['ExerciseDetail', { id: '0025' }, 'Ajouter à ma séance'],
    ['ExerciseDetail', { id: 'c-1' }, 'Supprimer cet exercice'],
    ['ExerciseDetail', { id: '0464' }, 'Ta progression'],
    ['CustomExercise', undefined, 'Nom'],
    ['PlateCalc', undefined, 'Charge totale'],
    ['Settings', undefined, 'Mes données'],
    ['Tabs', undefined, 'Progression'],
  ];
  test.each(cases)('%s %j', async (name, params, expected) => {
    const { out, errors } = await render(name, params);
    expect(errors).toEqual([]);
    expect(out).toContain(expected);
  });

  test('Workout with the oldest data shape (no keys, no settings)', async () => {
    const old = { history: [], draft: { id: 'd', name: 'Ancienne', startedAt: new Date().toISOString(), exercises: [{ exerciseId: '0025', sets: [{ reps: '10', weight: '', done: false }] }, { exerciseId: '0464', sets: [{ reps: '30', weight: '', done: false }] }] } };
    const { out, errors } = await render('Workout', undefined, old);
    expect(errors).toEqual([]);
    expect(out).toContain('Disques');
  });
});
