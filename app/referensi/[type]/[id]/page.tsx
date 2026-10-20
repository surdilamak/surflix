/**
 * Portal Referensi — peta referensi satu film (graph 3D + daftar alasan)
 */
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { notFound, useParams } from 'next/navigation';
import { Icons } from '@/components/ui/icons';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { usePortal } from '@/lib/hooks/use-portal';
import { watchUrl } from '@/lib/jellyfin';
import type { GraphData } from '@/components/connections/connection-graph';

const ConnectionGraph = dynamic(
  () => import('@/components/connections/connection-graph').then((m) => m.ConnectionGraph),
  { ssr: false, loading: () => <div className="h-[520px] animate-pulse rounded-ios-lg bg-white/[0.04]" /> }
);

const REL: Record<string, { label: string; cls: string }> = {
  homage: { label: 'homage', cls: 'bg-[#7F77DD]/20 text-[#9d97e8]' },
  inspired: { label: 'inspired by', cls: 'bg-ios-green/20 text-ios-green' },
  visual: { label: 'visual ref', cls: 'bg-ios-orange/20 text-ios-orange' },
};

export default function ReferensiFilmPage() {
  const params = useParams<{ type: string; id: string }>();
  // Cuma /movie/<id> & /tv/<id>; selain itu (mis. /admin/...) 404, bukan film kosong
  if (!['movie', 'tv'].includes(params.type) || !/^\d+$/.test(params.id)) notFound();

  const config = useAppConfig();
  const { portalPath } = usePortal();
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/connections?type=${params.type}&id=${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [params.type, params.id]);

  const back = (
    <a
      href={portalPath('/') || '/'}
      className="mb-4 inline-flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-white"
    >
      <Icons.ArrowLeft className="h-3 w-3" />
      Semua referensi
    </a>
  );

  if (error) {
    return (
      <>
        {back}
        <p className="py-16 text-center text-sm text-white/50">Gagal memuat peta referensi. Coba refresh.</p>
      </>
    );
  }

  if (!data) {
    return (
      <>
        {back}
        <div className="h-[520px] animate-pulse rounded-ios-lg bg-white/[0.04]" />
      </>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <>
        {back}
        <p className="py-16 text-center text-sm text-white/50">Belum ada peta referensi buat film ini.</p>
      </>
    );
  }

  const source = data.nodes[0];
  const targets = new Map(data.nodes.slice(1).map((n) => [n.id, n]));
  const jellyfinUrl = config?.jellyfinUrl;

  return (
    <>
      {back}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tighter md:text-3xl">{source.title}</h1>
        <p className="mt-1 text-sm text-white/60">
          {source.year ? `${source.year} · ` : ''}
          {data.edges.length} film yang nyambung
        </p>
      </div>

      {/* Tunggu config biar URL poster Jellyfin udah tersedia sebelum three.js bikin scene */}
      {config ? (
        <ConnectionGraph data={data} jellyfinUrl={jellyfinUrl} heightClass="h-[520px] md:h-[600px]" />
      ) : (
        <div className="h-[520px] animate-pulse rounded-ios-lg bg-white/[0.04]" />
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tighter">Kenapa nyambung</h2>
      <div className="space-y-2">
        {data.edges.map((e) => {
          const t = targets.get(e.to);
          if (!t) return null;
          const rel = REL[e.relationship];
          return (
            <div key={e.to} className="flex items-start gap-3 rounded-ios-lg border border-white/[0.08] bg-bg-surface p-3.5">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <a href={portalPath(`/${t.mediaType}/${t.tmdbId}`)} className="text-sm font-semibold tracking-tight hover:underline">
                    {t.title}
                  </a>
                  {t.year && <span className="text-xs text-white/40">{t.year}</span>}
                  {rel && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${rel.cls}`}>{rel.label}</span>
                  )}
                </div>
                <p className="text-[13px] leading-relaxed text-white/70">{e.reason}</p>
              </div>
              {t.jellyfinId && jellyfinUrl && (
                <a
                  href={watchUrl(t.jellyfinId, jellyfinUrl)}
                  target="_blank"
                  rel="noopener"
                  className="flex-shrink-0 rounded-full bg-surflix-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  ▶ Tonton
                </a>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
