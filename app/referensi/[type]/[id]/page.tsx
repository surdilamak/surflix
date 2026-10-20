/**
 * Portal Referensi — peta satu film: judul besar, panggung 3D, lalu alasan tiap pasangan.
 */
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { notFound, useParams } from 'next/navigation';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { usePortal } from '@/lib/hooks/use-portal';
import { useReveal } from '@/lib/hooks/use-reveal';
import { watchUrl } from '@/lib/jellyfin';
import { filmKey, posterOf, REL_LABEL, REL_VAR, type PortalFilm } from '@/lib/portal-data';
import type { GraphData } from '@/components/connections/connection-graph';

const ConnectionGraph = dynamic(
  () => import('@/components/connections/connection-graph').then((m) => m.ConnectionGraph),
  { ssr: false, loading: () => <div className="ref-stage" aria-busy="true" /> }
);

export default function ReferensiFilmPage() {
  const params = useParams<{ type: string; id: string }>();
  // Cuma /movie/<id> & /tv/<id>; selain itu (mis. /admin/...) 404, bukan film kosong
  if (!['movie', 'tv'].includes(params.type) || !/^\d+$/.test(params.id)) notFound();

  const config = useAppConfig();
  const { portalPath } = usePortal();
  const [data, setData] = useState<GraphData | null>(null);
  const [films, setFilms] = useState<PortalFilm[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/connections?type=${params.type}&id=${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
    fetch('/api/connections/films')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setFilms(d.films))
      .catch(() => {});
  }, [params.type, params.id]);

  useReveal(!!data && !!config);

  if (error) {
    return (
      <section className="ref-detail-top" style={{ paddingBottom: 96 }}>
        <p style={{ marginTop: 40 }}>Gagal memuat peta. Coba refresh.</p>
      </section>
    );
  }
  if (!data || !config) return <section className="ref-detail-top" style={{ minHeight: 640 }} aria-busy="true" />;
  if (data.nodes.length === 0) {
    return (
      <section className="ref-detail-top" style={{ paddingBottom: 96 }}>
        <p style={{ marginTop: 40 }}>Belum ada peta referensi untuk film ini.</p>
      </section>
    );
  }

  const source = data.nodes[0];
  const targets = new Map(data.nodes.slice(1).map((n) => [n.id, n]));
  const mapKeys = new Set(films.map((f) => filmKey(f.mediaType, f.tmdbId)));
  const jellyfinUrl = config.jellyfinUrl;

  return (
    <>
      <section className="ref-detail-top">
        <h1 className="ref-detail-title ref-display">
          <span className="ref-line"><span>{source.title}</span></span>
        </h1>
        <p className="ref-detail-sub">
          {source.year ? `${source.year}. ` : ''}
          {data.edges.length} film nyambung ke film ini. Putar rak, ketuk satu case, baca kenapa.
        </p>
        {source.jellyfinId && (
          <div className="ref-detail-actions">
            <a className="ref-btn" href={watchUrl(source.jellyfinId, jellyfinUrl, config.jellyfinServerId)} target="_blank" rel="noopener">
              Tonton di Surflix
            </a>
          </div>
        )}
        <div className="ref-stage-wrap" style={{ margin: '40px calc(var(--margin) * -1) 0' }}>
          <ConnectionGraph
            data={data}
            jellyfinUrl={jellyfinUrl}
            serverId={config.jellyfinServerId}
            mapKeys={mapKeys}
            portalPath={portalPath}
          />
        </div>
      </section>

      <section className="ref-why">
        <h2 className="ref-display ref-reveal">Kenapa nyambung</h2>
        {data.edges.map((e, i) => {
          const t = targets.get(e.to);
          if (!t) return null;
          const src = posterOf(t, jellyfinUrl, 240);
          return (
            <div key={e.to} className="ref-why-row ref-reveal" style={{ '--d': `${Math.min(i, 5) * 50}ms` } as React.CSSProperties}>
              <span className="ref-frame">
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={t.title} loading="lazy" draggable={false} />
                )}
              </span>
              <div>
                <p className="ref-why-name">
                  {mapKeys.has(filmKey(t.mediaType, t.tmdbId)) ? (
                    <a href={portalPath(`/${t.mediaType}/${t.tmdbId}`)}>{t.title}</a>
                  ) : (
                    t.title
                  )}
                  {t.year ? <small>{t.year}</small> : null}
                </p>
                <p className="ref-why-rel">
                  <span className="ref-mark" style={{ '--c': REL_VAR[e.relationship] } as React.CSSProperties} />
                  {REL_LABEL[e.relationship] ?? e.relationship}
                </p>
                <p className="ref-why-reason">{e.reason}</p>
              </div>
              {t.jellyfinId && (
                <a className="ref-btn" href={watchUrl(t.jellyfinId, jellyfinUrl, config.jellyfinServerId)} target="_blank" rel="noopener">
                  Tonton
                </a>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
