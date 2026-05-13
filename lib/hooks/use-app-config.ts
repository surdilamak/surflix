/**
 * useAppConfig — fetch runtime config dari /api/config
 *
 * Workaround untuk Next.js standalone yang kadang strip NEXT_PUBLIC_* env vars.
 * Cached in module-level singleton biar gak refetch setiap component render.
 */
'use client';

import { useEffect, useState } from 'react';

interface AppConfig {
  jellyfinUrl: string;
  appName: string;
  appUrl: string;
}

let cachedConfig: AppConfig | null = null;
let configPromise: Promise<AppConfig> | null = null;

function fetchConfig(): Promise<AppConfig> {
  if (configPromise) return configPromise;
  configPromise = fetch('/api/config')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) {
        cachedConfig = data;
        return data;
      }
      // Fallback
      return {
        jellyfinUrl: '',
        appName: 'Surflix',
        appUrl: '',
      };
    })
    .catch(() => ({
      jellyfinUrl: '',
      appName: 'Surflix',
      appUrl: '',
    }));
  return configPromise;
}

export function useAppConfig(): AppConfig | null {
  const [config, setConfig] = useState<AppConfig | null>(cachedConfig);

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      return;
    }
    fetchConfig().then(setConfig);
  }, []);

  return config;
}
