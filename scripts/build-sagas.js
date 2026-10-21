/**
 * Build the "Watch order" data: scripts/curated/sagas.txt -> lib/sagas.json.
 * Format is documented at the top of sagas.txt. Story order = order of lines; release order = release field.
 * With DATABASE_URL set (e.g. file:./dev.db) it also reports titles that are not in the library, so a
 * placeholder never appears by accident. lib/sagas.json is committed; the app matches it to the library at runtime.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'curated', 'sagas.txt');
const out = path.join(__dirname, '..', 'lib', 'sagas.json');

const bi = (s) => {
  const [en, id] = s.split('||').map((x) => x.trim());
  return { en, id: id || en };
};
const parseTitle = (s) => {
  const m = s.trim().match(/^(.*) \((\d{4})\)$/);
  if (!m) throw new Error(`Bad title "${s}" (expected "Title (year)")`);
  return { title: m[1], year: Number(m[2]) };
};

const sagas = [];
let cur = null;
const errors = [];

fs.readFileSync(src, 'utf8').split('\n').forEach((raw, n) => {
  const line = raw.trim();
  if (!line || line.startsWith('#')) return;
  try {
    if (line.startsWith('@saga ')) {
      const [slug, name, tip] = line.slice(6).split('|').map((x) => x.trim());
      cur = { id: slug, name, tip: bi(tip), lanes: [], entries: [] };
      sagas.push(cur);
    } else if (line.startsWith('@lane ')) {
      const parts = line.slice(6).split('|').map((x) => x.trim());
      const lane = { id: parts[0], label: bi(parts[1]) };
      const fork = parts.find((p) => p.startsWith('fork:'));
      if (fork) lane.fork = parseTitle(fork.slice(5));
      cur.lanes.push(lane);
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
    errors.push(`line ${n + 1}: ${err.message}`);
  }
});

for (const s of sagas) {
  for (const l of s.lanes) {
    if (l.fork && !s.entries.some((e) => e.title === l.fork.title && e.year === l.fork.year)) {
      errors.push(`${s.id}: lane ${l.id} forks from "${l.fork.title} (${l.fork.year})" which is not in the saga`);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

fs.writeFileSync(out, JSON.stringify(sagas, null, 1) + '\n');
console.log(`${sagas.length} sagas, ${sagas.reduce((a, s) => a + s.entries.length, 0)} entries -> ${path.relative(process.cwd(), out)}`);

if (process.env.DATABASE_URL) {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  db.libraryTitle
    .findMany({ select: { title: true, year: true } })
    .then((rows) => {
      const have = new Set(rows.map((r) => `${r.title.toLowerCase()}|${r.year}`));
      for (const s of sagas) {
        const miss = s.entries.filter((e) => !have.has(`${e.title.toLowerCase()}|${e.year}`));
        console.log(`${s.id}: ${s.entries.length - miss.length}/${s.entries.length} in library${miss.length ? ' · missing: ' + miss.map((e) => `${e.title} (${e.year})`).join('; ') : ''}`);
      }
    })
    .finally(() => db.$disconnect());
}
