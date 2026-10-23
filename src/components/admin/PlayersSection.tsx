import { useState } from 'react';
import { track, EVENTS } from '@/utils/analytics';
import { humanizeError } from '@/utils/errors';
import { isActive, parsePlayerNames } from '@/utils/player';
import { useAddPlayers, useRemovePlayer, useSetPlayerArchived } from '@/hooks/mutations';
import type { Player, Team } from '@/types';
import { sectionLabelStyle, type ConfirmFn, type Notify } from './shared';
import { t } from '@/i18n';

interface PlayersSectionProps {
  players: Player[];
  teams: Team[];
  orgId?: string;
  notify: Notify;
  confirm: ConfirmFn;
}

/** Roster: add one or several players, archive, reactivate, delete. */
export function PlayersSection({ players, teams, orgId, notify, confirm }: PlayersSectionProps) {
  const [newPlayer,    setNewPlayer]    = useState('');
  const [bulkOpen,     setBulkOpen]     = useState(false);
  const [bulkText,     setBulkText]     = useState('');
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [playerError,  setPlayerError]  = useState<string | null>(null);

  const addPlayersMutation   = useAddPlayers(orgId);
  const removePlayerMutation = useRemovePlayer(orgId);
  const setArchivedMutation  = useSetPlayerArchived(orgId);

  // Archived players keep their history but leave every picker.
  const activePlayers   = players.filter(isActive);
  const archivedPlayers = players.filter(p => !isActive(p));

  // The single field and the pasted list go through the same parser: names
  // are split on new lines / commas, and repeats are reported, not re-added.
  const addPlayers = (text: string, onDone: () => void) => {
    const { toAdd, existing, archived, tooLong } = parsePlayerNames(text, players);
    const skipped = [
      existing.length ? t('players.alreadyIn', { names: existing.join(', ') }) : '',
      archived.length ? t('players.archivedReactivate', { names: archived.join(', ') }) : '',
      tooLong.length  ? t('players.tooLong', { names: tooLong.join(', ') }) : '',
    ].filter(Boolean).join(' · ');
    if (toAdd.length === 0) { setPlayerError(skipped ? t('players.nothingToAdd', { reasons: skipped }) : t('validation.nameRequired')); return; }
    setPlayerError(null);
    addPlayersMutation.mutate(toAdd, {
      onSuccess: () => {
        track(EVENTS.PLAYER_ADDED, { count: toAdd.length });
        const added = toAdd.length === 1 ? t('players.addedOne', { name: toAdd[0] }) : t('players.addedMany', { count: toAdd.length });
        notify(skipped ? `${added} · ${skipped}` : added);
        onDone();
      },
      onError: (err) => { notify(humanizeError(err)); console.error('addPlayers:', err); },
    });
  };

  const onPlayerError = (err: unknown) => notify(humanizeError(err));

  const archivePlayer = async (p: Player) => {
    if (!(await confirm({
      message: t('players.archiveConfirm', { name: p.name }),
      confirmLabel: t('players.archive'),
    }))) return;
    setArchivedMutation.mutate({ id: p.id, archived: true }, { onSuccess: () => notify(t('players.archived', { name: p.name })), onError: onPlayerError });
  };

  const reactivatePlayer = (p: Player) =>
    setArchivedMutation.mutate({ id: p.id, archived: false }, { onSuccess: () => notify(t('players.reactivated', { name: p.name })), onError: onPlayerError });

  const deletePlayer = async (p: Player) => {
    if (!(await confirm({
      message: t('players.deleteConfirm', { name: p.name }),
      confirmLabel: t('players.delete'), danger: true,
    }))) return;
    removePlayerMutation.mutate(p.id, { onSuccess: () => notify(t('players.deleted', { name: p.name })), onError: onPlayerError });
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={sectionLabelStyle}>Joueurs · {activePlayers.length}</p>
      <div className="flex gap-8" style={{ marginBottom: 8 }}>
        <input aria-label={t('players.nameLabel')} placeholder={t('players.nameLabel')} value={newPlayer}
          onChange={e => { setNewPlayer(e.target.value); setPlayerError(null); }}
          onKeyDown={e => e.key === 'Enter' && addPlayers(newPlayer, () => setNewPlayer(''))}
          style={{ borderColor: playerError ? 'var(--red)' : undefined }} />
        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '12px 16px' }}
          disabled={addPlayersMutation.isPending}
          onClick={() => addPlayers(newPlayer, () => setNewPlayer(''))}>{t('players.add')}</button>
      </div>
      <button className="tag tag-dim" style={{ fontSize: 13, padding: '7px 12px', marginBottom: 12 }}
        aria-expanded={bulkOpen} onClick={() => setBulkOpen(v => !v)}>
        {bulkOpen ? t('players.hide') : t('players.addMany')}
      </button>
      {bulkOpen && (() => {
        const preview = parsePlayerNames(bulkText, players).toAdd.length;
        return (
          <div style={{ marginBottom: 12 }}>
            <textarea
              aria-label={t('players.bulkLabel')}
              placeholder={t('players.bulkPlaceholder')}
              value={bulkText} rows={5}
              onChange={e => { setBulkText(e.target.value); setPlayerError(null); }}
              style={{ marginBottom: 8 }}
            />
            <button className="btn btn-primary btn-full"
              disabled={preview === 0 || addPlayersMutation.isPending}
              onClick={() => addPlayers(bulkText, () => { setBulkText(''); setBulkOpen(false); })}>
              {addPlayersMutation.isPending ? t('players.adding') : t('players.addCount', { count: preview })}
            </button>
          </div>
        );
      })()}
      {playerError && <p role="alert" style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{playerError}</p>}
      <div className="group">
        {activePlayers.length === 0
          ? <div className="row"><span style={{ color: 'var(--label3)', fontSize: 14 }}>{t('players.empty')}</span></div>
          : activePlayers.map(p => {
            const playerTeams = teams.filter(t => t.player_ids.includes(p.id));
            return (
              <div key={String(p.id)} className="row">
                <div className="row-body">
                  <div className="row-title">{p.name}</div>
                  {playerTeams.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {playerTeams.map(t => (
                        <span key={String(t.id)} style={{
                          fontSize: 11, fontWeight: 600,
                          color: 'var(--gold)', background: 'var(--gold-subtle)',
                          border: '1px solid var(--gold-dim)',
                          borderRadius: 20, padding: '1px 7px',
                        }}>{t.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}
                  aria-label={t('players.archiveOf', { name: p.name })}
                  onClick={() => void archivePlayer(p)}>{t('players.archive')}</button>
              </div>
            );
          })
        }
      </div>

      {archivedPlayers.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setArchivedOpen(o => !o)}
            aria-expanded={archivedOpen}
            style={{
              background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: 'var(--label3)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            {archivedOpen ? '▾' : '▸'} {t('players.archivedList', { count: archivedPlayers.length })}
          </button>
          {archivedOpen && (
            <>
              <p style={{ fontSize: 12, color: 'var(--label3)', margin: '4px 0 8px' }}>
                {t('players.archivedHint')}
              </p>
              <div className="group">
                {archivedPlayers.map(p => (
                  <div key={String(p.id)} className="row">
                    <div className="row-body">
                      <div className="row-title" style={{ color: 'var(--label2)' }}>{p.name}</div>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}
                      aria-label={t('players.reactivateOf', { name: p.name })}
                      onClick={() => reactivatePlayer(p)}>{t('players.reactivate')}</button>
                    <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 13 }}
                      aria-label={t('players.deleteOf', { name: p.name })}
                      onClick={() => void deletePlayer(p)}>{t('players.delete')}</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
