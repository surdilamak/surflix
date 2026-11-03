/**
 * Reference Portal — Watch order, index: all sagas that have a watch order.
 * Sagas are built from story relations (universe/remake), so every title that has a
 * real order is guaranteed to be here. Data is prepared on the server so it can be indexed.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listSagas, sagaMembership } from '@/lib/connections';
import { SagaIndex } from '@/components/connections/saga-index';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Watch order · Surflix Reference',
  description: 'Where to start a saga on Surflix: follow it in story order or in release order, with the spin-offs branching off the main line.',
};

export default async function WatchOrderIndexPage({ searchParams }: { searchParams: Promise<{ saga?: string }> }) {
  const { saga } = await searchParams;
  if (saga) redirect(`./timeline/${saga}`); // old ?saga= link
  const [sagas, membership] = await Promise.all([listSagas().catch(() => []), sagaMembership().catch(() => ({}))]);
  const jellyfinUrl = (process.env.NEXT_PUBLIC_JELLYFIN_URL || process.env.JELLYFIN_URL || '').replace(/\/+$/, '');
  return <SagaIndex sagas={sagas} membership={membership} jellyfinUrl={jellyfinUrl} />;
}
