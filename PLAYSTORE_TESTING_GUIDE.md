# Play Store Testing Guide

Stand: 2026-05-30

Diese Anleitung beschreibt den Android-Test- und Release-Weg fuer das Projekt
**basketball21** mit Expo/EAS und Google Play.

## 1. Projektwerte pruefen

Relevante Dateien:
- `mobile/app.json`
- `mobile/eas.json`
- `mobile/.env`

Typische Zielwerte:
- Android Package Name: `com.example.basketball21`
- iOS Bundle Identifier: `com.example.basketball21`

## 2. Lokales Expo-Testen (schnell)

```bash
cd mobile
npm install --include=dev
npx expo install --check
npm run local:expo
```

Danach QR-Code mit Expo Go scannen.

## 3. EAS Preview Build (APK fuer interne Tests)

```bash
cd mobile
npx --yes eas-cli login
npx --yes eas-cli build --platform android --profile preview
```

Ergebnis:
- installierbares APK fuer interne Verteilung
- Build-Link kann direkt an Tester gesendet werden

## 4. EAS Production Build (AAB fuer Google Play)

```bash
cd mobile
npx --yes eas-cli build --platform android --profile production
```

Ergebnis:
- `.aab` fuer Google Play Console
- nicht direkt auf Geraet installierbar

## 5. Submit nach Google Play via Jenkins

Verwende die Pipeline:
- `Jenkinsfile.mobile.submit-android`

Voraussetzungen in Jenkins:
- Secret Text Credential fuer Expo Token (z. B. `EXPO_TOKEN`)
- Secret File Credential fuer Google Play Service Account JSON
- Parameter `EAS_PROFILE` passend zu `mobile/eas.json` (Default `production`)

Wichtig:
- In `mobile/eas.json` muss `submit.<profile>.android.serviceAccountKeyPath`
  auf `./.secrets/google-service-account.json` zeigen.

## 6. Tests in Google Play Console

Empfohlene Reihenfolge:
1. Internal Testing
2. Closed Testing
3. Open Testing (optional)
4. Production Release

## 7. Fehlerbilder (Kurzcheck)

- `EXPO_TOKEN is missing`:
  Jenkins Credential fehlt oder ist leer.
- `Missing Android submit profile`:
  Profil in `mobile/eas.json` fehlt.
- `Unexpected serviceAccountKeyPath`:
  `serviceAccountKeyPath` in `mobile/eas.json` korrigieren.
- Build-Link oeffnet, Installation scheitert:
  Android erlaubt ggf. keine Installation aus unbekannter Quelle.
