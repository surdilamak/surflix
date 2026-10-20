/**
 * ConnectionGraph — peta referensi satu film: case Blu-ray 3D di atas bidang gelap.
 *
 * Film yang dibuka ada di tengah; film-film yang nyambung melayang di cincin miring di
 * sekelilingnya, dihubungkan tali berwarna sesuai jenis hubungan. Ketuk satu case:
 * cincin berputar membawanya ke depan, ia membesar, dan panel menjelaskan kenapa nyambung.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { posterUrl, watchUrl } from '@/lib/jellyfin';
import { REL_COLOR, REL_VAR } from '@/lib/portal-data';
import { REL_ORDER } from '@/lib/i18n';
import { useLang } from './lang-provider';

export interface GraphNode {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  year?: number | null;
  poster?: string | null;
  jellyfinId?: string | null;
  isSource: boolean;
  /** jumlah koneksi film ini (0 = belum ada peta) */
  refCount?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  relationship: string;
  direction: 'out' | 'in';
  reason: string;
  reasonEn?: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Graph 3D cuma muat belasan case; sisanya ada di daftar di bawahnya.
const MAX_NODES = 14;

// Ukuran case (satuan scene): rasio mirip case Blu-ray sungguhan
const W = 1.5;
const H = 2.1;
const D = 0.22;
const INSET = 0.07; // bingkai plastik yang kelihatan di sekeliling sampul

function accentFor(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return `hsl(${h}, 38%, 20%)`;
}

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      line = words[i];
      y += lh;
      lines++;
      if (lines >= maxLines - 1) {
        let rest = words.slice(i).join(' ');
        while (g.measureText(`${rest}…`).width > maxW && rest.length) rest = rest.slice(0, -1);
        g.fillText(`${rest}…`, x, y);
        return;
      }
    } else line = test;
  }
  g.fillText(line, x, y);
}

/** Sampul: poster (cover-fit) + banner Blu-ray di atas. Tanpa poster: warna + judul. */
function drawCover(c: HTMLCanvasElement, node: GraphNode, poster?: HTMLImageElement) {
  const w = c.width;
  const h = c.height;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d1220';
  g.fillRect(0, 0, w, h);

  if (poster) {
    const s = Math.max(w / poster.width, h / poster.height);
    const dw = poster.width * s;
    const dh = poster.height * s;
    g.drawImage(poster, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    g.fillStyle = accentFor(node.title);
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2f2f2';
    g.font = '800 46px "Schibsted Grotesk", -apple-system, system-ui, sans-serif';
    g.textBaseline = 'alphabetic';
    wrapText(g, node.title, 36, h - 150, w - 72, 52, 3);
    if (node.year) {
      g.fillStyle = '#b8bccb';
      g.font = '600 28px "Schibsted Grotesk", -apple-system, system-ui, sans-serif';
      g.fillText(String(node.year), 36, h - 50);
    }
  }

  // banner Blu-ray
  const bh = Math.round(h * 0.075);
  g.fillStyle = '#0a4ea3';
  g.fillRect(0, 0, w, bh);
  g.fillStyle = '#ffffff';
  g.font = '800 30px "Schibsted Grotesk", -apple-system, system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('Blu-ray', 26, bh / 2 + 1);
  // kilau halus di bagian atas sampul (cetakan glossy)
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.fillRect(0, bh, w, h * 0.3);
}

/** Spine: pita biru Blu-ray di atas, judul tegak lurus ke bawah. */
function drawSpine(c: HTMLCanvasElement, node: GraphNode) {
  const w = c.width;
  const h = c.height;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b2a5e';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#0a4ea3';
  g.fillRect(0, 0, w, 150);
  g.save();
  g.translate(w / 2, 20);
  g.rotate(Math.PI / 2);
  g.fillStyle = '#ffffff';
  g.font = '800 40px "Schibsted Grotesk", -apple-system, system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('Blu-ray', 0, 0);
  g.restore();
  g.save();
  g.translate(w / 2, 180);
  g.rotate(Math.PI / 2);
  g.fillStyle = '#f4f4f2';
  g.font = '600 46px "Schibsted Grotesk", -apple-system, system-ui, sans-serif';
  g.textBaseline = 'middle';
  let t = node.title;
  while (g.measureText(t).width > h - 220 && t.length > 4) t = t.slice(0, -2);
  g.fillText(t === node.title ? t : `${t}…`, 0, 0);
  g.restore();
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  r.addColorStop(0, 'rgba(0,0,0,0.55)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function posterSrc(node: GraphNode, jellyfinUrl?: string): string | null {
  if (node.poster) return `https://image.tmdb.org/t/p/w500${node.poster}`;
  if (node.jellyfinId && jellyfinUrl) return posterUrl(node.jellyfinId, jellyfinUrl, 500);
  return null;
}

interface ConnectionGraphProps {
  data: GraphData;
  jellyfinUrl?: string;
  serverId?: string;
  /** path di dalam portal, mis. portalPath('/movie/62') */
  portalPath?: (p?: string) => string;
}

export function ConnectionGraph({ data, jellyfinUrl, serverId, portalPath }: ConnectionGraphProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const selectRef = useRef<(i: number) => void>(() => {});

  const { t, rel, reason } = useLang();
  // node pertama = film yang dibuka; sisanya sudah diurutkan dari referensi paling kuat
  const nodes = data.nodes.slice(0, MAX_NODES);
  const shownIds = new Set(nodes.map((n) => n.id));
  const edges = data.edges.filter((e) => shownIds.has(e.to));
  const hiddenCount = data.edges.length - edges.length;
  const edgeByNode = new Map(edges.map((e) => [e.to, e]));
  const typesPresent = REL_ORDER.filter((k) => edges.some((e) => e.relationship === k));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || nodes.length === 0) return;

    let disposed = false;
    let width = mount.clientWidth;
    let height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false); // ukuran diatur CSS (100%), bukan inline px
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    const el = renderer.domElement;
    el.style.display = 'block';
    el.style.touchAction = 'pan-y'; // geser horizontal muter, geser vertikal tetap scroll halaman

    const scene = new THREE.Scene();

    // Pantulan studio: bikin plastik & sampul glossy kelihatan nyata
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.85;

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 5, 6);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const tanHalf = Math.tan((38 / 2) * (Math.PI / 180));
    const nTargets = Math.max(nodes.length - 1, 1);
    // tata letak mengikuti bentuk panggung: lebar → cincin melebar; tinggi (HP) → cincin menegak
    const aspect0 = width / height;
    const wide = aspect0 >= 1.2;
    const rx = wide ? Math.min(3.6 + Math.min(nTargets, 8) * 0.12, aspect0 * 2.3) : 2.1;
    const rz = wide ? 2.1 : 1.4;
    const yAmp = wide ? 0.85 : 1.9;
    const fitCamera = () => {
      const aspect = width / height;
      // cukup jauh supaya cincin + case (±1.1) muat di lebar & tinggi panggung
      const zW = (rx + 1.15) / (tanHalf * aspect);
      const zH = (yAmp + 1.75) / tanHalf;
      camera.position.set(0, 1.0, Math.max(zW, zH, 7));
      camera.lookAt(0, 0.1, 0);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    };
    fitCamera();

    const world = new THREE.Group();
    scene.add(world);

    const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const textures: THREE.Texture[] = [];
    const disposables: Array<{ dispose: () => void }> = [pmrem, envTex];

    const shell = new THREE.MeshPhysicalMaterial({
      color: 0x0b3a86, roughness: 0.32, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.18,
    });
    const back = new THREE.MeshPhysicalMaterial({ color: 0x0a1a3a, roughness: 0.5, clearcoat: 0.4 });
    const shadowTex = shadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 });
    disposables.push(shell, back, shadowTex, shadowMat);

    const n = nodes.length;
    const targets = n - 1;
    const anchors: Array<{ anchor: THREE.Group; angle: number; scale: number; target: number }> = [];
    const hitMeshes: THREE.Object3D[] = [];

    nodes.forEach((node, i) => {
      // ── case: shell biru + sampul inset + spine + punggung
      const grp = new THREE.Group();

      const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.04), shell);
      body.userData.nodeIndex = i;
      grp.add(body);
      disposables.push(body.geometry);

      const coverCanvas = document.createElement('canvas');
      coverCanvas.width = 512;
      coverCanvas.height = 724;
      drawCover(coverCanvas, node);
      const coverTex = new THREE.CanvasTexture(coverCanvas);
      coverTex.colorSpace = THREE.SRGBColorSpace;
      coverTex.anisotropy = maxAniso;
      textures.push(coverTex);
      const coverMat = new THREE.MeshPhysicalMaterial({ map: coverTex, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.12 });
      const cover = new THREE.Mesh(new THREE.PlaneGeometry(W - INSET * 2, H - INSET * 2), coverMat);
      cover.position.z = D / 2 + 0.002;
      cover.userData.nodeIndex = i;
      grp.add(cover);
      disposables.push(cover.geometry, coverMat);

      const spineCanvas = document.createElement('canvas');
      spineCanvas.width = 104;
      spineCanvas.height = 1100;
      drawSpine(spineCanvas, node);
      const spineTex = new THREE.CanvasTexture(spineCanvas);
      spineTex.colorSpace = THREE.SRGBColorSpace;
      spineTex.anisotropy = maxAniso;
      textures.push(spineTex);
      const spineMat = new THREE.MeshPhysicalMaterial({ map: spineTex, roughness: 0.4, clearcoat: 0.6 });
      const spine = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.04, H - INSET * 2), spineMat);
      spine.rotation.y = -Math.PI / 2;
      spine.position.x = -W / 2 - 0.002;
      grp.add(spine);
      disposables.push(spine.geometry, spineMat);

      const backPlane = new THREE.Mesh(new THREE.PlaneGeometry(W - INSET * 2, H - INSET * 2), back);
      backPlane.rotation.y = Math.PI;
      backPlane.position.z = -D / 2 - 0.002;
      grp.add(backPlane);
      disposables.push(backPlane.geometry);

      hitMeshes.push(body, cover);

      // poster asli (TMDB / Jellyfin) → gambar ulang sampul begitu ke-load
      const src = posterSrc(node, jellyfinUrl);
      if (src) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (disposed) return;
          drawCover(coverCanvas, node, img);
          coverTex.needsUpdate = true;
        };
        img.src = src; // gagal load → tetap pakai sampul warna + judul
      }

      // ── penempatan: sumber di tengah, sisanya di cincin miring
      const anchor = new THREE.Group();
      const base = node.isSource ? 1.18 : 0.96;
      let angle = 0;
      if (node.isSource) {
        anchor.position.set(0, 0, 0);
      } else {
        const k = i - 1;
        angle = Math.PI / 2 + (k / Math.max(targets, 1)) * Math.PI * 2 + 0.35;
        anchor.position.set(Math.cos(angle) * rx, -Math.sin(angle) * yAmp + 0.15, Math.sin(angle) * rz);

        // tali: busur dari sumber ke target, warna = jenis hubungan
        const rel = edgeByNode.get(node.id)?.relationship ?? '';
        const mid = anchor.position.clone().multiplyScalar(0.5);
        mid.y += 1.0;
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), mid, anchor.position.clone());
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 48, 0.014, 6, false),
          new THREE.MeshBasicMaterial({ color: REL_COLOR[rel] ?? '#888888' })
        );
        disposables.push(tube.geometry, tube.material as THREE.Material);
        world.add(tube);
      }
      anchor.add(grp);
      anchor.userData.phase = i * 1.3;
      anchor.scale.setScalar(base);

      // bayangan kontak di bawah case
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), shadowMat);
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = -H / 2 - 0.55;
      sh.userData.shadow = true;
      anchor.add(sh);
      disposables.push(sh.geometry);

      world.add(anchor);
      anchors.push({ anchor, angle, scale: base, target: base });
    });

    // ── seleksi: bawa case ke depan & besarkan
    let selectedIdx = 0;
    let rotTarget: number | null = null;
    let autorotate = true;
    const apply = (i: number) => {
      selectedIdx = i;
      anchors.forEach((a, idx) => {
        const base = idx === 0 ? 1.18 : 0.96;
        a.target = idx === i ? base * 1.28 : base;
      });
      if (i > 0) {
        autorotate = false;
        // posisi sudut a di cincin → bawa ke depan (z maksimum)
        let t = anchors[i].angle - Math.PI / 2;
        const cur = world.rotation.y;
        const TWO = Math.PI * 2;
        t += Math.round((cur - t) / TWO) * TWO;
        rotTarget = t;
      } else {
        rotTarget = null;
      }
      setSelected(i);
    };
    selectRef.current = apply;

    // ── interaksi
    let dragging = false;
    let lastX = 0;
    let moved = 0;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      ndc.x = ((cx - r.left) / r.width) * 2 - 1;
      ndc.y = -((cy - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(hitMeshes, false)[0];
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      rotTarget = null;
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved += Math.abs(dx);
        world.rotation.y += dx * 0.006;
        el.style.cursor = 'grabbing';
        return;
      }
      if (e.target === el) el.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : 'grab';
    };
    const onUp = (e: PointerEvent) => {
      if (dragging && moved < 6) {
        const hit = pick(e.clientX, e.clientY);
        if (hit) apply(hit.object.userData.nodeIndex);
      }
      dragging = false;
      el.style.cursor = 'grab';
    };
    const onCancel = () => {
      dragging = false;
    };
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);

    // ── loop
    let last = performance.now();
    const t0 = last;
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      const t = (now - t0) / 1000;

      if (!dragging) {
        if (rotTarget !== null) {
          const d = rotTarget - world.rotation.y;
          if (Math.abs(d) < 0.002) rotTarget = null;
          else world.rotation.y += d * Math.min(0.09 * dt, 1);
        } else if (autorotate) {
          world.rotation.y += 0.0014 * dt;
        }
      }

      anchors.forEach((a, idx) => {
        a.scale += (a.target - a.scale) * Math.min(0.12 * dt, 1);
        a.anchor.scale.setScalar(a.scale);
        // case tetap menghadap ke depan (sebagian) walau cincin berputar
        a.anchor.rotation.y = idx === 0 ? 0 : -world.rotation.y * 0.82;
        const g = a.anchor.children[0];
        const ph = a.anchor.userData.phase || 0;
        g.position.y = Math.sin(t * 0.8 + ph) * 0.07;
        g.rotation.z = Math.sin(t * 0.5 + ph) * 0.025;
      });

      renderer.render(scene, camera);
    });

    const ro = new ResizeObserver(() => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      fitCamera();
    });
    ro.observe(mount);

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      textures.forEach((x) => x.dispose());
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, jellyfinUrl]);

  if (nodes.length === 0) return null;

  const node = nodes[Math.min(selected, nodes.length - 1)];
  const edge = edgeByNode.get(node.id);
  const hasOwnMap = !node.isSource && (node.refCount ?? 0) > 0;

  return (
    <div className="ref-stage">
      <div className="ref-stage-view">
        <div ref={mountRef} className="ref-stage-canvas" />

        <ul className="ref-legend" aria-label={t('stage.legend')}>
          {typesPresent.map((k) => (
            <li key={k}>
              <span className="ref-mark" style={{ '--c': REL_COLOR[k] } as React.CSSProperties} />
              {rel(k)}
            </li>
          ))}
        </ul>
        <p className="ref-stage-hint">
          {t('stage.hint')}
          {hiddenCount > 0 && <> {t('detail.more', { n: hiddenCount })}</>}
        </p>
      </div>

      <div className="ref-panel" aria-live="polite">
        {edge && (
          <p className="ref-panel-rel">
            <span className="ref-mark" style={{ '--c': REL_VAR[edge.relationship] } as React.CSSProperties} />
            {rel(edge.relationship, edge.direction)}
          </p>
        )}
        <h3>
          {node.title}
          {node.year ? <small>{node.year}</small> : null}
        </h3>
        <p>{edge ? reason(edge) : t('stage.default')}</p>
        <div className="ref-panel-actions">
          {node.jellyfinId && jellyfinUrl && (
            <a className="ref-btn" href={watchUrl(node.jellyfinId, jellyfinUrl, serverId)} target="_blank" rel="noopener">
              {t('detail.watch')}
            </a>
          )}
          {hasOwnMap && portalPath && (
            <a className="ref-panel-link" href={portalPath(`/${node.mediaType}/${node.tmdbId}`) || '/'}>
              {t('stage.openMap')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
