# Patterns utilisés

## État
- **Store unique** (`src/store.tsx`) : `StoreProvider` + `useStore()`. Actions exposées dans la valeur du contexte ; persistance AsyncStorage débouncée.
- **`stableContext(name, initial)`** (`src/stableContext.ts`) : le contexte est rangé sur `globalThis`, donc un Fast Refresh ne crée pas un second contexte (sinon « useStore outside StoreProvider »). Utilisé pour le store et les toasts.
- **Complétion de l'état** : le provider fusionne `emptyState()` + état courant + réglages par défaut, pour survivre à un champ ajouté pendant un rechargement à chaud.
- **`normalizeState`** : toute donnée lue (disque, import) est validée/migrée (v1 → v2) avant usage.
- **Fonctions pures testables** : `stats.ts`, `workoutOps.ts`, `restRules.ts`, `plates.ts`, `units.ts`, `exportData.ts`. L'UI n'y contient pas de logique métier.
- **`commitDraft`** : une seule voie pour terminer une séance, y compris en édition (`editingId`), qui recalcule les records contre les autres séances.

## Annuler plutôt que confirmer
Suppression de série/exercice/séance/modèle → action immédiate + toast « Annuler » (`Toast.tsx`, `restoreDraft`/`restoreWorkout`/`restoreTemplate`).

## UI
- `useStyles(factory)` + thème (`theme.ts`) : styles dépendants du mode clair/sombre.
- Composants communs dans `components/ui.tsx` (Button, Chip, Stat, Plate, BarChart, ExerciseRow…).
- Clés stables (`key`) sur exercices et séries pour que les animations de layout Reanimated fonctionnent.
- Chiffres en tabulaire ; hauteurs en `minHeight` (texte agrandi) ; cibles ≥ 44 px ; libellés VoiceOver.
- Menus via `ActionSheetIOS` (`src/menu.ts`) ; stepper ± via `InputAccessoryView` (iOS).

## Mouvement (`src/motion.tsx`)
`PressableScale` (retour tactile), `CountUp`, `Confetti`, ressorts `SPRING`/`POP`, `entering`/`exiting`/`layout` Reanimated sur listes, haptique sur validations et changements d'onglet. Un seul moment fort par écran ; le reste discret.

## Données et réseau
- Images : `expo-image` (cache disque) + préchargement ciblé (`offline.ts`).
- Noms FR : `names.fr.json`, repli sur l'anglais ; recherche FR + EN.
- Exercices perso : enregistrés dans le store, injectés dans le catalogue par `registerCustomExercises`.

## Outillage
- **`scripts/dev.js` + `devlib.js`** : retire `plugins` d'`app.json`, arrête les anciens serveurs de ce projet, choisit un port libre, force l'IP Wi-Fi (`REACT_NATIVE_PACKAGER_HOSTNAME`), affiche l'URL de test Safari. `--dry` simule.
- **Tests** : Jest (`jest-expo`), tests unitaires + tests « smoke » qui rendent les écrans avec un stub Reanimated écrit à la main (`src/__tests__/reanimatedStub.js`).
- **`npm run check`** : `tsc` + Jest + `expo-doctor`. À lancer avant de déclarer une tâche finie ; ajouter `npx expo export --platform ios` après un changement de dépendance.
- Après tout `npx expo install` : `grep -c plugins app.json` doit valoir 0.
