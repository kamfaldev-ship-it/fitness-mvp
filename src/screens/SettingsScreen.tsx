import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useToast } from '../components/Toast';
import { RestEditor } from '../components/RestEditor';
import { Chip, SectionTitle, useStyles } from '../components/ui';
import { fmtDuration } from '../stats';
import { ATTRIBUTION, exerciseName, getExercise } from '../data/exercises';
import { buildCsv, pickJson, shareCsv, shareJson } from '../exportData';
import { prefetchAllThumbnails } from '../offline';
import { useStore } from '../store';
import { Colors, font, space, tabular, useTheme } from '../theme';
import { RootStackParamList, Unit } from '../types';

const STEPS = [1, 1.25, 2.5, 5];

function Row({ icon, label, hint, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string; onPress: () => void }) {
  const s = useStyles(styles);
  const c = useTheme();
  return (
    <Pressable style={s.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={hint ? `${label}. ${hint}` : label}>
      <Ionicons name={icon} size={22} color={c.ink} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {hint && <Text style={s.hint}>{hint}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.muted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useStore();
  const { settings, setSettings, setUnit, importData, history, templates, favorites, customExercises, bodyLog, draft } = store;
  const showToast = useToast();
  const s = useStyles(styles);
  const c = useTheme();
  const [editRest, setEditRest] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const snapshot = () => ({ version: 2 as const, history, draft, templates, favorites, customExercises, bodyLog, settings });
  const fail = (e: unknown) => Alert.alert('Échec', e instanceof Error ? e.message : 'Une erreur est survenue.');

  const changeUnit = (to: Unit) => {
    if (to === settings.unit) return;
    Alert.alert(`Passer en ${to} ?`, `Toutes tes charges enregistrées seront converties en ${to} (arrondies à 0,1).`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Convertir', onPress: () => setUnit(to) },
    ]);
  };

  const importJson = async () => {
    try {
      const raw = await pickJson();
      if (raw === null) return;
      Alert.alert('Remplacer toutes les données ?', 'Les séances, modèles et réglages actuels seront remplacés par ceux du fichier.', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Remplacer',
          style: 'destructive',
          onPress: () => (importData(raw) ? showToast({ message: 'Sauvegarde importée' }) : Alert.alert('Fichier non reconnu', 'Ce fichier n’est pas une sauvegarde de cette application.')),
        },
      ]);
    } catch {
      Alert.alert('Fichier illisible', 'Choisis un fichier .json exporté depuis cette application.');
    }
  };

  const downloadImages = async () => {
    setProgress({ done: 0, total: 1 });
    const failed = await prefetchAllThumbnails((done, total) => setProgress({ done, total }));
    setProgress(null);
    showToast({ message: failed ? 'Téléchargement incomplet, réessaie avec du réseau' : 'Vignettes disponibles hors ligne' });
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: space.md, paddingBottom: 48 }}>
      <SectionTitle>Entraînement</SectionTitle>
      <Text style={s.label}>Objectif par semaine</Text>
      <View style={s.chips}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <Chip key={n} label={`${n} séance${n > 1 ? 's' : ''}`} active={settings.weeklyGoal === n} onPress={() => setSettings({ weeklyGoal: n })} />
        ))}
      </View>
      <Row icon="timer-outline" label={`Repos par défaut : ${fmtDuration(settings.restSeconds)}`} hint="À la seconde près. Pendant la séance, tu peux régler le repos série par série." onPress={() => setEditRest(true)} />
      <Text style={s.label}>Unité de charge</Text>
      <View style={s.chips}>
        {(['kg', 'lb'] as Unit[]).map((u) => (
          <Chip key={u} label={u} active={settings.unit === u} onPress={() => changeUnit(u)} />
        ))}
      </View>
      <Text style={s.label}>Pas des boutons + et − ({settings.unit})</Text>
      <View style={s.chips}>
        {STEPS.map((n) => (
          <Chip key={n} label={String(n).replace('.', ',')} active={settings.step === n} onPress={() => setSettings({ step: n })} />
        ))}
      </View>

      <SectionTitle>Outils</SectionTitle>
      <Row icon="calculator-outline" label="Calculateur de disques" hint="Quels disques charger de chaque côté de la barre" onPress={() => nav.navigate('PlateCalc')} />

      <SectionTitle>Mes données</SectionTitle>
      <Text style={s.note}>Tout est stocké sur ce téléphone. Exporte une sauvegarde avant de changer d’appareil ou de désinstaller l’app.</Text>
      <Row icon="download-outline" label="Exporter une sauvegarde (JSON)" hint="Séances, modèles, favoris, poids de corps" onPress={() => shareJson(snapshot()).catch(fail)} />
      <Row
        icon="document-text-outline"
        label="Exporter les séances (CSV)"
        hint="Une ligne par série, pour un tableur"
        onPress={() => shareCsv(buildCsv({ history, settings }, (id) => { const ex = getExercise(id); return ex ? exerciseName(ex) : id; })).catch(fail)}
      />
      <Row icon="push-outline" label="Importer une sauvegarde" hint="Remplace les données actuelles" onPress={importJson} />

      <SectionTitle>Hors ligne</SectionTitle>
      <Text style={s.note}>Les images vues et celles de tes séances sont déjà gardées en mémoire. Tu peux aussi télécharger toutes les vignettes pour parcourir la bibliothèque sans réseau.</Text>
      {progress ? (
        <View accessible accessibilityLabel={`Téléchargement : ${progress.done} sur ${progress.total}`} style={{ marginTop: 8 }}>
          <View style={s.track}>
            <View style={[s.fill, { width: `${(progress.done / progress.total) * 100}%` }]} />
          </View>
          <Text style={s.hint}>
            {progress.done} sur {progress.total}
          </Text>
        </View>
      ) : (
        <Row icon="cloud-download-outline" label="Télécharger les vignettes" hint="Environ 1 300 petites images" onPress={downloadImages} />
      )}

      <Text style={[s.note, { marginTop: space.xl }]}>Exercices : hasaneyldrm/exercises-dataset (MIT). Images et animations : {ATTRIBUTION}</Text>
      <RestEditor
        visible={editRest}
        title="Repos par défaut"
        initial={settings.restSeconds}
        onSubmit={(seconds) => {
          setSettings({ restSeconds: seconds });
          setEditRest(false);
        }}
        onCancel={() => setEditRest(false)}
      />
    </ScrollView>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  label: { color: c.muted, fontFamily: font.medium, fontSize: 15, marginTop: 12, marginBottom: 8 },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  note: { color: c.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, minHeight: 60, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line },
  rowLabel: { color: c.ink, fontFamily: font.semibold, fontSize: 16 },
  hint: { color: c.muted, fontFamily: font.body, fontSize: 13, marginTop: 1, fontVariant: tabular },
  track: { height: 10, borderRadius: 5, backgroundColor: c.line, overflow: 'hidden' as const },
  fill: { height: 10, backgroundColor: c.primary },
});
