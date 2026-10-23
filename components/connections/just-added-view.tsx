/**
 * Portal Referensi — Just added: judul terbaru di library. Yang terbaru memimpin halaman sebagai kartu besar;
 * sisanya satu rak berurutan. Peta yang sudah jadi membuka petanya, yang belum ditandai "Map coming"
 * dan tetap bisa langsung ditonton.
 */
'use client';

import { usePortal } from '@/lib/hooks/use-portal';
import { useReveal } from '@/lib/hooks/use-reveal';
import { posterUrl, watchUrl } from '@/lib/jellyfin';
import { useLang } from '@/components/connections/lang-provider';

export interface Row {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  jellyfinId: string;
  addedAt: string;
  count: number;
}

const WEEK = 7 * 24 * 3600 * 1000;

export function JustAddedView({ rows, jellyfinUrl, serverId, now }: { rows: Row[]; jellyfinUrl: string; serverId?: string; now: number }) {
  const { t, lang } = useLang();
  const { portalPath } = usePortal();
  useReveal(rows.length > 0);

  const locale = lang === 'id' ? 'id-ID' : 'en-GB';
  const addedLabel = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const [lead, ...rest] = rows;

  const links = (r: Row) => {
    const map = portalPath(`/${r.mediaType}/${r.tmdbId}`) || '/';
    const watch = watchUrl(r.jellyfinId, jellyfinUrl, serverId);
    return { map, watch };
  };
  const state = (r: Row) =>
    r.count > 0 ? t(r.count === 1 ? 'new.mapped1' : 'new.mapped', { n: r.count }) : t('new.unmapped');

  return (
    <>
      <section className="ref-new-head">
        <div className="ref-new-intro">
          <h1 className="ref-display">{t('new.h1')}</h1>
          <p>{t('new.sub')}</p>
          {rows.length > 0 && <p className="ref-new-count">{t('new.count', { n: rows.length })}</p>}
        </div>

        {lead && (
          <article className="ref-new-lead">
            <a className="ref-new-poster" href={lead.count > 0 ? links(lead).map : links(lead).watch} {...(lead.count > 0 ? {} : { target: '_blank', rel: 'noopener' })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterUrl(lead.jellyfinId, jellyfinUrl, 480)} alt={lead.title} width={320} height={480} />
            </a>
            <div>
              <p className="ref-new-flag">{t('new.newest')}</p>
              <h2>
                {lead.title}
                {lead.year ? <small> {lead.year}</small> : null}
              </h2>
              <p className="ref-new-meta" data-mapped={lead.count > 0 ? '' : undefined}>
                {state(lead)}
                <span> · {t('new.added', { when: addedLabel(lead.addedAt) })}</span>
              </p>
              <p className="ref-new-links">
                {lead.count > 0 && <a href={links(lead).map}>{t('new.openMap')}</a>}
                <a href={links(lead).watch} target="_blank" rel="noopener">{t('new.watch')}</a>
              </p>
            </div>
          </article>
        )}
      </section>

      <section className="ref-new-body">
        {rows.length === 0 ? (
          <p className="ref-new-note">{t('new.empty')}</p>
        ) : (
          <ul className="ref-new-grid">
            {rest.map((r, i) => {
              const { map, watch } = links(r);
              const fresh = now - +new Date(r.addedAt) < WEEK;
              return (
                <li key={`${r.mediaType}-${r.tmdbId}`} className="ref-reveal" style={{ '--d': `${(i % 6) * 50}ms` } as React.CSSProperties}>
                  <a className="ref-new-poster" href={r.count > 0 ? map : watch} {...(r.count > 0 ? {} : { target: '_blank', rel: 'noopener' })}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={posterUrl(r.jellyfinId, jellyfinUrl, 360)} alt={r.title} loading="lazy" width={240} height={360} />
                    {/* Lencana menempel di poster, bukan di paragraf judul: di dalam judul ia
                        memecah ritme baris dan terlempar ke baris sendiri kalau judulnya panjang. */}
                    {fresh && <em className="ref-new-badge">{t('new.week')}</em>}
                    {/* Pita keterangan ikut di dalam kartu membulat, seperti .lp-frame di landing.
                        Bedanya: landing memotong judul jadi satu baris; di sini judul tampil utuh,
                        karena di halaman "apa yang baru" judul itu isi utamanya. Lihat .ref-new-strip. */}
                    <span className="ref-new-strip">
                      {r.title}
                      {r.year ? <small> {r.year}</small> : null}
                    </span>
                  </a>
                  <p className="ref-new-meta" data-mapped={r.count > 0 ? '' : undefined}>
                    {state(r)}
                    <span> · {t('new.added', { when: addedLabel(r.addedAt) })}</span>
                  </p>
                  <p className="ref-new-links">
                    {r.count > 0 && <a href={map}>{t('new.openMap')}</a>}
                    <a href={watch} target="_blank" rel="noopener">{t('new.watch')}</a>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
