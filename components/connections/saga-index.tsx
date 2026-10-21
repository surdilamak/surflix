/**
 * Watch order — indeks: satu baris per saga, persis seperti contact sheet di beranda Reference
 * (judul, rak poster dalam urutan cerita, tautan buka). Pencarian memakai SearchBox yang sama:
 * judul yang punya saga langsung membuka jalurnya, yang tidak punya jatuh ke peta koneksinya.
 */
'use client';

import { useRouter } from 'next/navigation';
import { usePortal } from '@/lib/hooks/use-portal';
import { useReveal } from '@/lib/hooks/use-reveal';
import { posterUrl } from '@/lib/jellyfin';
import { useLang } from './lang-provider';
import { SearchBox } from './search-box';
import type { SagaCard } from '@/lib/connections';

export function SagaIndex({
  sagas,
  membership,
  jellyfinUrl,
}: {
  sagas: SagaCard[];
  /** "movie:123" -> id saga, buat mengarahkan hasil pencarian */
  membership: Record<string, string>;
  jellyfinUrl: string;
}) {
  const { t } = useLang();
  const { portalPath } = usePortal();
  const router = useRouter();
  useReveal(sagas.length > 0);

  const sagaHref = (id: string, film?: string) =>
    `${portalPath(`/timeline/${id}`) || `/timeline/${id}`}${film ? `?film=${film}` : ''}`;


  const titles = sagas.reduce((n, s) => n + s.total, 0);
  // saga bertiga ke atas dapat rak poster; pasangan dua judul cukup satu daftar padat
  const runs = sagas.filter((s) => s.total > 2);
  const pairs = sagas.filter((s) => s.total === 2);

  return (
    <div className="ref-saga-index">
      <section className="ref-detail-top">
        <div className="ref-detail-search">
          <SearchBox
            variant="compact"
            placeholder={t('tl.search')}
            onPick={(r) => {
              const id = membership[`${r.mediaType}:${r.tmdbId}`];
              if (!id) return false; // tanpa saga: biarkan SearchBox membuka peta judulnya
              router.push(sagaHref(id, `${r.mediaType}:${r.tmdbId}`));
              return true;
            }}
          />
        </div>
        <h1 className="ref-detail-title ref-display">
          <span className="ref-line">
            <span>{t('tl.h1')}</span>
          </span>
        </h1>
        <p className="ref-detail-sub">{t('tl.sub')}</p>
      </section>

      <section className="ref-sheet">
        <div className="ref-sheet-head">
          <h2 className="ref-reveal">{t('tl.index.heading', { n: sagas.length })}</h2>
          <p className="ref-caption">{t('tl.index.caption', { n: titles })}</p>
        </div>

        {runs.map((s, i) => (
          <div key={s.id} className="ref-run ref-reveal" style={{ '--d': `${(i % 4) * 60}ms` } as React.CSSProperties}>
            <div className="ref-run-title">
              <a href={sagaHref(s.id)}>{s.name}</a>
              <span>
                {t('tl.index.titles', { n: s.total })}
                {s.twoOrders ? ` · ${t('tl.index.two')}` : ''}
              </span>
            </div>
            <div className="ref-frames">
              {s.entries.map((e) => (
                <a
                  key={e.key}
                  className="ref-frame"
                  href={sagaHref(s.id, e.tmdbId ? `${e.mediaType}:${e.tmdbId}` : undefined)}
                  title={`${e.title}${e.year ? ` (${e.year})` : ''}`}
                >
                  {e.jellyfinId && jellyfinUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={posterUrl(e.jellyfinId, jellyfinUrl, 200)} alt={e.title} loading="lazy" />
                  ) : null}
                </a>
              ))}
              {s.total > s.entries.length && <span className="ref-run-rest">+{s.total - s.entries.length}</span>}
            </div>
            <a className="ref-run-open" href={sagaHref(s.id)} tabIndex={-1} aria-hidden="true">
              {t('tl.index.open')} →
            </a>
          </div>
        ))}
        {pairs.length > 0 && (
          <div className="ref-saga-pairs ref-reveal">
            <h3>{t('tl.index.pairs', { n: pairs.length })}</h3>
            <ul>
              {pairs.map((s) => (
                <li key={s.id}>
                  <a href={sagaHref(s.id)}>{s.name}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="ref-how ref-saga-note">
        <div className="ref-sheet-head" style={{ marginBottom: 0 }}>
          <h2 className="ref-reveal">{t('tl.index.noneHeading')}</h2>
          <div className="ref-reveal">
            <p className="ref-caption" style={{ minHeight: 0 }}>{t('tl.index.noneBody')}</p>
            <p className="ref-saga-next">
              <a href={`${portalPath('/') || '/'}#peta`}>{t('tl.index.allMaps')}</a>
              <a href={portalPath('/galaxy') || '/galaxy'}>{t('nav.galaxy')}</a>
              <a href={portalPath('/new') || '/new'}>{t('nav.new')}</a>
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
