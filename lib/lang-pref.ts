/**
 * Pilihan bahasa yang dipakai bersama Request Hub dan Reference.
 * Disimpan di cookie `surflix_lang` pada domain induk (mis. .surflix.my.id) supaya pilihan
 * ikut berpindah antar subdomain; localStorage jadi cadangan (lokal / IP tanpa domain induk).
 */
import type { Lang } from './i18n';

const COOKIE = 'surflix_lang';
const LEGACY_KEY = 'ref_lang';

function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'id';
}

function rootDomain(host: string): string | undefined {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined;
  const stripped = host.replace(/^(reference|request|www)\./, '');
  return stripped.includes('.') ? stripped : undefined;
}

export function readLangPref(): Lang | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (isLang(fromUrl)) return fromUrl;
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
    if (m && isLang(m[1])) return m[1];
    const saved = localStorage.getItem(LEGACY_KEY);
    if (isLang(saved)) return saved;
  } catch {}
  return null;
}

export function writeLangPref(l: Lang): void {
  try {
    localStorage.setItem(LEGACY_KEY, l);
    const root = rootDomain(window.location.hostname);
    const domain = root ? `; domain=.${root}` : '';
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000; samesite=lax${domain}${secure}`;
  } catch {}
}
