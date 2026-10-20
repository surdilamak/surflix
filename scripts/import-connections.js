#!/usr/bin/env node
/**
 * Import FilmConnection (approved) dari JSON hasil kurasi lokal ke database aktif.
 *
 * Aman buat production: cuma NAMBAH baris FilmConnection. Gak nyentuh tabel lain,
 * dan baris yang udah ada (status/review admin) gak ditimpa — cuma kolom metadata
 * film sumber yang masih kosong yang diisi.
 *
 * Cara pakai (di container, DATABASE_URL udah ke-set):
 *   docker exec surflix node scripts/import-connections.js scripts/connections-seed.json          # dry-run
 *   docker exec surflix node scripts/import-connections.js scripts/connections-seed.json --apply  # beneran
 */

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const file = process.argv[2];
const apply = process.argv.includes('--apply');
if (!file) {
  console.error('Usage: node scripts/import-connections.js <file.json> [--apply]');
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
const prisma = new PrismaClient();

(async () => {
  let created = 0;
  let existing = 0;
  for (const r of rows) {
    const where = {
      sourceTmdbId_sourceMediaType_targetTmdbId: {
        sourceTmdbId: r.sourceTmdbId,
        sourceMediaType: r.sourceMediaType,
        targetTmdbId: r.targetTmdbId,
      },
    };
    const had = await prisma.filmConnection.findUnique({ where });
    if (had) {
      existing++;
      // isi metadata film sumber yang masih kosong (cuma NGISI yang null, gak nimpa review)
      if (apply && (had.sourceJellyfinId == null || had.sourceYear == null)) {
        await prisma.filmConnection.update({
          where,
          data: {
            sourceJellyfinId: had.sourceJellyfinId ?? r.sourceJellyfinId ?? null,
            sourceYear: had.sourceYear ?? r.sourceYear ?? null,
          },
        });
      }
      continue;
    }
    created++;
    if (apply) {
      await prisma.filmConnection.create({
        data: { ...r, status: 'APPROVED', reviewedAt: new Date() },
      });
    }
  }
  console.log(`${apply ? 'APPLIED' : 'DRY-RUN'}: total=${rows.length} baru=${created} sudah-ada=${existing}`);
  if (!apply) console.log('Tambahin --apply buat nulis ke database.');
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
