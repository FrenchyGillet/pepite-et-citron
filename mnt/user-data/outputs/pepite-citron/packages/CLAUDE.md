# Pépite & Citron — Packages partagés

> Lire d'abord le CLAUDE.md racine du monorepo.

---

## `packages/shared` — Logique métier

Ce package est **framework-agnostic** : pas d'import React, React Native, ou Supabase ici.  
Uniquement de la logique pure, testable sans environnement de rendu.

### Ce qui va ici
- **Types métier** : `Match`, `Player`, `Vote`, `MatchStatus`
- **Constantes** : règles du vote, limites, statuts
- **Fonctions pures** : calcul du classement, validation d'un vote, formatage des données
- **Schémas Zod** : validation des payloads entrants/sortants

### Ce qui n'appartient pas ici
- Composants React / React Native
- Appels réseau (Supabase, fetch)
- Logique de navigation
- État global (Zustand)

### Exemple de structure
```
packages/shared/
├── src/
│   ├── types/
│   │   ├── match.ts
│   │   ├── player.ts
│   │   └── vote.ts
│   ├── schemas/          ← Zod schemas
│   │   ├── vote.schema.ts
│   │   └── match.schema.ts
│   ├── utils/
│   │   ├── ranking.ts    ← calcul des pépites/citrons
│   │   └── format.ts
│   └── constants.ts
└── index.ts              ← exports publics explicites
```

### Types fondamentaux
```ts
export type MatchStatus = 'open' | 'closed';

export interface Match {
  id: string;
  label: string;
  status: MatchStatus;
  createdAt: string;
  closedAt: string | null;
}

export interface Player {
  id: string;
  name: string;
  isPresent: boolean;
}

export interface Vote {
  id: string;
  matchId: string;
  pepiteId: string;   // joueur désigné Pépite
  citronId: string;   // joueur désigné Citron
  voterId: string;    // joueur qui vote
  createdAt: string;
}

export interface VoteResult {
  playerId: string;
  playerName: string;
  pepiteCount: number;
  citronCount: number;
}
```

---

## `packages/ui` — Design System

Composants visuels partagés entre web et mobile.

### Règle fondamentale
Un composant dans `packages/ui` **ne doit jamais** contenir de logique métier ni d'appels réseau.  
Il reçoit des données par props et émet des événements par callbacks.

### Architecture des composants
```
packages/ui/
├── src/
│   ├── tokens.ts           ← couleurs, espacements, typographie
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── PlayerCard/
│   │   ├── MatchBanner/
│   │   └── VoteConfirmSheet/
│   └── index.ts
```

### Convention des composants UI
```tsx
// Toujours : props explicites et typées, pas de spread {...props} non contrôlé
interface PlayerCardProps {
  player: Player;
  isSelected: boolean;
  selectionType: 'pepite' | 'citron' | null;
  onPress: (playerId: string) => void;
  testID?: string;  // pour les tests E2E
}

export function PlayerCard({ player, isSelected, selectionType, onPress, testID }: PlayerCardProps) {
  // ...
}
```

---

## `packages/supabase` — Client et hooks

### Structure
```
packages/supabase/
├── src/
│   ├── client.ts           ← initialisation Supabase client unique
│   ├── types.ts            ← types générés (ne pas modifier manuellement)
│   ├── hooks/
│   │   ├── useActiveMatch.ts
│   │   ├── usePlayers.ts
│   │   ├── useVote.ts
│   │   └── useResults.ts
│   └── queries/            ← fonctions de fetch pures (sans hooks)
│       ├── matches.ts
│       ├── players.ts
│       └── votes.ts
└── index.ts
```

### Règles Supabase

1. **Un seul client** instancié dans `client.ts`, importé partout ailleurs
2. **Toujours vérifier `.error`** :
```ts
// ✅ Correct
const { data, error } = await supabase.from('votes').insert(vote);
if (error) throw new AppError('VOTE_FAILED', error.message);

// ❌ Jamais
const { data } = await supabase.from('votes').insert(vote);
```

3. **Types stricts** : utiliser les types générés, jamais `any`
```ts
import type { Database } from './types';
type VoteRow = Database['public']['Tables']['votes']['Row'];
```

4. **Realtime** : s'abonner dans les hooks, se désabonner dans le cleanup
```ts
useEffect(() => {
  const channel = supabase
    .channel('votes-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, handleNewVote)
    .subscribe();
  
  return () => { supabase.removeChannel(channel); };
}, []);
```

5. **RLS activé** sur toutes les tables — ne jamais désactiver en production

### Schéma Supabase de référence
```sql
-- Joueurs
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Matchs
create table matches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- Présence au match
create table match_players (
  match_id uuid references matches(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  primary key (match_id, player_id)
);

-- Votes
create table votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  voter_id uuid references players(id),
  pepite_id uuid references players(id),
  citron_id uuid references players(id),
  created_at timestamptz default now(),
  -- Un joueur ne peut voter qu'une fois par match
  unique (match_id, voter_id),
  -- Un joueur ne peut pas se voter lui-même
  check (voter_id != pepite_id and voter_id != citron_id),
  -- Pépite et Citron doivent être différents
  check (pepite_id != citron_id)
);
```
