# Pépite & Citron — Architecture & Bonnes Pratiques

> Lire d'abord `CLAUDE.md` pour la vue d'ensemble du projet.

## Principes directeurs

1. **Clarté > Cleverness** : du code lisible qu'un autre développeur comprend sans commentaires
2. **Single Responsibility** : un fichier = une responsabilité
3. **Fail fast** : valider les données à l'entrée, jamais en profondeur dans la logique métier
4. **Pas d'abstractions prématurées** : trois lignes similaires valent mieux qu'un helper inventé trop tôt

---

## Flux de données

```
Supabase (source de vérité)
    ↓
src/api.ts  (realAPI — client REST custom + authClient SDK)
    ↓
src/hooks/queries.ts|mutations.ts  (TanStack Query — cache + mutations)
    ↓
src/components/*  (vues — orchestration + rendu)
    ↑
src/utils/*  (logique métier pure — sans effets de bord)
```

**Règle** : les données ne remontent jamais dans ce flux. Un composant ne connaît pas Supabase directement.

---

## Couche API — `src/api.ts`

Le fichier exporte deux objets conformes à l'interface `API` :

| Export | Usage |
|---|---|
| `demoAPI` | Données en-mémoire (`demoState`), aucun réseau — actif quand `DEMO_MODE = true` |
| `realAPI` | Appels REST vers Supabase via `supabaseClient.ts` — production |

`DEMO_MODE` est automatiquement `true` quand `VITE_SUPABASE_URL` contient `"VOTRE_PROJET"`.

### `src/supabaseClient.ts`
- `authClient` : instance Supabase JS SDK (`createClient`) — gère auth + token refresh
- `supabase` : client REST custom avec timeout, retry, et `buildHeaders()` synchrone (token JWT en cache)

### Retry et timeout
- `withRetry` : 3 tentatives max, réessaie uniquement les erreurs réseau (`TypeError`, `AbortError`)
- `rpcWithTimeout` : wrape les appels `authClient.rpc()` avec `Promise.race` (timeout 10 s par défaut)

---

## Gestion de l'état

### Quoi mettre où

| Type d'état | Outil | Exemple |
|---|---|---|
| Données serveur | TanStack Query (`hooks/queries.ts`) | liste des joueurs, match actif |
| Mutations serveur | TanStack Query (`hooks/mutations.ts`) | soumettre un vote, créer un match |
| État UI local | `useState` | modal ouvert/fermé, étape d'un wizard |
| État global client | Zustand (`store/appStore.ts`) | session, org courante, onglet actif, thème |

**Ne jamais** dupliquer des données serveur dans Zustand — TanStack Query est la source de vérité pour les données distantes.

### Store Zustand (`src/store/appStore.ts`)
Le store gère uniquement l'état client qui n'appartient pas au serveur :
```ts
interface AppStore {
  session: UserSession | null;
  currentOrg: Org | null;
  tab: string;
  theme: 'dark' | 'light';
  showOnboarding: boolean;
  // ... setters correspondants
}
```

---

## Composants React — Règles

### Structure d'un composant
```tsx
// 1. Imports (externes → locaux)
import { useState, useCallback } from 'react';
import type { Player } from '../types';
import { useSubmitVote } from '../hooks/mutations';

// 2. Types locaux
interface Props {
  player: Player;
  onSelect: (id: EntityId) => void;
  isSelected?: boolean;
}

// 3. Composant (function declaration)
export function PlayerCard({ player, onSelect, isSelected = false }: Props) {
  // 4. Hooks en haut (jamais conditionnels)
  const handlePress = useCallback(() => onSelect(player.id), [player.id, onSelect]);

  // 5. Rendu
  return (
    <button onClick={handlePress} aria-pressed={isSelected}>
      {player.name}
    </button>
  );
}
```

### Ce qu'on évite
```tsx
// ❌ useEffect pour dériver de l'état
useEffect(() => { setScore(computeScore(votes)); }, [votes]);

// ✅ Calcul direct
const score = computeScore(votes);

// ❌ fetch direct dans un composant
useEffect(() => { fetch('/api/players').then(...) }, []);

// ✅ Hook TanStack Query
const { data: players } = usePlayers(org?.id);
```

---

## Navigation

L'app utilise **React Router v7** (`BrowserRouter` dans `main.tsx`, `<Routes>/<Route>` dans `App.tsx`).

- `navigate('/results')` au lieu de `setTab('results')` — dans `VoteTab`, `useAuth`, `useGuest`
- `useLocation().pathname` détermine l'onglet actif dans la tab bar
- `useSearchParams()` lit `?guest=` et `?org=` (remplace `window.location.search`)
- Le store Zustand ne gère plus de `tab` — c'est React Router qui est la source de vérité
- En tests : `renderApp({ initialPath: '/vote?guest=xxx' })` → `MemoryRouter` avec cette URL initiale

---

## Accessibilité (a11y)

- Tout élément interactif utilise un élément HTML sémantique (`button`, `a`, etc.)
- Les boutons de vote ont `aria-pressed` et `aria-label` explicite
- Contraste minimum : 4.5:1 pour le texte normal (vérifié avec nos tokens dark mode)

---

## Sécurité

### Règles Supabase RLS (obligatoires en production)
- RLS activé sur toutes les tables
- Un joueur ne peut voter qu'une fois par match (contrainte unique + RLS)
- Ne jamais exposer la `service_role` key côté client

### Ne jamais
- Désactiver RLS en production
- Faire confiance aux données venant du client sans validation
- Stocker des données sensibles en localStorage (tokens JWT, mots de passe)

---

## Git — Workflow

### Commits (Conventional Commits)
```
feat(vote): ajouter la confirmation avant soumission
fix(results): corriger l'ordre du classement à égalité
chore(deps): mettre à jour @tanstack/react-query
test(scoring): ajouter les cas limites du calcul de pépites
```

### PR Rules
- Une PR = une fonctionnalité ou un fix
- Tests verts obligatoires avant merge
- Pas de `console.log` en merge vers `main`

---

## Linting & Typage

```bash
# Vérifier avant commit
npm test && npx tsc --noEmit
```

Règles TypeScript clés :
- `strict: true` — pas de `any` implicite, null-checks obligatoires
- Toujours typer les retours de fonctions exportées
- Utiliser `import type` pour les imports purement typés
