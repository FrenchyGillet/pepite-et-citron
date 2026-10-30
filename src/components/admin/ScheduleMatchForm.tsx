import { useState } from 'react';
import { getLang, t } from '@/i18n';
import { track, EVENTS } from '@/utils/analytics';
import { humanizeError } from '@/utils/errors';
import {
  DEFAULT_VOTE_OPEN_DELAY, VOTE_OPEN_DELAYS, buildScheduleInput, formatDelay, localDateKey, weekdayName,
  type ScheduleForm,
} from '@/utils/schedule';
import { useVoteOpenDelay } from '@/hooks/queries';
import { useCreateSchedule } from '@/hooks/mutations';
import type { Team } from '@/types';
import type { Notify } from './shared';

interface ScheduleMatchFormProps {
  teams: Team[];
  orgId?: string;
  notify: Notify;
  /** Prefilled values (« Prochain match ? » under the podium). */
  initial?: Partial<ScheduleForm>;
  onScheduled?: () => void;
}

const fieldLabel = { display: 'block', fontSize: 13, color: 'var(--label3)', marginBottom: 8 } as const;
const chip = (on: boolean) => ({
  padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
  background: on ? 'var(--gold-fill)' : 'var(--bg3)', color: on ? '#000' : 'var(--label2)',
  border: 'none', cursor: 'pointer',
});

/**
 * "Programmer": a match whose vote opens on its own at kick-off + the team's
 * delay (20260021), once or every one or two weeks (20260025). The delay is
 * asked the first time, then kept.
 */
export function ScheduleMatchForm({ teams, orgId, notify, initial, onScheduled }: ScheduleMatchFormProps) {
  const [date,        setDate]        = useState(() => initial?.date ?? localDateKey(new Date()));
  const [time,        setTime]        = useState(initial?.time ?? '20:00');
  const [repeat,      setRepeat]      = useState<0 | 1 | 2>(initial?.repeat ?? 0);
  const [label,       setLabel]       = useState(initial?.label ?? '');
  const [teamId,      setTeamId]      = useState<string | null>(initial?.teamId != null ? String(initial.teamId) : null);
  const [pepiteCount, setPepiteCount] = useState<2 | 3>(initial?.pepiteCount ?? 3);
  const [askedDelay,  setAskedDelay]  = useState(DEFAULT_VOTE_OPEN_DELAY);
  const [error,       setError]       = useState<string | null>(null);

  const { data: savedDelay, isLoading } = useVoteOpenDelay(orgId);
  const createSchedule = useCreateSchedule(orgId);
  const mustAskDelay = !isLoading && savedDelay == null;
  const delay = savedDelay ?? askedDelay;

  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`).getDay() : null;

  const submit = () => {
    const team = teams.find(tm => String(tm.id) === teamId);
    const { input, error: problem } = buildScheduleInput(
      { date, time, repeat, label, teamId: team?.id ?? null, pepiteCount },
      { delayMinutes: delay, locale: getLang() },
    );
    if (!input) { setError(problem ? t(problem) : null); return; }
    setError(null);
    createSchedule.mutate({ input, delayMinutes: mustAskDelay ? askedDelay : undefined }, {
      onSuccess: () => {
        track(EVENTS.MATCH_SCHEDULED, { weekly: repeat > 0, every_weeks: repeat, delay, lineup: !!team });
        notify(t('schedule.scheduled'));
        setLabel('');
        onScheduled?.();
      },
      onError: (err) => setError(humanizeError(err)),
    });
  };

  return (
    <div className="group" style={{ padding: '14px 16px' }}>
      <p style={{ fontSize: 13, color: 'var(--label2)', lineHeight: 1.5, marginBottom: 14 }}>{t('schedule.intro')}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="schedule-date" style={fieldLabel}>{t('schedule.date')}</label>
          <input id="schedule-date" type="date" value={date} onChange={e => { setDate(e.target.value); setError(null); }} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="schedule-time" style={fieldLabel}>{t('schedule.time')}</label>
          <input id="schedule-time" type="time" value={time} onChange={e => { setTime(e.target.value); setError(null); }} />
        </div>
      </div>

      <p id="schedule-repeat-label" style={fieldLabel}>
        {day != null ? t('schedule.repeatOn', { day: weekdayName(day) }) : t('schedule.repeat')}
      </p>
      <div role="group" aria-labelledby="schedule-repeat-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {([0, 1, 2] as const).map(n => (
          <button key={n} type="button" aria-pressed={repeat === n} onClick={() => { setRepeat(n); setError(null); }} style={chip(repeat === n)}>
            {t(n === 0 ? 'schedule.once' : n === 1 ? 'schedule.everyWeek' : 'schedule.everyTwoWeeks')}
          </button>
        ))}
      </div>

      <label htmlFor="schedule-label" style={fieldLabel}>{t('schedule.labelLabel')}</label>
      <input id="schedule-label" placeholder={t('schedule.labelPlaceholder')} value={label} maxLength={100}
        onChange={e => setLabel(e.target.value)} style={{ marginBottom: 14 }} />

      {teams.length > 0 && (
        <>
          <label htmlFor="schedule-team" style={fieldLabel}>{t('schedule.present')}</label>
          <select id="schedule-team" value={teamId ?? ''} onChange={e => setTeamId(e.target.value || null)} style={{ marginBottom: 14 }}>
            <option value="">{t('schedule.allSquad')}</option>
            {teams.map(tm => <option key={String(tm.id)} value={String(tm.id)}>{tm.name}</option>)}
          </select>
        </>
      )}

      <p style={fieldLabel}>{t('launcher.mode')}</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {([2, 3] as const).map(n => (
          <button key={n} type="button" aria-pressed={pepiteCount === n} onClick={() => setPepiteCount(n)} style={chip(pepiteCount === n)}>
            {t(n === 2 ? 'launcher.two' : 'launcher.three')}
          </button>
        ))}
      </div>

      {mustAskDelay ? (
        <>
          <p id="schedule-delay-label" style={{ ...fieldLabel, color: 'var(--label)', fontWeight: 600 }}>{t('schedule.delayQuestion')}</p>
          <div role="group" aria-labelledby="schedule-delay-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {VOTE_OPEN_DELAYS.map(m => (
              <button key={m} type="button" aria-pressed={askedDelay === m} onClick={() => setAskedDelay(m)} style={chip(askedDelay === m)}>
                {formatDelay(m)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 14 }}>{t('schedule.delayHint', { delay: formatDelay(delay) })}</p>
      )}

      {error && <p role="alert" style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</p>}

      <button className="btn btn-primary btn-full" onClick={submit} disabled={createSchedule.isPending || isLoading}>
        {createSchedule.isPending ? t('schedule.submitting') : t('schedule.submit')}
      </button>
    </div>
  );
}
