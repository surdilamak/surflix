/**
 * Admin Pending Requests (/admin/pending)
 *
 * List request dengan status PENDING_ADMIN, approve/reject langsung.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Icons } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/empty-state';

interface PendingRequest {
  id: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string | null;
  overview?: string | null;
  releaseDate?: string | null;
  rating?: number | null;
  status: string;
  requestedAt: string;
  guest: {
    name: string;
    email: string;
    createdAt: string;
  };
}

export default function AdminPendingPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const res = await fetch('/api/admin/requests?status=PENDING_ADMIN');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    setActioningId(id);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal approve', type: 'error' });
        return;
      }
      setToast({ message: 'Request approved & sent to Jellyseerr', type: 'success' });
      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setToast({ message: 'Network error', type: 'error' });
    } finally {
      setActioningId(null);
      setTimeout(() => setToast(null), 3500);
    }
  }

  async function handleReject(id: string) {
    setActioningId(id);
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, reason: rejectReason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal reject', type: 'error' });
        return;
      }
      setToast({ message: 'Request rejected', type: 'success' });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectReason('');
    } catch {
      setToast({ message: 'Network error', type: 'error' });
    } finally {
      setActioningId(null);
      setTimeout(() => setToast(null), 3500);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/70 backdrop-blur-ios">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-surflix-500 to-ios-orange">
                <Icons.Waves className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-base font-semibold tracking-tighter">Surflix Admin</span>
            </div>
            <nav className="hidden gap-1 md:flex">
              <Link href="/admin" className="tab">Dashboard</Link>
              <Link href="/admin/pending" className="tab tab-active">
                Pending
                {requests.length > 0 && (
                  <span className="ml-1 rounded-full bg-surflix-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {requests.length}
                  </span>
                )}
              </Link>
              <Link href="/admin/history" className="tab">History</Link>
              <Link href="/admin/settings" className="tab">Settings</Link>
            </nav>
          </div>
          <button onClick={handleLogout} className="text-xs text-white/40 hover:text-white">
            <Icons.LogOut className="mr-1 inline h-3 w-3" />
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tighter md:text-3xl">Pending Requests</h1>
          <button onClick={loadRequests} className="text-xs text-white/40 hover:text-white">
            <Icons.MoreHorizontal className="mr-1 inline h-3 w-3" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-ios-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon="CheckCircle2"
            title="No pending requests"
            description="Semua udah di-handle! 🎉"
            action={{ label: 'Lihat dashboard', onClick: () => router.push('/admin') }}
          />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                actioning={actioningId === r.id}
                rejecting={rejectingId === r.id}
                rejectReason={rejectReason}
                onApprove={() => handleApprove(r.id)}
                onReject={() => handleReject(r.id)}
                onStartReject={() => setRejectingId(r.id)}
                onCancelReject={() => { setRejectingId(null); setRejectReason(''); }}
                onChangeReason={setRejectReason}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed left-1/2 top-4 z-[200] -translate-x-1/2"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur-ios">
            {toast.type === 'success' ? (
              <Icons.CheckCircle2 className="h-4 w-4 text-ios-green" />
            ) : (
              <Icons.XCircle className="h-4 w-4 text-ios-red" />
            )}
            <span className="text-[13px] font-medium">{toast.message}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function RequestCard({
  request: r,
  actioning,
  rejecting,
  rejectReason,
  onApprove,
  onReject,
  onStartReject,
  onCancelReject,
  onChangeReason,
}: {
  request: PendingRequest;
  actioning: boolean;
  rejecting: boolean;
  rejectReason: string;
  onApprove: () => void;
  onReject: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onChangeReason: (v: string) => void;
}) {
  const year = r.releaseDate ? r.releaseDate.split('-')[0] : '';
  const requestedAgo = formatAgo(r.requestedAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="rounded-ios-lg border border-white/[0.08] bg-bg-surface p-4"
    >
      <div className="flex gap-3 md:gap-4">
        {/* Poster */}
        <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded bg-bg-elevated md:h-32 md:w-22">
          {r.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w185${r.posterPath}`}
              alt={r.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icons.Film className="h-6 w-6 text-white/20" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight md:text-base">{r.title}</p>
              <p className="text-[11px] text-white/50">
                {year} · {r.mediaType === 'movie' ? 'Movie' : 'TV Series'}
                {r.rating && ` · ★ ${r.rating.toFixed(1)}`}
              </p>
            </div>
            <span className="rounded-full bg-ios-orange/20 px-2 py-0.5 text-[10px] font-medium text-ios-orange">
              Pending
            </span>
          </div>

          <div className="mb-3 flex items-center gap-2 text-[11px] text-white/50">
            <Icons.User className="h-3 w-3" />
            <span>{r.guest.name}</span>
            <span className="text-white/20">•</span>
            <Icons.Clock className="h-3 w-3" />
            <span>{requestedAgo}</span>
          </div>

          {r.overview && (
            <p className="mb-3 line-clamp-2 text-[11px] leading-relaxed text-white/60">{r.overview}</p>
          )}

          {/* Guest note (if any) */}
          {(r as any).guestNote && (
            <div className="mb-3 flex items-start gap-2 rounded-ios-lg border border-ios-blue/30 bg-ios-blue/5 p-2.5">
              <Icons.Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-ios-blue" />
              <p className="text-[11px] leading-relaxed text-white/85">
                <span className="font-medium text-ios-blue">Catatan: </span>
                {(r as any).guestNote}
              </p>
            </div>
          )}

          {/* Actions */}
          {rejecting ? (
            <div className="space-y-2">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => onChangeReason(e.target.value)}
                placeholder="Alasan reject (optional)"
                className="input-ios w-full text-xs"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={onReject}
                  disabled={actioning}
                  className="flex-1 rounded-full bg-ios-red px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {actioning ? 'Rejecting...' : 'Confirm Reject'}
                </button>
                <button
                  onClick={onCancelReject}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onApprove}
                disabled={actioning}
                className="flex-1 rounded-full bg-ios-green px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {actioning ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icons.Loader2 className="h-3 w-3 animate-spin" />
                    Approving...
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Icons.Check className="h-3 w-3" />
                    Approve
                  </span>
                )}
              </button>
              <button
                onClick={onStartReject}
                disabled={actioning}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-ios-red/20 hover:text-ios-red disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icons.X className="h-3 w-3" />
                  Reject
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function formatAgo(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
