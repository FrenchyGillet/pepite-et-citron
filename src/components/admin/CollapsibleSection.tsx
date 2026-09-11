import type { ReactNode } from 'react';

// ── Collapsible section wrapper ───────────────────────────────────────────────
export function CollapsibleSection({
  title, badge, subtitle, isOpen, onToggle, children,
}: {
  title: string;
  badge?: string | number;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div style={{ borderTop: '0.5px solid var(--separator)', marginTop: 8, paddingTop: 4 }}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '14px 0', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--label)', letterSpacing: '-0.02em' }}>{title}</span>
          {badge !== undefined && (
            <span style={{
              fontSize: 12, fontWeight: 600, color: 'var(--label3)',
              background: 'var(--bg2)', borderRadius: 20, padding: '2px 8px',
            }}>{badge}</span>
          )}
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          stroke="var(--label3)" strokeWidth="2" strokeLinecap="round"
          style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
        >
          <polyline points="5 3 11 8 5 13" />
        </svg>
      </button>
      {!isOpen && subtitle && (
        <p style={{ fontSize: 12, color: 'var(--label4)', paddingBottom: 12 }}>{subtitle}</p>
      )}
      {isOpen && <div style={{ paddingBottom: 20 }}>{children}</div>}
    </div>
  );
}
