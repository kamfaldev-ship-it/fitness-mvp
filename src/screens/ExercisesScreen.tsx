import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BODY_PARTS, allExercises, matchesQuery } from '../data/exercises';
import { Chip, ExerciseRow, ScreenTitle, useStyles } from '../components/ui';
import { PressableScale } from '../motion';
import { recentExerciseIds } from '../stats';
import { useStore } from '../store';
import { Colors, font, space, useTheme } from '../theme';
import { RootStackParamList } from '../types';

type Filter = string | null; // null = all, 'fav', 'recent', 'mine', or a body part key

const CHIPS: { key: Filter; label: string }[] = [
  { key: null, label: 'Tous' },
  { key: 'fav', label: 'Favoris' },
  { key: 'recent', label: 'Récents' },
  { key: 'mine', label: 'Mes exercices' },
  ...Object.keys(BODY_PARTS).map((k) => ({ key: k as Filter, label: BODY_PARTS[k] })),
];

// Used both as the "Exercices" tab and as the picker when adding to a workout or a template
export default function ExercisesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const picking = route.name === 'Picker';
  const params = route.params as { templateId?: string; replaceIndex?: number } | undefined;
  const templateId = params?.templateId;
  const replaceIndex = params?.replaceIndex;
  const { history, favorites, customExercises, addExercise, addToTemplate, replaceExercise } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(null);
  const s = useStyles(styles);
  const c = useTheme();

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = allExercises();
    let list = all;
    if (filter === 'fav') list = all.filter((e) => favorites.includes(e.id));
    else if (filter === 'mine') list = customExercises;
    else if (filter === 'recent') {
      const order = recentExerciseIds(history, 30);
      list = order.map((id) => all.find((e) => e.id === id)!).filter(Boolean);
    } else if (filter) list = all.filter((e) => e.bodyPart === filter);
    return q ? list.filter((e) => matchesQuery(e, q)) : list;
  }, [query, filter, favorites, history, customExercises]);

  const emptyText =
    filter === 'fav'
      ? 'Aucun favori. Appuie sur l’étoile d’une fiche d’exercice pour le retrouver ici.'
      : filter === 'mine'
        ? 'Tu n’as créé aucun exercice. Appuie sur + en haut pour ajouter le tien.'
        : filter === 'recent'
        ? 'Tes derniers exercices apparaîtront ici après ta première séance.'
        : 'Aucun exercice trouvé. Essaie un autre mot, en français ou en anglais.';

  const createButton = (
    <PressableScale scaleTo={0.9} onPress={() => nav.navigate('CustomExercise')} accessibilityRole="button" accessibilityLabel="Créer un exercice" style={s.create}>
      <Ionicons name="add" size={26} color={c.onPrimary} />
    </PressableScale>
  );

  return (
    <SafeAreaView style={s.screen} edges={picking ? [] : ['top']}>
      {!picking && <ScreenTitle right={createButton}>Exercices</ScreenTitle>}
      <View style={s.search}>
        <Ionicons name="search" size={20} color={c.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Nom, muscle ou matériel"
          placeholderTextColor={c.muted}
          style={s.input}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Rechercher un exercice"
          maxFontSizeMultiplier={1.3}
        />
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        data={CHIPS}
        keyExtractor={(k) => k.key ?? 'all'}
        contentContainerStyle={s.chips}
        renderItem={({ item }) => <Chip label={item.label} active={filter === item.key} onPress={() => setFilter(item.key)} />}
      />
      <View style={s.countRow}>
        <Text style={s.count}>{data.length} exercices</Text>
        {picking && (
          <PressableScale onPress={() => nav.navigate('CustomExercise')} accessibilityRole="button" style={s.createLink}>
            <Ionicons name="add-circle-outline" size={18} color={c.primary} />
            <Text style={s.createText}>Créer un exercice</Text>
          </PressableScale>
        )}
      </View>
      <FlatList
        data={data}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={14}
        windowSize={7}
        renderItem={({ item }) => (
          <ExerciseRow
            exercise={item}
            onPress={() => nav.navigate('ExerciseDetail', { id: item.id })}
            onAdd={
              picking
                ? () => {
                    if (templateId) addToTemplate(templateId, item.id);
                    else if (replaceIndex !== undefined) replaceExercise(replaceIndex, item.id);
                    else addExercise(item.id);
                    nav.goBack();
                  }
                : undefined
            }
          />
        )}
        ListEmptyComponent={<Text style={s.empty}>{emptyText}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = (c: Colors) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  search: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: c.surface, borderRadius: 14, marginHorizontal: space.md, marginTop: space.sm, paddingHorizontal: 14, minHeight: 50 },
  input: { flex: 1, color: c.ink, fontFamily: font.body, fontSize: 16, paddingVertical: 12 },
  chips: { paddingHorizontal: space.md, paddingVertical: 12, gap: 8 },
  count: { color: c.muted, fontFamily: font.body, fontSize: 13 },
  countRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: space.md, paddingBottom: 6, minHeight: 32 },
  create: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.primary, alignItems: 'center' as const, justifyContent: 'center' as const },
  createLink: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, minHeight: 44 },
  createText: { color: c.primary, fontFamily: font.semibold, fontSize: 14 },
  empty: { color: c.muted, fontFamily: font.body, fontSize: 15, textAlign: 'center' as const, marginTop: 40, paddingHorizontal: space.lg, lineHeight: 22 },
});
