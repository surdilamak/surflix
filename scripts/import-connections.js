#!/usr/bin/env node
/**
 * Import FilmConnection from the curated JSON (scripts/connections-seed.json) into the active database.
 *
 * Safe for production — the rules:
 *   - New rows are created with the status from the seed (h = APPROVED, m = PENDING_REVIEW).
 *   - Existing rows created by the seed (source "llm"): their text is refreshed (EN/ID reason,
 *     relationship, confidence, film metadata). STATUS IS NEVER CHANGED, so admin approve/reject is safe.
 *   - Rows already touched by an admin (source "admin"): skipped entirely.
 *   - Old reverse-direction rows (B->A) are deleted if the seed has A->B and B->A is not part of the seed
 *     (a result of the initial seed being written in both directions). Only source "llm" rows are ever deleted.
 *
 *   docker exec surflix node scripts/import-connections.js scripts/connections-seed.json          # dry-run
 *   docker exec surflix node scripts/import-connections.js scripts/connections-seed.json --apply  # for real
 *   ... connections-live.json --apply --apply-rejections   # also reject rows marked REJECTED in the file (opt-in)
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
      // The file is the source of truth for the optional fields, so a row that no longer has a
      // paragraph or kind loses it too (they are omitted from the JSON when empty).
      if (apply) await prisma.filmConnection.update({ where: pair(r), data: { kind: null, storyEn: null, story: null, ...rest } });
      // Opt-in: rows marked REJECTED in the file (result of a fact audit) are also rejected in the database.
      if (withRejections && status === 'REJECTED' && had.status !== 'REJECTED') {
        stat.rejected++;
        if (apply) {
          await prisma.filmConnection.update({ where: pair(r), data: { status: 'REJECTED', reviewedAt: new Date() } });
        }
      }
    }

    // old reverse-direction row (target -> source)
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
