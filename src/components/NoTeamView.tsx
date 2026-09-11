interface NoTeamViewProps {
  onCreate: () => void;
  onRetry: () => void;
  onSignOut: () => void;
}

/**
 * Signed in, but no team and no team link to join. Usually a new captain who
 * left before creating their team; creating one is an explicit choice next to
 * "Réessayer", in case an existing team simply failed to load.
 */
export function NoTeamView({ onCreate, onRetry, onSignOut }: NoTeamViewProps) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="header-logo" style={{ fontSize: 28 }}>
          <span className="header-pepite">Pépite</span>
          <span className="header-amp"> & </span>
          <span className="header-citron">Citron</span>
        </div>
      </div>

      <div style={{
        width: '100%', maxWidth: 380, background: 'var(--bg2)',
        borderRadius: 'var(--radius-lg)', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--label)', margin: '0 0 8px' }}>
          Pas encore d'équipe
        </h1>
        <p style={{ fontSize: 14, color: 'var(--label2)', lineHeight: 1.6, margin: '0 0 8px' }}>
          Crée ton équipe pour lancer tes premiers votes après les matchs.
        </p>
        <p style={{ fontSize: 13, color: 'var(--label3)', lineHeight: 1.6, margin: '0 0 20px' }}>
          Tu es joueur ? Pas besoin d'équipe ni de compte : ouvre le lien de vote envoyé par ton capitaine.
        </p>
        <button className="btn btn-primary btn-full" onClick={onCreate}>
          Créer mon équipe
        </button>
        <button className="btn btn-secondary btn-full" style={{ marginTop: 10 }} onClick={onRetry}>
          J'ai déjà une équipe — réessayer
        </button>
        <button
          onClick={onSignOut}
          style={{
            marginTop: 16, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--label3)', textDecoration: 'underline',
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
