/**
 * Language for server components (landing). The `surflix_lang` cookie is shared with Request Hub and Reference;
 * ?lang=id|en in the URL wins so links can be shared. Default English.
 */
import { cookies } from 'next/headers';
import type { Lang } from './i18n';

export async function getServerLang(query?: string | string[]): Promise<Lang> {
  const q = Array.isArray(query) ? query[0] : query;
  if (q === 'en' || q === 'id') return q;
  const c = (await cookies()).get('surflix_lang')?.value;
  return c === 'id' ? 'id' : 'en';
}
