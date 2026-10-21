/**
 * Portal Referensi — Watch order: saga dari data/sagas.json dicocokkan ke library di server,
 * lalu TimelineView menggambar jalurnya (urutan cerita atau urutan rilis, dengan cabang).
 */
import type { Metadata } from 'next';
import { getSagas } from '@/lib/connections';
import { getServerId } from '@/lib/jellyfin';
import { TimelineView } from '@/components/connections/timeline-view';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Watch order · Surflix Reference',
  description: 'Where to start a saga: follow it in story order or in release order, with the spin-offs branching off the main line.',
};

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ saga?: string; film?: string }> }) {
  const { saga, film } = await searchParams;
  const sagas = await getSagas().catch(() => []);
  const jellyfinUrl = (process.env.NEXT_PUBLIC_JELLYFIN_URL || process.env.JELLYFIN_URL || '').replace(/\/+$/, '');
  const serverId = await getServerId().catch(() => undefined);
  return <TimelineView sagas={sagas} initial={saga} initialFilm={film} jellyfinUrl={jellyfinUrl} serverId={serverId ?? undefined} />;
}
