#!/usr/bin/env node
/**
 * Merge duplicate Guest records by name (best-effort migration).
 *
 * Konteks: dulu request-form-modal gak ngirim guestId, jadi tiap request bikin
 * Guest record baru — history user nyebar di multiple records (1 request per record).
 *
 * Script ini ngerapihinnya:
 *   - Group Guest by lowercase trimmed name
 *   - Untuk group >1 record, pilih canonical = createdAt paling tua
 *   - Move semua Request + Remark dari duplikat ke canonical
 *   - Set Guest.mergedIntoId di duplikat → nunjuk ke canonical
 *     (duplikat NOT deleted biar device dengan stale guestId di localStorage tetep resolve)
 *
 * Risk yang user terima: 2 orang beda nama identik akan ke-merge jadi 1.
 *
 * Cara pakai (Unraid):
 *   docker exec -it surflix node scripts/merge-guests-by-name.js
 *   # atau dry-run dulu:
 *   docker exec -it surflix node scripts/merge-guests-by-name.js --dry-run
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

function normalize(name) {
  return name.trim().toLowerCase();
}

async function main() {
  console.log(`\n🔧 Surflix · Guest Merge Migration ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

  const allGuests = await prisma.guest.findMany({
    where: { mergedIntoId: null },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { requests: true, remarks: true } },
    },
  });

  console.log(`Total Guest records (un-merged): ${allGuests.length}`);

  // Group by normalized name
  const groups = new Map();
  for (const g of allGuests) {
    const key = normalize(g.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }

  const dupGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  console.log(`Name groups with duplicates: ${dupGroups.length}`);
  console.log('');

  let mergedGuests = 0;
  let movedRequests = 0;
  let movedRemarks = 0;

  for (const [name, guests] of dupGroups) {
    const [canonical, ...dupes] = guests; // oldest first
    const totalReqs = guests.reduce((sum, g) => sum + g._count.requests, 0);
    const totalRemarks = guests.reduce((sum, g) => sum + g._count.remarks, 0);

    console.log(`📦 "${name}" — ${guests.length} records, ${totalReqs} requests, ${totalRemarks} remarks`);
    console.log(`   Canonical: ${canonical.id} (created ${canonical.createdAt.toISOString()})`);

    for (const dup of dupes) {
      console.log(`   ↳ Merging ${dup.id} (${dup._count.requests} req, ${dup._count.remarks} rmk)`);

      if (!DRY_RUN) {
        await prisma.$transaction([
          prisma.request.updateMany({
            where: { guestId: dup.id },
            data: { guestId: canonical.id },
          }),
          prisma.remark.updateMany({
            where: { guestId: dup.id },
            data: { guestId: canonical.id },
          }),
          prisma.guest.update({
            where: { id: dup.id },
            data: { mergedIntoId: canonical.id },
          }),
        ]);
      }

      mergedGuests++;
      movedRequests += dup._count.requests;
      movedRemarks += dup._count.remarks;
    }
    console.log('');
  }

  console.log('─'.repeat(50));
  console.log(`✅ ${DRY_RUN ? 'WOULD MERGE' : 'MERGED'}: ${mergedGuests} duplicate Guest records`);
  console.log(`   Moved: ${movedRequests} requests, ${movedRemarks} remarks`);
  console.log(`   Name groups consolidated: ${dupGroups.length}`);
  console.log('');

  if (DRY_RUN) {
    console.log('💡 Run without --dry-run untuk eksekusi sebenarnya.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
