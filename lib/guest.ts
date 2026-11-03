/**
 * Guest alias resolution helpers.
 *
 * Context: a Guest record can have `mergedIntoId` (result of the merge-guests-by-name migration).
 * All request reads/writes must follow the alias to the canonical (root) before the operation.
 */

import { prisma } from './db';

const MAX_HOPS = 10;

/**
 * Resolve guestId to the canonical guestId.
 * If the guest does not exist, return null.
 * If the guest has mergedIntoId, follow the chain to the root.
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

/** Save the guest's last language (from the surflix_lang cookie) so server notifications use their language. */
export async function touchGuestLang(guestId: string, cookieLang: string | undefined | null): Promise<void> {
  if (cookieLang !== 'en' && cookieLang !== 'id') return;
  await prisma.guest.updateMany({ where: { id: guestId, NOT: { lang: cookieLang } }, data: { lang: cookieLang } }).catch(() => {});
}
