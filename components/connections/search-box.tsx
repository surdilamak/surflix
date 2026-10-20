/**
 * SearchBox — cari film/serial di library Surflix (judul, judul asli, sutradara).
 * Hasil bawa jumlah koneksi; judul tanpa peta tetap bisa dibuka (halaman "belum ada peta").
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { usePortal } from '@/lib/hooks/use-portal';
import { posterUrl } from '@/lib/jellyfin';
import { useLang } from './lang-provider';

interface Result {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  jellyfinId: string | null;
  directors: string | null;
  refCount: number;
}

export interface SearchPick {
  tmdbId: number;
  mediaType: string;
  title: string;
}

export function SearchBox({
  variant = 'hero',
  onPick,
  placeholder,
}: {
  variant?: 'hero' | 'compact';
  /** Kalau diberikan dan mengembalikan true, pilihan dianggap ditangani (gak pindah halaman). */
  onPick?: (r: SearchPick) => boolean | void;
  placeholder?: string;
}) {
  const { t } = useLang();
  const config = useAppConfig();
  const { portalPath } = usePortal();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/library/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) => {
          setResults(d.results ?? []);
          setActive(-1);
          setLoading(false);
        })
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  // tutup saat klik di luar
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (r: Result) => {
    if (onPick && onPick(r)) {
      setOpen(false);
      return;
    }
    window.location.href = portalPath(`/${r.mediaType}/${r.tmdbId}`) || '/';
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter') {
      const pick = results[active] ?? results[0];
      if (pick) {
        e.preventDefault();
        go(pick);
      }
    }
  };

  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className={`ref-search ref-search--${variant}`}>
      <div className="ref-search-row">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder ?? t('hero.placeholder')}
          aria-label={t('search.label')}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="ref-search-list"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="button" className="ref-btn" onClick={() => (results[0] ? go(results[active] ?? results[0]) : setOpen(true))}>
          {t('hero.cta')}
        </button>
      </div>

      {showPanel && (
        <ul id="ref-search-list" role="listbox" className="ref-search-panel">
          {results.length === 0 && !loading && <li className="ref-search-empty">{t('search.none')}</li>}
          {results.map((r, i) => (
            <li key={`${r.mediaType}-${r.tmdbId}`} role="option" aria-selected={i === active}>
              <a
                href={portalPath(`/${r.mediaType}/${r.tmdbId}`) || '/'}
                data-active={i === active ? '' : undefined}
                onMouseEnter={() => setActive(i)}
                onClick={(e) => {
                  if (onPick && onPick(r)) {
                    e.preventDefault();
                    setOpen(false);
                  }
                }}
              >
                <span className="ref-search-thumb">
                  {r.jellyfinId && config?.jellyfinUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={posterUrl(r.jellyfinId, config.jellyfinUrl, 120)} alt="" loading="lazy" />
                  )}
                </span>
                <span className="ref-search-text">
                  <b>{r.title}</b>
                  <small>
                    {[r.year, r.mediaType === 'tv' ? 'Series' : 'Film', r.directors?.split(', ')[0]].filter(Boolean).join(' · ')}
                  </small>
                </span>
                <span className="ref-search-meta" data-none={r.refCount === 0 ? '' : undefined}>
                  {r.refCount === 0 ? t('search.unmapped') : r.refCount === 1 ? t('search.connection') : t('search.connections', { n: r.refCount })}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
