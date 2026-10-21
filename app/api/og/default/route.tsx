/** GET /api/og/default → kartu preview umum Surflix Reference. */
import { defaultCard } from '@/lib/og';

export const dynamic = 'force-dynamic';

export async function GET() {
  return defaultCard();
}
