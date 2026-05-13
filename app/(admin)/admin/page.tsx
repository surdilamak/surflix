/**
 * Admin Dashboard (/admin)
 *
 * Summary stats + recent activity + quick actions
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface DashboardData {
  summary: {
    totalRequests: number;
    pendingCount: number;
    approvedCount: number;
    processingCount: number;
    availableCount: number;
    rejectedCount: number;
    moviesCount: number;
    seriesCount: number;
    totalGuests: number;
  };
  topRequesters: Array<{
    name: string;
    email: string;
    requestCount: number;
    memberSince: string;
  }>;
  recentEvents: Array<{
    type: string;
    payload: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Poll setiap 30 detik
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/login');
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const { summary, topRequesters, recentEvents } = data;

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
              <Link href="/admin" className="tab tab-active">Dashboard</Link>
              <Link href="/admin/pending" className="tab">
                Pending
                {summary.pendingCount > 0 && (
                  <span className="ml-1 rounded-full bg-surflix-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {summary.pendingCount}
                  </span>
                )}
              </Link>
              <Link href="/admin/history" className="tab">History</Link>
              <Link href="/admin/settings" className="tab">Settings</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-white/40 hover:text-white/70">
              <Icons.ExternalLink className="mr-1 inline h-3 w-3" />
              View as guest
            </Link>
            <button onClick={handleLogout} className="text-xs text-white/40 hover:text-white">
              <Icons.LogOut className="mr-1 inline h-3 w-3" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tighter md:text-3xl">Dashboard</h1>

        {/* Pending Alert */}
        {summary.pendingCount > 0 && (
          <Link
            href="/admin/pending"
            className="mb-6 flex items-center gap-3 rounded-ios-lg border border-ios-orange/30 bg-ios-orange/10 p-4 transition-all hover:bg-ios-orange/15"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ios-orange/20">
              <Icons.Bell className="h-5 w-5 text-ios-orange" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {summary.pendingCount} request menunggu review
              </p>
              <p className="mt-0.5 text-xs text-white/60">Klik untuk approve/reject</p>
            </div>
            <Icons.ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
        )}

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total Requests" value={summary.totalRequests} icon="ListChecks" />
          <StatCard label="Pending" value={summary.pendingCount} icon="Clock" color="orange" />
          <StatCard label="Downloading" value={summary.processingCount} icon="Download" color="blue" />
          <StatCard label="Available" value={summary.availableCount} icon="CheckCircle2" color="green" />
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label="Movies in Library" value={summary.moviesCount} icon="Film" />
          <StatCard label="Series in Library" value={summary.seriesCount} icon="Tv" />
          <StatCard label="Total Guests" value={summary.totalGuests} icon="User" />
        </div>

        {/* Two-column section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Requesters */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/40">
              Top Requesters
            </h2>
            {topRequesters.length === 0 ? (
              <div className="rounded-ios-lg border border-white/[0.06] bg-white/[0.02] p-6 text-center text-xs text-white/40">
                Belum ada data
              </div>
            ) : (
              <div className="space-y-2">
                {topRequesters.map((r, idx) => (
                  <div
                    key={r.email}
                    className="flex items-center gap-3 rounded-ios-lg border border-white/[0.06] bg-bg-surface p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ios-orange to-surflix-500 text-xs font-semibold text-white">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="text-[11px] text-white/40">
                        {r.requestCount} request{r.requestCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {idx === 0 && (
                      <span className="rounded-full bg-ios-orange/20 px-2 py-0.5 text-[10px] font-medium text-ios-orange">
                        🏆 Top
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Activity */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/40">
              Recent Activity
            </h2>
            {recentEvents.length === 0 ? (
              <div className="rounded-ios-lg border border-white/[0.06] bg-white/[0.02] p-6 text-center text-xs text-white/40">
                Belum ada aktivitas
              </div>
            ) : (
              <div className="space-y-2">
                {recentEvents.slice(0, 6).map((e, idx) => (
                  <ActivityRow key={idx} event={e} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = 'gray' }: {
  label: string;
  value: number;
  icon: keyof typeof Icons;
  color?: 'gray' | 'orange' | 'blue' | 'green' | 'red';
}) {
  const Icon = Icons[icon];
  const colorClasses = {
    gray: 'text-white/70 bg-white/[0.04]',
    orange: 'text-ios-orange bg-ios-orange/10',
    blue: 'text-ios-blue bg-ios-blue/10',
    green: 'text-ios-green bg-ios-green/10',
    red: 'text-ios-red bg-ios-red/10',
  };

  return (
    <div className="rounded-ios-lg border border-white/[0.06] bg-bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-white/50">{label}</p>
          <p className="text-xl font-semibold tracking-tighter">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ event }: { event: { type: string; payload: string; createdAt: string } }) {
  const config = getEventConfig(event.type);
  const time = new Date(event.createdAt);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - time.getTime()) / 60000);
  const timeStr = diffMins < 60 ? `${diffMins}m` : diffMins < 1440 ? `${Math.floor(diffMins / 60)}h` : `${Math.floor(diffMins / 1440)}d`;

  let detail = '';
  try {
    const payload = JSON.parse(event.payload);
    detail = payload.guestName || payload.username || payload.title || '';
  } catch {}

  return (
    <div className="flex items-start gap-3 rounded-ios-lg border border-white/[0.06] bg-bg-surface p-3">
      <div className={cn('mt-0.5 flex h-6 w-6 items-center justify-center rounded-full', config.bgClass)}>
        <config.icon className={cn('h-3 w-3', config.iconClass)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{config.label}</p>
        {detail && <p className="truncate text-[11px] text-white/50">{detail}</p>}
      </div>
      <span className="text-[10px] text-white/30">{timeStr} ago</span>
    </div>
  );
}

function getEventConfig(type: string) {
  switch (type) {
    case 'request.created':
      return { label: 'New request', icon: Icons.Plus, iconClass: 'text-ios-orange', bgClass: 'bg-ios-orange/15' };
    case 'request.approved':
      return { label: 'Request approved', icon: Icons.Check, iconClass: 'text-ios-green', bgClass: 'bg-ios-green/15' };
    case 'request.rejected':
      return { label: 'Request rejected', icon: Icons.X, iconClass: 'text-ios-red', bgClass: 'bg-ios-red/15' };
    case 'admin.login':
      return { label: 'Admin login', icon: Icons.User, iconClass: 'text-ios-blue', bgClass: 'bg-ios-blue/15' };
    case 'jellyseerr.MEDIA_AVAILABLE':
      return { label: 'Media available', icon: Icons.CheckCircle2, iconClass: 'text-ios-green', bgClass: 'bg-ios-green/15' };
    default:
      return { label: type, icon: Icons.Info, iconClass: 'text-white/50', bgClass: 'bg-white/10' };
  }
}
