/**
 * Watch order — panggung satu saga: jalur kiri ke kanan yang bisa digeser, dicubit, dan di-zoom,
 * memakai kerangka panggung yang sama dengan peta 3D satu film (.ref-stage + .ref-panel), supaya
 * Watch order terasa satu portal dengan peta dan Galaxy.
 *
 * Dua urutan: cerita dan rilis. Tombolnya cuma muncul kalau keduanya memang berbeda.
 * Jalur tambahan (serial, spin-off) bercabang dari judul induknya.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePortal } from '@/lib/hooks/use-portal';
import { posterUrl, watchUrl } from '@/lib/jellyfin';
import { useLang } from './lang-provider';
import { LensSwitch } from './lens-switch';
import type { SagaFull, SagaEntry } from '@/lib/connections';

type Mode = 'story' | 'release';

// geometri jalur dalam "world px" (sebelum zoom)
const COL = 128;
const CW = 104;
const PH = 156;
const RAIL = PH + 20;
const LANE_H = PH + 20 + 14 + 86;
const PAD = 72;
const TOP = 40; // ruang buat label "Start here" di atas jalur
const MIN_K = 0.2;
const MAX_K = 2.4;

// jalur utama putih, jalur tambahan memakai warna hubungan portal
const LANE_COLORS = ['#ffffff', 'var(--rel-inspired)', 'var(--rel-remake)', 'var(--rel-homage)', 'var(--rel-director)'];

export function SagaStage({
  saga,
  film,
  jellyfinUrl,
  serverId,
}: {
  saga: SagaFull;
  /** "movie:123" — judul yang dituju dari peta koneksi atau pencarian */
  film?: string;
  jellyfinUrl: string;
  serverId?: string;
}) {
  const { t, lang } = useLang();
  const { portalPath, hubHref } = usePortal();

  const [mode, setMode] = useState<Mode>('story');
  const [picked, setPicked] = useState<string | null>(null);
  // jarak antar judul melebar kalau saganya pendek, supaya jalurnya mengisi panggung (diukur setelah mount)
  const [col, setCol] = useState(COL);
  const viewRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const loc = lang === 'id' ? 'id' : 'en';
  const index = useCallback((e: SagaEntry) => (mode === 'story' ? e.story : e.rel), [mode]);
  const ordered = useMemo(() => [...saga.entries].sort((a, b) => index(a) - index(b)), [saga.entries, index]);

  const laneOf = useCallback((id: string) => Math.max(0, saga.lanes.findIndex((l) => l.id === id)), [saga.lanes]);
  const world = useMemo(
    () => ({ w: PAD * 2 + (saga.entries.length - 1) * col + CW, h: TOP + saga.lanes.length * LANE_H }),
    [saga.entries.length, saga.lanes.length, col]
  );
  const cardX = useCallback((e: SagaEntry) => PAD + index(e) * col, [index, col]);
  const cardY = useCallback((e: SagaEntry) => TOP + laneOf(e.lane) * LANE_H, [laneOf]);

  // judul yang dituju dari luar (peta film / pencarian)
  const wanted = film ? saga.entries.find((e) => e.tmdbId && `${e.mediaType}:${e.tmdbId}` === film) : undefined;
  const start = ordered.find((e) => e.lane === saga.lanes[0]?.id) ?? ordered[0];
  const selected = ordered.find((e) => e.key === picked) ?? wanted ?? start;

  // ── kamera: semua gerak lewat ref + rAF, jangan render ulang React tiap frame
  const cam = useRef({ x: 0, y: 0, k: 1 });
  const tween = useRef<{ t0: number; from: typeof cam.current; to: typeof cam.current } | null>(null);
  const raf = useRef(0);
  const [zoomPct, setZoomPct] = useState(100);

  const apply = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${cam.current.x}px, ${cam.current.y}px, 0) scale(${cam.current.k})`;
    // jauh di luar: keterangan jadi bubur, sisakan poster dan titiknya saja
    el.dataset.far = cam.current.k < 0.55 ? '' : 'no';
  }, []);

  const clamp = useCallback((c: { x: number; y: number; k: number }) => {
    const view = viewRef.current;
    if (!view) return c;
    const vw = view.clientWidth;
    const vh = view.clientHeight;
    const w = world.w * c.k;
    const h = world.h * c.k;
    c.x = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, c.x));
    c.y = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, c.y));
    return c;
  }, [world]);

  const fitK = useCallback(() => {
    const view = viewRef.current;
    if (!view) return 1;
    return Math.max(MIN_K, Math.min(1, view.clientWidth / world.w, view.clientHeight / world.h));
  }, [world]);

  const settle = useCallback(() => {
    setZoomPct(Math.round(cam.current.k * 100));
  }, []);

  const glide = useCallback(
    (to: { x: number; y: number; k: number }) => {
      clamp(to);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        cam.current = to;
        apply();
        settle();
        return;
      }
      tween.current = { t0: performance.now(), from: { ...cam.current }, to };
      cancelAnimationFrame(raf.current);
      const step = () => {
        const tw = tween.current;
        if (!tw) return;
        const p = Math.min(1, (performance.now() - tw.t0) / 620);
        const e = 1 - Math.pow(1 - p, 3);
        cam.current = {
          x: tw.from.x + (tw.to.x - tw.from.x) * e,
          y: tw.from.y + (tw.to.y - tw.from.y) * e,
          k: tw.from.k * Math.pow(tw.to.k / tw.from.k, e),
        };
        apply();
        if (p < 1) raf.current = requestAnimationFrame(step);
        else {
          tween.current = null;
          settle();
        }
      };
      raf.current = requestAnimationFrame(step);
    },
    [apply, clamp, settle]
  );

  /** bawa satu judul ke tengah panggung */
  const centerOn = useCallback(
    (e: SagaEntry, k?: number) => {
      const view = viewRef.current;
      if (!view) return;
      const kk = Math.max(MIN_K, Math.min(MAX_K, k ?? Math.max(cam.current.k, 0.85)));
      glide({
        x: view.clientWidth / 2 - (cardX(e) + CW / 2) * kk,
        y: view.clientHeight / 2 - (cardY(e) + RAIL) * kk,
        k: kk,
      });
    },
    [cardX, cardY, glide]
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const view = viewRef.current;
      if (!view) return;
      const k = Math.max(MIN_K, Math.min(MAX_K, cam.current.k * factor));
      glide({
        x: view.clientWidth / 2 - (view.clientWidth / 2 - cam.current.x) * (k / cam.current.k),
        y: view.clientHeight / 2 - (view.clientHeight / 2 - cam.current.y) * (k / cam.current.k),
        k,
      });
    },
    [glide]
  );

  const reset = useCallback(() => {
    const k = fitK();
    glide({ x: 0, y: 0, k });
  }, [fitK, glide]);

  // ── pasang gestur sekali
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const zoomAt = (sx: number, sy: number, factor: number) => {
      const k = Math.max(MIN_K, Math.min(MAX_K, cam.current.k * factor));
      tween.current = null;
      cam.current = clamp({
        k,
        x: sx - (sx - cam.current.x) * (k / cam.current.k),
        y: sy - (sy - cam.current.y) * (k / cam.current.k),
      });
      apply();
      settle();
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const r = view.getBoundingClientRect();
      // cubit di trackpad datang sebagai wheel + ctrlKey; sisanya menggeser jalur
      if (ev.ctrlKey || ev.metaKey) {
        zoomAt(ev.clientX - r.left, ev.clientY - r.top, Math.exp(-ev.deltaY * 0.01));
        return;
      }
      tween.current = null;
      const tall = world.h * cam.current.k > view.clientHeight + 1;
      cam.current = clamp({
        ...cam.current,
        x: cam.current.x - ev.deltaX - (tall ? 0 : ev.deltaY),
        y: tall ? cam.current.y - ev.deltaY : cam.current.y,
      });
      apply();
    };

    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    let moved = 0;

    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0 && ev.pointerType === 'mouse') return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      moved = 0;
      tween.current = null;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
      // sengaja TANPA setPointerCapture: menangkap pointer di panggung bikin klik mendarat
      // di panggung, bukan di kartunya. Gerakan diikuti lewat window supaya tetap jalan di luar panggung.
      view.dataset.grabbing = '';
    };
    const onMove = (ev: PointerEvent) => {
      const p = pointers.get(ev.pointerId);
      if (!p) return;
      const dx = ev.clientX - p.x;
      const dy = ev.clientY - p.y;
      p.x = ev.clientX;
      p.y = ev.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 1) {
        cam.current = clamp({ ...cam.current, x: cam.current.x + dx, y: cam.current.y + dy });
        apply();
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const r = view.getBoundingClientRect();
        if (pinch > 0) zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinch);
        pinch = d;
      }
    };
    const onUp = (ev: PointerEvent) => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (pointers.size === 0) delete view.dataset.grabbing;
      // geseran kecil dihitung sebagai klik: biarkan tombol kartu yang menangani
      view.dataset.dragged = moved > 6 ? '' : 'no';
    };
    const onDouble = (ev: MouseEvent) => {
      const r = view.getBoundingClientRect();
      zoomAt(ev.clientX - r.left, ev.clientY - r.top, 1.6);
    };

    view.addEventListener('wheel', onWheel, { passive: false });
    view.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    view.addEventListener('dblclick', onDouble);
    return () => {
      view.removeEventListener('wheel', onWheel);
      view.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      view.removeEventListener('dblclick', onDouble);
      cancelAnimationFrame(raf.current);
    };
  }, [apply, clamp, settle, world.h]);

  // ── tampilan awal: pas-kan jalurnya, atau langsung ke judul yang dituju
  const first = useRef(true);
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const place = () => {
      const gaps = Math.max(1, saga.entries.length - 1);
      setCol(Math.round(Math.max(COL, Math.min(300, (view.clientWidth * 0.88 - PAD * 2 - CW) / gaps))));
      if (first.current) {
        first.current = false;
        if (wanted) centerOn(wanted, 1);
        else {
          // mulai dari awal jalur dengan ukuran yang masih terbaca; tombol ⤢ untuk melihat semuanya
          // saga pendek diperbesar supaya mengisi panggung; yang panjang tetap seukuran baca
          const k0 = Math.min(1.6, Math.max(1, Math.min((view.clientWidth * 0.86) / world.w, (view.clientHeight * 0.86) / world.h)));
          cam.current = clamp({ x: 0, y: 0, k: k0 });
          apply();
          settle();
        }
      } else {
        cam.current = clamp({ ...cam.current });
        apply();
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(view);
    return () => ro.disconnect();
  }, [apply, centerOn, clamp, settle, wanted, world, saga.entries.length]);

  const choose = (e: SagaEntry) => {
    const view = viewRef.current;
    if (view?.dataset.dragged === '') return; // barusan menggeser, bukan memilih
    setPicked(e.key);
    centerOn(e);
  };

  // pindah urutan: kartu bergeser sendiri, kamera mengikuti judul yang sedang dipilih
  const swap = (m: Mode) => {
    setMode(m);
    const e = selected;
    if (e) requestAnimationFrame(() => setTimeout(() => centerOn(e), 60));
  };

  const released = (r: string) => {
    const [y, m] = r.split('-').map(Number);
    return m
      ? new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      : String(y);
  };

  const byKey = new Map(saga.entries.map((e) => [e.key, e]));
  const color = (i: number) => LANE_COLORS[i % LANE_COLORS.length];
  const pos = selected ? index(selected) + 1 : 0;
  const neighbour = (step: -1 | 1) => (selected ? ordered[index(selected) + step] : undefined);
  const mapHref = (e: SagaEntry) => (e.count > 0 && e.tmdbId ? portalPath(`/${e.mediaType}/${e.tmdbId}`) || '/' : null);

  return (
    <>
      <section className="ref-detail-top ref-saga-head">
        <p className="ref-back">
          <a href={portalPath('/timeline') || '/timeline'}>← {t('tl.index.back')}</a>
        </p>
        <h1 className="ref-detail-title ref-display">
          <span className="ref-line">
            <span>{saga.name}</span>
          </span>
        </h1>
        <p className="ref-detail-sub">{saga.tip[loc]}</p>
        <div className="ref-detail-actions ref-saga-actions">
          {saga.twoOrders ? (
            <div className="ref-saga-seg" role="group" aria-label={t('tl.mode')}>
              {(['story', 'release'] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => swap(m)}>
                  {t(`tl.${m}`)}
                </button>
              ))}
            </div>
          ) : (
            <p className="ref-saga-single">{t('tl.sameOrder')}</p>
          )}
          <p className="ref-saga-count">{t('tl.count', { n: saga.total })}</p>
        </div>
        {saga.lanes.length > 1 && (
          <ul className="ref-legend ref-saga-lanes">
            {saga.lanes.map((l, i) => (
              <li key={l.id}>
                <span className="ref-mark" style={{ ['--c' as string]: color(i) }} />
                {l.label[loc]}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="ref-stage ref-saga-stage" style={{ ['--saga-h' as string]: `${world.h + 56}px` }}>
        <div className="ref-stage-view" ref={viewRef}>
          <div className="ref-saga-track" ref={trackRef} style={{ width: world.w, height: world.h }}>
            <svg className="ref-saga-rails" width={world.w} height={world.h} aria-hidden="true">
              <g key={mode}>
                {saga.lanes.map((l, i) => {
                  const own = ordered.filter((e) => e.lane === l.id);
                  if (!own.length) return null;
                  const y = TOP + i * LANE_H + RAIL;
                  const x1 = cardX(own[0]) + CW / 2;
                  const x2 = cardX(own[own.length - 1]) + CW / 2;
                  const parent = l.fork ? byKey.get(l.fork) : undefined;
                  return (
                    <g key={l.id} stroke={color(i)} fill="none" strokeWidth={3} strokeLinecap="round">
                      <path d={`M${x1} ${y} H${x2}`} />
                      {parent && (
                        <path
                          d={`M${cardX(parent) + CW / 2} ${cardY(parent) + RAIL} H${cardX(parent) - col / 2 + CW / 2} V${y} H${x1}`}
                          strokeDasharray="2 9"
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
              return (
                <button
                  key={e.key}
                  type="button"
                  className="ref-saga-card"
                  data-sel={selected?.key === e.key ? '' : undefined}
                  data-missing={e.jellyfinId ? undefined : ''}
                  aria-pressed={selected?.key === e.key}
                  style={{
                    width: CW,
                    transform: `translate3d(${cardX(e)}px, ${cardY(e)}px, 0)`,
                    ['--lane' as string]: color(li),
                  }}
                  onClick={() => choose(e)}
                  onFocus={() => centerOn(e)}
                >
                  {e.key === start?.key && <span className="ref-saga-start">{t('tl.start')}</span>}
                  <span className="ref-frame" style={{ height: PH }}>
                    {e.jellyfinId && jellyfinUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={posterUrl(e.jellyfinId, jellyfinUrl, 220)} alt="" draggable={false} loading="lazy" />
                    ) : (
                      <span className="ref-saga-ghost">{t('tl.missing')}</span>
                    )}
                  </span>
                  <i className="ref-saga-dot" style={{ top: RAIL - 6 }} />
                  <span className="ref-saga-cap">
                    <b>{e.title}</b>
                    <small>{mode === 'story' ? e.when ?? released(e.release) : released(e.release)}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="ref-stage-hint">{t('tl.hint')}</p>

          <div className="ref-saga-zoom">
            <button type="button" onClick={() => zoomBy(1 / 1.35)} aria-label={t('tl.zoomOut')}>
              −
            </button>
            <span aria-hidden="true">{zoomPct}%</span>
            <button type="button" onClick={() => zoomBy(1.35)} aria-label={t('tl.zoomIn')}>
              +
            </button>
            <button type="button" onClick={reset} aria-label={t('tl.fit')}>
              ⤢
            </button>
          </div>
        </div>

        {selected && (
          <aside className="ref-panel" aria-live="polite">
            <p className="ref-panel-rel">
              {t(mode === 'story' ? 'tl.posStory' : 'tl.posRelease', { n: pos, total: saga.total })}
            </p>
            <h3>
              {selected.title}
              <small>{selected.year}</small>
            </h3>
            <p>
              {[selected.mediaType === 'tv' ? t('tl.series') : null, mode === 'story' ? selected.when : null, t('tl.released', { when: released(selected.release) })]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {selected.note && <p>{selected.note[loc]}</p>}

            <div className="ref-panel-actions">
              {selected.jellyfinId ? (
                <a className="ref-btn" href={watchUrl(selected.jellyfinId, jellyfinUrl, serverId)} target="_blank" rel="noopener">
                  {t('tl.watch')}
                </a>
              ) : (
                <a className="ref-btn" href={hubHref(`/browse?q=${encodeURIComponent(selected.title)}`)}>
                  {t('tl.request')}
                </a>
              )}
            </div>

            {selected.tmdbId && selected.mediaType && (
              <LensSwitch
                current="order"
                mediaType={selected.mediaType}
                tmdbId={selected.tmdbId}
                sagaId={saga.id}
                hasMap={selected.count > 0}
              />
            )}

            <div className="ref-saga-step">
              {neighbour(-1) && (
                <button type="button" onClick={() => choose(neighbour(-1) as SagaEntry)}>
                  ← {neighbour(-1)?.title}
                </button>
              )}
              {neighbour(1) && (
                <button type="button" onClick={() => choose(neighbour(1) as SagaEntry)}>
                  {t('tl.next')}: {neighbour(1)?.title} →
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
