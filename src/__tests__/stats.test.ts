import { calendarMonth, computeRecords, e1rm, lastSets, recordKind, suggestNext, weekStreak, workoutVolume } from '../stats';
import { Workout } from '../types';

const w = (id: string, startedAt: string, exerciseId: string, sets: [string, string][], templateId?: string): Workout => ({
  id,
  name: id,
  startedAt,
  templateId,
  exercises: [{ exerciseId, sets: sets.map(([weight, reps]) => ({ weight, reps, done: true })) }],
});

describe('stats', () => {
  test('workoutVolume sums done sets only', () => {
    const x = w('a', '2026-01-05T10:00:00Z', '0025', [['60', '10'], ['62,5', '8']]);
    x.exercises[0].sets.push({ weight: '100', reps: '10', done: false });
    expect(workoutVolume(x)).toBe(600 + 500);
  });

  test('lastSets returns the most recent session with the exercise', () => {
    const h = [w('old', '2026-01-01T10:00:00Z', '0025', [['50', '10']]), w('new', '2026-01-08T10:00:00Z', '0025', [['60', '8']])];
    expect(lastSets(h, '0025')?.sets[0].weight).toBe('60');
    expect(lastSets(h, '9999')).toBeNull();
  });

  test('first time is a baseline, not a record', () => {
    expect(recordKind(null, 100, 5)).toBeNull();
  });

  test('record by weight or by estimated 1RM', () => {
    const prior = { weight: 60, e1rm: e1rm(60, 8) };
    expect(recordKind(prior, 62.5, 1)).toBe('weight');
    expect(recordKind(prior, 60, 12)).toBe('e1rm');
    expect(recordKind(prior, 55, 5)).toBeNull();
  });

  test('computeRecords keeps the best record set per exercise', () => {
    const h = [w('old', '2026-01-01T10:00:00Z', '0025', [['60', '8']])];
    const today = w('now', '2026-01-08T10:00:00Z', '0025', [['62.5', '5'], ['65', '3']]);
    const hits = computeRecords(h, today.exercises);
    expect(hits).toHaveLength(1);
    expect(hits[0].weight).toBe(65);
  });

  test('weekStreak counts consecutive weeks meeting the goal', () => {
    const now = new Date('2026-01-22T12:00:00'); // Thursday
    const h = [
      w('a', '2026-01-19T09:00:00', '1', [['1', '1']]), // this week (Mon 19)
      w('b', '2026-01-20T09:00:00', '1', [['1', '1']]),
      w('c', '2026-01-12T09:00:00', '1', [['1', '1']]), // last week
      w('d', '2026-01-13T09:00:00', '1', [['1', '1']]),
      w('e', '2026-01-05T09:00:00', '1', [['1', '1']]), // 2 weeks ago, only 1
    ];
    expect(weekStreak(h, 2, now)).toBe(2);
    expect(weekStreak(h, 3, now)).toBe(0);
  });

  test('calendarMonth pads to Monday and counts workouts', () => {
    const h = [w('a', '2026-01-07T09:00:00', '1', [['1', '1']])];
    const cells = calendarMonth(h, 2026, 0); // 1 Jan 2026 is a Thursday
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]).toEqual({ day: 1, count: 0 });
    expect(cells.find((c) => c?.day === 7)?.count).toBe(1);
    expect(cells.filter(Boolean)).toHaveLength(31);
  });

  test('suggestNext follows the template cycle', () => {
    const tpls = [{ id: 'push' }, { id: 'pull' }, { id: 'legs' }];
    expect(suggestNext([], tpls)?.next.id).toBe('push');
    const h = [w('a', '2026-01-05T09:00:00', '1', [['1', '1']], 'legs')];
    expect(suggestNext(h, tpls)?.next.id).toBe('push');
    const h2 = [w('a', '2026-01-05T09:00:00', '1', [['1', '1']], 'push')];
    expect(suggestNext(h2, tpls)?.next.id).toBe('pull');
  });
});
