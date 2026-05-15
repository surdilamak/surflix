# 🎬 Surflix · Request Hub

Custom request platform untuk Jellyfin di Surdilamak. Bridge antara user keluarga/teman dengan Jellyseerr, dengan admin approval flow.

## ✨ Fitur

- 🎨 Apple-style UI (cinematic dark, frosted glass, SF Pro typography)
- 📱 Responsive mobile-first
- 🔍 Search & browse via Jellyseerr API
- 📊 Real-time status (Pending → Approved → Downloading → Available)
- 👨‍💼 Admin approval flow (semua request review dulu sebelum di-forward ke Jellyseerr)
- 📧 Email magic link (no password buat guest)
- 📨 Telegram notification ke admin
- 🚦 Rate limiting per IP

## 🏗️ Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + custom Apple theme
- **Prisma** + **SQLite**
- **Iron Session** untuk admin auth
- **Resend** untuk email
- **Telegram Bot API** untuk notif

## 🚀 Setup

### 1. Persiapan

Sebelum start, lo butuh:

1. **Jellyseerr API key** — Settings → General → API Key di Jellyseerr
2. **Resend account** — daftar di [resend.com](https://resend.com), generate API key
3. **Telegram bot**:
   - Chat `@BotFather`, ketik `/newbot`, ikutin instruksi, save token-nya
   - Chat `@userinfobot` buat dapet chat ID lo
4. **Domain** — `request.surflix.my.id` di-point ke Unraid server lo

### 2. Generate Password Hash

```bash
node scripts/gen-password.js
# Ketik password admin, copy hash ke .env
```

### 3. Setup .env

```bash
cp .env.example .env
# Edit .env, isi semua values
```

### 4. Build & Run

```bash
docker compose up -d --build
```

Cek log:
```bash
docker compose logs -f surflix
```

### 5. Reverse Proxy Config

#### SWAG / Nginx Proxy Manager
Tambahin proxy host baru:
- Domain: `request.surflix.my.id`
- Forward: `http://<unraid-ip>:3737`
- SSL: Auto (LetsEncrypt)

#### Traefik
Labels udah disiapin di docker-compose.yml, tinggal uncomment.

### 6. Jellyseerr Webhook Setup

Di Jellyseerr → Settings → Notifications → Webhook:
- **Webhook URL**: `https://request.surflix.my.id/api/webhooks/jellyseerr`
- **Authorization Header**: `Bearer <WEBHOOK_SECRET>` (sama dengan di .env)
- **Notification Types**: enable Media Available, Media Failed, Media Partially Available

## 🗂️ Struktur Project

```
surflix/
├── app/
│   ├── (guest)/              # Halaman public buat guest
│   ├── (admin)/              # Halaman admin (auth required)
│   ├── api/                  # Backend API routes
│   │   ├── search/           # Search via Jellyseerr
│   │   ├── trending/         # Trending media (cached)
│   │   ├── request/          # Submit request
│   │   ├── verify/           # Magic link verification
│   │   ├── admin/            # Admin actions
│   │   └── webhooks/         # Jellyseerr webhook receiver
│   ├── globals.css           # Global styles + Apple theme
│   └── layout.tsx
├── components/
│   ├── guest/                # Guest-facing components
│   ├── admin/                # Admin components
│   └── ui/                   # Shared UI components
├── lib/
│   ├── db.ts                 # Prisma client
│   ├── jellyseerr.ts         # Jellyseerr API client
│   ├── email.ts              # Email service (Resend)
│   ├── telegram.ts           # Telegram notifier
│   ├── session.ts            # Iron Session
│   ├── rate-limit.ts         # Rate limiter
│   └── utils.ts              # Helpers
├── prisma/
│   └── schema.prisma         # Database schema
├── scripts/
│   └── gen-password.js       # Password hash generator
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## 🔄 Request Lifecycle

```
Guest → Submit Request
       ↓
   Surflix DB (status: PENDING_ADMIN)
       ↓
   Telegram → Admin (Idrus)
       ↓
   Admin Reviews → Approve / Reject
       ↓
   [If approved]
       ↓
   Jellyseerr API → POST /request
       ↓
   Radarr/Sonarr → Download
       ↓
   Webhook → Surflix (status: AVAILABLE)
       ↓
   Email → Guest "Available now"
```

## 🛠️ Development

```bash
# Install deps
npm install

# Setup DB
npx prisma db push

# Run dev
npm run dev
# → http://localhost:3000

# View DB
npm run db:studio
```

## 📦 Backup

Database SQLite di-store di `./data/surflix.db`. Backup folder ini secara berkala.

Di Unraid, tambahin folder ke CA Backup plugin.

## 🐛 Troubleshooting

- **Jellyseerr "ECONNREFUSED"**: Cek `JELLYSEERR_URL` — harus pake hostname container, bukan IP host. Atau pastiin Jellyseerr & Surflix di Docker network yang sama.
- **Email gak terkirim**: Cek `RESEND_API_KEY` valid, dan domain sender udah di-verify di Resend dashboard.
- **Telegram gak ada notif**: Pastikan `TELEGRAM_ADMIN_CHAT_ID` benar (no @username, harus chat ID numerik).
- **Webhook gagal**: Cek `WEBHOOK_SECRET` sama di Jellyseerr & Surflix .env.

## 📝 Lisensi

Internal use, MIT licensed.
