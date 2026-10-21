/**
 * Gambar preview (1200x630) untuk Surflix Reference: poster di kiri, judul, jumlah koneksi, dan tiga
 * koneksi terkuat di kanan. Dipakai route /api/og/[type]/[id] dan /api/og/default.
 * Font Bricolage Grotesque dibaca dari public/fonts (ikut ke image standalone).
 */
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { relLabel } from '@/lib/i18n';
import { REL_COLOR } from '@/lib/portal-data';

const W = 1200;
const H = 630;
const BG = '#05070a';
const INK = '#ffffff';
const MUTED = '#a9aebd';
const ACCENT = '#ff5200';

let fonts: Array<{ name: string; data: Buffer; weight: 400 | 600; style: 'normal' }> | null = null;
function loadFonts() {
  if (fonts) return fonts;
  const dir = path.join(process.cwd(), 'public', 'fonts');
  try {
    fonts = ([400, 600] as const).map((weight) => ({
      name: 'Bricolage',
      data: fs.readFileSync(path.join(dir, `bricolage-${weight}.woff`)),
      weight,
      style: 'normal' as const,
    }));
  } catch {
    fonts = [];
  }
  return fonts;
}

async function fetchPoster(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

export interface OgFilm {
  title: string;
  year: number | null;
  connections: number;
  posterUrl: string | null;
  related: Array<{ relationship: string; direction: 'out' | 'in'; title: string; year: number | null }>;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** PNG dari Satori bisa 400 KB+ kalau ada foto; WhatsApp melewatkan preview besar. JPEG mutu 82 hanya sekitar 80 KB. */
async function asJpeg(res: ImageResponse): Promise<Response> {
  const png = Buffer.from(await res.arrayBuffer());
  const jpg = await sharp(png).flatten({ background: BG }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { ...headers, 'content-type': 'image/jpeg' } });
}

const headers = { 'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' };

export async function filmCard(f: OgFilm): Promise<Response> {
  const poster = await fetchPoster(f.posterUrl);
  const f2 = loadFonts();
  const titleSize = f.title.length > 38 ? 54 : f.title.length > 22 ? 64 : 76;
  return asJpeg(new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', background: BG, color: INK, fontFamily: 'Bricolage', padding: 56 }}>
        <div
          style={{
            width: 342, height: 518, display: 'flex', borderRadius: 8, overflow: 'hidden', flexShrink: 0,
            background: '#17171a', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} width={342} height={518} style={{ objectFit: 'cover' }} alt="" />
          ) : (
            <div style={{ display: 'flex', fontSize: 28, color: MUTED, padding: 24, textAlign: 'center' }}>{clip(f.title, 40)}</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 56, flex: 1, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, color: ACCENT, letterSpacing: -0.5 }}>Surflix Reference</div>
            <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 600, lineHeight: 1.02, letterSpacing: -2.4, marginTop: 22 }}>
              {clip(f.title, 56)}
            </div>
            <div style={{ display: 'flex', fontSize: 30, color: MUTED, marginTop: 18 }}>
              {f.year ? <span style={{ display: 'flex', marginRight: 14 }}>{f.year}</span> : null}
              {f.year ? <span style={{ display: 'flex', marginRight: 14 }}>·</span> : null}
              {f.connections > 0 ? (
                <span style={{ display: 'flex', color: INK }}>
                  {f.connections} {f.connections === 1 ? 'connection' : 'connections'}
                </span>
              ) : (
                <span style={{ display: 'flex' }}>map in progress</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {f.related.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', fontSize: 28, marginTop: i ? 14 : 0 }}>
                <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 14, background: REL_COLOR[r.relationship] ?? MUTED, marginRight: 16, flexShrink: 0 }} />
                <div style={{ display: 'flex', color: MUTED, marginRight: 12, flexShrink: 0, whiteSpace: 'nowrap' }}>{relLabel('en', r.relationship, r.direction)}</div>
                <div style={{ display: 'flex', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {clip(r.title, 24)}
                  {r.year ? ` (${r.year})` : ''}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', fontSize: 22, color: MUTED, marginTop: 28 }}>reference.surflix.my.id</div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: f2, headers }
  ));
}

export async function defaultCard(): Promise<Response> {
  const f2 = loadFonts();
  return asJpeg(new ImageResponse(
    (
      <div
        style={{
          width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: BG, color: INK,
          fontFamily: 'Bricolage', padding: 72,
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: ACCENT }}>Surflix Reference</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 132, fontWeight: 600, lineHeight: 0.95, letterSpacing: -6 }}>Every film</div>
          <div style={{ display: 'flex', fontSize: 132, fontWeight: 600, lineHeight: 0.95, letterSpacing: -6 }}>leaves a trail.</div>
          <div style={{ display: 'flex', fontSize: 30, color: MUTED, marginTop: 28 }}>
            Homages, borrowed looks, shared directors and shared universes.
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>reference.surflix.my.id</div>
      </div>
    ),
    { width: W, height: H, fonts: f2, headers }
  ));
}
