import { useState } from 'react';
import { formatDate } from '@/utils';
import { computeSeasonStats } from '@/utils/season';
import { Scoreboard } from './Scoreboard';
import { Sparkline } from './Sparkline';
import { EmptyState } from './EmptyState';
import { useAllVotes, useMatches, useTeams, useCurrentSeason, useSeasonNames } from '@/hooks/queries';
import { useDeleteMatch, useUpdateMatch } from '@/hooks/mutations';
import type { Player, Match, EntityId } from '@/types';

interface StatsViewProps {
  players: Player[];
  activeMatch: Match | null;
  isAdmin: boolean;
  orgId?: string | null;
}

interface EditingMatch {
  id: EntityId;
  label: string;
  team_id: EntityId | null;
}

export function StatsView({ players, activeMatch, isAdmin, orgId }: StatsViewProps) {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<EntityId | null>(null);
  const [expandedId,     setExpandedId]     = useState<EntityId | null>(null);
  const [editingMatch,   setEditingMatch]   = useState<EditingMatch | null>(null);

  const { data: allVotes   = [] }              = useAllVotes(orgId);
  const { data: allMatches = [], isLoading }   = useMatches(orgId);
  const { data: allTeams   = [] }              = useTeams(orgId);
  const { data: currentSeason = 1 }            = useCurrentSeason(orgId);

  const seasons     = [...new Set(allMatches.map(m => m.season || 1))].sort((a, b) => a - b);
  const seasonNames = useSeasonNames(seasons);

  const deleteMatchMutation = useDeleteMatch(orgId);
  const updateMatchMutation = useUpdateMatch(orgId);

  if (isLoading) return <div className="content"><div className="empty">Chargement…</div></div>;

  const votingInProgress = activeMatch?.is_open && (activeMatch.phase || 'voting') === 'voting';
  if (votingInProgress) return (
    <div className="content">
      <EmptyState
        icon={<><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}
        title="Classements masqués"
        subtitle="Les stats de saison sont cachées pendant le vote pour ne pas influencer les choix."
      />
    </div>
  );

  const activeSeason = selectedSeason ?? currentSeason;

  const filteredMatches = allMatches.filter(m =>
    (m.season || 1) === activeSeason &&
    (selectedTeamId === null || m.team_id === selectedTeamId)
  );
  const filteredMatchIds = new Set(filteredMatches.map(m => m.id));
  const filteredVotes = allVotes.filter(v => filteredMatchIds.has(v.match_id));

  const { rankedBest, rankedLemon, maxPts, maxLemonPts } = computeSeasonStats(players, filteredMatches, allVotes);

  const handleDelete = (match: Match) => {
    if (!confirm(`Supprimer "${match.label}" et tous ses votes ?`)) return;
    deleteMatchMutation.mutate(match.id, {
      onSuccess: () => { if (expandedId === match.id) setExpandedId(null); },
    });
  };

  const handleSaveEdit = () => {
    if (!editingMatch) return;
    updateMatchMutation.mutate(
      { id: editingMatch.id, data: { label: editingMatch.label, team_id: editingMatch.team_id || null } },
      { onSuccess: () => setEditingMatch(null) }
    );
  };

  const TabBar = ({ items, active, onChange }: { items: { id: number; label: string }[]; active: number; onChange: (id: number) => void }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
      {items.map(({ id, label }) => (
        <button key={id} onClick={() => onChange(id)} style={{
          padding: '7px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
          background: active === id ? 'var(--label)' : 'var(--bg3)',
          color: active === id ? 'var(--bg)' : 'var(--label3)',
          border: 'none', cursor: 'pointer',
        }}>{label}</button>
      ))}
    </div>
  );

  return (
    <div className="content">
      {seasons.length > 0 && (
        <div style={{ marginTop: 12, marginBottom: 16 }}>
          <TabBar
            items={seasons.map(s => ({ id: s, label: `${seasonNames[s] || `Saison ${s}`}${s === currentSeason ? ' ·' : ''}` }))}
            active={activeSeason}
            onChange={s => { setSelectedSeason(s); setSelectedTeamId(null); setExpandedId(null); }}
          />
          <p style={{ fontSize: 11, color: 'var(--label4)', marginTop: 4 }}>
            {filteredMatches.length} match{filteredMatches.length !== 1 ? 's' : ''}
            {filteredVotes.length > 0 && ` · ${filteredVotes.length} vote${filteredVotes.length > 1 ? 's' : ''}`}
          </p>
        </div>
      )}

      {allTeams.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <button className={`tag ${selectedTeamId === null ? 'tag-gold' : 'tag-dim'}`}
            onClick={() => setSelectedTeamId(null)}>Toutes</button>
          {allTeams.map(t => (
            <button key={String(t.id)} className={`tag ${selectedTeamId === t.id ? 'tag-gold' : 'tag-dim'}`}
              onClick={() => setSelectedTeamId(t.id)}>{t.name}</button>
          ))}
        </div>
      )}

      {filteredMatches.length === 0 ? (
        <EmptyState
          icon={<><path d="M18 20V10M12 20V4M6 20v-6"/></>}
          title="Pas encore de match"
          subtitle="Les statistiques s'afficheront dès que le premier match de cette saison sera clôturé."
        />
      ) : (
        <>
          <p className="section-label mb-4">Classement Pépites ⭐</p>
          {rankedBest.length === 0
            ? <div className="group" style={{ marginBottom: 12 }}><div className="row"><span style={{ color: 'var(--label3)', fontSize: 14 }}>Aucun vote enregistré.</span></div></div>
            : (
              <div className="group" style={{ marginBottom: 12 }}>
                {rankedBest.map((s, i) => (
                  <div key={s.name} className="row">
                    <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: i === 0 ? 'var(--gold)' : 'var(--label3)' }}>{i + 1}</div>
                    <div className="row-body">
                      <div className="row-title">{s.name}</div>
                      {s.wins > 0 && <div className="flex gap-8 mt-4"><span className="tag tag-gold">⭐ ×{s.wins}</span></div>}
                    </div>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <Sparkline data={s.bestHistory} color={i === 0 ? 'var(--gold)' : '#8E8E93'} />
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{ width: `${(s.bestPts / maxPts) * 100}%`, background: i === 0 ? 'var(--gold)' : 'var(--label3)' }} />
                      </div>
                      <div className="row-value gold" style={{ minWidth: 24, textAlign: 'right' }}>{s.bestPts}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }

          <p className="section-label mb-4">Classement Citrons 🍋</p>
          {rankedLemon.length === 0
            ? <div className="group" style={{ marginBottom: 12 }}><div className="row"><span style={{ color: 'var(--label3)', fontSize: 14 }}>Aucun vote enregistré.</span></div></div>
            : (
              <div className="group" style={{ marginBottom: 12 }}>
                {rankedLemon.map((s, i) => (
                  <div key={s.name} className="row">
                    <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: i === 0 ? '#f5c542' : 'var(--label3)' }}>{i + 1}</div>
                    <div className="row-body">
                      <div className="row-title">{s.name}</div>
                      {s.lemons > 0 && <div className="flex gap-8 mt-4"><span className="tag tag-lemon">🍋 ×{s.lemons}</span></div>}
                    </div>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <Sparkline data={s.lemonHistory} color={i === 0 ? '#f5c542' : '#8E8E93'} />
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{ width: `${(s.lemonPts / maxLemonPts) * 100}%`, background: i === 0 ? '#f5c542' : 'var(--label3)' }} />
                      </div>
                      <div className="row-value" style={{ minWidth: 24, textAlign: 'right', color: '#f5c542' }}>{s.lemonPts}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }

          <p className="section-label mb-8">Matchs</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {filteredMatches.map(match => {
              const matchVotes   = allVotes.filter(v => v.match_id === match.id);
              const matchPresent = players.filter(p => (match.present_ids || []).includes(p.id));
              const isExpanded   = expandedId === match.id;
              const isEditing    = editingMatch?.id === match.id;
              const teamName     = allTeams.find(t => t.id === match.team_id)?.name;

              return (
                <div key={String(match.id)} style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <button onClick={() => setExpandedId(isExpanded ? null : match.id)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--label)' }}>{match.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>
                        {formatDate(match.created_at)}
                        {teamName && <span> · <span style={{ color: 'var(--gold)' }}>{teamName}</span></span>}
                        {' · '}{matchVotes.length} vote{matchVotes.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <span style={{ color: 'var(--label4)', fontSize: 11 }}>{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--separator)', padding: '12px 16px' }}>
                      {matchVotes.length === 0
                        ? <p style={{ fontSize: 14, color: 'var(--label3)', marginBottom: 12 }}>Aucun vote.</p>
                        : <Scoreboard votes={matchVotes} present={matchPresent} allPlayers={players} />
                      }

                      {isAdmin && (isEditing && editingMatch ? (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input value={editingMatch.label}
                            onChange={e => setEditingMatch(em => em ? { ...em, label: e.target.value } : em)}
                            placeholder="Nom du match" />
                          {allTeams.length > 0 && (
                            <select
                              value={editingMatch.team_id != null ? String(editingMatch.team_id) : ''}
                              onChange={e => setEditingMatch(em => em ? { ...em, team_id: e.target.value ? parseInt(e.target.value) : null } : em)}
                              style={{ background: 'var(--bg3)', color: 'var(--label)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 15, width: '100%', outline: 'none' }}>
                              <option value="">Sans équipe</option>
                              {allTeams.map(t => <option key={String(t.id)} value={String(t.id)}>{t.name}</option>)}
                            </select>
                          )}
                          <div className="flex gap-8">
                            <button className="btn btn-secondary" onClick={() => setEditingMatch(null)}>Annuler</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit}>Sauvegarder</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-8" style={{ marginTop: 12 }}>
                          <button className="btn btn-secondary" style={{ flex: 1 }}
                            onClick={() => setEditingMatch({ id: match.id, label: match.label, team_id: match.team_id || null })}>
                            Modifier
                          </button>
                          <button className="btn btn-danger" onClick={() => handleDelete(match)}>Supprimer</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
