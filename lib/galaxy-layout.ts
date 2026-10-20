/**
 * Tata letak Galaxy: kelompok lewat label propagation, lalu simulasi gaya
 * (tolak-menolak antar-titik, tarik sepanjang garis, gravitasi lemah ke pusat).
 * Deterministik (PRNG ber-seed) supaya langit gak berubah tiap dimuat.
 */

export interface LayoutNode {
  degree: number;
}
export interface LayoutEdge {
  a: number;
  b: number;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Label propagation: tiap titik ikut label yang paling banyak di tetangganya. */
function communities(n: number, edges: LayoutEdge[]): number[] {
  const nb: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    nb[e.a].push(e.b);
    nb[e.b].push(e.a);
  }
  const label = Array.from({ length: n }, (_, i) => i);
  for (let iter = 0; iter < 14; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      if (!nb[i].length) continue;
      const counts = new Map<number, number>();
      for (const j of nb[i]) counts.set(label[j], (counts.get(label[j]) ?? 0) + 1);
      let best = label[i];
      let bestN = -1;
      for (const [l, c] of counts) {
        if (c > bestN || (c === bestN && l < best)) {
          best = l;
          bestN = c;
        }
      }
      if (best !== label[i]) {
        label[i] = best;
        changed = true;
      }
    }
    if (!changed) break;
  }
  // ID kelompok yang rapi: urut dari yang terbesar
  const size = new Map<number, number>();
  label.forEach((l) => size.set(l, (size.get(l) ?? 0) + 1));
  const order = [...size.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([l]) => l);
  const remap = new Map(order.map((l, i) => [l, i]));
  return label.map((l) => remap.get(l)!);
}

export function layoutGalaxy(nodes: LayoutNode[], edges: LayoutEdge[]) {
  const n = nodes.length;
  const rand = mulberry32(1337);
  const cluster = communities(n, edges);
  const clusterCount = Math.max(...cluster, 0) + 1;

  // pusat tiap kelompok di spiral sudut emas; kelompok besar lebih dekat ke pusat
  const members: number[][] = Array.from({ length: clusterCount }, () => []);
  cluster.forEach((c, i) => members[c].push(i));

  const x = new Float64Array(n);
  const y = new Float64Array(n);
  members.forEach((list, c) => {
    const r = 70 * Math.sqrt(c + 0.6) * 1.9;
    const ang = c * 2.399963;
    const cx = Math.cos(ang) * r;
    const cy = Math.sin(ang) * r;
    const spread = 10 + Math.sqrt(list.length) * 9;
    for (const i of list) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * spread;
      x[i] = cx + Math.cos(a) * d;
      y[i] = cy + Math.sin(a) * d;
    }
  });

  const K = 40; // jarak ideal
  const cutoff = 320;
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  const ITER = 380;

  for (let it = 0; it < ITER; it++) {
    const temp = 22 * (1 - it / ITER) + 0.4;
    dx.fill(0);
    dy.fill(0);

    // tolak-menolak
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ex = x[i] - x[j];
        let ey = y[i] - y[j];
        let d2 = ex * ex + ey * ey;
        if (d2 > cutoff * cutoff) continue;
        if (d2 < 0.01) {
          ex = rand() - 0.5;
          ey = rand() - 0.5;
          d2 = ex * ex + ey * ey + 0.01;
        }
        const d = Math.sqrt(d2);
        const f = (K * K) / d2; // gaya/jarak
        dx[i] += (ex / d) * f * K;
        dy[i] += (ey / d) * f * K;
        dx[j] -= (ex / d) * f * K;
        dy[j] -= (ey / d) * f * K;
      }
    }
    // tarik sepanjang garis
    for (const e of edges) {
      const ex = x[e.a] - x[e.b];
      const ey = y[e.a] - y[e.b];
      const d = Math.sqrt(ex * ex + ey * ey) || 0.01;
      const f = (d * d) / K / d;
      dx[e.a] -= ex * f * 0.9;
      dy[e.a] -= ey * f * 0.9;
      dx[e.b] += ex * f * 0.9;
      dy[e.b] += ey * f * 0.9;
    }
    // gravitasi lemah ke pusat + gerak terbatas suhu
    for (let i = 0; i < n; i++) {
      dx[i] -= x[i] * 0.012;
      dy[i] -= y[i] * 0.012;
      const m = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
      const s = Math.min(m, temp) / m;
      x[i] += dx[i] * s;
      y[i] += dy[i] * s;
    }
  }

  // titik yang terlempar jauh dipadatkan (soft clamp) supaya inti punya ruang dan semua tetap kelihatan
  const radii = Array.from({ length: n }, (_, i) => Math.hypot(x[i], y[i])).sort((a, b) => a - b);
  const R = radii[Math.floor(n * 0.93)] || 1;
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(x[i], y[i]);
    if (r > R) {
      const f = (R + (r - R) * 0.28) / r;
      x[i] *= f;
      y[i] *= f;
    }
  }

  // normalisasi ke kira-kira ±1000
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, x[i]); maxX = Math.max(maxX, x[i]);
    minY = Math.min(minY, y[i]); maxY = Math.max(maxY, y[i]);
  }
  const scale = 1900 / Math.max(maxX - minX, maxY - minY, 1);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return {
    cluster,
    pos: Array.from({ length: n }, (_, i) => [
      Math.round((x[i] - cx) * scale * 10) / 10,
      Math.round((y[i] - cy) * scale * 10) / 10,
    ]),
  };
}
