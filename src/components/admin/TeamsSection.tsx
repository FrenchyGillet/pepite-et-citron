import { useState } from 'react';
import { teamNameSchema } from '@/schemas';
import { track, EVENTS } from '@/utils/analytics';
import { useCreateTeam, useUpdateTeam, useDeleteTeam } from '@/hooks/mutations';
import type { EntityId, Player, Team } from '@/types';
import { activeTeamPlayerIds, sectionLabelStyle, type ConfirmFn, type Notify } from './shared';
import { t } from '@/i18n';

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
      { onSuccess: () => {
        track(EVENTS.LINEUP_CREATED, { players: teamIds.length });
        setTeamName(''); setTeamIds([]); notify(t('teams.saved'));
      } },
    );
  };

  const deleteTeam = async (id: EntityId, name: string) => {
    if (!(await confirm({ message: t('teams.deleteConfirm', { name }), confirmLabel: t('teams.delete'), danger: true }))) return;
    deleteTeamMutation.mutate(id);
  };

  const startEditTeam = (team: Team) => {
    if (editingTeamId === team.id) { setEditingTeamId(null); return; } // toggle off
    setEditingTeamId(team.id);
    setEditingPlayerIds(activeTeamPlayerIds(team, activePlayers));
  };

  const saveTeamEdit = () => {
    if (!editingTeamId || editingPlayerIds.length < 2) return;
    updateTeamMutation.mutate(
      { id: editingTeamId, playerIds: editingPlayerIds },
      { onSuccess: () => { setEditingTeamId(null); notify(t('teams.updated')); } },
    );
  };

  return (
    <div>
      <p style={sectionLabelStyle}>{t('teams.title', { count: teams.length })}</p>
      {teams.length > 0 && (
        <div className="group" style={{ marginBottom: 12 }}>
          {teams.map((team, i) => {
            const isEditing = editingTeamId === team.id;
            return (
              <div key={String(team.id)}>
                {i > 0 && <div style={{ height: 1, background: 'var(--separator)', margin: '0 16px' }} />}
                <div className="row">
                  <div className="row-body">
                    <div className="row-title">{team.name}</div>
                    <div className="row-sub" style={{ marginTop: 3 }}>
                      {activePlayers.filter(p => team.player_ids.includes(p.id)).map(p => p.name).join(' · ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '5px 12px', fontSize: 13, color: isEditing ? 'var(--gold)' : undefined }}
                      onClick={() => startEditTeam(team)}
                    >
                      {isEditing ? t('common.cancel') : t('teams.edit')}
                    </button>
                    <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 13 }}
                      onClick={() => void deleteTeam(team.id, team.name)}>{t('teams.delete')}</button>
                  </div>
                </div>

                {/* Inline edit panel */}
                {isEditing && (
                  <div style={{ padding: '14px 16px', borderTop: '1px solid var(--separator)', background: 'var(--bg3)' }}>
                    <div className="flex-between" style={{ marginBottom: 8 }}>
                      <p style={{ fontSize: 13, color: 'var(--label3)' }}>
                        {t('teams.players')}
                        <span style={{ color: 'var(--label2)', marginLeft: 6 }}>
                          {t('teams.selected', { count: editingPlayerIds.length })}
                        </span>
                      </p>
                      <div className="flex gap-8">
                        <button className="tag tag-dim" onClick={() => setEditingPlayerIds(activePlayers.map(p => p.id))}>{t('launcher.all')}</button>
                        <button className="tag tag-dim" onClick={() => setEditingPlayerIds([])}>{t('launcher.none')}</button>
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
                        {t('teams.minTwo')}
                      </p>
                    )}
                    <button
                      className="btn btn-primary btn-full"
                      disabled={editingPlayerIds.length < 2 || updateTeamMutation.isPending}
                      onClick={saveTeamEdit}
                    >
                      {updateTeamMutation.isPending ? t('teams.saving') : t('teams.saveCount', { count: editingPlayerIds.length })}
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
          {showNewTeam ? t('teams.hide') : t('teams.create')}
        </button>
      </div>
      {showNewTeam && (
        <div className="group" style={{ padding: '14px 16px' }}>
          <label htmlFor="admin-team-name" style={{ display: 'block', fontSize: 13, color: 'var(--label3)', marginBottom: 8 }}>{t('teams.nameLabel')}</label>
          <input id="admin-team-name" placeholder={t('teams.namePlaceholder')} value={teamName}
            onChange={e => { setTeamName(e.target.value); setTeamError(null); }}
            style={{ marginBottom: teamError ? 4 : 16, borderColor: teamError ? 'var(--red)' : undefined }} />
          {teamError && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{teamError}</p>}
          <div className="flex-between" style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--label3)' }}>
              {t('teams.include')}
              {teamIds.length > 0 && <span style={{ color: 'var(--label2)', marginLeft: 6 }}>{t('teams.selected', { count: teamIds.length })}</span>}
            </p>
            <div className="flex gap-8">
              <button className="tag tag-dim" onClick={() => setTeamIds(activePlayers.map(p => p.id))}>{t('launcher.all')}</button>
              <button className="tag tag-dim" onClick={() => setTeamIds([])}>{t('launcher.none')}</button>
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
            {createTeamMutation.isPending ? t('teams.creating') : t('teams.createCount', { count: teamIds.length })}
          </button>
        </div>
      )}
    </div>
  );
}
