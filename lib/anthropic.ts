/**
 * Anthropic (Claude) Integration — pure HTTP (no SDK, konsisten sama lib/telegram.ts)
 *
 * SERVER-SIDE ONLY, dan cuma dipanggil dari flow admin (lib/connections.ts).
 * Guest TIDAK PERNAH boleh memicu LLM — hasil disimpen permanen di FilmConnection.
 */

import { z } from 'zod';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const MAX_TOKENS = 1500;

export const RELATIONSHIPS = ['homage', 'inspired', 'visual'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export interface FilmReferenceSuggestion {
  title: string;
  year: number | null;
  mediaType: 'movie' | 'tv';
  relationship: Relationship;
  reason: string;
}

function isConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Single-turn call ke Messages API, return teks mentah dari model.
 */
async function complete(params: { system: string; user: string; maxTokens?: number }): Promise<string> {
  if (!isConfigured()) {
    throw new Error('ANTHROPIC_API_KEY belum di-set');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': API_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: params.maxTokens ?? MAX_TOKENS,
      system: params.system,
      messages: [{ role: 'user', content: params.user }],
    }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('[Anthropic] request failed:', res.status, data?.error?.message || data);
    throw new Error(`Anthropic API error ${res.status}`);
  }

  const text = (data?.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  return text;
}

/**
 * Parse JSON array dari output model. Strip code fence kalau model bandel nambahin.
 */
function parseJsonArray(raw: string): unknown[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // Fallback: ambil dari '[' pertama sampai ']' terakhir kalau ada prosa nyasar
  if (!text.startsWith('[')) {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end <= start) throw new Error('Output LLM bukan JSON array');
    text = text.slice(start, end + 1);
  }

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Output LLM bukan JSON array');
  return parsed;
}

const suggestionSchema = z.object({
  title: z.string().min(1),
  year: z.number().int().nullable().optional(),
  mediaType: z.enum(['movie', 'tv']).default('movie'),
  relationship: z.enum(RELATIONSHIPS),
  reason: z.string().min(1),
});

const SYSTEM_PROMPT = `Kamu adalah ahli sejarah sinema. Tugasmu: kasih daftar film/serial yang punya HUBUNGAN REFERENSI NYATA dengan film yang diminta.

Jenis hubungan (relationship):
- "homage": film lain memberi penghormatan/kutipan eksplisit ke film ini, atau sebaliknya
- "inspired": satu film secara terdokumentasi terinspirasi dari yang lain
- "visual": referensi visual/sinematografi/adegan yang bisa diverifikasi

Aturan KERAS:
- Hanya referensi yang nyata dan bisa diverifikasi (pernyataan sutradara, analisis kritikus, kesamaan adegan yang jelas). JANGAN ngarang. Kalau ragu, jangan masukin.
- Boleh film yang lebih lama maupun lebih baru dari film yang diminta.
- Maksimal 8 item. Kalau memang gak ada yang yakin, balikin array kosong [].
- "reason" ditulis dalam Bahasa Indonesia, singkat, maksimal 120 karakter.
- Output HANYA JSON array. Tanpa prosa, tanpa markdown, tanpa code fence.

Skema tiap item:
{"title": "string", "year": 1999, "mediaType": "movie|tv", "relationship": "homage|inspired|visual", "reason": "string"}`;

/**
 * Minta LLM bikin draft daftar referensi buat satu film.
 * Item yang gak lolos validasi di-skip diem-diem (draft ini masih lewat review admin).
 */
export async function suggestFilmReferences(params: {
  title: string;
  year: number | null;
  mediaType: 'movie' | 'tv';
}): Promise<FilmReferenceSuggestion[]> {
  const label = params.mediaType === 'tv' ? 'serial TV' : 'film';
  const user = `Berikan referensi untuk ${label}: "${params.title}"${params.year ? ` (${params.year})` : ''}.`;

  const raw = await complete({ system: SYSTEM_PROMPT, user });
  const items = parseJsonArray(raw);

  const out: FilmReferenceSuggestion[] = [];
  for (const item of items) {
    const result = suggestionSchema.safeParse(item);
    if (!result.success) continue;
    const d = result.data;
    out.push({
      title: d.title.trim(),
      year: d.year ?? null,
      mediaType: d.mediaType,
      relationship: d.relationship,
      reason: d.reason.trim().slice(0, 120),
    });
  }
  return out;
}
