/**
 * Build the "Watch order" data -> lib/sagas.json.
 *
 * Coverage rule: every title joined by a story relation (universe / remake) belongs to a saga,
 * so no title with a real watch order is left out. Two sources, in this order:
 *
 *   1. scripts/curated/sagas.txt  — hand-written sagas (name, tip, lanes, explicit story order).
 *      Their titles are claimed first and removed from the graph, so a curated saga is never
 *      polluted by whatever else happens to be connected to it.
 *   2. scripts/connections-live.json + scripts/curated/*.txt — everything left over is clustered
 *      automatically (connected components over APPROVED universe/remake edges). Story order comes
 *      from the @prequel / @sequel markers in the curated connection files; release order from year.
 *
 * Run: node scripts/build-sagas.js   (add DATABASE_URL="file:./dev.db" for a library coverage report)
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'curated');
const out = path.join(__dirname, '..', 'lib', 'sagas.json');

const bi = (s) => {
  const [en, id] = String(s).split('||').map((x) => x.trim());
  return { en, id: id || en };
};
const parseTitle = (s) => {
  const m = s.trim().match(/^(.*) \((\d{4})\)$/);
  if (!m) throw new Error(`Bad title "${s}" (expected "Title (year)")`);
  return { title: m[1], year: Number(m[2]) };
};
const key = (title, year) => `${title.toLowerCase()}|${year}`;
const errors = [];

// ── 1. curated sagas ────────────────────────────────────────────────────────
const curated = [];
const aliases = new Map(); // key(title,year) -> saga name, buat menamai klaster otomatis
{
  let cur = null;
  fs.readFileSync(path.join(dir, 'sagas.txt'), 'utf8').split('\n').forEach((raw, n) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    try {
      if (line.startsWith('@saga ')) {
        // sisa baris disatukan lagi: teks dwibahasa memakai "||", jangan ikut terpotong
        const [slug, name, ...tip] = line.slice(6).split('|').map((x) => x.trim());
        cur = { id: slug, name, tip: bi(tip.join('|')), kind: 'curated', lanes: [], entries: [] };
        curated.push(cur);
      } else if (line.startsWith('@lane ')) {
        const parts = line.slice(6).split('|').map((x) => x.trim());
        const rest = parts.slice(1);
        const at = rest.findIndex((x) => x.startsWith('fork:'));
        const lane = { id: parts[0], label: bi((at === -1 ? rest : rest.slice(0, at)).join('|')) };
        if (at !== -1) lane.fork = parseTitle(rest[at].slice(5));
        cur.lanes.push(lane);
      } else if (line.startsWith('@alias ')) {
        const [title, name] = line.slice(7).split('|').map((x) => x.trim());
        const t = parseTitle(title);
        aliases.set(key(t.title, t.year), name);
      } else {
        const p = line.split('|').map((x) => x.trim());
        const { title, year } = parseTitle(p[0]);
        if (!cur.lanes.some((l) => l.id === p[1])) throw new Error(`Unknown lane "${p[1]}"`);
        if (!/^\d{4}(-\d{2})?$/.test(p[2] || '')) throw new Error(`Bad release "${p[2]}"`);
        const e = { title, year, lane: p[1], release: p[2] };
        if (p[3]) e.when = p[3];
        if (p.length > 4) e.note = bi(p.slice(4).join('|'));
        cur.entries.push(e);
      }
    } catch (err) {
      errors.push(`sagas.txt line ${n + 1}: ${err.message}`);
    }
  });
  for (const s of curated) {
    for (const l of s.lanes) {
      if (l.fork && !s.entries.some((e) => key(e.title, e.year) === key(l.fork.title, l.fork.year))) {
        errors.push(`${s.id}: lane ${l.id} forks from "${l.fork.title} (${l.fork.year})" which is not in the saga`);
      }
    }
  }
}
const claimed = new Set(curated.flatMap((s) => s.entries.map((e) => key(e.title, e.year))));

// ── 2. story markers from the curated connection files ──────────────────────
// "Aliens (1986) > Alien (1979) | universe | h | @sequel"  ->  Alien comes before Aliens
const marker = new Map();
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.txt') && f !== 'sagas.txt')) {
  for (const raw of fs.readFileSync(path.join(dir, file), 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('>')) continue;
    const [pair, , , reason] = line.split('|').map((x) => x.trim());
    const m = (reason || '').match(/^@(prequel|sequel)\b/);
    if (!m) continue;
    const [src, tgt] = pair.split('>').map((x) => x.trim());
    try {
      const a = parseTitle(src);
      const b = parseTitle(tgt);
      marker.set(`${key(a.title, a.year)}>${key(b.title, b.year)}`, m[1]);
    } catch {
      /* baris rusak sudah dilaporkan build-connections */
    }
  }
}

// ── 3. cluster whatever the curated sagas did not claim ─────────────────────
const live = JSON.parse(fs.readFileSync(path.join(__dirname, 'connections-live.json'), 'utf8'));
const edges = live.filter((r) => r.status === 'APPROVED' && (r.relationship === 'universe' || r.relationship === 'remake'));

const parent = new Map();
const find = (x) => {
  if (!parent.has(x)) parent.set(x, x);
  while (parent.get(x) !== x) {
    parent.set(x, parent.get(parent.get(x)));
    x = parent.get(x);
  }
  return x;
};
const union = (a, b) => parent.set(find(a), find(b));

const meta = new Map(); // key -> {title, year}
const pairs = [];
for (const r of edges) {
  const a = key(r.sourceTitle, r.sourceYear);
  const b = key(r.targetTitle, r.targetYear);
  if (claimed.has(a) || claimed.has(b)) continue; // curated menang: jangan tarik judulnya keluar
  meta.set(a, { title: r.sourceTitle, year: r.sourceYear });
  meta.set(b, { title: r.targetTitle, year: r.targetYear });
  pairs.push([a, b, r.relationship]);
  union(a, b);
}

const groups = new Map();
for (const k of meta.keys()) {
  const root = find(k);
  if (!groups.has(root)) groups.set(root, []);
  groups.get(root).push(k);
}

/** Nama klaster: rangkaian kata pembuka terpanjang yang dipakai mayoritas judul; kalau tak ada, judul tertua. */
const TRAILING = /\s+(the|a|an|of|and|part|vol\.?|chapter|episode|no|in)$/i;
const tidy = (s) => {
  let out = s.trim();
  for (let i = 0; i < 4; i++) {
    const next = out.replace(/[\s:,\-–—.]+$/, '').replace(TRAILING, '');
    if (next === out || !next) break;
    out = next;
  }
  return out;
};
function nameOf(keys) {
  for (const k of keys) if (aliases.has(k)) return aliases.get(k);
  const titles = keys.map((k) => meta.get(k).title);
  const need = Math.max(2, Math.ceil(titles.length * 0.6));
  for (const n of [8, 7, 6, 5, 4, 3, 2, 1]) {
    const tally = new Map();
    for (const t of titles) {
      const words = t.split(/\s+/);
      if (words.length < n) continue;
      const p = tidy(words.slice(0, n).join(' '));
      if (p) tally.set(p, (tally.get(p) ?? 0) + 1);
    }
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0];
    if (best && best[1] >= need) return best[0];
  }
  return tidy([...keys].sort((a, b) => meta.get(a).year - meta.get(b).year).map((k) => meta.get(k).title)[0]);
}

const slugify = (s, taken) => {
  let base = s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'saga';
  let slug = base;
  let i = 2;
  while (taken.has(slug)) slug = `${base}-${i++}`;
  taken.add(slug);
  return slug;
};

const AUTO_TIP = {
  two: bi(
    'Story order follows the prequels and sequels; release order is how they reached screens. || Urutan cerita mengikuti prekuel dan sekuelnya; urutan rilis adalah saat judulnya tayang.'
  ),
  one: bi('Here the story runs in the same order the titles came out. || Di sini urutan cerita sama dengan urutan rilisnya.'),
};

const taken = new Set(curated.map((s) => s.id));
const auto = [];
for (const keys of groups.values()) {
  if (keys.length < 2) continue;

  // urutan cerita: topologi dari penanda prekuel/sekuel, tahun sebagai pemutus seri
  const before = new Map(keys.map((k) => [k, new Set()]));
  for (const [a, b, relation] of pairs) {
    if (!before.has(a) || !before.has(b) || a === b) continue;
    const m = marker.get(`${a}>${b}`);
    if (m === 'sequel' || relation === 'remake') before.get(a).add(b); // a lanjutan / versi baru dari b
    else if (m === 'prequel') before.get(b).add(a); // a mendahului b
  }
  const byYear = (a, b) => meta.get(a).year - meta.get(b).year || meta.get(a).title.localeCompare(meta.get(b).title);
  const release = [...keys].sort(byYear);

  // urutan cerita = topologi stabil: ikuti urutan rilis, tapi tahan judul sampai semua pendahulunya keluar
  const story = [];
  const done = new Set();
  const pending = [...release];
  while (pending.length) {
    const i = pending.findIndex((k) => [...before.get(k)].every((d) => done.has(d)));
    const pick = pending.splice(i === -1 ? 0 : i, 1)[0]; // i === -1 cuma kalau datanya melingkar
    done.add(pick);
    story.push(pick);
  }
  const twoOrders = story.some((k, i) => k !== release[i]);

  const name = nameOf(keys);
  auto.push({
    id: slugify(name, taken),
    name,
    tip: twoOrders ? AUTO_TIP.two : AUTO_TIP.one,
    kind: 'auto',
    lanes: [{ id: 'main', label: bi(`${name} || ${name}`) }],
    entries: story.map((k) => ({ title: meta.get(k).title, year: meta.get(k).year, lane: 'main', release: String(meta.get(k).year) })),
  });
}

// ── 4. tulis ───────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const rankOf = (r) => {
  const [y, m] = r.split('-').map(Number);
  return y * 100 + (m || 13);
};
const sagas = [...curated, ...auto]
  .map((s) => {
    const release = [...s.entries].sort((a, b) => rankOf(a.release) - rankOf(b.release) || s.entries.indexOf(a) - s.entries.indexOf(b));
    return { ...s, twoOrders: s.entries.some((e, i) => e !== release[i]) };
  })
  .sort((a, b) => (a.kind === b.kind ? b.entries.length - a.entries.length : a.kind === 'curated' ? -1 : 1));

fs.writeFileSync(out, JSON.stringify(sagas) + '\n');
console.log(
  `${sagas.length} sagas (${curated.length} curated, ${auto.length} auto), ${sagas.reduce((a, s) => a + s.entries.length, 0)} titles -> ${path.relative(process.cwd(), out)}`
);
for (const s of sagas) {
  console.log(`  ${s.kind === 'curated' ? '*' : ' '} ${s.id.padEnd(28)} ${String(s.entries.length).padStart(3)} titles${s.twoOrders ? ' · two orders' : ''}`);
}

// ── Penjaga: judul yatim ────────────────────────────────────────────────────
// Saga kurasi "mengklaim" judul yang didaftarkan dan mengeluarkannya dari graf. Judul yang
// terhubung ke saga itu tapi LUPA didaftarkan jadi kehilangan satu-satunya pasangannya, lalu
// terdampar tanpa saga sama sekali — diam-diam, tanpa error. Sudah kejadian di MCU (Marvel
// Zombies, Punisher: One Last Kill, Spider-Man: Brand New Day). Jadi dilaporkan di sini.
{
  const live = path.join(__dirname, 'connections-live.json');
  if (fs.existsSync(live)) {
    const inSaga = new Set(sagas.flatMap((s) => s.entries.map((e) => key(e.title, e.year))));
    const orphans = new Map();
    for (const r of JSON.parse(fs.readFileSync(live, 'utf8'))) {
      if (r.status !== 'APPROVED' || !['universe', 'remake'].includes(r.relationship)) continue;
      for (const [t, y] of [[r.sourceTitle, r.sourceYear], [r.targetTitle, r.targetYear]]) {
        if (t && !inSaga.has(key(t, y))) orphans.set(key(t, y), `${t} (${y})`);
      }
    }
    if (orphans.size) {
      console.log(`\n⚠ ${orphans.size} judul punya relasi cerita tapi tidak masuk saga mana pun —`);
      console.log('  kemungkinan besar lupa didaftarkan di saga kurasi yang mengklaim pasangannya:');
      for (const v of orphans.values()) console.log(`    ${v}`);
    }
  }
}

if (process.env.DATABASE_URL) {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  db.libraryTitle
    .findMany({ select: { title: true, year: true } })
    .then((rows) => {
      const have = new Set(rows.map((r) => key(r.title, r.year)));
      let missing = 0;
      for (const s of sagas) {
        const miss = s.entries.filter((e) => !have.has(key(e.title, e.year)));
        missing += miss.length;
        if (miss.length) console.log(`  ${s.id}: missing ${miss.map((e) => `${e.title} (${e.year})`).join('; ')}`);
      }
      console.log(`${missing} title(s) not in the library (shown as "Not on Surflix")`);
    })
    .finally(() => db.$disconnect());
}
