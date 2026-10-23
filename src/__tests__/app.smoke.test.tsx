import AsyncStorage from '@react-native-async-storage/async-storage';
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
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 50)); });

async function mount(seed?: unknown) {
  await AsyncStorage.clear();
  if (seed) await AsyncStorage.setItem(KEY, JSON.stringify(seed));
  const App = require('../../App').default;
  let tree!: any;
  await act(async () => {
    tree = renderer.create(<App />);
  });
  await flush();
  return tree;
}

const text = (t: any) => JSON.stringify(t.toJSON());

// state saved by the very first versions of the app (no keys, no settings, no custom exercises)
const v1 = {
  history: [
    { id: 'a', name: 'Push', startedAt: '2026-01-05T10:00:00.000Z', endedAt: '2026-01-05T11:00:00.000Z', exercises: [{ exerciseId: '0025', sets: [{ reps: '8', weight: '60', done: true }] }] },
  ],
  draft: null,
  restSeconds: 120,
};

describe('app smoke', () => {
  test('first launch renders the home screen', async () => {
    const t = await mount();
    expect(text(t)).toContain('On s’entraîne');
  });

  test('state saved by an older version still loads', async () => {
    const t = await mount(v1);
    expect(text(t)).toContain('On s’entraîne');
    expect(text(t)).toContain('Push');
  });

  test('an old in-progress workout without keys opens', async () => {
    const t = await mount({ ...v1, draft: { id: 'd', name: 'Séance', startedAt: '2026-01-06T10:00:00.000Z', exercises: [{ exerciseId: '0025', sets: [{ reps: '10', weight: '', done: false }] }] } });
    expect(text(t)).toContain('Séance en cours');
  });
});
