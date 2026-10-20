/**
 * TitleIndex — indeks A–Z seluruh judul di library. Judul tanpa peta dibuat redup.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePortal } from '@/lib/hooks/use-portal';
import type { IndexRow } from '@/lib/portal-data';
import { useLang } from './lang-provider';

function letterOf(title: string) {
  const t = title.replace(/^(the|a|an)\s+/i, '').normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const c = t.replace(/^[^A-Za-z0-9]+/, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export function TitleIndex() {
  const { t } = useLang();
  const { portalPath } = usePortal();
  const [rows, setRows] = useState<IndexRow[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch('/api/library/index')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRows(d.titles))
      .catch(() => {});
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, IndexRow[]>();
    for (const r of rows ?? []) {
      if (!showAll && r[4] === 0) continue;
      const l = letterOf(r[2]);
      if (!m.has(l)) m.set(l, []);
      m.get(l)!.push(r);
    }
    return [...m.entries()].sort(([a], [b]) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)));
  }, [rows, showAll]);

  if (!rows) return null;
  const mapped = rows.filter((r) => r[4] > 0).length;

  return (
    <section className="ref-index" id="indeks">
      <div className="ref-index-head">
        <h2 className="ref-display ref-reveal">{t('index.heading')}</h2>
        <div className="ref-reveal">
          <p>{t('index.sub', { n: showAll ? rows.length : mapped })}</p>
          <label className="ref-check">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            {t('index.toggle')}
          </label>
        </div>
      </div>
      <div className="ref-index-cols">
        {groups.map(([letter, list]) => (
          <div key={letter} className="ref-index-group">
            <h3>{letter}</h3>
            <ul>
              {list.map((r) => (
                <li key={`${r[1]}-${r[0]}`} data-dim={r[4] === 0 ? '' : undefined}>
                  <a href={portalPath(`/${r[1]}/${r[0]}`) || '/'} title={r[4] === 0 ? t('index.nomap') : undefined}>
                    {r[2]}
                    {r[3] ? <small> {r[3]}</small> : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
