# Erreurs rencontrées et corrections

Format : symptôme → cause → correction → prévention.

## 2026-10-23

### « Opening project… » sans fin / Expo en « development build »
- **Cause** : `npx expo install` (expo-image, expo-font, expo-sharing…) ajoute des `plugins` dans `app.json` ; Expo bascule alors en development build, que Expo Go ne peut pas ouvrir. Survenu 4 fois.
- **Correction** : retrait des plugins.
- **Prévention** : `scripts/dev.js` les retire à chaque `npm start` et l'indique.

### « Project is incompatible with this version of Expo Go »
- **Cause** : SDK 58, plus récent que l'Expo Go installé.
- **Correction** : retour au SDK 57 (`npx expo install expo@^57.0.0`, réinstallation propre, `@types/react@~19.2.4`).
- **Récidive (inverse, 2026-10-23)** : Expo Go passé au SDK 58, projet en 57. Migration vers 58 : `npm i expo@^58`, `npx expo install @react-native/jest-preset` (peer requis de jest-expo 58), `npx expo install --fix`, `react-test-renderer@19.3.0` en devDependency (plus fourni transitivement), `StyleSheet.NamedStyles` supprimé en RN 0.88 → `Record<string, ViewStyle | TextStyle | ImageStyle>` dans `useStyles`. Script `check` : `expo-doctor` → `npx expo-doctor` (binaire absent).
- **Prévention** : le test `app.smoke` attend 50 ms ; peut être instable sous charge juste après une install, repasse ensuite.

### Tunnel : `*.exp.direct` introuvable, puis `failed to start tunnel … remote gone away`
- **Cause** : le DNS de la box (192.168.0.1) renvoie NXDOMAIN pour `*.exp.direct` ; ngrok parfois indisponible. (`simctl` : message sans gravité.)
- **Correction** : mode direct (LAN) par défaut ; tunnel en secours ; DNS 8.8.8.8/1.1.1.1 sur l'iPhone si besoin ; partage de connexion iPhone en dernier recours.

### Mauvaise adresse dans le QR code
- **Cause** : plusieurs interfaces sur le Mac (en0 192.168.0.102, bridge0, bridge100…).
- **Correction** : `pickLanIp` ignore bridge/utun/VM/docker et préfère en0.

### Anciens serveurs Expo encore actifs
- **Correction** : `dev.js` arrête ceux de ce projet uniquement et prend un port libre.

### `Cannot read property 'map' / 'code' of undefined`, `useStore outside StoreProvider`
- **Cause** : rechargement à chaud : le contexte était recréé et un état ancien n'avait pas les nouveaux champs. Non reproductible à froid (tests : lancement propre, anciennes données v1, ancien brouillon, 13 écrans).
- **Correction** : `stableContext`, complétion de l'état dans le provider, garde `?? []`.

### Autres corrections de code
- `create-expo-app` refuse le nom « gym app » → sous-dossier `fitness-mvp`.
- `finishWorkout` dépendait d'un drapeau modifié dans un updater `setState` → état lu via ref, puis `commitDraft`.
- « Ajouter à ma séance » empilait un second écran Workout → `nav.popTo('Workout')`.
- TS 6 : globals Jest manquants → `types: ['jest']` dans `tsconfig.json`.
- Priorité des records (charge avant répétitions) corrigée suite à un test en échec.
- Script de patch Python en erreur de syntaxe qui n'appliquait rien sans bruit → toujours vérifier par `grep` après un patch.
- Tests d'écrans : Reanimated nécessite des worklets natifs → stub manuel ; `SafeAreaProvider` → mock Jest ; sérialisation JSON circulaire → ne collecter que le texte.

## Non vérifiable depuis ici
Comportement sur l'iPhone réel (animations, `InputAccessoryView`, ActionSheet), permission « Réseau local » d'Expo Go, DNS de la box, stabilité de ngrok.
