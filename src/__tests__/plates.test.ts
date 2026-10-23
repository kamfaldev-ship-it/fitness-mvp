import { computePlates, PLATES } from '../plates';
import { convertWeightString } from '../units';

describe('plates', () => {
  test('82.5 kg on a 20 kg bar', () => {
    const r = computePlates(82.5, 20, PLATES.kg);
    expect(r.perSide).toEqual([25, 5, 1.25]);
    expect(r.rest).toBe(0);
  });
  test('bar only', () => {
    expect(computePlates(20, 20, PLATES.kg).perSide).toEqual([]);
  });
  test('below bar weight', () => {
    expect(computePlates(10, 20, PLATES.kg).tooLight).toBe(true);
  });
  test('reports what cannot be loaded', () => {
    expect(computePlates(21, 20, PLATES.kg).rest).toBe(1);
  });
});

describe('units', () => {
  test('kg to lb and back', () => {
    expect(convertWeightString('100', 'kg', 'lb')).toBe('220.5');
    expect(convertWeightString('220.5', 'lb', 'kg')).toBe('100');
  });
  test('keeps empty values', () => {
    expect(convertWeightString('', 'kg', 'lb')).toBe('');
  });
});

import { normalizeState } from '../persist';

describe('persist', () => {
  test('migrates a v1 state', () => {
    const s = normalizeState({ history: [], draft: null, restSeconds: 120 });
    expect(s?.version).toBe(2);
    expect(s?.settings.restSeconds).toBe(120);
    expect(s?.settings.unit).toBe('kg');
    expect(s?.templates).toEqual([]);
  });
  test('rejects foreign data', () => {
    expect(normalizeState({ foo: 1 })).toBeNull();
    expect(normalizeState({ history: [{ id: 1 }] })).toBeNull();
    expect(normalizeState(null)).toBeNull();
  });
});

import { buildCsv } from '../exportData';

describe('csv export', () => {
  test('one line per done set, quoted when needed', () => {
    const state: any = {
      settings: { unit: 'kg' },
      history: [
        {
          id: 'a',
          name: 'Push, jour 1',
          startedAt: '2026-01-05T10:00:00Z',
          exercises: [{ exerciseId: '1', note: 'épaule "ok"', sets: [{ weight: '60', reps: '8', done: true }, { weight: '70', reps: '1', done: false }] }],
        },
      ],
    };
    const csv = buildCsv(state, () => 'Développé couché');
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('2026-01-05,"Push, jour 1",Développé couché,1,normal,60,kg,reps,8,,"épaule ""ok"""');
  });
});
