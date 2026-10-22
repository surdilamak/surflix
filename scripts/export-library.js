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
 *   2. di server:  docker exec surflix node scripts/export-library.js
 *   3. di server:  docker cp surflix:/app/scripts/library-seed.json /tmp/library-seed.json
 *   4. di Mac:     scp root@192.168.68.8:/tmp/library-seed.json scripts/library-seed.json
 *   5. di Mac:     node scripts/build-connections.js   (sekarang judul barunya dikenali)
 *
 * Langkah 3 memakai /tmp, bukan ./scripts: saat SSH ke server posisinya di /root dan
 * folder itu tidak ada di sana, jadi docker cp gagal dengan "invalid output path".
 *
 * addedAt sengaja TIDAK diekspor: kolom itu diisi dari Jellyfin saat sync di tiap lingkungan,
 * bukan dibawa-bawa lewat seed. updatedAt juga dibuang karena Prisma mengelolanya sendiri.
 *
 * Daftar "judul terbaru" dibaca dari kolom addedAt, BUKAN dari membandingkan berkas lama.
 * Perbandingan berkas cuma benar sekali: jalan pertama menimpa berkas pembandingnya sendiri,
 * jadi jalan kedua selalu bilang "tidak ada yang baru" walau barusan ada judul masuk.
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
  const before = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).length : 0;
  fs.writeFileSync(file, JSON.stringify(rows, null, 2) + '\n');
  console.log(`Diekspor ${rows.length} judul -> ${file} (berkas sebelumnya berisi ${before})`);

  // Judul termuda menurut Jellyfin. Idempoten: aman dijalankan berulang.
  const recent = await prisma.libraryTitle.findMany({
    where: { addedAt: { not: null } },
    orderBy: { addedAt: 'desc' },
    take: 15,
    select: { title: true, year: true, mediaType: true, addedAt: true },
  });
  if (recent.length) {
    console.log('\n15 judul terbaru menurut Jellyfin (addedAt):');
    for (const r of recent) {
      console.log(`    ${r.addedAt.toISOString().slice(0, 10)}  ${r.title} (${r.year}) [${r.mediaType}]`);
    }
    console.log('\nSalin berkasnya ke repo, lalu tulis koneksi judul barunya di scripts/curated/*.txt:');
    console.log('  node scripts/build-connections.js && node scripts/build-sagas.js');
  } else {
    console.log('\naddedAt masih kosong di semua baris — jalankan Sync library sekali lagi.');
  }

  await prisma.$disconnect();
})();
