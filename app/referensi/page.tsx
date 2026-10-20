/**
 * Portal Referensi — beranda: hero cincin, contact sheet semua peta, cara baca.
 */
'use client';

import { useEffect, useState } from 'react';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { useReveal } from '@/lib/hooks/use-reveal';
import { PortalRing } from '@/components/connections/portal-ring';
import { ContactSheet } from '@/components/connections/contact-sheet';
import { REL_LABEL, REL_VAR, type PortalFilm } from '@/lib/portal-data';

const HOW: Array<{ key: string; text: string }> = [
  { key: 'homage', text: 'Satu film memberi hormat terang-terangan ke yang lain: adegan, tokoh, atau musiknya sengaja dikutip.' },
  { key: 'inspired', text: 'Satu film lahir karena yang lain. Pembuatnya pernah menyebutnya, atau jejaknya terdokumentasi.' },
  { key: 'visual', text: 'Yang dipinjam adalah tampilannya: kota, cahaya, komposisi, atau cara kameranya bergerak.' },
];

export default function ReferensiHomePage() {
  const config = useAppConfig();
  const [films, setFilms] = useState<PortalFilm[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/connections/films')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setFilms(d.films))
      .catch(() => setError(true));
  }, []);

  useReveal(!!films && !!config);

  if (error) return <p className="ref-empty">Gagal memuat peta. Coba refresh.</p>;
  if (!films || !config) return <div className="ref-hero" aria-busy="true" />;
  if (films.length === 0) return <p className="ref-empty">Belum ada peta referensi.</p>;

  // contoh nyata per jenis hubungan, diambil dari data
  const example = (rel: string) => {
    for (const f of films) {
      const r = f.refs.find((x) => x.relationship === rel);
      if (r) return `${f.title} → ${r.title}`;
    }
    return null;
  };

  return (
    <>
      <section className="ref-hero">
        <PortalRing films={films} jellyfinUrl={config.jellyfinUrl} />
      </section>

      <ContactSheet films={films} jellyfinUrl={config.jellyfinUrl} serverId={config.jellyfinServerId} />

      <section className="ref-how">
        <h2 className="ref-display ref-reveal">Cara baca peta ini</h2>
        <div className="ref-how-grid">
          {HOW.map((h, i) => (
            <div key={h.key} className="ref-reveal" style={{ '--d': `${i * 90}ms`, '--c': REL_VAR[h.key] } as React.CSSProperties}>
              <span className="ref-how-swatch" />
              <span className="ref-how-word">{REL_LABEL[h.key]}</span>
              <p>{h.text}</p>
              {example(h.key) && <p className="ref-how-eg">{example(h.key)}</p>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
