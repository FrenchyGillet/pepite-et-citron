/**
 * SetupChecklist — Guided first-match checklist for new admins.
 *
 * Shows in AdminView when the org has no completed matches yet.
 * Tracks progress automatically (players, teams) or via localStorage flags
 * (link copied, first match). Dismissible.
 */
import { useState, useEffect } from 'react';

interface Props {
  orgId:         string;
  playerCount:   number;
  teamCount:     number;
  matchCount:    number;
  onCopiedLink:  boolean;   // true once the org link has been copied
}

interface Step {
  id:        string;
  label:     string;
  done:      boolean;
  optional?: boolean;   // shown, but not needed to finish the checklist
}

const DISMISSED_KEY = (orgId: string) => `pepite_checklist_dismissed_${orgId}`;

export function SetupChecklist({ orgId, playerCount, teamCount, matchCount, onCopiedLink }: Props) {
  const [dismissed, setDismissed] = useState(() =>
    !!localStorage.getItem(DISMISSED_KEY(orgId))
  );

  // A vote needs at least 3 present players (2-pépite mode). Saved line-ups
  // only speed up later matches, so they never block the first vote.
  const steps: Step[] = [
    { id: 'players', label: 'Ajouter au moins 3 joueurs à l\'effectif',     done: playerCount >= 3 },
    { id: 'match',   label: 'Lancer le premier vote',                        done: matchCount  >= 1 },
    { id: 'link',    label: 'Partager le lien de vote avec l\'équipe',       done: onCopiedLink },
    { id: 'team',    label: 'Enregistrer une composition d\'équipe',         done: teamCount   >= 1, optional: true },
  ];

  const required       = steps.filter(s => !s.optional);
  const completedCount = required.filter(s => s.done).length;
  const allDone        = completedCount === required.length;

  // Auto-dismiss when all steps are done
  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => {
        localStorage.setItem(DISMISSED_KEY(orgId), '1');
        setDismissed(true);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [allDone, orgId]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY(orgId), '1');
    setDismissed(true);
  };

  return (
    <div style={{
      background:    'var(--bg2)',
      borderRadius:  'var(--radius-lg)',
      padding:       '16px',
      marginBottom:  16,
      border:        allDone ? '1px solid rgba(50,215,75,0.3)' : '1px solid var(--separator)',
      transition:    'border-color 0.3s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
            {allDone ? '🎉 C\'est parti !' : '🚀 Première mise en route'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--label3)', marginLeft: 8 }}>
            {completedCount}/{required.length}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Masquer la checklist"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--label4)', padding: '2px 6px' }}
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(completedCount / required.length) * 100}%`,
          background: allDone ? '#32D74B' : 'var(--gold)',
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map(step => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step.done ? '#32D74B' : 'var(--bg3)',
              transition: 'background 0.3s',
            }}>
              {step.done
                ? <span style={{ fontSize: 11, color: '#000', fontWeight: 700 }}>✓</span>
                : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--label4)', display: 'block' }} />
              }
            </div>
            <span style={{
              fontSize: 13,
              color: step.done ? 'var(--label3)' : 'var(--label2)',
              textDecoration: step.done ? 'line-through' : 'none',
              transition: 'color 0.3s',
            }}>
              {step.label}
              {step.optional && <span style={{ color: 'var(--label3)' }}> (facultatif)</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
