/**
 * Language preference shared by Request Hub and Reference.
 * Stored in the `surflix_lang` cookie on the parent domain (e.g. .surflix.my.id) so the choice
 * carries across subdomains; localStorage is the fallback (local / IP without a parent domain).
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
