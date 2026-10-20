/**
 * i18n portal Referensi: English utama, Indonesia sebagai pilihan.
 * Copy ditulis mengikuti skill copywriting: spesifik, suara penggemar film,
 * tanpa kontras "bukan X tapi Y", tanpa daftar negasi, tanpa tanda seru.
 */

export type Lang = 'en' | 'id';
export const LANGS: Lang[] = ['en', 'id'];

type Dict = Record<string, string>;

const en: Dict = {
  // nav
  'nav.maps': 'All maps',
  'nav.hub': 'Request Hub',
  'nav.watch': 'Watch',
  'nav.galaxy': 'Galaxy',
  'nav.lang': 'Language',

  // hero
  'hero.h1a': 'Every film',
  'hero.h1b': 'leaves a trail.',
  'hero.sub': 'A map of how the films and series on Surflix connect: homages, borrowed looks, shared directors, shared universes.',
  'hero.placeholder': 'Try Blade Runner or Cowboy Bebop',
  'hero.cta': 'Find a title',
  'hero.browse': 'Browse every map',
  'hero.galaxy': 'Explore the galaxy',
  'hero.hover': '{n} connections',

  // search
  'search.label': 'Search the Surflix library',
  'search.none': 'Nothing in the library matches that.',
  'search.unmapped': 'No map yet',
  'search.connections': '{n} connections',
  'search.connection': '1 connection',

  // sheet
  'sheet.heading': 'Titles with the most trails',
  'sheet.caption': 'Each row starts with a title and runs through everything it connects to. Point at a poster to see why.',
  'sheet.film': '{title}{year}. {n} connections. Open its map.',
  'sheet.open': 'Open map →',
  'sheet.meta': '{n} connections',
  'sheet.alt': 'Open the map for {title}',

  // how
  'how.heading': 'Seven ways titles connect',
  'how.homage.name': 'Homage',
  'how.homage.text': 'One film winks at another on purpose: a recreated scene, a quoted line, a borrowed score.',
  'how.inspired.name': 'Inspired by',
  'how.inspired.text': 'The makers have said so, or the trail is well documented. This one exists because of that one.',
  'how.visual.name': 'Borrowed look',
  'how.visual.text': 'The look travels: a city, a palette, a way of moving the camera.',
  'how.remake.name': 'Retold',
  'how.remake.text': 'The same story again, as a remake, a reboot or a fresh adaptation.',
  'how.universe.name': 'Same universe',
  'how.universe.text': 'Sequels, prequels, spin-offs and shared worlds.',
  'how.director.name': 'Same director',
  'how.director.text': 'One filmmaker, two films. Watch them back to back and the fingerprints show.',
  'how.talent.name': 'Shared talent',
  'how.talent.text': 'The same star, writer, creator or studio. Follow the person you love.',
  'how.note': 'Connections we are less sure about wait for an admin to review them before they appear here.',

  // index
  'index.heading': 'Every title in the library',
  'index.sub': '{n} titles. Titles without a map yet are dimmed.',
  'index.toggle': 'Show titles without a map',
  'index.nomap': 'No map yet',

  // detail
  'detail.sub': 'Connected to {n} titles. Drag the shelf, tap a case, read why.',
  'detail.subYear': '{year}. Connected to {n} titles. Drag the shelf, tap a case, read why.',
  'detail.watch': 'Watch on Surflix',
  'detail.why': 'Why they connect',
  'detail.more': '{n} more connections are listed below.',
  'detail.error': 'The map did not load. Try refreshing.',
  'detail.nomapTitle': 'No map for this one yet',
  'detail.nomapBody': 'We have not traced this title yet. If you know what it echoes, an admin can add it.',
  'detail.back': 'Browse all maps',
  'detail.tap': 'Watch',
  'detail.galaxy': 'See it in the galaxy',

  // stage
  'stage.hint': 'Drag to rotate. Tap a case to open it.',
  'stage.default': 'The title you opened. Everything around it connects to it.',
  'stage.openMap': "Open this title's map",
  'stage.legend': 'Types of connection',

  // relationship names (neutral) and directional phrases
  'rel.homage': 'Homage',
  'rel.inspired': 'Inspired by',
  'rel.visual': 'Borrowed look',
  'rel.remake': 'Retold',
  'rel.universe': 'Same universe',
  'rel.director': 'Same director',
  'rel.talent': 'Shared talent',
  'rel.homage.out': 'Pays homage to',
  'rel.homage.in': 'Honoured by',
  'rel.inspired.out': 'Inspired by',
  'rel.inspired.in': 'Inspired',
  'rel.visual.out': 'Borrows the look of',
  'rel.visual.in': 'Look borrowed by',
  'rel.remake.out': 'Remake of',
  'rel.remake.in': 'Remade as',
  'rel.universe.out': 'Follows',
  'rel.universe.in': 'Followed by',

  // galaxy
  'galaxy.h1': 'One sky, every title.',
  'galaxy.sub': 'Each dot is a film or series on Surflix. Lines are connections, and titles that share a story, a maker or a look drift together.',
  'galaxy.hint': 'Scroll to zoom, drag to move, click a dot.',
  'galaxy.hintTouch': 'Pinch to zoom, drag to move, tap a dot.',
  'galaxy.count': '{n} titles, {m} connections',
  'galaxy.size': 'Bigger dots have more connections.',
  'galaxy.connections': '{n} connections',
  'galaxy.more': '{n} more on its map',
  'galaxy.reset': 'Reset view',
  'galaxy.close': 'Close',
  'galaxy.loading': 'Drawing the sky…',
  'galaxy.search': 'Fly to a title',

  // footer
  'footer.what': 'Surflix Reference, a map of the library',
};

const id: Dict = {
  'nav.maps': 'Semua peta',
  'nav.hub': 'Request Hub',
  'nav.watch': 'Tonton',
  'nav.galaxy': 'Galaksi',
  'nav.lang': 'Bahasa',

  'hero.h1a': 'Setiap film',
  'hero.h1b': 'punya jejak.',
  'hero.sub': 'Peta hubungan film dan serial di Surflix: penghormatan, tampilan yang dipinjam, sutradara yang sama, semesta yang sama.',
  'hero.placeholder': 'Coba Blade Runner atau Cowboy Bebop',
  'hero.cta': 'Cari judul',
  'hero.browse': 'Lihat semua peta',
  'hero.galaxy': 'Jelajahi galaksi',
  'hero.hover': '{n} koneksi',

  'search.label': 'Cari di library Surflix',
  'search.none': 'Tidak ada judul di library yang cocok.',
  'search.unmapped': 'Belum ada peta',
  'search.connections': '{n} koneksi',
  'search.connection': '1 koneksi',

  'sheet.heading': 'Judul dengan jejak terbanyak',
  'sheet.caption': 'Tiap baris dimulai dari satu judul dan berlanjut ke semua yang terhubung dengannya. Arahkan ke poster untuk tahu alasannya.',
  'sheet.film': '{title}{year}. {n} koneksi. Buka petanya.',
  'sheet.open': 'Buka peta →',
  'sheet.meta': '{n} koneksi',
  'sheet.alt': 'Buka peta {title}',

  'how.heading': 'Tujuh cara judul saling terhubung',
  'how.homage.name': 'Penghormatan',
  'how.homage.text': 'Satu film mengedipkan mata ke film lain dengan sengaja: adegan yang dibangun ulang, dialog yang dikutip, musik yang dipinjam.',
  'how.inspired.name': 'Terinspirasi',
  'how.inspired.text': 'Pembuatnya pernah menyebutnya, atau jejaknya terdokumentasi dengan baik. Film ini ada karena film itu.',
  'how.visual.name': 'Tampilan yang dipinjam',
  'how.visual.text': 'Tampilannya menular: kota, palet warna, cara menggerakkan kamera.',
  'how.remake.name': 'Dikisahkan ulang',
  'how.remake.text': 'Cerita yang sama sekali lagi, sebagai remake, reboot, atau adaptasi baru.',
  'how.universe.name': 'Semesta yang sama',
  'how.universe.text': 'Sekuel, prekuel, spin-off, dan dunia bersama.',
  'how.director.name': 'Sutradara yang sama',
  'how.director.text': 'Satu pembuat film, dua karya. Tonton berurutan dan sidik jarinya kelihatan.',
  'how.talent.name': 'Talenta yang sama',
  'how.talent.text': 'Bintang, penulis, kreator, atau studio yang sama. Ikuti orang yang kamu suka.',
  'how.note': 'Koneksi yang kami kurang yakin menunggu review admin sebelum muncul di sini.',

  'index.heading': 'Semua judul di library',
  'index.sub': '{n} judul. Judul yang belum punya peta dibuat redup.',
  'index.toggle': 'Tampilkan judul tanpa peta',
  'index.nomap': 'Belum ada peta',

  'detail.sub': 'Terhubung ke {n} judul. Geser raknya, ketuk satu case, baca alasannya.',
  'detail.subYear': '{year}. Terhubung ke {n} judul. Geser raknya, ketuk satu case, baca alasannya.',
  'detail.watch': 'Tonton di Surflix',
  'detail.why': 'Kenapa mereka terhubung',
  'detail.more': '{n} koneksi lainnya ada di daftar bawah.',
  'detail.error': 'Peta gagal dimuat. Coba refresh.',
  'detail.nomapTitle': 'Belum ada peta untuk judul ini',
  'detail.nomapBody': 'Judul ini belum kami telusuri. Kalau kamu tahu apa yang digemakannya, admin bisa menambahkannya.',
  'detail.back': 'Lihat semua peta',
  'detail.tap': 'Tonton',
  'detail.galaxy': 'Lihat di galaksi',

  'stage.hint': 'Geser untuk memutar. Ketuk case untuk membukanya.',
  'stage.default': 'Judul yang sedang kamu buka. Semua yang melayang di sekelilingnya terhubung dengannya.',
  'stage.openMap': 'Buka peta judul ini',
  'stage.legend': 'Jenis koneksi',

  'rel.homage': 'Penghormatan',
  'rel.inspired': 'Terinspirasi',
  'rel.visual': 'Tampilan dipinjam',
  'rel.remake': 'Dikisahkan ulang',
  'rel.universe': 'Semesta yang sama',
  'rel.director': 'Sutradara yang sama',
  'rel.talent': 'Talenta yang sama',
  'rel.homage.out': 'Memberi penghormatan ke',
  'rel.homage.in': 'Dihormati oleh',
  'rel.inspired.out': 'Terinspirasi dari',
  'rel.inspired.in': 'Menginspirasi',
  'rel.visual.out': 'Meminjam tampilan',
  'rel.visual.in': 'Tampilannya dipinjam',
  'rel.remake.out': 'Remake dari',
  'rel.remake.in': 'Di-remake jadi',
  'rel.universe.out': 'Melanjutkan',
  'rel.universe.in': 'Dilanjutkan oleh',

  'galaxy.h1': 'Satu langit, semua judul.',
  'galaxy.sub': 'Tiap titik adalah film atau serial di Surflix. Garis adalah koneksi, dan judul yang berbagi cerita, pembuat, atau tampilan melayang berdekatan.',
  'galaxy.hint': 'Gulir untuk zoom, geser untuk pindah, klik titik.',
  'galaxy.hintTouch': 'Cubit untuk zoom, geser untuk pindah, ketuk titik.',
  'galaxy.count': '{n} judul, {m} koneksi',
  'galaxy.size': 'Titik yang lebih besar punya lebih banyak koneksi.',
  'galaxy.connections': '{n} koneksi',
  'galaxy.more': '{n} lagi di petanya',
  'galaxy.reset': 'Atur ulang tampilan',
  'galaxy.close': 'Tutup',
  'galaxy.loading': 'Menggambar langit…',
  'galaxy.search': 'Terbang ke judul',

  'footer.what': 'Surflix Reference, peta library kami',
};

const DICTS: Record<Lang, Dict> = { en, id };

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Nama relasi; dengan arah ('out' = film ini merujuk lawannya, 'in' = lawannya merujuk film ini). */
export function relLabel(lang: Lang, rel: string, direction?: 'out' | 'in'): string {
  if (direction) {
    const k = `rel.${rel}.${direction}`;
    if (DICTS[lang][k]) return DICTS[lang][k];
  }
  return DICTS[lang][`rel.${rel}`] ?? rel;
}

export const REL_ORDER = ['homage', 'inspired', 'visual', 'remake', 'universe', 'director', 'talent'] as const;
