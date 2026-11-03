/**
 * PortalRing — hero: the films on the shelf form an elliptical ring around the title.
 * Hover/focus one frame: the others drop to 45% and the sentence in the middle is replaced
 * with that film's name. Frame = link to its film map.
 */
'use client';

import { useState } from 'react';
import { usePortal } from '@/lib/hooks/use-portal';
import { filmKey, posterOf, type PortalFilm } from '@/lib/portal-data';
import { useLang } from './lang-provider';
import { SearchBox } from './search-box';

const MAX_FRAMES = 24;
const RATIO = 0.55; // ry / rx on desktop screens (310 / 560)

/**
 * Ellipse parameter angles for n points with EQUAL spacing along the arc, starting from the top.
 * (Equal angle ≠ equal distance: at the ends of the ellipse the frames would pile up.)
 */
export function evenAngles(n: number): number[] {
  const STEPS = 720;
  const A0 = -Math.PI / 2; // top
  const cum: number[] = [0];
  let px = Math.cos(A0);
  let py = RATIO * Math.sin(A0);
  for (let k = 1; k <= STEPS; k++) {
    const a = A0 + (k / STEPS) * Math.PI * 2;
    const x = Math.cos(a);
    const y = RATIO * Math.sin(a);
    cum.push(cum[k - 1] + Math.hypot(x - px, y - py));
    px = x;
    py = y;
  }
  const total = cum[STEPS];
  const out: number[] = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const s = (i / n) * total;
    while (k < STEPS && cum[k + 1] < s) k++;
    const f = (s - cum[k]) / (cum[k + 1] - cum[k] || 1);
    out.push(A0 + ((k + f) / STEPS) * Math.PI * 2);
  }
  return out;
}

/** CSS vars for one frame on the ring: position on the ellipse, width (tilt toward the viewer), base tilt. */
export function ringFrameStyle(a: number, i: number): React.CSSProperties {
  const cx = Math.cos(a);
  const sy = Math.sin(a);
  // width: 72px at the top of the ring, 98px at the sides & bottom (tilt toward the viewer)
  const w = 72 + 26 * Math.min(1, 1 + sy);
  // frame base follows the curve, max 30 degrees
  const slope = cx / (-sy || -1e-6);
  const rot = Math.max(-30, Math.min(30, (Math.atan(slope * 0.55) * 180) / Math.PI));
  return {
    '--cx': cx.toFixed(4),
    '--sy': sy.toFixed(4),
    '--w': `${w.toFixed(0)}px`,
    '--wm': `${(56 + 24 * Math.min(1, 1 + sy)).toFixed(0)}px`,
    '--rot': `${rot.toFixed(1)}deg`,
    '--i': i,
  } as React.CSSProperties;
}

export function PortalRing({ films, jellyfinUrl }: { films: PortalFilm[]; jellyfinUrl?: string }) {
  const { portalPath } = usePortal();
  const { t } = useLang();
  const [hover, setHover] = useState<PortalFilm | null>(null);

  // `films` is already sorted from the richest references
  const frames = films.slice(0, MAX_FRAMES);
  const n = frames.length;
  const angles = evenAngles(n);

  return (
    <>
      <div className="ref-ring" data-hover={hover ? '' : undefined} aria-hidden={false}>
        {frames.map((f, i) => {
          const a = angles[i];
          const style = ringFrameStyle(a, i);
          const src = posterOf(f, jellyfinUrl, 240);
          return (
            <a
              key={filmKey(f.mediaType, f.tmdbId)}
              href={portalPath(`/${f.mediaType}/${f.tmdbId}`) || '/'}
              data-on={hover && hover.tmdbId === f.tmdbId ? '' : undefined}
              onMouseEnter={() => setHover(f)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(f)}
              onBlur={() => setHover(null)}
              aria-label={`${f.title}, ${t('hero.hover', { n: f.count })}`}
              style={style}
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" decoding="async" draggable={false} />
              )}
            </a>
          );
        })}
      </div>

      <div className="ref-core">
        <h1 className="ref-h1 ref-display">
          <span className="ref-line"><span>{t('hero.h1a')}</span></span>
          <span className="ref-line"><span>{t('hero.h1b')}</span></span>
        </h1>
        <p className="ref-core-sub" aria-live="polite">
          {hover ? (
            <>
              <b>{hover.title}</b>
              {hover.year ? `, ${hover.year}` : ''}
              <br />
              {t('hero.hover', { n: hover.count })}
            </>
          ) : (
            t('hero.sub')
          )}
        </p>
        <SearchBox variant="hero" />
        <div className="ref-core-links">
          <a href="#peta" className="ref-core-browse">
            {t('hero.browse')}
          </a>
          <a href={portalPath('/galaxy') || '/galaxy'} className="ref-core-browse">
            {t('hero.galaxy')}
          </a>
          <a href={portalPath('/timeline') || '/timeline'} className="ref-core-browse">
            {t('hero.timeline')}
          </a>
        </div>
      </div>
    </>
  );
}
