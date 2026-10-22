#!/usr/bin/env node
/**
 * Ekspor LibraryTitle dari database aktif ke scripts/library-seed.json.
 *
 * Pasangan dari import-library.js, dan alasannya penting: build-connections.js MEMVALIDASI
 * setiap judul kurasi terhadap library-seed.json, jadi selama berkas itu basi, judul baru
 * tidak bisa dibuatkan koneksi sama sekali ("judul gak ketemu" = error).
 *
 * Jadi urutan kerja setiap kali ada film/serial baru di Jellyfin:
 *
 *   1. Admin -> Settings -> Sync library        (prod membaca Jellyfin, mengisi LibraryTitle)
 *   2. docker exec surflix node scripts/export-library.js
 *   3. docker cp surflix:/app/scripts/library-seed.json ./scripts/library-seed.json
 *   4. node scripts/build-connections.js        (sekarang judul barunya dikenali)
 *
 * addedAt sengaja TIDAK diekspor: kolom itu diisi dari Jellyfin saat sync di tiap lingkungan,
 * bukan dibawa-bawa lewat seed. updatedAt juga dibuang karena Prisma mengelolanya sendiri.
 *
 *   DATABASE_URL=file:./dev.db node scripts/export-library.js      # lokal
 *   docker exec surflix node scripts/export-library.js             # produksi
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.libraryTitle.findMany({
    orderBy: [{ title: 'asc' }, { year: 'asc' }],
    select: {
      tmdbId: true,
      mediaType: true,
      title: true,
      originalTitle: true,
      year: true,
      jellyfinId: true,
      genres: true,
      directors: true,
    },
  });

  const file = path.join(__dirname, 'library-seed.json');
  const before = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const had = new Set(before.map((r) => `${r.mediaType}:${r.tmdbId}`));
  const fresh = rows.filter((r) => !had.has(`${r.mediaType}:${r.tmdbId}`));

  fs.writeFileSync(file, JSON.stringify(rows, null, 2) + '\n');
  console.log(`Diekspor ${rows.length} judul -> ${file} (sebelumnya ${before.length})`);

  if (fresh.length) {
    console.log(`\n${fresh.length} judul BARU dibanding berkas lama:`);
    for (const r of fresh) console.log(`    ${r.title} (${r.year}) [${r.mediaType}]`);
    console.log('\nLangkah berikutnya: tulis koneksinya di scripts/curated/*.txt, lalu');
    console.log('  node scripts/build-connections.js && node scripts/build-sagas.js');
  } else {
    console.log('Tidak ada judul baru dibanding berkas lama.');
  }

  await prisma.$disconnect();
})();
