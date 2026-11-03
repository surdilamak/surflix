# 🎬 Surflix · Request Hub

Custom request platform for Jellyfin at Surdilamak. A bridge between family/friend users and Jellyseerr, with an admin approval flow.

## ✨ Features

- 🎨 Apple-style UI (cinematic dark, frosted glass, SF Pro typography)
- 📱 Responsive mobile-first
- 🔍 Search & browse via Jellyseerr API
- 📊 Real-time status (Pending → Approved → Downloading → Available)
- 👨‍💼 Admin approval flow (every request is reviewed first before being forwarded to Jellyseerr)
- 📧 Email magic link (no password for guests)
- 📨 Telegram notification to the admin
- 🚦 Rate limiting per IP

## 🏗️ Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + custom Apple theme
- **Prisma** + **SQLite**
- **Iron Session** for admin auth
- **Resend** for email
- **Telegram Bot API** for notifications

## 🚀 Setup

### 1. Preparation

Before you start, you need:

1. **Jellyseerr API key** — Settings → General → API Key in Jellyseerr
2. **Resend account** — sign up at [resend.com](https://resend.com), generate an API key
3. **Telegram bot**:
   - Chat with `@BotFather`, type `/newbot`, follow the instructions, save the token
   - Chat with `@userinfobot` to get your chat ID
4. **Domain** — `request.surflix.my.id` pointed at your Unraid server

### 2. Generate Password Hash

```bash
node scripts/gen-password.js
# Type the admin password, copy the hash into .env
```

### 3. Setup .env

```bash
cp .env.example .env
# Edit .env, fill in all values
```

### 4. Build & Run

```bash
docker compose up -d --build
```

Check the logs:
```bash
docker compose logs -f surflix
```

### 5. Reverse Proxy Config

#### SWAG / Nginx Proxy Manager
Add a new proxy host:
- Domain: `request.surflix.my.id`
- Forward: `http://<unraid-ip>:3737`
- SSL: Auto (LetsEncrypt)

#### Traefik
Labels are already prepared in docker-compose.yml, just uncomment them.

### 6. Jellyseerr Webhook Setup

In Jellyseerr → Settings → Notifications → Webhook:
- **Webhook URL**: `https://request.surflix.my.id/api/webhooks/jellyseerr`
- **Authorization Header**: `Bearer <WEBHOOK_SECRET>` (same as in .env)
- **Notification Types**: enable Media Available, Media Failed, Media Partially Available

## 🗂️ Project Structure

```
surflix/
├── app/
│   ├── (guest)/              # Public pages for guests
│   ├── (admin)/              # Admin pages (auth required)
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

The SQLite database is stored at `./data/surflix.db`. Back up this folder regularly.

On Unraid, add the folder to the CA Backup plugin.

## 🐛 Troubleshooting

- **Jellyseerr "ECONNREFUSED"**: Check `JELLYSEERR_URL` — it must use the container hostname, not the host IP. Or make sure Jellyseerr & Surflix are on the same Docker network.
- **Email not sent**: Check that `RESEND_API_KEY` is valid and the sender domain has been verified in the Resend dashboard.
- **No Telegram notifications**: Make sure `TELEGRAM_ADMIN_CHAT_ID` is correct (no @username, it must be a numeric chat ID).
- **Webhook failed**: Check that `WEBHOOK_SECRET` is the same in Jellyseerr & Surflix .env.

## 📝 License

Internal use, MIT licensed.
