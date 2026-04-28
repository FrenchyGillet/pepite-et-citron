import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { usePlayers } from '@/hooks/queries';
import { useUpdatePlayer, useLinkPlayer } from '@/hooks/mutations';
import { displayName, avatarColor, initials } from '@/utils/player';
import type { Player } from '@/types';

export function ProfileView() {
  const navigate     = useNavigate();
  const session      = useAppStore(s => s.session);
  const currentOrg   = useAppStore(s => s.currentOrg);

  const { data: players = [] } = usePlayers(currentOrg?.id);

  // Find the player linked to the current user (if any)
  const myPlayer = session
    ? players.find(p => p.user_id === session.user.id) ?? null
    : null;

  // Step state: 'pick' → choose player | 'edit' → edit nickname
  const [step, setStep]         = useState<'pick' | 'edit'>(myPlayer ? 'edit' : 'pick');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(myPlayer);
  const [nickname, setNickname] = useState<string>(myPlayer?.nickname?.trim() ?? '');
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const linkPlayer   = useLinkPlayer(currentOrg?.id);
  const updatePlayer = useUpdatePlayer(currentOrg?.id);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Claim a player ────────────────────────────────────────────────────────
  async function handleClaim(player: Player) {
    setError(null);
    try {
      await linkPlayer.mutateAsync(player.id);
      setSelectedPlayer(player);
      setNickname(player.nickname?.trim() ?? '');
      setStep('edit');
    } catch {
      setError('Ce joueur est déjà revendiqué ou une erreur est survenue.');
    }
  }

  // ── Save nickname ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selectedPlayer) return;
    setError(null);
    const trimmed = nickname.trim();
    try {
      await updatePlayer.mutateAsync({ id: selectedPlayer.id, data: { nickname: trimmed || null } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Impossible de sauvegarder. Réessaie.');
    }
  }

  const avatarPlayer = selectedPlayer ?? (myPlayer ?? null);
  const avatarLabel  = avatarPlayer ? displayName(avatarPlayer) : session?.user.email ?? '?';

  // ── No session ────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '70dvh', padding: '0 24px',
        textAlign: 'center', gap: 16,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'var(--bg3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="var(--label3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--label)', margin: 0 }}>
          Connecte-toi pour accéder à ton profil
        </h2>
        <button className="btn btn-primary" onClick={() => navigate('/vote')} style={{ minWidth: 180 }}>
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--label3)' }}
          aria-label="Retour"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--label)', margin: 0 }}>Mon profil</h1>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32, gap: 10 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: avatarPlayer ? avatarColor(avatarLabel) : 'var(--bg3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
          flexShrink: 0,
        }}>
          {initials(avatarLabel)}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--label)' }}>
            {avatarPlayer ? displayName(avatarPlayer) : session.user.email}
          </div>
          {avatarPlayer?.nickname && (
            <div style={{ fontSize: 13, color: 'var(--label3)', marginTop: 2 }}>
              Surnom : <strong style={{ color: 'var(--gold)' }}>{avatarPlayer.nickname}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Step: pick player */}
      {step === 'pick' && (
        <div>
          <p style={{ fontSize: 14, color: 'var(--label2)', marginBottom: 16, lineHeight: 1.5 }}>
            Quel joueur es-tu dans la liste ? Revendique ton profil pour personnaliser ton surnom
            affiché sur le podium.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players
              .filter(p => !p.user_id) // only unclaimed
              .map(p => (
                <button
                  key={String(p.id)}
                  onClick={() => handleClaim(p)}
                  disabled={linkPlayer.isPending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--bg2)', border: '1px solid var(--separator)',
                    borderRadius: 14, padding: '12px 16px', cursor: 'pointer',
                    textAlign: 'left', color: 'var(--label)',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: avatarColor(displayName(p)),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {initials(displayName(p))}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{displayName(p)}</div>
                    {p.nickname && (
                      <div style={{ fontSize: 12, color: 'var(--label3)' }}>{p.nickname}</div>
                    )}
                  </div>
                </button>
              ))}
            {players.filter(p => !p.user_id).length === 0 && (
              <p style={{ fontSize: 14, color: 'var(--label3)', textAlign: 'center', padding: 24 }}>
                Tous les joueurs ont déjà revendiqué leur profil.
              </p>
            )}
          </div>
          {error && <p style={{ color: '#FF453A', fontSize: 13, marginTop: 12 }}>{error}</p>}
        </div>
      )}

      {/* Step: edit nickname */}
      {step === 'edit' && selectedPlayer && (
        <div>
          <div style={{
            background: 'var(--bg2)', borderRadius: 16,
            padding: '20px 16px', marginBottom: 20,
          }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--label3)', display: 'block', marginBottom: 8 }}>
              SURNOM (affiché sur le podium)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={nickname}
              onChange={e => { setNickname(e.target.value); setSaved(false); }}
              placeholder={selectedPlayer.name}
              maxLength={20}
              style={{
                width: '100%', padding: '12px 14px',
                background: 'var(--bg3)', border: '1px solid var(--separator)',
                borderRadius: 10, fontSize: 16, color: 'var(--label)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 12, color: 'var(--label3)', margin: '8px 0 0' }}>
              Laisse vide pour utiliser ton prénom.
            </p>
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={updatePlayer.isPending}
            style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}
          >
            {updatePlayer.isPending ? 'Sauvegarde…' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
          </button>

          {!myPlayer && (
            <button
              className="btn btn-secondary btn-full"
              onClick={() => setStep('pick')}
              style={{ fontSize: 14 }}
            >
              Choisir un autre joueur
            </button>
          )}

          {error && <p style={{ color: '#FF453A', fontSize: 13, marginTop: 12 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
