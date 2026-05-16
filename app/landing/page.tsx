/**
 * Apex Landing Page (surflix.my.id)
 *
 * Served when user hits the apex domain `surflix.my.id` (not www, not request).
 * Routing handled by middleware.ts — hostname check rewrites apex → /landing.
 *
 * Two big CTAs:
 * - Watch on Surflix  → www.surflix.my.id (Jellyfin)
 * - Request Content   → request.surflix.my.id (this app's home)
 */
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { Film, Sparkles, ArrowRight } from 'lucide-react';

interface LibraryStats {
  moviesCount: number;
  seriesCount: number;
}

export default function LandingPage() {
  const config = useAppConfig();
  const [stats, setStats] = useState<LibraryStats | null>(null);

  useEffect(() => {
    fetch('/api/library-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats({ moviesCount: data.moviesCount, seriesCount: data.seriesCount });
      })
      .catch(() => {});
  }, []);

  const jellyfinUrl = config?.jellyfinUrl || 'https://www.surflix.my.id';
  const requestUrl = 'https://request.surflix.my.id';

  return (
    <div className="relative flex min-h-screen flex-col bg-black">
      {/* Ambient gradient bg — radial-gradient (not filter:blur, Safari iOS render bug).
          Orange glow on left (matches Watch card), purple on right (matches Request card). */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 700px 500px at 15% 30%, rgba(255, 159, 10, 0.22), transparent 60%),
            radial-gradient(ellipse 700px 500px at 85% 70%, rgba(191, 90, 242, 0.18), transparent 60%),
            radial-gradient(ellipse 500px 400px at 50% 110%, rgba(255, 159, 10, 0.08), transparent 65%)
          `,
        }}
      />

      {/* Hero — vertically centered when content is short, breathes top/bottom on tall screens */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex flex-col items-center text-center md:mb-14"
        >
          <Image
            src="/logo-wordmark.png"
            alt="Surflix"
            width={220}
            height={60}
            priority
            className="h-12 w-auto md:h-14"
          />
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.25em] text-white/40 md:text-xs">
            Bioskop di rumah aja
          </p>
        </motion.div>

        {/* Two cards — size-to-content (no flex-1 stretch) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {/* Watch card — orange palette */}
          <motion.a
            href={jellyfinUrl}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative flex flex-col overflow-hidden rounded-ios-xl border border-white/[0.08] bg-gradient-to-br from-ios-orange/12 via-bg-surface to-bg-surface p-6 transition-all hover:border-ios-orange/40 hover:from-ios-orange/20 md:p-8"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-ios-orange/15 text-ios-orange transition-transform group-hover:scale-110 md:h-16 md:w-16">
              <Film className="h-7 w-7 md:h-8 md:w-8" strokeWidth={1.75} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tighter md:text-3xl">
              Press Play
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60 md:text-[15px]">
              Buka library film & series. Klik, langsung nonton.
            </p>
            {stats && (stats.moviesCount > 0 || stats.seriesCount > 0) && (
              <p className="mt-3 text-[11px] text-white/40 md:text-xs">
                {stats.moviesCount.toLocaleString()} film · {stats.seriesCount.toLocaleString()} series
              </p>
            )}
            <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-ios-orange md:mt-6">
              Buka library
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
            </div>
          </motion.a>

          {/* Request card — purple palette */}
          <motion.a
            href={requestUrl}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="group relative flex flex-col overflow-hidden rounded-ios-xl border border-white/[0.08] bg-gradient-to-br from-ios-purple/12 via-bg-surface to-bg-surface p-6 transition-all hover:border-ios-purple/40 hover:from-ios-purple/20 md:p-8"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-ios-purple/15 text-ios-purple transition-transform group-hover:scale-110 md:h-16 md:w-16">
              <Sparkles className="h-7 w-7 md:h-8 md:w-8" strokeWidth={1.75} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tighter md:text-3xl">
              Drop a Wish
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60 md:text-[15px]">
              Gak nemu yang lo cari? Request aja, nanti ditambahin ke library.
            </p>
            <p className="mt-3 text-[11px] text-white/40 md:text-xs">
              Gratis · Direview 1-3 hari
            </p>
            <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-ios-purple md:mt-6">
              Buka request hub
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
            </div>
          </motion.a>
        </div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 flex flex-col items-center gap-1 text-center text-[11px] text-white/30 md:mt-14 md:text-xs"
        >
          <p>Self-hosted at surdi Homelab</p>
          <p className="text-white/20">
            Powered by Jellyfin · Built with Next.js
          </p>
        </motion.div>
      </div>
    </div>
  );
}
