/**
 * ConnectionGraph — reference map for one film: 3D disc cases on a dark plane.
 *
 * The opened film sits in the center; the connected films float on a tilted ring around
 * it, linked by cords colored by relation type. Tap a case:
 * the ring rotates to bring it to the front, it grows, and a panel explains why it connects.
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
import { WatchLaterButton } from './watch-later-button';
import { WatchButton } from './watch-link';
import { useViewer } from './viewer-provider';

export interface GraphNode {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  year?: number | null;
  poster?: string | null;
  jellyfinId?: string | null;
  isSource: boolean;
  /** number of connections for this film (0 = no map yet) */
  refCount?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  relationship: string;
  direction: 'out' | 'in';
  reason: string;
  reasonEn?: string | null;
  /** One-paragraph explanation, when one has been written. */
  storyEn?: string | null;
  story?: string | null;
  kind?: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// The 3D graph only fits a dozen or so cases; the rest are in the list below it.
const MAX_NODES = 14;

// Case size (scene units): ratio similar to a real disc case
const W = 1.5;
const H = 2.1;
const D = 0.22;
const INSET = 0.07; // plastic frame visible around the cover

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

/** Cover: poster (cover-fit) fills the case face. Without a poster: color + title. */
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

  // subtle gloss on the upper part of the cover (glossy print)
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.fillRect(0, 0, w, h * 0.3);
}

/** Orange check badge in the top-right corner of a cover: "you have watched this". */
function drawWatchedBadge(c: HTMLCanvasElement) {
  const g = c.getContext('2d')!;
  const cx = c.width - 70;
  const cy = 70;
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath();
  g.arc(cx, cy + 4, 50, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ff5200';
  g.beginPath();
  g.arc(cx, cy, 46, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#0d0d0f';
  g.lineWidth = 11;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(cx - 20, cy + 2);
  g.lineTo(cx - 5, cy + 17);
  g.lineTo(cx + 22, cy - 15);
  g.stroke();
  g.restore();
}

/** Spine: case blue, title running vertically from the top, year at the bottom. */
function drawSpine(c: HTMLCanvasElement, node: GraphNode) {
  const w = c.width;
  const h = c.height;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b2a5e';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#f4f4f2';
  g.textBaseline = 'middle';
  g.font = '600 46px "Schibsted Grotesk", -apple-system, system-ui, sans-serif';
  const yearW = node.year ? 150 : 0;
  g.save();
  g.translate(w / 2, 40);
  g.rotate(Math.PI / 2);
  let t = node.title;
  while (g.measureText(t).width > h - 80 - yearW && t.length > 4) t = t.slice(0, -2);
  g.fillText(t === node.title ? t : `${t}…`, 0, 0);
  g.restore();
  if (node.year) {
    g.save();
    g.translate(w / 2, h - 40 - 50);
    g.rotate(Math.PI / 2);
    g.fillStyle = 'rgba(244,244,242,0.7)';
    g.font = '500 38px "Schibsted Grotesk", -apple-system, system-ui, sans-serif';
    g.fillText(String(node.year), 0, 0);
    g.restore();
  }
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
  /** path inside the portal, e.g. portalPath('/movie/62') */
  portalPath?: (p?: string) => string;
}

export function ConnectionGraph({ data, jellyfinUrl, serverId, portalPath }: ConnectionGraphProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const selectRef = useRef<(i: number) => void>(() => {});
  // zoom controls (buttons) talk to the camera inside the effect through this handle
  const zoomApi = useRef<{ by: (f: number) => void; reset: () => void }>({ by: () => {}, reset: () => {} });
  const [zoomPct, setZoomPct] = useState(100);

  const { t, rel, reason, story } = useLang();
  const viewer = useViewer();
  // case indexes the viewer has watched, and per-case repaint functions (the badge is painted into the cover texture)
  const watchedIdx = useRef<Set<number>>(new Set());
  const coverRefresh = useRef<Array<() => void>>([]);
  // first node = the opened film; the rest are already sorted from strongest reference
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
    renderer.setSize(width, height, false); // size is set by CSS (100%), not inline px
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    const el = renderer.domElement;
    el.style.display = 'block';
    el.style.touchAction = 'pan-y'; // horizontal swipe rotates, vertical swipe still scrolls the page

    const scene = new THREE.Scene();

    // Studio reflections: make the plastic & glossy cover look real
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
    /**
     * The caption panel floats over the right side of the stage. The ring is centered, so if
     * left alone it would be buried under the panel. The panel footprint is computed here and used twice:
     * to choose the camera distance, and to shift the camera so the ring is centered in the area
     * that is actually visible. Zero on phones, because there the panel is static below.
     */
    const panelInset = () => {
      const el = panelRef.current;
      if (!el || getComputedStyle(el).position !== 'absolute') return 0;
      return el.offsetWidth + 40;
    };
    // layout follows the stage shape: wide → ring widens; tall (phone) → ring goes upright
    const aspect0 = Math.max(0.5, (width - panelInset()) / height);
    const wide = aspect0 >= 1.2;
    const rx = wide ? Math.min(3.6 + Math.min(nTargets, 8) * 0.12, aspect0 * 2.3) : 2.1;
    const rz = wide ? 2.1 : 1.4;
    const yAmp = wide ? 0.85 : 1.9;
    // 1 = the whole ring fits; larger = camera moves closer
    const ZOOM_MIN = 0.6;
    const ZOOM_MAX = 3.2;
    let zoom = 1;
    let zoomTarget = 1;
    const fitCamera = () => {
      const inset = panelInset();
      const camAspect = width / height;
      const usable = Math.max(0.5, (width - inset) / height);
      // far enough that the ring + cases (±1.1) fit in the USABLE WIDTH & stage height
      const zW = (rx + 1.15) / (tanHalf * usable);
      const zH = (yAmp + 1.75) / tanHalf;
      const z = Math.max(zW, zH, 7) / zoom;
      // shift the camera right by half the panel footprint, so the ring moves left on screen
      const worldPerPx = (2 * z * tanHalf * camAspect) / width;
      const dx = (inset / 2) * worldPerPx;
      camera.position.set(dx, 1.0, z);
      camera.lookAt(dx, 0.1, 0);
      camera.aspect = camAspect;
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
        const shadowTex = shadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 });
    disposables.push(shell, shadowTex, shadowMat);

    const n = nodes.length;
    const targets = n - 1;
    // lift/liftTarget = case rises slightly when highlighted, so it's clear it can be clicked
    const anchors: Array<{ anchor: THREE.Group; angle: number; scale: number; target: number; lift: number; liftTarget: number }> = [];
    const hitMeshes: THREE.Object3D[] = [];

    coverRefresh.current = [];
    nodes.forEach((node, i) => {
      // ── case: blue shell + inset cover + spine + back
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
      // redraw the whole cover: poster (once loaded) + the "watched" badge when the viewer has seen it
      let loadedPoster: HTMLImageElement | undefined;
      const paint = () => {
        drawCover(coverCanvas, node, loadedPoster);
        if (watchedIdx.current.has(i)) drawWatchedBadge(coverCanvas);
        coverTex.needsUpdate = true;
      };
      coverRefresh.current[i] = paint;
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

      // the back uses the same cover (one material, one texture)
      const backPlane = new THREE.Mesh(new THREE.PlaneGeometry(W - INSET * 2, H - INSET * 2), coverMat);
      backPlane.rotation.y = Math.PI;
      backPlane.position.z = -D / 2 - 0.002;
      grp.add(backPlane);
      disposables.push(backPlane.geometry);

      hitMeshes.push(body, cover);

      // real poster (TMDB / Jellyfin) → redraw the cover once it loads
      const src = posterSrc(node, jellyfinUrl);
      if (src) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (disposed) return;
          loadedPoster = img;
          paint();
        };
        img.src = src; // load failed → keep the color + title cover
      }

      // ── placement: source in the center, the rest on a tilted ring
      const anchor = new THREE.Group();
      const base = node.isSource ? 1.18 : 0.96;
      let angle = 0;
      if (node.isSource) {
        anchor.position.set(0, 0, 0);
      } else {
        const k = i - 1;
        angle = Math.PI / 2 + (k / Math.max(targets, 1)) * Math.PI * 2 + 0.35;
        anchor.position.set(Math.cos(angle) * rx, -Math.sin(angle) * yAmp + 0.15, Math.sin(angle) * rz);

        // cord: arc from source to target, color = relation type
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

      // contact shadow under the case
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), shadowMat);
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = -H / 2 - 0.55;
      sh.userData.shadow = true;
      anchor.add(sh);
      disposables.push(sh.geometry);

      world.add(anchor);
      anchors.push({ anchor, angle, scale: base, target: base, lift: 0, liftTarget: 0 });
    });

    // ── selection: bring the case to the front & enlarge it
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
        // angular position a on the ring → bring to the front (max z)
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

    // ── interaction
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

    // two fingers = pinch to zoom (one finger still rotates)
    const touches = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    zoomApi.current = {
      by: (f) => {
        zoomTarget = clampZoom(zoomTarget * f);
      },
      reset: () => {
        zoomTarget = 1;
      },
    };

    const onDown = (e: PointerEvent) => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        dragging = false;
        moved = 99; // not a tap
        return;
      }
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      rotTarget = null;
    };
    const onMove = (e: PointerEvent) => {
      const t = touches.get(e.pointerId);
      if (t) {
        t.x = e.clientX;
        t.y = e.clientY;
      }
      if (touches.size >= 2) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) zoomTarget = zoom = clampZoom(zoom * (d / pinchDist));
        pinchDist = d;
        fitCamera();
        return;
      }
      if (dragging) {
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved += Math.abs(dx);
        world.rotation.y += dx * 0.006;
        el.style.cursor = 'grabbing';
        return;
      }
      if (e.target !== el) return;
      const over = pick(e.clientX, e.clientY);
      el.style.cursor = over ? 'pointer' : 'grab';
      const hot = over ? (over.object.userData.nodeIndex as number) : -1;
      anchors.forEach((a, i) => {
        a.liftTarget = i === hot ? 0.22 : 0;
      });
    };
    const onWheel = (e: WheelEvent) => {
      // Ctrl/⌘ + scroll (and trackpad pinch) zooms; plain scroll keeps scrolling the page
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTarget = clampZoom(zoomTarget * Math.exp(-e.deltaY * 0.0022));
    };
    const onUp = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinchDist = 0;
      if (dragging && moved < 6) {
        const hit = pick(e.clientX, e.clientY);
        if (hit) apply(hit.object.userData.nodeIndex);
      }
      dragging = false;
      el.style.cursor = 'grab';
    };
    const onCancel = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinchDist = 0;
      dragging = false;
    };
    const onLeave = () => {
      anchors.forEach((a) => {
        a.liftTarget = 0;
      });
    };
    el.style.cursor = 'grab';
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('wheel', onWheel, { passive: false });
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
        // cases keep facing front (partially) even as the ring rotates
        a.anchor.rotation.y = idx === 0 ? 0 : -world.rotation.y * 0.82;
        const g = a.anchor.children[0];
        const ph = a.anchor.userData.phase || 0;
        a.lift += (a.liftTarget - a.lift) * Math.min(0.18 * dt, 1);
        g.position.y = Math.sin(t * 0.8 + ph) * 0.07 + a.lift;
        g.rotation.z = Math.sin(t * 0.5 + ph) * 0.025;
      });

      if (Math.abs(zoomTarget - zoom) > 0.0005) {
        zoom += (zoomTarget - zoom) * Math.min(0.16 * dt, 1);
        fitCamera();
        setZoomPct(Math.round(zoom * 100));
      }

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
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('wheel', onWheel);
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

  // watched badges: repaint the covers whenever the sign-in state or the watched list changes
  useEffect(() => {
    watchedIdx.current = new Set(
      nodes.map((n, i) => (viewer.isWatched(n.mediaType, n.tmdbId) ? i : -1)).filter((i) => i >= 0)
    );
    coverRefresh.current.forEach((paint) => paint?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, data, jellyfinUrl]);

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
        <div className="ref-saga-zoom">
          <button type="button" onClick={() => zoomApi.current.by(1 / 1.35)} aria-label={t('tl.zoomOut')}>
            −
          </button>
          <span aria-hidden="true">{zoomPct}%</span>
          <button type="button" onClick={() => zoomApi.current.by(1.35)} aria-label={t('tl.zoomIn')}>
            +
          </button>
          <button type="button" onClick={() => zoomApi.current.reset()} aria-label={t('stage.fit')}>
            ⤢
          </button>
        </div>
        <p className="ref-stage-hint" style={zoomPct > 105 ? { opacity: 0 } : undefined}>
          {t('stage.hint')}
          {hiddenCount > 0 && <> {t('detail.more', { n: hiddenCount })}</>}
        </p>
      </div>

      <div className="ref-panel" ref={panelRef} aria-live="polite">
        {edge && (
          <p className="ref-panel-rel">
            <span className="ref-mark" style={{ '--c': REL_VAR[edge.relationship] } as React.CSSProperties} />
            {rel(edge.relationship, edge.direction, edge.kind)}
          </p>
        )}
        <h3>
          {node.title}
          {node.year ? <small>{node.year}</small> : null}
        </h3>
        {viewer.isWatched(node.mediaType, node.tmdbId) && (
          <p className="ref-seen-tag">
            <span aria-hidden="true">✓</span> {t('viewer.watched')}
          </p>
        )}
        <p className={edge && story(edge) ? 'ref-panel-story' : undefined}>
          {edge ? story(edge) ?? reason(edge) : t('stage.default')}
        </p>
        <div className="ref-panel-actions">
          {node.jellyfinId && jellyfinUrl && (
            <WatchButton href={watchUrl(node.jellyfinId, jellyfinUrl, serverId)}>
              {t('detail.watch')}
            </WatchButton>
          )}
          {node.jellyfinId && jellyfinUrl && <WatchLaterButton mediaType={node.mediaType} tmdbId={node.tmdbId} />}
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
