/**
 * LangProvider — language of Reference and Request Hub (EN default, ID optional). The choice is shared via lib/lang-pref.ts.
 */
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate, relLabel as rel, type Lang } from '@/lib/i18n';
import { readLangPref, writeLangPref } from '@/lib/lang-pref';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  rel: (relationship: string, direction?: 'out' | 'in', kind?: string | null) => string;
  /** Pick the reason text for the language; English falls back to the Indonesian text if missing. */
  reason: (c: { reason: string; reasonEn?: string | null }) => string;
  /** The one-paragraph explanation in the current language, or null if none is written yet. */
  story: (c: { storyEn?: string | null; story?: string | null }) => string | null;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    // ?lang=id is shareable; if absent, use the shared cookie (default English)
    const pick = readLangPref();
    if (pick) setLangState(pick);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    writeLangPref(l);
  }, []);

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      rel: (r, d, k) => rel(lang, r, d, k),
      reason: (c) => (lang === 'en' ? c.reasonEn || c.reason : c.reason || c.reasonEn || ''),
      // No cross-language fallback: a paragraph is written natively per language, and the
      // short reason is the safe fallback when the chosen language has none.
      story: (c) => (lang === 'en' ? c.storyEn : c.story) || null,
    }),
    [lang, setLang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLang must be used inside <LangProvider>');
  return v;
}
