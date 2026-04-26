# Pépite & Citron — Mobile (React Native + Expo)

> Lire d'abord le CLAUDE.md racine du monorepo.

## Stack mobile

| Outil | Usage |
|---|---|
| Expo SDK 51+ | Build, OTA updates, plugins natifs |
| Expo Router | Navigation file-based |
| React Native Reanimated 3 | Animations performantes |
| React Native Gesture Handler | Gestes natifs |
| Expo Notifications | Notifications push |
| Expo SecureStore | Stockage sécurisé (token auth) |
| React Query (TanStack) | Fetching, cache, realtime |

---

## Structure `apps/mobile/`

```
apps/mobile/
├── app/                    ← Expo Router (file-based routing)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/
│   │   ├── vote.tsx        ← écran principal
│   │   ├── results.tsx
│   │   └── _layout.tsx
│   ├── match/[id].tsx
│   └── _layout.tsx         ← root layout
├── components/
│   ├── vote/
│   │   ├── PlayerCard.tsx
│   │   ├── VoteButton.tsx
│   │   └── VoteConfirm.tsx
│   ├── match/
│   │   └── MatchBanner.tsx
│   └── ui/                 ← surcharges mobiles du design system
├── hooks/                  ← hooks mobile-spécifiques
├── constants/
│   └── layout.ts           ← dimensions, safe area
├── assets/
│   ├── images/
│   ├── fonts/
│   └── icons/
├── app.json
├── eas.json
└── CLAUDE.md               ← ce fichier
```

---

## Règles React Native

### Performance
- Utiliser `useCallback` et `useMemo` systématiquement dans les listes
- Les listes de joueurs → `FlashList` (Shopify) plutôt que `FlatList`
- Jamais de `StyleSheet.create` dans le corps d'un composant (hisser au module level)
- Animations → **Reanimated 3 uniquement** (jamais `Animated` de base)
- Éviter les re-renders inutiles : préférer `React.memo` sur les composants de liste

### Compatibilité
- Toujours tester sur iOS **et** Android
- Utiliser `Platform.select()` pour les différences de style, jamais de conditions inline
- Safe area : `useSafeAreaInsets()` — ne jamais hardcoder des valeurs de padding

### Style
- Utiliser les tokens du design system (`packages/ui/tokens.ts`)
- Pas de `StyleSheet` inline dans JSX — toujours `StyleSheet.create` séparé
- Les dimensions dynamiques passent par `useWindowDimensions()`

---

## Navigation (Expo Router)

- Toutes les routes sont typées (`expo-router` + TypeScript)
- Les paramètres de route sont validés avec Zod à l'entrée
- Groupes de routes : `(auth)` pour non-authentifié, `(tabs)` pour authentifié
- Deep links configurés dans `app.json` sous `scheme: "pepite-citron"`

---

## Outillage App Store — `asc` CLI

Toutes les interactions avec App Store Connect se font via **[`asc`](https://github.com/rorkai/App-Store-Connect-CLI)**, un CLI scriptable et JSON-first qui remplace les manipulations manuelles dans l'interface web.

### Installation

```bash
brew install asc
# ou
curl -fsSL https://asccli.sh/install | bash
```

### Authentification (à faire une seule fois)

```bash
asc auth login \
  --name "Pépite & Citron" \
  --key-id "ABC123" \
  --issuer-id "DEF456" \
  --private-key /path/to/AuthKey.p8 \
  --network

# Valider
asc auth status --validate
asc auth doctor
```

Générer la clé API sur : https://appstoreconnect.apple.com/access/integrations/api

Pour CI/CD (pas de keychain disponible) :
```bash
asc auth login --bypass-keychain --name "CI" --key-id "..." --issuer-id "..." --private-key ./AuthKey.p8
```

### Skills `asc` pour Claude Code

Installer le pack de skills communautaires pour automatiser les workflows App Store :

```bash
npx skills add rorkai/app-store-connect-cli-skills
```

Les skills disponibles et leur usage pour Pépite & Citron :

| Skill | Quand l'utiliser |
|---|---|
| `asc-cli-usage` | Trouver la bonne commande `asc` et ses flags |
| `asc-xcode-build` | Archiver et exporter l'IPA avant upload |
| `asc-release-flow` | Vérifier si l'app est prête à soumettre |
| `asc-submission-health` | Preflight checks, éviter les rejets |
| `asc-testflight-orchestration` | Gérer les groupes beta et distribuer des builds |
| `asc-build-lifecycle` | Surveiller le processing d'un build |
| `asc-shots-pipeline` | Automatiser la capture des screenshots |
| `asc-metadata-sync` | Synchroniser les métadonnées App Store |
| `asc-signing-setup` | Configurer certificats et provisioning profiles |
| `asc-id-resolver` | Résoudre les IDs (app, build, groupe) depuis les noms |

### Commandes courantes pour Pépite & Citron

```bash
# Lister les apps
asc apps list --output table

# Vérifier l'état de review
asc review status --app "PEPITE_CITRON_APP_ID"
asc review doctor --app "PEPITE_CITRON_APP_ID"

# Uploader un build et soumettre
asc publish appstore \
  --app "PEPITE_CITRON_APP_ID" \
  --ipa "./build/PepiteCitron.ipa" \
  --version "1.0.0" \
  --submit \
  --confirm

# Surveiller après soumission
asc status --app "PEPITE_CITRON_APP_ID" --watch

# TestFlight — distribuer aux bêta-testeurs
asc testflight groups list --app "PEPITE_CITRON_APP_ID" --output table
asc builds list --app "PEPITE_CITRON_APP_ID" --output table

# Screenshots — capturer et uploader
asc screenshots plan --app "PEPITE_CITRON_APP_ID" --version "1.0.0" --review-output-dir "./screenshots/review"
asc screenshots apply --app "PEPITE_CITRON_APP_ID" --version "1.0.0" --review-output-dir "./screenshots/review" --confirm
```

### Workflow de release recommandé

```bash
# 1. Dry-run pour prévisualiser le plan de release
asc release stage \
  --app "PEPITE_CITRON_APP_ID" \
  --version "1.0.0" \
  --build "BUILD_ID" \
  --dry-run

# 2. Valider la readiness
asc validate --app "PEPITE_CITRON_APP_ID" --version "1.0.0"

# 3. Soumettre
asc publish appstore --app "PEPITE_CITRON_APP_ID" --ipa "./build/PepiteCitron.ipa" --version "1.0.0" --submit --confirm
```

---

## Publication iOS — App Store

### Prérequis légaux et techniques obligatoires

#### Privacy Manifest (`PrivacyInfo.xcprivacy`)
Obligatoire depuis mai 2024 (Apple). Déclarer :
```xml
NSPrivacyAccessedAPITypes:
  - NSPrivacyAccessedAPIType: NSPrivacyAccessedAPICategoryUserDefaults
    NSPrivacyAccessedAPITypeReasons: [CA92.1]
```
Déclarer **toutes** les APIs utilisées (UserDefaults, FileTimestamp, SystemBootTime, DiskSpace).

#### Info.plist — Permissions à déclarer
```xml
<!-- Si notifications push activées -->
<key>NSUserNotificationUsageDescription</key>
<string>Pépite & Citron t'envoie les résultats du vote de ton équipe.</string>

<!-- Si localisation utilisée -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>...</string>
```
**Règle** : ne demander que les permissions réellement utilisées. Apple rejette les apps qui déclarent des permissions inutiles.

#### App Store Connect
- **Bundle ID** : `com.pepitecitron.app` (à réserver sur developer.apple.com)
- **Age rating** : 4+ (aucun contenu sensible)
- **Catégorie** : Sports
- **Privacy Policy URL** obligatoire (héberger sur le site web)
- **Support URL** obligatoire

#### EAS Build (Expo)
```json
// eas.json
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "ton@email.com",
        "ascAppId": "XXXXXXXXXX",
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

#### Checklist avant soumission iOS
- [ ] Privacy Manifest présent et complet
- [ ] Toutes les permissions justifiées dans Info.plist
- [ ] Screenshots pour toutes les tailles (6.9", 6.5", 12.9" iPad si universel)
- [ ] Icône 1024×1024px sans transparence, sans coins arrondis
- [ ] Build signé avec le bon provisioning profile (Distribution)
- [ ] Version et build number incrémentés dans `app.json`
- [ ] Privacy Policy publiée et URL valide
- [ ] Testé sur device physique (pas seulement simulateur)
- [ ] App testée avec TestFlight avant soumission

---

## Publication Android — Google Play

### Prérequis légaux et techniques obligatoires

#### Target SDK
- Toujours viser le **dernier SDK stable** (actuellement API 34 / Android 14)
- Google Play rejette les apps avec `targetSdkVersion` trop ancien

#### Permissions (`app.json` → `android.permissions`)
```json
"permissions": [
  "INTERNET",
  "VIBRATE"
]
```
**Règle** : supprimer `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` si non utilisés — ils déclenchent une review de sécurité approfondie.

#### Data Safety Section (obligatoire)
Dans Google Play Console > App content > Data safety :
- Déclarer quelles données sont collectées (email, identifiant utilisateur)
- Déclarer si les données sont partagées avec des tiers (Supabase = oui)
- Générer et publier une Privacy Policy

#### EAS Submit Android
```json
// eas.json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./play-store-key.json",
        "track": "production"
      }
    }
  }
}
```

#### Checklist avant soumission Android
- [ ] `targetSdkVersion` à jour (API 34+)
- [ ] Permissions minimales déclarées et justifiées
- [ ] Data Safety form complété dans Play Console
- [ ] Privacy Policy publiée et URL renseignée
- [ ] Screenshots phone (min 2) + tablet si applicable
- [ ] Icône adaptative configurée (`android.adaptiveIcon` dans `app.json`)
- [ ] Build signé avec keystore (stocker le keystore en sécurité — **perte = app perdue**)
- [ ] AAB (Android App Bundle) utilisé (pas APK) pour la soumission
- [ ] Testé sur device physique Android réel

---

## Notifications Push (Expo Notifications)

- Utiliser `expo-notifications` — ne pas intégrer Firebase directement
- Les tokens push sont stockés dans Supabase (table `push_tokens`)
- Demander la permission au bon moment UX (pas au démarrage à froid)
- Gérer le cas de refus sans bloquer l'app

---

## OTA Updates (Expo Updates)

- Activer EAS Update pour les hotfixes sans passer par les stores
- **Ne jamais** déployer en OTA des changements de code natif
- Brancher les channels : `main` → production, `staging` → TestFlight/Internal testing

---

## Keystore Android — Sécurité critique

```bash
# Générer le keystore (une seule fois, conserver précieusement)
keytool -genkey -v -keystore pepite-citron.keystore \
  -alias pepite-citron -keyalg RSA -keysize 2048 -validity 10000
```

⚠️ **Stocker le keystore + mot de passe dans un gestionnaire de secrets (ex : 1Password).  
La perte du keystore rend impossible toute mise à jour de l'app sur le Play Store.**
