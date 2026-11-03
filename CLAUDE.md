# CLAUDE.md — Surflix Project Context

> This file is read automatically by **Claude Code** (CLI tool) as project context.
> Language policy: everything written down (docs, commit messages, PRs, code comments) is in **English**. Conversation with Idrus is in casual Indonesian.

## 🎬 What is Surflix?

**Surflix** is a custom request platform for a self-hosted Jellyfin media server. Idrus built it as an alternative to the default Jellyseerr UI, with a more premium design and a UX that is friendlier to guests (family, friends) who don't want to deal with accounts.

### Live Deployment
Domain map (as of 2026-05-15):
- **`surflix.my.id`** & **`www.surflix.my.id`** → **Landing page** (this app, `/landing` via middleware): a tile board showing the three sites (Streaming, Request Hub, Surflix Reference). Server component, data from `lib/landing-data.ts`, its own CSS `app/landing/landing.css` (prefix `lp-`), Bricolage Grotesque font, taste-skill direction `dense-tiles`
- **`request.surflix.my.id`** → **Request Hub** (this app, default routes)
- **`reference.surflix.my.id`** → **Surflix Reference** (this app, `/referensi/*` via middleware): a map of how the films/series in the library connect to each other (homage, inspired, visual, remake, universe, director, talent). English default + ID toggle. Admin: `/admin/connections`. Data: `scripts/curated/*.txt` → `scripts/build-connections.js` → `scripts/import-*.js`
- **`streaming.surflix.my.id`** → **Jellyfin** (whitelabeled, separate `~/Developer/jellyfin-whitelabel/` project)

- **Repo**: `github.com/surdilamak/surflix`
- **Docker Image**: `ghcr.io/surdilamak/surflix:latest` (public, amd64 only)
- **Self-hosted on**: Unraid server `192.168.68.8`, port `3737`
- **Reverse proxy**: Nginx Proxy Manager (handles SSL + routing all 5 hostnames)
- **CDN/Tunnel**: Cloudflare Tunnel (`cloudflared`), zone `surflix.my.id` with wildcard route to `192.168.68.8` (NPM)
- **Legacy URLs** (pre-2026-05-15 rebrand): `request.surdilamak.my.id`, `jellyfin.surdilamak.my.id`, and old `www.surflix.my.id` (was Jellyfin) — keep as 301 redirects or let them resolve to landing if still in DNS

### Owner / Admin
- **Name**: Idrus (works at Accenture as UI/UX consultant)
- **GitHub**: `surdilamak`
- **Communication style**: Casual Bahasa Indonesia ("gw" instead of "saya"), mixed with technical English

## 🏗️ Architecture Overview

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for full details.

**TL;DR Stack**:
- Next.js 15 (App Router, React 19) + TypeScript + Tailwind 4 (tokens in `app/globals.css` via `@theme`, no tailwind.config)
- Prisma + SQLite (file:`/data/surflix.db`)
- Iron Session (admin auth, cookie-based)
- bcryptjs (password hashing)
- Framer Motion (animations)
- Lucide React (icons)
- No external library for Telegram — pure HTTP fetch

**Integration Points**:
- **Jellyseerr** (`http://host.docker.internal:5055`) — proxies requests to Radarr/Sonarr → Jellyfin
- **Telegram Bot** — webhook for admin notifications + inline approve/reject
- **Resend** (email) — currently NOT configured, parked

## 🔄 Request Flow (Status Workflow)

```
Guest submit request
  ↓
PENDING_ADMIN  (in the Surflix DB, waiting for Idrus's review)
  ↓ (Admin clicks Approve in the Surflix UI or Telegram)
APPROVED       (in the Surflix DB, being forwarded to Jellyseerr)
  ↓ (Jellyseerr approved it internally)
ON_SCHEDULE    (in Jellyseerr, waiting for Radarr/Sonarr to schedule the download)
  ↓ (Radarr/Sonarr start download — webhook MEDIA_DOWNLOAD)
PROCESSING     (active download)
  ↓ (Download done — webhook MEDIA_AVAILABLE)
AVAILABLE      (ready to watch in Jellyfin)
```

**Reject path**: PENDING_ADMIN → REJECTED (terminal state)
**Failure path**: anywhere → FAILED (terminal state, admin can retry manually)

## 👤 Guest Identification — Cookie-Based

Surflix does **NOT use email** to identify guests. Pattern:
- Guest submits a request → server generates a unique `guestId` (cuid) → returns it to the client
- Client saves `{ name, guestId }` to `localStorage` key `surflix_guest_info`
- Subsequent requests send `guestId` in the body so the server knows it is the same guest
- "My Requests" page fetches via `GET /api/requests/by-guest?id=<guestId>`

**Pros**: Low friction, no email validation, no magic link
**Cons**: Switching device/browser = losing history (acceptable trade-off)

**Schema artifact**: The `Guest.email` field is kept but filled with a dummy `guest-<timestamp>-<rand>@cookie.local` (legacy column from the earlier email-based implementation).

## 🔑 Admin Auth

DB-based username + password (bcrypt hash). Bootstrapped from env vars at startup:

```bash
# In .env (Unraid)
ADMIN_USERNAME=idrus
ADMIN_PASSWORD_HASH=$$2a$$10$$...  # Docker Compose escape ($ → $$)
```

Bootstrap logic in `lib/admin-bootstrap.ts` — runs on first login attempt:
- If the Admin table is empty → create from env
- If it exists but the hash differs → update the password

**Multiple admin support**: schema is already ready, UI delegation is not (TODO).

## 📁 File Structure

```
app/
├── (admin)/                  # Route group for admin pages
│   ├── login/                # /login
│   ├── admin/                # /admin (dashboard)
│   │   ├── pending/          # /admin/pending (approve/reject)
│   │   ├── history/          # /admin/history (all requests timeline)
│   │   └── settings/         # /admin/settings (Telegram setup)
├── (guest)/                  # Route group for guest pages
│   ├── page.tsx              # / (Home with search, categories, trending, upcoming)
│   ├── trending/             # /trending (hero + load more)
│   ├── browse/               # /browse (search + filters + network)
│   ├── library/              # /library (personal + community)
│   ├── requests/             # /requests (cookie-based my requests)
│   └── layout.tsx            # TopNav + Footer + BottomTabBar
├── api/
│   ├── admin/
│   │   ├── login/            # POST/DELETE
│   │   ├── approve/          # POST
│   │   ├── reject/           # POST
│   │   ├── requests/         # GET (list for admin)
│   │   └── stats/            # GET (dashboard stats)
│   ├── telegram/
│   │   ├── webhook/          # POST (Telegram callback)
│   │   └── setup/            # GET/POST (register webhook)
│   ├── webhooks/jellyseerr/  # POST (Jellyseerr status updates)
│   ├── config/               # GET (runtime config — force-dynamic!)
│   ├── trending/             # GET (with pagination)
│   ├── upcoming/             # GET (TMDB upcoming)
│   ├── discover/             # GET (with genre/year/network filters)
│   ├── search/               # GET (Jellyseerr search, encodeURIComponent!)
│   ├── detail/               # GET (rich metadata from Jellyseerr)
│   ├── request/              # POST (guest submit request)
│   ├── requests/by-guest/    # GET (cookie-based lookup)
│   ├── library/              # GET (personal + community)
│   ├── library-stats/        # GET (movies/series count)
│   ├── most-requested/       # GET (aggregate request count)
│   └── health/               # GET (db + jellyseerr health check)
│
components/ui/
├── top-nav.tsx               # Desktop top nav (5 tabs)
├── bottom-tab-bar.tsx        # Mobile bottom nav
├── footer.tsx                # Footer with library stats + rules
├── hero.tsx                  # Hero banner on /trending
├── poster-card.tsx           # Reusable poster card with status badge
├── detail-modal.tsx          # Responsive modal (mobile=bottom sheet, desktop=center)
├── request-form-modal.tsx    # Request form (name + optional notes)
├── quick-filter-chips.tsx    # Category chips on Home
├── empty-state.tsx           # Empty state with action button
├── skeleton.tsx              # Loading skeletons
├── toast.tsx                 # Toast notifications (center top)
└── icons.tsx                 # Lucide React icon exports

lib/
├── jellyseerr.ts             # Jellyseerr API client
├── telegram.ts               # Telegram bot (pure HTTP)
├── email.ts                  # Resend wrapper (currently not used)
├── session.ts                # Iron session helpers
├── db.ts                     # Prisma client singleton
├── admin-bootstrap.ts        # Bootstrap admin from env
├── utils.ts                  # Generic utils (tmdbImage, getYear, cn, etc)
├── rate-limit.ts             # Per-IP rate limiting
└── hooks/
    └── use-app-config.ts     # Runtime config hook (Watch on Surflix link)

prisma/
└── schema.prisma             # Guest, Request, Admin, RateLimit, EventLog
```

## 🛠️ Development Workflow

See [`WORKFLOW.md`](./WORKFLOW.md) for full details.

**Quick reference**:
```bash
# 1. Edit code on the Mac
cd ~/Developer/surflix

# 2. Commit & push
git add . && git commit -m "..." && git push

# 3. GitHub Actions auto-build (~3-5 minutes, amd64-only)
# Monitor: https://github.com/surdilamak/surflix/actions

# 4. On Unraid: pull & restart
ssh root@192.168.68.8
cd /mnt/user/appdata/surflix
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## ⚠️ Known Issues & Parked Items

### 1. Library Stats Stuck 0
**Root cause**: The Jellyseerr API key in .env is user-level and has no access to the `/api/v1/media` or `/api/v1/request` endpoints (403 Forbidden).
**Workaround**: Currently falls back to the local DB count (Surflix-only requests).
**Fix needed**: Regenerate the API key from Settings → General in the Jellyseerr UI with admin permission.
**Update 2026-10-20**: the "stuck 0" cause turned out to also be that the routes `/api/library-stats` (and `/api/upcoming`, `/api/most-requested`) were frozen by Next at build time (static). They are now `force-dynamic`, and stats now come from the `LibraryTitle` snapshot. Backlog: see `BACKLOG.md`.

### 2. APP_URL in .env Is Sometimes Wrong
**Root cause**: The variable can end up filled with `http://192.168.68.8:3737` (host IP) instead of `https://request.surflix.my.id` (public URL).
**Fix**: Make sure it always uses the public HTTPS URL.

### 3. Email (Resend) NOT Configured
The `RESEND_API_KEY` field is empty in .env. Surflix does not send "your request is ready" email notifications. Skipped to simplify setup. Telegram notifications work as an alternative.

### 4. No Multi-Admin UI Yet
The schema supports multi-admin but there is no UI in `/admin/settings` to invite/manage other admins.

### 5. Subtitle Request as a Standalone Feature
Currently there is only a `guestNote` field in the request form (text-based, free-form). The user's suggestion: "Tambah subtitle Indonesia" (Add Indonesian subtitles). There is no dedicated workflow for subtitle-only requests yet.

## 🎨 Design System Quick Reference

> **The full document is in [`design.md`](./design.md)** (2026-10-22): colors, typography, shape, elevation, interaction states, layout, motion, and the list of inspector false positives — for all four surfaces at once. The section below is a per-surface summary; if the two differ, `design.md` is correct.
>
> Since 2026-10-23 that document uses a richer format (modeled on voltagent/awesome-design-md): every color comes with a sentence on **where it is used**, components are written as named entries with their specification and states, spacing and radius have named scales taken from **real usage counts in the CSS**, and there is a **Known Gaps** section that is honest about what is still untidy.
>
> **The accent scale is now six steps**, with measured contrast figures. The easiest rule to break: `--accent` (#ff5200) on white is only **3.25:1** - safe for button fills and large headings, NOT safe for normal-size text. For that there is `--accent-text` (#b83a00, 5.76:1). This violation has happened before and was fixed.
>
> The two most frequently broken rules: **Reference page titles use `--step-display`, do not write a new `font-size`** (there used to be five separate h1 rules, 63–107px), and **button state colors are derived by lightening** (`#ff5200` → hover `#ff6a26` → pressed `#e04800`), not by darkening.

### Request Hub (guest) — tile board, since 2026-10-21
One visual language with the landing, scoped to the `.rq-root` wrapper so admin does not change along with it. CSS: `app/(guest)/request.css` (`rq-*` classes, overrides of `.btn-primary`/`.badge-*`/`.input-ios`/`.tab` only inside `.rq-root`).
- Tailwind tokens (in `@theme` of globals.css): `rq-bg #0d0d0f`, `rq-surface #17171a`, `rq-raised #232327`, `rq-accent #ff5200`, `rq-muted #a3a3ab`; single radius `rounded-rq` (8px).
- Bricolage Grotesque font (in `app/(guest)/layout.tsx`), five size steps: `rq-title` / `rq-h1` / `rq-h2` / `rq-text` / `rq-small`. Page titles max 32px (these are app screens).
- Flat tiles (`rq-tile`), with no glass, gradients, shadows, hairlines, or emoji. A single content width (`rq-wrap`, 1280px) is used by the nav, pages, and footer.
- Buttons: `btn-primary` (orange) and `btn-secondary` (gray); minimum touch target 44px.
- Gate: `lint.mjs` 0 FAIL and `inspect.mjs --app` 0 FAIL at 1440/768/390 for `/`, `/browse`, `/trending`, `/library`, `/requests`.
- Old tokens (`surflix-*`, `ios-*`, `bg-surface`, `rounded-ios-*`) stay alive because admin still uses them.

### Cross-site navigation and language (2026-10-21)
- `components/portal-bar.tsx` (+ `portal-bar.css`, prefix `pb-`): a single one-row bar above the Request Hub (sticky) and Reference: logo + portal name, local links (`nav` slot), Streaming / Request Hub / Reference pills (active = orange #ff5200) and an EN/ID pill. On phones the logo, name, and local links are hidden. Colors via `--pb-*`. Streaming = Jellyfin (new tab, URL from `/api/config`); the landing does not use the bar (it already shows all three sites).
- Language: a single `LangProvider` (`components/connections/lang-provider.tsx`) for Reference and Request Hub, dictionaries in `lib/i18n.ts` + `lib/i18n-hub.ts` (keys `hub.*`, `pb.*`). The choice is stored in the cookie `surflix_lang` on the parent domain (`lib/lang-pref.ts`), so it carries across subdomains. English default.
- Not yet translated: push notifications and server-side text (`lib/notif-messages.ts`, API error messages) are still Indonesian; the landing is still English only.
- Reference 3D case: frame and spine stay blue, with no Blu-ray lettering/banner; front and back use the same poster; the spine carries the title upright and the year.
- Reference uses the same accent and buttons as the landing and Request Hub: orange #ff5200, ink #0d0d0f, radius 8px. Request Hub content width = Reference (full, margin `clamp(16px,2.2vw,32px)`).

### Legacy tokens (admin still uses them)
```
surflix-500 / 600 : pink-red lama
ios-orange/blue/green/red : warna sistem Apple
bg-surface / bg-elevated  : kartu gelap
rounded-ios-lg (18px), rounded-ios-xl (24px), backdrop-blur-ios
```

### Responsive Pattern
Mobile-first with the `md:` breakpoint (768px+) for desktop. Bottom tab bar on mobile, top nav on desktop. Modal becomes a bottom sheet on mobile, centered on desktop.

## 💬 Communication Style Preferences

When working with Idrus:
- **Chat language**: Casual Indonesian ("gw" not "saya", "lo" not "Anda")
- **Written language**: English for everything persisted: docs, commit messages, PR titles/descriptions, code comments (decided 2026-11-03). All existing comments were translated the same day; after any bulk comment edit run `node scripts/verify-comments-only.mjs` to prove no code changed. Existing Indonesian text is translated over time, not rewritten in bulk history.
- **Tone**: Friendly but pragmatic, not too formal
- **Product copy is separate**: user-facing strings and the bilingual `EN || ID` curated text stay bilingual, since that is product content, not documentation
- **Error messages**: Indonesian for user-facing, English for logs
- **Confirmation pattern**: Use the `ask_user_input_v0` tool with single_select / multi_select so it is easy on mobile

## 🔐 Sensitive Information (NOT in this file)

What must **NEVER** be committed to git:
- `TELEGRAM_BOT_TOKEN` — in Unraid .env only
- `TELEGRAM_ADMIN_CHAT_ID` — in Unraid .env only
- `JELLYSEERR_API_KEY` — in Unraid .env only
- `SESSION_SECRET`, `WEBHOOK_SECRET` — in Unraid .env only
- `ADMIN_PASSWORD_HASH` — in Unraid .env (bcrypt, still safe but best practice is to keep it secret)
- `RESEND_API_KEY` — if enabled later

## 🚀 Quick Start (Continuing Development)

If you (Claude Code) are newly joining this project:

1. **Read this CLAUDE.md** (you are reading it right now)
2. **Read `ARCHITECTURE.md`** for the technical deep-dive
3. **Read `WORKFLOW.md`** for dev workflow & deployment
4. **Check `git log --oneline -20`** for recent changes
5. **Verify env vars**: `cat .env.example` (do not read the actual `.env`)
6. **Check current branch**: probably `main`, push directly to main
7. **Ask Idrus** what the focus of the current session is (bug fix? feature? refactor?)

## 📝 Important Decisions Log

Highlights from development history:

- **2026-05-11**: Initial deployment on Unraid succeeded after multiple iterations (npm ci → npm install fix, Prisma SQLite enum → String, Suspense wrap for useSearchParams, Prisma 7 auto-download → bundle v5 binary).
- **2026-05-11**: Decided to skip email-based identification, switch to cookie/localStorage because it is lower-friction.
- **2026-05-12**: Restructured homepage from hero-first to request-first (search + categories), moved trending to a separate `/trending` page.
- **2026-05-12**: Fix multi-word search bug — Jellyseerr strictly needs `%20` (encodeURIComponent), not `+` (URLSearchParams).
- **2026-05-12**: Disable ARM64 build in GitHub Actions — Unraid uses amd64 only, ARM64 emulation makes the build take 30-60 minutes (vs 3-5 minutes amd64-only).
- **2026-05-13**: Implement Telegram bot integration with inline approve/reject buttons. Pure HTTP, no library dependency.
- **2026-05-13**: Add `useAppConfig` hook + `/api/config` (force-dynamic) to solve Next.js standalone stripping `NEXT_PUBLIC_*` env vars at build time.

## 🤖 For Claude Code: Tips

When you work on this project:

1. **Verify changes via git diff** before committing, especially when using multiline replace.
2. **Test locally** if you can (`npm run dev`) — skipping the production build locally is fine.
3. **Don't bump version** in package.json unless Idrus asks.
4. **Don't refactor existing patterns** without talking it over first — your current code is already consistent.
5. **Bundle file changes** as a zip if patches are > 5 files — makes it easier for Idrus to apply.
6. **Always commit with a descriptive message** — Idrus likes tracking history.
7. **Run schema migration carefully** — use `npx prisma db push --accept-data-loss` only if you confirm the field changes are non-destructive.

## When there is a new film/series in Jellyfin (2026-10-22)

The new title **appears immediately** in Just added, search, and the library counts as soon as the library is synced. What is NOT automatic is the connections and the saga — those are hand-curated.

The order, and steps 2–3 **must be run by Idrus** because they need prod access:

```bash
# 1. Prod reads Jellyfin             -> Admin > Settings > Sync library
#    (or automatically in the background on the first visit to Just added)

# 2. Pull the library snapshot into the repo — steps a & b ON THE SERVER, c on the Mac
docker exec surflix node scripts/export-library.js                          # a (prints the 15 youngest titles)
docker cp surflix:/app/scripts/library-seed.json /tmp/library-seed.json     # b
scp root@192.168.68.8:/tmp/library-seed.json scripts/library-seed.json      # c

# 3. Only then can the connections be written
#    write lines in scripts/curated/*.txt, then:
node scripts/build-connections.js
node scripts/build-sagas.js
```

**Why step 2 is mandatory:** `build-connections.js` validates every curated title against `scripts/library-seed.json`. While that file is stale, a new title is treated as "not found" ("gak ketemu") and the builder fails — so no connections can be written for a newly added film. Until 2026-10-22 there was no `export-library.js` at all, so there was no way to pull the library from prod; that has been fixed.

Step 2b uses `/tmp`, not `./scripts`: when SSHing into Unraid the working directory is `/root`, and that folder does not exist there (`invalid output path`).

The list of new titles is read from the `addedAt` column, **not** from comparing against the old file — a file comparison is only correct once, because the first run overwrites its own comparison file.

`library-seed.json` is now formatted like the other two seed files, so that adding one title reads as ~10 lines in the diff, not one 500 KB line. `addedAt` is deliberately not exported: that column is filled from Jellyfin at sync time in each environment.

### Finer relationship labels (`kind`, since 2026-11-03)

A `universe` or `remake` row can carry an optional `kind` so the label says what it is ("Prequel to", "Spin-off of", "Brings back", "Recut of", ...) instead of the generic "Follows" / "Remake of". Template markers (`@prequel`, `@spinoff`, `@cut`, ...) set it automatically; for hand-written rows write it in the relationship column: `universe/prequel`, `remake/retelling`. Allowed kinds per type are in `REL_KINDS` (`lib/i18n.ts`), mirrored in `scripts/build-connections.js`; labels are `rel.<type>.<kind>.out/in` in both languages. A row without a kind is fine and keeps the generic label, which is right for rows that simply follow in the story. When you add a connection whose label would mislead (a prequel, a spin-off, a cameo, a recut), give it a kind. In the admin page (`/admin/connections`) the edit and add forms have a "Label" select that offers the kinds of the chosen type; the API rejects a kind that does not belong to the type and clears a stale kind when the type changes.

### One-paragraph stories (`scripts/curated/stories.txt`, since 2026-11-03)

A connection can carry a paragraph (`storyEn` / `story`, optional columns on `FilmConnection`) on top of its short `reason`. The app shows the paragraph where there is room (the "Why they connect" list and the 3D map panel) and keeps using the short reason everywhere that needs one line (metadata/og description, landing spotlight, the contact sheet). A row without a paragraph simply shows its short reason.

- **Format**, one connection per line: `SOURCE (year) > TARGET (year) | English paragraph || Paragraf Indonesia`. The pair must already exist with the same direction in the other curated files; a pair that only lives in `connections-live.json` has to be backported to `curated/*.txt` first.
- **Rules**: every factual sentence is backed by a quoted source in the `#` comment above it; no invented quotes; no "critics say" without a named critic; no claims about intent unless quoted; each language is written natively. Interpretation is welcome, invented facts are not. `build-connections.js` enforces 200–1100 characters and exactly one `||`.
- **Pipeline** is unchanged: `build-connections.js` -> import into `dev.db` -> `export-connections.js` (omits empty story fields, so `connections-live.json` has no null noise) -> commit. In production the columns appear on their own because the container runs `prisma db push` at start.
- **Do not** let `stories.txt` be read as a connection file: `build-connections.js` and `build-sagas.js` both skip it explicitly.
- **Research method that worked**: one agent per 3-4 pairs, each returning ranked facts with exact quotes and a "do not claim" list, then write the paragraph yourself and re-check each claim against the quotes. Treat any existing short text for a pair as unverified until a source confirms it: a full audit of the homage/inspired/visual/remake rows (2026-11-03) found only 19 of 90 correct as written, 63 needing a rewrite and 8 to be rejected. When an agent rejects a row for "no source found", check one more source yourself before removing it (one such rejection was wrong). The 278 `universe` rows were audited the same day: 222 correct, 55 rewritten, 1 rejected. Template rows (`@sequel`, `@prequel`, ...) were almost always right; the errors were in hand-written sentences and in templates that named the wrong predecessor, so check the predecessor, not just that the two titles are related.

### Pulling review decisions back from prod (`connections-live.json`)

`connections-live.json` is a "snapshot" of admin review decisions (APPROVED/REJECTED, admin-created connections, edits). It ships inside the image, but it is **not automatically loaded into the DB** — and conversely, decisions Idrus makes in `/admin/connections` do not automatically come back to the repo.

**The order must not be reversed: import first, then export.** If you export before importing, the prod DB does not yet contain the newly written curated connections, so the resulting file loses all of them and overwrites the one in the repo.

```bash
# 1. ON THE SERVER — import the new curation into the DB
docker exec surflix node scripts/import-connections.js scripts/connections-live.json --apply

# 2. ON THE SERVER — export back from the DB, then copy to /tmp
docker exec surflix node scripts/export-connections.js
docker cp surflix:/app/scripts/connections-live.json /tmp/connections-live.json

# 3. ON THE MAC — pull it into the repo
scp root@192.168.68.8:/tmp/connections-live.json scripts/connections-live.json
```

Like step 2b above, `docker cp` uses `/tmp` because SSH into Unraid lands in `/root`.

Import **never changes the status of rows that already exist**, so approvals/rejections already made are safe. The consequence: until step 3 has been run, the file in the repo is not the source of truth for review status — **do not quote the pending count from the local file.** This has already caused a wrong report twice ("connection X is still pending" when it had actually been approved).

## Fonts vendored into the repo (2026-10-22)
All four layouts use `next/font/local`, not `next/font/google`. Fetching fonts at build time once broke CI **three times in a single day** (`TypeError: Cannot read properties of null` in `@next/font/dist/google/loader.js`), and the only remedy was pushing an empty commit to re-run the build. Now the build does not touch the network at all.

- `public/fonts/bricolage-var-latin.woff2` (41 KB) → landing, Request Hub, admin. `weight: '400 600'`.
- `public/fonts/schibsted-var-latin.woff2` (47 KB) → Reference. `weight: '400 800'`.
- `bricolage-400.woff` / `bricolage-600.woff` **are still used** by `lib/og.tsx` (Satori needs static files). Do not delete them.

**Variable-font axis trap.** Bricolage Grotesque has three axes (`opsz,wdth,wght`). If the Google Fonts URL is requested with a range `wdth@75..100`, the resulting file **defaults to wdth=75, i.e. condensed**, and the text renders 13% narrower without any error. Request **the weight axis only** (`:wght@400..600`). How to verify: measure the rendered width of sample text before and after the swap — it must be exactly the same (Reference 299px, landing/Hub 302px at 100px font-size for the word "Surflix").

## Tailwind 4 Notes (2026-10-21)
- Utilities live in the `utilities` layer; hand-written CSS (`request.css`, `portal-bar.css`, `landing.css`, `referensi.css`) is unlayered and ALWAYS wins over utilities. Do not put `padding`/`margin` in overrides like `.rq-root .input-ios`, so that `pl-12` etc. still apply.
- The old classes `btn-primary`, `badge-*`, `input-ios`, `tab` are now `@utility` in globals.css; `.rq-root ...` overrides them only in the Request Hub.

## Admin (overhauled 2026-10-21)
- Same visual language as the landing/Request Hub/Reference (tile board, #0d0d0f, accent #ff5200, radius 8px, Bricolage Grotesque). CSS: `app/(admin)/admin.css`, `ad-*` classes inside `.ad-root` (unlayered, so it wins over Tailwind utilities).
- Shell: `app/(admin)/admin/layout.tsx` (server-side session guard) + `components/admin/shell.tsx` (desktop sidebar, top bar + menu on phones). `components/admin/context.tsx` = toast, confirmation dialog, number badges (`/api/admin/counts`, 30-second polling), and `api()` which handles 401.
- Pages: Overview (`/admin`), Requests (`/admin/requests`, Pending + History tabs; TV season selection, bulk actions, quick reject reasons; `/admin/pending` and `/admin/history` redirect here), Reference (`/admin/connections`, Coverage / Review queue / Rejected tabs with Restore), Settings (`/admin/settings`, integration status from `/api/admin/health`: DB, Jellyfin, Jellyseerr + key type, Push, WEBHOOK_SECRET, Resend; library sync; Telegram webhook).
- Admin text is English only. Recent activity enriches events with the title/guest name and hides `admin.login`.

## Reference: additional features (2026-10-21)
- **Per-film preview card**: `/api/og/[type]/[id]` and `/api/og/default` (`lib/og.tsx`, Satori + sharp → JPEG ~70 KB, fonts in `public/fonts`). Used as og:image and twitter:image in the film map layout and the Reference layout.
- **Host-aware sitemap.xml and robots.txt** (`app/sitemap.ts`, `app/robots.ts`): reference.* includes the home page, Galaxy, Just added, and every film map that has connections. Paths ending in .xml/.txt do not go through the middleware, so the host is read directly. After deploy, register `https://reference.surflix.my.id/sitemap.xml` in Google Search Console.
- **Just added** (`/referensi/new`, server component + `just-added-view.tsx`): the newest titles via the `LibraryTitle.addedAt` column (Jellyfin `DateCreated`, filled at sync time; old rows are filled automatically by one background sync on the first visit or the Sync library button).
- **Galaxy preview for admin**: `/api/connections/galaxy?pending=1` is honored only if an admin session exists (the admin cookie is only valid on the host where you logged in, so use `request.surflix.my.id/referensi/galaxy`; the "Preview in Galaxy" button is in the Review queue tab). Connections awaiting review are drawn as dashed orange.
- **Watch order** (2026-10-21): watch order per saga, so a third view alongside the film map and Galaxy.
  - **Pages**: `/referensi/timeline` (index of all sagas, same contact-sheet idiom as the home page) and `/referensi/timeline/[id]` (a single saga). `?film=movie:123` opens the saga directly at that title. The old `?saga=x` links are redirected.
  - **Stage** (`components/connections/saga-stage.tsx`): uses the same `.ref-stage` + `.ref-stage-view` + `.ref-panel` frame as the single-film 3D map, so it feels like one portal. Pan (drag / wheel), pinch or ⌘-scroll to zoom, double-click, −/+/⤢ buttons, and a zoom button. Below 55% the title captions are hidden so it reads as a map. Cards are `<button>`s, keyboard focus brings the camera to that title.
  - **Coverage**: sagas are derived automatically from APPROVED connections with a `universe`/`remake` relation (connected components) — so every title that has a story relationship definitely has a watch order (324 titles, 62 sagas — 7 of them hand-curated). Titles whose relationship is only about style/people (homage, visual, director, talent) deliberately have no order; the index page explains this and the film map shows nothing.
  - **Curation wins**: `scripts/curated/sagas.txt` defines hand-curated sagas (name, tip, lanes, explicit story order). Its titles are "claimed" first and removed from the graph, so a curated saga is not contaminated by the cluster next to it. `@alias <title> | <Name>` only names an automatic cluster. Already curated: Star Wars, MCU, Alien, Westeros, John Wick, The Omen, Dragon Ball, One Piece, Pokémon, Spider-Man, Batman, DC on screen, Evangelion.
  - **Pokémon** (2026-10-22): 28 entries, 4 lanes (Serial anime / Film era demi era / Film garis waktu alternatif / Di luar serial anime). Films are grouped by TV series era (Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos) following the grouping on pokemon.fandom.com. Three easy-to-get-wrong things that have been fixed: **Mewtwo Strikes Back - Evolution (MS022) is the CGI remake of the first film**, not the third film of the alternate timeline, even though its number sits right between MS021 and MS023; **Zoroark (MS013) is a Sinnoh-era film**, not Unova, even though its star is a Unova Pokémon; and **"The Power of One: The Pokémon 2000 Movie Special" is not a film** but a half-hour WB promo special, while the real second film (Japanese release 1999) is not in the library and shows up as "Not on Surflix".
  - **Dual continuities**: Spider-Man, Batman, DC on screen, Kamen Rider, Moana, Digimon, and Kill Bill are curated not because their order differs, but because the automatic builder draws **one straight line through continuities that never meet** (Raimi vs Amazing, Nolan vs Reeves, DCEU vs DCU, three Kamen Riders that only share a brand, animation vs live-action remake, 1999 series vs 2020 reboot, Kill Bill vs Death Proof). If a new cluster contains reboots, check for the same thing.
  - **Orphan-title guard** (`build-sagas.js`, 2026-10-22): a curated saga claims the titles it registers and removes them from the graph. A title that is connected to that saga but **was forgotten in the registration** loses its only partner and ends up stranded without a saga — silently, with no error. This happened to four MCU titles (Marvel Zombies, Punisher: One Last Kill, Spider-Man: Brand New Day, VisionQuest). The builder now prints a `⚠` warning when there are any. **Do not ignore that warning** — it means a title is missing from the portal. Note: the relation field in `connections-live.json` is named `relationship`, not `relation`.
  - **MCU** (audited 2026-10-22): 49 entries, 4 lanes (Film / Serial / Realitas alternatif / Bukan bagian cerita). Two systemic errors were found and fixed — **do not revert them**: (1) Phase 1 used the outdated official chart *The First 10 Years* (2018); the official 2023 timeline book moves Iron Man to 2008 and everything below it shifts. (2) Phases 4–5 were off by one to two years, and three pairs had their order reversed: Wakanda Forever before Love and Thunder, Shang-Chi before Far From Home, Doctor Strange after Homecoming. **Authority**: dates up to Wakanda Forever follow the official 2023 book; after that, the wiki reconstruction (all MCU wiki year pages are marked `{{FanTimeline}}`) — the tip says so. Titles the wiki has not yet placed (Punisher: One Last Kill, VisionQuest) are **given no year at all**, not guessed.
  - **How to research saga facts**: fandom wikis reject ordinary page requests (403) and WebFetch, but **their MediaWiki API works through curl**. Bulbapedia does not work at all (Cloudflare) — use `pokemon.fandom.com`. Proven patterns:
    ```bash
    curl -s -A "Mozilla/5.0" "https://<wiki>.fandom.com/api.php?action=query&list=search&srsearch=QUERY&srlimit=8&format=json"
    curl -s -A "Mozilla/5.0" "https://<wiki>.fandom.com/api.php?action=parse&page=JUDUL&prop=wikitext&format=json"
    ```
    Page titles often have their own prefix (`MS020: ...` on the Pokémon wiki). For a big saga, split it in two and run two parallel agents; ask for a table with a column of quoted evidence and a confidence level, not a narrative.
  - **But check first, don't split blindly**: The Naked Gun and Scary Movie look like exactly the same case and turned out to be **not**. Naked Gun (2025) is Frank Drebin Jr., a sequel to the 1994 film, not a reboot. Scary Movie (2026) is the sixth entry with the original cast (Anna Faris, Regina Hall, Wayans) returning. Both are correct as a single automatic line — **leave them**.
  - **One Piece** (2026-10-22): 28 titles, 5 lanes (Serial anime / Film bioskop / Penceritaan ulang dan rangkuman / Spesial TV / Live action). Unlike Dragon Ball, there is **no official film chronology at all** — according to onepiece.fandom.com only three titles adapt canon arcs (Episode of Arabasta, Episode of Chopper Plus, Episode of East Blue) and Oda does not consider any of the films part of the story, including Strong World, which he wrote himself. So the story-order label here means a **safe watch boundary** read from who is on the crew ("Robin sudah ikut, Going Merry masih berlayar" — Robin has joined, Going Merry is still sailing), not a canon claim. Do not promote it to a canon claim.
  - **Dragon Ball** (2026-10-21): 32 titles, 4 lanes (Kisah utama / Film sampingan / Penceritaan ulang / Masa depan alternatif). Two things make the story order differ greatly from release order: Bardock (released 1990) is the very earliest point at Age 737, and Daima (released 2024, the newest series) is set in Age 775 inside the ten-year gap that closes Z. **The Age calendar is only used on the TV backbone and Bardock** — Toei never gave dates for the side films, so the films are placed per arc ("Namek era", "Cell era"); fan reconstructions on kanzenshuu.com also differ from each other. Do not add Age numbers to side films without an official source.
  - **Automatic story order**: stable topology from the `@prequel`/`@sequel` markers in `scripts/curated/*.txt` plus an "old version first" rule for `remake`, with release order as the base. The Story/Release toggle only appears when the two orders actually differ (`twoOrders`).
  - **Build**: `node scripts/build-sagas.js` → `lib/sagas.json` (committed, ships in the image, no DB import needed). Matched against the library at request time (`listSagas` / `getSaga` / `sagaHere` / `sagaMembership` in `lib/connections.ts`); titles not in the library show as "Not on Surflix" with a link to the Request Hub.
  - **One stage pattern for three views** (2026-10-22): the 3D film map, Watch order, and Galaxy all use a full-width stage with a **floating** panel on the right (`position: absolute`), not a grid column. So that the panel does not bury the content, centering in JS uses the **usable area** = stage width - panel footprint (`insetOf()` in `saga-stage.tsx`, `panelInset()` in `connection-graph.tsx`; both are 0 when the panel is static on phones). The 3D map also shifts its camera by half the panel footprint because its ring is centered and cannot be panned by the user. Details in `design.md`.
  - **Do not capture the wheel gesture on the 3D map**: its stage is in the middle of a page that needs to scroll, so scroll-zoom would trap the page. Galaxy is allowed because it is full-screen height.
  - **Do not use `setPointerCapture` on the stage**: capturing the pointer makes clicks land on the stage, not on the cards (cards become unselectable). Movement is tracked through listeners on `window`.
  - **Inspector notes**: on the saga page there are three false positives. `edge-text` — cards outside the view still have a rect even though they are clipped by the stage's `overflow:hidden`. `few-pictures` — posters are drawn to a canvas, so they do not count as images. `body-size` on big sagas (28+ titles) — the 13px map card labels outnumber the prose, even though the actual reading text is 16px. Run with `--allow edge-text,body-size`; the `eyebrow` ("← All sagas") is a back link, not a kicker.
  - **Cross-linking**: the single-film map shows a snippet of the lane "Part of X · ke-n dari m" (n-th of m) (`.ref-here`, data from the `/api/connections` field `saga`); the Galaxy panel has a Watch order link (`sagas` in `/api/connections/galaxy`); the Reference home hero has a third link.
- Galaxy uses screen height minus bar height (`--bar-h`, measured in `galaxy.tsx`); the landing hero is clipped at the margin (`overflow:hidden` on `.lp-stage`), not at the screen edge.
- `director` connections are created automatically from `scripts/curated/directors.list`, not written per line: the name there is a **lookup key** into Jellyfin's `directors` column, so do not change it for display purposes. Use `| as: Nama EN || Nama ID` if the sentence needs another name (director duos), `| +Judul (tahun)` / `| -Judul (tahun)` to add/exclude films, and write by hand in `06-deepen.txt` if you need a truly specific sentence.
- Be careful when splitting curation lines with `split('|')`: the bilingual separator `||` gets cut too. Join the leftover pieces back together (this has happened in `sagas.txt`, `@lane`, and `as:`).
- **Three lenses on one title** (`components/connections/lens-switch.tsx`, 2026-10-21): the Map / Watch order / Galaxy control that appears on the film map page (above the 3D stage, not below it), the Galaxy panel, and the Watch order panel. It always points to the title currently being viewed (`?film=` / `?select=`), not to the feature's home page. Lenses that do not apply are hidden: without a saga there is no Watch order, without connections there is no Map; if only one remains, the control is not rendered at all.
