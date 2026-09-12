# Connexion Google sur mobile

Android et iOS utilisent le SDK natif Google. Le parcours web reste dans
`GoogleButton.tsx`; Metro choisit `GoogleButton.native.tsx` sur mobile.

## Configuration avant compilation

- Définir `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` avec le client OAuth **Web** du
  projet Google existant. Il détermine l'audience du jeton envoyé au backend.
- Pour iOS, définir aussi `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` avec le client
  OAuth **iOS** associé au bundle `com.soulmeet.app`. `app.config.js` en déduit
  le schéma de retour Google et configure le plugin natif.
- Pour Android, enregistrer un client OAuth **Android** pour `com.soulmeet.app`
  et le SHA-1 du certificat qui signe l'application (EAS et, pour la version
  distribuée par Google Play, certificat Play App Signing). Le SDK trouve ce
  client via le package et la signature : il ne prend pas de client Android
  dans `configure()`.
- Le backend doit inclure le client Web ci-dessus dans `GOOGLE_CLIENT_IDS`.
  Conserver les identifiants déjà présents pour ne pas interrompre le web.
- Fournir ces variables dans l'environnement EAS du profil utilisé, pas
  uniquement dans le `.env` local. Aucun secret OAuth ne doit être embarqué.

## Compiler et vérifier

Une nouvelle compilation native est nécessaire après installation du module :
une mise à jour JavaScript seule ne suffit pas. Expo Go ne contient pas ce SDK.

Depuis `frontend`, compiler avec `eas build --platform android --profile preview`
ou `eas build --platform ios --profile preview`, puis installer la nouvelle build.

Sur chaque plateforme : appuyer sur Google, sélectionner un compte, vérifier
la connexion puis la persistance après redémarrage. Vérifier aussi l'annulation,
un second compte après déconnexion et l'affichage d'une erreur réseau.

Références : [Expo](https://docs.expo.dev/guides/google-authentication/) et
[configuration du plugin](https://react-native-google-signin.github.io/docs/setting-up/expo).
