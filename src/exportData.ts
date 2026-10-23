import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PersistedState } from './types';

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// One line per set, easy to open in a spreadsheet
export function buildCsv(state: Pick<PersistedState, 'history' | 'settings'>, nameOf: (exerciseId: string) => string) {
  const rows: (string | number)[][] = [['date', 'seance', 'exercice', 'serie', 'type', 'charge', 'unite', 'mesure', 'valeur', 'rpe', 'note']];
  for (const w of state.history) {
    for (const ex of w.exercises) {
      ex.sets.forEach((st, i) => {
        if (!st.done) return;
        rows.push([w.startedAt.slice(0, 10), w.name, nameOf(ex.exerciseId), i + 1, st.kind ?? 'normal', st.weight, state.settings.unit, ex.timed ? 'secondes' : 'reps', st.reps, st.rpe ?? '', i === 0 ? (ex.note ?? '') : '']);
      });
    }
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

export const buildJson = (state: PersistedState) => JSON.stringify(state, null, 2);

async function shareFile(name: string, content: string, mimeType: string, UTI: string) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Le partage n’est pas disponible sur cet appareil.');
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: name });
}

const stamp = () => new Date().toISOString().slice(0, 10);

export const shareJson = (state: PersistedState) => shareFile(`sauvegarde-fitness-${stamp()}.json`, buildJson(state), 'application/json', 'public.json');
export const shareCsv = (csv: string) => shareFile(`seances-fitness-${stamp()}.csv`, csv, 'text/csv', 'public.comma-separated-values-text');

// Returns the parsed JSON, or null when the user cancelled the picker
export async function pickJson(): Promise<unknown | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
  if (res.canceled) return null;
  const text = await new File(res.assets[0].uri).text();
  return JSON.parse(text);
}
