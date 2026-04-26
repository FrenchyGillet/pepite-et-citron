# Pépite & Citron — Web (React + Vite)

> Lire d'abord le CLAUDE.md racine du monorepo.

## Stack web

| Outil | Usage |
|---|---|
| React 18 | UI |
| Vite 5 | Bundler + dev server |
| React Router v6 | Navigation |
| TanStack Query v5 | Fetching + cache |
| Zustand | État global (session, match actif) |
| React Hook Form + Zod | Formulaires et validation |
| CSS Modules | Styles (pas de Tailwind) |

---

## Structure `apps/web/`

```
apps/web/
├── src/
│   ├── routes/             ← pages (une par route)
│   │   ├── Vote.tsx
│   │   ├── Results.tsx
│   │   ├── Admin.tsx
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── vote/
│   │   ├── match/
│   │   ├── layout/
│   │   └── ui/             ← composants atomiques
│   ├── hooks/              ← hooks React Query spécifiques web
│   ├── stores/             ← stores Zustand
│   ├── styles/
│   │   ├── tokens.css      ← variables CSS (reprend les tokens du design system)
│   │   ├── global.css
│   │   └── reset.css
│   ├── main.tsx
│   └── App.tsx
├── public/
│   ├── favicon.ico
│   ├── manifest.webmanifest  ← PWA
│   └── robots.txt
├── index.html
├── vite.config.ts
└── CLAUDE.md               ← ce fichier
```

---

## Règles CSS / Style

- **CSS Modules** pour tous les composants (`Component.module.css`)
- Les variables de design system sont dans `styles/tokens.css` (CSS custom properties)
- Pas de style inline dans JSX sauf valeurs dynamiques inévitables
- Dark mode uniquement — pas de toggle light/dark pour cette version
- Police : `font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif`
- Responsive mobile-first (l'app est utilisée sur téléphone dans un vestiaire)

---

## PWA

L'app web est une Progressive Web App installable :
- `manifest.webmanifest` avec `display: standalone`
- Service Worker via Vite PWA plugin (`vite-plugin-pwa`)
- Icônes 192×192 et 512×512
- Stratégie de cache : Network-first pour les données Supabase, Cache-first pour les assets statiques

---

## Performance web

- Lazy loading de toutes les routes (`React.lazy` + `Suspense`)
- Images : WebP uniquement, `loading="lazy"` sur toutes les images non critiques
- Bundle size : analyser avec `vite-bundle-visualizer` avant chaque release
- Core Web Vitals cibles : LCP < 2.5s, CLS < 0.1, INP < 200ms

---

## SEO / Meta

L'app est protégée par authentification — le SEO est minimal mais soigner quand même :
```html
<meta name="description" content="Vote pour la Pépite et le Citron de votre match." />
<meta name="theme-color" content="#000000" />
<link rel="canonical" href="https://pepitecitron.app" />
```

---

## Sécurité web

- Configurer les headers HTTP dans Vercel/Netlify :
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; connect-src 'self' *.supabase.co;
  ```
- HTTPS obligatoire en production
- Les clés Supabase anon-key peuvent être publiques (elles le sont par design), les RLS protègent les données
