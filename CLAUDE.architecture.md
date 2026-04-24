# Pépite & Citron — Best Practices & Architecture

> Lire d'abord le CLAUDE.md racine du monorepo.

## Principes directeurs

1. **Clarté > Cleverness** : du code lisible qu'un autre développeur comprend sans commentaires
2. **Colocate** : mettre les tests, les styles et le composant dans le même dossier
3. **Single Responsibility** : un fichier = une responsabilité
4. **Fail fast** : valider les données à l'entrée (Zod), jamais en profondeur dans la logique

---

## Architecture — Flux de données

```
Supabase (source de vérité)
    ↓
packages/supabase/queries/ (fetching pur)
    ↓
packages/supabase/hooks/ (TanStack Query — cache + realtime)
    ↓
apps/web|mobile / composants de page (orchestration)
    ↓
packages/ui / composants atomiques (présentation pure)
```

**Règle** : les données ne remontent jamais dans ce flux. Un composant UI ne connaît pas Supabase.

---

## Gestion de l'état

### Quoi mettre où

| Type d'état | Outil | Exemple |
|---|---|---|
| Données serveur | TanStack Query | liste des joueurs, match actif |
| État UI local | `useState` | modal ouvert/fermé, step d'un wizard |
| État global client | Zustand | session joueur, préférences |
| Formulaires | React Hook Form | formulaire d'ajout de joueur |

**Ne jamais** dupliquer des données serveur dans Zustand — TanStack Query est la source de vérité.

### Store Zustand
```ts
// Garder les stores Zustand petits et focalisés
interface SessionStore {
  currentPlayerId: string | null;
  hasVotedInMatch: (matchId: string) => boolean;
  setCurrentPlayer: (id: string) => void;
  markVoted: (matchId: string) => void;
}
```

---

## Composants React — Rules

### Structure d'un composant
```tsx
// 1. Imports (dans l'ordre : React, libs externes, packages internes, locaux)
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Player } from '@shared/types';
import { colors } from '@ui/tokens';
import styles from './PlayerCard.module.css';

// 2. Types locaux
interface PlayerCardProps {
  player: Player;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

// 3. Composant (function declaration, pas arrow function pour les composants)
export function PlayerCard({ player, onSelect, isSelected = false }: PlayerCardProps) {
  // 4. Hooks en haut (jamais conditionnels)
  const [isPressed, setIsPressed] = useState(false);
  
  // 5. Handlers (useCallback pour ceux passés en props)
  const handlePress = useCallback(() => {
    onSelect(player.id);
  }, [player.id, onSelect]);
  
  // 6. Rendu
  return (
    <button
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={handlePress}
      aria-pressed={isSelected}
    >
      {player.name}
    </button>
  );
}
```

### Ce qu'on évite
```tsx
// ❌ useEffect pour dériver de l'état
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(`${firstName} ${lastName}`); }, [firstName, lastName]);

// ✅ Calcul direct
const fullName = `${firstName} ${lastName}`;

// ❌ Props drilling profond (> 2 niveaux)
<Page match={match} players={players} votes={votes} onVote={onVote} ... />

// ✅ Utiliser les hooks directement dans les composants enfants

// ❌ Composant qui fait tout (God Component)
export function VoteScreen() { /* 400 lignes */ }

// ✅ Décomposer en composants focalisés
export function VoteScreen() {
  return (
    <ScreenLayout>
      <MatchBanner />
      <PlayerGrid onSelect={handleSelect} />
      <VoteConfirmButton />
    </ScreenLayout>
  );
}
```

---

## Accessibilité (a11y)

- Tout élément interactif a un `role` sémantique ou un élément HTML approprié (`button`, `a`, etc.)
- Les boutons de vote ont `aria-pressed` et `aria-label` explicite
- Contraste minimum : 4.5:1 pour le texte normal, 3:1 pour les grands textes (vérifié avec nos tokens dark mode)
- `testID` sur les éléments critiques pour les tests E2E

---

## Sécurité

### Règles Supabase RLS (obligatoires)
```sql
-- Un joueur ne peut voir que ses propres votes
create policy "voters see own votes" on votes
  for select using (voter_id = auth.uid());

-- Un joueur ne peut voter qu'une seule fois par match (constraint + RLS)
create policy "one vote per match" on votes
  for insert with check (
    not exists (
      select 1 from votes 
      where match_id = new.match_id and voter_id = auth.uid()
    )
  );
```

### Ne jamais
- Mettre la `service_role` key côté client
- Désactiver RLS en production
- Faire confiance aux données venant du client sans validation Zod
- Stocker des données sensibles en clair dans AsyncStorage / localStorage

---

## Git — Workflow

### Branches
```
main          ← production stable
develop       ← intégration
feature/xxx   ← nouvelles fonctionnalités
fix/xxx       ← corrections de bugs
release/x.x   ← préparation de release
```

### Commits (Conventional Commits)
```
feat(vote): ajouter la confirmation avant soumission
fix(results): corriger l'ordre du classement à égalité
chore(deps): mettre à jour expo-notifications
docs(supabase): documenter les politiques RLS
test(ranking): ajouter les cas limites du calcul
```

### PR Rules
- Une PR = une fonctionnalité ou un fix
- Toujours rebaser sur `develop` avant d'ouvrir la PR
- Minimum 1 reviewer
- Tests verts obligatoires avant merge
- Pas de `console.log` en merge vers `main`

---

## Linting & Formatting

### ESLint config (`.eslintrc.ts`)
Règles clés activées :
- `@typescript-eslint/no-explicit-any` — error
- `@typescript-eslint/no-unused-vars` — error
- `react-hooks/rules-of-hooks` — error
- `react-hooks/exhaustive-deps` — warn
- `no-console` — warn (error sur `main`)

### Prettier
- Semi-colons : oui
- Single quotes : oui
- Tab width : 2
- Trailing commas : `all`
- Print width : 100

```bash
# Vérifier avant commit
pnpm lint && pnpm typecheck && pnpm test
```

Configurer un **pre-commit hook** avec Husky + lint-staged pour automatiser ça.

---

## Versioning

Suivre le **Semantic Versioning** (`MAJOR.MINOR.PATCH`) :
- `PATCH` : bug fix sans impact API
- `MINOR` : nouvelle fonctionnalité, rétrocompatible
- `MAJOR` : changement cassant (rare)

Pour les stores mobiles, le `buildNumber` (iOS) et `versionCode` (Android) **doivent être incrémentés** à chaque soumission, même pour un hotfix.

```json
// app.json
{
  "expo": {
    "version": "1.2.0",
    "ios": { "buildNumber": "42" },
    "android": { "versionCode": 42 }
  }
}
```
