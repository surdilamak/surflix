#!/usr/bin/env node
/**
 * Import Jellyfin library snapshot (LibraryTitle) from JSON into the active database.
 *
 * Safe for production: only upserts the LibraryTitle table (title, year, jellyfinId, etc.).
 * Does not touch other tables. Safe to run repeatedly.
 *
 *   docker exec surflix node scripts/import-library.js scripts/library-seed.json          # dry-run
 *   docker exec surflix node scripts/import-library.js scripts/library-seed.json --apply  # for real
 */

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const file = process.argv[2];
const apply = process.argv.includes('--apply');
if (!file) {
  console.error('Usage: node scripts/import-library.js <file.json> [--apply]');
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
const prisma = new PrismaClient();

(async () => {
  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const where = { tmdbId_mediaType: { tmdbId: r.tmdbId, mediaType: r.mediaType } };
    const had = await prisma.libraryTitle.findUnique({ where });
    had ? updated++ : created++;
    if (apply) {
      await prisma.libraryTitle.upsert({ where, create: r, update: r });
    }
  }
  console.log(`${apply ? 'APPLIED' : 'DRY-RUN'}: total=${rows.length} baru=${created} diperbarui=${updated}`);
  if (!apply) console.log('Tambahin --apply buat nulis ke database.');
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
