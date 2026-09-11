# Pépite & Citron — Guide Claude Code

## Vue d'ensemble du projet

**Pépite & Citron** est une application de vote permettant aux membres d'une équipe de sport collectif de désigner le meilleur joueur (⭐ Pépite) et le moins bon joueur (🍋 Citron) à l'issue d'un match. L'app est utilisée en temps réel, typiquement dans un vestiaire ou autour d'un terrain.

- **Backend** : Supabase (PostgreSQL, Realtime, Auth, RLS, fonctions `SECURITY DEFINER`)
- **Serverless** : fonctions Vercel dans `api/` (emails, push, Stripe, suppression de compte)
- **Frontend** : React 18 + Vite (SPA unique, PWA avec service worker `src/sw.ts`)
- **État serveur** : TanStack Query v5 (cache persisté en localStorage)
- **État client** : Zustand v5
- **Monitoring** : Sentry (optionnel, via `VITE_SENTRY_DSN`)

### Décisions produit à respecter
- **Aucun joueur n'est obligé de créer un compte** : on vote via le lien d'équipe (`/vote?org=slug`, choix de son prénom) ou un lien invité à usage unique (`?guest=token`).
- **Les votes sont anonymes pour l'équipe** : seuls les admins voient qui a voté quoi (`get_match_votes` masque l'identité pour les autres).

---

## Structure du projet

```
pepite-citron/
├── CLAUDE.md / CLAUDE.architecture.md / CLAUDE.tests.md
├── app.html                   ← entrée de la SPA ("/" sert public/landing.html)
├── vercel.json                ← rewrites (/ → landing, /* → app.html), en-têtes de sécurité
├── api/                       ← fonctions serverless Vercel (+ tests *.test.ts)
│   ├── _lib/                  ← auth (requireOrgAdmin), validation zod, email, unsubscribe…
│   ├── send-match-notification.ts, send-push-notification.ts, unsubscribe.ts
│   ├── create-checkout-session.ts, create-portal-session.ts, stripe-webhook.ts
│   └── delete-account.ts
├── supabase/
│   ├── migrations/            ← migrations SQL numérotées (YYYYMMNN_nom.sql)
│   └── schema.sql             ← ancien schéma, NON à jour : la vérité est dans migrations/
├── public/                    ← landing.html, privacy.html, terms.html, icônes
└── src/
    ├── main.tsx               ← point d'entrée (Sentry, QueryClient persisté, BrowserRouter)
    ├── App.tsx                ← auth, org, routes React Router, écrans chargés à la demande (lazy)
    ├── types.ts               ← types métier + interface API
    ├── config.ts              ← variables d'environnement
    ├── api.ts                 ← couche API : demoAPI (mémoire) + realAPI (supabase-js), withRetry
    ├── schemas.ts             ← schémas zod des formulaires
    ├── GlobalStyle.tsx        ← styles globaux et tokens de couleur (thèmes clair/sombre)
    ├── sw.ts                  ← service worker (précache, notifications push)
    ├── lib/                   ← supabase.ts (client + timeouts fetch), refresh.ts
    ├── components/            ← vues et composants
    │   ├── VoteTab.tsx, VoteView.tsx, ResultsView.tsx, StatsView.tsx, ProfileView.tsx…
    │   ├── AdminView.tsx      ← mise en page de l'onglet Admin
    │   └── admin/             ← sections de l'Admin (match actif, lancement, effectif, paramètres…)
    ├── hooks/                 ← queries.ts, mutations.ts, useAuth, useGuest, useRealtime,
    │                            useOfflineSync, useConfirm, useNow…
    ├── store/appStore.ts      ← store Zustand (session, org courante, thème…)
    ├── utils/                 ← logique métier pure et testée (scoring, season, vote, player,
    │                            deadline, reminder, errors, localData…)
    └── test/                  ← setup, MSW, renderApp + tests de composants et d'API
```

---

## Navigation

L'app utilise **React Router v7** avec `BrowserRouter` (dans `main.tsx`) :

| Route | Vue |
|---|---|
| `/vote` | Onglet vote (défaut) |
| `/results` | Résultats du dernier match |
| `/stats` | Statistiques de la saison (Pro) |
| `/admin` | Administration (admins uniquement) |
| `/profile` | Profil, préférences email, suppression de compte |
| `*` | Redirige vers `/vote` |

- `useNavigate()` pour changer d'écran ; `useSearchParams()` lit `?guest=` et `?org=`
- Admin, Saison, Profil et les modales sont chargés à la demande (`React.lazy` + `Suspense`)
- En tests : `renderApp({ initialPath })` monte un `MemoryRouter`

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
- Exception : imports dans le même dossier (`'./server'`, `'./shared'`) restent en `'./'`
- Grouper : librairies externes → imports `@/` locaux

---

## Design System

Couleurs définies comme **tokens CSS** dans `src/GlobalStyle.tsx`, avec un thème sombre (défaut) et un thème clair (`[data-theme=light]`). Utiliser les variables, jamais de couleurs en dur :

- Fonds : `--bg`, `--bg2`, `--bg3` · Textes : `--label`, `--label2`, `--label3`, `--label4`
- Marque : `--gold` (Pépite, texte), `--gold-fill` (fond des boutons principaux, texte noir), `--lemon` (Citron)
- Système : `--red`, `--green`, `--separator`

Les contrastes texte/fond sont vérifiés (WCAG AA) par `src/utils/contrast.test.ts` : un nouveau token de texte doit y être ajouté.

**Police** : `system-ui` — jamais Inter ou Roboto.

---

## Règles d'architecture

1. **Toute logique métier pure** va dans `src/utils/` — jamais dans les composants
2. **Toute interaction Supabase** passe par `src/api.ts` (via `demoAPI` / `realAPI`)
3. **Aucun `fetch` direct** dans les composants — utiliser les hooks de `src/hooks/`
4. **Données serveur** : TanStack Query (`src/hooks/queries.ts`, `src/hooks/mutations.ts`)
5. **État global client** : Zustand (`src/store/appStore.ts`) — ne pas y dupliquer des données serveur
6. **Mode démo** : `DEMO_MODE = true` quand `VITE_SUPABASE_URL` contient `"VOTRE_PROJET"` — utiliser `demoAPI` en-mémoire, qui doit reproduire les règles du serveur (ex. heure limite de vote)
7. **`withRetry` = lectures et UPDATE idempotents uniquement** — jamais sur un INSERT (un retry après timeout crée un doublon : match ouvert deux fois, joueur en double)
8. **Les votes passent par la RPC `submit_vote`** (validation, unicité, heure limite côté serveur) — jamais d'INSERT direct dans `votes`

---

## Base de données (Supabase)

- Les migrations sont appliquées **à la main** dans le SQL Editor de Supabase, entourées de `begin; … commit;`. L'éditeur n'affiche que le résultat de la dernière instruction : fournir des requêtes de vérification en une seule instruction.
- Avant d'écrire une migration : `git fetch` et prendre le numéro suivant libre dans `supabase/migrations/` sur `origin/main` (d'autres sessions en écrivent aussi).
- Fonctions `SECURITY DEFINER` : vérifier l'appelant (`is_org_admin` / `is_org_member` / `auth.uid()`), `set search_path = public, pg_temp`, `revoke … from public, anon`.
- Si une migration retire un accès dont le front déployé dépend : déployer d'abord un front compatible, puis la migration.

---

## Gestion des erreurs

- Toujours gérer les erreurs Supabase explicitement (ne jamais ignorer `.error`)
- Afficher les erreurs avec `humanizeError(err)` (`src/utils/errors.ts`) : messages courts en français, le détail technique reste dans la console
- `ErrorBoundary` par écran (`components/ErrorBoundary.tsx`) + `Sentry.ErrorBoundary` global (`main.tsx`)
- Actions irréversibles : confirmation via `useConfirm()` (jamais `window.confirm`, peu fiable en PWA iOS)

---

## Variables d'environnement

Voir `.env.example` pour la liste complète et commentée. Côté client (préfixe `VITE_`) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_APP_URL`. Côté serveur (`api/`) uniquement : `SUPABASE_SERVICE_ROLE_KEY`, Stripe, VAPID (push), `RESEND_API_KEY` / `BREVO_API_KEY`, `EMAIL_FROM`…

- Ne jamais committer de clés secrètes ; `.env.local` pour le développement local (ignoré par git)
- Documenter toute nouvelle variable dans `.env.example`
- Sans `VITE_SUPABASE_URL` valide → `DEMO_MODE = true` (données en-mémoire)

---

## Commandes utiles

```bash
npm run dev        # serveur de développement Vite
npm run build      # build de production
npm run typecheck  # TypeScript (app + api)
npm run lint       # ESLint
npm test           # tous les tests (vitest run)
npm run test:watch # tests en mode watch
```
