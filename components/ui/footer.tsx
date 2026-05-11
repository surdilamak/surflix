/**
 * Footer — info & rules
 * Includes "Dilarang request film Indonesia" notice
 */
'use client';

import Link from 'next/link';
import { Icons } from './icons';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-black/40 px-4 py-6 md:px-5 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          {/* Logo + tagline */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-surflix-500 to-ios-orange">
              <Icons.Waves className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tighter">Surflix</p>
              <p className="text-[10px] text-white/40">Request hub for Jellyfin</p>
            </div>
          </div>

          {/* Rules */}
          <div className="flex flex-col gap-1.5 text-[11px] text-white/50 md:items-end">
            <div className="flex items-start gap-1.5">
              <Icons.Info className="mt-px h-3 w-3 flex-shrink-0 text-ios-orange" />
              <p>
                <span className="font-medium text-white/70">Aturan:</span>{' '}
                Dilarang meminta film yang berasal dari Indonesia
              </p>
            </div>
            <a
              href={process.env.NEXT_PUBLIC_JELLYFIN_URL || '#'}
              target="_blank"
              rel="noopener"
              className="text-[11px] text-white/40 hover:text-white/70"
            >
              <Icons.ExternalLink className="mr-1 inline h-2.5 w-2.5" />
              Open Jellyfin
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
