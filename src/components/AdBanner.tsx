interface Props {
  onUpgradeClick: () => void;
}

/**
 * Bandeau affiché pour les organisations en plan gratuit, au-dessus de la
 * tab bar. Sert à la fois d'espace publicitaire et de CTA d'upgrade.
 * Remplacer le contenu interne par une balise Google AdSense quand le compte
 * est approuvé.
 */
export function AdBanner({ onUpgradeClick }: Props) {
  return (
    <div style={{
      background: 'var(--bg2)',
      borderTop: '1px solid var(--separator)',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: 52,
    }}>
      <div style={{ fontSize: 12, color: 'var(--label2)', lineHeight: 1.4 }}>
        <span style={{ fontSize: 14 }}>⭐</span>{' '}
        <strong style={{ color: 'var(--label)' }}>Stats de saison</strong> — débloquez l'historique complet
      </div>
      <button
        onClick={onUpgradeClick}
        style={{
          background: '#FFD700',
          color: '#000',
          border: 'none',
          borderRadius: 10,
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Pro →
      </button>
    </div>
  );
}
