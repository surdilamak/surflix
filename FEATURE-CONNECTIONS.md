# FEATURE-CONNECTIONS.md — Film Reference Graph

> Companion to `CLAUDE.md`. Spec for Claude Code to build the "film reference map" feature.
> Status: **MVP (graph + admin review)**. Path-mode follows in the next phase.

## 🎯 What is this

An interactive feature: from a single film, the guest can see a **reference web** — older/newer films
that connect to each other (homage, inspired by, visual reference). The nodes are shaped like floating
**3D Blu-ray cases**; click one → **watch it right away on Surflix** (Jellyfin deep-link).

Entry point: **per-film** (the "Referensi" button in `detail-modal.tsx`).

## 🔒 Locked Decisions

1. **Reference data = Hybrid (LLM + admin approval).** The LLM drafts, the admin verifies before it goes live.
2. **The LLM only runs when the admin triggers it.** Results are stored permanently in SQLite.
   **Guests NEVER trigger the LLM** — guests only read the `APPROVED` cache. (Saves cost + fast.)
3. **Only films that exist in the Jellyfin library become nodes.** Every node is guaranteed to be watchable right away.
   The source of truth for the library = the **Jellyfin API** (`/Items` + ProviderIds), not Jellyseerr `/media`
   (the Jellyseerr API key is currently user-level — see known issue #1 in CLAUDE.md).
4. **Node = case Blu-ray 3D (three.js).** See the prototype: `surflix-reference-graph-prototype.jsx`.
5. **Click a node → watch on Surflix** via a Jellyfin deep-link (needs `tmdbId → Jellyfin itemId`).
6. **MVP first**: graph + review queue. Path-mode ("watch this first" ordering) = next phase.

## 🧩 Prerequisites (sort out first / in parallel)

- `ANTHROPIC_API_KEY` in the Unraid `.env` — for server-side generation.
- **Jellyfin API key** (Jellyfin Dashboard → API Keys) + internal URL.
  - `JELLYFIN_URL` — example `http://192.168.68.8:8096` or `http://host.docker.internal:8096`
  - `JELLYFIN_API_KEY`
- (Optional but recommended) fix known issue #1 — an admin-level Jellyseerr API key, for `library-stats` accuracy.

## 📊 Data Model (add to `prisma/schema.prisma`)

Follow existing conventions: `String` not enum, `cuid()`, index. No destructive migrations.

```prisma
model FilmConnection {
  id              String   @id @default(cuid())

  // Source film (the one the guest is currently viewing) — must exist in the library
  sourceTmdbId    Int
  sourceMediaType String   // "movie" | "tv"
  sourceTitle     String

  // Target film (the one being referenced)
  targetTmdbId    Int
  targetMediaType String   // "movie" | "tv"
  targetTitle     String
  targetYear      Int?
  targetPoster    String?  // TMDB poster path
  targetJellyfinId String? // Jellyfin itemId for the watch deep-link

  relationship    String   // "homage" | "inspired" | "visual"
  reason          String   // short reason (Indonesian), <= ~120 char

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
| Method | Path | Function |
|--------|------|--------|
| GET | `/api/connections?type=&id=` | Fetch `APPROVED` connections for one film. Return graph-ready JSON (nodes + edges). If none exist yet → return empty, **do not** trigger the LLM. |

### Admin (auth required — mirror the `app/api/admin/approve` pattern)
| Method | Path | Function |
|--------|------|--------|
| POST | `/api/admin/connections/generate` | Body `{ tmdbId, mediaType }`. Run the generate pipeline (see below). Save results as `PENDING_REVIEW`. |
| GET | `/api/admin/connections?status=&sourceTmdbId=` | List for the review queue. |
| POST | `/api/admin/connections` | Body `{ id, action: "approve"\|"reject" }`. Update status + `reviewedAt`. |

## 🧠 Generate Pipeline (`lib/connections.ts`)

```
generate(tmdbId, mediaType):
  1. Fetch source film details (title+year) via lib/jellyseerr.ts (already exists)
  2. Call the LLM (lib/anthropic.ts) -> list of references (JSON)
  3. For each item: resolve to TMDB (search title+year) -> tmdbId + poster
     - resolve fails -> skip
  4. Filter: only those that EXIST in the Jellyfin library (lib/jellyfin.ts) -> get targetJellyfinId
     - not in library -> skip (per decision #3)
  5. Upsert into FilmConnection with status PENDING_REVIEW (@@unique prevents duplicates)
  6. Return a summary for the admin
```

### LLM Prompt (core)
System: ask for **ONLY a JSON array**, no prose/markdown. Stress references that are **real &
verifiable** (homage/inspired/visual), do not make things up. Write the reason in **Indonesian**.

Schema of each item:
```json
{ "title": "string", "year": 1999, "mediaType": "movie|tv",
  "relationship": "homage|inspired|visual", "reason": "string <=120 char (ID)" }
```
Model: use the latest cost-efficient API model (check `docs.claude.com` — example
`claude-sonnet-5-5`). `max_tokens` of ~1500 is enough. Parse safely (strip the code fence if present).

## 🎬 `lib/jellyfin.ts` (new)

Thin, pure HTTP fetch (consistent with the style of `lib/telegram.ts`). Header `X-Emby-Token: <JELLYFIN_API_KEY>`.

- `getLibraryTmdbMap()` → fetch once, cache (10 min, in-memory Map pattern like the other APIs).
  Approximate endpoint:
  `GET {JELLYFIN_URL}/Items?Recursive=true&IncludeItemTypes=Movie,Series&Fields=ProviderIds&HasTmdbId=true`
  Build `Map<tmdbId, jellyfinItemId>`. Verify the response shape against a real instance.
- `watchUrl(jellyfinItemId)` → Jellyfin web deep-link, example:
  `https://streaming.surflix.my.id/web/#/details?id=<itemId>` (confirm the route in the whitelabel).

## 🖥️ Frontend

### `components/connections/connection-graph.tsx` (new)
Port from **`surflix-reference-graph-prototype.jsx`**. Changes:
- Accept `data` (nodes+edges) via props, not the dummy `FILMS`.
- The "Tonton di Surflix" button → opens `watchUrl(node.targetJellyfinId)` (use `useAppConfig` for the base URL).
- Keep: 3D Blu-ray case, floating, drag-rotate, raycast click, line color per `relationship`.
- Mobile-first: full-width, `touch-action: none` on the canvas, clean up three.js on unmount.

### `components/ui/detail-modal.tsx` (edit)
Add a "Referensi" button/tab. Click → fetch `/api/connections?type=&id=` → render `<ConnectionGraph>`.
If empty → empty-state ("Belum ada peta referensi"). **Do not change the existing modal pattern**
(bottom sheet on mobile / centered on desktop) — only add a section.

### `app/(admin)/admin/connections/page.tsx` (new)
Review queue: list `PENDING_REVIEW`, each item has poster + title + relationship + reason +
Approve/Reject buttons (auth & UI pattern mirrors `/admin/pending`). Plus an input to trigger
`generate` from a single film.

## 🗂️ Batch Order

- **Batch 1 (backend core):** `prisma/schema.prisma` (model), `lib/anthropic.ts`,
  `lib/jellyfin.ts`, `lib/connections.ts`. Run `npx prisma db push` (non-destructive).
- **Batch 2 (API):** `/api/admin/connections/generate`, `/api/admin/connections`, `/api/connections`.
- **Batch 3 (UI):** `components/connections/connection-graph.tsx` (port prototype),
  `detail-modal.tsx` integration, `app/(admin)/admin/connections/page.tsx`.
- **Batch 4 (later):** Path-mode (toggle for chronological watch order).

## ✅ Conventions (from CLAUDE.md)

- Guests **never** trigger the LLM. Admin-triggered only.
- `String` not enum (SQLite). cuid + index.
- Do not bump the `package.json` version.
- Descriptive commits (`Batch 1: film connection schema + llm pipeline`).
- Do not refactor existing patterns without discussion.
- `npx prisma db push --accept-data-loss` only if you are sure it is non-destructive.
- Do not commit new env vars: `ANTHROPIC_API_KEY`, `JELLYFIN_API_KEY`.
