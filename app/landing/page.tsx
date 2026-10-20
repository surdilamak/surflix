/**
 * Landing (surflix.my.id) — satu papan ubin yang memperlihatkan tiga situs Surflix:
 * Streaming (Jellyfin), Request Hub, dan Reference. Tiap bagian adalah miniatur situsnya.
 *
 * Server component: poster, angka, dan koneksi nyata datang dari DB di HTML pertama.
 * Routing: middleware.ts me-rewrite host apex surflix.my.id ke /landing.
 */
import { headers } from 'next/headers';
import { getLandingData, type LandingFilm } from '@/lib/landing-data';
import { getServerId, posterUrl, watchUrl } from '@/lib/jellyfin';
import { buildPortalUrls } from '@/lib/portal-urls';
import { CoffeeButton, LandingFx } from './landing-fx';

export const dynamic = 'force-dynamic';

const REL_LABEL: Record<string, string> = {
  homage: 'Homage',
  inspired: 'Inspired',
  visual: 'Borrowed look',
  remake: 'Remake',
};
const REL_COLOR: Record<string, string> = {
  homage: '#ff5200',
  inspired: '#4f8ff0',
  visual: '#c9c3b4',
  remake: '#1fbf94',
};
const fmt = (n: number) => n.toLocaleString('en-US');
const yearOf = (f: { year: number | null }) => (f.year ? `, ${f.year}` : '');

type CssVars = React.CSSProperties & Record<`--${string}`, string | number>;

interface Special {
  row: number;
  col: number;
  span?: number;
  tone: 'paper' | 'surface' | 'accent';
  node: React.ReactNode;
}

/** Satu foto dipotong lintas ubin; beberapa ubin diganti blok warna (tidak pernah bersebelahan). */
function Mosaic({ cols, rows, img, alt, specials, only }: { cols: number; rows: number; img: string; alt: string; specials: Special[]; only: 'd' | 'm' }) {
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sp = specials.find((s) => s.row === r && c >= s.col && c < s.col + (s.span ?? 1));
      if (sp) {
        if (c !== sp.col) continue;
        cells.push(
          <div
            key={`s${r}-${c}`}
            className="lp-tile lp-tile--flat"
            data-tone={sp.tone}
            style={sp.span && sp.span > 1 ? { gridColumn: `span ${sp.span}`, aspectRatio: `${sp.span} / 1` } : undefined}
          >
            {sp.node}
          </div>
        );
        continue;
      }
      cells.push(
        <div key={`${r}-${c}`} className="lp-tile" style={{ '--col': c, '--row': r } as CssVars}>
          <span className="lp-pic">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={r === 0 && c === 1 ? alt : ''} width={1920} height={1080} loading="lazy" decoding="async" />
          </span>
        </div>
      );
    }
  }
  return (
    <div className={`lp-mosaic lp-only-${only}`} data-shutter>
      <div
        className="lp-mosaic-grid"
        style={{ '--cols': cols, '--rows': rows } as CssVars}
      >
        {cells}
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0].split(':')[0];
  const proto = h.get('x-forwarded-proto')?.split(',')[0] ?? (host === 'localhost' || /^\d/.test(host) ? 'http' : 'https');
  const urls = buildPortalUrls(host, `${proto}:`);

  const base = (process.env.NEXT_PUBLIC_JELLYFIN_URL || process.env.JELLYFIN_URL || '').replace(/\/+$/, '');
  const [data, serverId] = await Promise.all([getLandingData(), getServerId()]);
  const { stats, hero, gallery, showcase, demo, spotlight } = data;

  const watchHome = base || '#';
  const requestHome = urls.hubHref();
  const referenceHome = urls.referenceHref();
  const poster = (f: { jellyfinId: string }, w = 480) => (base ? posterUrl(f.jellyfinId, base, w) : '');
  const watchFilm = (f: LandingFilm) => (base ? watchUrl(f.jellyfinId, base, serverId) : '#');
  const mapOf = (f: { mediaType: string; tmdbId: number }) => urls.referenceHref(`/${f.mediaType}/${f.tmdbId}`);
  const backdrop = showcase && base ? `${base}/Items/${showcase.jellyfinId}/Images/Backdrop?maxWidth=1920&quality=82` : '';

  const mosaicAlt = showcase ? `A scene from ${showcase.title}` : '';

  // Hero: enam kolom poster, dibagi bergiliran; kolom 3 dan 4 menyisakan ruang buat panel teks.
  const columns = Array.from({ length: 6 }, (_, c) => hero.filter((_, i) => i % 6 === c));
  const frame = (f: LandingFilm, idx: number, c: number, row: number) => (
    <a
      key={`${f.mediaType}${f.tmdbId}`}
      className="lp-frame"
      href={watchFilm(f)}
      data-c={(c + row) % 4}
      style={{ '--i': idx } as CssVars}
      aria-label={`Watch ${f.title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster(f)} width={240} height={360} alt={`${f.title} poster`} loading={idx < 12 ? 'eager' : 'lazy'} decoding="async" />
      <span className="lp-strip" aria-hidden="true">
        {f.title}
        {yearOf(f)}
      </span>
    </a>
  );

  const showcaseDesktop: Special[] = [
    { row: 0, col: 0, tone: 'paper', node: <h2 className="lp-tile-h">Streaming</h2> },
    { row: 1, col: 3, tone: 'surface', node: <p className="lp-fact">{fmt(stats.movies)} films</p> },
    { row: 2, col: 0, tone: 'surface', node: <p className="lp-fact">{fmt(stats.series)} series</p> },
    { row: 2, col: 5, tone: 'surface', node: <p className="lp-fact">No ads, no tracking</p> },
    {
      row: 3, col: 2, tone: 'accent',
      node: <a className="lp-tile-action" href={watchHome}>Open the library</a>,
    },
  ];
  const showcaseMobile: Special[] = [
    { row: 0, col: 0, span: 2, tone: 'paper', node: <h2 className="lp-tile-h">Streaming</h2> },
    { row: 2, col: 2, tone: 'surface', node: <p className="lp-fact">{fmt(stats.movies)} films</p> },
    { row: 3, col: 0, tone: 'surface', node: <p className="lp-fact">{fmt(stats.series)} series</p> },
    { row: 5, col: 2, tone: 'accent', node: <a className="lp-tile-action" href={watchHome}>Open the library</a> },
  ];

  // Masonry: enam kolom dengan jumlah berbeda (dasar kolom sengaja tidak rata), rasio gambar bergantian
  const ratios = ['2 / 3', '1 / 1', '4 / 5', '3 / 4'];
  const sizes = [4, 3, 4, 3, 3, 3];
  let at = 0;
  const mcols = sizes.map((n) => gallery.slice(at, (at += n)));

  return (
    <>
      <LandingFx />

      {/* ── Hero: a sheet of posters with one text cell ─────────────────────── */}
      <section id="top" className="lp-hero" aria-label="Surflix">
        <div className="lp-stage">
          <div className="lp-sheet">
            {columns.map((col, c) => (
              <div key={c} className="lp-col" data-col={c}>
                {col.map((f, row) => {
                  const idx = c + row * 6;
                  if ((c === 2 || c === 3) && row === 1) {
                    return [<div key={`gap${c}`} className="lp-gap" aria-hidden="true" />, frame(f, idx, c, row)];
                  }
                  return frame(f, idx, c, row);
                })}
              </div>
            ))}
          </div>

          <div className="lp-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lp-logo" src="/logo-wordmark.png" alt="" width={102} height={28} />
            <h1>A private cinema for friends and family.</h1>
            <a className="lp-btn" href={watchHome}>Start watching</a>
            <p className="lp-panel-links">
              <a href={requestHome}>Request a film</a>
              <a href={referenceHome}>Surflix Reference</a>
              <a href="#about">About</a>
            </p>
          </div>
        </div>
      </section>

      {/* ── Streaming: one photograph cut across a board ────────────────────── */}
      <section className="lp-section lp-section--bg lp-streaming" aria-labelledby="sr-streaming">
        <p className="lp-lead lp-intro" data-reveal>
          One library, three doors. Streaming to watch, Request Hub to ask for more, Surflix Reference to follow the
          connections.
        </p>
        {backdrop ? (
          <>
            <Mosaic only="d" cols={6} rows={4} img={backdrop} alt={mosaicAlt} specials={showcaseDesktop} />
            <Mosaic only="m" cols={3} rows={6} img={backdrop} alt={mosaicAlt} specials={showcaseMobile} />
          </>
        ) : null}
        <p id="sr-streaming" className="lp-lead lp-lead--below" data-reveal>
          Hand-picked films and series, ready to play in your browser. Pick one and press play.
        </p>
      </section>

      {/* ── Request Hub: three tiles that grow ──────────────────────────────── */}
      <section className="lp-section lp-section--paper lp-request" aria-labelledby="request-h">
        <div className="lp-grow">
          <h2 id="request-h" className="lp-head" data-reveal>Request Hub</h2>

          <div className="lp-stage-col lp-stage-col--1" data-reveal style={{ '--d': '0ms' } as CssVars}>
            <div className="lp-stage-tile" data-tone="ink">
              <div className="lp-ui" data-ui>
                <div className="lp-ui-film">
                  {demo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster(demo, 160)} width={44} height={66} alt="" />
                  )}
                  <span>
                    <b>{demo?.title ?? 'Dune: Part Two'}</b>
                    <small>{demo?.year ?? 2024}</small>
                  </span>
                </div>
                <div className="lp-ui-field">Maya</div>
                <div className="lp-ui-btn">Request</div>
              </div>
            </div>
            <h3>Asked</h3>
            <p>Type a title and your name. No account, no password.</p>
          </div>

          <div className="lp-stage-col lp-stage-col--2" data-reveal style={{ '--d': '90ms' } as CssVars}>
            <div className="lp-stage-tile" data-tone="accent">
              <div className="lp-ui lp-ui--dark" data-ui>
                <div className="lp-ui-film">
                  {demo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster(demo, 160)} width={44} height={66} alt="" />
                  )}
                  <span>
                    <b>{demo?.title ?? 'Dune: Part Two'}</b>
                    <small>Approved</small>
                  </span>
                </div>
                <div className="lp-ui-bar"><i style={{ width: '64%' }} /></div>
                <div className="lp-ui-meta"><span>Downloading to the server</span><span>64%</span></div>
              </div>
            </div>
            <h3>Approved</h3>
            <p>I get a message and approve it. The film starts downloading to the server.</p>
          </div>

          <div className="lp-stage-col lp-stage-col--3" data-reveal style={{ '--d': '180ms' } as CssVars}>
            <div className="lp-stage-tile" data-tone="light">
              <div className="lp-ui-ready" data-ui>
                {demo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster(demo, 480)} width={240} height={360} alt={`${demo.title} poster`} />
                )}
                <span className="lp-ui-btn lp-ui-btn--accent">Watch now</span>
              </div>
            </div>
            <h3>Ready to watch</h3>
            <p>Turn on notifications and you hear when it lands. One tap opens it in the library.</p>
            <a className="lp-btn lp-btn--ink" href={requestHome}>Request a film</a>
          </div>
        </div>
      </section>

      {/* ── Reference: dense sheet + one real connection ────────────────────── */}
      <section className="lp-section lp-section--black lp-reference" aria-labelledby="reference-h">
        <div className="lp-ref-top">
          {spotlight && (
            <a className="lp-spot" href={mapOf(spotlight.from)} data-reveal>
              <span className="lp-spot-pair">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster(spotlight.from, 240)} width={72} height={108} alt={`${spotlight.from.title} poster`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster(spotlight.to, 240)} width={72} height={108} alt={`${spotlight.to.title} poster`} />
              </span>
              <span className="lp-spot-text">
                <span className="lp-spot-rel">
                  <i style={{ background: REL_COLOR[spotlight.relationship] ?? '#fff' }} aria-hidden="true" />
                  {REL_LABEL[spotlight.relationship] ?? spotlight.relationship}
                </span>
                <b>
                  {spotlight.from.title}
                  {yearOf(spotlight.from)} and {spotlight.to.title}
                  {yearOf(spotlight.to)}
                </b>
                <span className="lp-spot-reason">{spotlight.reason}</span>
              </span>
            </a>
          )}
          <h2 id="reference-h" className="lp-head" data-reveal>Surflix Reference</h2>
          <div className="lp-ref-text" data-reveal style={{ '--d': '90ms' } as CssVars}>
            <p>
              Every film borrows from another. The map shows who borrowed what: homages, borrowed looks and shared
              directors.
            </p>
            <a className="lp-btn" href={referenceHome}>Explore the map</a>
          </div>
        </div>

        <div className="lp-masonry">
          {mcols.map((col, c) => (
            <div key={c} className="lp-mcol">
              {col.map((f, row) => (
                <figure key={`${f.mediaType}${f.tmdbId}`} data-reveal style={{ '--d': `${(c * 4 + row) * 30}ms` } as CssVars}>
                  <a href={mapOf(f)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={poster(f, 360)}
                      width={240}
                      height={360}
                      alt={`${f.title} poster`}
                      loading="lazy"
                      decoding="async"
                      style={{ aspectRatio: ratios[(c + row * 3) % ratios.length] }}
                    />
                  </a>
                  <figcaption>
                    {f.title}, {f.count} {f.count === 1 ? 'connection' : 'connections'}
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Numbers: stepped figure tiles ───────────────────────────────────── */}
      <section className="lp-section lp-section--paper lp-stats" aria-labelledby="stats-h">
        <div className="lp-stats-grid">
          <div className="lp-fig lp-fig--1" data-tone="accent">
            <b data-count={stats.movies}>{fmt(stats.movies)}</b>
            <span>films</span>
            <p className="lp-fig-note">From silent classics to this year’s releases.</p>
          </div>
          <h2 id="stats-h" className="lp-stats-h">The library in numbers</h2>
          <div className="lp-fig lp-fig--2" data-tone="ink">
            <b data-count={stats.series}>{fmt(stats.series)}</b>
            <span>series</span>
            <p className="lp-fig-note">Whole seasons, ready to binge.</p>
          </div>
          <div className="lp-fig lp-fig--3" data-tone="mid">
            <b data-count={stats.mapped}>{fmt(stats.mapped)}</b>
            <span>titles with a connection map</span>
            <p className="lp-fig-note">Each links to the films it borrows from and the ones that borrowed from it.</p>
          </div>
        </div>
      </section>

      {/* ── About: wide photo, colour tile, facts ───────────────────────────── */}
      <section id="about" className="lp-section lp-section--bg lp-about" aria-labelledby="about-h">
        <h2 id="about-h" className="lp-head lp-head--about" data-reveal>Made at home</h2>
        <p className="lp-about-lead" data-reveal style={{ '--d': '60ms' } as CssVars}>
          Surflix is a private library I built for friends and family. I run it on a server at home and look after it
          myself.
        </p>
        <div className="lp-about-row">
          <figure className="lp-about-photo" data-reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/projector.jpg" width={1920} height={1200} alt="A 16mm film projector running in a dark room" loading="lazy" decoding="async" />
            <p>There are no ads and no tracking, and nothing here is trying to keep you scrolling. Pick something and settle in.</p>
          </figure>
          <div className="lp-about-side" data-reveal style={{ '--d': '90ms' } as CssVars}>
            <div className="lp-about-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" width={186} height={186} alt="Surflix logo mark" />
            </div>
            <dl className="lp-facts">
              <div><dt>Hosted</dt><dd>At home</dd></div>
              <div><dt>Ads</dt><dd>None</dd></div>
              <div><dt>Tracking</dt><dd>None</dd></div>
              <div><dt>Running since</dt><dd>2022</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* ── The action tile ─────────────────────────────────────────────────── */}
      <section className="lp-section lp-section--black lp-cta" aria-labelledby="cta-h">
        <div className="lp-cta-row">
          <div className="lp-cta-flank lp-cta-flank--photo" aria-hidden="true">
            {gallery[3] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster(gallery[3], 480)} width={240} height={360} alt="" loading="lazy" />
            )}
          </div>
          <div className="lp-cta-main">
            <h2 id="cta-h" className="lp-cta-h">Keep the projector humming</h2>
            <p>
              Servers hum, storage fills up, and curation happens at strange hours. If Surflix earned a spot in your
              week, you can chip in for the coffee.
            </p>
            <CoffeeButton className="lp-btn lp-btn--ink">Buy me a coffee</CoffeeButton>
          </div>
          <div className="lp-cta-flank lp-cta-flank--flat" aria-hidden="true" />
        </div>
      </section>

      {/* ── Footer: the mark, built large ───────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-foot-grid">
          <nav className="lp-foot-cols" aria-label="Footer">
            <div>
              <h3>Streaming</h3>
              <a href={watchHome}>Open the library</a>
            </div>
            <div>
              <h3>Request Hub</h3>
              <a href={requestHome}>Request a film</a>
              <a href={urls.hubHref('/requests')}>My requests</a>
            </div>
            <div>
              <h3>Surflix Reference</h3>
              <a href={referenceHome}>All maps</a>
              <a href={urls.referenceHref('/galaxy')}>Galaxy</a>
            </div>
            <div>
              <h3>Support</h3>
              <CoffeeButton className="lp-link-btn">Buy me a coffee</CoffeeButton>
            </div>
          </nav>
          <p className="lp-foot-note">
            Self-hosted at surdi Homelab. Built and looked after by one person.
          </p>
        </div>
        <div className="lp-mark" role="img" aria-label="Surflix">
          {['S', 'U', 'R', 'F', 'L', 'I', 'X'].map((l, i) => (
            <span key={l} className="lp-mark-b" data-i={i}>
              {l}
            </span>
          ))}
        </div>
        <div className="lp-foot-last">
          <span>© {new Date().getFullYear()} Surflix</span>
          <span className="lp-credit">
            Photo: <a href="https://commons.wikimedia.org/wiki/File:16mm_Projector_with_%27cakestand%27.JPG">“16mm Projector with ‘cakestand’”</a> by
            YellowFratello, <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>, via Wikimedia Commons.
          </span>
          <a className="lp-btn lp-btn--small" href="#top">Back to top</a>
        </div>
      </footer>
    </>
  );
}
