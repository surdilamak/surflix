/**
 * NotificationToggle — opt-in UI buat browser notifications status request.
 *
 * Two modes:
 *  - If browser support Web Push (service worker + PushManager) → subscribe ke server
 *    biar notifs jalan walaupun tab tutup.
 *  - Else fallback ke `Notification` API mode — notifs cuma jalan kalau /requests
 *    page kebuka di tab (di-handle hook polling).
 *
 * Server akan trigger push dari webhook Jellyseerr + admin approve/reject.
 */
'use client';

import { useEffect, useState } from 'react';
import { Icons } from './icons';

interface NotificationToggleProps {
  guestId: string;
}

type Status = 'unsupported' | 'denied' | 'default' | 'granted-no-push' | 'subscribed' | 'loading';

const PUSH_SUPPORTED =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

const NOTIFICATION_SUPPORTED = typeof window !== 'undefined' && 'Notification' in window;

export function NotificationToggle({ guestId }: NotificationToggleProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Detect initial state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (sessionStorage.getItem('surflix_notif_dismissed') === '1') {
      setDismissed(true);
    }

    if (!NOTIFICATION_SUPPORTED) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    if (Notification.permission === 'default') {
      setStatus('default');
      return;
    }

    // permission === 'granted' — cek subscription kalau push supported
    if (!PUSH_SUPPORTED) {
      setStatus('granted-no-push');
      return;
    }

    checkSubscription();
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) {
        setStatus('granted-no-push');
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? 'subscribed' : 'granted-no-push');
    } catch {
      setStatus('granted-no-push');
    }
  }

  async function fetchVapidKey(): Promise<string | null> {
    if (vapidKey) return vapidKey;
    try {
      const res = await fetch('/api/push/vapid-key');
      if (!res.ok) return null;
      const data = await res.json();
      if (data.publicKey) {
        setVapidKey(data.publicKey);
        return data.publicKey;
      }
    } catch {}
    return null;
  }

  async function handleEnable() {
    if (!NOTIFICATION_SUPPORTED) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus(permission === 'denied' ? 'denied' : 'default');
      return;
    }

    if (!PUSH_SUPPORTED) {
      setStatus('granted-no-push');
      return;
    }

    // Subscribe to Web Push
    setStatus('loading');
    try {
      const key = await fetchVapidKey();
      if (!key) {
        // Server gak ready buat push, jatuh ke mode in-page
        setStatus('granted-no-push');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });

      const json = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
      setStatus('subscribed');
    } catch (err) {
      console.warn('[Push subscribe failed]', err);
      setStatus('granted-no-push');
    }
  }

  async function handleDisable() {
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    } catch (err) {
      console.warn('[Push unsubscribe failed]', err);
    }
    setStatus('granted-no-push');
  }

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem('surflix_notif_dismissed', '1');
  }

  // === RENDER ===
  if (status === 'unsupported' || status === 'loading') return null;
  if (dismissed && (status === 'default' || status === 'granted-no-push')) return null;

  // Banner: ask for permission
  if (status === 'default') {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-rq bg-rq-surface p-3">
        <Icons.Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-rq-accent" />
        <div className="min-w-0 flex-1">
          <p className="rq-text font-medium">Mau dapat notif kalau request lo update?</p>
          <p className="rq-small mt-0.5 text-rq-muted">
            Lo bakal tau pas film disetujui, mulai download, atau siap ditonton.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleEnable}
              className="btn-primary !min-h-11"
            >
              Aktifkan
            </button>
            <button
              onClick={handleDismiss}
              className="rq-small inline-flex min-h-11 items-center px-2 text-rq-muted hover:text-white"
            >
              Nanti aja
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-rq bg-rq-surface p-3">
        <Icons.BellOff className="mt-0.5 h-4 w-4 flex-shrink-0 text-rq-muted" />
        <div className="min-w-0 flex-1">
          <p className="rq-small text-rq-muted">
            Notif di-block sama browser lo. Buka site settings buat allow notifications kalau mau di-aktifin.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'granted-no-push') {
    // Notif on (in-page mode) — show subtle indicator + offer enable push
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-rq bg-rq-surface px-3 py-1">
        <div className="flex items-center gap-2 text-xs text-rq-muted">
          <Icons.Bell className="h-4 w-4 text-rq-accent" />
          <span>Notif aktif (cuma pas tab kebuka)</span>
        </div>
        {PUSH_SUPPORTED && (
          <button
            onClick={handleEnable}
            className="rq-small inline-flex min-h-11 items-center px-2 text-rq-accent hover:text-white"
          >
            Aktifkan background notif
          </button>
        )}
      </div>
    );
  }

  if (status === 'subscribed') {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-rq bg-rq-surface px-3 py-1">
        <div className="flex items-center gap-2 text-xs text-rq-muted">
          <Icons.BellRing className="h-4 w-4 text-rq-accent" />
          <span>Background notif aktif</span>
        </div>
        <button
          onClick={handleDisable}
          className="rq-small inline-flex min-h-11 items-center px-2 text-rq-muted hover:text-white"
        >
          Matiin
        </button>
      </div>
    );
  }

  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
