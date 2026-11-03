/**
 * Reference Portal — Just added: the newest titles in the library, rendered on the server so posters and titles
 * are already in the first HTML (indexable, fast to show). The view and language live in JustAddedView.
 */
import type { Metadata } from 'next';
import { recentTitles } from '@/lib/connections';
import { getServerId } from '@/lib/jellyfin';
import { scheduleLibrarySync } from '@/lib/library-sync';
import { JustAddedView } from '@/components/connections/just-added-view';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Just added · Surflix Reference',
  description: 'The newest films and series on Surflix, and which of them already have a connection map.',
};

let backfillScheduled = false;

export default async function JustAddedPage() {
  const { titles, pendingBackfill } = await recentTitles(60).catch(() => ({ titles: [], pendingBackfill: false }));
  // New addedAt column: if not yet filled, fill it via one background sync (once per process)
  if (pendingBackfill && !backfillScheduled) {
    backfillScheduled = true;
    scheduleLibrarySync();
  }
  const jellyfinUrl = (process.env.NEXT_PUBLIC_JELLYFIN_URL || process.env.JELLYFIN_URL || '').replace(/\/+$/, '');
  const serverId = await getServerId().catch(() => undefined);
  return <JustAddedView rows={titles} jellyfinUrl={jellyfinUrl} serverId={serverId ?? undefined} now={Date.now()} />;
}
