import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

// ── DEMO DATA (nanti diganti data dari DB: hanya film yang ada di library) ──
const REL = {
  homage: { label: "homage", color: "#7F77DD" },
  inspired: { label: "inspired by", color: "#1D9E75" },
  visual: { label: "visual ref", color: "#BA7517" },
};

const FILMS = [
  { title: "Everything Everywhere All at Once", year: 2022, accent: "#D4537E", central: true,
    rel: null, reason: "Film yang lagi lo buka — pusat dari web referensi." },
  { title: "2001: A Space Odyssey", year: 1968, accent: "#1f3a5f",
    rel: "visual", reason: "Gerbang psychedelic & lompatan evolusi manusia." },
  { title: "The Matrix", year: 1999, accent: "#14532d",
    rel: "inspired", reason: "Realita berlapis & logika dunia yang bisa dibengkokin." },
  { title: "In the Mood for Love", year: 2000, accent: "#7a1f2b",
    rel: "visual", reason: "Palet merah-hijau & framing ala Wong Kar-wai." },
  { title: "Ratatouille", year: 2007, accent: "#a85a1f",
    rel: "homage", reason: "Homage eksplisit lewat adegan si tikus koki." },
  { title: "Requiem for a Dream", year: 2000, accent: "#0f3d3a",
    rel: "inspired", reason: "Montase cepat yang nyetir ritme multiverse-nya." },
];

// ── Gambar tekstur case Blu-ray di canvas 2D ──
function makeCaseTexture(film) {
  const W = 240, H = 336;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");

  g.fillStyle = "#121212";
  g.fillRect(0, 0, W, H);

  // Banner Blu-ray
  g.fillStyle = "#185FA5";
  g.fillRect(0, 0, W, 34);
  g.fillStyle = "#E6F1FB";
  g.font = "500 15px -apple-system, system-ui, sans-serif";
  g.textBaseline = "middle";
  g.fillText("Blu-ray", 14, 18);

  // Poster block
  const px = 16, py = 46, pw = W - 32, ph = 206;
  g.fillStyle = film.accent;
  roundRect(g, px, py, pw, ph, 10); g.fill();
  // kilau tipis
  g.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(g, px, py, pw, ph * 0.42, 10); g.fill();

  // Play badge
  const cx = W / 2, cy = py + ph / 2;
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.beginPath();
  g.moveTo(cx - 9, cy - 14); g.lineTo(cx - 9, cy + 14); g.lineTo(cx + 16, cy); g.closePath();
  g.fill();

  // Judul (wrap 2 baris) + tahun
  g.fillStyle = "#F2F2F2";
  g.font = "500 17px -apple-system, system-ui, sans-serif";
  wrapText(g, film.title, 16, 278, W - 32, 20, 2);
  g.fillStyle = "#8A8A8A";
  g.font = "400 14px -apple-system, system-ui, sans-serif";
  g.fillText(String(film.year), 16, 322);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function wrapText(g, text, x, y, maxW, lh, maxLines) {
  const words = text.split(" ");
  let line = "", lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y); line = words[i]; y += lh; lines++;
      if (lines >= maxLines - 1) {
        let rest = words.slice(i).join(" ");
        while (g.measureText(rest + "…").width > maxW && rest.length) rest = rest.slice(0, -1);
        g.fillText(rest + "…", x, y); return;
      }
    } else line = test;
  }
  g.fillText(line, x, y);
}

export default function SurflixReferenceGraph() {
  const mountRef = useRef(null);
  const [selected, setSelected] = useState(0);
  const [note, setNote] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    let width = mount.clientWidth, height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 8.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x0a0a0a, 1);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(3, 5, 6); scene.add(dir);

    const world = new THREE.Group();
    scene.add(world);

    const meshes = [];
    const textures = [];
    const R = 3.5;

    FILMS.forEach((film, i) => {
      const tex = makeCaseTexture(film); textures.push(tex);
      const scl = film.central ? 1.28 : 0.98;
      const geo = new THREE.BoxGeometry(1.5 * scl, 2.1 * scl, 0.16 * scl);
      const side = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0 });
      const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0 });
      const mats = [side, side, side, side, face, side];
      const mesh = new THREE.Mesh(geo, mats);
      mesh.userData.filmIndex = i;

      const anchor = new THREE.Group();
      if (film.central) {
        anchor.position.set(0, 0, 0);
      } else {
        const k = i - 1, n = FILMS.length - 1;
        const a = (k / n) * Math.PI * 2 + 0.4;
        anchor.position.set(Math.cos(a) * R, (k % 2 ? 0.7 : -0.7), Math.sin(a) * R * 0.72);
        // garis referensi dari pusat ke anchor
        const col = new THREE.Color(REL[film.rel].color);
        const lg = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0), anchor.position.clone(),
        ]);
        world.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55 })));
      }
      anchor.add(mesh);
      anchor.userData.phase = i * 1.3;
      world.add(anchor);
      meshes.push(mesh);
    });

    // ── Interaksi ──
    let dragging = false, lastX = 0, lastY = 0, moved = 0;
    let velY = 0.0016;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const onDown = (e) => { dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      world.rotation.y += dx * 0.006;
      world.rotation.x = Math.max(-0.55, Math.min(0.55, world.rotation.x + dy * 0.005));
    };
    const onUp = (e) => {
      if (dragging && moved < 6) {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(meshes, false)[0];
        if (hit) setSelected(hit.object.userData.filmIndex);
      }
      dragging = false;
    };
    const el = renderer.domElement;
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // ── Loop ──
    let raf, t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (!dragging) world.rotation.y += velY;
      world.children.forEach((ch) => {
        if (ch.type === "Group") {
          const ph = ch.userData.phase || 0;
          const m = ch.children[0];
          if (m) { m.position.y = Math.sin(t * 0.8 + ph) * 0.1; m.rotation.z = Math.sin(t * 0.5 + ph) * 0.04; }
        }
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const ro = new ResizeObserver(() => {
      width = mount.clientWidth; height = mount.clientHeight;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  const f = FILMS[selected];
  const rel = f.rel ? REL[f.rel] : null;

  return (
    <div className="relative w-full h-[560px] rounded-2xl overflow-hidden bg-neutral-950 select-none">
      <div ref={mountRef} className="absolute inset-0" />

      {/* Legend */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 text-[11px] text-neutral-300 bg-black/40 backdrop-blur px-3 py-2 rounded-xl">
        {Object.values(REL).map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
            {r.label}
          </div>
        ))}
      </div>

      {/* Hint */}
      <div className="absolute top-3 right-3 text-[11px] text-neutral-400 bg-black/40 backdrop-blur px-3 py-2 rounded-xl">
        tarik buat muter · ketuk case buat detail
      </div>

      {/* Panel detail */}
      <div className="absolute left-3 right-3 bottom-3 bg-black/65 backdrop-blur-md rounded-2xl px-4 py-3.5 border border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[15px] font-medium text-white leading-tight">{f.title}</h3>
          <span className="text-[13px] text-neutral-400">{f.year}</span>
          {rel && (
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: rel.color + "33", color: rel.color }}>{rel.label}</span>
          )}
        </div>
        <p className="text-[13px] text-neutral-300 leading-snug mb-3">{f.reason}</p>
        <button
          onClick={() => { setNote(true); setTimeout(() => setNote(false), 2600); }}
          className="w-full py-2.5 rounded-xl text-[14px] font-medium text-white active:scale-[0.98] transition"
          style={{ background: "#E63946" }}>
          ▶ Tonton di Surflix
        </button>
        {note && (
          <p className="text-[11px] text-neutral-400 text-center mt-2">
            demo — nanti buka streaming.surflix.my.id lewat deep-link Jellyfin
          </p>
        )}
      </div>
    </div>
  );
}
