/**
 * Admin Bootstrap
 *
 * Run at startup: if the Admin table is empty and ENV ADMIN_USERNAME + ADMIN_PASSWORD_HASH
 * are present, auto-create an admin record in the DB.
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
      // Update password if it changed in env
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
