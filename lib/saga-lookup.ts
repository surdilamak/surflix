/** Which saga (Watch order) a title belongs to, matched by library title and year. */
import sagas from '@/lib/sagas.json';

export function sagaOf(title: string, year: number | null | undefined) {
  if (!year) return null;
  const t = title.toLowerCase();
  const s = (sagas as { id: string; name: string; entries: { title: string; year: number }[] }[]).find((x) =>
    x.entries.some((e) => e.year === year && e.title.toLowerCase() === t)
  );
  return s ? { id: s.id, name: s.name, key: `${title}|${year}` } : null;
}
