import { useState, type CSSProperties } from 'react';
import { matchLabelSchema } from '@/schemas';
import { humanizeError } from '@/utils/errors';
import { isActive } from '@/utils/player';
import { track, EVENTS } from '@/utils/analytics';
import {
  buildManualResult, draftFromManualResult, hasManualPoints, manualPlayedAt, toDateInputValue,
  type ManualResultDraft,
} from '@/utils/manualResult';
import { useCreateManualMatch, useUpdateMatch } from '@/hooks/mutations';
import { activeTeamPlayerIds } from '@/components/admin/shared';
import type { EntityId, Match, Player, Team } from '@/types';
import { t, type TKey } from '@/i18n';

interface ManualResultFormProps {
  players: Player[];
  teams: Team[];
  /** Season the match is filed under (the one shown in the history). */
  season: number;
  orgId?: string | null;
  /** Editing a hand-entered match; creating one when absent. */
  match?: Match;
  onDone: (message: string) => void;
  onCancel: () => void;
}

const selectStyle: CSSProperties = {
  background: 'var(--bg3)', color: 'var(--label)', border: 'none',
  borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 15, width: '100%', outline: 'none',
};
const fieldLabelStyle: CSSProperties = { display: 'block', fontSize: 13, color: 'var(--label3)', marginBottom: 8 };
const pointsInputStyle: CSSProperties = { width: 64, padding: '8px 10px', fontSize: 14, textAlign: 'center' };

const PODIUM_LABELS: TKey[] = ['manualForm.place1', 'manualForm.place2', 'manualForm.place3'];

function emptyDraft(pepiteCount: 2 | 3): ManualResultDraft {
  return { bestIds: Array.from({ length: pepiteCount }, () => null), lemonId: null, bestPts: {}, lemonPts: {} };
}

/**
 * Result of a match played without a vote, entered afterwards from the
 * history: Pépite and Citron required, the rest of the podium and the point
 * totals when someone has them.
 */
export function ManualResultForm({ players, teams, season, orgId, match, onDone, onCancel }: ManualResultFormProps) {
  const editing = match?.manual_result != null;
  const initialDate = match ? toDateInputValue(new Date(match.created_at)) : toDateInputValue();

  const [label,       setLabel]       = useState(match?.label ?? '');
  const [date,        setDate]        = useState(initialDate);
  const [teamId,      setTeamId]      = useState<EntityId | null>(match?.team_id ?? null);
  const [presentIds,  setPresentIds]  = useState<EntityId[]>(match?.present_ids ?? []);
  const [pepiteCount, setPepiteCount] = useState<2 | 3>(match?.pepite_count ?? 2);
  const [draft,       setDraft]       = useState<ManualResultDraft>(() =>
    match?.manual_result ? draftFromManualResult(match.manual_result, match.pepite_count ?? 2) : emptyDraft(2));
  const [showPoints,  setShowPoints]  = useState(() => !!match?.manual_result && hasManualPoints(match.manual_result));
  const [error,       setError]       = useState<string | null>(null);

  const createMutation = useCreateManualMatch(orgId);
  const updateMutation = useUpdateMatch(orgId);
  const pending = createMutation.isPending || updateMutation.isPending;

  // Archived players stay pickable only if they already were in this match.
  const pickable = players.filter(p => isActive(p) || (match?.present_ids ?? []).includes(p.id));
  const activePlayers = players.filter(isActive);
  const present = pickable.filter(p => presentIds.includes(p.id));

  const change = (fn: (d: ManualResultDraft) => ManualResultDraft) => { setDraft(fn); setError(null); };

  const togglePresent = (id: EntityId) => {
    setPresentIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
    setError(null);
  };

  const pickTeam = (value: string) => {
    const team = teams.find(t => String(t.id) === value) ?? null;
    setTeamId(team?.id ?? null);
    if (team) setPresentIds(activeTeamPlayerIds(team, activePlayers));
  };

  const changePepiteCount = (n: 2 | 3) => {
    setPepiteCount(n);
    change(d => ({ ...d, bestIds: Array.from({ length: n }, (_, i) => d.bestIds[i] ?? null) }));
  };

  // Select values are strings: map back to the real id (int or uuid).
  const idFromValue = (value: string): EntityId | null =>
    pickable.find(p => String(p.id) === value)?.id ?? null;

  const save = () => {
    const parsedLabel = matchLabelSchema.safeParse({ label });
    if (!parsedLabel.success) { setError(parsedLabel.error.issues[0].message); return; }
    if (!date) { setError(t('manualForm.dateMissing')); return; }
    const { result, error: resultError } = buildManualResult(
      showPoints ? draft : { ...draft, bestPts: {}, lemonPts: {} },
      presentIds,
    );
    if (!result) { setError(resultError); return; }

    const onError = (err: unknown) => setError(humanizeError(err));
    const onSuccess = () => {
      track(EVENTS.MANUAL_RESULT_SAVED, { edited: editing, points: hasManualPoints(result), pepiteCount });
      onDone(t(editing ? 'manualForm.edited' : 'manualForm.added'));
    };

    if (editing && match) {
      updateMutation.mutate({
        id: match.id,
        data: {
          label: parsedLabel.data.label, team_id: teamId, present_ids: presentIds,
          pepite_count: pepiteCount, manual_result: result,
          // Keep the exact time unless the day itself was changed.
          ...(date !== initialDate ? { created_at: manualPlayedAt(date) } : {}),
        },
      }, { onSuccess, onError });
    } else {
      createMutation.mutate({
        label: parsedLabel.data.label, presentIds, teamId, season, pepiteCount,
        playedAt: manualPlayedAt(date), result,
      }, { onSuccess, onError });
    }
  };

  // The citron can be any present player; keep a stored one even if absent.
  const lemonOptions = draft.lemonId != null && !present.some(p => p.id === draft.lemonId)
    ? [...present, ...pickable.filter(p => p.id === draft.lemonId)]
    : present;

  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
        {t(editing ? 'manualForm.editTitle' : 'manualForm.addTitle')}
      </div>
      <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 14, lineHeight: 1.5 }}>
        {t('manualForm.intro')}
      </p>

      <label htmlFor="manual-label" style={fieldLabelStyle}>{t('manualForm.labelLabel')}</label>
      <input id="manual-label" value={label} placeholder={t('manualForm.labelPlaceholder')}
        onChange={e => { setLabel(e.target.value); setError(null); }} style={{ marginBottom: 12 }} />

      <label htmlFor="manual-date" style={fieldLabelStyle}>{t('manualForm.date')}</label>
      <input id="manual-date" type="date" value={date} max={toDateInputValue()}
        onChange={e => { setDate(e.target.value); setError(null); }} style={{ marginBottom: 12 }} />

      {teams.length > 0 && (
        <>
          <label htmlFor="manual-team" style={fieldLabelStyle}>{t('manualForm.team')}</label>
          <select id="manual-team" value={teamId != null ? String(teamId) : ''}
            onChange={e => pickTeam(e.target.value)} style={{ ...selectStyle, marginBottom: 12 }}>
            <option value="">{t('stats.noTeam')}</option>
            {teams.map(t => <option key={String(t.id)} value={String(t.id)}>{t.name}</option>)}
          </select>
        </>
      )}

      <div className="flex-between" style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 13, color: 'var(--label3)' }}>
          {t('manualForm.present')}
          {presentIds.length > 0 && <span style={{ color: 'var(--label2)', marginLeft: 6 }}>{presentIds.length}</span>}
        </p>
        <div className="flex gap-8">
          <button className="tag tag-dim" onClick={() => setPresentIds(pickable.map(p => p.id))}>{t('launcher.all')}</button>
          <button className="tag tag-dim" onClick={() => setPresentIds([])}>{t('launcher.none')}</button>
        </div>
      </div>
      <div className="player-grid" style={{ marginBottom: 14 }}>
        {pickable.map(p => (
          <button key={String(p.id)} aria-pressed={presentIds.includes(p.id)}
            className={`player-chip ${presentIds.includes(p.id) ? 'sel-1st' : ''}`}
            onClick={() => togglePresent(p.id)}>{p.name}</button>
        ))}
      </div>

      <p style={fieldLabelStyle}>{t('manualForm.podium')}</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {([2, 3] as const).map(n => (
          <button key={n} onClick={() => changePepiteCount(n)} aria-pressed={pepiteCount === n} style={{
            flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: pepiteCount === n ? 'var(--gold-fill)' : 'var(--bg3)',
            color: pepiteCount === n ? '#000' : 'var(--label2)',
          }}>
            {t('manualForm.pepites', { count: n })}
          </button>
        ))}
      </div>

      {draft.bestIds.map((id, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <label htmlFor={`manual-best-${i}`} style={{ ...fieldLabelStyle, color: i === 0 ? 'var(--gold)' : 'var(--label3)' }}>
            {t(PODIUM_LABELS[i])}
          </label>
          <select id={`manual-best-${i}`} value={id != null ? String(id) : ''} style={selectStyle}
            onChange={e => {
              const picked = idFromValue(e.target.value);
              change(d => ({ ...d, bestIds: d.bestIds.map((x, j) => j === i ? picked : x) }));
            }}>
            <option value="">{t(i === 0 ? 'manualForm.pickPepite' : 'manualForm.nobody')}</option>
            {present.map(p => <option key={String(p.id)} value={String(p.id)}>{p.name}</option>)}
          </select>
        </div>
      ))}

      <label htmlFor="manual-lemon" style={{ ...fieldLabelStyle, color: 'var(--lemon)' }}>{t('manualForm.citron')}</label>
      <select id="manual-lemon" value={draft.lemonId != null ? String(draft.lemonId) : ''} style={{ ...selectStyle, marginBottom: 14 }}
        onChange={e => { const picked = idFromValue(e.target.value); change(d => ({ ...d, lemonId: picked })); }}>
        <option value="">{t('manualForm.pickCitron')}</option>
        {lemonOptions.map(p => <option key={String(p.id)} value={String(p.id)}>{p.name}</option>)}
      </select>

      <button className="tag tag-dim" style={{ marginBottom: 12 }} aria-expanded={showPoints}
        onClick={() => setShowPoints(v => !v)}>
        {t(showPoints ? 'manualForm.removePoints' : 'manualForm.addPoints')}
      </button>

      {showPoints && (
        <div style={{ marginBottom: 14 }}>
          {present.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--label3)' }}>{t('manualForm.pickPresentFirst')}</p>
          ) : (
            <div className="group">
              <div className="row" style={{ paddingTop: 8, paddingBottom: 8 }}>
                <div className="row-body" style={{ fontSize: 12, color: 'var(--label3)' }}>{t('manualForm.matchPoints')}</div>
                <span style={{ ...pointsInputStyle, fontSize: 12, color: 'var(--gold)' }}>{t('manualForm.pepitePts')}</span>
                <span style={{ ...pointsInputStyle, fontSize: 12, color: 'var(--lemon)' }}>{t('manualForm.citronPts')}</span>
              </div>
              {present.map(p => (
                <div key={String(p.id)} className="row" style={{ gap: 8, paddingTop: 6, paddingBottom: 6 }}>
                  <div className="row-body"><div className="row-title" style={{ fontSize: 14 }}>{p.name}</div></div>
                  <input aria-label={t('manualForm.pepitePointsOf', { name: p.name })} type="number" min={0} inputMode="numeric"
                    value={draft.bestPts[String(p.id)] ?? ''} style={pointsInputStyle}
                    onChange={e => change(d => ({ ...d, bestPts: { ...d.bestPts, [String(p.id)]: e.target.value } }))} />
                  <input aria-label={t('manualForm.citronPointsOf', { name: p.name })} type="number" min={0} inputMode="numeric"
                    value={draft.lemonPts[String(p.id)] ?? ''} style={pointsInputStyle}
                    onChange={e => change(d => ({ ...d, lemonPts: { ...d.lemonPts, [String(p.id)]: e.target.value } }))} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</p>}

      <div className="flex gap-8">
        <button className="btn btn-secondary" onClick={onCancel} disabled={pending}>{t('common.cancel')}</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={pending}>
          {pending ? t('manualForm.saving') : t('manualForm.save')}
        </button>
      </div>
    </div>
  );
}
