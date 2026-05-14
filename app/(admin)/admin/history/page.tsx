/**
 * Admin History Page (/admin/history)
 *
 * Mix view:
 * - Stats summary (counts by status)
 * - Filter chips (status filter)
 * - Search by guest name / title
 * - Timeline list of requests with status
 */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Icons } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

interface HistoryRequest {
  id: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string | null;
  releaseDate?: string | null;
  status: string;
  requestedAt: string;
  approvedAt?: string | null;
  availableAt?: string | null;
  rejectedAt?: string | null;
  adminNote?: string | null;
  guest: {
    name: string;
    email: string;
  };
}

type StatusFilter = 'all' | 'AVAILABLE' | 'PROCESSING' | 'ON_SCHEDULE' | 'APPROVED' | 'REJECTED' | 'FAILED';

export default function AdminHistoryPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<HistoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const res = await fetch('/api/admin/requests?status=ALL&limit=200');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        // Exclude pending (they have their own page)
        setRequests((data.requests || []).filter((r: HistoryRequest) => r.status !== 'PENDING_ADMIN'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/login');
  }

  // Stats summary
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [requests]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = requests;
    if (filter !== 'all') {
      list = list.filter((r) => r.status === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.guest.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, filter, search]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/70 backdrop-blur-ios">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Image src="/logo-mark.png" alt="Surflix" width={24} height={24} className="h-6 w-6" />
              <span className="text-base font-semibold tracking-tighter">Surflix Admin</span>
            </div>
            <nav className="hidden gap-1 md:flex">
              <Link href="/admin" className="tab">Dashboard</Link>
              <Link href="/admin/pending" className="tab">Pending</Link>
              <Link href="/admin/history" className="tab tab-active">History</Link>
              <Link href="/admin/settings" className="tab">Settings</Link>
            </nav>
          </div>
          <button onClick={handleLogout} className="text-xs text-white/40 hover:text-white">
            <Icons.LogOut className="mr-1 inline h-3 w-3" />
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tighter md:text-3xl">History</h1>
        <p className="mb-6 text-xs text-white/40">
          {requests.length} total requests (excluding pending)
        </p>

        {/* Quick Stats */}
        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          <MiniStat label="Available" value={stats.AVAILABLE || 0} icon="CheckCircle2" color="green" />
          <MiniStat label="Downloading" value={stats.PROCESSING || 0} icon="Download" color="blue" />
          <MiniStat label="On Schedule" value={stats.ON_SCHEDULE || 0} icon="Calendar" color="blue" />
          <MiniStat label="Rejected" value={stats.REJECTED || 0} icon="X" color="red" />
        </div>

        {/* Search & Filter */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Icons.Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or guest name..."
              className="input-ios w-full pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>
              All ({requests.length})
            </FilterBtn>
            <FilterBtn active={filter === 'AVAILABLE'} onClick={() => setFilter('AVAILABLE')}>
              Available ({stats.AVAILABLE || 0})
            </FilterBtn>
            <FilterBtn active={filter === 'PROCESSING'} onClick={() => setFilter('PROCESSING')}>
              Downloading ({stats.PROCESSING || 0})
            </FilterBtn>
            <FilterBtn active={filter === 'ON_SCHEDULE'} onClick={() => setFilter('ON_SCHEDULE')}>
              On Schedule ({stats.ON_SCHEDULE || 0})
            </FilterBtn>
            <FilterBtn active={filter === 'APPROVED'} onClick={() => setFilter('APPROVED')}>
              Approved ({stats.APPROVED || 0})
            </FilterBtn>
            <FilterBtn active={filter === 'REJECTED'} onClick={() => setFilter('REJECTED')}>
              Rejected ({stats.REJECTED || 0})
            </FilterBtn>
            <FilterBtn active={filter === 'FAILED'} onClick={() => setFilter('FAILED')}>
              Failed ({stats.FAILED || 0})
            </FilterBtn>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-ios-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="Library"
            title="No requests found"
            description={search ? `No matches for "${search}"` : 'Try a different filter'}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <HistoryRow key={r.id} request={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: keyof typeof Icons;
  color: 'green' | 'blue' | 'red' | 'orange';
}) {
  const Icon = Icons[icon];
  const colorClasses = {
    green: 'text-ios-green',
    blue: 'text-ios-blue',
    red: 'text-ios-red',
    orange: 'text-ios-orange',
  };
  return (
    <div className="rounded-ios-lg border border-white/[0.06] bg-bg-surface p-3">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5', colorClasses[color])} />
        <span className="text-[11px] text-white/50">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tighter">{value}</p>
    </div>
  );
}

function FilterBtn({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all',
        active
          ? 'border-surflix-500 bg-surflix-500 text-white'
          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
      )}
    >
      {children}
    </button>
  );
}

function HistoryRow({ request: r }: { request: HistoryRequest }) {
  const config = getStatusBadge(r.status);
  const year = r.releaseDate ? r.releaseDate.split('-')[0] : '';
  const timeStr = formatAgo(r.availableAt || r.rejectedAt || r.approvedAt || r.requestedAt);

  return (
    <div className="rounded-ios-lg border border-white/[0.06] bg-bg-surface p-3">
      <div className="flex gap-3">
        <div className="h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-bg-elevated">
          {r.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w92${r.posterPath}`}
              alt={r.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/20">
              <Icons.Film className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium">{r.title}</p>
            <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', config.badgeClass)}>
              <span className="inline-flex items-center gap-1">
                <config.icon className="h-2.5 w-2.5" />
                {config.label}
              </span>
            </span>
          </div>
          <p className="text-[11px] text-white/45">
            {year && <>{year} · </>}
            {r.mediaType === 'movie' ? 'Movie' : 'TV Series'} · by{' '}
            <span className="text-white/65">{r.guest.name}</span>
            {' · '}{timeStr}
          </p>
          {r.adminNote && (
            <p className="mt-1 truncate rounded bg-white/[0.04] px-2 py-1 text-[10px] text-white/50">
              <Icons.Info className="mr-1 inline h-2.5 w-2.5" />
              {r.adminNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return { label: 'Available', icon: Icons.CheckCircle2, badgeClass: 'bg-ios-green/20 text-ios-green' };
    case 'PROCESSING':
      return { label: 'Downloading', icon: Icons.Download, badgeClass: 'bg-ios-blue/20 text-ios-blue' };
    case 'ON_SCHEDULE':
      return { label: 'On Schedule', icon: Icons.Calendar, badgeClass: 'bg-ios-blue/20 text-ios-blue' };
    case 'APPROVED':
      return { label: 'Approved', icon: Icons.Check, badgeClass: 'bg-ios-blue/20 text-ios-blue' };
    case 'REJECTED':
      return { label: 'Rejected', icon: Icons.X, badgeClass: 'bg-ios-red/20 text-ios-red' };
    case 'PARTIALLY_AVAILABLE':
      return { label: 'Partial', icon: Icons.Check, badgeClass: 'bg-ios-green/20 text-ios-green' };
    case 'FAILED':
      return { label: 'Failed', icon: Icons.AlertCircle, badgeClass: 'bg-ios-red/20 text-ios-red' };
    default:
      return { label: status, icon: Icons.Info, badgeClass: 'bg-white/10 text-white/60' };
  }
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
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
