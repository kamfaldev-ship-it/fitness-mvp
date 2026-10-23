import { computeRecords, countsForRecord, exerciseSessions, lastSets, recordKind, workoutVolume } from '../stats';
import { commitDraft, moveExercise, openForEdit, replaceExercise } from '../workoutOps';
import { SetLog, Workout } from '../types';

const set = (weight: string, reps: string, extra: Partial<SetLog> = {}): SetLog => ({ weight, reps, done: true, ...extra });
const wk = (id: string, date: string, exercises: Workout['exercises']): Workout => ({ id, name: id, startedAt: date, endedAt: date, exercises });

describe('set types', () => {
  test('warm-ups are excluded from volume, drops count in volume but not records', () => {
    const w = wk('a', '2026-01-01T10:00:00Z', [
      { exerciseId: 'x', sets: [set('20', '10', { kind: 'warmup' }), set('60', '8'), set('40', '10', { kind: 'drop' }), set('60', '5', { kind: 'failure' })] },
    ]);
    expect(workoutVolume(w)).toBe(60 * 8 + 40 * 10 + 60 * 5);
    expect(countsForRecord(set('40', '10', { kind: 'drop' }))).toBe(false);
    expect(countsForRecord(set('60', '5', { kind: 'failure' }))).toBe(true);
  });

  test('a heavier warm-up cannot create a record', () => {
    const history = [wk('old', '2026-01-01T10:00:00Z', [{ exerciseId: 'x', sets: [set('60', '8')] }])];
    const today: Workout['exercises'] = [{ exerciseId: 'x', sets: [set('100', '1', { kind: 'warmup' }), set('55', '8')] }];
    expect(computeRecords(history, today)).toEqual([]);
  });

  test('lastSets ignores warm-ups', () => {
    const h = [wk('a', '2026-01-01T10:00:00Z', [{ exerciseId: 'x', sets: [set('20', '10', { kind: 'warmup' }), set('60', '8')] }])];
    expect(lastSets(h, 'x')?.sets).toHaveLength(1);
  });
});

describe('timed exercises', () => {
  const plank = (d: string, secs: string[]) => wk(d, d, [{ exerciseId: 'p', timed: true, sets: secs.map((s) => set('', s)) }]);

  test('no lifted volume', () => {
    expect(workoutVolume(plank('2026-01-01T10:00:00Z', ['60', '45']))).toBe(0);
  });
  test('best session value is the longest hold', () => {
    const s = exerciseSessions([plank('2026-01-01T10:00:00Z', ['30', '45'])]).get('p')!;
    expect(s[0]).toMatchObject({ reps: 45, timed: true });
  });
  test('record when the hold beats the previous best', () => {
    const history = [plank('2026-01-01T10:00:00Z', ['45'])];
    expect(computeRecords(history, plank('2026-01-08T10:00:00Z', ['50']).exercises)[0]).toMatchObject({ kind: 'time', reps: 50 });
    expect(computeRecords(history, plank('2026-01-08T10:00:00Z', ['40']).exercises)).toEqual([]);
    expect(recordKind(null, 0, 60, true)).toBeNull();
  });
});

describe('reorder and replace', () => {
  const base = (): Workout => ({
    id: 'd', name: 'd', startedAt: '2026-01-01T10:00:00Z',
    exercises: [
      { exerciseId: 'a', superset: true, sets: [set('60', '8')] },
      { exerciseId: 'b', sets: [set('20', '10', { rest: 30, kind: 'drop', rpe: 9 })] },
      { exerciseId: 'c', sets: [set('10', '12')] },
    ],
  });

  test('moves down and up, ignores the edges', () => {
    expect(moveExercise(base(), 0, 1).exercises.map((e) => e.exerciseId)).toEqual(['b', 'a', 'c']);
    expect(moveExercise(base(), 2, -1).exercises.map((e) => e.exerciseId)).toEqual(['a', 'c', 'b']);
    expect(moveExercise(base(), 0, -1).exercises.map((e) => e.exerciseId)).toEqual(['a', 'b', 'c']);
  });

  test('the last exercise never keeps a superset link', () => {
    const d = moveExercise(base(), 0, 1); // a (superset) moves to index 1, still has a next
    expect(d.exercises[1].superset).toBe(true);
    const e = moveExercise(base(), 1, 1);
    expect(e.exercises[2].superset).toBe(false);
  });

  test('replace keeps rests and resets progress', () => {
    const d = replaceExercise(base(), 1, 'z', false, '25');
    const ex = d.exercises[1];
    expect(ex.exerciseId).toBe('z');
    expect(ex.sets[0]).toMatchObject({ rest: 30, weight: '25', done: false });
    expect(ex.sets[0].rpe).toBeUndefined();
    expect(ex.sets[0].kind).toBeUndefined();
  });
});

describe('editing a saved workout', () => {
  const saved = wk('w1', '2026-01-05T10:00:00Z', [{ exerciseId: 'x', sets: [set('60', '8')] }]);
  const older = wk('w0', '2026-01-01T10:00:00Z', [{ exerciseId: 'x', sets: [set('50', '8')] }]);
  const usable = (s: SetLog) => s.done;
  const recs = (others: Workout[], ex: Workout['exercises']) => computeRecords(others, ex);

  test('edits in place without adding a second workout', () => {
    const draft = openForEdit(saved);
    draft.exercises[0].sets[0].weight = '65';
    const res = commitDraft(draft, [saved, older], recs, usable)!;
    expect(res.history).toHaveLength(2);
    expect(res.history[0].id).toBe('w1');
    expect(res.history[0].exercises[0].sets[0].weight).toBe('65');
    expect(res.history[0].endedAt).toBe(saved.endedAt);
    expect('editingId' in res.history[0]).toBe(false);
  });

  test('records are recomputed against the other workouts only', () => {
    const draft = openForEdit(saved);
    const res = commitDraft(draft, [saved, older], recs, usable)!;
    expect(res.history[0].records?.[0]).toMatchObject({ weight: 60, kind: 'weight' });
  });

  test('a new workout goes first and gets an end time', () => {
    const draft: Workout = { id: 'n', name: 'n', startedAt: '2026-01-09T10:00:00Z', exercises: [{ exerciseId: 'x', sets: [set('70', '5'), { weight: '', reps: '', done: false }] }] };
    const res = commitDraft(draft, [saved], recs, usable, new Date('2026-01-09T11:00:00Z'))!;
    expect(res.history.map((w) => w.id)).toEqual(['n', 'w1']);
    expect(res.workout.endedAt).toBe('2026-01-09T11:00:00.000Z');
    expect(res.workout.exercises[0].sets).toHaveLength(1);
  });

  test('nothing validated returns null', () => {
    const d: Workout = { id: 'n', name: 'n', startedAt: 'x', exercises: [{ exerciseId: 'x', sets: [{ weight: '1', reps: '1', done: false }] }] };
    expect(commitDraft(d, [], recs, usable)).toBeNull();
  });
});
