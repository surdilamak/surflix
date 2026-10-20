/**
 * PortalRing — hero: film-film di rak membentuk cincin elips di sekeliling judul.
 * Arahkan/fokus ke satu frame: yang lain turun ke 45% dan kalimat di tengah diganti
 * dengan nama film itu. Frame = link ke peta filmnya.
 */
'use client';

import { useState } from 'react';
import { usePortal } from '@/lib/hooks/use-portal';
import { filmKey, posterOf, type PortalFilm } from '@/lib/portal-data';
import { useLang } from './lang-provider';
import { SearchBox } from './search-box';

const MAX_FRAMES = 24;
const RATIO = 0.55; // ry / rx pada layar desktop (310 / 560)

/**
 * Sudut parameter elips untuk n titik dengan jarak SAMA sepanjang busur, mulai dari puncak.
 * (Sama sudut ≠ sama jarak: di ujung elips frame akan menumpuk.)
 */
function evenAngles(n: number): number[] {
  const STEPS = 720;
  const A0 = -Math.PI / 2; // puncak
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

export function PortalRing({ films, jellyfinUrl }: { films: PortalFilm[]; jellyfinUrl?: string }) {
  const { portalPath } = usePortal();
  const { t } = useLang();
  const [hover, setHover] = useState<PortalFilm | null>(null);

  // `films` sudah diurutkan dari yang referensinya paling kaya
  const frames = films.slice(0, MAX_FRAMES);
  const n = frames.length;
  const angles = evenAngles(n);

  return (
    <>
      <div className="ref-ring" data-hover={hover ? '' : undefined} aria-hidden={false}>
        {frames.map((f, i) => {
          const a = angles[i];
          const cx = Math.cos(a);
          const sy = Math.sin(a);
          // lebar: 72px di puncak cincin, 98px di sisi & dasar (tilt ke arah penonton)
          const w = 72 + 26 * Math.min(1, 1 + sy);
          // dasar frame mengikuti lengkung, maksimal 30 derajat
          const slope = cx / (-sy || -1e-6);
          const rot = Math.max(-30, Math.min(30, (Math.atan(slope * 0.55) * 180) / Math.PI));
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
              style={
                {
                  '--cx': cx.toFixed(4),
                  '--sy': sy.toFixed(4),
                  '--w': `${w.toFixed(0)}px`,
                  '--wm': `${(56 + 24 * Math.min(1, 1 + sy)).toFixed(0)}px`,
                  '--rot': `${rot.toFixed(1)}deg`,
                  '--i': i,
                } as React.CSSProperties
              }
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
        <a href="#peta" className="ref-core-browse">
          {t('hero.browse')}
        </a>
      </div>
    </>
  );
}
