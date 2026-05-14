/**
 * Footer — info, rules, library stats
 * Uses runtime config from /api/config (works in Next.js standalone)
 */
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { Icons } from './icons';

export function Footer() {
  const config = useAppConfig();
  const [stats, setStats] = useState<{ moviesCount: number; seriesCount: number } | null>(null);

  useEffect(() => {
    fetch('/api/library-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats({ moviesCount: data.moviesCount, seriesCount: data.seriesCount });
      })
      .catch(() => {});
  }, []);

  const jellyfinUrl = config?.jellyfinUrl;

  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-black/40 px-4 py-6 md:px-5 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-start gap-0.5">
            <Image
              src="/logo-wordmark.png"
              alt="Surflix"
              width={116}
              height={32}
              className="h-8 w-auto"
            />
            <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/40">
              Request Hub
            </p>
            {stats && (stats.moviesCount > 0 || stats.seriesCount > 0) && (
              <p className="mt-1 text-[10px] text-white/40">
                {stats.moviesCount.toLocaleString()} movies · {stats.seriesCount.toLocaleString()} series
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 text-[11px] text-white/50 md:items-end">
            <div className="flex items-start gap-1.5">
              <Icons.Info className="mt-px h-3 w-3 flex-shrink-0 text-ios-orange" />
              <p>
                <span className="font-medium text-white/70">Aturan:</span>{' '}
                Dilarang request film/series Indonesia
              </p>
            </div>
            {jellyfinUrl && (
              <a
                href={jellyfinUrl}
                target="_blank"
                rel="noopener"
                className="text-[11px] text-white/40 transition-colors hover:text-white/70"
              >
                <Icons.ExternalLink className="mr-1 inline h-2.5 w-2.5" />
                Buka Surflix Media Player
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
