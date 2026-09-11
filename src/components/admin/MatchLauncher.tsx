import { useRef, useState } from 'react';
import { matchLabelSchema } from '@/schemas';
import { track, EVENTS } from '@/utils/analytics';
import { VOTE_DURATIONS, deadlineFrom } from '@/utils/deadline';
import { useCreateMatch } from '@/hooks/mutations';
import type { EntityId, Player, Team } from '@/types';
import { activeTeamPlayerIds, type Notify } from './shared';

interface MatchLauncherProps {
  activePlayers: Player[];
  teams: Team[];
  currentSeason: number;
  orgId?: string;
  notify: Notify;
  /** Called once a match is open (feeds the setup checklist). */
  onLaunched: () => void;
}

/** "Match du soir" form: name, who is present, pépite mode and vote duration. */
export function MatchLauncher({ activePlayers, teams, currentSeason, orgId, notify, onLaunched }: MatchLauncherProps) {
  const [matchLabel,     setMatchLabel]     = useState('');
  const [matchError,     setMatchError]     = useState<string | null>(null);
  const [presentIds,     setPresentIds]     = useState<EntityId[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<EntityId | null>(null);
  const [pepiteCount,    setPepiteCount]    = useState<2 | 3>(2);
  const [voteDuration,   setVoteDuration]   = useState<number | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const createMatchMutation = useCreateMatch(orgId);

  // Minimum players present for a valid vote:
  // each voter picks pepiteCount winners (all different from each other and
  // from the voter themselves), so the squad must contain at least pepiteCount + 1.
  const minPlayersForVote = pepiteCount + 1; // 3 for 2-pépite mode, 4 for 3-pépite

  const togglePresent = (id: EntityId) => setPresentIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const loadTeamIntoMatch = (team: Team) => {
    setPresentIds(activeTeamPlayerIds(team, activePlayers)); // archived teammates stay home
    setSelectedTeamId(team.id);
  };

  const createMatch = () => {
    const result = matchLabelSchema.safeParse({ label: matchLabel });
    if (!result.success) {
      setMatchError(result.error.issues[0].message);
      // Guide the user straight to the problematic field
      labelInputRef.current?.focus();
      labelInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (presentIds.length < minPlayersForVote) return;
    setMatchError(null);
    createMatchMutation.mutate(
      {
        label: result.data.label, presentIds, teamId: selectedTeamId, season: currentSeason, pepiteCount,
        voteDeadline: deadlineFrom(Date.now(), voteDuration),
      },
      {
        onSuccess: () => {
          track(EVENTS.MATCH_CREATED, { playerCount: presentIds.length, pepiteCount, voteDuration: voteDuration ?? 0 });
          setMatchLabel(''); setPresentIds([]); setSelectedTeamId(null);
          notify('Match ouvert !');
          onLaunched();
        },
      }
    );
  };

  return (
    <div className="group" style={{ padding: '14px 16px' }}>
      <label htmlFor="admin-match-label" style={{ display: 'block', fontSize: 13, color: 'var(--label3)', marginBottom: 8 }}>Nom du match ou de l'adversaire</label>
      <input id="admin-match-label" ref={labelInputRef} placeholder="ex : vs Dragons, Entraînement…" value={matchLabel}
        onChange={e => { setMatchLabel(e.target.value); setMatchError(null); }}
        style={{ marginBottom: matchError ? 4 : 16, borderColor: matchError ? 'var(--red)' : undefined }} />
      {matchError && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{matchError}</p>}

      {teams.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 8 }}>Charger une équipe</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {teams.map(t => {
              const ids      = activeTeamPlayerIds(t, activePlayers);
              const selected = presentIds.length > 0 && ids.every(id => presentIds.includes(id)) && presentIds.length === ids.length;
              return (
                <button key={String(t.id)} onClick={() => loadTeamIntoMatch(t)} aria-pressed={selected} style={{
                  padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600,
                  background: selected ? 'var(--gold-dim)' : 'var(--bg3)',
                  color: selected ? 'var(--gold)' : 'var(--label2)',
                  border: 'none', cursor: 'pointer',
                }}>
                  {t.name} · {ids.length} joueurs
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="flex-between" style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 13, color: 'var(--label3)' }}>
          Qui est présent ce soir ?
          {presentIds.length > 0 && <span style={{ color: 'var(--label2)', marginLeft: 6 }}>{presentIds.length} sélectionné{presentIds.length > 1 ? 's' : ''}</span>}
        </p>
        <div className="flex gap-8">
          <button className="tag tag-dim" onClick={() => setPresentIds(activePlayers.map(p => p.id))}>Tous</button>
          <button className="tag tag-dim" onClick={() => setPresentIds([])}>Aucun</button>
        </div>
      </div>
      <div className="player-grid" style={{ marginBottom: 16 }}>
        {activePlayers.map(p => (
          <button key={String(p.id)} className={`player-chip ${presentIds.includes(p.id) ? 'sel-1st' : ''}`}
            onClick={() => togglePresent(p.id)}>{p.name}</button>
        ))}
      </div>
      {presentIds.length > 0 && presentIds.length < minPlayersForVote && (
        <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 10 }}>
          Sélectionne au moins {minPlayersForVote} joueurs pour ce mode.
        </p>
      )}
      <p style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 8 }}>Mode pépite</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: pepiteCount === 3 ? 6 : 16 }}>
        {([2, 3] as const).map(n => (
          <button key={n} onClick={() => setPepiteCount(n)} style={{
            flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: pepiteCount === n ? 'var(--gold-fill)' : 'var(--bg3)',
            color: pepiteCount === n ? '#000' : 'var(--label2)',
          }}>
            {n === 2 ? '⭐ ⭐  2 pépites' : '⭐ ⭐ ⭐  3 pépites'}
          </button>
        ))}
      </div>
      {pepiteCount === 3 && (
        <p style={{ fontSize: 11, color: 'var(--label3)', marginBottom: 16 }}>
          Classement 3-2-1 pts · Recommandé pour les grandes équipes
        </p>
      )}
      <p id="vote-duration-label" style={{ fontSize: 13, color: 'var(--label3)', marginBottom: 8 }}>Fermeture du vote</p>
      <div role="group" aria-labelledby="vote-duration-label" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {VOTE_DURATIONS.map(d => (
          <button key={d.label} onClick={() => setVoteDuration(d.minutes)} aria-pressed={voteDuration === d.minutes} style={{
            flex: 1, padding: '10px 4px', borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: voteDuration === d.minutes ? 'var(--gold-fill)' : 'var(--bg3)',
            color: voteDuration === d.minutes ? '#000' : 'var(--label2)',
          }}>
            {d.label}
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-full"
        disabled={presentIds.length < minPlayersForVote || createMatchMutation.isPending}
        onClick={createMatch}>
        {createMatchMutation.isPending ? 'Lancement…' : `Lancer le vote · ${presentIds.length} joueur${presentIds.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  );
}
