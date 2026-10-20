/**
 * Apex Landing Page (surflix.my.id)
 *
 * Served when user hits the apex domain `surflix.my.id` (not www, not request).
 * Routing handled by middleware.ts — hostname check rewrites apex → /landing.
 *
 * Desain mengikuti portal Reference (layout.tsx + landing.css): hero cincin poster,
 * lalu tiga pintu, angka library, tentang, kopi.
 *
 * Three doors:
 * - Watch     → streaming.surflix.my.id (Jellyfin)
 * - Request   → request.surflix.my.id (this app's home)
 * - Reference → reference.surflix.my.id (map of how the library's titles connect)
 */
'use client';

import { useEffect, useState } from 'react';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { useReveal } from '@/lib/hooks/use-reveal';
import { buildPortalUrls } from '@/lib/hooks/use-portal';
import { evenAngles, ringFrameStyle } from '@/components/connections/portal-ring';
import { posterOf } from '@/lib/portal-data';

interface LibraryStats {
  moviesCount: number;
  seriesCount: number;
  mappedCount: number;
}

interface Featured {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  jellyfinId: string;
  count: number;
}

const fmt = (n: number) => n.toLocaleString('en-US');

export default function LandingPage() {
  const config = useAppConfig();
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [featured, setFeatured] = useState<Featured[]>([]);
  const [hover, setHover] = useState<Featured | null>(null);
  const [coffeeOpen, setCoffeeOpen] = useState(false);
  // Mulai dari URL produksi (SSR / sebelum mount identik), lalu ikuti hostname asli:
  // di lokal kartu mengarah ke / dan /referensi, bukan keluar ke produksi.
  const [portal, setPortal] = useState(() => buildPortalUrls('surflix.my.id', 'https:'));

  useEffect(() => {
    setPortal(buildPortalUrls(window.location.hostname, window.location.protocol));
    fetch('/api/library-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStats({ moviesCount: d.moviesCount, seriesCount: d.seriesCount, mappedCount: d.mappedCount ?? 0 });
      })
      .catch(() => {});
    fetch('/api/connections/featured')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.films && setFeatured(d.films))
      .catch(() => {});
  }, []);

  useReveal(true);

  useEffect(() => {
    if (!coffeeOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCoffeeOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [coffeeOpen]);

  const watchUrl = config?.jellyfinUrl || 'https://www.surflix.my.id';
  const requestUrl = portal.hubHref();
  const referenceUrl = portal.referenceHref();

  const angles = evenAngles(featured.length);
  const hasStats = !!stats && (stats.moviesCount > 0 || stats.seriesCount > 0);

  const doors = [
    {
      name: 'Watch',
      href: watchUrl,
      color: 'var(--rel-homage)',
      text: 'Pick something and press play. No ads, no tracking.',
      cta: 'Open the library',
    },
    {
      name: 'Request',
      href: requestUrl,
      color: 'var(--rel-inspired)',
      text: "Can't find a title? Tell me what you want to watch. If it isn't here yet, I'll add it. No account needed.",
      cta: 'Request a film',
    },
    {
      name: 'Reference',
      href: referenceUrl,
      color: 'var(--rel-remake)',
      text: 'See how films talk to each other: homages, borrowed looks, shared directors. Start anywhere and follow the trail.',
      cta: 'Open Surflix Reference',
    },
  ];

  return (
    <>
      <header className="ref-header">
        <a href="/" className="lp-brand" aria-label="Surflix">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark.png" alt="Surflix" width={109} height={30} className="lp-logo" />
        </a>
        <nav className="lp-nav" aria-label="Main">
          <a href={watchUrl}>Watch</a>
          <a href={requestUrl}>Request</a>
          <a href={referenceUrl}>Reference</a>
        </nav>
      </header>

      <section className="ref-hero">
        {config && featured.length > 0 && (
          <div className="ref-ring" data-hover={hover ? '' : undefined}>
            {featured.map((f, i) => {
              const src = posterOf({ poster: null, jellyfinId: f.jellyfinId }, config.jellyfinUrl, 240);
              return (
                <a
                  key={`${f.mediaType}:${f.tmdbId}`}
                  href={referenceUrl ? portal.referenceHref(`/${f.mediaType}/${f.tmdbId}`) : '#'}
                  data-on={hover && hover.tmdbId === f.tmdbId ? '' : undefined}
                  onMouseEnter={() => setHover(f)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(f)}
                  onBlur={() => setHover(null)}
                  aria-label={`${f.title}, open its connection map`}
                  style={ringFrameStyle(angles[i], i)}
                >
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" decoding="async" draggable={false} />
                  )}
                </a>
              );
            })}
          </div>
        )}

        <div className="ref-core">
          <h1 className="ref-h1 lp-h1 ref-display">
            <span className="ref-line"><span>A private cinema</span></span>
            <span className="ref-line"><span>for film lovers.</span></span>
          </h1>
          <p className="ref-core-sub" aria-live="polite">
            {hover ? (
              <>
                <b>{hover.title}</b>
                {hover.year ? `, ${hover.year}` : ''}
                <br />
                Open its connection map
              </>
            ) : hasStats ? (
              `${fmt(stats!.moviesCount)} films and ${fmt(stats!.seriesCount)} series, picked by hand. Watch them, ask for more, or see how they connect.`
            ) : (
              'Films and series, picked by hand. Watch them, ask for more, or see how they connect.'
            )}
          </p>
          <div className="lp-actions">
            <a href={watchUrl} className="ref-btn">Start watching</a>
            <a href={requestUrl} className="ref-btn ref-btn--light">Request a film</a>
          </div>
          <div className="ref-core-links lp-hero-link">
            <a href={referenceUrl} className="ref-core-browse">Explore Surflix Reference</a>
          </div>
        </div>
      </section>

      <section className="lp-doors" aria-labelledby="doors-h">
        <div className="ref-sheet-head">
          <h2 id="doors-h" className="ref-reveal">Three ways in</h2>
          <p className="ref-caption ref-reveal" style={{ '--d': '80ms' } as React.CSSProperties}>
            Pick one. They all open on the same library.
          </p>
        </div>
        {doors.map((d, i) => (
          <a
            key={d.name}
            href={d.href}
            className="lp-door ref-reveal"
            style={{ '--d': `${i * 80}ms` } as React.CSSProperties}
          >
            <span className="lp-door-name">
              <span>
                <i className="ref-mark" style={{ '--c': d.color } as React.CSSProperties} />
                {d.name}
              </span>
            </span>
            <p>{d.text}</p>
            <span className="lp-door-open">{d.cta} →</span>
          </a>
        ))}
      </section>

      <section className="lp-numbers" aria-labelledby="numbers-h">
        <h2 id="numbers-h" className="ref-display ref-reveal">The library, counted.</h2>
        <div className="lp-num-grid">
          {[
            { n: stats?.moviesCount, label: 'films' },
            { n: stats?.seriesCount, label: 'series' },
            { n: stats?.mappedCount, label: 'titles with a connection map' },
          ].map((x, i) => (
            <div key={x.label} className="ref-reveal" style={{ '--d': `${i * 80}ms` } as React.CSSProperties}>
              <span className="lp-num" data-wait={x.n === undefined ? '' : undefined}>
                {x.n === undefined ? '000' : fmt(x.n)}
              </span>
              <span className="lp-num-label">{x.label}</span>
            </div>
          ))}
        </div>
        <p className="lp-numbers-note ref-reveal">
          Titles are added by hand, and every connection on the map is reviewed before it goes live.
        </p>
      </section>

      <section className="lp-about" aria-labelledby="about-h">
        <p className="ref-small ref-reveal">About</p>
        <div>
          <h2 id="about-h" className="ref-reveal">Surflix is a private library I built for friends and family.</h2>
          <p className="lp-about-text ref-reveal">
            I run it on my own server at home and look after it myself. There are no ads and no tracking, and
            nothing here is trying to keep you scrolling. Pick something and settle in.
          </p>
          <div className="lp-coffee ref-reveal">
            <p>
              Servers hum, storage fills up, and curation happens at strange hours. If Surflix earned a spot in
              your week, you can chip in for the coffee.
            </p>
            <button type="button" className="ref-btn" onClick={() => setCoffeeOpen(true)}>
              Buy me a coffee
            </button>
          </div>
        </div>
      </section>

      <footer className="ref-footer">
        <span style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark.png" alt="Surflix" width={87} height={24} className="lp-logo lp-logo--foot" />
          Self-hosted at surdi Homelab
        </span>
        <nav>
          <a href={watchUrl}>Watch</a>
          <a href={requestUrl}>Request</a>
          <a href={referenceUrl}>Reference</a>
        </nav>
        <span>Est. 2022</span>
      </footer>

      {coffeeOpen && (
        <div className="lp-modal" onClick={() => setCoffeeOpen(false)} role="dialog" aria-modal="true" aria-label="Buy me a coffee">
          <div className="lp-modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lp-modal-close" onClick={() => setCoffeeOpen(false)} aria-label="Close">
              ×
            </button>
            {/* QR sudah membawa branding QRIS sendiri; tampil apa adanya. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qr-coffee.png" alt="Surflix coffee donation QR code" />
            <p>Thanks for keeping the projector humming.</p>
          </div>
        </div>
      )}
    </>
  );
}
