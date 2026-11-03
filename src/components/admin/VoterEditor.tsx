import { useState } from 'react';
import { humanizeError } from '@/utils/errors';
import { isActive } from '@/utils/player';
import { lockedVoterIds, minVoters, voterEditProblem } from '@/utils/voters';
import { track, EVENTS } from '@/utils/analytics';
import { useSetMatchVoters } from '@/hooks/mutations';
import type { EntityId, Match, Player, Vote } from '@/types';
import type { Notify } from './shared';
import { t } from '@/i18n';

interface VoterEditorProps {
  match: Match;
  players: Player[];
  /** Ballots with identities (admins); a captain gets none and relies on the server. */
  votes: Vote[];
  orgId?: string;
  notify: Notify;
  onDone: () => void;
}

/**
 * Voting phase: who votes. A scheduled vote opens with the whole squad, so
 * the organiser removes the absent and adds the latecomers. The server
 * (set_match_voters) has the last word; the locks here only spare a refusal.
 */
export function VoterEditor({ match, players, votes, orgId, notify, onDone }: VoterEditorProps) {
  const [selected, setSelected] = useState<EntityId[]>(match.present_ids);
  const setVotersMutation = useSetMatchVoters(orgId);

  const pepiteCount = match.pepite_count ?? 2;
  const locked   = lockedVoterIds(votes);
  const isIn     = (id: EntityId) => selected.some(s => String(s) === String(id));
  // Archived players stay pickable only if they are already in the list.
  const pickable = players.filter(p => isActive(p) || match.present_ids.some(id => String(id) === String(p.id)));
  const problem  = voterEditProblem(selected, votes, pepiteCount);
  const changed  = selected.length !== match.present_ids.length || match.present_ids.some(id => !isIn(id));

  const toggle = (p: Player) => {
    if (isIn(p.id)) {
      if (locked.has(String(p.id))) return;
      setSelected(s => s.filter(id => String(id) !== String(p.id)));
    } else {
      setSelected(s => [...s, p.id]);
    }
  };

  const save = () => {
    const before = match.present_ids.length;
    setVotersMutation.mutate({ id: match.id, playerIds: selected }, {
      onSuccess: () => {
        track(EVENTS.VOTERS_EDITED, { before, after: selected.length, scheduled: match.schedule_id != null });
        notify(t('activeMatch.votersSaved'));
        onDone();
      },
      onError: (err) => notify(humanizeError(err)),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
      <p style={{ fontSize: 12, color: 'var(--label3)', lineHeight: 1.5 }}>{t('activeMatch.editVotersHint')}</p>
      <div className="player-grid">
        {pickable.map(p => {
          const on = isIn(p.id);
          const lockedOn = on && locked.has(String(p.id));
          return (
            <button key={String(p.id)} className={`player-chip ${on ? 'sel-1st' : ''}`}
              aria-pressed={on} aria-disabled={lockedOn || undefined}
              title={lockedOn ? t('activeMatch.lockedVoter', { name: p.name }) : undefined}
              aria-label={lockedOn ? t('activeMatch.lockedVoter', { name: p.name }) : undefined}
              onClick={() => toggle(p)}>
              {lockedOn ? '🔒 ' : ''}{p.name}
            </button>
          );
        })}
      </div>
      {problem === 'tooFew' && (
        <p style={{ fontSize: 12, color: 'var(--label3)' }}>{t('activeMatch.tooFewVoters', { min: minVoters(pepiteCount) })}</p>
      )}
      <button className="btn btn-primary btn-full" onClick={save}
        disabled={!changed || problem != null || setVotersMutation.isPending}>
        {setVotersMutation.isPending ? t('activeMatch.savingVoters') : t('activeMatch.saveVoters', { count: selected.length })}
      </button>
    </div>
  );
}
