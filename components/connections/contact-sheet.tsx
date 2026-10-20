/**
 * ContactSheet — satu baris per film: judulnya, lalu film itu sendiri dan semua
 * film yang nyambung ke dia, kecil-kecil dan berurutan seperti rak.
 * Arahkan ke satu frame: yang lain meredup dan alasannya tampil di baris tetap di atas.
 */
'use client';

import { useState } from 'react';
import { usePortal } from '@/lib/hooks/use-portal';
import {
  filmKey, posterOf, REL_LABEL, REL_VAR,
  type PortalFilm, type PortalRef,
} from '@/lib/portal-data';

interface Active {
  run: string;
  ref: string | null; // key referensi, atau null kalau yang di-hover film sumbernya
}

export function ContactSheet({
  films,
  jellyfinUrl,
  serverId,
}: {
  films: PortalFilm[];
  jellyfinUrl?: string;
  serverId?: string;
}) {
  const { portalPath } = usePortal();
  const [active, setActive] = useState<Active | null>(null);
  const hasMap = new Set(films.map((f) => filmKey(f.mediaType, f.tmdbId)));

  const activeFilm = active ? films.find((f) => filmKey(f.mediaType, f.tmdbId) === active.run) : null;
  const activeRef: PortalRef | undefined =
    activeFilm && active?.ref ? activeFilm.refs.find((r) => filmKey(r.mediaType, r.tmdbId) === active.ref) : undefined;

  return (
    <section id="peta" className="ref-sheet" data-hover={active ? '' : undefined}>
      <div className="ref-sheet-head">
        <h2 className="ref-reveal">Semua peta</h2>
        <p className="ref-caption" aria-live="polite">
          {activeRef ? (
            <>
              <span className="ref-mark" style={{ '--c': REL_VAR[activeRef.relationship] } as React.CSSProperties} />
              <b>{activeRef.title}</b>
              {activeRef.year ? ` (${activeRef.year})` : ''}: {REL_LABEL[activeRef.relationship] ?? activeRef.relationship}.{' '}
              {activeRef.reason}
            </>
          ) : activeFilm ? (
            <>
              <b>{activeFilm.title}</b>
              {activeFilm.year ? ` (${activeFilm.year})` : ''}. {activeFilm.count} film nyambung. Buka petanya.
            </>
          ) : (
            'Satu baris, satu film. Di sebelah kanannya film-film yang nyambung ke dia. Arahkan ke salah satunya untuk baca alasannya.'
          )}
        </p>
      </div>

      {films.map((f, idx) => {
        const key = filmKey(f.mediaType, f.tmdbId);
        const srcPoster = posterOf(f, jellyfinUrl, 240);
        return (
          <div
            key={key}
            className="ref-run ref-reveal"
            style={{ '--d': `${Math.min(idx, 6) * 40}ms` } as React.CSSProperties}
            data-on={active?.run === key ? '' : undefined}
          >
            <div className="ref-run-title">
              <a href={portalPath(`/${f.mediaType}/${f.tmdbId}`)}>{f.title}</a>
              <span>
                {f.year ? `${f.year} · ` : ''}
                {f.count} referensi
              </span>
            </div>
            <div className="ref-frames">
              <a
                className="ref-frame ref-frame--src"
                href={portalPath(`/${f.mediaType}/${f.tmdbId}`)}
                onMouseEnter={() => setActive({ run: key, ref: null })}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive({ run: key, ref: null })}
                onBlur={() => setActive(null)}
                aria-label={`Buka peta ${f.title}`}
              >
                {srcPoster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={srcPoster} alt={f.title} loading="lazy" draggable={false} />
                )}
              </a>
              {f.refs.map((r) => {
                const rk = filmKey(r.mediaType, r.tmdbId);
                const src = posterOf(r, jellyfinUrl, 240);
                const toMap = hasMap.has(rk);
                const href = toMap
                  ? portalPath(`/${r.mediaType}/${r.tmdbId}`)
                  : r.jellyfinId && jellyfinUrl
                    ? `${jellyfinUrl.replace(/\/+$/, '')}/web/#/details?id=${encodeURIComponent(r.jellyfinId)}${serverId ? `&serverId=${encodeURIComponent(serverId)}` : ''}`
                    : '#';
                return (
                  <a
                    key={rk}
                    className="ref-frame"
                    href={href}
                    target={toMap ? undefined : '_blank'}
                    rel={toMap ? undefined : 'noopener'}
                    data-on={active?.run === key && active.ref === rk ? '' : undefined}
                    onMouseEnter={() => setActive({ run: key, ref: rk })}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive({ run: key, ref: rk })}
                    onBlur={() => setActive(null)}
                    aria-label={`${r.title}: ${REL_LABEL[r.relationship] ?? r.relationship}`}
                  >
                    {src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={r.title} loading="lazy" draggable={false} />
                    )}
                  </a>
                );
              })}
            </div>
            <a className="ref-run-open" href={portalPath(`/${f.mediaType}/${f.tmdbId}`)} tabIndex={-1} aria-hidden="true">
              Buka peta →
            </a>
          </div>
        );
      })}
    </section>
  );
}
