# Pépite & Citron — Guide Claude Code (Monorepo)

## Vue d'ensemble du projet

**Pépite & Citron** est une application de vote permettant aux membres d'une équipe de sport collectif de désigner le meilleur joueur (⭐ Pépite) et le moins bon joueur (🍋 Citron) à l'issue d'un match. L'app est utilisée en temps réel, typiquement dans un vestiaire ou autour d'un terrain.

- **Backend** : Supabase (PostgreSQL, Realtime, Auth, RLS)
- **Frontend web** : React (Vite)
- **Mobile** : React Native (Expo)
- **Monorepo** : structure partagée apps/ + packages/

---

## Structure du monorepo

```
pepite-citron/
├── CLAUDE.md                  ← ce fichier
├── package.json               ← workspaces root
├── apps/
│   ├── web/                   ← React + Vite
│   │   └── CLAUDE.md
│   ├── mobile/                ← React Native (Expo)
│   │   └── CLAUDE.md
│   └── admin/                 ← Back-office léger (React)
│       └── CLAUDE.md
├── packages/
│   ├── shared/                ← logique métier, types, helpers
│   │   └── CLAUDE.md
│   ├── ui/                    ← composants partagés (design system)
│   │   └── CLAUDE.md
│   └── supabase/              ← client Supabase, hooks, types générés
│       └── CLAUDE.md
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── docs/
    ├── architecture.md
    └── decisions/             ← ADR (Architecture Decision Records)
```

---

## Conventions générales (tous packages)

### Langue
- **Code** : anglais (variables, fonctions, composants, commentaires)
- **UI / Contenu** : français (labels, messages, copy)
- **Commits** : anglais, format Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)

### TypeScript strict
- `strict: true` partout, pas de `any` implicite
- Toujours typer les props, les retours de fonctions, les payloads Supabase
- Utiliser les types générés par `supabase gen types typescript`

### Nommage
| Élément | Convention | Exemple |
|---|---|---|
| Composants React | PascalCase | `VoteCard`, `MatchHeader` |
| Hooks | camelCase préfixé `use` | `useActiveMatch`, `useVote` |
| Fonctions utilitaires | camelCase | `formatMatchLabel` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_PLAYERS_PER_TEAM` |
| Fichiers composants | PascalCase | `VoteCard.tsx` |
| Fichiers hooks/utils | camelCase | `useActiveMatch.ts` |
| Types/Interfaces | PascalCase suffixé | `MatchData`, `PlayerRow` |

### Imports
- Chemins absolus via alias (`@shared/`, `@ui/`, `@supabase/`)
- Jamais de relative `../../../`
- Grouper : librairies externes → packages internes → fichiers locaux

---

## Design System — Dark Mode Apple

L'app utilise un dark mode inspiré des guidelines Apple Human Interface :

```ts
// tokens de base (packages/ui/tokens.ts)
export const colors = {
  bg: {
    primary:   '#000000',  // fond principal
    secondary: '#1C1C1E',  // cartes
    tertiary:  '#2C2C2E',  // inputs, éléments surélevés
    grouped:   '#1C1C1E',
  },
  label: {
    primary:   '#FFFFFF',
    secondary: 'rgba(235,235,245,0.6)',
    tertiary:  'rgba(235,235,245,0.3)',
    quaternary:'rgba(235,235,245,0.18)',
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
} as const;
```

**Police** : SF Pro (iOS natif) / system-ui (web) — jamais Inter ou Roboto.

---

## Règles d'architecture

1. **Toute logique métier** va dans `packages/shared` — jamais dans les composants
2. **Toute interaction Supabase** passe par `packages/supabase` (hooks React Query ou hooks Expo)
3. **Aucun `fetch` direct** dans les composants — utiliser les hooks dédiés
4. **État global** : Zustand (léger, pas de Redux)
5. **Formulaires** : React Hook Form + Zod pour la validation
6. **Navigation web** : React Router v6
7. **Navigation mobile** : Expo Router (file-based)

---

## Gestion des erreurs

- Toujours gérer les erreurs Supabase explicitement (ne jamais ignorer `.error`)
- Utiliser un `ErrorBoundary` autour de chaque route majeure
- Afficher des messages d'erreur en français, compréhensibles par l'utilisateur
- Logger les erreurs avec un service (Sentry recommandé en prod)

---

## Variables d'environnement

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Flags
VITE_ENV=development|staging|production
```

- Ne jamais commit de clés secrètes
- Utiliser `.env.local` pour le développement local
- Documenter toute nouvelle variable dans `.env.example`

---

## Commandes utiles (root)

```bash
pnpm dev          # lance web + mobile en parallèle
pnpm build        # build tous les packages
pnpm test         # lance tous les tests
pnpm lint         # ESLint sur tout le monorepo
pnpm typecheck    # tsc --noEmit sur tout le monorepo
pnpm db:types     # génère les types Supabase
pnpm db:migrate   # applique les migrations Supabase
```
