import { useState, type CSSProperties } from 'react';
import { formatDate } from '@/utils';
import { computeSeasonStats } from '@/utils/season';
import { computeResultsSummary } from '@/utils/scoring';
import { Sparkline } from './Sparkline';
import { EmptyState } from './EmptyState';
import { PodiumView } from './PodiumView';
import { ManualResultForm } from './ManualResultForm';
import { Toast } from './Toast';
import { useAllVotes, useMatches, useTeams, useCurrentSeason, useSeasonNames } from '@/hooks/queries';
import { useDeleteMatch, useUpdateMatch } from '@/hooks/mutations';
import { useConfirm } from '@/hooks/useConfirm';
import { track, EVENTS } from '@/utils/analytics';
import type { Player, Match, EntityId, ManualResult } from '@/types';
import { t } from '@/i18n';
import { SeasonAwards, holderNames } from '@/components/SeasonAwards';
import { matchResults, seasonTitles } from '@/utils/awards';
import { rankingMascot, type RankingTab } from '@/utils/mascots';
import { MascotTalk } from './MascotTalk';

interface StatsViewProps {
  players: Player[];
  activeMatch: Match | null;
  isAdmin: boolean;
  /** Admin or captain: may enter a missing result and edit a match. */
  canRunMatches?: boolean;
  orgId?: string | null;
}

interface EditingMatch {
  id: EntityId;
  label: string;
  team_id: EntityId | null;
}

/** Podium of a hand-entered match: the names, and the points when known. */
function ManualResultSummary({ result, players }: { result: ManualResult; players: Player[] }) {
  const nameOf = (id: EntityId) => players.find(p => String(p.id) === String(id))?.name ?? '?';
  const pts = (map: Record<string, number> | undefined, id: EntityId) => {
    const n = map?.[String(id)];
    return n != null ? ` · ${t('vote.pts', { count: n })}` : '';
  };
  const placeLabels = [t('stats.placePepite'), t('stats.place2'), t('stats.place3')];
  return (
    <div className="group" style={{ marginBottom: 4 }}>
      {result.best_ids.map((id, i) => (
        <div key={String(id)} className="row">
          <div className="row-body">
            <div className="row-sub" style={{ color: i === 0 ? 'var(--gold)' : 'var(--label3)' }}>{placeLabels[i]}</div>
            <div className="row-title" style={{ fontWeight: i === 0 ? 700 : 500 }}>{nameOf(id)}{pts(result.best_pts, id)}</div>
          </div>
        </div>
      ))}
      <div className="row">
        <div className="row-body">
          <div className="row-sub" style={{ color: 'var(--lemon)' }}>{t('stats.citron')}</div>
          <div className="row-title" style={{ fontWeight: 700 }}>{nameOf(result.lemon_id)}{pts(result.lemon_pts, result.lemon_id)}</div>
        </div>
      </div>
    </div>
  );
}

// Module-level so the buttons are not remounted on every StatsView render.
function Segmented<T extends string>({ items, active, onChange }: { items: { id: T; label: string }[]; active: T; onChange: (id: T) => void }) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: 4, marginBottom: 8 }}>
      {items.map(({ id, label }) => (
        <button key={id} onClick={() => onChange(id)} aria-pressed={active === id} style={{
          flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: active === id ? 'var(--bg3)' : 'transparent',
          color: active === id ? 'var(--label)' : 'var(--label3)',
          border: 'none', cursor: 'pointer',
        }}>{label}</button>
      ))}
    </div>
  );
}

/** "Voir les 12 autres" at the foot of a folded list. */
function ShowMoreRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
      fontSize: 14, fontWeight: 600, color: 'var(--gold)',
    }}>{label}</button>
  );
}

const filterCaption: CSSProperties = { display: 'block', fontSize: 12, color: 'var(--label3)', marginBottom: 4 };
const filterSelect: CSSProperties = {
  width: '100%', background: 'var(--bg2)', color: 'var(--label)', border: 'none',
  borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 15, outline: 'none',
};
/** Rankings and the match list show this many before "Voir les … autres". */
const TOP = 3;
const RECENT_MATCHES = 5;

export function StatsView({ players, activeMatch, isAdmin, canRunMatches = isAdmin, orgId }: StatsViewProps) {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<EntityId | null>(null);
  const [expandedId,     setExpandedId]     = useState<EntityId | null>(null);
  const [editingMatch,   setEditingMatch]   = useState<EditingMatch | null>(null);
  // 'new' = adding a missing result; a match = editing a hand-entered one.
  const [manualForm,     setManualForm]     = useState<'new' | Match | null>(null);
  const [toast,          setToast]          = useState<string | null>(null);
  const [rankingTab,     setRankingTab]     = useState<RankingTab>('pepite');
  const [showAllRanks,   setShowAllRanks]   = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

  const { data: allVotes   = [], isError: votesError,   refetch: refetchVotes }   = useAllVotes(orgId);
  const { data: allMatches = [], isLoading, isError: matchesError, refetch: refetchMatches } = useMatches(orgId);
  const { data: allTeams   = [] }              = useTeams(orgId);
  const { data: currentSeason = 1 }            = useCurrentSeason(orgId);

  const seasons     = [...new Set(allMatches.map(m => m.season || 1))].sort((a, b) => a - b);
  const seasonNames = useSeasonNames(orgId, seasons);

  const deleteMatchMutation = useDeleteMatch(orgId);
  const updateMatchMutation = useUpdateMatch(orgId);
  const { confirm, confirmDialog } = useConfirm();

  if (isLoading) return <div className="content"><div className="empty">Chargement…</div></div>;

  // A failed load must not look like an empty season.
  if (matchesError || votesError) return (
    <div className="content">
      <EmptyState
        icon={<><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></>}
        title={t('stats.loadFailed')}
        subtitle={t('stats.loadFailedHint')}
        action={{ label: t('common.retry'), onClick: () => { void refetchMatches(); void refetchVotes(); } }}
      />
    </div>
  );

  const votingInProgress = activeMatch?.is_open && (activeMatch.phase || 'voting') === 'voting';
  if (votingInProgress) return (
    <div className="content">
      <EmptyState
        icon={<><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}
        title={t('stats.hidden')}
        subtitle={t('stats.hiddenHint')}
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

  const { rankedBest, rankedLemon, rankedAttendance, maxPts, maxLemonPts, totalMatches } = computeSeasonStats(players, filteredMatches, allVotes, allTeams);
  // Season titles (revealed matches only): the palmarès and the mascots.
  const results = matchResults(players, filteredMatches, allVotes);
  const season  = seasonTitles(results);
  const tabMascot = rankingMascot(rankingTab, season, id => holderNames([id], players));
  const lastResultId = results[results.length - 1]?.matchId;
  const visibleMatches = showAllMatches ? filteredMatches : filteredMatches.slice(0, RECENT_MATCHES);

  const handleDelete = async (match: Match) => {
    if (!(await confirm({
      message: t('stats.deleteConfirm', { match: match.label }),
      confirmLabel: t('stats.delete'), danger: true,
    }))) return;
    deleteMatchMutation.mutate(match.id, {
      onSuccess: () => {
        track(EVENTS.MATCH_DELETED);
        if (expandedId === match.id) setExpandedId(null);
      },
    });
  };

  const handleSaveEdit = () => {
    if (!editingMatch) return;
    updateMatchMutation.mutate(
      { id: editingMatch.id, data: { label: editingMatch.label, team_id: editingMatch.team_id || null } },
      { onSuccess: () => setEditingMatch(null) }
    );
  };

  return (
    <div className="content">
      {confirmDialog}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      {(seasons.length > 0 || allTeams.length > 0) && (
        <div style={{ marginTop: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {seasons.length > 0 && (
              <label style={{ flex: 1, minWidth: 0 }}>
                <span style={filterCaption}>{t(activeSeason === currentSeason ? 'stats.seasonCurrentLabel' : 'stats.seasonLabel')}</span>
                <select style={filterSelect} value={activeSeason} onChange={e => {
                  setSelectedSeason(Number(e.target.value)); setSelectedTeamId(null);
                  setExpandedId(null); setShowAllRanks(false); setShowAllMatches(false);
                }}>
                  {[...seasons].reverse().map(s => (
                    <option key={s} value={s}>{seasonNames[s] || t('stats.season', { n: s })}</option>
                  ))}
                </select>
              </label>
            )}
            {allTeams.length > 0 && (
              <label style={{ flex: 1, minWidth: 0 }}>
                <span style={filterCaption}>{t('stats.teamLabel')}</span>
                <select style={filterSelect} value={selectedTeamId != null ? String(selectedTeamId) : ''} onChange={e => {
                  // Resolve back to the real team id (int today, could be uuid) — no parseInt.
                  setSelectedTeamId(allTeams.find(tm => String(tm.id) === e.target.value)?.id ?? null);
                  setShowAllRanks(false); setShowAllMatches(false);
                }}>
                  <option value="">{t('stats.allTeams')}</option>
                  {allTeams.map(tm => <option key={String(tm.id)} value={String(tm.id)}>{tm.name}</option>)}
                </select>
              </label>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--label4)', marginTop: 8 }}>
            {t('stats.matches', { count: filteredMatches.length })}
            {filteredVotes.length > 0 && ` · ${t('common.votes', { count: filteredVotes.length })}`}
          </p>
        </div>
      )}

      {manualForm && (
        <ManualResultForm
          players={players}
          teams={allTeams}
          season={activeSeason}
          orgId={orgId}
          match={manualForm === 'new' ? undefined : manualForm}
          onDone={msg => { setManualForm(null); setToast(msg); }}
          onCancel={() => setManualForm(null)}
        />
      )}

      {filteredMatches.length === 0 ? (
        !manualForm && (
          <EmptyState
            icon={<><path d="M18 20V10M12 20V4M6 20v-6"/></>}
            title={t('stats.noMatch')}
            subtitle={t('stats.noMatchHint')}
            action={canRunMatches ? { label: t('stats.addResult'), onClick: () => setManualForm('new') } : null}
          />
        )
      ) : (
        <>
          <SeasonAwards players={players} results={results} season={season} />

          <p className="section-label mb-4">{t('stats.rankings')}</p>
          <Segmented<RankingTab>
            items={[
              { id: 'pepite', label: t('stats.tabPepite') },
              { id: 'citron', label: t('stats.tabCitron') },
              { id: 'attendance', label: t('stats.tabAttendance') },
            ]}
            active={rankingTab}
            onChange={id => { setRankingTab(id); setShowAllRanks(false); }}
          />
          {(() => {
            const ranked = rankingTab === 'pepite' ? rankedBest : rankingTab === 'citron' ? rankedLemon : rankedAttendance;
            if (ranked.length === 0) return (
              <div className="group" style={{ marginBottom: 12 }}><div className="row"><span style={{ color: 'var(--label3)', fontSize: 14 }}>{t('stats.noVotes')}</span></div></div>
            );
            const shown  = showAllRanks ? ranked : ranked.slice(0, TOP);
            const hidden = ranked.length - TOP;
            return (
              <div className="group" style={{ marginBottom: 12 }}>
                {shown.map((s, i) => rankingTab === 'pepite' ? (
                  <div key={s.name} className="row">
                    <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: i === 0 ? 'var(--gold)' : 'var(--label3)' }}>{i + 1}</div>
                    <div className="row-body">
                      <div className="row-title">{s.name}</div>
                      {(s.wins > 0 || s.absences > 0) && (
                        <div className="flex gap-8 mt-4">
                          {s.wins > 0 && <span className="tag tag-gold">⭐ ×{s.wins}</span>}
                          {s.absences > 0 && <span className="tag tag-dim">{t('stats.absences', { count: s.absences })}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <Sparkline data={s.bestHistory} color={i === 0 ? 'var(--gold)' : '#8E8E93'} />
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{ width: `${(s.bestPts / maxPts) * 100}%`, background: i === 0 ? 'var(--gold)' : 'var(--label3)' }} />
                      </div>
                      <div className="row-value gold" style={{ minWidth: 24, textAlign: 'right' }}>{s.bestPts}</div>
                    </div>
                  </div>
                ) : rankingTab === 'citron' ? (
                  <div key={s.name} className="row">
                    <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: i === 0 ? '#f5c542' : 'var(--label3)' }}>{i + 1}</div>
                    <div className="row-body">
                      <div className="row-title">{s.name}</div>
                      {(s.lemons > 0 || s.absences > 0) && (
                        <div className="flex gap-8 mt-4">
                          {s.lemons > 0 && <span className="tag tag-lemon">🍋 ×{s.lemons}</span>}
                          {s.absences > 0 && <span className="tag tag-dim">{t('stats.absences', { count: s.absences })}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <Sparkline data={s.lemonHistory} color={i === 0 ? '#f5c542' : '#8E8E93'} />
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{ width: `${(s.lemonPts / maxLemonPts) * 100}%`, background: i === 0 ? '#f5c542' : 'var(--label3)' }} />
                      </div>
                      <div className="row-value" style={{ minWidth: 24, textAlign: 'right', color: '#f5c542' }}>{s.lemonPts}</div>
                    </div>
                  </div>
                ) : (() => {
                  const pct = totalMatches > 0 ? Math.round((s.matchesPlayed / totalMatches) * 100) : 0;
                  const isAbsent = s.absences > 0;
                  return (
                    <div key={s.name} className="row">
                      <div className="row-body">
                        <div className="row-title">{s.name}</div>
                      </div>
                      <div className="flex gap-8" style={{ alignItems: 'center' }}>
                        <div className="score-bar-wrap">
                          <div className="score-bar" style={{
                            width: `${pct}%`,
                            background: isAbsent ? 'var(--label3)' : 'var(--gold)',
                          }} />
                        </div>
                        <div style={{
                          fontSize: 12, fontWeight: 600, minWidth: 44, textAlign: 'right',
                          color: isAbsent ? 'var(--label3)' : 'var(--gold)',
                        }}>
                          {s.matchesPlayed}/{totalMatches}
                        </div>
                      </div>
                    </div>
                  );
                })())}
                {hidden > 0 && (
                  <ShowMoreRow onClick={() => setShowAllRanks(v => !v)}
                    label={showAllRanks ? t('stats.showLess') : t('stats.showMore', { count: hidden })} />
                )}
              </div>
            );
          })()}
          {tabMascot && (
            // One line per tab, changing after each match.
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <MascotTalk situations={tabMascot.situations} vars={tabMascot.vars}
                seed={`${rankingTab}:${lastResultId}`} />
            </div>
          )}

          <div className="flex-between mb-8">
            <p className="section-label">{t('stats.matchList')}</p>
            {canRunMatches && !manualForm && (
              <button className="tag tag-dim" onClick={() => setManualForm('new')}>{t('stats.addResultTag')}</button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {visibleMatches.map(match => {
              const matchVotes   = allVotes.filter(v => v.match_id === match.id);
              const matchPresent = players.filter(p => (match.present_ids || []).includes(p.id));
              const isExpanded   = expandedId === match.id;
              const isEditing    = editingMatch?.id === match.id;
              const teamName     = allTeams.find(t => t.id === match.team_id)?.name;
              const manual       = match.manual_result;

              return (
                <div key={String(match.id)} style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <button onClick={() => setExpandedId(isExpanded ? null : match.id)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--label)' }}>{match.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>
                        {formatDate(match.created_at)}
                        {teamName && <span> · <span style={{ color: 'var(--gold)' }}>{teamName}</span></span>}
                        {' · '}{manual ? t('stats.manual') : t('common.votes', { count: matchVotes.length })}
                      </div>
                    </div>
                    <span style={{ color: 'var(--label4)', fontSize: 11 }}>{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--separator)', padding: '12px 16px' }}>
                      {manual ? (
                        <ManualResultSummary result={manual} players={players} />
                      ) : matchVotes.length === 0 ? (
                        <p style={{ fontSize: 14, color: 'var(--label3)', marginBottom: 12 }}>{t('stats.noVotes')}</p>
                      ) : (
                        <>
                          {/* Podium complet avec tabs Pépite / Citron */}
                          <PodiumView
                            votes={matchVotes}
                            present={matchPresent}
                            allPlayers={players}
                            tiebreakers={match.tiebreakers}
                            pepiteCount={match.pepite_count ?? 2}
                          />

                          {/* 👻 Fantômes — joueurs présents qui n'ont pas voté */}
                          {(() => {
                            const { ghosts } = computeResultsSummary(matchVotes, matchPresent, players, match.pepite_count ?? 2);
                            return ghosts.length > 0 ? (
                              <div style={{ marginBottom: 16 }}>
                                <p style={{
                                  fontSize: 11, fontWeight: 700, color: 'var(--label4)',
                                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
                                }}>
                                  {t('results.ghosts', { count: ghosts.length })}
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {ghosts.map(p => (
                                    <div key={String(p.id)} style={{
                                      padding: '5px 12px', background: 'var(--bg3)',
                                      borderRadius: 20, fontSize: 13,
                                      color: 'var(--label4)', fontWeight: 500,
                                    }}>
                                      {p.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </>
                      )}

                      {canRunMatches && (isEditing && editingMatch ? (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input aria-label={t('stats.matchName')} value={editingMatch.label}
                            onChange={e => setEditingMatch(em => em ? { ...em, label: e.target.value } : em)}
                            placeholder={t('stats.matchName')} />
                          {allTeams.length > 0 && (
                            <select
                              value={editingMatch.team_id != null ? String(editingMatch.team_id) : ''}
                              onChange={e => {
                                // Resolve back to the real team id (int today, could be uuid) — no parseInt.
                                const picked = allTeams.find(t => String(t.id) === e.target.value)?.id ?? null;
                                setEditingMatch(em => em ? { ...em, team_id: picked } : em);
                              }}
                              style={{ background: 'var(--bg3)', color: 'var(--label)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 15, width: '100%', outline: 'none' }}>
                              <option value="">{t('stats.noTeam')}</option>
                              {allTeams.map(t => <option key={String(t.id)} value={String(t.id)}>{t.name}</option>)}
                            </select>
                          )}
                          <div className="flex gap-8">
                            <button className="btn btn-secondary" onClick={() => setEditingMatch(null)}>{t('common.cancel')}</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit}>{t('stats.save')}</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-8" style={{ marginTop: 12 }}>
                          <button className="btn btn-secondary" style={{ flex: 1 }}
                            onClick={() => manual
                              ? setManualForm(match)
                              : setEditingMatch({ id: match.id, label: match.label, team_id: match.team_id || null })}>
                            {t('stats.edit')}
                          </button>
                          {isAdmin && <button className="btn btn-danger" onClick={() => handleDelete(match)}>{t('stats.delete')}</button>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredMatches.length > RECENT_MATCHES && (
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-lg)' }}>
                <ShowMoreRow onClick={() => setShowAllMatches(v => !v)}
                  label={showAllMatches ? t('stats.showLess') : t('stats.moreMatches', { count: filteredMatches.length - RECENT_MATCHES })} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
