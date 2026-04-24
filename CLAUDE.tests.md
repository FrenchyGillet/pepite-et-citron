# Pépite & Citron — Stratégie de tests

> Lire d'abord le CLAUDE.md racine du monorepo.

## Philosophie

> "Write tests. Not too many. Mostly integration." — Kent C. Dodds

On applique la pyramide de tests adaptée à notre contexte :
- **Unitaires** : logique métier pure dans `packages/shared`
- **Intégration** : composants React + hooks avec mocking Supabase
- **E2E** : parcours critiques (voter, voir les résultats, ouvrir/fermer un match)

---

## Outils par couche

| Couche | Outil | Où |
|---|---|---|
| Unitaires | Vitest | `packages/shared` |
| Composants (web) | Vitest + React Testing Library | `apps/web` |
| Composants (mobile) | Jest + React Native Testing Library | `apps/mobile` |
| E2E web | Playwright | `apps/web/e2e/` |
| E2E mobile | Maestro | `apps/mobile/e2e/` |
| Mocking API | MSW (Mock Service Worker) | partagé |

---

## Tests unitaires — `packages/shared`

### Règle
Toute fonction dans `packages/shared` **doit** avoir des tests unitaires.  
La logique métier est la partie la plus critique et la plus facile à tester.

### Exemple : tester le calcul du classement
```ts
// packages/shared/src/utils/ranking.test.ts
import { describe, it, expect } from 'vitest';
import { computeRanking } from './ranking';

describe('computeRanking', () => {
  it('retourne un tableau vide si aucun vote', () => {
    expect(computeRanking([])).toEqual([]);
  });

  it('trie par nombre de pépites décroissant', () => {
    const votes = [
      { pepiteId: 'player-1', citronId: 'player-2' },
      { pepiteId: 'player-1', citronId: 'player-3' },
      { pepiteId: 'player-2', citronId: 'player-1' },
    ];
    const ranking = computeRanking(votes, players);
    expect(ranking[0].playerId).toBe('player-1');
    expect(ranking[0].pepiteCount).toBe(2);
  });

  it("ne compte pas les votes d'un joueur absent", () => {
    // ...
  });
});
```

### Couverture cible
- `packages/shared` : **90%+**
- `packages/supabase/queries` : **80%+** (avec mocking Supabase)

---

## Tests de composants (React Testing Library)

### Règle
Tester le **comportement**, pas l'implémentation.  
Ne jamais tester les détails internes (state, méthodes privées).

```tsx
// apps/web/src/components/vote/VoteButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { VoteButton } from './VoteButton';

describe('VoteButton', () => {
  it('affiche le nom du joueur', () => {
    render(<VoteButton player={{ id: '1', name: 'Martin' }} onVote={vi.fn()} type="pepite" />);
    expect(screen.getByText('Martin')).toBeInTheDocument();
  });

  it('appelle onVote avec le bon id au clic', async () => {
    const onVote = vi.fn();
    render(<VoteButton player={{ id: '1', name: 'Martin' }} onVote={onVote} type="pepite" />);
    fireEvent.click(screen.getByRole('button'));
    expect(onVote).toHaveBeenCalledWith('1');
  });

  it('est désactivé quand disabled=true', () => {
    render(<VoteButton player={{ id: '1', name: 'Martin' }} onVote={vi.fn()} type="pepite" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Queries à prioriser (dans l'ordre)
1. `getByRole` — le plus proche de l'expérience utilisateur
2. `getByLabelText` — pour les champs de formulaire
3. `getByText` — pour le contenu textuel
4. `getByTestId` — en dernier recours uniquement

---

## Tests d'intégration — Hooks Supabase

Mocker Supabase avec MSW (pas de vraie base de données en test) :

```ts
// packages/supabase/src/hooks/useActiveMatch.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '../../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import { useActiveMatch } from './useActiveMatch';

describe('useActiveMatch', () => {
  it('retourne le match ouvert', async () => {
    server.use(
      http.get('*/rest/v1/matches', () =>
        HttpResponse.json([{ id: 'match-1', label: 'vs Bruxelles', status: 'open' }])
      )
    );

    const { result } = renderHook(() => useActiveMatch(), { wrapper: QueryClientWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.label).toBe('vs Bruxelles');
  });

  it('retourne null si aucun match ouvert', async () => {
    server.use(
      http.get('*/rest/v1/matches', () => HttpResponse.json([]))
    );

    const { result } = renderHook(() => useActiveMatch(), { wrapper: QueryClientWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
```

---

## Tests E2E — Playwright (web)

Tester uniquement les **parcours critiques** :

```
apps/web/e2e/
├── vote.spec.ts        ← voter pour la pépite et le citron
├── results.spec.ts     ← voir les résultats en temps réel
└── admin.spec.ts       ← ouvrir/fermer un match, gérer les joueurs
```

### Exemple
```ts
// e2e/vote.spec.ts
import { test, expect } from '@playwright/test';

test('un joueur peut voter une seule fois', async ({ page }) => {
  await page.goto('/');
  
  // Sélectionner la pépite
  await page.getByTestId('player-card-martin').click();
  await page.getByRole('button', { name: 'Voter Pépite' }).click();
  
  // Sélectionner le citron
  await page.getByTestId('player-card-dupont').click();
  await page.getByRole('button', { name: 'Voter Citron' }).click();
  
  // Confirmer
  await page.getByRole('button', { name: 'Confirmer mon vote' }).click();
  
  // Vérifier la redirection vers les résultats
  await expect(page).toHaveURL('/results');
  await expect(page.getByText('Martin')).toBeVisible();
});
```

---

## Tests E2E — Maestro (mobile)

```yaml
# apps/mobile/e2e/vote.yaml
appId: com.pepitecitron.app
---
- launchApp
- assertVisible: "Pépite & Citron"
- tapOn: "Martin"
- tapOn: "Voter Pépite ⭐"
- tapOn: "Dupont"
- tapOn: "Voter Citron 🍋"
- tapOn: "Confirmer"
- assertVisible: "Ton vote a été enregistré"
```

---

## Règles générales

1. **Nommage des tests** : `describe` = le sujet, `it` = une phrase en français décrivant le comportement attendu
2. **Arrange / Act / Assert** : toujours structurer les tests en 3 phases
3. **Un seul `expect` principal** par test (les assertions secondaires sont ok)
4. **Pas de `sleep()` dans les tests** — utiliser `waitFor`, `findBy*`, ou les fixtures Playwright
5. **Les tests doivent être déterministes** : pas de dépendance à l'heure, à des données aléatoires non seedées
6. **Chaque bug corrigé = un test de non-régression ajouté**

---

## Coverage

```bash
# Lancer avec coverage
pnpm test --coverage

# Seuils configurés dans vitest.config.ts
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
  }
}
```

---

## CI/CD

Les tests sont lancés automatiquement :
- **Sur chaque PR** : unitaires + composants (rapide, < 2 min)
- **Sur merge vers `main`** : unitaires + composants + E2E web (Playwright)
- **Avant release mobile** : E2E Maestro sur device physique (iOS + Android)
