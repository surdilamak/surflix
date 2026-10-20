/**
 * Portal Referensi — Galaxy: seluruh library sebagai satu langit.
 */
'use client';

import { useEffect, useState } from 'react';
import { Galaxy, type GalaxyData } from '@/components/connections/galaxy';
import { useLang } from '@/components/connections/lang-provider';

export default function GalaxyPage() {
  const { t } = useLang();
  const [data, setData] = useState<GalaxyData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/connections/galaxy')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="ref-empty">{t('detail.error')}</p>;
  return <Galaxy data={data} />;
}
