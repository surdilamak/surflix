#!/usr/bin/env node
/**
 * Build scripts/connections-seed.json dari file data kurasi (scripts/curated/*.txt).
 *
 * Format baris (satu koneksi per baris, `#` = komentar):
 *   SUMBER (tahun) > TARGET (tahun) | relasi | h/m | teks
 *
 *   - Arah: SUMBER merujuk / mengikuti TARGET (SUMBER = film yang lebih baru).
 *   - relasi: homage | inspired | visual | remake | universe
 *   - h = terdokumentasi kuat (auto-APPROVED), m = sering dibahas (masuk antrian review)
 *   - teks: "EN || ID"  atau template @sequel @prequel @spinoff @series @universe
 *           @remake @reboot @film-of-series @adaptation @cut
 *
 * Koneksi sutradara-sama dibuat otomatis dari scripts/curated/directors.list
 * (satu nama per baris; cuma sutradara yang diverifikasi), dirantai per tahun.
 *
 * Judul divalidasi terhadap scripts/library-seed.json: judul yang gak ketemu = error.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname);
const library = JSON.parse(fs.readFileSync(path.join(root, 'library-seed.json'), 'utf8'));

const norm = (s) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/×/g, 'x').replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();

const byKey = new Map();   // "title|year" -> entry
const byTitle = new Map(); // "title" -> [entries]
for (const t of library) {
  byKey.set(`${norm(t.title)}|${t.year}`, t);
  const k = norm(t.title);
  if (!byTitle.has(k)) byTitle.set(k, []);
  byTitle.get(k).push(t);
}

function resolve(ref) {
  const m = ref.trim().match(/^(.*?)\s*\((\d{4})\)$/);
  if (m) return byKey.get(`${norm(m[1])}|${m[2]}`) || null;
  const list = byTitle.get(norm(ref));
  return list && list.length === 1 ? list[0] : null;
}

const TEMPLATES = {
  sequel:           ['{S} picks up the story after {T}.', '{S} melanjutkan cerita setelah {T}.'],
  prequel:          ['{S} tells what happened before {T}.', '{S} menceritakan apa yang terjadi sebelum {T}.'],
  spinoff:          ['{S} spins off from {T}.', '{S} adalah spin-off dari {T}.'],
  series:           ['{S} belongs to the same series as {T}.', '{S} satu seri dengan {T}.'],
  universe:         ['{S} and {T} are set in the same universe.', '{S} dan {T} berada di semesta yang sama.'],
  remake:           ['{S} is a remake of {T}.', '{S} adalah remake dari {T}.'],
  reboot:           ['{S} restarts the story that {T} began.', '{S} memulai ulang kisah yang dibuka {T}.'],
  'film-of-series': ['{S} is a feature film from the {T} series.', '{S} adalah film layar lebar dari serial {T}.'],
  adaptation:       ['{S} adapts the same source as {T}.', '{S} mengadaptasi sumber yang sama dengan {T}.'],
  cut:              ['{S} is a special edit of {T}.', '{S} adalah versi edit khusus dari {T}.'],
};
const RELS = new Set(['homage', 'inspired', 'visual', 'remake', 'universe', 'director', 'talent']);

const errors = [];
const rows = [];
const seen = new Set();

function push(src, tgt, rel, conf, en, id, where) {
  if (src === tgt) return errors.push(`${where}: sumber = target`);
  const key = `${src.tmdbId}:${src.mediaType}>${tgt.tmdbId}`;
  if (seen.has(key)) return errors.push(`${where}: duplikat ${src.title} > ${tgt.title}`);
  seen.add(key);
  if (en.length > 220) errors.push(`${where}: teks EN ${en.length} char (maks 220): ${en.slice(0, 50)}...`);
  if (id.length > 220) errors.push(`${where}: teks ID ${id.length} char (maks 220)`);
  rows.push({
    sourceTmdbId: src.tmdbId, sourceMediaType: src.mediaType, sourceTitle: src.title,
    sourceYear: src.year, sourceJellyfinId: src.jellyfinId,
    targetTmdbId: tgt.tmdbId, targetMediaType: tgt.mediaType, targetTitle: tgt.title,
    targetYear: tgt.year, targetJellyfinId: tgt.jellyfinId,
    relationship: rel, confidence: conf === 'h' ? 'high' : 'medium',
    reason: id, reasonEn: en,
    status: conf === 'h' ? 'APPROVED' : 'PENDING_REVIEW',
    source: 'llm',
  });
}

// ── 1. file data kurasi
const dir = path.join(root, 'curated');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.txt')).sort()) {
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const where = `${f}:${i + 1}`;
    const parts = line.split('|').map((x) => x.trim());
    if (parts.length < 4) return errors.push(`${where}: format salah`);
    const [pair, rel, conf, ...rest] = parts;
    const text = rest.join('|').trim();
    const [a, b] = pair.split('>').map((x) => x.trim());
    if (!a || !b) return errors.push(`${where}: butuh "SUMBER > TARGET"`);
    const src = resolve(a);
    const tgt = resolve(b);
    if (!src) return errors.push(`${where}: gak ketemu di library: "${a}"`);
    if (!tgt) return errors.push(`${where}: gak ketemu di library: "${b}"`);
    if (!RELS.has(rel)) return errors.push(`${where}: relasi tak dikenal "${rel}"`);
    if (!['h', 'm'].includes(conf)) return errors.push(`${where}: confidence harus h atau m`);

    let en;
    let id;
    if (text.startsWith('@')) {
      const t = TEMPLATES[text.slice(1)];
      if (!t) return errors.push(`${where}: template tak dikenal ${text}`);
      en = t[0].replace('{S}', src.title).replace('{T}', tgt.title);
      id = t[1].replace('{S}', src.title).replace('{T}', tgt.title);
    } else {
      const [e, d] = text.split('||').map((x) => x.trim());
      if (!e || !d) return errors.push(`${where}: teks harus "EN || ID" atau template @...`);
      en = e;
      id = d;
    }
    push(src, tgt, rel, conf, en, id, where);
  });
}

// ── 2. sutradara yang sama (otomatis, dirantai per tahun)
// directors.list: satu sutradara per baris. Opsional: | +Judul (tahun) buat nambah film yang
// datanya kosong di Jellyfin, | -Judul (tahun) buat ngecualiin (salah kredit / bukan film penuh).
const dirFile = path.join(dir, 'directors.list');
if (fs.existsSync(dirFile)) {
  const lines = fs.readFileSync(dirFile, 'utf8').split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#'));
  for (const line of lines) {
    const [name, ...opts] = line.split('|').map((x) => x.trim());
    const extra = opts.filter((o) => o.startsWith('+')).map((o) => resolve(o.slice(1).trim()));
    const skip = new Set(opts.filter((o) => o.startsWith('-')).map((o) => resolve(o.slice(1).trim())).filter(Boolean));
    if (extra.some((x) => !x)) { errors.push(`directors.list: judul + tak ketemu di baris "${line}"`); continue; }
    const films = [...library.filter((t) => t.mediaType === 'movie' && t.year && (t.directors || '').split(', ').includes(name)), ...extra]
      .filter((t, i, a) => a.indexOf(t) === i && !skip.has(t))
      .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
    if (films.length < 2) { errors.push(`directors.list: "${name}" cuma ${films.length} film`); continue; }
    for (let i = 1; i < films.length; i++) {
      const a = films[i];
      const b = films[i - 1];
      // lewati kalau pasangan ini udah terhubung (arah mana pun) lewat franchise/referensi
      if (seen.has(`${a.tmdbId}:${a.mediaType}>${b.tmdbId}`) || seen.has(`${b.tmdbId}:${b.mediaType}>${a.tmdbId}`)) continue;
      push(a, b, 'director', 'h', `Both directed by ${name}.`, `Keduanya disutradarai ${name}.`, `director:${name}`);
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} MASALAH:\n` + errors.map((e) => '  - ' + e).join('\n'));
  if (!process.argv.includes('--force')) process.exit(1);
}

fs.writeFileSync(path.join(root, 'connections-seed.json'), JSON.stringify(rows, null, 2) + '\n');
const by = (k) => rows.reduce((m, r) => ((m[r[k]] = (m[r[k]] || 0) + 1), m), {});
console.log(`OK: ${rows.length} koneksi`, by('relationship'), by('status'));
const touched = new Set(rows.flatMap((r) => [`${r.sourceMediaType}:${r.sourceTmdbId}`, `${r.targetMediaType}:${r.targetTmdbId}`]));
console.log(`judul terhubung: ${touched.size} / ${library.length}`);
