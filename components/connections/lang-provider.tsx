/**
 * LangProvider — bahasa portal (EN default, ID pilihan). Pilihan disimpan di localStorage.
 */
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate, relLabel as rel, type Lang } from '@/lib/i18n';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  rel: (relationship: string, direction?: 'out' | 'in') => string;
  /** Pilih teks alasan sesuai bahasa; Inggris jatuh ke teks Indonesia kalau belum ada. */
  reason: (c: { reason: string; reasonEn?: string | null }) => string;
}

const Ctx = createContext<LangCtx | null>(null);
const KEY = 'ref_lang';

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    // ?lang=id bisa dibagikan; kalau gak ada, pakai pilihan terakhir (default English)
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    const saved = localStorage.getItem(KEY);
    const pick = fromUrl === 'en' || fromUrl === 'id' ? fromUrl : saved;
    if (pick === 'en' || pick === 'id') setLangState(pick);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  }, []);

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      rel: (r, d) => rel(lang, r, d),
      reason: (c) => (lang === 'en' ? c.reasonEn || c.reason : c.reason || c.reasonEn || ''),
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
