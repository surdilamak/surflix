/** GET /api/og/default → generic Surflix Reference preview card. */
import { defaultCard } from '@/lib/og';

export const dynamic = 'force-dynamic';

export async function GET() {
  return defaultCard();
}
