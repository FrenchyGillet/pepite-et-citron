import { useAppStore } from '@/store/appStore';
import { useOrg } from '@/hooks/useOrg';
import { useJoinOrg } from '@/hooks/mutations';
import { humanizeError } from '@/utils/errors';
import { track, EVENTS } from '@/utils/analytics';
import { useT } from '@/i18n';

/**
 * Shown to a signed-in user who opened the vote link of a team other than
 * their usual one: says which team they are voting for, and how to go back.
 */
export function LinkOrgBanner() {
  const t = useT();
  const session    = useAppStore(s => s.session);
  const linkOrg    = useAppStore(s => s.linkOrg);
  const usualOrg   = useAppStore(s => s.usualOrg);
  const currentOrg = useAppStore(s => s.currentOrg);
  const { switchOrg } = useOrg();

  if (!session || !linkOrg || !usualOrg || currentOrg?.id !== linkOrg.id) return null;

  const leave = () => {
    track(EVENTS.LINK_ORG_LEFT);
    // An invite link belongs to the team being left.
    useAppStore.setState({ guestToken: null, guestName: null, guestStatus: null, isVoterSession: false });
    switchOrg(usualOrg);
  };

  return (
    <div className="content" style={{ paddingBottom: 0 }}>
      <div role="status" style={{
        display: 'flex', alignItems: 'center', gap: 12, marginTop: 8,
        background: 'var(--bg2)', border: '1px solid var(--separator)',
        borderRadius: 'var(--radius-lg)', padding: '12px 14px',
      }}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>🔀</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--label)' }}>
            {t('linkOrg.votingFor', { team: currentOrg.name || t('linkOrg.anotherTeam') })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>
            {t('linkOrg.notUsual', { team: usualOrg.name })}
          </div>
        </div>
        <button className="btn btn-secondary" onClick={leave}
          style={{ fontSize: 13, padding: '8px 12px', minHeight: 44, flexShrink: 0 }}>
          {t('linkOrg.backTo', { team: usualOrg.name })}
        </button>
      </div>
    </div>
  );
}

/**
 * After the vote: a signed-in user who voted through the link of a team they
 * are not a member of can add it to their teams. Never automatic.
 */
export function JoinLinkOrgOffer() {
  const t = useT();
  const session    = useAppStore(s => s.session);
  const linkOrg    = useAppStore(s => s.linkOrg);
  const currentOrg = useAppStore(s => s.currentOrg);
  const myOrgs     = useAppStore(s => s.myOrgs);
  const guestName  = useAppStore(s => s.guestName);
  const join       = useJoinOrg();

  if (!session || !linkOrg || !currentOrg?.name || currentOrg.id !== linkOrg.id || guestName) return null;

  const isMember = myOrgs.some(o => o.id === currentOrg.id);
  if (isMember) {
    return join.isSuccess ? (
      <p role="status" style={{ textAlign: 'center', fontSize: 14, color: 'var(--green)', margin: '0 24px' }}>
        {t('linkOrg.joined', { team: currentOrg.name })}
      </p>
    ) : null;
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 24px' }}>
      <button className="btn btn-secondary" disabled={join.isPending}
        onClick={() => join.mutate(currentOrg.id, { onSuccess: () => track(EVENTS.LINK_ORG_JOINED) })}>
        {join.isPending ? t('linkOrg.adding') : t('linkOrg.add', { team: currentOrg.name })}
      </button>
      {join.isError && (
        <p role="alert" style={{ fontSize: 13, color: 'var(--red)', marginTop: 8 }}>
          ⚠️ {humanizeError(join.error)}
        </p>
      )}
    </div>
  );
}
