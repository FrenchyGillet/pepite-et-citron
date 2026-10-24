import { useId, useState } from 'react';
import { AVATAR_COLORS, AVATAR_EMOJIS, type AvatarColorKey } from '@/utils/avatar';
import { initials } from '@/utils/player';
import { t } from '@/i18n';

interface AvatarPickerProps {
  /** Initials shown on the "no emoji" choice. */
  name: string;
  emoji: string | null;
  color: string | null;
  disabled?: boolean;
  onChange: (next: { avatar_emoji: string | null; avatar_color: string | null }) => void;
}

const COLOR_KEYS = Object.keys(AVATAR_COLORS) as AvatarColorKey[];

/** Emoji grid + colour swatches for the player's avatar (Profile), folded by default. */
export function AvatarPicker({ name, emoji, color, disabled, onChange }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const cell = {
    width: 44, height: 44, borderRadius: '50%', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
  } as const;
  const ring = (selected: boolean) => selected
    ? { border: '2px solid var(--gold)', boxShadow: '0 0 0 2px var(--bg2) inset' }
    : { border: '2px solid transparent' };

  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 16, marginBottom: 20 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', padding: '16px', cursor: 'pointer',
          color: 'var(--label)', fontSize: 15, fontWeight: 600, textAlign: 'left',
        }}
      >
        {t('avatar.toggle')}
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="var(--label3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div id={panelId} style={{ padding: '4px 16px 20px' }}>
          <div role="group" aria-label={t('avatar.emojiLabel')}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--label3)', marginBottom: 10 }}>
              {t('avatar.emojiLabel')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              <button
                type="button"
                aria-label={t('avatar.noEmoji')}
                aria-pressed={!emoji}
                disabled={disabled}
                onClick={() => onChange({ avatar_emoji: null, avatar_color: color })}
                style={{ ...cell, ...ring(!emoji), background: 'var(--bg3)', color: 'var(--label2)', fontSize: 14, fontWeight: 700 }}
              >
                {initials(name)}
              </button>
              {AVATAR_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  aria-label={e}
                  aria-pressed={emoji === e}
                  disabled={disabled}
                  onClick={() => onChange({ avatar_emoji: e, avatar_color: color })}
                  style={{ ...cell, ...ring(emoji === e), background: 'var(--bg3)', fontSize: 22, lineHeight: 1 }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div role="group" aria-label={t('avatar.colorLabel')}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--label3)', marginBottom: 10 }}>
              {t('avatar.colorLabel')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COLOR_KEYS.map(key => (
                <button
                  key={key}
                  type="button"
                  aria-label={t(`avatar.colors.${key}`)}
                  aria-pressed={color === key}
                  disabled={disabled}
                  onClick={() => onChange({ avatar_emoji: emoji, avatar_color: key })}
                  style={{ ...cell, ...ring(color === key), background: AVATAR_COLORS[key] }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
