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
import { Icons } from '@/components/ui/icons';

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
      {/* Ambient gradient bg (radial-gradient, NOT filter:blur — Safari iOS has render
          bugs with large blur values that cause infinite loading) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 700px 500px at 50% 0%, rgba(255, 107, 53, 0.22), transparent 60%),
            radial-gradient(ellipse 500px 400px at 0% 100%, rgba(255, 107, 53, 0.12), transparent 65%),
            radial-gradient(ellipse 600px 500px at 100% 100%, rgba(230, 57, 70, 0.10), transparent 60%)
          `,
        }}
      />

      {/* Hero */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex flex-col items-center text-center md:mb-16"
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
            Personal Media Hub
          </p>
        </motion.div>

        {/* Two cards */}
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {/* Watch card */}
          <motion.a
            href={jellyfinUrl}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative flex flex-col overflow-hidden rounded-ios-xl border border-white/[0.08] bg-gradient-to-br from-surflix-500/10 via-bg-surface to-bg-surface p-7 transition-all hover:border-surflix-500/40 hover:from-surflix-500/20 md:p-10"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-surflix-500/15 text-surflix-500 transition-transform group-hover:scale-110 md:h-16 md:w-16">
              <Icons.Play className="h-7 w-7 md:h-8 md:w-8" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tighter md:text-3xl">
              Watch on Surflix
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60 md:text-base">
              Stream movies & series from the family library. Open the Jellyfin player.
            </p>
            {stats && (stats.moviesCount > 0 || stats.seriesCount > 0) && (
              <p className="mt-3 text-[11px] text-white/40 md:text-xs">
                {stats.moviesCount.toLocaleString()} movies · {stats.seriesCount.toLocaleString()} series
              </p>
            )}
            <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-surflix-500 md:mt-8">
              Open library
              <Icons.ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </motion.a>

          {/* Request card */}
          <motion.a
            href={requestUrl}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="group relative flex flex-col overflow-hidden rounded-ios-xl border border-white/[0.08] bg-gradient-to-br from-ios-blue/10 via-bg-surface to-bg-surface p-7 transition-all hover:border-ios-blue/40 hover:from-ios-blue/20 md:p-10"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-ios-blue/15 text-ios-blue transition-transform group-hover:scale-110 md:h-16 md:w-16">
              <Icons.Plus className="h-7 w-7 md:h-8 md:w-8" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tighter md:text-3xl">
              Request Content
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60 md:text-base">
              Can't find what you want? Request new movies or series — we'll add them to the library.
            </p>
            <p className="mt-3 text-[11px] text-white/40 md:text-xs">
              Free to request · Admin reviews within 1-3 days
            </p>
            <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-ios-blue md:mt-8">
              Open request hub
              <Icons.ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </motion.a>
        </div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 flex flex-col items-center gap-1 text-center text-[11px] text-white/30 md:mt-16 md:text-xs"
        >
          <p>Self-hosted at home · Maintained with love by Idrus</p>
          <p className="text-white/20">
            Powered by Jellyfin · Built with Next.js
          </p>
        </motion.div>
      </div>
    </div>
  );
}
