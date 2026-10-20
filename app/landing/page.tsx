/**
 * Apex Landing Page (surflix.my.id)
 *
 * Served when user hits the apex domain `surflix.my.id` (not www, not request).
 * Routing handled by middleware.ts — hostname check rewrites apex → /landing.
 *
 * Three doors:
 * - Streaming   → streaming.surflix.my.id (Jellyfin)
 * - Request Hub → request.surflix.my.id (this app's home)
 * - Referensi   → reference.surflix.my.id (map of how the library's titles connect)
 */
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { Film, Sparkles, Orbit, ArrowRight, Coffee, X } from 'lucide-react';

interface LibraryStats {
  moviesCount: number;
  seriesCount: number;
  mappedCount: number;
}

export default function LandingPage() {
  const config = useAppConfig();
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [coffeeOpen, setCoffeeOpen] = useState(false);

  useEffect(() => {
    fetch('/api/library-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats({ moviesCount: data.moviesCount, seriesCount: data.seriesCount, mappedCount: data.mappedCount ?? 0 });
      })
      .catch(() => {});
  }, []);

  const jellyfinUrl = config?.jellyfinUrl || 'https://www.surflix.my.id';
  const requestUrl = 'https://request.surflix.my.id';
  const referenceUrl = 'https://reference.surflix.my.id';

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0a0a0c]">
      {/* Background — minimal: two soft accents, color as whisper not statement.
          Safari iOS safe (no filter:blur, per safari-ios-blur-bug memory). */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 1100px 800px at 0% 0%, rgba(255, 140, 50, 0.18), transparent 55%),
            radial-gradient(ellipse 1000px 800px at 100% 100%, rgba(168, 85, 247, 0.16), transparent 55%)
          `,
        }}
      />

      {/* Film grain — texture without color noise. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />

      {/* Hero — generous breathing room, narrow container for editorial feel */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16 md:px-8 md:py-20">
        {/* Brand mark — logo + tagline + social-proof bar.
            Stats relocated from page-bottom to here as concrete proof of the
            curation narrative (brand-landingpage framework section 2: Social
            Proof Bar — high-impact placement, reinforces "dirawat personally"). */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-14 flex flex-col items-center text-center md:mb-20"
        >
          <Image
            src="/logo-wordmark.png"
            alt="Surflix"
            width={220}
            height={60}
            priority
            className="h-10 w-auto md:h-12"
          />
          <p className="mt-4 text-[13px] font-light italic text-white/45 md:text-sm">
            A cinephile's sanctuary
          </p>
          {stats && (stats.moviesCount > 0 || stats.seriesCount > 0) && (
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] tracking-wide text-white/35 md:text-[12px]">
              <span>{stats.moviesCount.toLocaleString()} films</span>
              <span className="text-white/15">·</span>
              <span>{stats.seriesCount.toLocaleString()} series</span>
              {stats.mappedCount > 0 && (
                <>
                  <span className="text-white/15">·</span>
                  <span>{stats.mappedCount.toLocaleString()} titles mapped</span>
                </>
              )}
              <span className="text-white/15">·</span>
              <span>hand-curated</span>
            </p>
          )}
        </motion.div>

        {/* Two cards — flat surfaces, restrained color, icons un-boxed */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          <motion.a
            href={jellyfinUrl}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="group relative flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 transition-all hover:border-white/15 hover:bg-white/[0.04] md:p-9"
          >
            <Film className="mb-7 h-6 w-6 text-ios-orange/90 md:mb-8 md:h-7 md:w-7" strokeWidth={1.5} />
            <h2 className="text-[22px] font-medium tracking-tight md:text-[26px]">
              Streaming
            </h2>
            <p className="mt-3 flex-1 text-[14px] leading-relaxed text-white/55 md:text-[15px]">
              A personal collection built up over the years. Favourites, hidden gems, comfort movies.
            </p>
            <div className="mt-8 flex items-center gap-2 text-[13px] font-medium text-ios-orange/90 md:mt-10">
              Open the library
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
            </div>
          </motion.a>

          <motion.a
            href={requestUrl}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="group relative flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 transition-all hover:border-white/15 hover:bg-white/[0.04] md:p-9"
          >
            <Sparkles className="mb-7 h-6 w-6 text-ios-purple/90 md:mb-8 md:h-7 md:w-7" strokeWidth={1.5} />
            <h2 className="text-[22px] font-medium tracking-tight md:text-[26px]">
              Request Hub
            </h2>
            <p className="mt-3 flex-1 text-[14px] leading-relaxed text-white/55 md:text-[15px]">
              Missing a film you love? Drop a request and I'll add it, so the whole family can watch together.
            </p>
            <div className="mt-8 flex items-center gap-2 text-[13px] font-medium text-ios-purple/90 md:mt-10">
              Open the request hub
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
            </div>
          </motion.a>

          <motion.a
            href={referenceUrl}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="group relative flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 transition-all hover:border-white/15 hover:bg-white/[0.04] md:p-9"
          >
            <Orbit className="mb-7 h-6 w-6 text-ios-green/90 md:mb-8 md:h-7 md:w-7" strokeWidth={1.5} />
            <h2 className="text-[22px] font-medium tracking-tight md:text-[26px]">
              Referensi
            </h2>
            <p className="mt-3 flex-1 text-[14px] leading-relaxed text-white/55 md:text-[15px]">
              Every film leaves a trail. See how the titles in the library connect: homages, borrowed looks, shared directors.
            </p>
            <div className="mt-8 flex items-center gap-2 text-[13px] font-medium text-ios-green/90 md:mt-10">
              Explore the map
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
            </div>
          </motion.a>
        </div>

        {/* Disclaimer — tightened from v4, narrower max-width for readability */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mx-auto mt-16 max-w-xl text-center text-[13px] leading-relaxed text-white/45 md:mt-20 md:text-[14px]"
        >
          Surflix is a private movie sanctuary I built for friends and family who genuinely love films. I look after it myself, like a garden: no ads, no tracking. Stay a while.
        </motion.p>

        {/* Coffee jar — gentle, optional gesture. Sits between disclaimer and
            footer so it reads as a soft P.S., not a paywall. Tone is
            understated: "the jar is open if you want it", never pushy. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mx-auto mt-12 flex max-w-md flex-col items-center text-center md:mt-16"
        >
          <p className="text-[13px] leading-relaxed text-white/45 md:text-[14px]">
            Servers hum, storage fills up, and curation happens at strange hours. If Surflix has earned a quiet corner of your week, the coffee jar is open.
          </p>
          <button
            type="button"
            onClick={() => setCoffeeOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-[13px] font-medium text-ios-orange/90 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
          >
            <Coffee className="h-4 w-4" strokeWidth={1.75} />
            Buy me a coffee
          </button>
        </motion.div>

        {/* Footer — infra + founding year. Stats live above as social proof. */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 text-center text-[11px] text-white/25 md:mt-14"
        >
          Self-hosted at surdi Homelab · Modern tech stack · Est. 2022
        </motion.p>
      </div>

      {/* Coffee QR popup — fades over the page with a centered card. QR image
          is sourced from /public/qr-coffee.png; drop the actual payment QR
          (GoPay/OVO/DANA/Saweria/etc.) at that path. */}
      <AnimatePresence>
        {coffeeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setCoffeeOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[280px] rounded-2xl border border-white/[0.08] bg-[#111114] p-4 text-center"
            >
              <button
                type="button"
                onClick={() => setCoffeeOpen(false)}
                aria-label="Close"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/70 transition-colors hover:bg-black/60 hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>

              {/* QR image already carries its own branding (QRIS card with logos
                  + merchant name); show it as-is in a rounded frame, no double
                  white wrapper, no redundant scan label. */}
              <div className="overflow-hidden rounded-xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/qr-coffee.png"
                  alt="Surflix coffee donation QR code"
                  className="block h-auto w-full"
                />
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                Thanks for keeping the projector humming.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
