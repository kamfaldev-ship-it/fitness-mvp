# Décisions

Une entrée par décision : contexte, choix, raison. Les plus récentes en haut de leur date.

## 2026-10-23

### Expo Go uniquement, SDK 58 (migré depuis 57)
- **Choix** : rester sur Expo Go (pas de development build), SDK 58 (RN 0.88, React 19.3). Le projet était en SDK 57 ; l'Expo Go de l'iPhone est passé au SDK 58 et ne peut pas être rétrogradé sur iOS réel → migration (2026-10-23, 2e fois).
- **Règle** : suivre le SDK de l'Expo Go installé. Historique : voir `ERREURS.md`.
- **Raison** : Expo Go de l'iPhone refusait un SDK différent du sien (« incompatible »). Pas de compte/build EAS voulu pour un MVP.
- **Conséquence** : uniquement des modules natifs inclus dans Expo Go ; `app.json` sans `plugins`.

### React Navigation, pas Expo Router
- **Choix** : native-stack + bottom-tabs (`App.tsx`).
- **Raison** : app écrite ainsi dès le départ ; `AGENTS.md` mentionne Expo Router par défaut mais ne s'applique pas ici.

### Stockage local seulement (AsyncStorage)
- Clé `fitness-mvp/v1`, état `version: 2`, migration dans `normalizeState` (`src/persist.ts`).
- Pas de cloud, pas de compte. Sauvegarde = export JSON/CSV (Réglages).
- Un import étranger au format est rejeté (pas de mélange silencieux).

### Poids stockés en chaînes, unité convertie à la volée
- Les champs de saisie manipulent des `string`. Changer kg/lb convertit tout l'historique, le brouillon et le poids de corps (arrondi 0,1).

### Règles de calcul des séries
- `warmup` : exclu du volume et des records. `drop` : compte au volume, pas aux records. `failure` : normal.
- Exercice à durée : `reps` contient des **secondes** ; exclu du volume, record de type `time`.
- Priorité des records : charge > 1RM estimé > durée.

### Repos par série
- `SetLog.rest` : `undefined` = défaut, `0` = aucun repos. Portée de modification : série / exercice / séance entière (`src/restRules.ts`, fonctions pures).
- Le repos est stocké comme **horodatage de fin** (survit à l'arrière-plan) ; la notification locale a un identifiant fixe `rest-timer` (remplacée, jamais empilée).

### Palette « disques d'haltères » + thème clair/sombre
- Bleu 20 kg (primaire), vert 10 kg (succès), jaune 15 kg (records). Clair par défaut, sombre automatique.
- Barlow Condensed (chiffres, titres) + Barlow (texte). Lignes séparées par filets plutôt que cartes.

### Mouvement : Reanimated, respect de « Réduire les animations »
- Toute animation passe par `src/motion.tsx` ; `useReduceMotion` désactive ressorts/confettis.

### Lancement via `npm start` → `scripts/dev.js`
- **Raison** : mêmes pannes de connexion revenues à chaque session (voir `ERREURS.md`). Le script les prévient au lieu de les documenter seulement.
- `npx expo start` direct est déconseillé. Mode direct (LAN) par défaut, tunnel en secours.

### Pas de commit git
- Le dossier est un dépôt créé par Expo ; rien n'a été commité (non demandé).

### Documentation tenue à jour à chaque modification
- Règle permanente demandée par l'utilisateur : voir `CLAUDE.md`.

## Pistes écartées / non faites
Synchronisation cloud, Apple Health, build EAS, programmes multi-semaines, stats par muscle, traduction des ~1 150 exercices restants (168 noms FR présents), mémorisation du repos dans les modèles, conditions d'usage des GIF Gym visual si publication.
