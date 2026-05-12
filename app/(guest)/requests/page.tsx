/**
 * My Requests Page (/requests) — cookie-based
 *
 * Read guestId dari localStorage, fetch request list by guestId.
 * No email/magic link needed.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

interface RequestRow {
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

const STORAGE_KEY = 'surflix_guest_info';

export default function RequestsPage() {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.guestId) {
            setGuestId(parsed.guestId);
            setGuestName(parsed.name);
            loadRequests(parsed.guestId);
            return;
          }
        } catch {}
      }
      setLoading(false);
    }
  }, []);

  async function loadRequests(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/by-guest?id=${encodeURIComponent(id)}`);
      if (!res.ok) {
        setRequests([]);
        return;
      }
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    if (confirm('Yakin mau reset history? Lo bakal kehilangan akses ke request lama.')) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  }

  // === RENDER ===

  // No guest data — first time user
  if (!guestId && !loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04]">
            <Icons.ListChecks className="h-6 w-6 text-white/40" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Belum ada request</h1>
          <p className="mt-2 text-sm text-white/55">
            Mulai request film pertama lo, terus balik ke sini buat tracking status-nya
          </p>
          <Link href="/" className="btn-primary mt-6 inline-block">
            <span className="inline-flex items-center gap-1.5">
              <Icons.Plus className="h-3.5 w-3.5" />
              Request film sekarang
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 md:px-5 md:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">My Requests</h1>
          {guestName && (
            <p className="mt-1 text-xs text-white/50">
              {guestName} · {requests.length} request{requests.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button onClick={handleReset} className="text-xs text-white/40 hover:text-white/70">
          Reset
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-ios-lg bg-white/[0.04]" />
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
        <div className="space-y-2.5">
          {requests.map((r) => (
            <RequestRowItem key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRowItem({ request }: { request: RequestRow }) {
  const statusConfig = getStatusConfig(request.status);

  return (
    <div className={cn('rounded-ios-lg border bg-bg-surface p-3', statusConfig.borderClass)}>
      <div className="flex gap-3">
        <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-bg-elevated">
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
            <p className="truncate text-[13px] font-medium">{request.title}</p>
            <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', statusConfig.badgeClass)}>
              <span className="inline-flex items-center gap-1">
                <statusConfig.icon className="h-2.5 w-2.5" />
                {statusConfig.label}
              </span>
            </span>
          </div>
          <p className="mt-1 text-[11px] text-white/45">
            {formatDate(request.requestedAt)} · {request.mediaType === 'movie' ? 'Movie' : 'TV Series'}
          </p>
          {statusConfig.hint && (
            <p className="mt-1.5 text-[10px] text-white/40">
              <Icons.Info className="mr-1 inline h-2.5 w-2.5" />
              {statusConfig.hint}
            </p>
          )}
          {request.adminNote && request.status === 'REJECTED' && (
            <p className="mt-1.5 rounded bg-ios-red/10 px-2 py-1 text-[10px] text-ios-red">
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
      return { label: 'Available', icon: Icons.Check, badgeClass: 'bg-ios-green/20 text-ios-green', borderClass: 'border-ios-green/30', hint: 'Udah ready di Surflix' };
    case 'PROCESSING':
      return { label: 'Downloading', icon: Icons.Download, badgeClass: 'bg-ios-blue/20 text-ios-blue', borderClass: 'border-ios-blue/30', hint: 'Lagi di-download' };
    case 'ON_SCHEDULE':
      return { label: 'On Schedule', icon: Icons.Calendar, badgeClass: 'bg-ios-blue/20 text-ios-blue', borderClass: 'border-ios-blue/30', hint: 'Queued, nunggu giliran download' };
    case 'APPROVED':
      return { label: 'Approved', icon: Icons.Check, badgeClass: 'bg-ios-blue/20 text-ios-blue', borderClass: 'border-ios-blue/30', hint: 'Approved, lagi forward ke Jellyseerr' };
    case 'PENDING_ADMIN':
      return { label: 'Pending', icon: Icons.Clock, badgeClass: 'bg-ios-orange/20 text-ios-orange', borderClass: 'border-ios-orange/30', hint: 'Menunggu review admin (1-3 hari)' };
    case 'REJECTED':
      return { label: 'Rejected', icon: Icons.X, badgeClass: 'bg-ios-red/20 text-ios-red', borderClass: 'border-ios-red/30', hint: undefined };
    case 'PARTIALLY_AVAILABLE':
      return { label: 'Partial', icon: Icons.Check, badgeClass: 'bg-ios-green/20 text-ios-green', borderClass: 'border-ios-green/30', hint: 'Beberapa episode udah ready' };
    case 'FAILED':
      return { label: 'Failed', icon: Icons.AlertCircle, badgeClass: 'bg-ios-red/20 text-ios-red', borderClass: 'border-ios-red/30', hint: 'Gagal diproses, admin akan retry' };
    default:
      return { label: status, icon: Icons.Info, badgeClass: 'bg-white/10 text-white/60', borderClass: 'border-white/10', hint: undefined };
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
