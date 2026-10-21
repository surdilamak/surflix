/**
 * Portal Referensi — Watch order: satu saga digambar sebagai jalur dari kiri ke kanan.
 * Dua urutan, satu tombol: Story (kejadian dalam cerita) atau Release (urutan tayang). Kartu berpindah posisi
 * saat urutan diganti; spin-off dan serial berada di jalur sendiri yang bercabang dari judul induknya.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePortal } from '@/lib/hooks/use-portal';
import { posterUrl, watchUrl } from '@/lib/jellyfin';
import { useLang } from '@/components/connections/lang-provider';
import type { getSagas } from '@/lib/connections';

type Saga = Awaited<ReturnType<typeof getSagas>>[number];
type Entry = Saga['entries'][number];
type Mode = 'story' | 'release';

// geometri jalur (px): satu kolom per judul, kartu = poster + keterangan, rel di antara keduanya
const COL = 124;
const CW = 100;
const PH = 150;
const TOP = 26;
const RAIL = TOP + PH + 14;
const CAPTION = 68;
const LANE_H = TOP + PH + 28 + CAPTION + 10;
const PAD = 0;

// warna jalur: jalur utama putih, sisanya memakai warna jenis hubungan Reference
const LANE_COLORS = ['#ffffff', '#4f8ff0', '#1f9d7d', '#f7941d'];

export function TimelineView({
  sagas,
  initial,
  initialFilm,
  jellyfinUrl,
  serverId,
}: {
  sagas: Saga[];
  initial?: string;
  initialFilm?: string;
  jellyfinUrl: string;
  serverId?: string;
}) {
  const { t, lang } = useLang();
  const { portalPath } = usePortal();
  const [sagaId, setSagaId] = useState(() => (sagas.some((s) => s.id === initial) ? (initial as string) : sagas[0]?.id));
  const [mode, setMode] = useState<Mode>('story');
  const [picked, setPicked] = useState<string | null>(initialFilm ?? null);
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const saga = sagas.find((s) => s.id === sagaId);
  const index = useCallback((e: Entry) => (mode === 'story' ? e.story : e.rel), [mode]);

  const ordered = useMemo(() => (saga ? [...saga.entries].sort((a, b) => index(a) - index(b)) : []), [saga, index]);
  // "Start here" = the first title of the main line in the current order
  const start = ordered.find((e) => e.lane === saga?.lanes[0]?.id) ?? ordered[0];
  const selected = ordered.find((e) => e.key === picked) ?? start;

  // panah hanya muncul kalau masih ada yang bisa digeser
  const measure = useCallback(() => {
    const box = scroller.current;
    if (box) setEdge({ start: box.scrollLeft < 8, end: box.scrollLeft + box.clientWidth >= box.scrollWidth - 8 });
  }, []);
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    measure();
    box.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      box.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure, sagaId]);

  // geser kembali ke awal kalau saga atau urutannya berganti (kecuali ada film yang dituju dari peta)
  const first = useRef(true);
  useEffect(() => {
    const box = scroller.current;
    const target = first.current && initialFilm ? ordered.find((e) => e.key === initialFilm) : undefined;
    first.current = false;
    if (target && box) box.scrollTo({ left: Math.max(0, target.story * COL - box.clientWidth / 2 + CW / 2) });
    else box?.scrollTo({ left: 0, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sagaId, mode]);

  const chooseSaga = (id: string) => {
    setSagaId(id);
    setPicked(null);
    const url = new URL(window.location.href);
    url.searchParams.set('saga', id);
    window.history.replaceState(null, '', url);
  };

  const choose = (e: Entry) => {
    setPicked(e.key);
    const box = scroller.current;
    if (!box) return;
    const x = PAD + index(e) * COL + CW / 2;
    box.scrollTo({ left: Math.max(0, x - box.clientWidth / 2), behavior: 'smooth' });
  };

  const by = (dir: -1 | 1) => scroller.current?.scrollBy({ left: dir * COL * 4, behavior: 'smooth' });

  if (!saga) {
    return (
      <section className="ref-tl">
        <p className="ref-tl-empty">{t('tl.empty')}</p>
      </section>
    );
  }

  const laneOf = (id: string) => Math.max(0, saga.lanes.findIndex((l) => l.id === id));
  const color = (laneIdx: number) => LANE_COLORS[laneIdx % LANE_COLORS.length];
  const cx = (e: Entry) => PAD + index(e) * COL + CW / 2;
  const railY = (e: Entry) => laneOf(e.lane) * LANE_H + RAIL;
  const width = PAD * 2 + saga.entries.length * COL - (COL - CW);
  const height = saga.lanes.length * LANE_H;
  const byKey = new Map(saga.entries.map((e) => [e.key, e]));
  const loc = lang === 'id' ? 'id' : 'en';
  const released = (r: string) => {
    const [y, m] = r.split('-').map(Number);
    return m ? new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : String(y);
  };
  const meta = (e: Entry) => (mode === 'story' ? e.when ?? released(e.release) : released(e.release));

  const links = (e: Entry) =>
    e.jellyfinId && e.tmdbId
      ? {
          map: e.count > 0 ? portalPath(`/${e.mediaType}/${e.tmdbId}`) || '/' : null,
          watch: watchUrl(e.jellyfinId, jellyfinUrl, serverId),
        }
      : null;

  return (
    <section className="ref-tl">
      <header className="ref-tl-head">
        <h1 className="ref-display">{t('tl.h1')}</h1>
        <p className="ref-tl-sub">{t('tl.sub')}</p>

        <div className="ref-tl-controls">
          <div className="ref-tl-group" role="group" aria-label={t('tl.sagas')}>
            {sagas.map((s) => (
              <button key={s.id} type="button" className="ref-tl-chip" aria-pressed={s.id === saga.id} onClick={() => chooseSaga(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="ref-tl-seg" role="group" aria-label={t('tl.mode')}>
            {(['story', 'release'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                {t(`tl.${m}`)}
              </button>
            ))}
          </div>
        </div>

        <p className="ref-tl-tip">
          {saga.tip[loc]}
          <span>{t(mode === 'story' ? 'tl.storyHint' : 'tl.releaseHint')}</span>
        </p>
      </header>

      <div className="ref-tl-legend" aria-hidden={saga.lanes.length < 2}>
        {saga.lanes.map((l, i) => (
          <span key={l.id}>
            <i style={{ background: color(i) }} />
            {l.label[loc]}
          </span>
        ))}
        <span className="ref-tl-count">{t('tl.count', { n: saga.entries.length })}</span>
      </div>

      {selected && (
        <div className="ref-tl-detail" aria-live="polite">
          <div>
            <h2>
              {selected.title} <small>{selected.year}</small>
            </h2>
            <p className="ref-tl-facts">
              {[selected.mediaType === 'tv' ? t('tl.series') : null, selected.when, t('tl.released', { when: released(selected.release) })]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {selected.note && <p className="ref-tl-note">{selected.note[loc]}</p>}
            {(() => {
              const l = saga.lanes.find((x) => x.id === selected.lane);
              const parent = l?.fork ? byKey.get(l.fork) : undefined;
              const isFirst = l && parent && ordered.find((e) => e.lane === l.id)?.key === selected.key;
              return isFirst ? <p className="ref-tl-note">{t('tl.fork')}: {parent.title}</p> : null;
            })()}
          </div>
          {links(selected) ? (
            <p className="ref-tl-links">
              {links(selected)?.map && <a href={links(selected)!.map as string}>{t('tl.map')}</a>}
              <a href={links(selected)!.watch} target="_blank" rel="noopener">{t('tl.watch')}</a>
            </p>
          ) : (
            <p className="ref-tl-links ref-tl-links--off">{t('tl.missing')}</p>
          )}
        </div>
      )}

      <div className="ref-tl-stage">
        <button type="button" className="ref-tl-arrow" data-dir="prev" hidden={edge.start} onClick={() => by(-1)} aria-label={t('tl.prev')}>
          ‹
        </button>
        <button type="button" className="ref-tl-arrow" data-dir="next" hidden={edge.end} onClick={() => by(1)} aria-label={t('tl.next')}>
          ›
        </button>

        <div className="ref-tl-scroll" ref={scroller} tabIndex={0} aria-label={t('tl.scroll')}>
          <div key={saga.id} className="ref-tl-track" style={{ width, height }}>
            <svg className="ref-tl-svg" width={width} height={height} aria-hidden="true">
              <g key={mode} className="ref-tl-rails">
                {saga.lanes.map((l, i) => {
                  const own = ordered.filter((e) => e.lane === l.id);
                  if (!own.length) return null;
                  const first = own[0];
                  const last = own[own.length - 1];
                  const y = i * LANE_H + RAIL;
                  const parent = l.fork ? byKey.get(l.fork) : undefined;
                  return (
                    <g key={l.id} stroke={color(i)} fill="none" strokeWidth={3} strokeLinecap="round">
                      <path d={`M${cx(first)} ${y} H${cx(last)}`} />
                      {parent && (
                        <path
                          d={`M${cx(parent)} ${railY(parent)} H${cx(parent) - COL / 2} V${y} H${cx(first)}`}
                          strokeDasharray="2 8"
                          strokeLinejoin="round"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {ordered.map((e) => {
              const li = laneOf(e.lane);
              const isSel = selected?.key === e.key;
              return (
                <button
                  key={e.key}
                  type="button"
                  className="ref-tl-card"
                  data-sel={isSel ? '' : undefined}
                  data-missing={e.jellyfinId ? undefined : ''}
                  aria-pressed={isSel}
                  style={{ width: CW, height: LANE_H - 10, transform: `translate3d(${PAD + index(e) * COL}px, ${li * LANE_H}px, 0)`, ['--lane' as string]: color(li) }}
                  onClick={() => choose(e)}
                >
                  {e.key === start?.key && <span className="ref-tl-start">{t('tl.start')}</span>}
                  <span className="ref-tl-poster" style={{ height: PH, marginTop: TOP }}>
                    {e.jellyfinId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={posterUrl(e.jellyfinId, jellyfinUrl, 260)} alt="" width={CW} height={PH} loading="lazy" />
                    ) : (
                      <span className="ref-tl-ghost">{t('tl.missing')}</span>
                    )}
                  </span>
                  <i className="ref-tl-dot" style={{ top: RAIL - 6 }} />
                  <span className="ref-tl-cap" style={{ marginTop: 28 }}>
                    <b>{e.title}</b>
                    <small>{meta(e)}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </section>
  );
}
