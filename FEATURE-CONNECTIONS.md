# FEATURE-CONNECTIONS.md — Film Reference Graph

> Companion ke `CLAUDE.md`. Spec buat Claude Code ngerjain fitur "peta referensi film".
> Status: **MVP (graph + admin review)**. Path-mode nyusul di fase berikutnya.

## 🎯 Apa ini

Fitur interaktif: dari satu film, guest bisa liat **web referensi** — film lama/baru yang
saling nyambung (homage, inspired by, visual reference). Node-nya berbentuk **case Blu-ray 3D**
yang ngambang; di-klik → **langsung nonton di Surflix** (deep-link Jellyfin).

Entry point: **per-film** (tombol "Referensi" di `detail-modal.tsx`).

## 🔒 Keputusan yang udah dikunci

1. **Data referensi = Hybrid (LLM + admin approve).** LLM bikin draft, admin verifikasi sebelum tayang.
2. **LLM cuma jalan pas admin trigger.** Hasil disimpen permanen di SQLite.
   **Guest TIDAK PERNAH memicu LLM** — guest cuma baca cache yang `APPROVED`. (Hemat biaya + cepat.)
3. **Cuma film yang ada di library Jellyfin yang jadi node.** Tiap node dijamin bisa langsung ditonton.
   Sumber kebenaran library = **Jellyfin API** (`/Items` + ProviderIds), bukan Jellyseerr `/media`
   (API key Jellyseerr saat ini user-level — lihat known issue #1 di CLAUDE.md).
4. **Node = case Blu-ray 3D (three.js).** Lihat prototype: `surflix-reference-graph-prototype.jsx`.
5. **Klik node → nonton di Surflix** via deep-link Jellyfin (butuh `tmdbId → Jellyfin itemId`).
6. **MVP dulu**: graph + review queue. Path-mode (urutan "tonton ini dulu") = fase berikutnya.

## 🧩 Prasyarat (beresin dulu / paralel)

- `ANTHROPIC_API_KEY` di `.env` Unraid — buat server-side generate.
- **Jellyfin API key** (Jellyfin Dashboard → API Keys) + URL internal.
  - `JELLYFIN_URL` — contoh `http://192.168.68.8:8096` atau `http://host.docker.internal:8096`
  - `JELLYFIN_API_KEY`
- (Opsional tapi disarankan) fix known issue #1 — API key Jellyseerr admin-level, buat akurasi `library-stats`.

## 📊 Data Model (tambah ke `prisma/schema.prisma`)

Ikut konvensi existing: `String` bukan enum, `cuid()`, index. Jangan destructive migration.

```prisma
model FilmConnection {
  id              String   @id @default(cuid())

  // Film sumber (yang lagi dibuka guest) — harus ada di library
  sourceTmdbId    Int
  sourceMediaType String   // "movie" | "tv"
  sourceTitle     String

  // Film target (yang di-refer)
  targetTmdbId    Int
  targetMediaType String   // "movie" | "tv"
  targetTitle     String
  targetYear      Int?
  targetPoster    String?  // TMDB poster path
  targetJellyfinId String? // Jellyfin itemId buat deep-link nonton

  relationship    String   // "homage" | "inspired" | "visual"
  reason          String   // alasan singkat (Indonesia), <= ~120 char

  // PENDING_REVIEW -> APPROVED | REJECTED
  status          String   @default("PENDING_REVIEW")
  source          String   @default("llm") // "llm" | "admin"

  createdAt       DateTime @default(now())
  reviewedAt      DateTime?

  @@unique([sourceTmdbId, sourceMediaType, targetTmdbId])
  @@index([sourceTmdbId, sourceMediaType, status])
  @@index([status])
}
```

## 🔌 API Routes

### Guest (approved-only, ZERO LLM)
| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/api/connections?type=&id=` | Ambil koneksi `APPROVED` buat satu film. Return graph-ready JSON (nodes + edges). Kalau belum ada → return empty, **jangan** trigger LLM. |

### Admin (auth required — niru pola `app/api/admin/approve`)
| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/admin/connections/generate` | Body `{ tmdbId, mediaType }`. Jalanin pipeline generate (lihat bawah). Simpan hasil `PENDING_REVIEW`. |
| GET | `/api/admin/connections?status=&sourceTmdbId=` | List buat review queue. |
| POST | `/api/admin/connections` | Body `{ id, action: "approve"\|"reject" }`. Update status + `reviewedAt`. |

## 🧠 Pipeline generate (`lib/connections.ts`)

```
generate(tmdbId, mediaType):
  1. Ambil detail film sumber (judul+tahun) via lib/jellyseerr.ts (udah ada)
  2. Panggil LLM (lib/anthropic.ts) -> daftar referensi (JSON)
  3. Buat tiap item: resolve ke TMDB (search judul+tahun) -> tmdbId + poster
     - gagal resolve -> skip
  4. Filter: cuma yang ADA di library Jellyfin (lib/jellyfin.ts) -> dapet targetJellyfinId
     - gak di library -> skip (sesuai keputusan #3)
  5. Upsert ke FilmConnection status PENDING_REVIEW (@@unique cegah duplikat)
  6. Return ringkasan buat admin
```

### Prompt LLM (inti)
System: minta **HANYA JSON array**, tanpa prosa/markdown. Tekankan referensi yang **nyata &
bisa diverifikasi** (homage/inspired/visual), jangan ngarang. Alasan tulis **Bahasa Indonesia**.

Schema tiap item:
```json
{ "title": "string", "year": 1999, "mediaType": "movie|tv",
  "relationship": "homage|inspired|visual", "reason": "string <=120 char (ID)" }
```
Model: pakai model API terbaru yang cost-efficient (cek `docs.claude.com` — contoh
`claude-sonnet-5-5`). `max_tokens` cukup ~1500. Parse aman (strip code fence kalau ada).

## 🎬 `lib/jellyfin.ts` (baru)

Tipis, pure HTTP fetch (konsisten sama gaya `lib/telegram.ts`). Header `X-Emby-Token: <JELLYFIN_API_KEY>`.

- `getLibraryTmdbMap()` → fetch sekali, cache (10 min, pola in-memory Map kaya API lain).
  Endpoint kira-kira:
  `GET {JELLYFIN_URL}/Items?Recursive=true&IncludeItemTypes=Movie,Series&Fields=ProviderIds&HasTmdbId=true`
  Build `Map<tmdbId, jellyfinItemId>`. Verifikasi bentuk response ke instance beneran.
- `watchUrl(jellyfinItemId)` → deep-link web Jellyfin, contoh:
  `https://streaming.surflix.my.id/web/#/details?id=<itemId>` (confirm route di whitelabel).

## 🖥️ Frontend

### `components/connections/connection-graph.tsx` (baru)
Port dari **`surflix-reference-graph-prototype.jsx`**. Ubah:
- Terima `data` (nodes+edges) via props, bukan dummy `FILMS`.
- Tombol "Tonton di Surflix" → buka `watchUrl(node.targetJellyfinId)` (pake `useAppConfig` buat base URL).
- Pertahanin: case Blu-ray 3D, floating, drag-rotate, raycast click, warna garis per `relationship`.
- Mobile-first: full-width, `touch-action: none` di canvas, cleanup three.js on unmount.

### `components/ui/detail-modal.tsx` (edit)
Tambah tombol/tab "Referensi". Klik → fetch `/api/connections?type=&id=` → render `<ConnectionGraph>`.
Kalau kosong → empty-state ("Belum ada peta referensi"). **Jangan ubah pola modal existing**
(bottom sheet mobile / center desktop) — cuma nambah section.

### `app/(admin)/admin/connections/page.tsx` (baru)
Review queue: list `PENDING_REVIEW`, tiap item ada poster + judul + relationship + reason +
tombol Approve/Reject (pola auth & UI niru `/admin/pending`). Plus input buat trigger
`generate` dari satu film.

## 🗂️ Urutan Batch

- **Batch 1 (backend core):** `prisma/schema.prisma` (model), `lib/anthropic.ts`,
  `lib/jellyfin.ts`, `lib/connections.ts`. Jalanin `npx prisma db push` (non-destructive).
- **Batch 2 (API):** `/api/admin/connections/generate`, `/api/admin/connections`, `/api/connections`.
- **Batch 3 (UI):** `components/connections/connection-graph.tsx` (port prototype),
  integrasi `detail-modal.tsx`, `app/(admin)/admin/connections/page.tsx`.
- **Batch 4 (nanti):** Path-mode (toggle urutan tontonan kronologis).

## ✅ Konvensi (dari CLAUDE.md)

- Guest **tidak pernah** memicu LLM. Admin-triggered only.
- `String` bukan enum (SQLite). cuid + index.
- Jangan bump versi `package.json`.
- Commit descriptive (`Batch 1: film connection schema + llm pipeline`).
- Jangan refactor pola existing tanpa diskusi.
- `npx prisma db push --accept-data-loss` cuma kalau yakin non-destructive.
- Env baru jangan di-commit: `ANTHROPIC_API_KEY`, `JELLYFIN_API_KEY`.
