/**
 * usePushNotifications — manages the Web Push subscription lifecycle.
 *
 * - Reads the VAPID public key from config
 * - Requests notification permission
 * - Subscribes / unsubscribes the device via the API
 * - Persists a flag in localStorage so the banner only shows once
 */
import { useState, useCallback } from 'react';
import { api } from '@/api';
import { VAPID_PUBLIC_KEY } from '@/config';

const STORAGE_KEY = 'pepite_push_subscribed';

/** Convert a URL-safe base64 string to a Uint8Array (required by PushManager). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split('').map(c => c.charCodeAt(0)));
}

export type PushStatus = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported' | 'error';

interface UsePushNotificationsReturn {
  status: PushStatus;
  subscribe: (orgId: string) => Promise<void>;
  unsubscribe: (orgId: string) => Promise<void>;
  isSupported: boolean;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const isSupported =
    typeof window !== 'undefined' &&
    'Notification'       in window &&
    'serviceWorker'      in navigator &&
    'PushManager'        in window &&
    !!VAPID_PUBLIC_KEY;

  const [status, setStatus] = useState<PushStatus>(() => {
    if (!isSupported) return 'unsupported';
    if (localStorage.getItem(STORAGE_KEY) === '1') return 'subscribed';
    if (Notification.permission === 'denied') return 'denied';
    return 'idle';
  });

  const subscribe = useCallback(async (orgId: string) => {
    if (!isSupported) return;
    setStatus('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:     true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // La souscription navigateur est créée : on considère l'activation réussie
      // même si la sauvegarde en DB échoue (best-effort).
      localStorage.setItem(STORAGE_KEY, '1');
      setStatus('subscribed');

      try {
        await api.subscribePush(orgId, sub.toJSON());
      } catch (err) {
        console.error('Push subscribe DB save failed (best-effort):', err);
      }
    } catch (err) {
      console.error('Push subscribe failed:', err);
      setStatus('error');
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (orgId: string) => {
    if (!isSupported) return;
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.unsubscribePush(orgId, sub.endpoint);
        await sub.unsubscribe();
      }
      localStorage.removeItem(STORAGE_KEY);
      setStatus('idle');
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
      setStatus('error');
    }
  }, [isSupported]);

  return { status, subscribe, unsubscribe, isSupported };
}
