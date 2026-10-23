import { applyRest, parseRest, restAfter } from '../restRules';
import { Workout } from '../types';

const draft = (): Workout => ({
  id: 'd',
  name: 'd',
  startedAt: '2026-01-01T10:00:00Z',
  exercises: [
    { exerciseId: 'a', sets: [{ reps: '8', weight: '60', done: false }, { reps: '8', weight: '60', done: false }, { reps: '8', weight: '60', done: false }] },
    { exerciseId: 'b', sets: [{ reps: '10', weight: '20', done: false }] },
  ],
});

describe('rest rules', () => {
  test('parseRest handles exact seconds and carry-over', () => {
    expect(parseRest('0', '30')).toBe(30);
    expect(parseRest('2', '5')).toBe(125);
    expect(parseRest('0', '90')).toBe(90);
    expect(parseRest('', '')).toBe(0);
    expect(parseRest('999', '0')).toBe(3600);
  });

  test('restAfter: own value wins, 0 means none', () => {
    expect(restAfter({}, 90)).toBe(90);
    expect(restAfter({ rest: 30 }, 90)).toBe(30);
    expect(restAfter({ rest: 0 }, 90)).toBe(0);
  });

  test('applies to one set only', () => {
    const d = applyRest(draft(), { scope: 'set', exIdx: 0, setIdx: 1 }, 30);
    expect(d.exercises[0].sets.map((s) => s.rest)).toEqual([undefined, 30, undefined]);
    expect(d.exercises[1].sets[0].rest).toBeUndefined();
  });

  test('applies to a whole exercise, then to the whole workout', () => {
    let d = applyRest(draft(), { scope: 'exercise', exIdx: 0 }, 45);
    expect(d.exercises[0].sets.map((s) => s.rest)).toEqual([45, 45, 45]);
    expect(d.exercises[1].sets[0].rest).toBeUndefined();
    d = applyRest(d, { scope: 'all' }, 0);
    expect(d.exercises.flatMap((e) => e.sets.map((s) => s.rest))).toEqual([0, 0, 0, 0]);
  });

  test('undefined clears overrides', () => {
    const d = applyRest(applyRest(draft(), { scope: 'all' }, 30), { scope: 'all' }, undefined);
    expect(d.exercises.flatMap((e) => e.sets.map((s) => 'rest' in s))).toEqual([false, false, false, false]);
  });
});
