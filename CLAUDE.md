# CLAUDE.md — Surflix Project Context

> File ini dibaca otomatis sama **Claude Code** (CLI tool) sebagai context project.
> Bahasa: Mix Indonesia (narrative) + English (technical/code).

## 🎬 What is Surflix?

**Surflix** adalah custom request platform buat self-hosted Jellyfin media server. Idrus build ini sebagai alternative dari UI default Jellyseerr, dengan design yang lebih premium dan UX yang lebih ramah untuk guest (keluarga, teman) yang gak mau ngurus akun.

### Live Deployment
Domain map (as of 2026-05-15):
- **`surflix.my.id`** & **`www.surflix.my.id`** → **Landing page** (this app, `/landing` via middleware): papan ubin yang memperlihatkan tiga situs (Streaming, Request Hub, Surflix Reference). Server component, data dari `lib/landing-data.ts`, CSS sendiri `app/landing/landing.css` (prefix `lp-`), font Bricolage Grotesque, direction taste-skill `dense-tiles`
- **`request.surflix.my.id`** → **Request Hub** (this app, default routes)
- **`reference.surflix.my.id`** → **Surflix Reference** (this app, `/referensi/*` via middleware): peta bagaimana film/serial di library saling terhubung (homage, inspired, visual, remake, universe, director, talent). English default + toggle ID. Admin: `/admin/connections`. Data: `scripts/curated/*.txt` → `scripts/build-connections.js` → `scripts/import-*.js`
- **`streaming.surflix.my.id`** → **Jellyfin** (whitelabeled, separate `~/Developer/jellyfin-whitelabel/` project)

- **Repo**: `github.com/surdilamak/surflix`
- **Docker Image**: `ghcr.io/surdilamak/surflix:latest` (public, amd64 only)
- **Self-hosted di**: Unraid server `192.168.68.8`, port `3737`
- **Reverse proxy**: Nginx Proxy Manager (handles SSL + routing all 5 hostnames)
- **CDN/Tunnel**: Cloudflare Tunnel (`cloudflared`), zone `surflix.my.id` with wildcard route to `192.168.68.8` (NPM)
- **Legacy URLs** (pre-2026-05-15 rebrand): `request.surdilamak.my.id`, `jellyfin.surdilamak.my.id`, and old `www.surflix.my.id` (was Jellyfin) — keep as 301 redirects or let them resolve to landing if still in DNS

### Owner / Admin
- **Name**: Idrus (works at Accenture as UI/UX consultant)
- **GitHub**: `surdilamak`
- **Communication style**: Bahasa Indonesia casual ("gw" instead of "saya"), mixed dengan technical English

## 🏗️ Architecture Overview

Lihat [`ARCHITECTURE.md`](./ARCHITECTURE.md) buat detail lengkap.

**TL;DR Stack**:
- Next.js 15 (App Router, React 19) + TypeScript + Tailwind 4 (token di `app/globals.css` lewat `@theme`, tanpa tailwind.config)
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
**Update 2026-10-20**: penyebab "stuck 0" ternyata juga karena route `/api/library-stats` (dan `/api/upcoming`, `/api/most-requested`) dibekukan Next saat build (statis). Sudah `force-dynamic`, dan stats sekarang dari snapshot `LibraryTitle`. Backlog: lihat `BACKLOG.md`.

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

> **Dokumen lengkapnya ada di [`design.md`](./design.md)** (2026-10-22): warna, tipografi, bentuk, elevasi, status interaksi, layout, motion, dan daftar positif palsu inspector — untuk keempat permukaan sekaligus. Bagian di bawah ini ringkasan per permukaan; kalau keduanya berbeda, `design.md` yang benar.
>
> Sejak 2026-10-23 dokumen itu memakai format yang lebih kaya (dicontoh dari voltagent/awesome-design-md): setiap warna disertai kalimat **di mana ia dipakai**, komponen ditulis sebagai entri bernama dengan spesifikasi dan keadaannya, spasi dan radius punya skala bernama yang diambil dari **hitungan pemakaian nyata di CSS**, dan ada bagian **Known Gaps** yang jujur soal apa yang belum rapi.
>
> **Skala aksen sekarang enam langkah**, dengan angka kontras yang diukur. Yang paling mudah dilanggar: `--accent` (#ff5200) di atas putih cuma **3,25:1** - aman untuk isian tombol dan judul besar, TIDAK aman untuk teks ukuran normal. Untuk itu ada `--accent-text` (#b83a00, 5,76:1). Pelanggarannya sudah pernah terjadi dan diperbaiki.
>
> Dua aturan yang paling sering dilanggar: **judul halaman Reference memakai `--step-display`, jangan tulis `font-size` baru** (dulu ada lima aturan h1 terpisah, 63–107px), dan **warna status tombol diturunkan dengan menerang** (`#ff5200` → hover `#ff6a26` → ditekan `#e04800`), bukan menggelap.

### Request Hub (guest) — papan ubin, sejak 2026-10-21
Satu bahasa visual dengan landing, dibatasi di wrapper `.rq-root` supaya admin tidak ikut berubah. CSS: `app/(guest)/request.css` (kelas `rq-*`, override `.btn-primary`/`.badge-*`/`.input-ios`/`.tab` hanya di dalam `.rq-root`).
- Token Tailwind (di `@theme` globals.css): `rq-bg #0d0d0f`, `rq-surface #17171a`, `rq-raised #232327`, `rq-accent #ff5200`, `rq-muted #a3a3ab`; radius tunggal `rounded-rq` (8px).
- Font Bricolage Grotesque (di `app/(guest)/layout.tsx`), lima langkah ukuran: `rq-title` / `rq-h1` / `rq-h2` / `rq-text` / `rq-small`. Judul halaman maksimal 32px (ini layar aplikasi).
- Ubin datar (`rq-tile`), tanpa kaca, gradien, bayangan, garis tipis, atau emoji. Satu lebar isi (`rq-wrap`, 1280px) dipakai nav, halaman, dan footer.
- Tombol: `btn-primary` (oranye) dan `btn-secondary` (abu); target sentuh minimal 44px.
- Gate: `lint.mjs` 0 FAIL dan `inspect.mjs --app` 0 FAIL di 1440/768/390 untuk `/`, `/browse`, `/trending`, `/library`, `/requests`.
- Token lama (`surflix-*`, `ios-*`, `bg-surface`, `rounded-ios-*`) tetap hidup karena admin masih memakainya.

### Navigasi dan bahasa lintas situs (2026-10-21)
- `components/portal-bar.tsx` (+ `portal-bar.css`, prefix `pb-`): satu bar satu baris di atas Request Hub (sticky) dan Reference: logo + nama portal, tautan lokal (slot `nav`), pill Streaming / Request Hub / Reference (aktif = oranye #ff5200) dan pill EN/ID. Di telepon logo, nama, dan tautan lokal disembunyikan. Warna lewat `--pb-*`. Streaming = Jellyfin (tab baru, URL dari `/api/config`); landing tidak memakai bar (sudah menampilkan ketiga situs).
- Bahasa: satu `LangProvider` (`components/connections/lang-provider.tsx`) untuk Reference dan Request Hub, kamus di `lib/i18n.ts` + `lib/i18n-hub.ts` (kunci `hub.*`, `pb.*`). Pilihan disimpan di cookie `surflix_lang` pada domain induk (`lib/lang-pref.ts`), jadi ikut berpindah subdomain. English default.
- Belum diterjemahkan: notifikasi push dan teks dari server (`lib/notif-messages.ts`, pesan error API) masih Indonesia; landing masih English saja.
- Case 3D Reference: rangka dan punggung tetap biru, tanpa tulisan/banner Blu-ray; depan dan belakang memakai poster yang sama; punggung memuat judul tegak dan tahun.
- Reference memakai aksen dan tombol yang sama dengan landing dan Request Hub: oranye #ff5200, tinta #0d0d0f, radius 8px. Lebar isi Request Hub = Reference (penuh, margin `clamp(16px,2.2vw,32px)`).

### Legacy tokens (admin masih pakai)
```
surflix-500 / 600 : pink-red lama
ios-orange/blue/green/red : warna sistem Apple
bg-surface / bg-elevated  : kartu gelap
rounded-ios-lg (18px), rounded-ios-xl (24px), backdrop-blur-ios
```

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

## Kalau ada film/serial baru di Jellyfin (2026-10-22)

Judul baru **langsung muncul** di Just added, pencarian, dan hitungan library begitu library disinkronkan. Yang TIDAK otomatis adalah koneksi dan saganya — itu kurasi tangan.

Urutannya, dan langkah 2–3 **harus dijalankan Idrus** karena butuh akses prod:

```bash
# 1. Prod membaca Jellyfin          -> Admin > Settings > Sync library
#    (atau otomatis di latar saat kunjungan pertama ke Just added)

# 2. Tarik snapshot library ke repo — langkah a & b DI SERVER, c di Mac
docker exec surflix node scripts/export-library.js                          # a (cetak 15 judul termuda)
docker cp surflix:/app/scripts/library-seed.json /tmp/library-seed.json     # b
scp root@192.168.68.8:/tmp/library-seed.json scripts/library-seed.json      # c

# 3. Baru koneksinya bisa ditulis
#    tulis baris di scripts/curated/*.txt, lalu:
node scripts/build-connections.js
node scripts/build-sagas.js
```

**Kenapa langkah 2 wajib:** `build-connections.js` memvalidasi setiap judul kurasi terhadap `scripts/library-seed.json`. Selama berkas itu basi, judul baru dianggap "gak ketemu" dan builder gagal — jadi tidak ada koneksi yang bisa ditulis untuk film yang baru masuk. Sampai 2026-10-22 tidak ada `export-library.js` sama sekali, jadi tidak ada jalan menarik library dari prod; itu sudah diperbaiki.

Langkah 2b memakai `/tmp`, bukan `./scripts`: saat SSH ke Unraid posisinya di `/root` dan folder itu tidak ada di sana (`invalid output path`).

Daftar judul baru dibaca dari kolom `addedAt`, **bukan** dari membandingkan berkas lama — perbandingan berkas cuma benar sekali, karena jalan pertama menimpa berkas pembandingnya sendiri.

`library-seed.json` sekarang ter-format seperti dua berkas seed lainnya, supaya penambahan satu judul terbaca sebagai ~10 baris di diff, bukan satu baris 500 KB. `addedAt` sengaja tidak ikut diekspor: kolom itu diisi dari Jellyfin saat sync di tiap lingkungan.

### Menarik keputusan review balik dari prod (`connections-live.json`)

`connections-live.json` adalah "foto" keputusan review admin (APPROVED/REJECTED, koneksi buatan admin, hasil edit). Ia ikut di dalam image, tetapi **tidak otomatis masuk DB** — dan sebaliknya, keputusan yang Idrus ambil di `/admin/connections` tidak otomatis kembali ke repo.

**Urutannya tidak boleh dibalik: import dulu, baru ekspor.** Kalau diekspor sebelum diimpor, DB prod belum memuat koneksi kurasi yang baru ditulis, jadi berkas yang keluar kehilangan semuanya dan menimpa yang ada di repo.

```bash
# 1. DI SERVER — import kurasi baru ke DB
docker exec surflix node scripts/import-connections.js scripts/connections-live.json --apply

# 2. DI SERVER — ekspor balik dari DB, lalu salin ke /tmp
docker exec surflix node scripts/export-connections.js
docker cp surflix:/app/scripts/connections-live.json /tmp/connections-live.json

# 3. DI MAC — tarik ke repo
scp root@192.168.68.8:/tmp/connections-live.json scripts/connections-live.json
```

Seperti langkah 2b di atas, `docker cp` memakai `/tmp` karena SSH ke Unraid mendarat di `/root`.

Import **tidak pernah mengubah status baris yang sudah ada**, jadi approve/reject yang sudah dilakukan aman. Konsekuensinya: selama langkah 3 belum dijalankan, berkas di repo bukan sumber kebenaran status review — **jangan mengutip jumlah pending dari berkas lokal.** Ini sudah dua kali bikin salah lapor ("koneksi X masih pending" padahal sudah di-approve).

## Font di-vendor ke repo (2026-10-22)
Keempat layout memakai `next/font/local`, bukan `next/font/google`. Pengambilan font saat build pernah menggagalkan CI **tiga kali dalam satu hari** (`TypeError: Cannot read properties of null` di `@next/font/dist/google/loader.js`), dan satu-satunya penanganannya adalah push commit kosong untuk mengulang build. Sekarang build tidak menyentuh jaringan sama sekali.

- `public/fonts/bricolage-var-latin.woff2` (41 KB) → landing, Request Hub, admin. `weight: '400 600'`.
- `public/fonts/schibsted-var-latin.woff2` (47 KB) → Reference. `weight: '400 800'`.
- `bricolage-400.woff` / `bricolage-600.woff` **tetap dipakai** oleh `lib/og.tsx` (Satori butuh berkas statis). Jangan dihapus.

**Jebakan sumbu variable font.** Bricolage Grotesque punya tiga sumbu (`opsz,wdth,wght`). Kalau URL Google Fonts diminta dengan rentang `wdth@75..100`, berkas yang keluar **default-nya wdth=75 alias condensed**, dan teksnya merender 13% lebih sempit tanpa error apa pun. Minta **sumbu berat saja** (`:wght@400..600`). Cara memastikannya: ukur lebar render teks contoh sebelum dan sesudah penggantian — harus sama persis (Reference 299px, landing/Hub 302px pada 100px font-size untuk kata "Surflix").

## Catatan Tailwind 4 (2026-10-21)
- Utilitas ada di layer `utilities`; CSS buatan sendiri (`request.css`, `portal-bar.css`, `landing.css`, `referensi.css`) tidak berlayer dan SELALU menang atas utilitas. Jangan menaruh `padding`/`margin` pada override seperti `.rq-root .input-ios`, supaya `pl-12` dll tetap berlaku.
- Kelas lama `btn-primary`, `badge-*`, `input-ios`, `tab` kini `@utility` di globals.css; `.rq-root ...` menimpanya hanya di Request Hub.

## Admin (dirombak 2026-10-21)
- Bahasa visual sama dengan landing/Request Hub/Reference (papan ubin, #0d0d0f, aksen #ff5200, radius 8px, Bricolage Grotesque). CSS: `app/(admin)/admin.css`, kelas `ad-*` di dalam `.ad-root` (tanpa layer, jadi menang atas utilitas Tailwind).
- Kerangka: `app/(admin)/admin/layout.tsx` (guard sesi di server) + `components/admin/shell.tsx` (sidebar desktop, bilah atas + menu di telepon). `components/admin/context.tsx` = toast, dialog konfirmasi, lencana angka (`/api/admin/counts`, polling 30 detik), dan `api()` yang menangani 401.
- Halaman: Overview (`/admin`), Requests (`/admin/requests`, tab Pending + History; pilih musim TV, aksi massal, alasan reject cepat; `/admin/pending` dan `/admin/history` redirect ke sini), Reference (`/admin/connections`, tab Coverage / Review queue / Rejected dengan Restore), Settings (`/admin/settings`, status integrasi dari `/api/admin/health`: DB, Jellyfin, Jellyseerr + jenis key, Push, WEBHOOK_SECRET, Resend; sinkronisasi library; webhook Telegram).
- Teks admin English saja. Aktivitas terbaru memperkaya event dengan judul/nama tamu dan menyembunyikan `admin.login`.

## Reference: fitur tambahan (2026-10-21)
- **Kartu preview per film**: `/api/og/[type]/[id]` dan `/api/og/default` (`lib/og.tsx`, Satori + sharp → JPEG ~70 KB, font di `public/fonts`). Dipakai sebagai og:image dan twitter:image di layout peta film dan layout Reference.
- **sitemap.xml dan robots.txt sadar-host** (`app/sitemap.ts`, `app/robots.ts`): reference.* memuat beranda, Galaxy, Just added, dan semua peta film yang punya koneksi. Path berakhiran .xml/.txt tidak lewat middleware, jadi host dibaca langsung. Setelah deploy, daftarkan `https://reference.surflix.my.id/sitemap.xml` di Google Search Console.
- **Just added** (`/referensi/new`, server component + `just-added-view.tsx`): judul terbaru lewat kolom `LibraryTitle.addedAt` (Jellyfin `DateCreated`, diisi saat sync; baris lama terisi otomatis lewat satu sync latar belakang pada kunjungan pertama atau tombol Sync library).
- **Pratinjau Galaxy untuk admin**: `/api/connections/galaxy?pending=1` hanya dihormati kalau sesi admin ada (cookie admin hanya berlaku di host tempat login, jadi pakai `request.surflix.my.id/referensi/galaxy`; tombol "Preview in Galaxy" ada di tab Review queue). Koneksi menunggu review digambar putus-putus oranye.
- **Watch order** (2026-10-21): urutan tonton per saga, jadi pandangan ketiga di samping peta film dan Galaxy.
  - **Halaman**: `/referensi/timeline` (indeks semua saga, idiom contact sheet yang sama dengan beranda) dan `/referensi/timeline/[id]` (satu saga). `?film=movie:123` membuka saga langsung pada judul itu. Tautan lama `?saga=x` di-redirect.
  - **Panggung** (`components/connections/saga-stage.tsx`): memakai kerangka `.ref-stage` + `.ref-stage-view` + `.ref-panel` yang sama dengan peta 3D satu film, supaya terasa satu portal. Geser (seret / roda), cubit atau ⌘-scroll untuk zoom, klik dua kali, tombol −/+/⤢, dan tombol zoom. Di bawah 55% keterangan judul disembunyikan supaya tampak sebagai peta. Kartu adalah `<button>`, fokus keyboard membawa kamera ke judulnya.
  - **Cakupan**: saga diturunkan otomatis dari koneksi APPROVED ber-relasi `universe`/`remake` (komponen terhubung) — jadi setiap judul yang punya hubungan cerita pasti punya urutan tonton (324 judul, 62 saga — 7 di antaranya kurasi tangan). Judul yang hubungannya cuma gaya/orang (homage, visual, director, talent) memang tidak punya urutan; halaman indeks menjelaskannya dan peta film tidak menampilkan apa pun.
  - **Kurasi menang**: `scripts/curated/sagas.txt` mendefinisikan saga tangan (nama, tip, jalur/lane, urutan cerita eksplisit). Judulnya "diklaim" lebih dulu dan dikeluarkan dari graf, jadi saga kurasi tidak tercemar klaster di sebelahnya. `@alias <judul> | <Nama>` cuma menamai klaster otomatis. Yang sudah dikurasi: Star Wars, MCU, Alien, Westeros, John Wick, The Omen, Dragon Ball, One Piece, Pokémon, Spider-Man, Batman, DC on screen, Evangelion.
  - **Pokémon** (2026-10-22): 28 entri, 4 jalur (Serial anime / Film era demi era / Film garis waktu alternatif / Di luar serial anime). Film dikelompokkan per era serial TV (Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos) mengikuti pengelompokan pokemon.fandom.com. Tiga hal yang gampang salah dan sudah dibetulkan: **Mewtwo Strikes Back - Evolution (MS022) itu remake CGI film pertama**, bukan film ketiga garis waktu alternatif, padahal nomornya persis di antara MS021 dan MS023; **Zoroark (MS013) film era Sinnoh**, bukan Unova, meski bintangnya Pokémon Unova; dan **"The Power of One: The Pokémon 2000 Movie Special" bukan film** melainkan acara promo WB setengah jam, sementara film kedua yang asli (rilis Jepang 1999) tidak ada di library dan tampil sebagai "Not on Surflix".
  - **Kontinuitas ganda**: Spider-Man, Batman, DC on screen, Kamen Rider, Moana, Digimon, dan Kill Bill dikurasi bukan karena urutannya beda, tetapi karena pembangun otomatis menarik **satu garis lurus melewati kontinuitas yang tidak pernah bertemu** (Raimi vs Amazing, Nolan vs Reeves, DCEU vs DCU, tiga Kamen Rider yang cuma berbagi merek, animasi vs remake live-action, serial 1999 vs reboot 2020, Kill Bill vs Death Proof). Kalau ada klaster baru yang isinya reboot, periksa hal yang sama.
  - **Penjaga judul yatim** (`build-sagas.js`, 2026-10-22): saga kurasi mengklaim judul yang didaftarkan dan mengeluarkannya dari graf. Judul yang terhubung ke saga itu tetapi **lupa didaftarkan** kehilangan satu-satunya pasangannya lalu terdampar tanpa saga — diam-diam, tanpa error. Sudah kejadian pada empat judul MCU (Marvel Zombies, Punisher: One Last Kill, Spider-Man: Brand New Day, VisionQuest). Builder sekarang mencetak peringatan `⚠` kalau ada. **Jangan abaikan peringatan itu** — artinya ada judul yang hilang dari portal. Catatan: field relasi di `connections-live.json` bernama `relationship`, bukan `relation`.
  - **MCU** (diaudit 2026-10-22): 49 entri, 4 jalur (Film / Serial / Realitas alternatif / Bukan bagian cerita). Dua kesalahan sistemik ditemukan dan diperbaiki — **jangan dikembalikan**: (1) Fase 1 memakai bagan resmi usang *The First 10 Years* (2018); buku timeline resmi 2023 memindahkan Iron Man ke 2008 dan semua di bawahnya bergeser. (2) Fase 4–5 meleset satu sampai dua tahun, dan tiga pasang terbalik urutannya: Wakanda Forever sebelum Love and Thunder, Shang-Chi sebelum Far From Home, Doctor Strange setelah Homecoming. **Kewenangan**: tanggal sampai Wakanda Forever berpegang pada buku resmi 2023; setelahnya rekonstruksi wiki (semua halaman tahun wiki MCU bertanda `{{FanTimeline}}`) — tipnya mengatakan itu. Judul yang belum ditempatkan wikinya (Punisher: One Last Kill, VisionQuest) **tidak diberi tahun sama sekali**, bukan ditebak.
  - **Cara riset fakta saga**: wiki fandom menolak permintaan halaman biasa (403) dan WebFetch, tetapi **MediaWiki API-nya jalan lewat curl**. Bulbapedia tidak bisa sama sekali (Cloudflare) — pakai `pokemon.fandom.com`. Pola yang sudah terbukti:
    ```bash
    curl -s -A "Mozilla/5.0" "https://<wiki>.fandom.com/api.php?action=query&list=search&srsearch=QUERY&srlimit=8&format=json"
    curl -s -A "Mozilla/5.0" "https://<wiki>.fandom.com/api.php?action=parse&page=JUDUL&prop=wikitext&format=json"
    ```
    Judul halaman sering berawalan sendiri (`MS020: ...` di wiki Pokémon). Untuk saga besar, bagi dua dan jalankan dua agen paralel; minta tabel dengan kolom bukti yang dikutip dan tingkat keyakinan, bukan narasi.
  - **Tapi periksa dulu, jangan asal pisah**: The Naked Gun dan Scary Movie kelihatan persis kasus yang sama dan ternyata **bukan**. Naked Gun (2025) itu Frank Drebin Jr., sekuel dari film 1994, bukan reboot. Scary Movie (2026) itu entri keenam dengan pemain asli (Anna Faris, Regina Hall, Wayans) yang kembali. Dua-duanya benar sebagai satu garis otomatis — **biarkan**.
  - **One Piece** (2026-10-22): 28 judul, 5 jalur (Serial anime / Film bioskop / Penceritaan ulang dan rangkuman / Spesial TV / Live action). Berbeda dari Dragon Ball, **tidak ada kronologi film resmi sama sekali** — menurut onepiece.fandom.com hanya tiga judul yang mengadaptasi arc kanon (Episode of Arabasta, Episode of Chopper Plus, Episode of East Blue) dan Oda tidak menganggap satu pun filmnya bagian dari cerita, termasuk Strong World yang ia tulis sendiri. Maka label urutan cerita di sini berarti **batas aman tonton** yang dibaca dari siapa saja yang ada di kru ("Robin sudah ikut, Going Merry masih berlayar"), bukan klaim kanon. Jangan menaikkannya jadi klaim kanon.
  - **Dragon Ball** (2026-10-21): 32 judul, 4 jalur (Kisah utama / Film sampingan / Penceritaan ulang / Masa depan alternatif). Dua hal yang bikin urutan cerita beda jauh dari rilis: Bardock (rilis 1990) adalah titik paling awal di Age 737, dan Daima (rilis 2024, serial terbaru) berlatar Age 775 di dalam jeda sepuluh tahun yang menutup Z. **Kalender Age cuma dipakai di tulang punggung TV dan Bardock** — Toei tidak pernah memberi tanggal untuk film sampingan, jadi film ditempatkan per arc ("Namek era", "Cell era"); rekonstruksi penggemar di kanzenshuu.com pun saling berbeda. Jangan menambahkan angka Age ke film sampingan tanpa sumber resmi.
  - **Urutan cerita otomatis**: topologi stabil dari penanda `@prequel`/`@sequel` di `scripts/curated/*.txt` plus aturan "versi lama dulu" untuk `remake`, dengan urutan rilis sebagai dasar. Tombol Story/Release cuma muncul kalau kedua urutan memang berbeda (`twoOrders`).
  - **Build**: `node scripts/build-sagas.js` → `lib/sagas.json` (di-commit, ikut image, tidak perlu import ke DB). Dicocokkan ke library saat request (`listSagas` / `getSaga` / `sagaHere` / `sagaMembership` di `lib/connections.ts`); judul yang tidak ada di library tampil sebagai "Not on Surflix" dengan tautan Request Hub.
  - **Satu pola panggung untuk tiga pandangan** (2026-10-22): peta film 3D, Watch order, dan Galaxy sama-sama memakai panggung selebar penuh dengan panel **melayang** di kanan (`position: absolute`), bukan kolom grid. Supaya panel tidak menimbun isi, pemusatan di JS memakai **area terpakai** = lebar panggung - jejak panel (`insetOf()` di `saga-stage.tsx`, `panelInset()` di `connection-graph.tsx`; keduanya 0 saat panel statis di telepon). Peta 3D juga menggeser kameranya sejauh setengah jejak panel karena cincinnya terpusat dan tidak bisa digeser pengguna. Detail di `design.md`.
  - **Jangan merebut gesture roda di peta 3D**: panggungnya di tengah halaman yang perlu di-scroll, jadi zoom-scroll bakal menjebak halaman. Galaxy boleh karena setinggi layar penuh.
  - **Jangan pakai `setPointerCapture` di panggung**: menangkap pointer bikin klik mendarat di panggung, bukan di kartunya (kartu jadi tidak bisa dipilih). Gerakan diikuti lewat listener di `window`.
  - **Catatan inspector**: di halaman saga ada tiga positif palsu. `edge-text` — kartu di luar pandangan tetap punya rect walau sudah dipotong `overflow:hidden` panggung. `few-pictures` — poster digambar ke canvas, jadi tidak terhitung gambar. `body-size` pada saga besar (28+ judul) — label kartu peta yang 13px jumlahnya melebihi prosanya, padahal teks baca sebenarnya 16px. Jalankan dengan `--allow edge-text,body-size`; `eyebrow` ("← All sagas") itu tautan kembali, bukan kicker.
  - **Saling tertaut**: peta satu film menampilkan potongan jalur "Part of X · ke-n dari m" (`.ref-here`, data dari `/api/connections` field `saga`); panel Galaxy punya tautan Watch order (`sagas` di `/api/connections/galaxy`); hero beranda Reference punya tautan ketiga.
- Galaxy memakai tinggi layar dikurangi tinggi bar (`--bar-h`, diukur di `galaxy.tsx`); hero landing dipotong di margin (`overflow:hidden` pada `.lp-stage`), bukan di tepi layar.
- Koneksi `director` dibuat otomatis dari `scripts/curated/directors.list`, bukan ditulis per baris: nama di situ adalah **kunci pencarian** ke kolom `directors` milik Jellyfin, jadi jangan diubah demi tampilan. Pakai `| as: Nama EN || Nama ID` kalau kalimatnya perlu nama lain (duo sutradara), `| +Judul (tahun)` / `| -Judul (tahun)` untuk menambah/mengecualikan film, dan tulis tangan di `06-deepen.txt` kalau butuh kalimat yang benar-benar khusus.
- Hati-hati memecah baris kurasi dengan `split('|')`: pemisah dwibahasa `||` ikut terpotong. Satukan kembali sisa potongannya (sudah kejadian di `sagas.txt`, `@lane`, dan `as:`).
- **Tiga lensa satu judul** (`components/connections/lens-switch.tsx`, 2026-10-21): kendali Peta / Urutan tonton / Galaxy yang muncul di halaman peta film (di atas panggung 3D, bukan di bawahnya), panel Galaxy, dan panel Watch order. Selalu menunjuk judul yang sedang dilihat (`?film=` / `?select=`), bukan beranda fiturnya. Lensa yang tidak berlaku disembunyikan: tanpa saga tidak ada Urutan tonton, tanpa koneksi tidak ada Peta; kalau tersisa satu, kendalinya tidak dirender sama sekali.
