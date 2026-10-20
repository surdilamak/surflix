/**
 * ConnectionGraph — peta referensi film (case Blu-ray 3D, three.js)
 *
 * Port dari surflix-reference-graph-prototype.jsx. Data masuk via props
 * (nodes + edges dari GET /api/connections), klik node -> detail + deep-link Jellyfin.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { watchUrl } from '@/lib/jellyfin';

export interface GraphNode {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  year?: number | null;
  poster?: string | null;
  jellyfinId?: string | null;
  isSource: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  relationship: string;
  reason: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const REL: Record<string, { label: string; color: string }> = {
  homage: { label: 'homage', color: '#7F77DD' },
  inspired: { label: 'inspired by', color: '#1D9E75' },
  visual: { label: 'visual ref', color: '#BA7517' },
};

// Warna aksen placeholder (sebelum poster ke-load), stabil per judul
function accentFor(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return `hsl(${h}, 45%, 24%)`;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      line = words[i];
      y += lh;
      lines++;
      if (lines >= maxLines - 1) {
        let rest = words.slice(i).join(' ');
        while (g.measureText(rest + '…').width > maxW && rest.length) rest = rest.slice(0, -1);
        g.fillText(rest + '…', x, y);
        return;
      }
    } else line = test;
  }
  g.fillText(line, x, y);
}

// Gambar tekstur case Blu-ray di canvas 2D. poster opsional (kalau udah ke-load).
function drawCase(c: HTMLCanvasElement, node: GraphNode, poster?: HTMLImageElement) {
  const W = c.width;
  const H = c.height;
  const g = c.getContext('2d')!;

  g.fillStyle = '#121212';
  g.fillRect(0, 0, W, H);

  g.fillStyle = '#185FA5';
  g.fillRect(0, 0, W, 34);
  g.fillStyle = '#E6F1FB';
  g.font = '500 15px -apple-system, system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('Blu-ray', 14, 18);

  const px = 16, py = 46, pw = W - 32, ph = 206;
  g.save();
  roundRect(g, px, py, pw, ph, 10);
  g.clip();
  if (poster) {
    // cover-fit poster ke blok
    const scale = Math.max(pw / poster.width, ph / poster.height);
    const dw = poster.width * scale;
    const dh = poster.height * scale;
    g.drawImage(poster, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
  } else {
    g.fillStyle = accentFor(node.title);
    g.fillRect(px, py, pw, ph);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(px, py, pw, ph * 0.42);
  }
  g.restore();

  // Play badge
  const cx = W / 2, cy = py + ph / 2;
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.beginPath();
  g.moveTo(cx - 9, cy - 14); g.lineTo(cx - 9, cy + 14); g.lineTo(cx + 16, cy); g.closePath();
  g.fill();

  g.fillStyle = '#F2F2F2';
  g.font = '500 17px -apple-system, system-ui, sans-serif';
  wrapText(g, node.title, 16, 278, W - 32, 20, 2);
  if (node.year) {
    g.fillStyle = '#8A8A8A';
    g.font = '400 14px -apple-system, system-ui, sans-serif';
    g.fillText(String(node.year), 16, 322);
  }
}

interface ConnectionGraphProps {
  data: GraphData;
  jellyfinUrl?: string;
  /** Tailwind tinggi container, default 480px (cocok buat modal); portal pakai yang lebih tinggi */
  heightClass?: string;
}

// Poster TMDB kalau ada, kalau nggak ambil dari Jellyfin (gambar Primary item)
function posterSrc(node: GraphNode, jellyfinUrl?: string): string | null {
  if (node.poster) return `https://image.tmdb.org/t/p/w342${node.poster}`;
  if (node.jellyfinId && jellyfinUrl) {
    return `${jellyfinUrl.replace(/\/+$/, '')}/Items/${node.jellyfinId}/Images/Primary?maxWidth=342`;
  }
  return null;
}

export function ConnectionGraph({ data, jellyfinUrl, heightClass = 'h-[480px]' }: ConnectionGraphProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);

  const { nodes, edges } = data;
  // Source selalu di index 0 (lihat getApprovedConnections)
  const relByNode = new Map(edges.map((e) => [e.to, e]));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || nodes.length === 0) return;

    let disposed = false;
    let width = mount.clientWidth;
    let height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 8.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x0a0a0a, 1);
    mount.appendChild(renderer.domElement);
    const el = renderer.domElement;
    el.style.touchAction = 'none'; // biar drag-rotate gak nge-scroll modal

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(3, 5, 6);
    scene.add(dir);

    const world = new THREE.Group();
    scene.add(world);

    const meshes: THREE.Mesh[] = [];
    const textures: THREE.CanvasTexture[] = [];
    const disposables: Array<{ dispose: () => void }> = [];
    const R = 3.5;
    const targetCount = nodes.length - 1;

    nodes.forEach((node, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 336;
      drawCase(canvas, node);
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 4;
      textures.push(tex);

      // Poster asli (TMDB / Jellyfin), redraw begitu ke-load
      const src = posterSrc(node, jellyfinUrl);
      if (src) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (disposed) return;
          drawCase(canvas, node, img);
          tex.needsUpdate = true;
        };
        // gagal load (mis. CORS) -> tetap pakai placeholder warna
        img.src = src;
      }

      const scl = node.isSource ? 1.28 : 0.98;
      const geo = new THREE.BoxGeometry(1.5 * scl, 2.1 * scl, 0.16 * scl);
      const side = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0 });
      const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0 });
      const mesh = new THREE.Mesh(geo, [side, side, side, side, face, side]);
      mesh.userData.nodeIndex = i;
      disposables.push(geo, side, face);

      const anchor = new THREE.Group();
      if (node.isSource) {
        anchor.position.set(0, 0, 0);
      } else {
        const k = i - 1;
        const a = (k / Math.max(targetCount, 1)) * Math.PI * 2 + 0.4;
        anchor.position.set(Math.cos(a) * R, k % 2 ? 0.7 : -0.7, Math.sin(a) * R * 0.72);

        const rel = relByNode.get(node.id);
        const col = new THREE.Color(REL[rel?.relationship ?? '']?.color ?? '#888888');
        const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), anchor.position.clone()]);
        const lm = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55 });
        disposables.push(lg, lm);
        world.add(new THREE.Line(lg, lm));
      }
      anchor.add(mesh);
      anchor.userData.phase = i * 1.3;
      world.add(anchor);
      meshes.push(mesh);
    });

    // ── Interaksi ──
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let moved = 0;
    const velY = 0.0016;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      world.rotation.y += dx * 0.006;
      world.rotation.x = Math.max(-0.55, Math.min(0.55, world.rotation.x + dy * 0.005));
    };
    const onUp = (e: PointerEvent) => {
      if (dragging && moved < 6) {
        const r = el.getBoundingClientRect();
        ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(meshes, false)[0];
        if (hit) setSelected(hit.object.userData.nodeIndex);
      }
      dragging = false;
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // ── Loop ──
    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (!dragging) world.rotation.y += velY;
      world.children.forEach((ch) => {
        if (ch.type === 'Group') {
          const ph = ch.userData.phase || 0;
          const m = ch.children[0];
          if (m) {
            m.position.y = Math.sin(t * 0.8 + ph) * 0.1;
            m.rotation.z = Math.sin(t * 0.5 + ph) * 0.04;
          }
        }
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const ro = new ResizeObserver(() => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      textures.forEach((t) => t.dispose());
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, jellyfinUrl]);

  if (nodes.length === 0) return null;

  const node = nodes[Math.min(selected, nodes.length - 1)];
  const edge = relByNode.get(node.id);
  const rel = edge ? REL[edge.relationship] : null;

  return (
    <div className={`relative ${heightClass} w-full select-none overflow-hidden rounded-ios-lg bg-neutral-950`}>
      <div ref={mountRef} className="absolute inset-0" />

      <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5 rounded-xl bg-black/40 px-2.5 py-2 text-[10px] text-neutral-300 backdrop-blur">
        {Object.values(REL).map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
            {r.label}
          </div>
        ))}
      </div>

      <div className="absolute right-2.5 top-2.5 rounded-xl bg-black/40 px-2.5 py-2 text-[10px] text-neutral-400 backdrop-blur">
        tarik buat muter · ketuk case
      </div>

      <div className="absolute inset-x-2.5 bottom-2.5 rounded-2xl border border-white/10 bg-black/65 px-3.5 py-3 backdrop-blur-md">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-sm font-medium leading-tight text-white">{node.title}</h3>
          {node.year && <span className="text-xs text-neutral-400">{node.year}</span>}
          {rel && (
            <span
              className="ml-auto flex-shrink-0 rounded-full px-2 py-0.5 text-[10px]"
              style={{ background: rel.color + '33', color: rel.color }}
            >
              {rel.label}
            </span>
          )}
        </div>
        <p className="mb-2.5 text-xs leading-snug text-neutral-300">
          {edge ? edge.reason : 'Film yang lagi lo buka — pusat dari web referensi.'}
        </p>
        {node.jellyfinId && (
          <a
            href={watchUrl(node.jellyfinId, jellyfinUrl)}
            target="_blank"
            rel="noopener"
            className="block w-full rounded-xl bg-surflix-500 py-2.5 text-center text-[13px] font-medium text-white transition active:scale-[0.98]"
          >
            ▶ Tonton di Surflix
          </a>
        )}
      </div>
    </div>
  );
}
