import { useState } from 'react';
import { DEMO_MODE } from '../api';
import { Toast } from './Toast';
import { useTeams, useGuestTokens, useOrgMembers, useVotes, useCurrentSeason, useSeasonNames } from '../hooks/queries';
import {
  useAddPlayer, useRemovePlayer,
  useCreateMatch, useCloseMatch, useStartCounting,
  useCreateTeam, useDeleteTeam,
  useCreateGuestToken, useDeleteGuestToken,
  useAddMember, useRemoveMember,
  useAdvanceSeason, useSetSeasonName,
} from '../hooks/mutations';
import type { Player, Match, Org, EntityId } from '../types';

interface AdminViewProps {
  players: Player[];
  activeMatch: Match | null;
  currentOrg: Org | null;
  onSignOut: () => Promise<void>;
  onShowGuide: () => void;
  onGoToResults?: () => void;
}

export function AdminView({ players, activeMatch, currentOrg, onSignOut, onShowGuide, onGoToResults }: AdminViewProps) {
  const [newPlayer,       setNewPlayer]       = useState('');
  const [matchLabel,      setMatchLabel]      = useState('');
  const [presentIds,      setPresentIds]      = useState<EntityId[]>([]);
  const [toast,           setToast]           = useState<string | null>(null);
  const [teamName,        setTeamName]        = useState('');
  const [teamIds,         setTeamIds]         = useState<EntityId[]>([]);
  const [showNewTeam,     setShowNewTeam]     = useState(false);
  const [selectedTeamId,  setSelectedTeamId]  = useState<EntityId | null>(null);
  const [seasonNameDraft, setSeasonNameDraft] = useState('');
  const [editingSeason,   setEditingSeason]   = useState(false);
  const [guestInput,      setGuestInput]      = useState('');
  const [copiedToken,     setCopiedToken]     = useState<string | null>(null);
  const [showAccount,     setShowAccount]     = useState(false);
  const [memberEmail,     setMemberEmail]     = useState('');

  const { data: teams         = [] } = useTeams(currentOrg?.id);
  const { data: guestTokens   = [] } = useGuestTokens(activeMatch?.id);
  const { data: members       = [] } = useOrgMembers(currentOrg?.id);
  const { data: matchVotes    = [] } = useVotes(activeMatch?.id);
  const { data: currentSeason = 1  } = useCurrentSeason(currentOrg?.id);
  const seasonNamesMap               = useSeasonNames([currentSeason]);
  const seasonName                   = seasonNamesMap[currentSeason] ?? '';
  const voteCount                    = matchVotes.length;

  const addPlayerMutation        = useAddPlayer(currentOrg?.id);
  const removePlayerMutation     = useRemovePlayer(currentOrg?.id);
  const createMatchMutation      = useCreateMatch(currentOrg?.id);
  const closeMatchMutation       = useCloseMatch(currentOrg?.id);
  const startCountingMutation    = useStartCounting(currentOrg?.id);
  const createTeamMutation       = useCreateTeam(currentOrg?.id);
  const deleteTeamMutation       = useDeleteTeam(currentOrg?.id);
  const createGuestTokenMutation = useCreateGuestToken(activeMatch?.id);
  const deleteGuestTokenMutation = useDeleteGuestToken(activeMatch?.id);
  const addMemberMutation        = useAddMember(currentOrg?.id);
  const removeMemberMutation     = useRemoveMember(currentOrg?.id);
  const advanceSeasonMutation    = useAdvanceSeason(currentOrg?.id);
  const setSeasonNameMutation    = useSetSeasonName();

  const handleAddMember = () => {
    if (!memberEmail.trim() || !currentOrg?.id) return;
    const email = memberEmail.trim();
    addMemberMutation.mutate({ email, role: 'voter' }, {
      onSuccess: () => { setMemberEmail(''); setToast(`${email} ajouté comme votant`); },
      onError: (err) => setToast(`Erreur : ${err instanceof Error ? err.message : String(err)}`),
    });
  };

  const handleRemoveMember = (userId: string, email: string) => {
    if (!currentOrg?.id || !confirm(`Retirer ${email} ?`)) return;
    removeMemberMutation.mutate(userId, {
      onSuccess: () => setToast(`${email} retiré`),
      onError: (err) => setToast(`Erreur : ${err instanceof Error ? err.message : String(err)}`),
    });
  };

  const createGuestLink = () => {
    if (!guestInput.trim() || !activeMatch) return;
    const name = guestInput.trim();
    createGuestTokenMutation.mutate({ name, id: activeMatch.id }, {
      onSuccess: () => { setGuestInput(''); setToast(`Lien créé pour ${name}`); },
    });
  };

  const copyGuestLink = (token: string) => {
    const url = `${window.location.origin}/?guest=${token}`;
    void navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const revokeGuest = (id: EntityId) => deleteGuestTokenMutation.mutate(id);

  const addPlayer = () => {
    if (!newPlayer.trim()) return;
    const name = newPlayer.trim();
    addPlayerMutation.mutate(name, {
      onSuccess: () => { setToast(`${name} ajouté`); setNewPlayer(''); },
      onError: (err) => { setToast(`Erreur : ${err instanceof Error ? err.message : String(err)}`); console.error('addPlayer:', err); },
    });
  };

  const removePlayer = (id: EntityId, name: string) => {
    if (!confirm(`Supprimer ${name} ?`)) return;
    removePlayerMutation.mutate(id);
  };

  const togglePresent = (id: EntityId) => setPresentIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleTeamId  = (id: EntityId) => setTeamIds(p  => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const loadTeamIntoMatch = (team: { id: EntityId; player_ids: EntityId[] }) => {
    setPresentIds([...team.player_ids]);
    setSelectedTeamId(team.id);
  };

  const saveSeasonName = () => {
    setSeasonNameMutation.mutate({ season: currentSeason, name: seasonNameDraft.trim() }, {
      onSuccess: () => { setEditingSeason(false); setToast('Nom de saison sauvegardé !'); },
      onError: (err) => setToast(`Erreur : ${err instanceof Error ? err.message : String(err)}`),
    });
  };

  const advanceSeason = () => {
    const label = seasonName ? `"${seasonName}"` : `Saison ${currentSeason}`;
    if (!confirm(`Démarrer la saison ${currentSeason + 1} ? L'historique de ${label} est conservé.`)) return;
    advanceSeasonMutation.mutate(undefined, {
      onSuccess: (next) => { setSeasonNameDraft(''); setToast(`Saison ${next} démarrée !`); },
      onError: (err) => setToast(`Erreur : ${err instanceof Error ? err.message : String(err)}`),
    });
  };

  const createMatch = () => {
    if (!matchLabel.trim() || presentIds.length < 2) return;
    createMatchMutation.mutate(
      { label: matchLabel.trim(), presentIds, teamId: selectedTeamId, season: currentSeason },
      {
        onSuccess: () => {
          setMatchLabel(''); setPresentIds([]); setSelectedTeamId(null);
          setToast('Match ouvert !');
        },
      }
    );
  };

  const closeMatch = () => {
    if (!activeMatch || !confirm('Fermer définitivement le vote sans dépouillement ?')) return;
    closeMatchMutation.mutate(activeMatch.id, {
      onSuccess: () => setToast('Vote clôturé'),
    });
  };

  const startCounting = () => {
    if (!activeMatch) return;
    const shuffled = [...matchVotes]
      .sort(() => Math.random() - 0.5)
      .map(v => v.id)
      .filter((id): id is EntityId => id != null);
    startCountingMutation.mutate({ id: activeMatch.id, order: shuffled }, {
      onSuccess: () => onGoToResults?.(),
    });
  };

  const saveTeam = () => {
    if (!teamName.trim() || teamIds.length < 2) return;
    createTeamMutation.mutate(
      { name: teamName.trim(), playerIds: teamIds },
      {
        onSuccess: () => { setTeamName(''); setTeamIds([]); setToast('Équipe sauvegardée !'); },
      }
    );
  };

  const deleteTeam = (id: EntityId, name: string) => {
    if (!confirm(`Supprimer l'équipe "${name}" ?`)) return;
    deleteTeamMutation.mutate(id);
  };

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div style={{ marginTop: 28, marginBottom: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--label)', letterSpacing: '-0.02em', marginBottom: 3 }}>
        {title}
      </div>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--label3)' }}>{subtitle}</p>}
    </div>
  );

  return (
    <div className="content">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {!DEMO_MODE && (
        <div style={{ marginBottom: 4 }}>
          <button
            onClick={() => setShowAccount(v => !v)}
            style={{
              width: '100%', background: 'var(--bg2)', border: 'none',
              borderRadius: 'var(--radius-lg)', padding: '13px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', marginBottom: showAccount ? 0 : 4,
              borderBottomLeftRadius: showAccount ? 0 : 'var(--radius-lg)',
              borderBottomRightRadius: showAccount ? 0 : 'var(--radius-lg)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M20 21a8 8 0 10-16 0"/>
              </svg>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>
                  {currentOrg?.name || 'Mon équipe'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--label3)' }}>Compte admin</div>
              </div>
            </div>
            <span style={{ color: 'var(--label4)', fontSize: 11 }}>{showAccount ? '▲' : '▼'}</span>
          </button>
          {showAccount && (
            <div style={{
              background: 'var(--bg2)', borderBottomLeftRadius: 'var(--radius-lg)',
              borderBottomRightRadius: 'var(--radius-lg)', padding: '12px 16px',
              borderTop: '1px solid var(--separator)',
            }}>
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
                    {window.location.origin}/?org={currentOrg.slug}
                  </div>
                  <button className="btn btn-secondary btn-full" style={{ marginTop: 8, fontSize: 13 }}
                    onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/?org=${currentOrg.slug}`); setToast('Lien copié !'); }}>
                    Copier le lien
                  </button>
                </div>
              )}
              <button className="btn btn-secondary btn-full" style={{ fontSize: 13, marginBottom: 8 }} onClick={onShowGuide}>
                📖 Comment ça marche
              </button>
              <button className="btn btn-danger btn-full" style={{ fontSize: 13 }} onClick={onSignOut}>
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      )}

      <SectionHeader title="Match du jour"
        subtitle={activeMatch ? 'Un vote est en cours.' : 'Lance le vote de ce soir en quelques secondes.'} />

      {activeMatch ? (() => {
        const phase = activeMatch.phase || 'voting';
        return (
          <div className="group">
            <div className="row">
              <div className="row-icon green" style={{ position: 'relative' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--green)',
                  animation: 'livePulse 1.8s ease-in-out infinite',
                }} />
              </div>
              <div className="row-body">
                <div className="row-title">{activeMatch.label}</div>
                <div className="row-sub">
                  {phase === 'voting'   && `${voteCount} vote${voteCount !== 1 ? 's' : ''} reçu${voteCount !== 1 ? 's' : ''} sur ${activeMatch.present_ids.length} joueurs`}
                  {phase === 'counting' && `Dépouillement — ${activeMatch.revealed_count || 0}/${(activeMatch.reveal_order || []).length} votes révélés`}
                </div>
              </div>
            </div>
            {phase === 'voting' && (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {currentOrg?.slug && (
                  <div style={{
                    background: 'var(--bg3)', borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--label3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                        🔗 Lien de vote
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--label2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {window.location.origin}/?org={currentOrg.slug}
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}
                      onClick={() => {
                        void navigator.clipboard.writeText(`${window.location.origin}/?org=${currentOrg.slug}`);
                        setToast('Lien copié !');
                      }}>
                      Copier
                    </button>
                  </div>
                )}
                <button className="btn btn-primary btn-full" onClick={startCounting} disabled={startCountingMutation.isPending || voteCount === 0}>
                  {startCountingMutation.isPending ? 'Préparation…' : `Lancer le dépouillement · ${voteCount} vote${voteCount !== 1 ? 's' : ''}`}
                </button>
                <button className="btn btn-danger btn-full" style={{ fontSize: 13 }} onClick={closeMatch}>
                  Clore sans dépouiller
                </button>
              </div>
            )}
            {phase === 'counting' && (
              <div style={{ padding: '12px 16px' }}>
                <p style={{ fontSize: 13, color: 'var(--label3)', textAlign: 'center' }}>
                  Le dépouillement est en cours dans l'onglet Résultats.
                </p>
              </div>
            )}
          </div>
        );
      })() : players.length === 0 ? (
        <div className="group">
          <div className="row">
            <div className="row-body">
              <div className="row-title" style={{ color: 'var(--label3)' }}>Aucun joueur enregistré</div>
              <div className="row-sub">Ajoute d'abord tes joueurs dans la section 3 ci-dessous ↓</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="group" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 8 }}>Nom du match ou de l'adversaire</p>
          <input placeholder="ex : vs Dragons, Entraînement…" value={matchLabel}
            onChange={e => setMatchLabel(e.target.value)} style={{ marginBottom: 16 }} />

          {teams.length > 0 && (
            <>
              <p style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 8 }}>
                Partir d'une équipe sauvegardée
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {teams.map(t => (
                  <button key={String(t.id)} onClick={() => loadTeamIntoMatch(t)} style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600,
                    background: presentIds.length > 0 && t.player_ids.every(id => presentIds.includes(id)) && presentIds.length === t.player_ids.length
                      ? 'var(--gold-dim)' : 'var(--bg3)',
                    color: presentIds.length > 0 && t.player_ids.every(id => presentIds.includes(id)) && presentIds.length === t.player_ids.length
                      ? 'var(--gold)' : 'var(--label2)',
                    border: 'none', cursor: 'pointer',
                  }}>
                    {t.name} · {t.player_ids.length} joueurs
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex-between" style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--label3)' }}>
              Qui est présent ce soir ?
              {presentIds.length > 0 && <span style={{ color: 'var(--label2)', marginLeft: 6 }}>{presentIds.length} sélectionné{presentIds.length > 1 ? 's' : ''}</span>}
            </p>
            <div className="flex gap-8">
              <button className="tag tag-dim" onClick={() => setPresentIds(players.map(p => p.id))}>Tous</button>
              <button className="tag tag-dim" onClick={() => setPresentIds([])}>Aucun</button>
            </div>
          </div>
          <div className="player-grid" style={{ marginBottom: 16 }}>
            {players.map(p => (
              <button key={String(p.id)} className={`player-chip ${presentIds.includes(p.id) ? 'sel-1st' : ''}`}
                onClick={() => togglePresent(p.id)}>{p.name}</button>
            ))}
          </div>
          {presentIds.length < 2 && (
            <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 10 }}>
              Sélectionne au moins 2 joueurs.
            </p>
          )}
          <button className="btn btn-primary btn-full"
            disabled={!matchLabel.trim() || presentIds.length < 2 || createMatchMutation.isPending}
            onClick={createMatch}>
            {createMatchMutation.isPending ? 'Lancement…' : `Lancer le vote · ${presentIds.length} joueurs`}
          </button>
        </div>
      )}

      {activeMatch && (activeMatch.phase || 'voting') === 'voting' && (
        <>
          <div style={{ marginTop: 28, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
              <span style={{ fontSize: 18 }}>🔗</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--label)' }}>Supporters invités</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--label3)', paddingLeft: 28 }}>
              Crée un lien unique par invité pour qu'il puisse voter depuis son téléphone.
            </p>
          </div>
          {guestTokens.length > 0 && (
            <div className="group" style={{ marginBottom: 12 }}>
              {guestTokens.map((gt, i) => (
                <div key={String(gt.id)}>
                  {i > 0 && <div style={{ height: 1, background: 'var(--separator)', margin: '0 16px' }} />}
                  <div className="row">
                    <div className="row-body">
                      <div className="row-title" style={{ color: gt.used ? 'var(--label3)' : 'var(--label)' }}>{gt.name}</div>
                      <div className="row-sub" style={{ color: gt.used ? 'var(--green)' : 'var(--label3)' }}>
                        {gt.used ? '✓ A voté' : 'En attente'}
                      </div>
                    </div>
                    {!gt.used && (
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13, whiteSpace: 'nowrap' }}
                        onClick={() => copyGuestLink(gt.token)}>
                        {copiedToken === gt.token ? 'Copié !' : 'Copier le lien'}
                      </button>
                    )}
                    <button onClick={() => revokeGuest(gt.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--label4)', padding: '4px 8px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-8" style={{ marginBottom: 4 }}>
            <input placeholder="Prénom du supporter" value={guestInput}
              onChange={e => setGuestInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createGuestLink()} />
            <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '12px 16px' }}
              onClick={createGuestLink}>Créer</button>
          </div>
        </>
      )}

      <SectionHeader title="Mes équipes"
        subtitle="Sauvegarde ta liste habituelle pour la recharger en un clic." />
      {teams.length > 0 && (
        <div className="group" style={{ marginBottom: 12 }}>
          {teams.map((t, i) => (
            <div key={String(t.id)}>
              {i > 0 && <div style={{ height: 1, background: 'var(--separator)', margin: '0 16px' }} />}
              <div className="row">
                <div className="row-body">
                  <div className="row-title">{t.name}</div>
                  <div className="row-sub" style={{ marginTop: 3 }}>
                    {players.filter(p => t.player_ids.includes(p.id)).map(p => p.name).join(' · ')}
                  </div>
                </div>
                <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 13 }}
                  onClick={() => deleteTeam(t.id, t.name)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <button className="tag tag-dim" style={{ fontSize: 13, padding: '7px 12px' }}
          onClick={() => setShowNewTeam(v => !v)}>
          {showNewTeam ? '▲ Masquer' : '＋ Créer une équipe'}
        </button>
      </div>
      {showNewTeam && (
        <div className="group" style={{ padding: '14px 16px', marginBottom: 4 }}>
          <p style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 8 }}>Nom de l'équipe</p>
          <input placeholder="ex : Équipe A, Jeudi soir…" value={teamName}
            onChange={e => setTeamName(e.target.value)} style={{ marginBottom: 16 }} />
          <div className="flex-between" style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--label3)' }}>
              Joueurs à inclure
              {teamIds.length > 0 && <span style={{ color: 'var(--label2)', marginLeft: 6 }}>{teamIds.length} sélectionné{teamIds.length > 1 ? 's' : ''}</span>}
            </p>
            <div className="flex gap-8">
              <button className="tag tag-dim" onClick={() => setTeamIds(players.map(p => p.id))}>Tous</button>
              <button className="tag tag-dim" onClick={() => setTeamIds([])}>Aucun</button>
            </div>
          </div>
          <div className="player-grid" style={{ marginBottom: 12 }}>
            {players.map(p => (
              <button key={String(p.id)} className={`player-chip ${teamIds.includes(p.id) ? 'sel-1st' : ''}`}
                onClick={() => toggleTeamId(p.id)}>{p.name}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-full"
            disabled={!teamName.trim() || teamIds.length < 2 || createTeamMutation.isPending}
            onClick={saveTeam}>
            {createTeamMutation.isPending ? 'Sauvegarde…' : `Sauvegarder · ${teamIds.length} joueur${teamIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      <SectionHeader title="Mes joueurs"
        subtitle="La liste complète des joueurs de l'équipe." />
      <div className="flex gap-8" style={{ marginBottom: 12 }}>
        <input placeholder="Prénom du joueur" value={newPlayer}
          onChange={e => setNewPlayer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addPlayer()} />
        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '12px 16px' }}
          onClick={addPlayer}>Ajouter</button>
      </div>
      <div className="group">
        {players.length === 0
          ? <div className="row"><span style={{ color: 'var(--label3)', fontSize: 14 }}>Aucun joueur. Commence par en ajouter un ci-dessus.</span></div>
          : players.map(p => (
            <div key={String(p.id)} className="row">
              <div className="row-body"><div className="row-title">{p.name}</div></div>
              <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 13 }}
                onClick={() => removePlayer(p.id, p.name)}>Retirer</button>
            </div>
          ))
        }
      </div>

      <SectionHeader title="Saison"
        subtitle="Nomme la saison et démarre-en une nouvelle sans perdre l'historique." />
      <div className="group" style={{ marginBottom: 24 }}>
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
          <button className="btn btn-secondary btn-full" onClick={advanceSeason}>
            Démarrer la saison {currentSeason + 1}
          </button>
        </div>
      </div>

      {!DEMO_MODE && currentOrg?.id && (
        <>
          <SectionHeader title="Membres"
            subtitle="Invite des joueurs à voter avec leur compte. Ils auront accès en mode votant uniquement." />
          {members.length > 0 && (
            <div className="group" style={{ marginBottom: 12 }}>
              {members.map((m, i) => (
                <div key={m.user_id}>
                  {i > 0 && <div style={{ height: 1, background: 'var(--separator)', margin: '0 16px' }} />}
                  <div className="row">
                    <div className="row-body">
                      <div className="row-title">{m.email}</div>
                      <div className="row-sub" style={{
                        color: m.role === 'admin' ? 'var(--gold)' : 'var(--lemon)'
                      }}>
                        {m.role === 'admin' ? 'Admin' : 'Votant'}
                      </div>
                    </div>
                    {m.role !== 'admin' && (
                      <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 13 }}
                        onClick={() => handleRemoveMember(m.user_id, m.email)}>
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-8" style={{ marginBottom: 24 }}>
            <input
              placeholder="Email du votant"
              value={memberEmail}
              type="email"
              onChange={e => setMemberEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMember()}
            />
            <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '12px 16px' }}
              disabled={!memberEmail.trim() || addMemberMutation.isPending}
              onClick={handleAddMember}>
              {addMemberMutation.isPending ? '…' : 'Inviter'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
