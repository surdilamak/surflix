/**
 * Portal Referensi — peta satu film: judul besar, panggung 3D, lalu alasan tiap pasangan.
 * Judul yang ada di library tapi belum punya peta mendapat halaman "belum ada peta".
 */
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { notFound, useParams } from 'next/navigation';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { usePortal } from '@/lib/hooks/use-portal';
import { useReveal } from '@/lib/hooks/use-reveal';
import { posterUrl, watchUrl } from '@/lib/jellyfin';
import { filmKey, posterOf, REL_VAR } from '@/lib/portal-data';
import { useLang } from '@/components/connections/lang-provider';
import { SearchBox } from '@/components/connections/search-box';
import { LensSwitch } from '@/components/connections/lens-switch';
import type { GraphData } from '@/components/connections/connection-graph';
import type { SagaHere } from '@/lib/connections';

const ConnectionGraph = dynamic(
  () => import('@/components/connections/connection-graph').then((m) => m.ConnectionGraph),
  { ssr: false, loading: () => <div className="ref-stage" aria-busy="true" /> }
);

interface LibTitle {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  jellyfinId: string | null;
  directors: string | null;
}

export default function ReferensiFilmPage() {
  const params = useParams<{ type: string; id: string }>();
  // Cuma /movie/<id> & /tv/<id>; selain itu (mis. /admin/...) 404, bukan film kosong
  if (!['movie', 'tv'].includes(params.type) || !/^\d+$/.test(params.id)) notFound();

  const config = useAppConfig();
  const { portalPath } = usePortal();
  const { t, rel, reason } = useLang();
  const [data, setData] = useState<(GraphData & { saga?: SagaHere | null }) | null>(null);
  const [lib, setLib] = useState<LibTitle | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(null);
    setLib(null);
    fetch(`/api/connections?type=${params.type}&id=${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: GraphData & { saga?: SagaHere | null }) => {
        setData(d);
        if (d.nodes.length === 0) {
          fetch(`/api/library/title?type=${params.type}&id=${params.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then(setLib)
            .catch(() => {});
        }
      })
      .catch(() => setError(true));
  }, [params.type, params.id]);

  useReveal(!!data && !!config);

  const top = (children: React.ReactNode) => (
    <section className="ref-detail-top" style={{ paddingBottom: 96 }}>
      {children}
    </section>
  );

  if (error) return top(<p>{t('detail.error')}</p>);
  if (!data || !config) return <section className="ref-detail-top" style={{ minHeight: 640 }} aria-busy="true" />;

  const jellyfinUrl = config.jellyfinUrl;
  const sagaHref = (id: string, film?: string) =>
    `${portalPath(`/timeline/${id}`) || `/timeline/${id}`}${film ? `?film=${film}` : ''}`;

  // ── judul ada di library tapi belum punya peta
  if (data.nodes.length === 0) {
    return top(
      <>
        <h1 className="ref-detail-title ref-display">
          <span className="ref-line"><span>{lib ? lib.title : t('detail.nomapTitle')}</span></span>
        </h1>
        <p className="ref-detail-sub">
          {lib ? <b>{t('detail.nomapTitle')}. </b> : null}
          {t('detail.nomapBody')}
        </p>
        <div className="ref-detail-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {lib?.jellyfinId && (
            <a className="ref-btn" href={watchUrl(lib.jellyfinId, jellyfinUrl, config.jellyfinServerId)} target="_blank" rel="noopener">
              {t('detail.watch')}
            </a>
          )}
          <a className="ref-btn ref-btn--light" href={`${portalPath('/') || '/'}#peta`}>
            {t('detail.back')}
          </a>
        </div>
        <div className="ref-detail-search">
          <SearchBox variant="compact" />
        </div>
      </>
    );
  }

  const source = data.nodes[0];
  const targets = new Map(data.nodes.slice(1).map((n) => [n.id, n]));
  const saga = data.saga ?? null;
  const sub = source.year
    ? t('detail.subYear', { year: source.year, n: data.edges.length })
    : t('detail.sub', { n: data.edges.length });

  return (
    <>
      <section className="ref-detail-top">
        <div className="ref-detail-search">
          <SearchBox variant="compact" />
        </div>
        <h1 className="ref-detail-title ref-display">
          <span className="ref-line"><span>{source.title}</span></span>
        </h1>
        <p className="ref-detail-sub">{sub}</p>
        <div className="ref-detail-actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 28px' }}>
          {source.jellyfinId && (
            <a className="ref-btn" href={watchUrl(source.jellyfinId, jellyfinUrl, config.jellyfinServerId)} target="_blank" rel="noopener">
              {t('detail.watch')}
            </a>
          )}
        </div>
        <LensSwitch
          current="map"
          mediaType={source.mediaType}
          tmdbId={source.tmdbId}
          sagaId={saga?.id}
          className="ref-lens--top"
        />
        <div className="ref-stage-wrap" style={{ margin: '40px calc(var(--margin) * -1) 0' }}>
          <ConnectionGraph data={data} jellyfinUrl={jellyfinUrl} serverId={config.jellyfinServerId} portalPath={portalPath} />
        </div>
      </section>

      {saga && (
        <section className="ref-here" aria-label={t('detail.saga', { name: saga.name })}>
          <div className="ref-here-head">
            <p className="ref-here-name">
              {t('detail.sagaPart')} <a href={sagaHref(saga.id)}>{saga.name}</a>
            </p>
            <p className="ref-here-pos">{t('detail.sagaPos', { n: saga.position, total: saga.total })}</p>
          </div>
          <ol className="ref-here-line">
            {saga.around.map((n) => (
              <li key={n.key} data-here={n.here ? '' : undefined}>
                <a
                  href={n.here ? sagaHref(saga.id, `${n.mediaType}:${n.tmdbId}`) : n.mapped && n.tmdbId ? portalPath(`/${n.mediaType}/${n.tmdbId}`) || '/' : sagaHref(saga.id, n.tmdbId ? `${n.mediaType}:${n.tmdbId}` : undefined)}
                  className="ref-frame"
                  title={`${n.title} (${n.year})`}
                >
                  {n.jellyfinId && jellyfinUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={posterUrl(n.jellyfinId, jellyfinUrl, 200)} alt={n.title} loading="lazy" />
                  ) : null}
                </a>
                <span>{n.title}</span>
              </li>
            ))}
          </ol>
          <a className="ref-btn ref-here-open" href={sagaHref(saga.id, `${source.mediaType}:${source.tmdbId}`)}>
            {t('detail.sagaOpen')}
          </a>
        </section>
      )}

      <section className="ref-why">
        <h2 className="ref-display ref-reveal">{t('detail.why')}</h2>
        {data.edges.map((e, i) => {
          const n = targets.get(e.to);
          if (!n) return null;
          const src = posterOf(n, jellyfinUrl, 240);
          const mapLink = (n.refCount ?? 0) > 0 ? portalPath(`/${n.mediaType}/${n.tmdbId}`) || '/' : null;
          return (
            <div key={e.to} className="ref-why-row ref-reveal" style={{ '--d': `${Math.min(i, 5) * 50}ms` } as React.CSSProperties}>
              <span className="ref-frame">
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={n.title} loading="lazy" draggable={false} />
                )}
              </span>
              <div>
                <p className="ref-why-name">
                  {mapLink ? <a href={mapLink}>{n.title}</a> : n.title}
                  {n.year ? <small>{n.year}</small> : null}
                </p>
                <p className="ref-why-rel">
                  <span className="ref-mark" style={{ '--c': REL_VAR[e.relationship] } as React.CSSProperties} />
                  {rel(e.relationship, e.direction)}
                </p>
                <p className="ref-why-reason">{reason(e)}</p>
              </div>
              {n.jellyfinId && (
                <a className="ref-btn" href={watchUrl(n.jellyfinId, jellyfinUrl, config.jellyfinServerId)} target="_blank" rel="noopener">
                  {t('detail.tap')}
                </a>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
