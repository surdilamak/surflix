/**
 * useRequestPolling — silently poll /api/requests/by-guest and fire a browser
 * Notification if a status changed from what the user last saw.
 *
 * Behavior:
 * - Poll every `intervalMs` ms (default 60s)
 * - Pause when the tab is hidden (Page Visibility API)
 * - Refresh once when the tab becomes visible again
 * - Track last-seen status per request in localStorage so a reload does not re-notify
 * - Only fire a notification if permission is granted; no auto-request — the caller asks
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
      // First-time seen (no prev) is not counted as a "change" — so reloading on a
      // new device does not spam notifications for old requests.
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

      // Clean up seen entries for requests that are gone
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
      // silent fail — does not disturb the UI if polling fails
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
