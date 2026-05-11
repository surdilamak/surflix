/**
 * My Requests Page (/requests)
 *
 * 2 modes:
 * 1. Belum login (no magic link verified) → minta email, kirim magic link
 * 2. Udah verified → tampilin list request guest tersebut
 */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Icons } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, isValidEmail } from '@/lib/utils';

interface RequestRow {
  id: string;
  title: string;
  mediaType: 'movie' | 'tv';
  posterPath?: string | null;
  status: string;
  requestedAt: string;
  approvedAt?: string | null;
  availableAt?: string | null;
}

const STORAGE_KEY = 'surflix_guest_info';
const SESSION_TOKEN_KEY = 'surflix_guest_token';

export default function RequestsPage() {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Check existing session token
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (token) {
        setGuestToken(token);
        loadRequests(token);
      } else {
        // Auto-fill email kalau ada di localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const { email: e } = JSON.parse(saved);
            if (e) setEmail(e);
          } catch {}
        }
      }
    }
  }, []);

  async function loadRequests(token: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/requests/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // Token expired
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        setGuestToken(null);
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

  async function handleSendMagicLink() {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Email gak valid');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal kirim email');
        setSending(false);
        return;
      }

      setEmailSent(true);
      setSending(false);
    } catch {
      setError('Network error');
      setSending(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setGuestToken(null);
    setRequests([]);
    setEmailSent(false);
  }

  // === RENDER ===

  // State 1: Email sent confirmation
  if (emailSent && !guestToken) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ios-green/15">
            <Icons.Mail className="h-7 w-7 text-ios-green" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Cek email lo</h1>
          <p className="mt-2 text-sm text-white/60">
            Link akses udah dikirim ke <span className="text-white">{email}</span>.
            Link aktif selama 30 menit.
          </p>
          <button onClick={() => setEmailSent(false)} className="btn-secondary mt-6 text-xs">
            Pakai email lain
          </button>
        </motion.div>
      </div>
    );
  }

  // State 2: Not logged in — show email form
  if (!guestToken) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4">
        <div className="w-full">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04]">
              <Icons.ListChecks className="h-6 w-6 text-white/40" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">My Requests</h1>
            <p className="mt-1 text-sm text-white/60">
              Ketik email lo untuk lihat status request
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="input-ios w-full"
              autoFocus
            />
            {error && (
              <div className="flex items-start gap-2 rounded-ios-lg border border-ios-red/30 bg-ios-red/10 p-2.5">
                <Icons.AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ios-red" />
                <p className="text-[11px] text-white/85">{error}</p>
              </div>
            )}
            <button
              onClick={handleSendMagicLink}
              disabled={sending}
              className="btn-primary w-full disabled:opacity-50"
            >
              {sending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Mengirim...
                </span>
              ) : (
                'Kirim Link Akses'
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-white/40">
              Kita akan kirim magic link ke email lo. Gak perlu password.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Logged in — show requests
  return (
    <div className="mx-auto max-w-3xl px-4 py-5 md:px-5 md:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">My Requests</h1>
          <p className="mt-1 text-xs text-white/50">
            {requests.length} request{requests.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Icons.LogOut className="h-3 w-3" />
            Sign out
          </span>
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
          description="Mulai request film atau series dari tab Trending atau Browse."
        />
      ) : (
        <div className="space-y-2.5">
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRow({ request }: { request: RequestRow }) {
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
            {formatDate(request.requestedAt)} ·{' '}
            {request.mediaType === 'movie' ? 'Movie' : 'TV Series'}
          </p>
          {statusConfig.hint && (
            <p className="mt-1.5 text-[10px] text-white/40">
              <Icons.Info className="mr-1 inline h-2.5 w-2.5" />
              {statusConfig.hint}
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
      return {
        label: 'Available',
        icon: Icons.Check,
        badgeClass: 'bg-ios-green/20 text-ios-green',
        borderClass: 'border-ios-green/30',
        hint: 'Udah ready di Jellyfin',
      };
    case 'PROCESSING':
      return {
        label: 'Downloading',
        icon: Icons.Download,
        badgeClass: 'bg-ios-blue/20 text-ios-blue',
        borderClass: 'border-ios-blue/30',
        hint: 'Lagi di-download, biasanya 30 menit - 2 jam',
      };
    case 'APPROVED':
      return {
        label: 'Approved',
        icon: Icons.Check,
        badgeClass: 'bg-ios-blue/20 text-ios-blue',
        borderClass: 'border-ios-blue/30',
        hint: 'Approved, lagi forward ke Jellyseerr',
      };
    case 'PENDING_ADMIN':
      return {
        label: 'Pending',
        icon: Icons.Clock,
        badgeClass: 'bg-ios-orange/20 text-ios-orange',
        borderClass: 'border-ios-orange/30',
        hint: 'Menunggu review admin (1-3 hari)',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        icon: Icons.X,
        badgeClass: 'bg-ios-red/20 text-ios-red',
        borderClass: 'border-ios-red/30',
        hint: undefined,
      };
    case 'PARTIALLY_AVAILABLE':
      return {
        label: 'Partial',
        icon: Icons.Check,
        badgeClass: 'bg-ios-green/20 text-ios-green',
        borderClass: 'border-ios-green/30',
        hint: 'Beberapa episode udah ready',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        icon: Icons.AlertCircle,
        badgeClass: 'bg-ios-red/20 text-ios-red',
        borderClass: 'border-ios-red/30',
        hint: 'Gagal diproses, admin akan retry',
      };
    default:
      return {
        label: status,
        icon: Icons.Info,
        badgeClass: 'bg-white/10 text-white/60',
        borderClass: 'border-white/10',
        hint: undefined,
      };
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
