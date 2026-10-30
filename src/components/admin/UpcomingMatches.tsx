import { useState } from 'react';
import { t } from '@/i18n';
import { formatClockTime } from '@/utils/deadline';
import { humanizeError } from '@/utils/errors';
import { formatKickOff, weekdayName } from '@/utils/schedule';
import { useUpcomingSchedules } from '@/hooks/queries';
import { useDeleteSchedule, useOpenScheduleNow, useSkipNextOccurrence } from '@/hooks/mutations';
import { track, EVENTS } from '@/utils/analytics';
import type { MatchSchedule } from '@/types';
import { sectionLabelStyle, type ConfirmFn, type Notify } from './shared';

interface UpcomingMatchesProps {
  orgId?: string;
  notify: Notify;
  confirm: ConfirmFn;
  /** Admins and captains cancel; others only see the list. */
  canManage: boolean;
  /** No vote in progress: a match that ended early can open now. */
  canOpenNow: boolean;
  /** A vote was opened now (feeds the setup checklist). */
  onOpened?: () => void;
  /** During a vote: shown after the vote panel instead of on top. */
  below?: boolean;
}

/**
 * The next scheduled match (20260021), on top of the Admin so nobody
 * schedules it twice; the others behind « + N autres », still cancellable.
 */
export function UpcomingMatches({ orgId, notify, confirm, canManage, canOpenNow, onOpened, below = false }: UpcomingMatchesProps) {
  const [showOthers, setShowOthers] = useState(false);
  const { data: schedules = [] } = useUpcomingSchedules(orgId);
  const deleteSchedule = useDeleteSchedule(orgId);
  const openNow = useOpenScheduleNow(orgId);
  const skipNext = useSkipNextOccurrence(orgId);
  if (schedules.length === 0) return null;

  // Winter break, school holidays: no match that day, the next ones stay.
  const skip = async (s: MatchSchedule) => {
    const when = formatKickOff(s.next_kick_off);
    if (!(await confirm({
      message: t('schedule.skipConfirm', { when }),
      confirmLabel: t('schedule.skipMatch'), cancelLabel: t('schedule.keep'),
    }))) return;
    skipNext.mutate(s.id, {
      onSuccess: (next) => {
        track(EVENTS.SCHEDULE_SKIPPED, { every_weeks: s.interval_weeks });
        notify(next ? t('schedule.skippedNext', { when: formatKickOff(next) }) : t('schedule.skipped'));
      },
      onError: (err) => notify(humanizeError(err)),
    });
  };

  const open = (s: MatchSchedule) => openNow.mutate(s.id, {
    onSuccess: () => {
      track(EVENTS.SCHEDULE_OPENED_NOW, { weekly: s.weekday != null });
      notify(t('launcher.opened'));
      onOpened?.();
    },
    onError: (err) => notify(humanizeError(err)),
  });

  const cancel = async (s: MatchSchedule) => {
    const weekly = s.weekday != null;
    if (!(await confirm({
      message: t(weekly ? 'schedule.stopConfirm' : 'schedule.cancelConfirm'),
      confirmLabel: t(weekly ? 'schedule.stopMatch' : 'schedule.cancelMatch'),
      cancelLabel: t('schedule.keep'), danger: true,
    }))) return;
    deleteSchedule.mutate(s.id, {
      onSuccess: () => notify(t('schedule.cancelled')),
      onError: (err) => notify(humanizeError(err)),
    });
  };

  return (
    <div style={below ? { marginTop: 16 } : { marginBottom: 16 }}>
      <p style={sectionLabelStyle}>{t('schedule.nextMatch')}</p>
      <div className="group">
        {(showOthers ? schedules : schedules.slice(0, 1)).map(s => {
          const weekly = s.weekday != null && s.start_time != null;
          const every = weekly
            ? t(s.interval_weeks === 2 ? 'schedule.everyOther' : 'schedule.weeklyEvery',
                { day: weekdayName(s.weekday as number), time: s.start_time as string })
            : null;
          const title = s.label ?? every ?? formatKickOff(s.next_kick_off);
          const sub = [
            s.label ? every : null,
            weekly || s.label ? t('schedule.next', { when: formatKickOff(s.next_kick_off) }) : null,
            t('schedule.voteAt', { time: formatClockTime(s.opens_at) }),
          ].filter(Boolean).join(' · ');
          return (
            <div key={String(s.id)} className="row">
              <div className="row-body">
                <div className="row-title">{weekly ? '🔁 ' : '📅 '}{title}</div>
                <div className="row-sub">{sub}</div>
              </div>
              {canManage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {canOpenNow && (
                    <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 13 }}
                      disabled={openNow.isPending} onClick={() => open(s)}>
                      {t('schedule.openNow')}
                    </button>
                  )}
                  {weekly && (
                    <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}
                      disabled={skipNext.isPending} onClick={() => void skip(s)}>
                      {t('schedule.skip')}
                    </button>
                  )}
                  <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}
                    disabled={deleteSchedule.isPending} onClick={() => void cancel(s)}>
                    {t(weekly ? 'schedule.stop' : 'schedule.cancel')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {schedules.length > 1 && (
        <button aria-expanded={showOthers} onClick={() => setShowOthers(o => !o)} style={{
          display: 'block', margin: '-4px auto 0', padding: '8px 12px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--label3)', textDecoration: 'underline',
        }}>
          {showOthers ? t('schedule.hideOthers') : t('schedule.moreScheduled', { count: schedules.length - 1 })}
        </button>
      )}
    </div>
  );
}
