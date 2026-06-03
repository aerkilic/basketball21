# Mobile (Expo)

## Lokale Installation und Start (Expo Go)
```bash
cd mobile
npm install --include=dev
npx expo install --check
npm run local:expo
```

Danach in der Expo Go App den QR-Code scannen.
Fuer Login muss die API-URL (`EXPO_PUBLIC_API_BASE_URL`) vom Handy erreichbar sein
(gleiches WLAN/LAN oder oeffentlich erreichbare URL).

## Optional: lokale Development Builds
```bash
cd mobile
npx expo run:ios
npx expo run:android
```

## EAS / CI
- Konfiguration liegt in `mobile/eas.json`
- Jenkins-Pipelines:
  - `Jenkinsfile.mobile_expo`
  - `Jenkinsfile.mobile.submit-android`
  - `Jenkinsfile.mobile.submit-ios`

## Theme-Optionen in `mobile/.env`
- `EXPO_PUBLIC_ENABLE_THEME_TOGGLE=true|false`
- `EXPO_PUBLIC_DEFAULT_THEME=system|light|dark`
