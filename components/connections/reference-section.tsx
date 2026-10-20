/**
 * ReferenceSection — section "Referensi" di detail modal.
 *
 * Fetch lazy (cuma pas diklik) ke /api/connections — approved-only, tanpa LLM.
 * three.js di-load dinamis supaya gak nambah bundle modal.
 */
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Icons } from '@/components/ui/icons';
import type { GraphData } from './connection-graph';

const ConnectionGraph = dynamic(
  () => import('./connection-graph').then((m) => m.ConnectionGraph),
  { ssr: false, loading: () => <div className="h-[480px] animate-pulse rounded-ios-lg bg-white/[0.04]" /> }
);

interface ReferenceSectionProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  jellyfinUrl?: string;
}

export function ReferenceSection({ tmdbId, mediaType, jellyfinUrl }: ReferenceSectionProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [data, setData] = useState<GraphData | null>(null);

  async function load() {
    setState('loading');
    try {
      const res = await fetch(`/api/connections?type=${mediaType}&id=${tmdbId}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
      setState('ready');
    } catch {
      setState('error');
    }
  }

  if (state === 'idle') {
    return (
      <button
        onClick={load}
        className="w-full rounded-full border border-white/15 bg-white/[0.04] py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          <Icons.Sparkles className="h-4 w-4" />
          Referensi
        </span>
      </button>
    );
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-xs text-white/40">
        <Icons.Loader2 className="h-3 w-3 animate-spin" />
        Loading referensi...
      </div>
    );
  }

  if (state === 'error') {
    return (
      <button onClick={load} className="w-full py-3 text-xs text-white/50 hover:text-white">
        Gagal ambil referensi. Coba lagi
      </button>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="rounded-ios-lg bg-white/[0.04] p-4 text-center text-xs text-white/50">
        Belum ada peta referensi buat film ini.
      </div>
    );
  }

  return <ConnectionGraph data={data} jellyfinUrl={jellyfinUrl} />;
}
