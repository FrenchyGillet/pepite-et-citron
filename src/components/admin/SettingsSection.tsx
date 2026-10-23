import { useState } from 'react';
import { DEMO_MODE } from '@/api';
import { memberEmailSchema } from '@/schemas';
import { humanizeError } from '@/utils/errors';
import { track, EVENTS } from '@/utils/analytics';
import { useOrgMembers, useSeasonNames, useVoteOpenDelay } from '@/hooks/queries';
import { useAddMember, useRemoveMember, useAdvanceSeason, useSetSeasonName, useSetVoteOpenDelay } from '@/hooks/mutations';
import { DEFAULT_VOTE_OPEN_DELAY, VOTE_OPEN_DELAYS, formatDelay } from '@/utils/schedule';
import { roleLabel } from '@/utils/roles';
import type { Org, OrgMember } from '@/types';
import { ManageSubscriptionButton } from './ManageSubscriptionButton';
import { sectionLabelStyle, type ConfirmFn, type Notify } from './shared';
import { t } from '@/i18n';

interface SettingsSectionProps {
  currentOrg: Org | null;
  currentSeason: number;
  notify: Notify;
  confirm: ConfirmFn;
  onCopyOrgLink: () => void;
  onShowGuide: () => void;
  onUpgrade?: () => void;
}

/** "Paramètres": account & subscription, season, members. */
export function SettingsSection({ currentOrg, currentSeason, notify, confirm, onCopyOrgLink, onShowGuide, onUpgrade }: SettingsSectionProps) {
  return (
    <>
      {!DEMO_MODE && (
        <AccountSettings currentOrg={currentOrg} onCopyOrgLink={onCopyOrgLink} onShowGuide={onShowGuide} onUpgrade={onUpgrade} />
      )}
      <SeasonSettings currentSeason={currentSeason} notify={notify} confirm={confirm} orgId={currentOrg?.id} />
      <ScheduleSettings orgId={currentOrg?.id} notify={notify} />
      {!DEMO_MODE && currentOrg?.id && (
        <MemberSettings orgId={currentOrg.id} notify={notify} confirm={confirm} />
      )}
    </>
  );
}

// ── Compte ────────────────────────────────────────────────────────────────────
function AccountSettings({ currentOrg, onCopyOrgLink, onShowGuide, onUpgrade }: Pick<SettingsSectionProps, 'currentOrg' | 'onCopyOrgLink' | 'onShowGuide' | 'onUpgrade'>) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={sectionLabelStyle}>{t('settings.account', { team: currentOrg?.name || t('settings.myTeam') })}</p>
      {currentOrg?.slug && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 4 }}>
            {t('settings.voteLink')}
          </p>
          <div style={{
            background: 'var(--bg3)', borderRadius: 'var(--radius-sm)',
            padding: '10px 12px', fontSize: 12, color: 'var(--label2)',
            wordBreak: 'break-all',
          }}>
            {window.location.origin}/vote?org={currentOrg.slug}
          </div>
          <button className="btn btn-secondary btn-full" style={{ marginTop: 8, fontSize: 13 }}
            onClick={onCopyOrgLink}>
            {t('settings.copyLink')}
          </button>
        </div>
      )}
      {currentOrg?.plan === 'pro' ? (
        <ManageSubscriptionButton orgId={currentOrg.id} />
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,215,0,0.04) 100%)',
          border: '1px solid var(--gold-dim)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>⭐</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.02em' }}>
              Pépite &amp; Citron Pro
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--label2)', lineHeight: 1.5, marginBottom: 12 }}>
            {t('settings.proPitch')}
          </p>
          <button
            className="btn btn-full"
            style={{
              background: 'var(--gold-fill)', color: '#000', border: 'none',
              borderRadius: 'var(--radius-sm)', padding: '11px',
              fontSize: 13, fontWeight: 800, cursor: 'pointer',
            }}
            onClick={() => { track(EVENTS.UPGRADE_CLICKED, { source: 'settings' }); onUpgrade?.(); }}
          >
            {t('settings.goPro')}
          </button>
        </div>
      )}
      <button className="btn btn-secondary btn-full" style={{ fontSize: 13 }} onClick={onShowGuide}>
        {t('settings.howItWorks')}
      </button>
    </div>
  );
}

// ── Matchs programmés ─────────────────────────────────────────────────────────
function ScheduleSettings({ orgId, notify }: { orgId?: string; notify: Notify }) {
  const { data: delay } = useVoteOpenDelay(orgId);
  const setDelay = useSetVoteOpenDelay(orgId);
  const current = delay ?? DEFAULT_VOTE_OPEN_DELAY;
  const choices = VOTE_OPEN_DELAYS.includes(current) ? VOTE_OPEN_DELAYS : [...VOTE_OPEN_DELAYS, current].sort((a, b) => a - b);
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={sectionLabelStyle}>{t('schedule.settingsTitle')}</p>
      <div className="group">
        <div className="row">
          <label htmlFor="settings-vote-delay" className="row-body">
            <div className="row-title" style={{ fontSize: 14 }}>{t('schedule.settingsDelay')}</div>
          </label>
          <select id="settings-vote-delay" value={current} disabled={setDelay.isPending}
            onChange={e => setDelay.mutate(Number(e.target.value), {
              onSuccess: () => notify(t('schedule.delaySaved')),
              onError: (err) => notify(humanizeError(err)),
            })}
            style={{ width: 'auto', fontSize: 14, padding: '6px 8px' }}>
            {choices.map(m => <option key={m} value={m}>{formatDelay(m)}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Saison ────────────────────────────────────────────────────────────────────
function SeasonSettings({ currentSeason, orgId, notify, confirm }: { currentSeason: number; orgId?: string; notify: Notify; confirm: ConfirmFn }) {
  const [seasonNameDraft, setSeasonNameDraft] = useState('');
  const [editingSeason,   setEditingSeason]   = useState(false);

  const seasonNamesMap        = useSeasonNames([currentSeason]);
  const seasonName            = seasonNamesMap[currentSeason] ?? '';
  const advanceSeasonMutation = useAdvanceSeason(orgId);
  const setSeasonNameMutation = useSetSeasonName();

  const saveSeasonName = () => {
    setSeasonNameMutation.mutate({ season: currentSeason, name: seasonNameDraft.trim() }, {
      onSuccess: () => { setEditingSeason(false); notify(t('settings.seasonNameSaved')); },
      onError: (err) => notify(humanizeError(err)),
    });
  };

  const advanceSeason = async () => {
    const label = seasonName ? `"${seasonName}"` : t('settings.seasonN', { n: currentSeason });
    if (!(await confirm({
      message: t('settings.startSeasonConfirm', { next: currentSeason + 1, label }),
      confirmLabel: t('settings.start'),
    }))) return;
    advanceSeasonMutation.mutate(undefined, {
      onSuccess: (next) => {
        track(EVENTS.SEASON_ADVANCED, { season: next });
        setSeasonNameDraft(''); notify(t('settings.seasonStarted', { n: next }));
      },
      onError: (err) => notify(humanizeError(err)),
    });
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={sectionLabelStyle}>{t('settings.season')}</p>
      <div className="group">
        <div className="row">
          <div className="row-body">
            <div className="row-title">{seasonName || t('settings.seasonN', { n: currentSeason })}</div>
            <div className="row-sub">{t('settings.current', { n: currentSeason })}</div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}
            onClick={() => { setSeasonNameDraft(seasonName); setEditingSeason(v => !v); }}>
            {editingSeason ? t('common.cancel') : t('settings.rename')}
          </button>
        </div>
        {editingSeason && (
          <div style={{ padding: '0 16px 14px' }}>
            <input
              aria-label={t('settings.seasonName')}
              placeholder={t('settings.seasonPlaceholder', { n: currentSeason })}
              value={seasonNameDraft}
              onChange={e => setSeasonNameDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveSeasonName()}
              style={{ marginBottom: 8 }}
              autoFocus
            />
            <button className="btn btn-primary btn-full"
              disabled={!seasonNameDraft.trim()}
              onClick={saveSeasonName}>
              {t('settings.saveName')}
            </button>
          </div>
        )}
        <div style={{ padding: '0 16px 14px' }}>
          <button className="btn btn-secondary btn-full" onClick={() => void advanceSeason()}>
            {t('settings.startNext', { n: currentSeason + 1 })}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Membres ───────────────────────────────────────────────────────────────────
function MemberSettings({ orgId, notify, confirm }: { orgId: string; notify: Notify; confirm: ConfirmFn }) {
  const [memberEmail, setMemberEmail] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);

  const { data: members = [] } = useOrgMembers(orgId);
  const addMemberMutation    = useAddMember(orgId);
  const removeMemberMutation = useRemoveMember(orgId);

  const handleAddMember = () => {
    const result = memberEmailSchema.safeParse({ email: memberEmail });
    if (!result.success) { setMemberError(result.error.issues[0].message); return; }
    setMemberError(null);
    const { email } = result.data;
    addMemberMutation.mutate({ email, role: 'voter' }, {
      onSuccess: () => {
        track(EVENTS.MEMBER_ADDED, { role: 'voter' });
        setMemberEmail(''); notify(t('settings.memberAdded', { email }));
      },
      onError: (err) => notify(humanizeError(err)),
    });
  };

  // Co-admin (F6): lets an admin hand over the team before leaving or deleting
  // their account. add_org_member upserts the role of an existing member.
  const handlePromoteMember = async (email: string) => {
    if (!(await confirm({
      message: t('settings.promoteConfirm', { email }),
      confirmLabel: t('settings.makeAdmin'),
    }))) return;
    addMemberMutation.mutate({ email, role: 'admin' }, {
      onSuccess: () => { track(EVENTS.MEMBER_PROMOTED); notify(t('settings.nowAdmin', { email })); },
      onError: (err) => notify(humanizeError(err)),
    });
  };

  // Captain: runs the vote when the admin is away (open, reveal, close, guest
  // links, missing results) without roster, members or billing rights.
  const handleSetCaptain = async (member: OrgMember, captain: boolean) => {
    if (captain && !(await confirm({
      message: t('settings.captainConfirm', { email: member.email }),
      confirmLabel: t('settings.makeCaptain'),
    }))) return;
    addMemberMutation.mutate({ email: member.email, role: captain ? 'captain' : 'voter' }, {
      onSuccess: () => {
        track(captain ? EVENTS.CAPTAIN_APPOINTED : EVENTS.CAPTAIN_REMOVED);
        notify(t(captain ? 'settings.nowCaptain' : 'settings.noLongerCaptain', { email: member.email }));
      },
      onError: (err) => notify(humanizeError(err)),
    });
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!(await confirm({ message: t('settings.removeConfirm', { email }), confirmLabel: t('settings.remove'), danger: true }))) return;
    removeMemberMutation.mutate(userId, {
      onSuccess: () => notify(t('settings.removed', { email })),
      onError: (err) => notify(humanizeError(err)),
    });
  };

  return (
    <div>
      <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>{t('settings.members')}</p>
      <p style={{ fontSize: 12, color: 'var(--label4)', marginBottom: 10 }}>
        {t('settings.membersIntro')}{' '}
        {t('settings.captainIntro')}
      </p>
      {members.length > 0 && (
        <div className="group" style={{ marginBottom: 12 }}>
          {members.map((m, i) => (
            <div key={m.user_id}>
              {i > 0 && <div style={{ height: 1, background: 'var(--separator)', margin: '0 16px' }} />}
              <div className="row" style={{ flexWrap: 'wrap', rowGap: 8 }}>
                <div className="row-body">
                  <div className="row-title">{m.email}</div>
                  <div className="row-sub" style={{ color: m.role === 'voter' ? 'var(--lemon)' : 'var(--gold)' }}>
                    {roleLabel(m.role)}
                  </div>
                </div>
                {m.role !== 'admin' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}
                      disabled={addMemberMutation.isPending}
                      onClick={() => void handleSetCaptain(m, m.role !== 'captain')}>
                      {t(m.role === 'captain' ? 'settings.removeCaptain' : 'settings.makeCaptain')}
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}
                      disabled={addMemberMutation.isPending}
                      onClick={() => void handlePromoteMember(m.email)}>
                      {t('settings.makeAdmin')}
                    </button>
                    <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 13 }}
                      onClick={() => void handleRemoveMember(m.user_id, m.email)}>
                      {t('settings.remove')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-8" style={{ marginBottom: memberError ? 4 : 0 }}>
        <input
          aria-label={t('settings.voterEmail')}
          placeholder={t('settings.voterEmail')}
          value={memberEmail}
          type="email"
          onChange={e => { setMemberEmail(e.target.value); setMemberError(null); }}
          onKeyDown={e => e.key === 'Enter' && handleAddMember()}
          style={{ borderColor: memberError ? 'var(--red)' : undefined }}
        />
        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '12px 16px' }}
          disabled={addMemberMutation.isPending}
          onClick={handleAddMember}>
          {addMemberMutation.isPending ? '…' : t('settings.invite')}
        </button>
      </div>
      {memberError && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{memberError}</p>}
    </div>
  );
}
