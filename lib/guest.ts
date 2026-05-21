/**
 * Guest alias resolution helpers.
 *
 * Konteks: Guest record bisa punya `mergedIntoId` (hasil migration merge-guests-by-name).
 * Semua read/write request harus follow alias ke canonical (root) sebelum operasi.
 */

import { prisma } from './db';

const MAX_HOPS = 10;

/**
 * Resolve guestId ke canonical guestId.
 * Kalau guest gak ada, return null.
 * Kalau guest punya mergedIntoId, follow rantai sampai root.
 */
export async function resolveCanonicalGuestId(guestId: string): Promise<string | null> {
  let currentId = guestId;
  for (let i = 0; i < MAX_HOPS; i++) {
    const g = await prisma.guest.findUnique({
      where: { id: currentId },
      select: { id: true, mergedIntoId: true },
    });
    if (!g) return null;
    if (!g.mergedIntoId) return g.id;
    currentId = g.mergedIntoId;
  }
  // cycle / corrupt chain — fallback to last known
  console.warn('[Guest] Alias chain too deep for', guestId);
  return currentId;
}

/**
 * Resolve and fetch canonical Guest record (with optional includes).
 */
export async function resolveCanonicalGuest(guestId: string) {
  const canonicalId = await resolveCanonicalGuestId(guestId);
  if (!canonicalId) return null;
  return prisma.guest.findUnique({ where: { id: canonicalId } });
}
