# Pépite & Citron — Stratégie de tests

> Lire d'abord `CLAUDE.md` pour la vue d'ensemble du projet.

## Philosophie

> "Write tests. Not too many. Mostly integration." — Kent C. Dodds

Pyramide adaptée à ce projet :
- **Unitaires** : logique métier pure dans `src/utils/`
- **Intégration API** : `src/api.ts` via MSW (Mock Service Worker)
- **Composants** : vues React avec `@testing-library/react`

---

## Outils

| Couche | Outil |
|---|---|
| Runner | Vitest 4 |
| Assertions DOM | `@testing-library/jest-dom` |
| Rendu composants | `@testing-library/react` |
| Mocking réseau | MSW 2 (`msw/node`) |
| Couverture | `@vitest/coverage-v8` |

---

## Structure des tests

```
src/
├── utils/
│   ├── scoring.test.ts       ← computeResultsSummary (10 cas)
│   ├── season.test.ts        ← computeSeasonStats (11 cas)
│   ├── vote.test.ts          ← hasVotedLocally, markVotedLocally, classifyVoteError (19 cas)
│   └── utils.test.ts         ← computeScores, formatDate (18 cas)
└── test/
    ├── setup.js              ← jest-dom + MSW lifecycle + localStorage + appStore reset
    ├── server.ts             ← setupServer() MSW (handlers ajoutés par test via server.use())
    ├── renderApp.jsx         ← helper : wrape avec QueryClientProvider + appStore frais
    ├── api.test.ts           ← demoAPI (30 cas) + realAPI via MSW (67 cas)
    ├── admin.test.jsx        ← AdminView : gestion match, joueurs, tokens invités
    ├── guest.test.jsx        ← flux invité : ?guest=token, vote anonyme
    ├── player.test.jsx       ← ajout / suppression de joueurs
    └── results.test.jsx      ← vue résultats : phases voting / counting / closed
```

---

## Tests unitaires — `src/utils/`

Toute fonction dans `src/utils/` **doit** avoir des tests unitaires. Ces fonctions sont pures (pas d'effets de bord) et faciles à tester.

```ts
// src/utils/scoring.test.ts
import { describe, it, expect } from 'vitest';
import { computeResultsSummary } from './scoring';

describe('computeResultsSummary', () => {
  it('retourne des listes vides et pas d'égalité quand il n'y a pas de votes', () => {
    const result = computeResultsSummary([], allPlayers, allPlayers);
    expect(result.pepiteRanked).toEqual([]);
    expect(result.bestTied).toBe(false);
  });
});
```

### Couvertures cibles
- `src/utils/` : **90%+**
- `src/api.ts` : **80%+** (statements et branches)

---

## Tests d'intégration API — `src/test/api.test.ts`

MSW intercepte les appels `fetch` au niveau Node pour simuler les réponses Supabase sans réseau réel.

### demoAPI
Testé directement en mémoire — pas de MSW nécessaire, juste des mutations de `demoState`.

```ts
import { demoAPI, __resetDemoState as resetDemo } from '../api';

describe('demoAPI', () => {
  beforeEach(() => resetDemo());

  it('addPlayer ajoute un joueur et le retourne', async () => {
    const p = await demoAPI.addPlayer('Zara');
    expect(p.name).toBe('Zara');
    expect(await demoAPI.getPlayers()).toHaveLength(11);
  });
});
```

### realAPI via MSW
```ts
import { http, HttpResponse } from 'msw';
import { server } from './server';
import { realAPI, setCurrentOrgId } from '../api';

const BASE = 'https://VOTRE_PROJET.supabase.co/rest/v1';
const AUTH = 'https://VOTRE_PROJET.supabase.co/auth/v1';
const RPC  = `${BASE}/rpc`;

describe('realAPI', () => {
  beforeAll(() => setCurrentOrgId('org-123'));

  describe('getPlayers', () => {
    it('retourne la liste depuis le serveur', async () => {
      server.use(http.get(`${BASE}/players`, () => HttpResponse.json([{ id: 'p1', name: 'Alice' }])));
      const players = await realAPI.getPlayers();
      expect(players[0].name).toBe('Alice');
    });

    it('lève une erreur sur réponse 500', async () => {
      server.use(http.get(`${BASE}/players`, () =>
        HttpResponse.json({ message: 'Erreur 500' }, { status: 500 }),
      ));
      await expect(realAPI.getPlayers()).rejects.toThrow('Erreur 500');
    });
  });
});
```

**Règles MSW** :
- `server.use(...)` dans chaque test — les handlers sont réinitialisés par `server.resetHandlers()` dans `afterEach`
- `HttpResponse.error()` pour simuler une panne réseau (pas `HttpResponse.networkError()` — inexistant en MSW v2)
- Pour les endpoints auth : `http.post(\`${AUTH}/signup\`, ...)`, `http.post(\`${AUTH}/token\`, ...)`
- Pour les RPC Supabase SDK : `http.post(\`${RPC}/nom_fonction\`, ...)`

---

## Tests de composants — React Testing Library

```tsx
// src/test/player.test.jsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';

describe('Ajout de joueur', () => {
  it('ajoute un joueur à la liste quand on soumet le formulaire', async () => {
    renderApp();
    await userEvent.type(screen.getByPlaceholderText(/nom du joueur/i), 'Zara');
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }));
    expect(await screen.findByText('Zara')).toBeInTheDocument();
  });
});
```

### Queries à prioriser (ordre de préférence)
1. `getByRole` — le plus proche de l'expérience utilisateur
2. `getByLabelText` — pour les champs de formulaire
3. `getByText` — pour le contenu textuel
4. `getByTestId` — en dernier recours uniquement

---

## Setup des tests (`src/test/setup.js`)

```js
import { server } from './server';
import { resetAppStore } from '../store/appStore';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetAppStore();
  server.resetHandlers();
});

afterAll(() => server.close());
```

`onUnhandledRequest: 'warn'` : les appels non mockés (ex. init SDK Supabase) déclenchent un warning mais ne font pas échouer les tests.

---

## Lancer les tests

```bash
npm test                                              # tous les tests
npm test -- src/test/api.test.ts                      # un fichier spécifique
npm run test:watch                                    # mode watch
npm test -- --coverage --coverage.include='src/api.ts' --coverage.reporter=text
```

---

## Règles générales

1. **Nommage** : `describe` = le sujet, `it` = comportement attendu en phrase complète
2. **Arrange / Act / Assert** : toujours structurer les tests en 3 phases
3. **Un seul `expect` principal** par test (les assertions secondaires sont ok)
4. **Pas de `sleep()`** — utiliser `waitFor`, `findBy*`
5. **Tests déterministes** : pas de dépendance à l'heure ou à des données aléatoires non seedées
6. **Chaque bug corrigé = un test de non-régression ajouté**
7. **Ne pas mocker ce qu'on teste** : tester `realAPI` avec MSW, pas avec `vi.mock('../api')`
