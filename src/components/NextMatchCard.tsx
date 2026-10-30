import { useState } from 'react';
import { getLang, t } from '@/i18n';
import { track, EVENTS } from '@/utils/analytics';
import { formatClockTime } from '@/utils/deadline';
import { humanizeError } from '@/utils/errors';
import {
  DEFAULT_VOTE_OPEN_DELAY, buildScheduleInput, formatDelay, formatKickOff, guessIntervalWeeks,
  localDateKey, suggestNextKickOff,
} from '@/utils/schedule';
import { useMatches, useTeams, useUpcomingSchedules, useVoteOpenDelay } from '@/hooks/queries';
import { useCreateSchedule, useSkipNextOccurrence } from '@/hooks/mutations';
import { useConfirm } from '@/hooks/useConfirm';
import { ScheduleMatchForm } from '@/components/admin/ScheduleMatchForm';
import type { Match } from '@/types';

interface NextMatchCardProps {
  /** Undefined in the demo. */
  orgId?: string | null;
  match: Match;
}

const dismissKey = (orgId?: string | null) => `pepite_next_match_dismissed_${orgId ?? 'demo'}`;

function readDismissed(orgId?: string | null): string | null {
  try { return localStorage.getItem(dismissKey(orgId)); } catch { return null; }
}

const chip = (on: boolean) => ({
  padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
  background: on ? 'var(--gold-fill)' : 'var(--bg3)', color: on ? '#000' : 'var(--label2)',
  border: 'none', cursor: 'pointer',
});

/**
 * « Prochain match ? » under the podium (organisers): the next vote, already
 * scheduled (with « Pas ce jour-là » for a break), or one tap to schedule it
 * from this match: same day and time one or two weeks on, same line-up.
 * « Pas de match prévu » hides it until the next podium.
 */
export function NextMatchCard({ orgId, match }: NextMatchCardProps) {
  const { data: schedules, isLoading } = useUpcomingSchedules(orgId);
  const { data: savedDelay, isLoading: delayLoading } = useVoteOpenDelay(orgId);
  const { data: matches = [] } = useMatches(orgId);
  const { data: teams = [] } = useTeams(orgId);
  const createSchedule = useCreateSchedule(orgId);
  const skipNext = useSkipNextOccurrence(orgId);
  const { confirm, confirmDialog } = useConfirm();

  const [weeks,     setWeeks]     = useState<1 | 2 | null>(null);
  const [repeat,    setRepeat]    = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [dismissed, setDismissed] = useState(() => readDismissed(orgId) === String(match.id));
  const [message,   setMessage]   = useState<string | null>(null);

  if (isLoading || delayLoading || dismissed) return null;

  const delay = savedDelay ?? DEFAULT_VOTE_OPEN_DELAY;
  const box = {
    background: 'var(--bg2)', border: '1px solid var(--separator2)',
    borderRadius: 'var(--radius-lg)', padding: 16,
  } as const;
  const title = { fontSize: 15, fontWeight: 700, marginBottom: 4 } as const;
  const hint  = { fontSize: 13, color: 'var(--label3)', lineHeight: 1.5 } as const;

  const next = schedules?.[0];
  if (next) {
    const repeating = next.weekday != null;
    const when = formatKickOff(next.next_kick_off);
    const skip = async () => {
      if (!(await confirm({
        message: t('schedule.skipConfirm', { when }),
        confirmLabel: t('schedule.skipMatch'), cancelLabel: t('schedule.keep'),
      }))) return;
      skipNext.mutate(next.id, {
        onSuccess: (after) => {
          track(EVENTS.SCHEDULE_SKIPPED, { every_weeks: next.interval_weeks });
          setMessage(after ? t('schedule.skippedNext', { when: formatKickOff(after) }) : t('schedule.skipped'));
        },
        onError: (err) => setMessage(humanizeError(err)),
      });
    };
    return (
      <div style={box}>
        {confirmDialog}
        <div style={title}>{t('nextMatch.planned', { when })}</div>
        <p style={hint}>{t('nextMatch.opensAt', { time: formatClockTime(next.opens_at) })}</p>
        {message && <p role="status" style={{ ...hint, color: 'var(--label2)', marginTop: 8 }}>{message}</p>}
        {repeating && (
          <button className="btn btn-secondary btn-full" style={{ marginTop: 12, fontSize: 14 }}
            disabled={skipNext.isPending} onClick={() => void skip()}>
            {t('nextMatch.skip')}
          </button>
        )}
      </div>
    );
  }

  const chosenWeeks = weeks ?? guessIntervalWeeks(
    matches.filter(m => m.id !== match.id).map(m => m.created_at).concat(match.created_at),
  );
  const kickOff = suggestNextKickOff(match, chosenWeeks, delay);
  const date = localDateKey(kickOff);
  const time = `${String(kickOff.getHours()).padStart(2, '0')}:${String(kickOff.getMinutes()).padStart(2, '0')}`;
  const pepiteCount = match.pepite_count === 3 ? 3 : 2;
  const repeatValue = repeat ? chosenWeeks : 0;

  const dismiss = () => {
    track(EVENTS.NEXT_MATCH_DISMISSED);
    try { localStorage.setItem(dismissKey(orgId), String(match.id)); } catch { /* private mode */ }
    setDismissed(true);
  };

  const schedule = () => {
    const { input, error } = buildScheduleInput(
      { date, time, repeat: repeatValue, label: '', teamId: match.team_id ?? null, pepiteCount },
      { delayMinutes: delay, locale: getLang() },
    );
    if (!input) { setMessage(error ? t(error) : null); return; }
    createSchedule.mutate({ input, delayMinutes: savedDelay == null ? delay : undefined }, {
      onSuccess: () => track(EVENTS.NEXT_MATCH_SCHEDULED, { every_weeks: repeatValue, edited: false }),
      onError: (err) => setMessage(humanizeError(err)),
    });
  };

  if (editing) {
    return (
      <div>
        <div style={{ ...title, margin: '0 4px 8px' }}>{t('nextMatch.title')}</div>
        <ScheduleMatchForm
          teams={teams} orgId={orgId ?? undefined} notify={setMessage}
          initial={{ date, time, repeat: repeatValue, teamId: match.team_id ?? null, pepiteCount }}
          onScheduled={() => track(EVENTS.NEXT_MATCH_SCHEDULED, { every_weeks: repeatValue, edited: true })}
        />
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={title}>{t('nextMatch.title')}</div>
      <p style={{ ...hint, marginBottom: 12 }}>{t('nextMatch.intro')}</p>

      <div role="group" aria-label={t('nextMatch.title')} style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {([1, 2] as const).map(n => (
          <button key={n} type="button" aria-pressed={chosenWeeks === n} onClick={() => setWeeks(n)} style={chip(chosenWeeks === n)}>
            {t(n === 1 ? 'nextMatch.inOneWeek' : 'nextMatch.inTwoWeeks')}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--gold)', marginBottom: 10 }}>
        {formatKickOff(kickOff.toISOString())}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--label)', marginBottom: 6, cursor: 'pointer' }}>
        <input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)}
          style={{ width: 20, height: 20, accentColor: 'var(--gold-fill)' }} />
        {t(chosenWeeks === 2 ? 'nextMatch.repeatTwoWeeks' : 'nextMatch.repeatWeekly')}
      </label>
      <p style={{ ...hint, fontSize: 12, marginBottom: 12 }}>{t('schedule.delayHint', { delay: formatDelay(delay) })}</p>

      {message && <p role="alert" style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{message}</p>}

      <button className="btn btn-primary btn-full" onClick={schedule} disabled={createSchedule.isPending}>
        {createSchedule.isPending ? t('schedule.submitting') : t('nextMatch.schedule')}
      </button>
      <button className="btn btn-secondary btn-full" style={{ marginTop: 8, fontSize: 14 }} onClick={() => setEditing(true)}>
        {t('nextMatch.edit')}
      </button>
      <button onClick={dismiss} style={{
        display: 'block', margin: '10px auto 0', padding: '8px 12px',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, color: 'var(--label3)', textDecoration: 'underline',
      }}>
        {t('nextMatch.dismiss')}
      </button>
    </div>
  );
}
