/**
 * Admin Overview (/admin)
 *
 * Yang perlu perhatian dulu (request menunggu, koneksi menunggu review, unduhan berjalan), lalu angka
 * ringkas, cakupan peta Reference, aktivitas terbaru yang terbaca manusia, dan tamu teraktif.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { useAdmin } from '@/components/admin/context';
import { PageHead, Skeletons } from '@/components/admin/ui';
import { ago } from '@/lib/admin-format';

interface Stats {
  summary: {
    totalRequests: number;
    pendingCount: number;
    availableCount: number;
    rejectedCount: number;
    totalGuests: number;
  };
  topRequesters: Array<{ name: string; email: string; requestCount: number }>;
  recentEvents: Array<{
    type: string;
    createdAt: string;
    title: string | null;
    guestName: string | null;
  }>;
}

interface LibStats {
  moviesCount: number;
  seriesCount: number;
  mappedCount: number;
}

const fmt = (n: number) => n.toLocaleString('en-US');

function describe(e: Stats['recentEvents'][number]): { text: string; icon: keyof typeof Icons; tone: string } {
  const who = e.guestName ?? 'A guest';
  const what = e.title ?? 'a title';
  switch (e.type) {
    case 'request.created':
      return { text: `${who} requested ${what}`, icon: 'Plus', tone: 'accent' };
    case 'request.approved':
      return { text: `${what} approved`, icon: 'Check', tone: 'green' };
    case 'request.rejected':
      return { text: `${what} rejected`, icon: 'X', tone: 'red' };
    case 'remark.created':
      return { text: `${who} left a note on ${what}`, icon: 'MessageSquare', tone: 'accent' };
    case 'admin.login':
      return { text: `${e.guestName ?? 'Admin'} signed in`, icon: 'User', tone: 'muted' };
    case 'jellyseerr.MEDIA_AVAILABLE':
      return { text: `${what} is now available`, icon: 'CheckCircle2', tone: 'green' };
    default:
      return { text: e.type, icon: 'Info', tone: 'muted' };
  }
}

export default function AdminOverviewPage() {
  const { api, counts, toast, refreshCounts } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [lib, setLib] = useState<LibStats | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const [{ res, data }, libRes] = await Promise.all([
      api('/api/admin/stats'),
      fetch('/api/library-stats').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (res.ok) setStats(data);
    if (libRes) setLib(libRes);
  }, [api]);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  async function sync() {
    setSyncing(true);
    const { res, data } = await api('/api/admin/library/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    setSyncing(false);
    if (!res.ok) return toast(data.error || 'Sync failed', 'error');
    toast(`Library synced: ${data.created} new, ${data.updated} updated`);
    load();
    refreshCounts();
  }

  if (!stats) {
    return (
      <>
        <PageHead title="Overview" />
        <Skeletons n={4} h={120} />
      </>
    );
  }

  const { summary, topRequesters, recentEvents } = stats;
  const mappedPct = lib && lib.moviesCount + lib.seriesCount > 0 ? Math.round((100 * lib.mappedCount) / (lib.moviesCount + lib.seriesCount)) : 0;

  return (
    <>
      <PageHead title="Overview" sub="What needs you, and how the library is doing.">
        <button type="button" className="ad-btn ad-btn--sm" onClick={sync} disabled={syncing} title="Pull new titles from Jellyfin into the snapshot">
          <Icons.RefreshCw className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync library'}
        </button>
      </PageHead>

      {/* Perlu perhatian */}
      <div className="ad-grid md:grid-cols-3">
        <Link href="/admin/requests" className={`ad-tile ad-tile--link ${counts.pendingRequests > 0 ? 'ad-tile--accent' : ''}`}>
          <p className="ad-label"><Icons.Inbox /> Requests waiting</p>
          <p className="ad-num">{counts.pendingRequests}</p>
          <p className="ad-small ad-muted" style={{ marginTop: 8 }}>
            {counts.pendingRequests > 0 ? 'Approve or reject' : 'All clear'}
          </p>
        </Link>
        <Link href="/admin/connections?tab=queue" className="ad-tile ad-tile--link">
          <p className="ad-label"><Icons.Network /> Connections to review</p>
          <p className="ad-num">{counts.reviewQueue}</p>
          <p className="ad-small ad-muted" style={{ marginTop: 8 }}>
            {counts.reviewQueue > 0 ? 'Read the reason, then approve' : 'Nothing in the queue'}
          </p>
        </Link>
        <Link href="/admin/requests?view=history" className="ad-tile ad-tile--link">
          <p className="ad-label"><Icons.Download /> In the download pipeline</p>
          <p className="ad-num">{counts.downloading}</p>
          <p className="ad-small ad-muted" style={{ marginTop: 8 }}>Approved, queued or downloading</p>
        </Link>
      </div>

      {/* Angka */}
      <h2 className="ad-h2 ad-section-title">Requests</h2>
      <div className="ad-grid grid-cols-2 md:grid-cols-4">
        {[
          ['Total', summary.totalRequests],
          ['Available', summary.availableCount],
          ['Rejected', summary.rejectedCount],
          ['Guests', summary.totalGuests],
        ].map(([label, n]) => (
          <div key={label as string} className="ad-tile">
            <p className="ad-label">{label}</p>
            <p className="ad-num">{fmt(n as number)}</p>
          </div>
        ))}
      </div>

      {/* Library */}
      {lib && (
        <>
          <h2 className="ad-h2 ad-section-title">Library</h2>
          <div className="ad-grid md:grid-cols-3">
            <div className="ad-tile">
              <p className="ad-label"><Icons.Film /> Films</p>
              <p className="ad-num">{fmt(lib.moviesCount)}</p>
            </div>
            <div className="ad-tile">
              <p className="ad-label"><Icons.Tv /> Series</p>
              <p className="ad-num">{fmt(lib.seriesCount)}</p>
            </div>
            <Link href="/admin/connections" className="ad-tile ad-tile--link">
              <p className="ad-label"><Icons.Network /> Reference coverage</p>
              <p className="ad-num">
                {fmt(lib.mappedCount)} <span className="ad-h2 ad-muted" style={{ fontWeight: 500 }}>of {fmt(lib.moviesCount + lib.seriesCount)}</span>
              </p>
              <div className="ad-bar" style={{ marginTop: 12 }} role="img" aria-label={`${mappedPct}% of titles have a map`}>
                <i style={{ width: `${mappedPct}%` }} />
              </div>
            </Link>
          </div>
        </>
      )}

      {/* Aktivitas + tamu */}
      <div className="ad-grid lg:grid-cols-5" style={{ marginTop: 28, gap: 16 }}>
        <section className="lg:col-span-3">
          <h2 className="ad-h2" style={{ marginBottom: 10 }}>Recent activity</h2>
          {recentEvents.length === 0 ? (
            <p className="ad-tile ad-small ad-muted">Nothing yet.</p>
          ) : (
            <div className="ad-tile ad-tile--flush">
              {recentEvents.map((e, i) => {
                const d = describe(e);
                const Icon = Icons[d.icon];
                return (
                  <div key={i} className="flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <span
                      className="flex items-center justify-center"
                      style={{
                        width: 28, height: 28, borderRadius: 8, background: 'var(--ad-raised)', flex: '0 0 auto',
                        color: d.tone === 'green' ? 'var(--ad-green)' : d.tone === 'red' ? 'var(--ad-red)' : d.tone === 'accent' ? 'var(--ad-accent)' : 'var(--ad-muted)',
                      }}
                    >
                      <Icon width={15} height={15} />
                    </span>
                    <span className="ad-small min-w-0 flex-1 truncate">{d.text}</span>
                    <span className="ad-small ad-muted shrink-0">{ago(e.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className="ad-h2" style={{ marginBottom: 10 }}>Top requesters</h2>
          {topRequesters.length === 0 ? (
            <p className="ad-tile ad-small ad-muted">Nothing yet.</p>
          ) : (
            <div className="ad-tile ad-tile--flush">
              {topRequesters.map((r, i) => (
                <div key={r.email} className="flex items-center gap-3" style={{ padding: '12px 16px' }}>
                  <span
                    className="flex items-center justify-center ad-small"
                    style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? 'var(--ad-accent)' : 'var(--ad-raised)', color: i === 0 ? '#0d0d0f' : 'var(--ad-ink)', fontWeight: 700, flex: '0 0 auto' }}
                  >
                    {r.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="ad-text min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="ad-small ad-muted shrink-0">{r.requestCount} request{r.requestCount === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
