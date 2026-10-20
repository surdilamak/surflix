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
import { useLang } from '@/components/connections/lang-provider';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useRequestPolling, PolledRequest } from '@/lib/hooks/use-request-polling';
import { buildStatusChangeNotif } from '@/lib/notif-messages';
import { NotificationToggle } from '@/components/ui/notification-toggle';

const STORAGE_KEY = 'surflix_guest_info';

export default function RequestsPage() {
  const { t } = useLang();
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
    if (confirm(t('hub.requests.confirmReset'))) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('surflix_request_seen_status');
      window.location.reload();
    }
  }

  // === RENDER ===

  // No guest data — first time user
  if (bootstrapped && !guestId) {
    return (
      <div className="rq-wrap rq-narrow flex min-h-[60vh] flex-col items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-rq bg-rq-surface">
            <Icons.ListChecks className="h-6 w-6 text-rq-accent" />
          </div>
          <h1 className="rq-h1">{t('hub.requests.none')}</h1>
          <p className="rq-text mt-2 text-rq-muted">
            {t('hub.requests.noneBody')}
          </p>
          <Link href="/" className="btn-primary mt-6 inline-block">
            <span className="inline-flex items-center gap-1.5">
              <Icons.Plus className="h-4 w-4" />
              {t('hub.requests.noneAction')}
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rq-wrap rq-narrow py-6 md:py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="rq-h1">{t('hub.requests.title')}</h1>
          {guestName && (
            <p className="rq-small mt-1 text-rq-muted">
              {t(requests.length === 1 ? 'hub.requests.count' : 'hub.requests.countMany', { name: guestName, n: requests.length })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refresh()}
            className="flex h-11 w-11 items-center justify-center rounded-rq text-rq-muted hover:bg-rq-surface hover:text-white"
            aria-label={t('hub.requests.refresh')}
            title={t('hub.requests.refresh')}
          >
            <Icons.RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={handleReset} className="rq-small inline-flex min-h-11 items-center rounded-rq px-3 text-rq-muted hover:bg-rq-surface hover:text-white">
            {t('hub.requests.reset')}
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
          title={t('hub.requests.none')}
          description={t('hub.requests.emptyBody')}
          action={{
            label: t('hub.requests.emptyAction'),
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
  const { t, lang } = useLang();
  const statusConfig = getStatusConfig(request.status, t);

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
            {formatDate(request.requestedAt, t, lang)} · {request.mediaType === 'movie' ? t('hub.type.movie') : t('hub.type.tv')}
          </p>
          {statusConfig.hint && (
            <p className="mt-1.5 text-xs text-rq-muted">
              <Icons.Info className="mr-1 inline h-3 w-3" />
              {statusConfig.hint}
            </p>
          )}
          {request.adminNote && request.status === 'REJECTED' && (
            <p className="mt-1.5 rounded-rq bg-rq-raised px-2 py-1.5 text-xs text-[#ff6961]">
              {t('hub.requests.admin', { note: request.adminNote })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type T = (key: string, vars?: Record<string, string | number>) => string;

const STATUS_STYLE: Record<string, { icon: typeof Icons.Check; badgeClass: string; hint: boolean }> = {
  AVAILABLE: { icon: Icons.Check, badgeClass: 'badge-available', hint: true },
  PROCESSING: { icon: Icons.Download, badgeClass: 'badge-processing', hint: true },
  ON_SCHEDULE: { icon: Icons.Calendar, badgeClass: 'badge-processing', hint: true },
  APPROVED: { icon: Icons.Check, badgeClass: 'badge-processing', hint: true },
  PENDING_ADMIN: { icon: Icons.Clock, badgeClass: 'badge-pending', hint: true },
  REJECTED: { icon: Icons.X, badgeClass: 'badge-rejected', hint: false },
  PARTIALLY_AVAILABLE: { icon: Icons.Check, badgeClass: 'badge-available', hint: true },
  FAILED: { icon: Icons.AlertCircle, badgeClass: 'badge-rejected', hint: true },
};

function getStatusConfig(status: string, t: T) {
  const st = STATUS_STYLE[status];
  if (!st) {
    return { label: status, icon: Icons.Info, badgeClass: 'bg-rq-raised text-rq-muted rounded-rq px-2 py-0.5', hint: undefined };
  }
  return {
    label: t(`hub.status.${status}`),
    icon: st.icon,
    badgeClass: st.badgeClass,
    hint: st.hint ? t(`hub.status.${status}.hint`) : undefined,
  };
}

function formatDate(iso: string, t: T, lang: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return t('hub.ago.min', { n: diffMins });
  if (diffHours < 24) return t('hub.ago.hour', { n: diffHours });
  if (diffDays < 7) return t('hub.ago.day', { n: diffDays });
  return date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
