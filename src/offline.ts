import { Image } from 'expo-image';
import { BUILTIN_EXERCISES, getExercise, mediaUrl } from './data/exercises';
import { TEMPLATES } from './data/templates';
import { PersistedState } from './types';

// expo-image already keeps viewed images on disk; this fetches the ones likely needed in the gym
export function exercisesToWarm(state: Pick<PersistedState, 'history' | 'favorites' | 'templates'>) {
  const ids = new Set<string>();
  for (const t of [...TEMPLATES, ...state.templates]) t.exercises.forEach((e) => ids.add(e.id));
  state.favorites.forEach((id) => ids.add(id));
  state.history.slice(0, 20).forEach((w) => w.exercises.forEach((e) => ids.add(e.exerciseId)));
  return [...ids];
}

export function warmCache(ids: string[]) {
  const urls = ids.flatMap((id) => {
    const ex = getExercise(id);
    return ex && ex.image ? [mediaUrl(ex.image), mediaUrl(ex.gif)] : [];
  });
  return Image.prefetch(urls, { cachePolicy: 'disk' }).catch(() => false);
}

// Every thumbnail (small files), in batches so progress can be shown. Returns how many failed.
export async function prefetchAllThumbnails(onProgress: (done: number, total: number) => void) {
  const urls = BUILTIN_EXERCISES.map((e) => mediaUrl(e.image));
  let failed = 0;
  for (let i = 0; i < urls.length; i += 40) {
    const ok = await Image.prefetch(urls.slice(i, i + 40), { cachePolicy: 'disk' }).catch(() => false);
    if (!ok) failed += 1;
    onProgress(Math.min(i + 40, urls.length), urls.length);
  }
  return failed;
}
