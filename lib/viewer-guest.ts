/**
 * The Guest record that belongs to a signed-in viewer.
 *
 * Requests and remarks are only accepted from signed-in Surflix accounts. The name always comes from
 * the account, never from the form. The Guest is found by the account's user id; if there is none yet,
 * the browser's earlier guestId (from before sign-in was required) is adopted so the history is kept,
 * but only if that Guest does not already belong to another account.
 */

import { prisma } from './db';
import { resolveCanonicalGuestId } from './guest';

export async function guestForViewer(
  viewer: { userId: string; name: string },
  browserGuestId: string | undefined,
  lang: 'en' | 'id' | undefined
) {
  const common = { name: viewer.name, lastActive: new Date(), ...(lang ? { lang } : {}) };

  const linked = await prisma.guest.findUnique({ where: { jellyfinUserId: viewer.userId } });
  if (linked) {
    const canonicalId = (await resolveCanonicalGuestId(linked.id)) ?? linked.id;
    return prisma.guest.update({ where: { id: canonicalId }, data: common });
  }

  if (browserGuestId) {
    const canonicalId = await resolveCanonicalGuestId(browserGuestId);
    if (canonicalId) {
      const owned = await prisma.guest.findUnique({ where: { id: canonicalId }, select: { jellyfinUserId: true } });
      if (owned && !owned.jellyfinUserId) {
        return prisma.guest.update({ where: { id: canonicalId }, data: { ...common, jellyfinUserId: viewer.userId } });
      }
    }
  }

  const email = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@cookie.local`;
  return prisma.guest.create({ data: { ...common, email, jellyfinUserId: viewer.userId } });
}
