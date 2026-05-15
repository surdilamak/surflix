# CLAUDE.md — Surflix Project Context

> File ini dibaca otomatis sama **Claude Code** (CLI tool) sebagai context project.
> Bahasa: Mix Indonesia (narrative) + English (technical/code).

## 🎬 What is Surflix?

**Surflix** adalah custom request platform buat self-hosted Jellyfin media server. Idrus build ini sebagai alternative dari UI default Jellyseerr, dengan design yang lebih premium dan UX yang lebih ramah untuk guest (keluarga, teman) yang gak mau ngurus akun.

### Live Deployment
Domain map (as of 2026-05-15):
- **`surflix.my.id`** & **`www.surflix.my.id`** → **Landing page** (this app, `/landing` route via middleware)
- **`request.surflix.my.id`** → **Request Hub** (this app, default routes)
- **`streaming.surflix.my.id`** → **Jellyfin** (whitelabeled, separate `~/Developer/jellyfin-whitelabel/` project)

- **Repo**: `github.com/surdilamak/surflix`
- **Docker Image**: `ghcr.io/surdilamak/surflix:latest` (public, amd64 only)
- **Self-hosted di**: Unraid server `192.168.68.8`, port `3737`
- **Reverse proxy**: Nginx Proxy Manager (handles SSL + routing all 4 hostnames)
- **CDN/Tunnel**: Cloudflare Tunnel (`cloudflared`), zone `surflix.my.id` with wildcard route to `192.168.68.8` (NPM)
- **Legacy URLs** (pre-2026-05-15 rebrand): `request.surdilamak.my.id`, `jellyfin.surdilamak.my.id`, and old `www.surflix.my.id` (was Jellyfin) — keep as 301 redirects or let them resolve to landing if still in DNS

### Owner / Admin
- **Name**: Idrus (works at Accenture as UI/UX consultant)
- **GitHub**: `surdilamak`
- **Communication style**: Bahasa Indonesia casual ("gw" instead of "saya"), mixed dengan technical English

## 🏗️ Architecture Overview

Lihat [`ARCHITECTURE.md`](./ARCHITECTURE.md) buat detail lengkap.

**TL;DR Stack**:
- Next.js 14 (App Router) + TypeScript + Tailwind
- Prisma + SQLite (file:`/data/surflix.db`)
- Iron Session (admin auth, cookie-based)
- bcryptjs (password hashing)
- Framer Motion (animations)
- Lucide React (icons)
- No external library buat Telegram — pure HTTP fetch

**Integration Points**:
- **Jellyseerr** (`http://host.docker.internal:5055`) — proxy request ke Radarr/Sonarr → Jellyfin
- **Telegram Bot** — webhook untuk admin notif + inline approve/reject
- **Resend** (email) — currently NOT configured, parked

## 🔄 Request Flow (Status Workflow)

```
Guest submit request
  ↓
PENDING_ADMIN  (di Surflix DB, nunggu Idrus review)
  ↓ (Admin klik Approve di Surflix UI atau Telegram)
APPROVED       (di Surflix DB, lagi forward ke Jellyseerr)
  ↓ (Jellyseerr berhasil approve internally)
ON_SCHEDULE    (di Jellyseerr, nunggu Radarr/Sonarr schedule download)
  ↓ (Radarr/Sonarr start download — webhook MEDIA_DOWNLOAD)
PROCESSING     (active download)
  ↓ (Download done — webhook MEDIA_AVAILABLE)
AVAILABLE      (siap ditonton di Jellyfin)
```

**Reject path**: PENDING_ADMIN → REJECTED (terminal state)
**Failure path**: anywhere → FAILED (terminal state, admin can retry manually)

## 👤 Guest Identification — Cookie-Based

Surflix **TIDAK pakai email** buat identifikasi guest. Pattern:
- Guest submit request → server generate unique `guestId` (cuid) → return ke client
- Client save `{ name, guestId }` ke `localStorage` key `surflix_guest_info`
- Subsequent request kirim `guestId` di body biar server tau ini guest yang sama
- "My Requests" page fetch via `GET /api/requests/by-guest?id=<guestId>`

**Pros**: Low friction, no email validation, no magic link
**Cons**: Switch device/browser = kehilangan history (acceptable trade-off)

**Schema artifact**: Field `Guest.email` di-keep tapi diisi dummy `guest-<timestamp>-<rand>@cookie.local` (legacy column from earlier email-based implementation).

## 🔑 Admin Auth

DB-based username + password (bcrypt hash). Bootstrap dari env vars saat startup:

```bash
# Di .env (Unraid)
ADMIN_USERNAME=idrus
ADMIN_PASSWORD_HASH=$$2a$$10$$...  # Docker Compose escape ($ → $$)
```

Bootstrap logic di `lib/admin-bootstrap.ts` — run on first login attempt:
- Kalau Admin table kosong → create dari env
- Kalau ada tapi hash beda → update password

**Multiple admin support**: schema udah ready, UI delegation belum (TODO).

## 📁 File Structure

```
app/
├── (admin)/                  # Route group untuk admin pages
│   ├── login/                # /login
│   ├── admin/                # /admin (dashboard)
│   │   ├── pending/          # /admin/pending (approve/reject)
│   │   ├── history/          # /admin/history (all requests timeline)
│   │   └── settings/         # /admin/settings (Telegram setup)
├── (guest)/                  # Route group untuk guest pages
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
├── footer.tsx                # Footer dengan library stats + rules
├── hero.tsx                  # Hero banner di /trending
├── poster-card.tsx           # Reusable poster card with status badge
├── detail-modal.tsx          # Responsive modal (mobile=bottom sheet, desktop=center)
├── request-form-modal.tsx    # Request form (name + optional notes)
├── quick-filter-chips.tsx    # Category chips di Home
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

Lihat [`WORKFLOW.md`](./WORKFLOW.md) buat detail lengkap.

**Quick reference**:
```bash
# 1. Edit code di Mac
cd ~/Developer/surflix

# 2. Commit & push
git add . && git commit -m "..." && git push

# 3. GitHub Actions auto-build (~3-5 menit, amd64-only)
# Monitor: https://github.com/surdilamak/surflix/actions

# 4. Di Unraid: pull & restart
ssh root@192.168.68.8
cd /mnt/user/appdata/surflix
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## ⚠️ Known Issues & Parked Items

### 1. Library Stats Stuck 0
**Root cause**: Jellyseerr API key di .env adalah user-level, gak punya akses `/api/v1/media` atau `/api/v1/request` endpoint (403 Forbidden).
**Workaround**: Saat ini fallback ke local DB count (Surflix-only requests).
**Fix needed**: Regenerate API key dari Settings → General Jellyseerr UI dengan admin permission.

### 2. APP_URL di .env Sometimes Salah
**Root cause**: Variable bisa keisi sama `http://192.168.68.8:3737` (IP host) instead of `https://request.surflix.my.id` (public URL).
**Fix**: Pastiin always pakai public HTTPS URL.

### 3. Email (Resend) NOT Configured
Field `RESEND_API_KEY` kosong di .env. Surflix gak kirim email notif "your request is ready". Skipped buat sederhanakan setup. Telegram notif jalan jadi alternative.

### 4. Multi-Admin UI Belum Ada
Schema support multi-admin tapi belum ada UI di `/admin/settings` buat invite/manage admin lain.

### 5. Subtitle Request Sebagai Standalone Feature
Saat ini cuma ada `guestNote` field di request form (text-based, free-form). User suggestion-nya: "Tambah subtitle Indonesia". Belum ada dedicated workflow untuk subtitle-only request.

## 🎨 Design System Quick Reference

### Colors (Tailwind custom)
```
surflix-500    : Brand pink-red (#E63946 or similar)
surflix-600    : Darker variant
ios-orange     : Apple system orange
ios-blue       : Apple system blue
ios-green      : Apple system green
ios-red        : Apple system red
bg-surface     : Card background (dark)
bg-elevated    : Slightly elevated dark
```

### Typography
- Default: SF Pro (system font)
- Tracking: tight/tighter untuk headings
- Body: 13-14px default, scale up untuk desktop

### Patterns
- **Glass effect**: `backdrop-blur-ios` + `bg-black/70`
- **Border radius**: `rounded-ios-lg` (18px), `rounded-ios-xl` (24px)
- **Hover state**: scale 1.05 + opacity transitions
- **Loading**: skeleton with `animate-pulse bg-white/[0.04]`

### Responsive Pattern
Mobile-first dengan `md:` breakpoint (768px+) untuk desktop. Bottom tab bar di mobile, top nav di desktop. Modal jadi bottom sheet di mobile, centered di desktop.

## 💬 Communication Style Preferences

When working with Idrus:
- **Bahasa**: Casual Indonesia ("gw" not "saya", "lo" not "Anda")
- **Tone**: Friendly but pragmatic, gak terlalu formal
- **Code comments**: Boleh in Indonesia, especially untuk business logic
- **Error messages**: Indonesian untuk user-facing, English for logs
- **Confirmation pattern**: Use `ask_user_input_v0` tool dengan single_select / multi_select biar gampang di mobile

## 🔐 Sensitive Information (NOT in this file)

Yang **NEVER** di-commit ke git:
- `TELEGRAM_BOT_TOKEN` — di .env Unraid only
- `TELEGRAM_ADMIN_CHAT_ID` — di .env Unraid only
- `JELLYSEERR_API_KEY` — di .env Unraid only
- `SESSION_SECRET`, `WEBHOOK_SECRET` — di .env Unraid only
- `ADMIN_PASSWORD_HASH` — di .env Unraid (bcrypt, masih aman tapi best practice di-keep secret)
- `RESEND_API_KEY` — kalau nanti di-enable

## 🚀 Quick Start (Continuing Development)

Kalau lo (Claude Code) baru join project ini:

1. **Read this CLAUDE.md** (lo lagi baca ini sekarang)
2. **Read `ARCHITECTURE.md`** untuk technical deep-dive
3. **Read `WORKFLOW.md`** untuk dev workflow & deployment
4. **Check `git log --oneline -20`** untuk recent changes
5. **Verify env vars**: `cat .env.example` (jangan baca actual `.env`)
6. **Check current branch**: probably `main`, push langsung ke main
7. **Ask Idrus** apa fokus current session (bug fix? feature? refactor?)

## 📝 Important Decisions Log

Highlights dari development history:

- **2026-05-11**: Initial deployment di Unraid berhasil setelah multiple iterations (npm ci → npm install fix, Prisma SQLite enum → String, Suspense wrap untuk useSearchParams, Prisma 7 auto-download → bundle v5 binary).
- **2026-05-11**: Decided untuk skip email-based identification, switch ke cookie/localStorage karena lebih low-friction.
- **2026-05-12**: Restructured homepage dari hero-first ke request-first (search + categories), pindahin trending ke `/trending` page terpisah.
- **2026-05-12**: Fix multi-word search bug — Jellyseerr strictly butuh `%20` (encodeURIComponent), bukan `+` (URLSearchParams).
- **2026-05-12**: Disable ARM64 build di GitHub Actions — Unraid pakai amd64 only, ARM64 emulation bikin build 30-60 menit (vs 3-5 menit amd64-only).
- **2026-05-13**: Implement Telegram bot integration dengan inline approve/reject buttons. Pure HTTP, no library dependency.
- **2026-05-13**: Add `useAppConfig` hook + `/api/config` (force-dynamic) buat solve Next.js standalone yang strip `NEXT_PUBLIC_*` env vars at build time.

## 🤖 For Claude Code: Tips

Pas lo work di project ini:

1. **Verify changes via git diff** sebelum commit, terutama kalau pake multiline replace.
2. **Test locally** kalau bisa (`npm run dev`) — bisa skip production build di local.
3. **Don't bump version** di package.json kecuali Idrus minta.
4. **Don't refactor existing patterns** tanpa ngajak ngobrol — code lo sekarang udah konsisten.
5. **Bundle file changes** sebagai zip kalau patches > 5 files — gampangin Idrus apply.
6. **Always commit dengan descriptive message** — Idrus suka tracking history.
7. **Run schema migration carefully** — pakai `npx prisma db push --accept-data-loss` cuma kalau lo confirm field changes are non-destructive.
