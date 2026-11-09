/**
 * Title facts on the film page: what a visitor needs to decide if a title is worth watching.
 *
 *  - TitleScores: the scores that are available (IMDb, Rotten Tomatoes, Metacritic, TMDB), as a row of
 *    chips. Sits right under the title, because "is it good?" is the first question about a film.
 *  - TitleAbout: synopsis, runtime, genres, who made it and the cast. Sits below the map, so the map
 *    stays the first thing on a Reference page.
 *  - TitleFacts: both, stacked, for a film that has no map yet (the page would otherwise be empty).
 *
 * All three read the same cached request. A score without a source is left out; if nothing loads they
 * render nothing, so the page never breaks because of a third-party source.
 */
'use client';

import { useEffect, useState } from 'react';
import { useLang } from './lang-provider';
import type { TitleFacts as Facts } from '@/lib/title-facts';

const inflight = new Map<string, Promise<Facts | null>>();
function load(type: string, id: string | number): Promise<Facts | null> {
  const key = `${type}-${id}`;
  let p = inflight.get(key);
  if (!p) {
    p = fetch(`/api/title-facts?type=${type}&id=${id}`)
      .then((r) => (r.ok ? (r.json() as Promise<Facts>) : null))
      .catch(() => null);
    inflight.set(key, p);
    p.then((v) => v ?? inflight.delete(key)); // do not remember a failure
  }
  return p;
}

/** Start the request early (the page calls this on mount, before its map data has arrived). */
export function prefetchTitleFacts(type: string, id: string | number): void {
  void load(type, id);
}

function useFacts(type: string, id: string | number): Facts | null | undefined {
  const [facts, setFacts] = useState<Facts | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setFacts(undefined);
    load(type, id).then((f) => live && setFacts(f));
    return () => {
      live = false;
    };
  }, [type, id]);
  return facts;
}

function ScoreChips({ facts }: { facts: Facts }) {
  const { t } = useLang();
  const s = facts.scores;
  const chips: Array<{ key: string; label: string; value: string; note?: string }> = [];
  if (s.imdb) chips.push({ key: 'imdb', label: 'IMDb', value: s.imdb.value.toFixed(1), note: '/10' });
  if (s.rottenTomatoes?.critics != null) chips.push({ key: 'rt', label: 'Rotten Tomatoes', value: `${Math.round(s.rottenTomatoes.critics)}%` });
  if (s.rottenTomatoes?.audience != null) chips.push({ key: 'rta', label: t('facts.audience'), value: `${Math.round(s.rottenTomatoes.audience)}%` });
  if (s.metacritic) chips.push({ key: 'mc', label: 'Metacritic', value: String(Math.round(s.metacritic.value)), note: '/100' });
  if (s.tmdb) chips.push({ key: 'tmdb', label: 'TMDB', value: s.tmdb.value.toFixed(1), note: '/10' });
  if (chips.length === 0) return null;
  return (
    <ul className="ref-scores" aria-label={t('facts.scores')}>
      {chips.map((c) => (
        <li key={c.key}>
          <b>
            {c.value}
            {c.note && <small>{c.note}</small>}
          </b>
          <span>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

function AboutBlock({ facts }: { facts: Facts }) {
  const { t } = useLang();
  const crew = facts.director
    ? { label: t('facts.director'), value: facts.director }
    : facts.creators?.length
      ? { label: t('facts.creators'), value: facts.creators.join(', ') }
      : null;
  const meta = [
    facts.runtime ? t('facts.runtime', { n: facts.runtime }) : null,
    facts.seasons ? t(facts.seasons === 1 ? 'facts.season' : 'facts.seasons', { n: facts.seasons }) : null,
    facts.genres.length ? facts.genres.join(' · ') : null,
  ].filter(Boolean);
  if (!facts.overview && meta.length === 0 && !crew && facts.cast.length === 0) return null;
  return (
    <>
      {facts.overview && (
        <div className="ref-facts-text">
          <h2>{t('facts.synopsis')}</h2>
          {facts.tagline && <p className="ref-facts-tag">{facts.tagline}</p>}
          <p>{facts.overview}</p>
        </div>
      )}
      <dl className="ref-facts-meta">
        {meta.length > 0 && (
          <div>
            <dt>{t('facts.about')}</dt>
            <dd>{meta.join('  ·  ')}</dd>
          </div>
        )}
        {crew && (
          <div>
            <dt>{crew.label}</dt>
            <dd>{crew.value}</dd>
          </div>
        )}
        {facts.cast.length > 0 && (
          <div>
            <dt>{t('facts.cast')}</dt>
            <dd>{facts.cast.join(', ')}</dd>
          </div>
        )}
      </dl>
    </>
  );
}

type Props = { type: string; id: string | number };

export function TitleScores({ type, id }: Props) {
  const facts = useFacts(type, id);
  // keep the row's space while loading, so the buttons and the map do not jump when the scores arrive
  if (facts === undefined) return <div className="ref-scores ref-scores--wait" aria-hidden="true" />;
  if (!facts) return null;
  return <ScoreChips facts={facts} />;
}

export function TitleAbout({ type, id }: Props) {
  const { t } = useLang();
  const facts = useFacts(type, id);
  if (!facts) return null;
  return (
    <section className="ref-facts ref-facts--about" aria-label={t('facts.title')}>
      <AboutBlock facts={facts} />
    </section>
  );
}

export function TitleFacts({ type, id }: Props) {
  const { t } = useLang();
  const facts = useFacts(type, id);
  if (facts === undefined) return <div className="ref-facts ref-facts--wait" aria-busy="true" />;
  if (!facts) return null;
  return (
    <section className="ref-facts" aria-label={t('facts.title')}>
      <ScoreChips facts={facts} />
      <AboutBlock facts={facts} />
    </section>
  );
}
