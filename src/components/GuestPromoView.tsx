import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { track, EVENTS } from '@/utils/analytics';

interface GuestPromoViewProps {
  /** null = ?org= flow (can browse results), 'valid' = ?guest= token flow */
  canSeeResults: boolean;
  /** Name the voter typed at step 0 */
  voterName?: string | null;
  /** Name of the current org / team */
  orgName?: string | null;
}

export function GuestPromoView({ canSeeResults, voterName, orgName }: GuestPromoViewProps) {
  const navigate          = useNavigate();
  const setIsVoterSession = useAppStore(s => s.setIsVoterSession);
  const setGuestStatus    = useAppStore(s => s.setGuestStatus);
  const setGuestToken     = useAppStore(s => s.setGuestToken);

  function handleCreateAccount() {
    track(EVENTS.PROMO_SIGNUP_CLICKED);
    // Clear voter-session flags so App shows AuthView (sign-up mode)
    setIsVoterSession(false);
    setGuestStatus(null);
    setGuestToken(null);
    navigate('/vote', { replace: true });
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
        {voterName ? `Bien joué, ${voterName} ! 🎉` : 'Vote enregistré ! 🎉'}
      </h2>

      <p style={{ fontSize: 15, color: 'var(--label2)', margin: '0 0 32px', lineHeight: 1.55, maxWidth: 300 }}>
        {orgName
          ? `Tu fais partie de l'équipe ${orgName}. Rejoins l'app pour suivre tes stats et personnaliser ton profil.`
          : 'Merci pour ta participation.'}
      </p>

      {/* Promo card */}
      <div style={{
        background: 'var(--bg2)', borderRadius: 20,
        padding: '24px 20px', maxWidth: 340, width: '100%',
        border: '1px solid rgba(255,215,0,0.2)',
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⭐🍋</div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--label)', margin: '0 0 8px' }}>
          {orgName ? `Rejoins ${orgName} sur l’app` : "Tu as aimé l’expérience ?"}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--label3)', margin: '0 0 20px', lineHeight: 1.6 }}>
          {orgName
            ? 'Crée ton compte gratuit pour retrouver tes stats, choisir un surnom affiché sur le podium, et ne plus jamais rater un vote.'
            : 'Crée ton équipe gratuitement et organise des votes Pépite & Citron après chaque match — en quelques secondes, au bar.'}
        </p>
        <button
          className="btn btn-primary btn-full"
          onClick={handleCreateAccount}
          style={{ fontWeight: 700, fontSize: 15 }}
        >
          {orgName ? `Rejoindre ${orgName}` : 'Créer mon équipe gratuitement'}
        </button>
      </div>

      {canSeeResults && (
        <button
          className="btn btn-secondary"
          onClick={() => { track(EVENTS.PROMO_RESULTS_CLICKED); navigate('/results'); }}
          style={{ fontSize: 14 }}
        >
          Voir les résultats du match
        </button>
      )}
    </div>
  );
}
