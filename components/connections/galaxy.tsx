/**
 * Galaxy — seluruh library sebagai langit: satu titik per judul, garis = koneksi.
 * Judul yang berbagi cerita, pembuat, atau tampilan melayang berdekatan (layout dihitung di server).
 * Canvas 2D sendiri (tanpa library): pan, zoom (scroll & cubit), hover, klik buat panel,
 * dan "terbang" ke judul lewat search atau daftar tetangga.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { usePortal } from '@/lib/hooks/use-portal';
import { posterUrl, watchUrl } from '@/lib/jellyfin';
import { REL_COLOR, REL_VAR } from '@/lib/portal-data';
import { useLang } from './lang-provider';
import { SearchBox } from './search-box';

// [tmdbId, mediaType, title, year, jellyfinId, degree, cluster, x, y]
type N = [number, string, string, number | null, string | null, number, number, number, number];
// [a, b, relIndex, srcIsA]
type E = [number, number, number, number];
export interface GalaxyData {
  rels: string[];
  nodes: N[];
  edges: E[];
}

const PALETTE = ['#f7941d', '#4f8ff0', '#34c3a0', '#e0405f', '#c77dff', '#d9d4c4', '#ffd166', '#7bdff2', '#ff9aa2', '#a3e635'];
const BG = '#05070a';
const PRIORITY = ['homage', 'inspired', 'visual', 'remake', 'talent', 'director', 'universe'];

const radiusOf = (deg: number) => 2 + Math.sqrt(deg) * 1.25;

const EMPTY: GalaxyData = { rels: [], nodes: [], edges: [] };

export function Galaxy({ data: input }: { data: GalaxyData | null }) {
  const data = input ?? EMPTY;
  const { t, rel } = useLang();
  const config = useAppConfig();
  const { portalPath } = usePortal();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [touch, setTouch] = useState(false);

  // semua state gambar disimpan di ref: gak perlu re-render React tiap frame
  const cam = useRef({ x: 0, y: 0, k: 1, rot: 0 });
  const fitK = useRef(1);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const selRef = useRef<number | null>(null);
  const hovRef = useRef<number | null>(null);
  const dirty = useRef(true);
  const tween = useRef<{ t0: number; from: typeof cam.current; to: typeof cam.current } | null>(null);
  const pointerIn = useRef(false);

  const { nodes, edges, rels } = data;

  const nb = useMemo(() => {
    const list: Array<Array<{ other: number; rel: number; edge: number; srcIsMe: boolean }>> = nodes.map(() => []);
    edges.forEach((e, i) => {
      list[e[0]].push({ other: e[1], rel: e[2], edge: i, srcIsMe: e[3] === 1 });
      list[e[1]].push({ other: e[0], rel: e[2], edge: i, srcIsMe: e[3] !== 1 });
    });
    return list;
  }, [nodes, edges]);

  const indexByKey = useMemo(() => new Map(nodes.map((n, i) => [`${n[1]}:${n[0]}`, i])), [nodes]);

  const requestDraw = () => {
    dirty.current = true;
  };

  const select = useCallback((i: number | null) => {
    selRef.current = i;
    setSelected(i);
    requestDraw();
  }, []);

  const flyTo = useCallback((i: number, zoom?: number) => {
    const n = nodes[i];
    const k = zoom ?? Math.max(cam.current.k, fitK.current * 3.2);
    // kamera hidup di ruang yang sudah diputar: hitung posisi titik dengan rotasi saat ini
    const c = Math.cos(cam.current.rot);
    const sn = Math.sin(cam.current.rot);
    const to = { x: n[7] * c - n[8] * sn, y: n[7] * sn + n[8] * c, k, rot: cam.current.rot };
    tween.current = { t0: performance.now(), from: { ...cam.current }, to };
    requestDraw();
  }, [nodes]);

  const reset = useCallback(() => {
    tween.current = { t0: performance.now(), from: { ...cam.current }, to: { x: 0, y: 0, k: fitK.current, rot: cam.current.rot } };
    select(null);
  }, [select]);

  // ── setup canvas, loop & input
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !input) return;
    const ctx = canvas.getContext('2d')!;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const font = getComputedStyle(wrap).fontFamily;
    setTouch(window.matchMedia('(pointer: coarse)').matches);

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      size.current = { w, h, dpr };
      const first = fitK.current === 1 && cam.current.k === 1;
      fitK.current = Math.min(w, h) / 2150;
      if (first) cam.current = { x: 0, y: 0, k: fitK.current, rot: 0 };
      requestDraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const toScreen = (wx: number, wy: number): [number, number] => {
      const c = Math.cos(cam.current.rot);
      const sn = Math.sin(cam.current.rot);
      const rx = wx * c - wy * sn;
      const ry = wx * sn + wy * c;
      return [
        (rx - cam.current.x) * cam.current.k + size.current.w / 2,
        (ry - cam.current.y) * cam.current.k + size.current.h / 2,
      ];
    };
    const toWorld = (sx: number, sy: number): [number, number] => [
      (sx - size.current.w / 2) / cam.current.k + cam.current.x,
      (sy - size.current.h / 2) / cam.current.k + cam.current.y,
    ];
    const screenR = (deg: number) => radiusOf(deg) * Math.max(0.75, Math.min(2.4, Math.sqrt(cam.current.k * 1.4)));

    const hitTest = (sx: number, sy: number): number | null => {
      let best: number | null = null;
      let bestD = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const [px, py] = toScreen(nodes[i][7], nodes[i][8]);
        const d = Math.hypot(px - sx, py - sy);
        const r = screenR(nodes[i][5]) + 7;
        if (d < r && d < bestD) {
          best = i;
          bestD = d;
        }
      }
      return best;
    };

    // ── gambar
    const draw = () => {
      const { w, h, dpr } = size.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      const sel = selRef.current;
      const hov = hovRef.current;
      const focus = sel ?? hov;
      const k = cam.current.k;
      const near = new Set<number>();
      if (focus !== null) {
        near.add(focus);
        nb[focus].forEach((x) => near.add(x.other));
      }

      // garis biasa
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(122,136,170,${focus !== null ? 0.06 : Math.min(0.28, 0.1 + k * 0.5)})`;
      ctx.beginPath();
      for (const e of edges) {
        if (focus !== null && (e[0] === focus || e[1] === focus)) continue;
        const [x1, y1] = toScreen(nodes[e[0]][7], nodes[e[0]][8]);
        const [x2, y2] = toScreen(nodes[e[1]][7], nodes[e[1]][8]);
        if ((x1 < -50 && x2 < -50) || (x1 > w + 50 && x2 > w + 50) || (y1 < -50 && y2 < -50) || (y1 > h + 50 && y2 > h + 50)) continue;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();

      // garis milik titik terpilih / disorot, berwarna per jenis hubungan
      if (focus !== null) {
        ctx.lineWidth = 1.7;
        for (const x of nb[focus]) {
          ctx.strokeStyle = REL_COLOR[rels[x.rel]] ?? '#888';
          ctx.globalAlpha = sel !== null ? 0.9 : 0.65;
          const [x1, y1] = toScreen(nodes[focus][7], nodes[focus][8]);
          const [x2, y2] = toScreen(nodes[x.other][7], nodes[x.other][8]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // titik
      for (let i = 0; i < nodes.length; i++) {
        const [x, y] = toScreen(nodes[i][7], nodes[i][8]);
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
        const dim = focus !== null && !near.has(i);
        ctx.globalAlpha = dim ? 0.16 : 1;
        ctx.fillStyle = PALETTE[nodes[i][6] % PALETTE.length];
        ctx.beginPath();
        ctx.arc(x, y, screenR(nodes[i][5]), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (focus !== null) {
        const [x, y] = toScreen(nodes[focus][7], nodes[focus][8]);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, screenR(nodes[focus][5]) + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // label (greedy, tanpa tumpang tindih)
      const degreeCut = k < fitK.current * 1.4 ? 9 : k < fitK.current * 2.5 ? 5 : k < fitK.current * 5 ? 3 : 1;
      const cands: number[] = [];
      if (focus !== null) {
        cands.push(focus);
        near.forEach((i) => i !== focus && cands.push(i));
      } else {
        for (let i = 0; i < nodes.length; i++) if (nodes[i][5] >= degreeCut) cands.push(i);
        cands.sort((a, b) => nodes[b][5] - nodes[a][5]);
      }
      ctx.font = `600 12px ${font}`;
      ctx.textBaseline = 'middle';
      const placed: Array<[number, number, number, number]> = [];
      for (const i of cands) {
        const [x, y] = toScreen(nodes[i][7], nodes[i][8]);
        if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;
        const label = nodes[i][2];
        const tw = ctx.measureText(label).width;
        const lx = x + screenR(nodes[i][5]) + 6;
        const box: [number, number, number, number] = [lx - 2, y - 8, lx + tw + 2, y + 8];
        if (i !== focus && placed.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1])) continue;
        placed.push(box);
        ctx.lineWidth = 3;
        ctx.strokeStyle = BG;
        ctx.strokeText(label, lx, y);
        ctx.fillStyle = i === focus ? '#fff' : '#d4d8e4';
        ctx.fillText(label, lx, y);
      }
    };

    let raf = 0;
    let lastT = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;
      // langit berputar pelan; berhenti kalau ada yang dipilih, kursor di atasnya, atau sedang terbang
      if (!reducedMotion && selRef.current === null && !pointerIn.current && !tween.current) {
        cam.current.rot += dt * 0.028;
        dirty.current = true;
      }
      if (tween.current) {
        const tw = tween.current;
        const p = Math.min(1, (performance.now() - tw.t0) / 700);
        const e = 1 - Math.pow(1 - p, 3);
        cam.current = {
          x: tw.from.x + (tw.to.x - tw.from.x) * e,
          y: tw.from.y + (tw.to.y - tw.from.y) * e,
          k: tw.from.k * Math.pow(tw.to.k / tw.from.k, e),
          rot: cam.current.rot,
        };
        dirty.current = true;
        if (p >= 1) tween.current = null;
      }
      if (dirty.current) {
        dirty.current = false;
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // ── input
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinchDist = 0;

    const rect = () => canvas.getBoundingClientRect();
    const zoomAt = (sx: number, sy: number, factor: number) => {
      const [wx, wy] = toWorld(sx, sy);
      const k = Math.max(fitK.current * 0.7, Math.min(fitK.current * 16, cam.current.k * factor));
      cam.current.k = k;
      // jaga titik di bawah kursor tetap di tempatnya
      cam.current.x = wx - (sx - size.current.w / 2) / k;
      cam.current.y = wy - (sy - size.current.h / 2) / k;
      tween.current = null;
      requestDraw();
    };

    const onDown = (e: PointerEvent) => {
      pointerIn.current = true;
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      tween.current = null;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      const r = rect();
      const p = pointers.get(e.pointerId);
      if (!p) {
        // hover
        const hit = hitTest(e.clientX - r.left, e.clientY - r.top);
        if (hit !== hovRef.current) {
          hovRef.current = hit;
          canvas.style.cursor = hit !== null ? 'pointer' : 'grab';
          requestDraw();
        }
        return;
      }
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 1) {
        cam.current.x -= dx / cam.current.k;
        cam.current.y -= dy / cam.current.k;
        requestDraw();
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinchDist);
        pinchDist = d;
      }
    };
    const onUp = (e: PointerEvent) => {
      const wasSingle = pointers.size === 1;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      canvas.style.cursor = hovRef.current !== null ? 'pointer' : 'grab';
      if (e.pointerType === 'touch') pointerIn.current = false;
      if (wasSingle && moved < 6) {
        const r = rect();
        const hit = hitTest(e.clientX - r.left, e.clientY - r.top);
        select(hit);
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = rect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null);
    };
    const onEnter = () => {
      pointerIn.current = true;
    };
    const onLeave = () => {
      pointerIn.current = false;
      if (hovRef.current !== null) {
        hovRef.current = null;
        requestDraw();
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerenter', onEnter);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    canvas.style.cursor = 'grab';

    // ?select=movie:62 buat link langsung ke satu judul
    const want = new URLSearchParams(window.location.search).get('select');
    if (want && indexByKey.has(want)) {
      const i = indexByKey.get(want)!;
      selRef.current = i;
      setSelected(i);
      cam.current = { x: nodes[i][7], y: nodes[i][8], k: fitK.current * 3.2, rot: 0 };
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerenter', onEnter);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const node = selected !== null ? nodes[selected] : null;
  const neighbours = useMemo(() => {
    if (selected === null) return [];
    return [...nb[selected]].sort(
      (a, b) =>
        PRIORITY.indexOf(rels[a.rel]) - PRIORITY.indexOf(rels[b.rel]) || nodes[b.other][5] - nodes[a.other][5]
    );
  }, [selected, nb, rels, nodes]);

  const SHOWN = 10;
  const open = (i: number) => {
    select(i);
    flyTo(i);
  };

  return (
    <div ref={wrapRef} className="ref-galaxy" data-sel={selected !== null ? '' : undefined}>
      <canvas ref={canvasRef} aria-label={t('galaxy.h1')} className={input ? 'is-ready' : undefined} />

      <div className="ref-galaxy-intro">
        <h1 className="ref-display">
          <span className="ref-line"><span>{t('galaxy.h1')}</span></span>
        </h1>
        <p>{t('galaxy.sub')}</p>
        <div className="ref-galaxy-search">
          <SearchBox
            variant="compact"
            placeholder={t('galaxy.search')}
            onPick={(r) => {
              const i = indexByKey.get(`${r.mediaType}:${r.tmdbId}`);
              if (i === undefined) return false; // judul tanpa peta: buka halamannya
              open(i);
              return true;
            }}
          />
        </div>
      </div>

      <div className="ref-galaxy-foot">
        <p>{input ? t('galaxy.count', { n: nodes.length, m: edges.length }) : t('galaxy.loading')}</p>
        <p>{touch ? t('galaxy.hintTouch') : t('galaxy.hint')} {t('galaxy.size')}</p>
        <button type="button" onClick={reset}>{t('galaxy.reset')}</button>
      </div>

      {node && selected !== null && (
        <aside className="ref-galaxy-panel" aria-live="polite">
          <button type="button" className="ref-galaxy-close" onClick={() => select(null)} aria-label={t('galaxy.close')}>
            ×
          </button>
          <div className="ref-galaxy-head">
            <span className="ref-frame">
              {node[4] && config?.jellyfinUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterUrl(node[4], config.jellyfinUrl, 240)} alt={node[2]} draggable={false} />
              )}
            </span>
            <div>
              <h2>{node[2]}</h2>
              <p>
                {node[3] ? `${node[3]} · ` : ''}
                {t('galaxy.connections', { n: node[5] })}
              </p>
            </div>
          </div>

          <div className="ref-galaxy-actions">
            {node[4] && config?.jellyfinUrl && (
              <a className="ref-btn" href={watchUrl(node[4], config.jellyfinUrl, config.jellyfinServerId)} target="_blank" rel="noopener">
                {t('detail.watch')}
              </a>
            )}
            <a className="ref-panel-link" href={portalPath(`/${node[1]}/${node[0]}`) || '/'}>
              {t('stage.openMap')}
            </a>
          </div>

          <ul className="ref-galaxy-list">
            {neighbours.slice(0, SHOWN).map((x) => (
              <li key={x.edge}>
                <button type="button" onClick={() => open(x.other)}>
                  <span className="ref-mark" style={{ '--c': REL_VAR[rels[x.rel]] } as React.CSSProperties} />
                  <b>{nodes[x.other][2]}</b>
                  <small>{rel(rels[x.rel], x.srcIsMe ? 'out' : 'in')}</small>
                </button>
              </li>
            ))}
          </ul>
          {neighbours.length > SHOWN && <p className="ref-galaxy-more">{t('galaxy.more', { n: neighbours.length - SHOWN })}</p>}

        </aside>
      )}
    </div>
  );
}
