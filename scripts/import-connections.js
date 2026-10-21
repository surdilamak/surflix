#!/usr/bin/env node
/**
 * Import FilmConnection dari JSON hasil kurasi (scripts/connections-seed.json) ke database aktif.
 *
 * Aman buat production — aturannya:
 *   - Baris baru dibuat dengan status dari seed (h = APPROVED, m = PENDING_REVIEW).
 *   - Baris yang sudah ada & dibuat seed (source "llm"): teksnya di-refresh (alasan EN/ID,
 *     relasi, confidence, metadata film). STATUS TIDAK PERNAH DIUBAH, jadi approve/reject admin aman.
 *   - Baris yang sudah disentuh admin (source "admin"): dilewati sepenuhnya.
 *   - Baris lama arah-kebalik (B->A) dihapus kalau seed punya A->B dan B->A bukan bagian seed
 *     (hasil seed awal yang ditulis dua arah). Hanya baris source "llm" yang pernah dihapus.
 *
 *   docker exec surflix node scripts/import-connections.js scripts/connections-seed.json          # dry-run
 *   docker exec surflix node scripts/import-connections.js scripts/connections-seed.json --apply  # beneran
 *   ... connections-live.json --apply --apply-rejections   # juga reject baris yang REJECTED di file (opt-in)
 */

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const file = process.argv[2];
const apply = process.argv.includes('--apply');
const withRejections = process.argv.includes('--apply-rejections');
if (!file) {
  console.error('Usage: node scripts/import-connections.js <file.json> [--apply]');
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
const prisma = new PrismaClient();
const keyOf = (r) => `${r.sourceMediaType}:${r.sourceTmdbId}>${r.targetTmdbId}`;
const pair = (a) => ({
  sourceTmdbId_sourceMediaType_targetTmdbId: {
    sourceTmdbId: a.sourceTmdbId, sourceMediaType: a.sourceMediaType, targetTmdbId: a.targetTmdbId,
  },
});

(async () => {
  const seedKeys = new Set(rows.map(keyOf));
  const stat = { created: 0, refreshed: 0, skippedAdmin: 0, pruned: 0, rejected: 0 };

  for (const r of rows) {
    const { status, ...rest } = r;
    const had = await prisma.filmConnection.findUnique({ where: pair(r) });

    if (!had) {
      stat.created++;
      if (apply) {
        await prisma.filmConnection.create({
          data: { ...rest, status, reviewedAt: status === 'APPROVED' ? new Date() : null },
        });
      }
    } else if (had.source === 'admin') {
      stat.skippedAdmin++;
    } else {
      stat.refreshed++;
      if (apply) await prisma.filmConnection.update({ where: pair(r), data: rest });
      // Opt-in: baris yang ditandai REJECTED di file (hasil audit fakta) ikut di-reject di database.
      if (withRejections && status === 'REJECTED' && had.status !== 'REJECTED') {
        stat.rejected++;
        if (apply) {
          await prisma.filmConnection.update({ where: pair(r), data: { status: 'REJECTED', reviewedAt: new Date() } });
        }
      }
    }

    // baris lama arah-kebalik (target -> sumber)
    const rev = {
      sourceTmdbId: r.targetTmdbId, sourceMediaType: r.targetMediaType, targetTmdbId: r.sourceTmdbId,
    };
    const revRow = await prisma.filmConnection.findUnique({ where: pair(rev) });
    if (revRow && revRow.source === 'llm' && !seedKeys.has(keyOf(revRow))) {
      stat.pruned++;
      if (apply) await prisma.filmConnection.delete({ where: { id: revRow.id } });
    }
  }

  console.log(`${apply ? 'APPLIED' : 'DRY-RUN'}: total=${rows.length}`, stat);
  if (!apply) console.log('Tambahin --apply buat nulis ke database.');
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
