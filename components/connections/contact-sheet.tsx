/**
 * ContactSheet — one row per film: its title, then the film itself and the films that
 * connect to it, small and in sequence like a shelf.
 * Point at one frame: the others dim and the reason shows in the fixed row above.
 */
'use client';

import { useState } from 'react';
import { usePortal } from '@/lib/hooks/use-portal';
import { watchUrl } from '@/lib/jellyfin';
import { filmKey, posterOf, REL_VAR, type PortalFilm, type PortalRef } from '@/lib/portal-data';
import { useLang } from './lang-provider';

interface Active {
  run: string;
  ref: string | null; // reference key, or null when the hovered one is the source film
}

const SHOWN_PER_RUN = 9;
const PRIORITY = ['homage', 'inspired', 'visual', 'remake', 'talent', 'director', 'universe'];

export function ContactSheet({
  films,
  allKeys,
  jellyfinUrl,
  serverId,
}: {
  films: PortalFilm[];
  /** all films that have a map (to decide which frames link to the map, which to Jellyfin) */
  allKeys: Set<string>;
  jellyfinUrl?: string;
  serverId?: string;
}) {
  const { portalPath } = usePortal();
  const { t, rel, reason } = useLang();
  const [active, setActive] = useState<Active | null>(null);

  const activeFilm = active ? films.find((f) => filmKey(f.mediaType, f.tmdbId) === active.run) : null;
  const activeRef: PortalRef | undefined =
    activeFilm && active?.ref ? activeFilm.refs.find((r) => filmKey(r.mediaType, r.tmdbId) === active.ref) : undefined;

  return (
    <section id="peta" className="ref-sheet" data-hover={active ? '' : undefined}>
      <div className="ref-sheet-head">
        <h2 className="ref-reveal">{t('sheet.heading')}</h2>
        <p className="ref-caption" aria-live="polite">
          {activeRef ? (
            <>
              <span className="ref-mark" style={{ '--c': REL_VAR[activeRef.relationship] } as React.CSSProperties} />
              <b>{activeRef.title}</b>
              {activeRef.year ? ` (${activeRef.year})` : ''}: {rel(activeRef.relationship, activeRef.direction, activeRef.kind)}. {reason(activeRef)}
            </>
          ) : activeFilm ? (
            t('sheet.film', {
              title: activeFilm.title,
              year: activeFilm.year ? ` (${activeFilm.year})` : '',
              n: activeFilm.count,
            })
          ) : (
            t('sheet.caption')
          )}
        </p>
      </div>

      {films.map((f, idx) => {
        const key = filmKey(f.mediaType, f.tmdbId);
        const srcPoster = posterOf(f, jellyfinUrl, 240);
        const refs = [...f.refs]
          .sort((a, b) => PRIORITY.indexOf(a.relationship) - PRIORITY.indexOf(b.relationship))
          .slice(0, SHOWN_PER_RUN);
        const href = portalPath(`/${f.mediaType}/${f.tmdbId}`) || '/';
        return (
          <div
            key={key}
            className="ref-run ref-reveal"
            style={{ '--d': `${Math.min(idx, 6) * 40}ms` } as React.CSSProperties}
            data-on={active?.run === key ? '' : undefined}
          >
            <div className="ref-run-title">
              <a href={href}>{f.title}</a>
              <span>
                {f.year ? `${f.year} · ` : ''}
                {t('sheet.meta', { n: f.count })}
              </span>
            </div>
            <div className="ref-frames">
              <a
                className="ref-frame ref-frame--src"
                href={href}
                onMouseEnter={() => setActive({ run: key, ref: null })}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive({ run: key, ref: null })}
                onBlur={() => setActive(null)}
                aria-label={t('sheet.alt', { title: f.title })}
              >
                {srcPoster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={srcPoster} alt={f.title} loading="lazy" draggable={false} />
                )}
              </a>
              {refs.map((r) => {
                const rk = filmKey(r.mediaType, r.tmdbId);
                const src = posterOf(r, jellyfinUrl, 240);
                const toMap = allKeys.has(rk);
                const link = toMap
                  ? portalPath(`/${r.mediaType}/${r.tmdbId}`) || '/'
                  : r.jellyfinId && jellyfinUrl
                    ? watchUrl(r.jellyfinId, jellyfinUrl, serverId)
                    : '#';
                return (
                  <a
                    key={rk}
                    className="ref-frame"
                    href={link}
                    target={toMap ? undefined : '_blank'}
                    rel={toMap ? undefined : 'noopener'}
                    data-on={active?.run === key && active.ref === rk ? '' : undefined}
                    onMouseEnter={() => setActive({ run: key, ref: rk })}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive({ run: key, ref: rk })}
                    onBlur={() => setActive(null)}
                    aria-label={`${r.title}: ${rel(r.relationship, r.direction, r.kind)}`}
                  >
                    {src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={r.title} loading="lazy" draggable={false} />
                    )}
                  </a>
                );
              })}
            </div>
            <a className="ref-run-open" href={href} tabIndex={-1} aria-hidden="true">
              {t('sheet.open')}
            </a>
          </div>
        );
      })}
    </section>
  );
}
