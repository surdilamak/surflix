/**
 * Bahasa untuk server component (landing). Cookie `surflix_lang` dibagi dengan Request Hub dan Reference;
 * ?lang=id|en pada URL menang supaya tautan bisa dibagikan. Default English.
 */
import { cookies } from 'next/headers';
import type { Lang } from './i18n';

export async function getServerLang(query?: string | string[]): Promise<Lang> {
  const q = Array.isArray(query) ? query[0] : query;
  if (q === 'en' || q === 'id') return q;
  const c = (await cookies()).get('surflix_lang')?.value;
  return c === 'id' ? 'id' : 'en';
}
