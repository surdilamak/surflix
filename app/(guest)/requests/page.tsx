/**
 * My Requests Page (/requests) — cookie-based
 *
 * Read guestId dari localStorage, fetch request list by guestId.
 * Polling-based silent refresh + browser Notification when status changes.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useRequestPolling, PolledRequest } from '@/lib/hooks/use-request-polling';
import { buildStatusChangeNotif } from '@/lib/notif-messages';
import { NotificationToggle } from '@/components/ui/notification-toggle';

const STORAGE_KEY = 'surflix_guest_info';

export default function RequestsPage() {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.guestId) {
          setGuestId(parsed.guestId);
          setGuestName(parsed.name || null);
        }
      } catch {}
    }
    setBootstrapped(true);
  }, []);

  const handleStatusChanges = useCallback(
    (changes: { request: PolledRequest; previousStatus: string }[]) => {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      for (const { request, previousStatus } of changes) {
        const payload = buildStatusChangeNotif({
          title: request.title,
          status: request.status,
          previousStatus,
          adminNote: request.adminNote,
        });
        if (!payload) continue;
        try {
          const notif = new Notification(payload.title, {
            body: payload.body,
            tag: `${request.id}-${payload.tag}`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
          });
          if (payload.url) {
            notif.onclick = () => {
              window.focus();
              window.location.href = payload.url!;
              notif.close();
            };
          }
        } catch {
          // Notification may throw on iOS / unsupported — gak masalah, polling jalan terus
        }
      }
    },
    []
  );

  const { requests, loading, refresh } = useRequestPolling({
    guestId,
    intervalMs: 60_000,
    onChange: handleStatusChanges,
  });

  function handleReset() {
    if (confirm('Yakin mau reset history? Lo bakal kehilangan akses ke request lama.')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('surflix_request_seen_status');
      window.location.reload();
    }
  }

  // === RENDER ===

  // No guest data — first time user
  if (bootstrapped && !guestId) {
    return (
      <div className="rq-wrap flex min-h-[60vh] max-w-md flex-col items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-rq bg-rq-surface">
            <Icons.ListChecks className="h-6 w-6 text-rq-accent" />
          </div>
          <h1 className="rq-h1">Belum ada request</h1>
          <p className="rq-text mt-2 text-rq-muted">
            Mulai request film pertama lo, terus balik ke sini buat tracking status-nya
          </p>
          <Link href="/" className="btn-primary mt-6 inline-block">
            <span className="inline-flex items-center gap-1.5">
              <Icons.Plus className="h-4 w-4" />
              Request film sekarang
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rq-wrap max-w-3xl py-6 md:py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="rq-h1">My Requests</h1>
          {guestName && (
            <p className="rq-small mt-1 text-rq-muted">
              {guestName} · {requests.length} request{requests.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refresh()}
            className="flex h-11 w-11 items-center justify-center rounded-rq text-rq-muted hover:bg-rq-surface hover:text-white"
            aria-label="Refresh"
            title="Refresh sekarang"
          >
            <Icons.RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={handleReset} className="rq-small inline-flex min-h-11 items-center rounded-rq px-3 text-rq-muted hover:bg-rq-surface hover:text-white">
            Reset
          </button>
        </div>
      </div>

      {guestId && requests.length > 0 && <NotificationToggle guestId={guestId} />}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-rq bg-rq-surface" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon="ListChecks"
          title="Belum ada request"
          description="Mulai request film atau series dari Home."
          action={{
            label: 'Browse film',
            onClick: () => (window.location.href = '/'),
          }}
        />
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <RequestRowItem key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRowItem({ request }: { request: PolledRequest }) {
  const statusConfig = getStatusConfig(request.status);

  return (
    <div className="rq-tile p-3">
      <div className="flex gap-3">
        <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-rq bg-rq-raised">
          {request.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w185${request.posterPath}`}
              alt={request.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icons.Film className="h-5 w-5 text-white/20" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="rq-text truncate font-medium">{request.title}</p>
            <span className={cn('flex-shrink-0', statusConfig.badgeClass)}>
              <span className="inline-flex items-center gap-1">
                <statusConfig.icon className="h-3 w-3" />
                {statusConfig.label}
              </span>
            </span>
          </div>
          <p className="mt-1 text-xs text-rq-muted">
            {formatDate(request.requestedAt)} · {request.mediaType === 'movie' ? 'Movie' : 'TV Series'}
          </p>
          {statusConfig.hint && (
            <p className="mt-1.5 text-xs text-rq-muted">
              <Icons.Info className="mr-1 inline h-3 w-3" />
              {statusConfig.hint}
            </p>
          )}
          {request.adminNote && request.status === 'REJECTED' && (
            <p className="mt-1.5 rounded-rq bg-rq-raised px-2 py-1.5 text-xs text-[#ff6961]">
              Admin: {request.adminNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return { label: 'Available', icon: Icons.Check, badgeClass: 'badge-available', borderClass: '', hint: 'Udah ready di Surflix' };
    case 'PROCESSING':
      return { label: 'Downloading', icon: Icons.Download, badgeClass: 'badge-processing', borderClass: '', hint: 'Lagi di-download' };
    case 'ON_SCHEDULE':
      return { label: 'On Schedule', icon: Icons.Calendar, badgeClass: 'badge-processing', borderClass: '', hint: 'Queued, nunggu giliran download' };
    case 'APPROVED':
      return { label: 'Approved', icon: Icons.Check, badgeClass: 'badge-processing', borderClass: '', hint: 'Approved, lagi forward ke Jellyseerr' };
    case 'PENDING_ADMIN':
      return { label: 'Pending', icon: Icons.Clock, badgeClass: 'badge-pending', borderClass: '', hint: 'Menunggu review admin (1-3 hari)' };
    case 'REJECTED':
      return { label: 'Rejected', icon: Icons.X, badgeClass: 'badge-rejected', borderClass: '', hint: undefined };
    case 'PARTIALLY_AVAILABLE':
      return { label: 'Partial', icon: Icons.Check, badgeClass: 'badge-available', borderClass: '', hint: 'Beberapa episode udah ready' };
    case 'FAILED':
      return { label: 'Failed', icon: Icons.AlertCircle, badgeClass: 'badge-rejected', borderClass: '', hint: 'Gagal diproses, admin akan retry' };
    default:
      return { label: status, icon: Icons.Info, badgeClass: 'bg-rq-raised text-rq-muted rounded-rq px-2 py-0.5', borderClass: '', hint: undefined };
  }
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
