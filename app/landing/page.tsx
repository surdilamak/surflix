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
import { translate } from '@/lib/i18n';
import { getServerLang } from '@/lib/lang-server';
import { CoffeeButton, LandingFx, LangToggle } from './landing-fx';

export const dynamic = 'force-dynamic';

const REL_COLOR: Record<string, string> = {
  homage: '#ff5200',
  inspired: '#4f8ff0',
  visual: '#c9c3b4',
  remake: '#1fbf94',
};
const fmt = (n: number, lang: 'en' | 'id' = 'en') => n.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');
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

export default async function LandingPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const lang = await getServerLang((await searchParams)?.lang);
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
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

  const mosaicAlt = showcase ? t('lp.scene', { title: showcase.title }) : '';

  // Hero: enam kolom poster, dibagi bergiliran; kolom 3 dan 4 menyisakan ruang buat panel teks.
  const columns = Array.from({ length: 6 }, (_, c) => hero.filter((_, i) => i % 6 === c));
  const frame = (f: LandingFilm, idx: number, c: number, row: number) => (
    <a
      key={`${f.mediaType}${f.tmdbId}`}
      className="lp-frame"
      href={watchFilm(f)}
      data-c={(c + row) % 4}
      style={{ '--i': idx } as CssVars}
      aria-label={t('lp.watch', { title: f.title })}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster(f)} width={240} height={360} alt={t('lp.poster', { title: f.title })} loading={idx < 12 ? 'eager' : 'lazy'} decoding="async" />
      <span className="lp-strip" aria-hidden="true">
        {f.title}
        {yearOf(f)}
      </span>
    </a>
  );

  const showcaseDesktop: Special[] = [
    { row: 0, col: 0, tone: 'paper', node: <h2 className="lp-tile-h">{t('lp.streaming')}</h2> },
    { row: 1, col: 3, tone: 'surface', node: <p className="lp-fact">{t('lp.films', { n: fmt(stats.movies, lang) })}</p> },
    { row: 2, col: 0, tone: 'surface', node: <p className="lp-fact">{t('lp.series', { n: fmt(stats.series, lang) })}</p> },
    { row: 2, col: 5, tone: 'surface', node: <p className="lp-fact">{t('lp.noAds')}</p> },
    {
      row: 3, col: 2, tone: 'accent',
      node: <a className="lp-tile-action" href={watchHome}>{t('lp.openStreaming')}</a>,
    },
  ];
  const showcaseMobile: Special[] = [
    { row: 0, col: 0, span: 2, tone: 'paper', node: <h2 className="lp-tile-h">{t('lp.streaming')}</h2> },
    { row: 2, col: 2, tone: 'surface', node: <p className="lp-fact">{t('lp.films', { n: fmt(stats.movies, lang) })}</p> },
    { row: 3, col: 0, tone: 'surface', node: <p className="lp-fact">{t('lp.series', { n: fmt(stats.series, lang) })}</p> },
    { row: 5, col: 2, tone: 'accent', node: <a className="lp-tile-action" href={watchHome}>{t('lp.openStreaming')}</a> },
  ];

  // Masonry: enam kolom dengan jumlah berbeda (dasar kolom sengaja tidak rata), rasio gambar bergantian
  const ratios = ['2 / 3', '1 / 1', '4 / 5', '3 / 4'];
  const sizes = [4, 3, 4, 3, 3, 3];
  let at = 0;
  const mcols = sizes.map((n) => gallery.slice(at, (at += n)));

  const coffeeLabels = { title: t('lp.coffee'), alt: t('lp.coffee.alt'), thanks: t('lp.coffee.thanks'), close: t('lp.close') };

  return (
    <>
      <LandingFx />
      <LangToggle lang={lang} label={t('lp.lang')} />

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
            <h1>{t('lp.h1')}</h1>
            <a className="lp-btn" href={watchHome}>{t('lp.start')}</a>
            <p className="lp-panel-links">
              <a href={requestHome}>{t('lp.links.hub')}</a>
              <a href={referenceHome}>{t('lp.links.ref')}</a>
              <a href="#about">{t('lp.links.about')}</a>
            </p>
          </div>
        </div>
      </section>

      {/* ── Streaming: one photograph cut across a board ────────────────────── */}
      <section className="lp-section lp-section--bg lp-streaming" aria-labelledby="sr-streaming">
        <p className="lp-lead lp-intro" data-reveal>
          {t('lp.intro')}
        </p>
        {backdrop ? (
          <>
            <Mosaic only="d" cols={6} rows={4} img={backdrop} alt={mosaicAlt} specials={showcaseDesktop} />
            <Mosaic only="m" cols={3} rows={6} img={backdrop} alt={mosaicAlt} specials={showcaseMobile} />
          </>
        ) : null}
        <p id="sr-streaming" className="lp-lead lp-lead--below" data-reveal>
          {t('lp.below')}
        </p>
        <a className="lp-btn lp-btn--go" href={watchHome} data-reveal>{t('lp.openStreaming')}</a>
      </section>

      {/* ── Request Hub: three tiles that grow ──────────────────────────────── */}
      <section className="lp-section lp-section--paper lp-request" aria-labelledby="request-h">
        <div className="lp-grow">
          <h2 id="request-h" className="lp-head" data-reveal>{t('lp.hub.h')}</h2>

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
                <div className="lp-ui-btn">{t('lp.hub.ui.request')}</div>
              </div>
            </div>
            <h3>{t('lp.hub.asked')}</h3>
            <p>{t('lp.hub.askedText')}</p>
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
                    <small>{t('lp.hub.ui.approved')}</small>
                  </span>
                </div>
                <div className="lp-ui-bar"><i style={{ width: '64%' }} /></div>
                <div className="lp-ui-meta"><span>{t('lp.hub.ui.downloading')}</span><span>64%</span></div>
              </div>
            </div>
            <h3>{t('lp.hub.approved')}</h3>
            <p>{t('lp.hub.approvedText')}</p>
          </div>

          <div className="lp-stage-col lp-stage-col--3" data-reveal style={{ '--d': '180ms' } as CssVars}>
            <div className="lp-stage-tile" data-tone="light">
              <div className="lp-ui-ready" data-ui>
                {demo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster(demo, 480)} width={240} height={360} alt={t('lp.poster', { title: demo.title })} />
                )}
                <span className="lp-ui-btn lp-ui-btn--accent">{t('lp.hub.ui.watch')}</span>
              </div>
            </div>
            <h3>{t('lp.hub.ready')}</h3>
            <p>{t('lp.hub.readyText')}</p>
            <a className="lp-btn lp-btn--go" href={requestHome}>{t('lp.openHub')}</a>
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
                <img src={poster(spotlight.from, 240)} width={72} height={108} alt={t('lp.poster', { title: spotlight.from.title })} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster(spotlight.to, 240)} width={72} height={108} alt={t('lp.poster', { title: spotlight.to.title })} />
              </span>
              <span className="lp-spot-text">
                <span className="lp-spot-rel">
                  <i style={{ background: REL_COLOR[spotlight.relationship] ?? '#fff' }} aria-hidden="true" />
                  {t(`lp.rel.${spotlight.relationship}`)}
                </span>
                <b>
                  {spotlight.from.title}
                  {yearOf(spotlight.from)} {t('lp.ref.and')} {spotlight.to.title}
                  {yearOf(spotlight.to)}
                </b>
                <span className="lp-spot-reason">{lang === 'id' ? spotlight.reasonId || spotlight.reason : spotlight.reason}</span>
              </span>
            </a>
          )}
          <h2 id="reference-h" className="lp-head" data-reveal>{t('lp.ref.h')}</h2>
          <div className="lp-ref-text" data-reveal style={{ '--d': '90ms' } as CssVars}>
            <p>{t('lp.ref.text')}</p>
            <a className="lp-btn lp-btn--go" href={referenceHome}>{t('lp.openRef')}</a>
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
                      alt={t('lp.poster', { title: f.title })}
                      loading="lazy"
                      decoding="async"
                      style={{ aspectRatio: ratios[(c + row * 3) % ratios.length] }}
                    />
                  </a>
                  <figcaption>
                    {t(f.count === 1 ? 'lp.ref.connection' : 'lp.ref.connections', { title: f.title, n: f.count })}
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
            <b data-count={stats.movies}>{fmt(stats.movies, lang)}</b>
            <span>{t('lp.stats.films')}</span>
            <p className="lp-fig-note">{t('lp.stats.filmsNote')}</p>
          </div>
          <h2 id="stats-h" className="lp-stats-h">{t('lp.stats.h')}</h2>
          <div className="lp-fig lp-fig--2" data-tone="ink">
            <b data-count={stats.series}>{fmt(stats.series, lang)}</b>
            <span>{t('lp.stats.series')}</span>
            <p className="lp-fig-note">{t('lp.stats.seriesNote')}</p>
          </div>
          <div className="lp-fig lp-fig--3" data-tone="mid">
            <b data-count={stats.mapped}>{fmt(stats.mapped, lang)}</b>
            <span>{t('lp.stats.mapped')}</span>
            <p className="lp-fig-note">{t('lp.stats.mappedNote')}</p>
          </div>
        </div>
      </section>

      {/* ── About: wide photo, colour tile, facts ───────────────────────────── */}
      <section id="about" className="lp-section lp-section--bg lp-about" aria-labelledby="about-h">
        <h2 id="about-h" className="lp-head lp-head--about" data-reveal>{t('lp.about.h')}</h2>
        <p className="lp-about-lead" data-reveal style={{ '--d': '60ms' } as CssVars}>
          {t('lp.about.lead')}
        </p>
        <div className="lp-about-row">
          <figure className="lp-about-photo" data-reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/projector.jpg" width={1920} height={1200} alt={t('lp.about.photoAlt')} loading="lazy" decoding="async" />
            <p>{t('lp.about.text')}</p>
          </figure>
          <div className="lp-about-side" data-reveal style={{ '--d': '90ms' } as CssVars}>
            <div className="lp-about-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" width={186} height={186} alt={t('lp.about.mark')} />
            </div>
            <dl className="lp-facts">
              <div><dt>{t('lp.about.hosted')}</dt><dd>{t('lp.about.hostedV')}</dd></div>
              <div><dt>{t('lp.about.ads')}</dt><dd>{t('lp.about.none')}</dd></div>
              <div><dt>{t('lp.about.tracking')}</dt><dd>{t('lp.about.none')}</dd></div>
              <div><dt>{t('lp.about.since')}</dt><dd>2022</dd></div>
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
            <h2 id="cta-h" className="lp-cta-h">{t('lp.cta.h')}</h2>
            <p>{t('lp.cta.text')}</p>
            <CoffeeButton className="lp-btn lp-btn--ink" labels={coffeeLabels}>{t('lp.coffee')}</CoffeeButton>
          </div>
          <div className="lp-cta-flank lp-cta-flank--flat" aria-hidden="true" />
        </div>
      </section>

      {/* ── Footer: the mark, built large ───────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-foot-grid">
          <nav className="lp-foot-cols" aria-label={t('lp.foot.label')}>
            <div>
              <h3>{t('lp.streaming')}</h3>
              <a href={watchHome}>{t('lp.openStreaming')}</a>
            </div>
            <div>
              <h3>{t('lp.hub.h')}</h3>
              <a href={requestHome}>{t('lp.foot.request')}</a>
              <a href={urls.hubHref('/requests')}>{t('lp.foot.mine')}</a>
            </div>
            <div>
              <h3>{t('lp.ref.h')}</h3>
              <a href={referenceHome}>{t('lp.foot.maps')}</a>
              <a href={urls.referenceHref('/galaxy')}>{t('lp.foot.galaxy')}</a>
            </div>
            <div>
              <h3>{t('lp.foot.support')}</h3>
              <CoffeeButton className="lp-link-btn" labels={coffeeLabels}>{t('lp.coffee')}</CoffeeButton>
            </div>
          </nav>
          <p className="lp-foot-note">
            {t('lp.foot.note')}
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
            {t('lp.foot.photo')} <a href="https://commons.wikimedia.org/wiki/File:16mm_Projector_with_%27cakestand%27.JPG">“16mm Projector with ‘cakestand’”</a> {t('lp.foot.by')}
            YellowFratello, <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>, {t('lp.foot.via')}
          </span>
          <a className="lp-btn lp-btn--small" href="#top">{t('lp.top')}</a>
        </div>
      </footer>
    </>
  );
}
