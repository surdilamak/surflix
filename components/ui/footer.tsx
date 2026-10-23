/**
 * Footer — logo, library stats, house rule
 * Uses runtime config from /api/config (works in Next.js standalone)
 */
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { useLang } from '@/components/connections/lang-provider';
import { Icons } from './icons';

export function Footer() {
  const config = useAppConfig();
  const { t } = useLang();
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
    <footer className="mt-16 pb-6 pt-2">
      <div className="rq-wrap">
        <div className="rq-tile flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="flex flex-col items-start gap-2">
            <Image src="/logo-wordmark.png" alt="Surflix" width={1354} height={372} className="h-8 w-auto" />
            <p className="rq-small text-rq-muted">
              {t('hub.name')}
              {stats && (stats.moviesCount > 0 || stats.seriesCount > 0) &&
                ` · ${t('hub.footer.stats', { m: stats.moviesCount.toLocaleString(), s: stats.seriesCount.toLocaleString() })}`}
            </p>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <p className="rq-small flex items-center gap-2 text-rq-muted">
              <Icons.Info className="h-4 w-4 shrink-0 text-rq-accent" />
              <span>
                <span className="text-white">{t('hub.footer.rule')}</span> {t('hub.footer.ruleText')}
              </span>
            </p>
            {jellyfinUrl && (
              <a href={jellyfinUrl} target="_blank" rel="noopener" className="rq-small inline-flex items-center gap-1.5 py-2 text-white hover:text-white">
                {t('hub.footer.open')}
                <Icons.ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
