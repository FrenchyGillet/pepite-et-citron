import { useState, useEffect } from 'react';
import { DEMO_MODE } from '@/api';
import { useAppStore } from '@/store/appStore';
import { useOrg } from '@/hooks/useOrg';
import { useTheme } from '@/hooks/useTheme';
import { useActiveMatch } from '@/hooks/queries';
import type { Org } from '@/types';

export function AppHeader() {
  const currentOrg = useAppStore(s => s.currentOrg);
  const myOrgs     = useAppStore(s => s.myOrgs);

  const { switchOrg }          = useOrg();
  const { theme, toggleTheme } = useTheme();
  const { data: activeMatch }  = useActiveMatch(currentOrg?.id);

  const [orgPickerOpen, setOrgPickerOpen] = useState(false);

  useEffect(() => {
    if (!orgPickerOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-org-picker]')) setOrgPickerOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [orgPickerOpen]);

  return (
    <div className="header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="header-logo">
            <span className="header-pepite">Pépite</span>
            <span className="header-amp"> & </span>
            <span className="header-citron">Citron</span>
          </div>
          {currentOrg?.name && !DEMO_MODE && (
            <OrgPicker
              currentOrg={currentOrg}
              myOrgs={myOrgs}
              open={orgPickerOpen}
              setOpen={setOrgPickerOpen}
              onSwitch={(org) => { switchOrg(org); setOrgPickerOpen(false); }}
            />
          )}
          <div className="header-sub">
            {activeMatch ? activeMatch.label : 'Aucun match en cours'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FeedbackButton />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>
    </div>
  );
}

// ── OrgPicker ───────────────────────────────────────────────────────────────

interface OrgPickerProps {
  currentOrg: Org;
  myOrgs:     Org[];
  open:       boolean;
  setOpen:    (v: boolean) => void;
  onSwitch:   (org: Org) => void;
}

function OrgPicker({ currentOrg, myOrgs, open, setOpen, onSwitch }: OrgPickerProps) {
  return (
    <div style={{ position: 'relative' }} data-org-picker="">
      {myOrgs.length > 1 ? (
        <button onClick={() => setOpen(!open)} style={{
          background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span className="header-sub" style={{ color: 'var(--gold)', fontWeight: 600 }}>{currentOrg.name}</span>
          <span style={{ fontSize: 9, color: 'var(--gold)', opacity: 0.7, marginTop: 1 }}>▼</span>
          {currentOrg.role === 'voter' && <RoleBadge />}
        </button>
      ) : (
        <div className="header-sub" style={{ color: 'var(--gold)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          {currentOrg.name}
          {currentOrg.role === 'voter' && <RoleBadge />}
        </div>
      )}
      {open && myOrgs.length > 1 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--separator2)', overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 180,
        }}>
          {myOrgs.map(org => (
            <button key={org.id} onClick={() => onSwitch(org)} style={{
              width: '100%', background: org.id === currentOrg.id ? 'var(--bg3)' : 'none',
              border: 'none', padding: '12px 14px', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left',
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>{org.name}</span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: org.role === 'admin' ? 'var(--gold)' : 'var(--lemon)',
                background: org.role === 'admin' ? 'rgba(255,214,10,0.12)' : 'rgba(170,221,0,0.12)',
                borderRadius: 4, padding: '2px 6px',
              }}>
                {org.role === 'admin' ? 'Admin' : 'Votant'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleBadge() {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(170,221,0,0.15)', color: 'var(--lemon)', borderRadius: 4, padding: '1px 5px' }}>
      votant
    </span>
  );
}

function FeedbackButton() {
  return (
    <a
      href="mailto:citron@drill-faktory.odoo.com"
      aria-label="Envoyer un feedback"
      title="Envoyer un feedback"
      style={{
        background: 'var(--bg3)', border: 'none', borderRadius: '10px', padding: '8px',
        cursor: 'pointer', color: 'var(--label2)', display: 'flex', alignItems: 'center',
        width: 36, height: 36, justifyContent: 'center', textDecoration: 'none',
        boxSizing: 'border-box',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    </a>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      background: 'var(--bg3)', border: 'none', borderRadius: '10px', padding: '8px',
      cursor: 'pointer', color: 'var(--label2)', display: 'flex', alignItems: 'center',
      width: 36, height: 36, justifyContent: 'center',
    }}>
      {theme === 'dark' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      )}
    </button>
  );
}
