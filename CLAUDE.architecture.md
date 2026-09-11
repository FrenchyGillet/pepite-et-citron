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
src/api.ts  (realAPI — client supabase-js de src/lib/supabase.ts)
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
| `realAPI` | Appels Supabase via le client `supabase` de `src/lib/supabase.ts` — production |

`DEMO_MODE` est automatiquement `true` quand `VITE_SUPABASE_URL` contient `"VOTRE_PROJET"`.

### `src/lib/supabase.ts`
- `supabase` : instance supabase-js (`createClient`) — auth, refresh du token, REST, RPC, Realtime
- `fetch` personnalisé : abandon après 6 s pour le REST et 15 s pour `/auth/v1/` (un refresh de token bloqué ne doit pas laisser un écran sur « Chargement… »)

### Retry et timeout (`src/api.ts`)
- `withRetry(fn, retries = 1)` : 2 tentatives max, chacune plafonnée à 12 s ; réessaie les erreurs réseau, les timeouts et les 5xx, jamais les 4xx
- **Uniquement pour les lectures et les UPDATE idempotents** — un INSERT réessayé après un timeout serait créé deux fois
- `rpcWithTimeout` : `Promise.race` autour d'un appel (10 s par défaut)

### Fonctions serverless — `api/`
- **Imports relatifs avec l'extension `.js`** (`import { requireOrgAdmin } from './_lib/auth.js'`) : le projet est `"type": "module"`, Vercel exécute les fonctions en ESM natif et un import sans extension fait planter la fonction au chargement (`FUNCTION_INVOCATION_FAILED`). Vitest et tsc ne le voient pas ; `api/_lib/esmImports.test.ts` le vérifie
- Chaque endpoint revalide son corps avec zod (`api/_lib/validation.ts`) et vérifie les droits (`requireOrgAdmin`, `api/_lib/auth.ts`) avant d'utiliser la clé service
- Messages d'erreur renvoyés au client : génériques et en français ; le détail reste dans les logs Vercel
- Emails : `api/_lib/email.ts` (Resend si `RESEND_API_KEY`, sinon Brevo), lien de désinscription signé (`api/_lib/unsubscribe.ts`)

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
  myOrgs: Org[];
  theme: 'dark' | 'light';
  showOnboarding: boolean;
  guestToken / guestStatus / pendingOrgId…  // liens de vote et invités
  // ... setters correspondants
}
```
L'onglet actif n'est pas dans le store : c'est l'URL (React Router).

---

## Composants React — Règles

### Structure d'un composant
```tsx
// 1. Imports (externes → locaux)
import { useState, useCallback } from 'react';
import type { EntityId, Player } from '@/types';
import { useSubmitVote } from '@/hooks/mutations';

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

// ❌ Composant défini dans le rendu d'un autre (nouveau type à chaque rendu → remonté)
function Parent() { const Row = () => <div />; return <Row />; }

// ✅ Composant au niveau du module, données passées en props
function Row({ label }: { label: string }) { return <div>{label}</div>; }
```

Un composant qui dépasse quelques centaines de lignes se découpe en sections qui portent leur propre état et leurs mutations (voir `components/admin/`).

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
- Chaque champ a un `<label>` associé (ou un `aria-label`) ; les toasts ont `role="status"`
- Contraste minimum : 4.5:1 pour le texte normal, vérifié automatiquement par `src/utils/contrast.test.ts` sur les deux thèmes
- `prefers-reduced-motion` est respecté (animations coupées)

---

## Sécurité

### Règles Supabase RLS (obligatoires en production)
- RLS activé sur toutes les tables
- Les votes ne s'insèrent que via la RPC `submit_vote` (phase, présence, heure limite, lien invité consommé) ; un joueur ne vote qu'une fois par match (index unique `votes_one_per_player`)
- Les colonnes sensibles d'`organizations` (`plan`, `stripe_*`) ne sont modifiables que par le webhook Stripe (droits par colonne)
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
npm run typecheck && npm run lint && npm test && npm run build
```

Règles TypeScript clés :
- `strict: true` — pas de `any` implicite, null-checks obligatoires
- Toujours typer les retours de fonctions exportées
- Utiliser `import type` pour les imports purement typés
