# Pépite & Citron — Guide Claude Code

## Vue d'ensemble du projet

**Pépite & Citron** est une application de vote permettant aux membres d'une équipe de sport collectif de désigner le meilleur joueur (⭐ Pépite) et le moins bon joueur (🍋 Citron) à l'issue d'un match. L'app est utilisée en temps réel, typiquement dans un vestiaire ou autour d'un terrain.

- **Backend** : Supabase (PostgreSQL, Realtime, Auth, RLS)
- **Frontend** : React 18 + Vite (SPA unique, PWA)
- **État serveur** : TanStack Query v5
- **État client** : Zustand v5
- **Monitoring** : Sentry (optionnel, via `VITE_SENTRY_DSN`)

---

## Structure du projet

```
pepite-citron/
├── CLAUDE.md                  ← ce fichier
├── CLAUDE.architecture.md     ← architecture & bonnes pratiques
├── CLAUDE.tests.md            ← stratégie de tests
├── package.json               ← dépendances npm
├── vite.config.ts
├── index.html
├── .env / .env.example
├── public/                    ← assets statiques (icons, manifest)
└── src/
    ├── main.tsx               ← point d'entrée (Sentry + QueryClientProvider)
    ├── App.tsx                ← orchestration : auth, onglets, routing hash
    ├── types.ts               ← types métier partagés
    ├── config.ts              ← lecture des variables d'environnement
    ├── api.ts                 ← couche API (demoAPI + realAPI + withRetry)
    ├── supabaseClient.ts      ← client REST custom + authClient Supabase SDK
    ├── GlobalStyle.tsx        ← styles globaux inline
    ├── components/            ← composants React (vues + atomiques)
    │   ├── VoteView.tsx
    │   ├── ResultsView.tsx
    │   ├── StatsView.tsx
    │   ├── AdminView.tsx
    │   ├── VoteTab.tsx
    │   ├── AppHeader.tsx
    │   ├── AuthView.tsx
    │   ├── OrgSetupView.tsx
    │   ├── OnboardingModal.tsx
    │   ├── ErrorBoundary.tsx
    │   ├── PodiumView.tsx
    │   ├── Scoreboard.tsx
    │   ├── SharePodiumButton.tsx
    │   ├── EmptyState.tsx
    │   └── Toast.tsx
    ├── hooks/                 ← hooks React (queries, mutations, auth, ui)
    │   ├── queries.ts         ← hooks TanStack Query (lecture)
    │   ├── mutations.ts       ← hooks TanStack Query (écriture)
    │   ├── useAuth.ts
    │   ├── useGuest.ts
    │   ├── useOrg.ts
    │   ├── useLastMatch.ts
    │   ├── useTheme.ts
    │   └── useAsyncAction.ts
    ├── store/
    │   └── appStore.ts        ← store Zustand (session, org, onglet actif, thème)
    ├── utils/                 ← logique métier pure (testée)
    │   ├── scoring.ts         ← computeResultsSummary
    │   ├── season.ts          ← computeSeasonStats
    │   ├── vote.ts            ← hasVotedLocally, markVotedLocally, classifyVoteError, shuffleRevealOrder
    │   └── generatePodiumImage.ts
    ├── utils.ts               ← computeScores, formatDate (utilitaires partagés)
    └── test/
        ├── setup.js           ← jest-dom + MSW lifecycle + resetAppStore
        ├── server.ts          ← setupServer() MSW
        ├── renderApp.jsx      ← helper QueryClient + AppStore pour les tests de composants
        ├── api.test.ts        ← tests d'intégration api.ts (demoAPI + realAPI via MSW)
        ├── admin.test.jsx
        ├── guest.test.jsx
        ├── player.test.jsx
        └── results.test.jsx
```

---

## Navigation

L'app utilise **React Router v7** avec `BrowserRouter`. Les routes déclaratives :

| Route | Vue |
|---|---|
| `/vote` | Onglet vote (défaut) |
| `/results` | Résultats du dernier match |
| `/stats` | Statistiques de la saison |
| `/admin` | Administration (admins uniquement) |
| `*` | Redirige vers `/vote` |

- `useNavigate()` remplace tout appel à `setTab()` — dans `VoteTab`, `useAuth`, `useGuest`
- `useLocation().pathname` détermine l'onglet actif dans la tab bar
- `useSearchParams()` lit `?guest=` et `?org=` dans `useGuest` et `App`
- `BrowserRouter` est dans `main.tsx` ; les tests utilisent `<MemoryRouter initialEntries={['/vote']}>` via `renderApp({ initialPath })`

---

## Conventions générales

### Langue
- **Code** : anglais (variables, fonctions, composants, commentaires)
- **UI / Contenu** : français (labels, messages, copy)
- **Commits** : anglais, format Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)

### TypeScript strict
- `strict: true` partout, pas de `any` implicite
- Toujours typer les props, les retours de fonctions, les payloads Supabase
- Types métier centralisés dans `src/types.ts`

### Nommage
| Élément | Convention | Exemple |
|---|---|---|
| Composants React | PascalCase | `VoteCard`, `MatchHeader` |
| Hooks | camelCase préfixé `use` | `useActiveMatch`, `useVote` |
| Fonctions utilitaires | camelCase | `formatMatchLabel` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_PLAYERS_PER_TEAM` |
| Fichiers composants | PascalCase | `VoteCard.tsx` |
| Fichiers hooks/utils | camelCase | `useActiveMatch.ts` |
| Types/Interfaces | PascalCase | `Match`, `PlayerStat` |

### Imports
- Toujours utiliser l'alias `@/` qui pointe sur `src/` — jamais de chemins relatifs `../`
- `@/api`, `@/types`, `@/hooks/queries`, `@/components/VoteView`, etc.
- Grouper : librairies externes → imports `@/` locaux
- Exception : imports dans le même dossier (`'./server'`, `'./renderApp'`) restent en `'./'`

---

## Design System — Dark Mode Apple

L'app utilise un dark mode inspiré des guidelines Apple Human Interface :

```ts
// couleurs de référence (inline dans les composants)
const colors = {
  bg: {
    primary:   '#000000',  // fond principal
    secondary: '#1C1C1E',  // cartes
    tertiary:  '#2C2C2E',  // inputs, éléments surélevés
  },
  label: {
    primary:   '#FFFFFF',
    secondary: 'rgba(235,235,245,0.6)',
    tertiary:  'rgba(235,235,245,0.3)',
  },
  separator:   'rgba(84,84,88,0.65)',
  brand: {
    pepite: '#FFD700',   // or — meilleur joueur
    citron: '#32D74B',   // vert citron — moins bon joueur
  },
  system: {
    blue:   '#0A84FF',
    red:    '#FF453A',
    green:  '#32D74B',
    orange: '#FF9F0A',
  },
};
```

**Police** : `system-ui` (web) — jamais Inter ou Roboto.

---

## Règles d'architecture

1. **Toute logique métier pure** va dans `src/utils/` — jamais dans les composants
2. **Toute interaction Supabase** passe par `src/api.ts` (via `demoAPI` / `realAPI`)
3. **Aucun `fetch` direct** dans les composants — utiliser les hooks de `src/hooks/`
4. **Données serveur** : TanStack Query (`src/hooks/queries.ts`, `src/hooks/mutations.ts`)
5. **État global client** : Zustand (`src/store/appStore.ts`) — ne pas y dupliquer des données serveur
6. **Mode démo** : `DEMO_MODE = true` quand `VITE_SUPABASE_URL` contient `"VOTRE_PROJET"` — utiliser `demoAPI` en-mémoire

---

## Gestion des erreurs

- Toujours gérer les erreurs Supabase explicitement (ne jamais ignorer `.error`)
- `ErrorBoundary` en place autour de l'app (`main.tsx` via `Sentry.ErrorBoundary`)
- Afficher des messages d'erreur en français, compréhensibles par l'utilisateur
- Sentry est initialisé si `VITE_SENTRY_DSN` est défini (optionnel en dev)

---

## Variables d'environnement

```bash
# Supabase (obligatoire en production)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon

# Monitoring (optionnel)
VITE_SENTRY_DSN=

# Versioning (optionnel, utilisé par Sentry)
VITE_APP_VERSION=
```

- Ne jamais committer de clés secrètes
- Utiliser `.env.local` pour le développement local (ignoré par git)
- Documenter toute nouvelle variable dans `.env.example`
- Sans `VITE_SUPABASE_URL` valide → `DEMO_MODE = true` (données en-mémoire)

---

## Commandes utiles

```bash
npm run dev        # serveur de développement Vite
npm run build      # build de production
npm run preview    # prévisualiser le build
npm test           # lance tous les tests (vitest run)
npm run test:watch # tests en mode watch
npm run test:ui    # interface graphique Vitest
```
