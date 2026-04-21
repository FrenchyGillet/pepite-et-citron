import { Component } from 'react';

/**
 * Attrape les erreurs React dans n'importe quel enfant et affiche
 * un écran de récupération propre au lieu d'une page blanche.
 * Usage : <ErrorBoundary label="Résultats"><ResultsView /></ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary:${this.props.label}]`, error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center',
          padding: '48px 32px', minHeight: 260, gap: 16,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,59,48,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="var(--red, #ff3b30)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--label1)', marginBottom: 6 }}>
              Quelque chose a planté
            </div>
            <div style={{ fontSize: 13, color: 'var(--label3)', lineHeight: 1.5, maxWidth: 260 }}>
              {this.state.error.message || 'Erreur inattendue'}
            </div>
          </div>
          <button
            onClick={this.reset}
            style={{
              marginTop: 4, padding: '10px 24px',
              background: 'var(--bg3)', border: 'none',
              borderRadius: 12, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', color: 'var(--label)',
            }}>
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
