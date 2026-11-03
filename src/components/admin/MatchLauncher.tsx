import { useRef, useState } from 'react';
import { matchLabelSchema } from '@/schemas';
import { track, EVENTS } from '@/utils/analytics';
import { VOTE_DURATIONS, deadlineFrom } from '@/utils/deadline';
import { defaultLaunchTeam, launchPlayerIds } from '@/utils/launcher';
import { defaultMatchLabel } from '@/utils/quickStart';
import { useMatches } from '@/hooks/queries';
import { useCreateMatch } from '@/hooks/mutations';
import type { EntityId, Player, Team } from '@/types';
import type { Notify } from './shared';
import { t } from '@/i18n';

interface MatchLauncherProps {
  activePlayers: Player[];
  teams: Team[];
  currentSeason: number;
  orgId?: string;
  notify: Notify;
  /** Called once a match is open (feeds the setup checklist). */
  onLaunched: () => void;
}

/**
 * « Lancer un vote » → « Maintenant » form. In the usual case the organiser just taps « Lancer »:
 * the name is optional (« Match du 3 nov. »), the line-up is the last vote's
 * team, and the player list, pépite mode and duration stay folded.
 */
export function MatchLauncher({ activePlayers, teams, currentSeason, orgId, notify, onLaunched }: MatchLauncherProps) {
  const [matchLabel,   setMatchLabel]   = useState('');
  const [matchError,   setMatchError]   = useState<string | null>(null);
  // undefined: not picked yet, follow the last vote's team once loaded.
  const [teamChoice,   setTeamChoice]   = useState<EntityId | null | undefined>(undefined);
  // null: the team's list as is; set once a player is toggled.
  const [customIds,    setCustomIds]    = useState<EntityId[] | null>(null);
  const [playersOpen,  setPlayersOpen]  = useState(false);
  const [optionsOpen,  setOptionsOpen]  = useState(false);
  const [pepiteCount,  setPepiteCount]  = useState<2 | 3>(2);
  const [voteDuration, setVoteDuration] = useState<number | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const { data: matches = [] } = useMatches(orgId);
  const createMatchMutation = useCreateMatch(orgId);

  const teamId     = teamChoice === undefined ? defaultLaunchTeam(teams, matches) : teamChoice;
  const presentIds = customIds ?? launchPlayerIds(teamId, teams, activePlayers);
  const isPresent  = (id: EntityId) => presentIds.some(x => String(x) === String(id));

  // Each voter picks pepiteCount others: the squad needs pepiteCount + 1.
  const minPlayersForVote = pepiteCount + 1;
  const placeholder = defaultMatchLabel();

  const pickTeam = (value: string) => {
    setTeamChoice(teams.find(tm => String(tm.id) === value)?.id ?? null);
    setCustomIds(null);
  };
  const togglePresent = (id: EntityId) => setCustomIds(
    isPresent(id) ? presentIds.filter(x => String(x) !== String(id)) : [...presentIds, id],
  );

  const createMatch = () => {
    const result = matchLabelSchema.safeParse({ label: matchLabel.trim() || placeholder });
    if (!result.success) {
      setMatchError(result.error.issues[0].message);
      labelInputRef.current?.focus();
      labelInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (presentIds.length < minPlayersForVote) return;
    setMatchError(null);
    createMatchMutation.mutate(
      {
        label: result.data.label, presentIds, teamId, season: currentSeason, pepiteCount,
        voteDeadline: deadlineFrom(Date.now(), voteDuration),
      },
      {
        onSuccess: () => {
          track(EVENTS.MATCH_CREATED, { playerCount: presentIds.length, pepiteCount, voteDuration: voteDuration ?? 0 });
          setMatchLabel(''); setCustomIds(null); setPlayersOpen(false);
          notify(t('launcher.opened'));
          onLaunched();
        },
      }
    );
  };

  const fieldLabel = { display: 'block', fontSize: 13, color: 'var(--label3)', marginBottom: 8 } as const;
  const chip = (on: boolean) => ({
    flex: 1, padding: '10px 4px', borderRadius: 'var(--radius-sm)',
    fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
    background: on ? 'var(--gold-fill)' : 'var(--bg3)',
    color: on ? '#000' : 'var(--label2)',
  });
  const linkButton = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontSize: 13, fontWeight: 600, color: 'var(--gold)',
  } as const;
  const durationLabel = t(VOTE_DURATIONS.find(d => d.minutes === voteDuration)?.label ?? 'deadline.none');

  return (
    <div className="group" style={{ padding: '14px 16px' }}>
      <label htmlFor="admin-match-label" style={fieldLabel}>{t('launcher.labelLabel')}</label>
      <input id="admin-match-label" ref={labelInputRef} placeholder={placeholder} value={matchLabel}
        onChange={e => { setMatchLabel(e.target.value); setMatchError(null); }}
        style={{ marginBottom: matchError ? 4 : 14, borderColor: matchError ? 'var(--red)' : undefined }} />
      {matchError && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{matchError}</p>}

      {teams.length > 0 && (
        <>
          <label htmlFor="admin-match-team" style={fieldLabel}>{t('launcher.lineup')}</label>
          <select className="field-select" id="admin-match-team" value={teamId != null ? String(teamId) : ''} onChange={e => pickTeam(e.target.value)}
            style={{ marginBottom: 14 }}>
            <option value="">{t('launcher.teamPlayers', { team: t('schedule.allSquad'), count: activePlayers.length })}</option>
            {teams.map(tm => (
              <option key={String(tm.id)} value={String(tm.id)}>
                {t('launcher.teamPlayers', { team: tm.name, count: launchPlayerIds(tm.id, teams, activePlayers).length })}
              </option>
            ))}
          </select>
        </>
      )}

      <div className="flex-between" style={{ marginBottom: playersOpen ? 8 : 14 }}>
        <span style={{ fontSize: 13, color: 'var(--label2)' }}>{t('launcher.present', { count: presentIds.length })}</span>
        <button type="button" style={linkButton} aria-expanded={playersOpen} onClick={() => setPlayersOpen(o => !o)}>
          {playersOpen ? t('launcher.done') : t('launcher.edit')}
        </button>
      </div>
      {playersOpen && (
        <>
          <div className="flex gap-8" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
            <button className="tag tag-dim" onClick={() => setCustomIds(activePlayers.map(p => p.id))}>{t('launcher.all')}</button>
            <button className="tag tag-dim" onClick={() => setCustomIds([])}>{t('launcher.none')}</button>
          </div>
          <div className="player-grid" style={{ marginBottom: 14 }}>
            {activePlayers.map(p => (
              <button key={String(p.id)} className={`player-chip ${isPresent(p.id) ? 'sel-1st' : ''}`}
                aria-pressed={isPresent(p.id)} onClick={() => togglePresent(p.id)}>{p.name}</button>
            ))}
          </div>
        </>
      )}
      {presentIds.length < minPlayersForVote && (
        <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 10 }}>
          {t('launcher.minPlayers', { min: minPlayersForVote })}
        </p>
      )}

      <button type="button" aria-expanded={optionsOpen} onClick={() => setOptionsOpen(o => !o)}
        className="flex-between" style={{ ...linkButton, width: '100%', marginBottom: 14, color: 'var(--label3)', fontWeight: 400 }}>
        <span>{t('launcher.options')}</span>
        <span style={{ color: 'var(--label2)' }}>
          {t(pepiteCount === 2 ? 'launcher.twoShort' : 'launcher.threeShort')} · {durationLabel} {optionsOpen ? '▲' : '▼'}
        </span>
      </button>
      {optionsOpen && (
        <>
          <p style={fieldLabel}>{t('launcher.mode')}</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: pepiteCount === 3 ? 6 : 14 }}>
            {([2, 3] as const).map(n => (
              <button key={n} onClick={() => setPepiteCount(n)} aria-pressed={pepiteCount === n} style={chip(pepiteCount === n)}>
                {t(n === 2 ? 'launcher.two' : 'launcher.three')}
              </button>
            ))}
          </div>
          {pepiteCount === 3 && (
            <p style={{ fontSize: 11, color: 'var(--label3)', marginBottom: 14 }}>{t('launcher.threeHint')}</p>
          )}
          <p id="vote-duration-label" style={fieldLabel}>{t('launcher.closing')}</p>
          <div role="group" aria-labelledby="vote-duration-label" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {VOTE_DURATIONS.map(d => (
              <button key={d.label} onClick={() => setVoteDuration(d.minutes)} aria-pressed={voteDuration === d.minutes}
                style={chip(voteDuration === d.minutes)}>
                {t(d.label)}
              </button>
            ))}
          </div>
        </>
      )}

      <button className="btn btn-primary btn-full"
        disabled={presentIds.length < minPlayersForVote || createMatchMutation.isPending}
        onClick={createMatch}>
        {createMatchMutation.isPending ? t('launcher.launching') : t('launcher.launch', { count: presentIds.length })}
      </button>
    </div>
  );
}
