#!/usr/bin/env node
/**
 * Export LibraryTitle from the active database to scripts/library-seed.json.
 *
 * Counterpart of import-library.js, and the reason matters: build-connections.js VALIDATES
 * every curated title against library-seed.json, so as long as that file is stale, new titles
 * cannot get connections at all ("judul gak ketemu" = error).
 *
 * So the workflow every time there is a new film/series in Jellyfin:
 *
 *   1. Admin -> Settings -> Sync library        (prod reads Jellyfin, fills LibraryTitle)
 *   2. on the server:  docker exec surflix node scripts/export-library.js
 *   3. on the server:  docker cp surflix:/app/scripts/library-seed.json /tmp/library-seed.json
 *   4. on the Mac:     scp root@192.168.68.8:/tmp/library-seed.json scripts/library-seed.json
 *   5. on the Mac:     node scripts/build-connections.js   (now the new titles are recognized)
 *
 * Step 3 uses /tmp, not ./scripts: when you SSH into the server you land in /root and
 * that folder does not exist there, so docker cp fails with "invalid output path".
 *
 * addedAt is deliberately NOT exported: that column is filled from Jellyfin at sync time in each environment,
 * not carried around via the seed. updatedAt is dropped too because Prisma manages it itself.
 *
 * The "newest titles" list is read from the addedAt column, NOT by comparing against the old file.
 * A file comparison is only correct once: the first run overwrites its own comparison file,
 * so the second run always says "nothing new" even if a title has just come in.
 *
 *   DATABASE_URL=file:./dev.db node scripts/export-library.js      # local
 *   docker exec surflix node scripts/export-library.js             # production
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

  // Youngest titles according to Jellyfin. Idempotent: safe to run repeatedly.
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
