/**
 * Simple Rate Limiter (DB-backed, per IP + endpoint)
 *
 * Window-based: dalam 1 jam, max N requests per IP.
 * Cocok untuk skala kecil. Kalau traffic naik, migrate ke Redis.
 */

import { prisma } from './db';

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '10');
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'); // 1 jam

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(params: {
  ipAddress: string;
  endpoint: string;
  max?: number;
}): Promise<RateLimitResult> {
  const max = params.max || RATE_LIMIT_MAX;
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);

  // Cleanup old entries (best effort, jangan block request)
  prisma.rateLimit
    .deleteMany({
      where: { windowStart: { lt: new Date(now.getTime() - WINDOW_MS * 2) } },
    })
    .catch(() => {}); // ignore errors

  // Upsert counter
  const record = await prisma.rateLimit.upsert({
    where: {
      ipAddress_endpoint_windowStart: {
        ipAddress: params.ipAddress,
        endpoint: params.endpoint,
        windowStart,
      },
    },
    update: { count: { increment: 1 } },
    create: {
      ipAddress: params.ipAddress,
      endpoint: params.endpoint,
      windowStart,
      count: 1,
    },
  });

  const resetAt = new Date(windowStart.getTime() + WINDOW_MS);
  const remaining = Math.max(0, max - record.count);

  return {
    allowed: record.count <= max,
    remaining,
    resetAt,
  };
}

/**
 * Extract IP from Next.js request headers
 * Handles reverse proxy (X-Forwarded-For)
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip') || 'unknown';
}
