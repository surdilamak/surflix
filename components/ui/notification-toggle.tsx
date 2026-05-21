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
      <div className="mb-4 flex items-start gap-3 rounded-ios-lg border border-white/[0.08] bg-white/[0.02] p-3">
        <Icons.Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-ios-orange/80" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">Mau dapat notif kalau request lo update?</p>
          <p className="mt-0.5 text-[11px] text-white/55">
            Lo bakal tau pas film disetujui, mulai download, atau siap ditonton.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleEnable}
              className="rounded-full bg-ios-orange/90 px-3 py-1 text-[11px] font-medium text-black hover:bg-ios-orange"
            >
              Aktifkan
            </button>
            <button
              onClick={handleDismiss}
              className="text-[11px] text-white/45 hover:text-white/70"
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
      <div className="mb-4 flex items-start gap-3 rounded-ios-lg border border-white/[0.07] bg-white/[0.02] p-3">
        <Icons.BellOff className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/40" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-white/55">
            Notif di-block sama browser lo. Buka site settings buat allow notifications kalau mau di-aktifin.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'granted-no-push') {
    // Notif on (in-page mode) — show subtle indicator + offer enable push
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-ios-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-white/55">
          <Icons.Bell className="h-3.5 w-3.5 text-ios-orange/70" />
          <span>Notif aktif (cuma pas tab kebuka)</span>
        </div>
        {PUSH_SUPPORTED && (
          <button
            onClick={handleEnable}
            className="text-[11px] text-ios-orange/90 hover:text-ios-orange"
          >
            Aktifkan background notif
          </button>
        )}
      </div>
    );
  }

  if (status === 'subscribed') {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-ios-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-white/55">
          <Icons.BellRing className="h-3.5 w-3.5 text-ios-green/80" />
          <span>Background notif aktif</span>
        </div>
        <button
          onClick={handleDisable}
          className="text-[11px] text-white/45 hover:text-white/70"
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
