/**
 * Admin Bootstrap
 *
 * Run at startup: kalau Admin table kosong dan ENV ADMIN_USERNAME + ADMIN_PASSWORD_HASH
 * ada, auto-create admin record di DB.
 */

import { prisma } from './db';

export async function bootstrapAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!username || !passwordHash) {
    console.warn('[Admin Bootstrap] ADMIN_USERNAME or ADMIN_PASSWORD_HASH not set, skipping');
    return;
  }

  try {
    const existing = await prisma.admin.findUnique({ where: { username } });

    if (!existing) {
      await prisma.admin.create({
        data: { username, passwordHash },
      });
      console.log(`[Admin Bootstrap] Created admin: ${username}`);
    } else {
      // Update password kalau berubah di env
      if (existing.passwordHash !== passwordHash) {
        await prisma.admin.update({
          where: { username },
          data: { passwordHash },
        });
        console.log(`[Admin Bootstrap] Updated password for: ${username}`);
      }
    }
  } catch (err: any) {
    console.error('[Admin Bootstrap] Failed:', err.message);
  }
}
