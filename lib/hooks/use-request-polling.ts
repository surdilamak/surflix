/**
 * useRequestPolling — silently poll /api/requests/by-guest dan fire browser
 * Notification kalau ada status berubah dari yang user terakhir liat.
 *
 * Behavior:
 * - Poll tiap `intervalMs` ms (default 60s)
 * - Pause kalau tab hidden (Page Visibility API)
 * - Refresh sekali pas tab balik visible
 * - Track last-seen status per request di localStorage biar reload gak re-notif
 * - Cuma fire notif kalau permission granted; gak auto-request — caller yang minta
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SEEN_KEY = 'surflix_request_seen_status';

export interface PolledRequest {
  id: string;
  title: string;
  mediaType: 'movie' | 'tv';
  posterPath?: string | null;
  status: string;
  requestedAt: string;
  approvedAt?: string | null;
  availableAt?: string | null;
  adminNote?: string | null;
}

interface UseRequestPollingOptions {
  guestId: string | null;
  intervalMs?: number;
  onChange?: (changes: { request: PolledRequest; previousStatus: string }[]) => void;
}

interface UseRequestPollingResult {
  requests: PolledRequest[];
  loading: boolean;
  refresh: () => Promise<void>;
}

function loadSeen(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSeen(map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  } catch {}
}

export function useRequestPolling({
  guestId,
  intervalMs = 60_000,
  onChange,
}: UseRequestPollingOptions): UseRequestPollingResult {
  const [requests, setRequests] = useState<PolledRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const fetchRequests = useCallback(async () => {
    if (!guestId) return;
    try {
      const res = await fetch(`/api/requests/by-guest?id=${encodeURIComponent(guestId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const next: PolledRequest[] = data.requests || [];

      // Compare to last seen statuses, gather changes
      // First-time seen (no prev) tidak dianggap "change" — biar reload device
      // baru gak nge-spam notif untuk request lama.
      const seen = loadSeen();
      const changes: { request: PolledRequest; previousStatus: string }[] = [];
      const nextSeen: Record<string, string> = { ...seen };

      for (const r of next) {
        const prev = seen[r.id];
        if (prev && prev !== r.status) {
          changes.push({ request: r, previousStatus: prev });
        }
        nextSeen[r.id] = r.status;
      }

      // Cleanup seen entries untuk request yang udah hilang
      const currentIds = new Set(next.map((r) => r.id));
      for (const id of Object.keys(nextSeen)) {
        if (!currentIds.has(id)) delete nextSeen[id];
      }

      saveSeen(nextSeen);
      setRequests(next);

      if (changes.length > 0) {
        onChangeRef.current?.(changes);
      }
    } catch {
      // silent fail — gak ganggu UI kalau polling gagal
    }
  }, [guestId]);

  // Initial load
  useEffect(() => {
    if (!guestId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchRequests().finally(() => setLoading(false));
  }, [guestId, fetchRequests]);

  // Polling + Page Visibility
  useEffect(() => {
    if (!guestId) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(fetchRequests, intervalMs);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        fetchRequests(); // refresh on focus
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [guestId, intervalMs, fetchRequests]);

  return { requests, loading, refresh: fetchRequests };
}
