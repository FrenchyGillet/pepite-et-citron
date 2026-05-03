/**
 * PushNotificationBanner
 *
 * Shown once in AdminView to invite the admin to enable push notifications.
 * Disappears after subscription (or explicit dismiss).
 *
 * Not shown when:
 *  - Push is not supported (no VAPID key, no SW, browser unsupported)
 *  - Already subscribed (localStorage flag set)
 *  - Permission was explicitly denied
 *  - User dismissed it (localStorage dismiss flag)
 */
import React, { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISS_KEY = 'pepite_push_banner_dismissed';

interface Props {
  orgId: string;
}

export function PushNotificationBanner({ orgId }: Props) {
  const { status, subscribe, isSupported } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISS_KEY));

  // Don't render if unsupported, already subscribed, denied, or dismissed
  if (!isSupported)           return null;
  if (dismissed)              return null;
  if (status === 'subscribed') return null;
  if (status === 'denied')    return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const handleSubscribe = () => void subscribe(orgId);

  return (
    <div style={{
      background: 'var(--bg2, #1C1C1E)',
      border:     '1px solid rgba(255,215,0,0.25)',
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ fontSize: 24, flexShrink: 0 }}>🔔</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--label, #fff)', marginBottom: 2 }}>
          Notifier l'équipe automatiquement
        </div>
        <div style={{ fontSize: 12, color: 'var(--label3, rgba(235,235,245,0.4))', lineHeight: 1.4 }}>
          Reçois une notif quand un vote est ouvert ou les résultats prêts.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--label3, rgba(235,235,245,0.4))',
            fontSize: 13,
            padding: '6px 8px',
            cursor: 'pointer',
          }}
          aria-label="Ignorer"
        >
          Plus tard
        </button>

        <button
          onClick={handleSubscribe}
          disabled={status === 'loading'}
          style={{
            background: '#FFD700',
            color: '#000',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            padding: '7px 14px',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            opacity: status === 'loading' ? 0.7 : 1,
          }}
        >
          {status === 'loading' ? '…' : 'Activer'}
        </button>
      </div>
    </div>
  );
}
