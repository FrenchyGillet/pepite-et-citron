/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 0,
    ignoreErrors: [
      'AbortError',
      'Délai dépassé',
      'NetworkError',
      'Failed to fetch',
      'Load failed',
    ],
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <div style={{
          minHeight: '100dvh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#111', padding: 24,
        }}>
          <div style={{
            background: '#1c1c1e', borderRadius: 16, padding: '32px 24px',
            maxWidth: 360, width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💥</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Quelque chose s'est mal passé
            </div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.6 }}>
              L'erreur a été signalée automatiquement.<br />
              Recharge la page pour continuer.
            </div>
            <button
              onClick={resetError}
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                background: '#ffd60a', color: '#000', fontWeight: 700,
                fontSize: 15, border: 'none', cursor: 'pointer',
              }}
            >
              Recharger
            </button>
          </div>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
