# Mises à jour EAS Update

Les profils `preview` et `production` utilisent leurs canaux et environnements respectifs.
Le runtime suit `expo.version` (`appVersion`). Augmenter cette version et refaire un build
pour toute modification native : permission, plugin, dépendance native ou SDK Expo.
Un correctif JavaScript compatible conserve la version.

## Builds avec EAS Update

Depuis `frontend` :

```powershell
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile production
```

Installer l'APK Android. Distribuer le build iOS via TestFlight/App Store.
Les anciens builds sans `expo-updates` ne peuvent pas recevoir les mises à jour.
Android preview reçoit le canal `preview`, iOS production reçoit `production`.
Pour produire un AAB destiné à Google Play, utiliser le profil `production` sur Android.

## Variables et authentification

Les environnements EAS `preview` et `production` doivent contenir :
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`,
`EXPO_PUBLIC_API_URL`. Les valeurs doivent être cohérentes avec celles du build.
Les champs `build.*.env` de eas.json ne configurent pas les variables d'EAS Update.
Ne jamais ajouter EXPO_TOKEN dans une variable EXPO_PUBLIC_*.

La CLI EAS nécessite une connexion (`npx eas-cli@latest login`) ou `EXPO_TOKEN`
dans l'environnement du terminal. EAS ne charge pas automatiquement le jeton du `.env`.
Ne pas publier ce jeton ni l'inclure dans les archives de build.

## Publication

Tester d'abord sur un build preview installé :

```powershell
npx eas-cli@latest update --channel preview --environment preview --message "Description du correctif"
```

Puis publier en production après validation :

```powershell
npx eas-cli@latest update --channel production --environment production --message "Description du correctif"
```

Par défaut, une mise à jour se télécharge au démarrage et s'applique au lancement suivant.
Pour vérifier : ouvrir l'application avec Internet, attendre le téléchargement, fermer puis rouvrir.
Les déploiements backend restent indépendants.

Documentation : https://docs.expo.dev/eas-update/getting-started/

## Configuration distante du 13 septembre 2026

Les canaux et branches `preview` et `production` ont été créés sur le projet
`1761de5b-33ba-4aaa-a629-d6fedef1fa6d`.
Les trois variables publiques ci-dessus ont été créées pour les deux environnements.
L'URL API configurée est `https://soulmeet-backend.onrender.com/api/v1`.
La configuration utilise Expo SDK 54 et `expo-updates` 29.

Builds lancés avec cette configuration :

- Android APK preview : https://expo.dev/accounts/sandratraraoelison/projects/soulmeet/builds/aa4d48b4-2f1f-44f2-ab5d-072f8805561e
- iOS production, build 12 : https://expo.dev/accounts/sandratraraoelison/projects/soulmeet/builds/3f9c3824-e2a7-4d96-a3c4-eced4fc7e829

Validation locale : TypeScript, ESLint, compatibilité des dépendances Expo et export Android/iOS/web réussis.

Résultat : les deux builds ont réussi le 13 septembre 2026.

- APK Android : https://expo.dev/artifacts/eas/16oTIpB5NWna-wUknOx26IHQNed6VYnTAXVR6a48Vb8.apk
- IPA iOS n°12 : https://expo.dev/artifacts/eas/RJ7fAP_LsZB38Nqx6HE2CVICUv8PnrDrMyQOPX2TblE.ipa

Aucune mise à jour OTA ni soumission aux stores n'a été publiée pendant cette configuration.
La réception effective d'une future mise à jour reste à tester sur appareil.
