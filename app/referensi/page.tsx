/**
 * Portal Referensi — beranda: hero cincin + search, contact sheet, cara baca, indeks A–Z.
 */
'use client';

import { useEffect, useState } from 'react';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { useReveal } from '@/lib/hooks/use-reveal';
import { PortalRing } from '@/components/connections/portal-ring';
import { ContactSheet } from '@/components/connections/contact-sheet';
import { TitleIndex } from '@/components/connections/title-index';
import { useLang } from '@/components/connections/lang-provider';
import { REL_VAR, filmKey, type PortalFilm } from '@/lib/portal-data';
import { REL_ORDER } from '@/lib/i18n';

export default function ReferensiHomePage() {
  const config = useAppConfig();
  const { t } = useLang();
  const [films, setFilms] = useState<PortalFilm[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/connections/films')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setFilms(d.films))
      .catch(() => setError(true));
  }, []);

  useReveal(!!films && !!config);

  if (error) return <p className="ref-empty">{t('detail.error')}</p>;
  if (!films || !config) return <div className="ref-hero" aria-busy="true" />;

  // film dengan referensi sinematik (homage/inspired/visual/remake) jadi bintang beranda
  const featured = films.filter((f) => f.refScore > 0);
  const stars = featured.length >= 8 ? featured : films;
  const allKeys = new Set(films.map((f) => filmKey(f.mediaType, f.tmdbId)));

  // contoh nyata per jenis hubungan, diambil dari data
  const example = (rel: string) => {
    for (const f of films) {
      const r = f.refs.find((x) => x.relationship === rel);
      if (r) return r.direction === 'out' ? `${f.title} → ${r.title}` : `${r.title} → ${f.title}`;
    }
    return null;
  };

  return (
    <>
      <section className="ref-hero">
        <PortalRing films={stars} jellyfinUrl={config.jellyfinUrl} />
      </section>

      <ContactSheet
        films={stars.slice(0, 30)}
        allKeys={allKeys}
        jellyfinUrl={config.jellyfinUrl}
        serverId={config.jellyfinServerId}
      />

      <section className="ref-how">
        <h2 className="ref-display ref-reveal">{t('how.heading')}</h2>
        <div className="ref-how-grid">
          {REL_ORDER.map((k, i) => (
            <div key={k} className="ref-reveal" style={{ '--d': `${(i % 4) * 80}ms`, '--c': REL_VAR[k] } as React.CSSProperties}>
              <span className="ref-how-swatch" />
              <span className="ref-how-word">{t(`how.${k}.name`)}</span>
              <p>{t(`how.${k}.text`)}</p>
              {example(k) && <p className="ref-how-eg">{example(k)}</p>}
            </div>
          ))}
        </div>
        <p className="ref-how-note ref-reveal">{t('how.note')}</p>
      </section>

      <TitleIndex />
    </>
  );
}
