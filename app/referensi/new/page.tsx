/**
 * Portal Referensi — Just added: judul terbaru di library, dirender di server supaya poster dan judul
 * sudah ada di HTML pertama (bisa diindeks, cepat tampil). Tampilan dan bahasa ada di JustAddedView.
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
  // Kolom addedAt baru: kalau belum terisi, isi lewat satu sync latar belakang (sekali per proses)
  if (pendingBackfill && !backfillScheduled) {
    backfillScheduled = true;
    scheduleLibrarySync();
  }
  const jellyfinUrl = (process.env.NEXT_PUBLIC_JELLYFIN_URL || process.env.JELLYFIN_URL || '').replace(/\/+$/, '');
  const serverId = await getServerId().catch(() => undefined);
  return <JustAddedView rows={titles} jellyfinUrl={jellyfinUrl} serverId={serverId ?? undefined} now={Date.now()} />;
}
