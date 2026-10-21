/**
 * Portal Referensi — Watch order, satu saga: jalurnya digambar di SagaStage.
 * `?film=movie:123` membuka jalur ini langsung pada judul itu (dipakai peta koneksi, Galaxy, pencarian).
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSaga } from '@/lib/connections';
import { getServerId } from '@/lib/jellyfin';
import { SagaStage } from '@/components/connections/saga-stage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const saga = await getSaga((await params).id).catch(() => null);
  if (!saga) return { title: 'Watch order · Surflix Reference' };
  return {
    title: `${saga.name} watch order · Surflix Reference`,
    description: `Where to start ${saga.name} on Surflix: ${saga.total} titles in story order and in release order.`,
  };
}

export default async function SagaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ film?: string }>;
}) {
  const saga = await getSaga((await params).id).catch(() => null);
  if (!saga) notFound();
  const { film } = await searchParams;
  const jellyfinUrl = (process.env.NEXT_PUBLIC_JELLYFIN_URL || process.env.JELLYFIN_URL || '').replace(/\/+$/, '');
  const serverId = await getServerId().catch(() => undefined);
  return <SagaStage saga={saga} film={film} jellyfinUrl={jellyfinUrl} serverId={serverId ?? undefined} />;
}
