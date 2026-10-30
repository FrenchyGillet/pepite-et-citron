import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { track, EVENTS } from '@/utils/analytics';
import { useT } from '@/i18n';
import type { EntityId } from '@/types';
import { MascotTalk } from './MascotTalk';

interface GuestPromoViewProps {
  /** null = ?org= flow (can browse results), 'valid' = ?guest= token flow */
  canSeeResults: boolean;
  /** Name the voter typed at step 0 */
  voterName?: string | null;
  /** Name of the current org / team */
  orgName?: string | null;
  /** The match just voted: picks the mascots' line. */
  matchId?: EntityId;
}

export function GuestPromoView({ canSeeResults, voterName, orgName, matchId }: GuestPromoViewProps) {
  const t = useT();
  const navigate          = useNavigate();
  const setIsVoterSession = useAppStore(s => s.setIsVoterSession);
  const setGuestStatus    = useAppStore(s => s.setGuestStatus);
  const setGuestToken     = useAppStore(s => s.setGuestToken);
  const setCurrentOrg     = useAppStore(s => s.setCurrentOrg);
  const clearLinkOrg      = useAppStore(s => s.clearLinkOrg);

  function handleCreateAccount() {
    track(EVENTS.PROMO_SIGNUP_CLICKED);
    // Clear voter-session flags so App shows AuthView (sign-up mode).
    // Also clear currentOrg so that loadOrgs() (called after SIGNED_IN) can
    // set it correctly — App.tsx will then route to JoinOrgView (not OrgSetupView)
    // because pendingOrgId is still set in the store.
    setIsVoterSession(false);
    setGuestStatus(null);
    setGuestToken(null);
    clearLinkOrg();
    setCurrentOrg(null);
    navigate('/login?mode=signup', { replace: true });
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70dvh',
      padding: '0 24px', textAlign: 'center', gap: 0,
    }}>
      {/* Big checkmark */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(50, 215, 75, 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="#32D74B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--label)', margin: '0 0 8px' }}>
        {voterName ? t('promo.wellPlayed', { name: voterName }) : t('promo.voteSaved')}
      </h2>

      <p style={{ fontSize: 15, color: 'var(--label2)', margin: '0 0 32px', lineHeight: 1.55, maxWidth: 300 }}>
        {orgName
          ? t('promo.memberOf', { team: orgName })
          : t('promo.thanks')}
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '-12px 0 28px' }}>
        <MascotTalk situations={['voted']} seed={String(matchId)} />
      </div>

      {/* Promo card */}
      <div style={{
        background: 'var(--bg2)', borderRadius: 20,
        padding: '24px 20px', maxWidth: 340, width: '100%',
        border: '1px solid rgba(255,215,0,0.2)',
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⭐🍋</div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--label)', margin: '0 0 8px' }}>
          {orgName ? t('promo.joinTitle', { team: orgName }) : t('promo.likedTitle')}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--label3)', margin: '0 0 20px', lineHeight: 1.6 }}>
          {orgName
            ? t('promo.joinText')
            : t('promo.createText')}
        </p>
        <button
          className="btn btn-primary btn-full"
          onClick={handleCreateAccount}
          style={{ fontWeight: 700, fontSize: 15 }}
        >
          {orgName ? t('promo.join', { team: orgName }) : t('promo.createTeam')}
        </button>
      </div>

      {canSeeResults && (
        <button
          className="btn btn-secondary"
          onClick={() => { track(EVENTS.PROMO_RESULTS_CLICKED); navigate('/results'); }}
          style={{ fontSize: 14 }}
        >
          {t('promo.seeResults')}
        </button>
      )}
    </div>
  );
}
