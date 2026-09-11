import { useState } from 'react';
import { DEMO_MODE } from '@/api';
import { memberEmailSchema } from '@/schemas';
import { humanizeError } from '@/utils/errors';
import { useOrgMembers, useSeasonNames } from '@/hooks/queries';
import { useAddMember, useRemoveMember, useAdvanceSeason, useSetSeasonName } from '@/hooks/mutations';
import type { Org } from '@/types';
import { ManageSubscriptionButton } from './ManageSubscriptionButton';
import { sectionLabelStyle, type ConfirmFn, type Notify } from './shared';

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
      <p style={sectionLabelStyle}>Compte · {currentOrg?.name || 'Mon équipe'}</p>
      {currentOrg?.slug && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 4 }}>
            Lien de vote à partager avec ton équipe
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
            Copier le lien
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
            Stats de saison, historique de matchs et tendances par joueur — dès 12,99 €/an.
          </p>
          <button
            className="btn btn-full"
            style={{
              background: 'var(--gold-fill)', color: '#000', border: 'none',
              borderRadius: 'var(--radius-sm)', padding: '11px',
              fontSize: 13, fontWeight: 800, cursor: 'pointer',
            }}
            onClick={onUpgrade}
          >
            Passer Pro →
          </button>
        </div>
      )}
      <button className="btn btn-secondary btn-full" style={{ fontSize: 13 }} onClick={onShowGuide}>
        📖 Comment ça marche
      </button>
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
      onSuccess: () => { setEditingSeason(false); notify('Nom de saison sauvegardé !'); },
      onError: (err) => notify(humanizeError(err)),
    });
  };

  const advanceSeason = async () => {
    const label = seasonName ? `"${seasonName}"` : `Saison ${currentSeason}`;
    if (!(await confirm({
      message: `Démarrer la saison ${currentSeason + 1} ? L'historique de ${label} est conservé.`,
      confirmLabel: 'Démarrer',
    }))) return;
    advanceSeasonMutation.mutate(undefined, {
      onSuccess: (next) => { setSeasonNameDraft(''); notify(`Saison ${next} démarrée !`); },
      onError: (err) => notify(humanizeError(err)),
    });
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={sectionLabelStyle}>Saison</p>
      <div className="group">
        <div className="row">
          <div className="row-body">
            <div className="row-title">{seasonName || `Saison ${currentSeason}`}</div>
            <div className="row-sub">Saison {currentSeason} · en cours</div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}
            onClick={() => { setSeasonNameDraft(seasonName); setEditingSeason(v => !v); }}>
            {editingSeason ? 'Annuler' : 'Renommer'}
          </button>
        </div>
        {editingSeason && (
          <div style={{ padding: '0 16px 14px' }}>
            <input
              aria-label="Nom de la saison"
              placeholder={`ex : Hiver 2025, Saison ${currentSeason}…`}
              value={seasonNameDraft}
              onChange={e => setSeasonNameDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveSeasonName()}
              style={{ marginBottom: 8 }}
              autoFocus
            />
            <button className="btn btn-primary btn-full"
              disabled={!seasonNameDraft.trim()}
              onClick={saveSeasonName}>
              Sauvegarder le nom
            </button>
          </div>
        )}
        <div style={{ padding: '0 16px 14px' }}>
          <button className="btn btn-secondary btn-full" onClick={() => void advanceSeason()}>
            Démarrer la saison {currentSeason + 1}
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
      onSuccess: () => { setMemberEmail(''); notify(`${email} ajouté comme votant`); },
      onError: (err) => notify(humanizeError(err)),
    });
  };

  // Co-admin (F6): lets an admin hand over the team before leaving or deleting
  // their account. add_org_member upserts the role of an existing member.
  const handlePromoteMember = async (email: string) => {
    if (!(await confirm({
      message: `Nommer ${email} administrateur ? Il pourra gérer les matchs, l'effectif et les membres.`,
      confirmLabel: 'Nommer admin',
    }))) return;
    addMemberMutation.mutate({ email, role: 'admin' }, {
      onSuccess: () => notify(`${email} est maintenant admin`),
      onError: (err) => notify(humanizeError(err)),
    });
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!(await confirm({ message: `Retirer ${email} ?`, confirmLabel: 'Retirer', danger: true }))) return;
    removeMemberMutation.mutate(userId, {
      onSuccess: () => notify(`${email} retiré`),
      onError: (err) => notify(humanizeError(err)),
    });
  };

  return (
    <div>
      <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>Membres</p>
      <p style={{ fontSize: 12, color: 'var(--label4)', marginBottom: 10 }}>
        Invite des joueurs à voter avec leur compte. Ils auront accès en mode votant uniquement.
      </p>
      {members.length > 0 && (
        <div className="group" style={{ marginBottom: 12 }}>
          {members.map((m, i) => (
            <div key={m.user_id}>
              {i > 0 && <div style={{ height: 1, background: 'var(--separator)', margin: '0 16px' }} />}
              <div className="row">
                <div className="row-body">
                  <div className="row-title">{m.email}</div>
                  <div className="row-sub" style={{ color: m.role === 'admin' ? 'var(--gold)' : 'var(--lemon)' }}>
                    {m.role === 'admin' ? 'Admin' : 'Votant'}
                  </div>
                </div>
                {m.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}
                      disabled={addMemberMutation.isPending}
                      onClick={() => void handlePromoteMember(m.email)}>
                      Nommer admin
                    </button>
                    <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 13 }}
                      onClick={() => void handleRemoveMember(m.user_id, m.email)}>
                      Retirer
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
          aria-label="Email du votant"
          placeholder="Email du votant"
          value={memberEmail}
          type="email"
          onChange={e => { setMemberEmail(e.target.value); setMemberError(null); }}
          onKeyDown={e => e.key === 'Enter' && handleAddMember()}
          style={{ borderColor: memberError ? 'var(--red)' : undefined }}
        />
        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '12px 16px' }}
          disabled={addMemberMutation.isPending}
          onClick={handleAddMember}>
          {addMemberMutation.isPending ? '…' : 'Inviter'}
        </button>
      </div>
      {memberError && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{memberError}</p>}
    </div>
  );
}
