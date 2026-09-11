import { useState } from 'react';
import { teamNameSchema } from '@/schemas';
import { useCreateTeam, useUpdateTeam, useDeleteTeam } from '@/hooks/mutations';
import type { EntityId, Player, Team } from '@/types';
import { activeTeamPlayerIds, sectionLabelStyle, type ConfirmFn, type Notify } from './shared';

interface TeamsSectionProps {
  activePlayers: Player[];
  teams: Team[];
  orgId?: string;
  notify: Notify;
  confirm: ConfirmFn;
}

/** Saved line-ups ("équipes") used to fill the match launcher in one tap. */
export function TeamsSection({ activePlayers, teams, orgId, notify, confirm }: TeamsSectionProps) {
  const [teamName,         setTeamName]         = useState('');
  const [teamIds,          setTeamIds]          = useState<EntityId[]>([]);
  const [teamError,        setTeamError]        = useState<string | null>(null);
  const [showNewTeam,      setShowNewTeam]      = useState(false);
  const [editingTeamId,    setEditingTeamId]    = useState<EntityId | null>(null);
  const [editingPlayerIds, setEditingPlayerIds] = useState<EntityId[]>([]);

  const createTeamMutation = useCreateTeam(orgId);
  const updateTeamMutation = useUpdateTeam(orgId);
  const deleteTeamMutation = useDeleteTeam(orgId);

  const toggleTeamId = (id: EntityId) => setTeamIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleEditingPlayerId = (id: EntityId) =>
    setEditingPlayerIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const saveTeam = () => {
    const result = teamNameSchema.safeParse({ name: teamName });
    if (!result.success) { setTeamError(result.error.issues[0].message); return; }
    if (teamIds.length < 2) return;
    setTeamError(null);
    createTeamMutation.mutate(
      { name: result.data.name, playerIds: teamIds },
      { onSuccess: () => { setTeamName(''); setTeamIds([]); notify('Équipe sauvegardée !'); } },
    );
  };

  const deleteTeam = async (id: EntityId, name: string) => {
    if (!(await confirm({ message: `Supprimer l'équipe "${name}" ?`, confirmLabel: 'Supprimer', danger: true }))) return;
    deleteTeamMutation.mutate(id);
  };

  const startEditTeam = (t: Team) => {
    if (editingTeamId === t.id) { setEditingTeamId(null); return; } // toggle off
    setEditingTeamId(t.id);
    setEditingPlayerIds(activeTeamPlayerIds(t, activePlayers));
  };

  const saveTeamEdit = () => {
    if (!editingTeamId || editingPlayerIds.length < 2) return;
    updateTeamMutation.mutate(
      { id: editingTeamId, playerIds: editingPlayerIds },
      { onSuccess: () => { setEditingTeamId(null); notify('Équipe mise à jour !'); } },
    );
  };

  return (
    <div>
      <p style={sectionLabelStyle}>Équipes · {teams.length}</p>
      {teams.length > 0 && (
        <div className="group" style={{ marginBottom: 12 }}>
          {teams.map((t, i) => {
            const isEditing = editingTeamId === t.id;
            return (
              <div key={String(t.id)}>
                {i > 0 && <div style={{ height: 1, background: 'var(--separator)', margin: '0 16px' }} />}
                <div className="row">
                  <div className="row-body">
                    <div className="row-title">{t.name}</div>
                    <div className="row-sub" style={{ marginTop: 3 }}>
                      {activePlayers.filter(p => t.player_ids.includes(p.id)).map(p => p.name).join(' · ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '5px 12px', fontSize: 13, color: isEditing ? 'var(--gold)' : undefined }}
                      onClick={() => startEditTeam(t)}
                    >
                      {isEditing ? 'Annuler' : 'Modifier'}
                    </button>
                    <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 13 }}
                      onClick={() => void deleteTeam(t.id, t.name)}>Supprimer</button>
                  </div>
                </div>

                {/* Inline edit panel */}
                {isEditing && (
                  <div style={{ padding: '14px 16px', borderTop: '1px solid var(--separator)', background: 'var(--bg3)' }}>
                    <div className="flex-between" style={{ marginBottom: 8 }}>
                      <p style={{ fontSize: 13, color: 'var(--label3)' }}>
                        Joueurs
                        <span style={{ color: 'var(--label2)', marginLeft: 6 }}>
                          {editingPlayerIds.length} sélectionné{editingPlayerIds.length !== 1 ? 's' : ''}
                        </span>
                      </p>
                      <div className="flex gap-8">
                        <button className="tag tag-dim" onClick={() => setEditingPlayerIds(activePlayers.map(p => p.id))}>Tous</button>
                        <button className="tag tag-dim" onClick={() => setEditingPlayerIds([])}>Aucun</button>
                      </div>
                    </div>
                    <div className="player-grid" style={{ marginBottom: 12 }}>
                      {activePlayers.map(p => (
                        <button
                          key={String(p.id)}
                          className={`player-chip ${editingPlayerIds.includes(p.id) ? 'sel-1st' : ''}`}
                          onClick={() => toggleEditingPlayerId(p.id)}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                    {editingPlayerIds.length < 2 && (
                      <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 8 }}>
                        Sélectionne au moins 2 joueurs.
                      </p>
                    )}
                    <button
                      className="btn btn-primary btn-full"
                      disabled={editingPlayerIds.length < 2 || updateTeamMutation.isPending}
                      onClick={saveTeamEdit}
                    >
                      {updateTeamMutation.isPending ? 'Sauvegarde…' : `Enregistrer · ${editingPlayerIds.length} joueur${editingPlayerIds.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <button className="tag tag-dim" style={{ fontSize: 13, padding: '7px 12px' }}
          onClick={() => setShowNewTeam(v => !v)}>
          {showNewTeam ? '▲ Masquer' : '＋ Créer une équipe'}
        </button>
      </div>
      {showNewTeam && (
        <div className="group" style={{ padding: '14px 16px' }}>
          <label htmlFor="admin-team-name" style={{ display: 'block', fontSize: 13, color: 'var(--label3)', marginBottom: 8 }}>Nom de l'équipe</label>
          <input id="admin-team-name" placeholder="ex : Équipe championnat, Coupe, Tournoi…" value={teamName}
            onChange={e => { setTeamName(e.target.value); setTeamError(null); }}
            style={{ marginBottom: teamError ? 4 : 16, borderColor: teamError ? 'var(--red)' : undefined }} />
          {teamError && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{teamError}</p>}
          <div className="flex-between" style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--label3)' }}>
              Joueurs à inclure
              {teamIds.length > 0 && <span style={{ color: 'var(--label2)', marginLeft: 6 }}>{teamIds.length} sélectionné{teamIds.length > 1 ? 's' : ''}</span>}
            </p>
            <div className="flex gap-8">
              <button className="tag tag-dim" onClick={() => setTeamIds(activePlayers.map(p => p.id))}>Tous</button>
              <button className="tag tag-dim" onClick={() => setTeamIds([])}>Aucun</button>
            </div>
          </div>
          <div className="player-grid" style={{ marginBottom: 12 }}>
            {activePlayers.map(p => (
              <button key={String(p.id)} className={`player-chip ${teamIds.includes(p.id) ? 'sel-1st' : ''}`}
                onClick={() => toggleTeamId(p.id)}>{p.name}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-full"
            disabled={!teamName.trim() || teamIds.length < 2 || createTeamMutation.isPending}
            onClick={saveTeam}>
            {createTeamMutation.isPending ? 'Création…' : `Créer l'équipe · ${teamIds.length} joueur${teamIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
