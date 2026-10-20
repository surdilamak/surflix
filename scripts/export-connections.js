#!/usr/bin/env node
/**
 * Ekspor FilmConnection dari database aktif ke scripts/connections-live.json.
 *
 * Ini "foto" keputusan review admin (status APPROVED/REJECTED, koneksi buatan admin,
 * hasil edit). Dipakai sebagai sumber deploy: import-connections.js bisa baca file ini
 * persis seperti connections-seed.json. REJECTED ikut diekspor supaya gak "hidup lagi".
 *
 *   DATABASE_URL=file:./prisma/dev.db node scripts/export-connections.js
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.filmConnection.findMany({
    orderBy: [{ sourceTitle: 'asc' }, { targetTitle: 'asc' }],
  });
  const out = rows.map(({ id, createdAt, reviewedAt, ...r }) => r);
  const file = path.join(__dirname, 'connections-live.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  const by = (k) => out.reduce((m, r) => ((m[r[k]] = (m[r[k]] || 0) + 1), m), {});
  console.log(`Diekspor ${out.length} koneksi ->`, file, by('status'), by('source'));
  await prisma.$disconnect();
})();
