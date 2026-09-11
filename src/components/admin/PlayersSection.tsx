import { useState } from 'react';
import { track, EVENTS } from '@/utils/analytics';
import { humanizeError } from '@/utils/errors';
import { isActive, parsePlayerNames } from '@/utils/player';
import { useAddPlayers, useRemovePlayer, useSetPlayerArchived } from '@/hooks/mutations';
import type { Player, Team } from '@/types';
import { sectionLabelStyle, type ConfirmFn, type Notify } from './shared';

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
      existing.length ? `déjà dans l'effectif : ${existing.join(', ')}` : '',
      archived.length ? `archivé, à réactiver : ${archived.join(', ')}` : '',
      tooLong.length  ? `trop long (50 caractères max) : ${tooLong.join(', ')}` : '',
    ].filter(Boolean).join(' · ');
    if (toAdd.length === 0) { setPlayerError(skipped ? `Rien à ajouter — ${skipped}` : 'Le prénom est requis'); return; }
    setPlayerError(null);
    addPlayersMutation.mutate(toAdd, {
      onSuccess: () => {
        track(EVENTS.PLAYER_ADDED, { count: toAdd.length });
        const added = toAdd.length === 1 ? `${toAdd[0]} ajouté` : `${toAdd.length} joueurs ajoutés`;
        notify(skipped ? `${added} · ${skipped}` : added);
        onDone();
      },
      onError: (err) => { notify(humanizeError(err)); console.error('addPlayers:', err); },
    });
  };

  const onPlayerError = (err: unknown) => notify(humanizeError(err));

  const archivePlayer = async (p: Player) => {
    if (!(await confirm({
      message: `Archiver ${p.name} ? Il n'apparaîtra plus dans les votes ni dans les équipes. Son historique et ses stats sont conservés.`,
      confirmLabel: 'Archiver',
    }))) return;
    setArchivedMutation.mutate({ id: p.id, archived: true }, { onSuccess: () => notify(`${p.name} archivé`), onError: onPlayerError });
  };

  const reactivatePlayer = (p: Player) =>
    setArchivedMutation.mutate({ id: p.id, archived: false }, { onSuccess: () => notify(`${p.name} réactivé`), onError: onPlayerError });

  const deletePlayer = async (p: Player) => {
    if (!(await confirm({
      message: `Supprimer définitivement ${p.name} ? Son nom disparaîtra des matchs passés et des stats. Pour garder son historique, laisse-le archivé.`,
      confirmLabel: 'Supprimer', danger: true,
    }))) return;
    removePlayerMutation.mutate(p.id, { onSuccess: () => notify(`${p.name} supprimé`), onError: onPlayerError });
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={sectionLabelStyle}>Joueurs · {activePlayers.length}</p>
      <div className="flex gap-8" style={{ marginBottom: 8 }}>
        <input aria-label="Prénom du joueur" placeholder="Prénom du joueur" value={newPlayer}
          onChange={e => { setNewPlayer(e.target.value); setPlayerError(null); }}
          onKeyDown={e => e.key === 'Enter' && addPlayers(newPlayer, () => setNewPlayer(''))}
          style={{ borderColor: playerError ? 'var(--red)' : undefined }} />
        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '12px 16px' }}
          disabled={addPlayersMutation.isPending}
          onClick={() => addPlayers(newPlayer, () => setNewPlayer(''))}>Ajouter</button>
      </div>
      <button className="tag tag-dim" style={{ fontSize: 13, padding: '7px 12px', marginBottom: 12 }}
        aria-expanded={bulkOpen} onClick={() => setBulkOpen(v => !v)}>
        {bulkOpen ? '▲ Masquer' : '＋ Ajouter plusieurs joueurs'}
      </button>
      {bulkOpen && (() => {
        const preview = parsePlayerNames(bulkText, players).toAdd.length;
        return (
          <div style={{ marginBottom: 12 }}>
            <textarea
              aria-label="Prénoms à ajouter, un par ligne ou séparés par des virgules"
              placeholder={'Colle ta liste : un prénom par ligne\nou séparés par des virgules'}
              value={bulkText} rows={5}
              onChange={e => { setBulkText(e.target.value); setPlayerError(null); }}
              style={{ marginBottom: 8 }}
            />
            <button className="btn btn-primary btn-full"
              disabled={preview === 0 || addPlayersMutation.isPending}
              onClick={() => addPlayers(bulkText, () => { setBulkText(''); setBulkOpen(false); })}>
              {addPlayersMutation.isPending ? 'Ajout…' : `Ajouter ${preview} joueur${preview > 1 ? 's' : ''}`}
            </button>
          </div>
        );
      })()}
      {playerError && <p role="alert" style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{playerError}</p>}
      <div className="group">
        {activePlayers.length === 0
          ? <div className="row"><span style={{ color: 'var(--label3)', fontSize: 14 }}>Aucun joueur. Commence par en ajouter un ci-dessus.</span></div>
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
                  aria-label={`Archiver ${p.name}`}
                  onClick={() => void archivePlayer(p)}>Archiver</button>
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
            {archivedOpen ? '▾' : '▸'} Archivés · {archivedPlayers.length}
          </button>
          {archivedOpen && (
            <>
              <p style={{ fontSize: 12, color: 'var(--label3)', margin: '4px 0 8px' }}>
                Ils n'apparaissent plus dans les votes ni les équipes. Leur historique et leurs stats sont conservés.
              </p>
              <div className="group">
                {archivedPlayers.map(p => (
                  <div key={String(p.id)} className="row">
                    <div className="row-body">
                      <div className="row-title" style={{ color: 'var(--label2)' }}>{p.name}</div>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}
                      aria-label={`Réactiver ${p.name}`}
                      onClick={() => reactivatePlayer(p)}>Réactiver</button>
                    <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 13 }}
                      aria-label={`Supprimer définitivement ${p.name}`}
                      onClick={() => void deletePlayer(p)}>Supprimer</button>
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
