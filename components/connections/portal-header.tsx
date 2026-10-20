/**
 * PortalHeader — header portal Referensi + link balik ke Request Hub
 */
'use client';

import Image from 'next/image';
import { usePortal } from '@/lib/hooks/use-portal';
import { useAppConfig } from '@/lib/hooks/use-app-config';

export function PortalHeader() {
  const { portalPath, hubHref } = usePortal();
  const config = useAppConfig();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/70 backdrop-blur-ios">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
        <a href={portalPath('/') || '/'} className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="Surflix" width={24} height={24} className="h-6 w-6" />
          <span className="text-base font-semibold tracking-tighter">Surflix Referensi</span>
        </a>
        <nav className="flex items-center gap-4 text-xs">
          <a href={hubHref('/')} className="text-white/60 transition-colors hover:text-white">
            Request Hub
          </a>
          {config?.jellyfinUrl && (
            <a
              href={config.jellyfinUrl}
              target="_blank"
              rel="noopener"
              className="rounded-full bg-surflix-500 px-3 py-1.5 font-medium text-white"
            >
              Tonton
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
