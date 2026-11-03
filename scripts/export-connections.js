#!/usr/bin/env node
/**
 * Export FilmConnection from the active database to scripts/connections-live.json.
 *
 * This is a "snapshot" of the admin's review decisions (APPROVED/REJECTED status, admin-created connections,
 * edits). Used as the deploy source: import-connections.js can read this file
 * exactly like connections-seed.json. REJECTED rows are exported too so they do not "come back to life".
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
  // storyEn/story are optional: leave them out when empty so the file stays free of null noise.
  const out = rows.map(({ id, createdAt, reviewedAt, ...r }) => {
    if (r.storyEn == null) delete r.storyEn;
    if (r.story == null) delete r.story;
    if (r.kind == null) delete r.kind;
    return r;
  });
  const file = path.join(__dirname, 'connections-live.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  const by = (k) => out.reduce((m, r) => ((m[r[k]] = (m[r[k]] || 0) + 1), m), {});
  console.log(`Diekspor ${out.length} koneksi ->`, file, by('status'), by('source'));
  await prisma.$disconnect();
})();
