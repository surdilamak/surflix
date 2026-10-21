/**
 * Portal Referensi — Watch order, indeks: semua saga yang punya urutan tonton.
 * Saga dibangun dari relasi cerita (universe/remake), jadi setiap judul yang punya
 * urutan nyata pasti ada di sini. Data disiapkan di server supaya bisa diindeks.
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
  if (saga) redirect(`./timeline/${saga}`); // tautan lama ?saga=
  const [sagas, membership] = await Promise.all([listSagas().catch(() => []), sagaMembership().catch(() => ({}))]);
  const jellyfinUrl = (process.env.NEXT_PUBLIC_JELLYFIN_URL || process.env.JELLYFIN_URL || '').replace(/\/+$/, '');
  return <SagaIndex sagas={sagas} membership={membership} jellyfinUrl={jellyfinUrl} />;
}
