# Fitness MVP

App Expo (React Native + TypeScript) : séances, progression, bibliothèque de 1 324 exercices.

## Lancer l'app

```bash
npm install
npm start
```

Puis, **dans l'app Expo Go** de l'iPhone : onglet *Scan QR code*, ou *Enter URL manually* avec l'adresse `exp://…` affichée.

| Commande | Quand |
|---|---|
| `npm start` | Usage normal, en direct sur le Wi-Fi |
| `npm run start:clean` | Après un gros changement, ou si l'app affiche d'anciennes versions |
| `npm run start:tunnel` | Seulement si le Wi-Fi bloque l'iPhone (via ngrok, parfois instable) |
| `npm run check` | Typage + tests + diagnostic Expo |

N'utilise pas `npx expo start` directement : `npm start` répare d'abord ce qui casse la connexion
(voir `scripts/dev.js`).

## Si l'iPhone n'arrive pas à ouvrir le projet

1. Safari sur l'iPhone, adresse `http://<IP du Mac>:8081/status` : doit afficher `packager-status:running`.
   - Rien ne s'affiche : l'iPhone n'est pas sur le même Wi-Fi, ou la box isole les appareils.
     Solution fiable : activer le partage de connexion de l'iPhone et y connecter le Mac.
2. *Réglages > Expo Go > Réseau local* doit être activé.
3. « Project is incompatible with this version of Expo Go » : le SDK du projet diffère de celui d’Expo Go (actuellement SDK 58). Aligner le projet : `npm i expo@^58` puis `npx expo install --fix`.
4. Erreur `failed to start tunnel` : problème côté ngrok, réessayer ou rester en mode direct.
5. `app.json` ne doit contenir **aucun** `plugins` : sinon Expo démarre en « development build »
   et Expo Go ne peut plus ouvrir le projet. `expo install` en ajoute parfois ; `npm start` les retire.

## Fonctionnalités

Séances (séries, repos par série, exercices à durée, types de série, RPE, notes, superset), modèles intégrés et personnalisés,
exercices personnalisés, édition d'une séance enregistrée, records et récap, progression (charges, poids de corps),
calendrier et objectif hebdo, calculateur de disques, kg/lb, export/import JSON et CSV, mode sombre, animations.

## Documentation

- `docs/DECISIONS.md` : choix faits et pourquoi
- `docs/PATTERNS.md` : conventions et patterns du code
- `docs/ERREURS.md` : erreurs rencontrées, causes, corrections
- `AGENTS.md` / `CLAUDE.md` : consignes pour l'assistant (dont la mise à jour de ces fichiers à chaque modification)

## Données

- Exercices : [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), allégés par `scripts/build-data.js`.
- Les GIF et vignettes sont chargés depuis GitHub (© Gym visual — https://gymvisual.com/). Leurs conditions d'usage s'appliquent si l'app est publiée.
- Les séances sont stockées localement (AsyncStorage). Réglages > Exporter pour sauvegarder.
