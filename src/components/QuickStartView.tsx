import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, setCurrentOrgId } from '@/api';
import { runQuickStart, type QuickStartProgress, type QuickStartStep } from '@/lib/quickStart';
import { useAppStore } from '@/store/appStore';
import { humanizeError } from '@/utils/errors';
import { parsePlayerNames } from '@/utils/player';
import { saveVoterIdentity } from '@/utils/vote';
import { sendWelcomeEmail } from '@/hooks/mutations';
import { parseUpgradePlan, saveUpgradeIntent } from '@/utils/signupIntent';
import { track, EVENTS } from '@/utils/analytics';
import {
  QUICK_START_MIN_PLAYERS, clearQuickStartDraft, quickStartPepiteCount, readQuickStartDraft,
  saveQuickStartDraft, validateQuickStart, type QuickStartField, type QuickStartForm,
} from '@/utils/quickStart';
import type { Org } from '@/types';

const STEP_LABELS: Record<QuickStartStep, string> = {
  account: 'Création du compte…',
  team:    "Création de l'équipe…",
  players: 'Ajout des joueurs…',
  match:   'Ouverture du vote…',
};

const labelStyle: CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 6,
};
const linkStyle: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  color: 'var(--label3)', textDecoration: 'underline', textUnderlineOffset: 2,
};

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{msg}</p> : null;

interface QuickStartViewProps {
  /** Shown to a signed-in user with no team yet, instead of "Se connecter". */
  onSignOut?: () => void;
}

/**
 * /start — the whole setup on one screen, for the organiser who discovers the
 * app at the end of a match: team name, players, account, and the vote opens.
 * Everything else (line-ups, members, seasons) comes later.
 *
 * The only way to create a team: a signed-in user (no team yet, back from
 * confirming their email, or adding another team) skips the account fields.
 */
export function QuickStartView({ onSignOut }: QuickStartViewProps = {}) {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient    = useQueryClient();

  const session = useAppStore(s => s.session);
  const myOrgs  = useAppStore(s => s.myOrgs);
  // Read once: signup sets the session mid-flow, the form must not change then.
  const [signedIn] = useState(() => !!session);

  // Back from confirming their email, or after a failed attempt: filled in again.
  const [draft] = useState(readQuickStartDraft);
  const [form,    setForm]    = useState<QuickStartForm>({
    teamName: draft?.teamName ?? '', playersText: draft?.playersText ?? '', email: '', password: '',
  });
  const [meName,  setMeName]  = useState<string | null>(draft?.meName ?? null);
  const [errors,  setErrors]  = useState<Partial<Record<QuickStartField, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [step,    setStep]    = useState<QuickStartStep | null>(null);

  // What earlier attempts already created: a retry resumes there.
  const progress  = useRef<QuickStartProgress>({});
  const startedAt = useRef(Date.now());
  const signupTracked = useRef(false);

  const setQuickStartActive = useAppStore(s => s.setQuickStartActive);
  const setCurrentOrg       = useAppStore(s => s.setCurrentOrg);
  const setMyOrgs           = useAppStore(s => s.setMyOrgs);
  const setOrgsResolved     = useAppStore(s => s.setOrgsResolved);
  const setOrgsLoadError    = useAppStore(s => s.setOrgsLoadError);
  const clearLinkOrg        = useAppStore(s => s.clearLinkOrg);
  const setLastMatchId      = useAppStore(s => s.setLastMatchId);

  // "Passer Pro" on the landing: offer the upgrade once the team exists (App).
  useEffect(() => {
    const plan = parseUpgradePlan(searchParams.get('plan'));
    if (plan) saveUpgradeIntent(plan);
  }, [searchParams]);

  const names = parsePlayerNames(form.playersText, []).toAdd;
  const pepiteCount = quickStartPepiteCount(names.length);
  // The picked name disappears if the organiser edits it out of the list.
  const me = meName && names.includes(meName) ? meName : null;

  const update = (field: QuickStartField, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
    setApiError(null);
  };

  const finish = (org: Org) => {
    const orgWithRole: Org = { ...org, role: 'admin' };
    // Their other teams stay in the switcher (a second team made from Profil).
    const others = useAppStore.getState().myOrgs.filter(o => o.id !== org.id);
    clearLinkOrg();
    setCurrentOrgId(org.id);
    setCurrentOrg(orgWithRole);
    setMyOrgs([...others, orgWithRole]);
    setLastMatchId(null);
    setOrgsResolved(true);
    setOrgsLoadError(false);
    clearQuickStartDraft();
    // No guide modal and no "first match" checklist step: they just did it.
    localStorage.setItem(`pepite_onboarded_${org.id}`, '1');
    localStorage.setItem(`pepite_match_launched_${org.id}`, '1');
    // Whatever was cached belongs to the previous team (or to nobody).
    queryClient.clear();
    setQuickStartActive(false);
    navigate('/admin', { replace: true, state: { firstVote: true } });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step) return;
    const { errors: found, names: validNames } = validateQuickStart(form, { needsAccount: !signedIn });
    setErrors(found);
    if (Object.keys(found).length) return;
    saveQuickStartDraft({ teamName: form.teamName, playersText: form.playersText, meName: me });

    setApiError(null);
    // From here App keeps this screen mounted, whatever signup does to the session.
    setQuickStartActive(true);
    let current: QuickStartStep = 'account';
    try {
      const { org, players } = await runQuickStart(
        api,
        { email: form.email.trim(), password: form.password, teamName: form.teamName, names: validNames, meName: me },
        progress.current,
        s => {
          current = s;
          setStep(s);
          if (s === 'team' && !signedIn && !signupTracked.current) { signupTracked.current = true; track(EVENTS.AUTH_SIGNUP); }
        },
      );
      // Same funnel events as the step-by-step setup, then the quick-start one.
      track(EVENTS.ORG_CREATED);
      track(EVENTS.MATCH_CREATED, { playerCount: players.length, pepiteCount: quickStartPepiteCount(players.length), voteDuration: 0 });
      track(EVENTS.FIRST_VOTE_LAUNCHED, {
        players:     players.length,
        pepiteCount: quickStartPepiteCount(players.length),
        me:          !!me,
        seconds:     Math.round((Date.now() - startedAt.current) / 1000),
      });
      // "Voter moi aussi" then opens straight on the organiser's ballot.
      const mePlayer = me ? players.find(p => p.name === me) : undefined;
      if (mePlayer) saveVoterIdentity(mePlayer.name, mePlayer.id);
      void sendWelcomeEmail(org.id);
      finish(org);
    } catch (err) {
      track(EVENTS.QUICK_START_FAILED, { step: current });
      setApiError(humanizeError(err));
      setStep(null);
      // Before the account exists, nothing holds the user here: let App show
      // the screen normally again (the session gate puts them back on it).
      if (!progress.current.signedUp) setQuickStartActive(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '32px 16px 24px', background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div className="header-logo" style={{ fontSize: 26 }}>
          <span className="header-pepite">Pépite</span>
          <span className="header-amp"> & </span>
          <span className="header-citron">Citron</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--label)', marginTop: 14, letterSpacing: '-0.02em' }}>
          Lance ton premier vote
        </h1>
        <p style={{ fontSize: 13, color: 'var(--label3)', marginTop: 4 }}>
          Une minute, puis toute l'équipe vote depuis son téléphone.
        </p>
      </div>

      <form onSubmit={e => void submit(e)} noValidate style={{
        width: '100%', maxWidth: 400, background: 'var(--bg2)', borderRadius: 'var(--radius-lg)',
        padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div>
          <label htmlFor="qs-team" style={labelStyle}>Nom de l'équipe</label>
          <input id="qs-team" placeholder="ex : FC Les Lions" value={form.teamName} disabled={!!step}
            onChange={e => update('teamName', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.teamName ? 'var(--red)' : undefined }} />
          <FieldError msg={errors.teamName} />
        </div>

        <div>
          <label htmlFor="qs-players" style={labelStyle}>Les joueurs</label>
          <textarea id="qs-players" rows={6} value={form.playersText} disabled={!!step}
            placeholder={'Un prénom par ligne, ou colle la liste du groupe\nAntoine\nBaptiste\nClément'}
            onChange={e => update('playersText', e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontSize: 15,
              background: 'var(--bg3)', color: 'var(--label)', border: '1px solid transparent',
              borderColor: errors.playersText ? 'var(--red)' : 'transparent',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px', outline: 'none',
            }} />
          <p aria-live="polite" style={{ fontSize: 12, color: 'var(--label3)', marginTop: 4 }}>
            {names.length === 0
              ? `Au moins ${QUICK_START_MIN_PLAYERS} joueurs. Tu pourras en ajouter plus tard.`
              : names.length < QUICK_START_MIN_PLAYERS
                ? `${names.length} joueur${names.length > 1 ? 's' : ''} · encore ${QUICK_START_MIN_PLAYERS - names.length} pour lancer un vote`
                : `${names.length} joueurs · vote à ${pepiteCount} pépites + 1 citron`}
          </p>
          <FieldError msg={errors.playersText} />
        </div>

        {names.length > 0 && (
          <div>
            <p id="qs-me-label" style={labelStyle}>Et toi, c'est lequel ? <span style={{ fontWeight: 400 }}>(pour voter aussi)</span></p>
            <div role="group" aria-labelledby="qs-me-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {names.map(n => (
                <button key={n} type="button" aria-pressed={me === n} disabled={!!step}
                  onClick={() => setMeName(me === n ? null : n)}
                  className={`tag ${me === n ? 'tag-gold' : 'tag-dim'}`} style={{ fontSize: 13, padding: '6px 10px', border: 'none' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {!signedIn && <>
        <div style={{ height: 1, background: 'var(--separator)', margin: '4px 0' }} />
        <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: -4 }}>
          Ton compte organisateur, pour gérer l'équipe et dévoiler les résultats.
          Les joueurs, eux, votent sans compte.
        </p>

        <div>
          <label htmlFor="qs-email" style={labelStyle}>Adresse email</label>
          <input id="qs-email" type="email" autoComplete="email" placeholder="toi@exemple.com"
            value={form.email} disabled={!!step} onChange={e => update('email', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.email ? 'var(--red)' : undefined }} />
          <FieldError msg={errors.email} />
        </div>

        <div>
          <label htmlFor="qs-password" style={labelStyle}>Mot de passe</label>
          <input id="qs-password" type="password" autoComplete="new-password" placeholder="8 caractères minimum"
            value={form.password} disabled={!!step} onChange={e => update('password', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.password ? 'var(--red)' : undefined }} />
          <FieldError msg={errors.password} />
        </div>
        </>}

        {apiError && (
          <div role="alert" style={{
            background: 'rgba(255,80,80,.12)', border: '1px solid rgba(255,80,80,.3)',
            borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 13, color: 'var(--red)',
          }}>
            {apiError}
            {progress.current.signedUp && (
              <div style={{ marginTop: 4 }}>
                {signedIn ? 'Réessaie' : 'Ton compte est créé : réessaie'}, on reprend où ça s'est arrêté.
              </div>
            )}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={!!step} style={{ fontSize: 16, fontWeight: 800, padding: '14px' }}>
          {step ? STEP_LABELS[step]
            : names.length >= QUICK_START_MIN_PLAYERS ? `Lancer le vote · ${names.length} joueurs` : 'Lancer le vote'}
        </button>
      </form>

      <div style={{ marginTop: 20, textAlign: 'center', maxWidth: 360, fontSize: 13, color: 'var(--label3)' }}>
        {!signedIn ? (
          <p>
            Déjà un compte ?{' '}
            <button type="button" style={linkStyle} onClick={() => navigate('/login')}>Se connecter</button>
          </p>
        ) : myOrgs.length > 0 ? (
          <button type="button" style={linkStyle} disabled={!!step} onClick={() => navigate('/profile')}>← Retour</button>
        ) : (
          <p>
            Connecté avec {session?.user?.email}
            {onSignOut && <>
              {' · '}
              <button type="button" style={linkStyle} disabled={!!step} onClick={onSignOut}>Se déconnecter</button>
            </>}
          </p>
        )}
        {!signedIn && (
        <p style={{ marginTop: 12, fontSize: 11, color: 'var(--label4)', lineHeight: 1.6 }}>
          En créant un compte, tu acceptes nos{' '}
          <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--label3)', textDecoration: 'underline' }}>CGU</a>
          {' '}et notre{' '}
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--label3)', textDecoration: 'underline' }}>politique de confidentialité</a>.
        </p>
        )}
      </div>
    </div>
  );
}
