import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DEMO_MODE } from '@/api';
import { track, EVENTS } from '@/utils/analytics';
import { isActive } from '@/utils/player';
import { copyToClipboard } from '@/utils/clipboard';
import { useTeams, useCurrentSeason } from '@/hooks/queries';
import { useConfirm } from '@/hooks/useConfirm';
import { CollapsibleSection } from '@/components/admin/CollapsibleSection';
import { ActiveMatchPanel } from '@/components/admin/ActiveMatchPanel';
import { MatchLauncher } from '@/components/admin/MatchLauncher';
import { GuestLinksSection } from '@/components/admin/GuestLinksSection';
import { PlayersSection } from '@/components/admin/PlayersSection';
import { TeamsSection } from '@/components/admin/TeamsSection';
import { SettingsSection } from '@/components/admin/SettingsSection';
import type { Player, Match, Org } from '@/types';
import { Toast } from './Toast';
import { SetupChecklist } from './SetupChecklist';
import { PushNotificationBanner } from './PushNotificationBanner';

interface AdminViewProps {
  /** false for a captain: match of the day only, no roster or settings. */
  isAdmin?: boolean;
  players: Player[];
  activeMatch: Match | null;
  currentOrg: Org | null;
  onShowGuide: () => void;
  onGoToResults?: () => void;
  onUpgrade?: () => void;
}

/**
 * Admin tab: layout and what the sections share (toast, confirmation dialog,
 * vote link, open/closed zones). Each section in ./admin owns its own form
 * state and mutations.
 */
export function AdminView({ isAdmin = true, players, activeMatch, currentOrg, onShowGuide, onGoToResults, onUpgrade }: AdminViewProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(() =>
    currentOrg?.id ? !!localStorage.getItem(`pepite_link_copied_${currentOrg.id}`) : false
  );
  const [matchEverLaunched, setMatchEverLaunched] = useState(() =>
    currentOrg?.id ? !!localStorage.getItem(`pepite_match_launched_${currentOrg.id}`) : false
  );

  // Collapsible zones
  const [effectifOpen, setEffectifOpen] = useState(players.length === 0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { confirm, confirmDialog } = useConfirm();
  // Arrived from /start with the first vote already open.
  const firstVote = !!(useLocation().state as { firstVote?: boolean } | null)?.firstVote
    && (activeMatch?.phase ?? 'closed') === 'voting';
  const { data: teams         = [] } = useTeams(currentOrg?.id);
  const { data: currentSeason = 1  } = useCurrentSeason(currentOrg?.id);

  // Archived players keep their history but leave every picker.
  const activePlayers = players.filter(isActive);

  // ── The vote link was copied or shared: ticks the checklist step ──
  const markLinkShared = () => {
    if (!currentOrg?.id) return;
    localStorage.setItem(`pepite_link_copied_${currentOrg.id}`, '1');
    setLinkCopied(true);
  };

  const copyOrgLink = async () => {
    if (!currentOrg) return;
    await copyToClipboard(`${window.location.origin}/vote?org=${currentOrg.slug}`);
    track(EVENTS.ORG_LINK_COPIED);
    setToast('Lien copié !');
    markLinkShared();
  };

  const markMatchLaunched = () => {
    if (!currentOrg?.id) return;
    localStorage.setItem(`pepite_match_launched_${currentOrg.id}`, '1');
    setMatchEverLaunched(true);
  };

  const shared = { notify: setToast, confirm };

  return (
    <div className="content">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      {confirmDialog}

      {/* ── Push notification opt-in banner ───────────────────────────── */}
      {!DEMO_MODE && currentOrg?.id && !firstVote && (
        <PushNotificationBanner orgId={currentOrg.id} />
      )}

      {firstVote && (
        <div role="status" style={{
          background: 'var(--gold-dim)', borderRadius: 'var(--radius-lg)',
          padding: '14px 16px', margin: '8px 0 12px',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)', marginBottom: 4 }}>
            🎉 Ton premier vote est ouvert !
          </div>
          <p style={{ fontSize: 13, color: 'var(--label2)', lineHeight: 1.5 }}>
            Fais scanner le QR code ou envoie le lien dans le groupe. Quand tout le monde a voté,
            lance le dépouillement : les votes se révèlent un par un.
          </p>
        </div>
      )}

      {/* ── Setup checklist (new orgs only) ───────────────────────────── */}
      {!DEMO_MODE && isAdmin && currentOrg?.id && !activeMatch && (
        <SetupChecklist
          orgId={currentOrg.id}
          playerCount={activePlayers.length}
          teamCount={teams.length}
          matchCount={matchEverLaunched ? 1 : 0}
          onCopiedLink={linkCopied}
        />
      )}

      {/* ── ZONE 1 : Match du soir ─────────────────────────────────────── */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ marginBottom: 10, paddingTop: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--label)', letterSpacing: '-0.02em', marginBottom: 2 }}>
            Match du soir
          </div>
          <p style={{ fontSize: 13, color: 'var(--label3)' }}>
            {activeMatch ? 'Un vote est en cours.' : 'Lance le vote en quelques secondes.'}
          </p>
        </div>

        {activeMatch ? (
          <ActiveMatchPanel
            {...shared}
            activeMatch={activeMatch}
            players={players}
            currentOrg={currentOrg}
            onCopyOrgLink={() => void copyOrgLink()}
            onLinkShared={markLinkShared}
            onGoToResults={onGoToResults}
            canManageVoters={isAdmin}
            firstVote={firstVote}
          />
        ) : activePlayers.length === 0 ? (
          <div className="group">
            <div className="row">
              <div className="row-body">
                <div className="row-title" style={{ color: 'var(--label3)' }}>Aucun joueur enregistré</div>
                <div className="row-sub">
                  {isAdmin ? 'Ajoute tes joueurs dans "Effectif" ci-dessous ↓' : "L'admin doit d'abord ajouter les joueurs."}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <MatchLauncher
            activePlayers={activePlayers}
            teams={teams}
            currentSeason={currentSeason}
            orgId={currentOrg?.id}
            notify={setToast}
            onLaunched={markMatchLaunched}
          />
        )}
      </div>

      {/* Supporters invités — only during voting phase */}
      {activeMatch && (activeMatch.phase || 'voting') === 'voting' && (
        <GuestLinksSection {...shared} matchId={activeMatch.id} />
      )}

      {/* ── ZONE 2 : Effectif ──────────────────────────────────────────── */}
      {isAdmin && (<>
        <CollapsibleSection
          title="Effectif"
          badge={activePlayers.length}
          subtitle="Joueurs et équipes de l'organisation."
          isOpen={effectifOpen}
          onToggle={() => setEffectifOpen(v => !v)}
        >
          <PlayersSection {...shared} players={players} teams={teams} orgId={currentOrg?.id} />
          <TeamsSection {...shared} activePlayers={activePlayers} teams={teams} orgId={currentOrg?.id} />
        </CollapsibleSection>

        {/* ── ZONE 3 : Paramètres ────────────────────────────────────────── */}
        <CollapsibleSection
          title="Paramètres"
          subtitle="Compte, saison et membres."
          isOpen={settingsOpen}
          onToggle={() => setSettingsOpen(v => !v)}
        >
          <SettingsSection
            {...shared}
            currentOrg={currentOrg}
            currentSeason={currentSeason}
            onCopyOrgLink={() => void copyOrgLink()}
            onShowGuide={onShowGuide}
            onUpgrade={onUpgrade}
          />
        </CollapsibleSection>
      </>)}

      {/* Legal footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        padding: '24px 16px 8px',
        borderTop: '1px solid var(--separator)',
        marginTop: 8,
      }}>
        {[
          { label: 'Confidentialité', href: '/privacy.html' },
          { label: 'CGU', href: '/terms.html' },
          { label: 'Contact', href: 'mailto:contact@pepite-citron.com' },
        ].map(link => (
          <a
            key={link.href}
            href={link.href}
            style={{ fontSize: 12, color: 'var(--label3)', textDecoration: 'none' }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
