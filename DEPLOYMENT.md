# 🚀 Surflix Deployment Guide — Unraid

Panduan deploy Surflix di Unraid server. Estimasi waktu: **30-60 menit** (tergantung lo udah punya bot Telegram & Resend account belum).

## 📋 Pre-flight Checklist

Pastiin lo udah punya:

- [ ] **Unraid server** dengan Docker enabled
- [ ] **Jellyseerr** udah running di Docker (dengan API key bisa di-access)
- [ ] **Reverse proxy** (SWAG / Nginx Proxy Manager / Traefik) udah running
- [ ] **Domain** `surdilamak.my.id` dengan akses ke DNS settings
- [ ] **SSH access** ke Unraid (atau pakai Docker Manager di Unraid UI)

## 🎯 Step 1: Setup External Services

### 1.1 Resend Account (untuk Email)

1. Daftar di [resend.com](https://resend.com) — gratis 100 email/hari
2. Verify domain `surdilamak.my.id`:
   - Resend → Domains → Add Domain → `surdilamak.my.id`
   - Resend kasih DNS records (TXT, MX, DKIM) — tambahin ke DNS provider lo
   - Tunggu sampai status "Verified" (biasanya 5-15 menit)
3. Resend → API Keys → Create API Key → **copy & save**

> **Tips**: Kalau lo gak mau verify domain, bisa pake sender `onboarding@resend.dev` (tapi cuma bisa kirim ke email lo sendiri yang terdaftar di Resend account).

### 1.2 Telegram Bot (untuk Admin Notif)

1. Chat **@BotFather** di Telegram
2. Ketik `/newbot`
3. Kasih nama bot (misal: "Surflix Notifier") dan username (misal: `surflix_bot`)
4. BotFather kasih **bot token** — copy & save
5. Chat **@userinfobot** di Telegram, dia kasih **chat ID lo** — copy & save
6. **PENTING**: Send dulu pesan ke bot lo (misal "/start") biar bot bisa kirim pesan ke lo nanti

### 1.3 Jellyseerr API Key

1. Buka Jellyseerr → Settings → General
2. Scroll ke "API Key" → Copy
3. Save di tempat aman

## 🌐 Step 2: DNS Setup

Di DNS provider domain `surdilamak.my.id`:

Add A record (atau CNAME):
- **Name**: `request`
- **Type**: A (atau CNAME ke jellyfin.surdilamak.my.id)
- **Value**: IP public Unraid lo (atau hostname)
- **TTL**: 300 (5 menit, biar cepet propagate)

Tunggu 5-10 menit propagation, cek dengan:
```bash
nslookup request.surdilamak.my.id
```

## 📦 Step 3: Setup Project di Unraid

### 3.1 SSH ke Unraid

```bash
ssh root@<unraid-ip>
```

### 3.2 Pilih lokasi project

Recommended: simpan di array (auto-backup oleh Unraid):

```bash
mkdir -p /mnt/user/appdata/surflix
cd /mnt/user/appdata/surflix
```

### 3.3 Extract zip yang lo download

Upload zip ke Unraid (via SCP, Krusader, atau Windows share), terus:

```bash
cd /mnt/user/appdata/surflix
unzip /path/to/surflix-frontend.zip
mv surflix/* surflix/.[!.]* . 2>/dev/null
rmdir surflix
ls -la
```

Lo harusnya lihat: `Dockerfile`, `docker-compose.yml`, `package.json`, dll.

## 🔐 Step 4: Configure Environment

### 4.1 Generate session secret

```bash
openssl rand -base64 32
# Copy hasilnya, ini buat SESSION_SECRET
```

### 4.2 Generate admin password hash

```bash
# Install bcryptjs sementara buat generate hash
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm install bcryptjs --silent && node scripts/gen-password.js"
# Ketik password lo, copy hash yang muncul
```

### 4.3 Generate webhook secret

```bash
openssl rand -hex 32
# Copy buat WEBHOOK_SECRET
```

### 4.4 Buat .env file

```bash
cp .env.example .env
nano .env  # atau pake editor lain
```

Fill in semua values. Contoh:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://request.surdilamak.my.id
NEXT_PUBLIC_APP_NAME=Surflix
NEXT_PUBLIC_JELLYFIN_URL=https://jellyfin.surdilamak.my.id

DATABASE_URL="file:/data/surflix.db"

JELLYSEERR_URL=http://jellyseerr:5055
JELLYSEERR_API_KEY=MTczMjU2NzExODg0Nzc2YWE2YzM3LWZkNjctNGE...

SESSION_SECRET=tDPGoIfZH4ZpLm9Yl/4F5n6cR3sBwQzKLm9c1=
ADMIN_USERNAME=idrus
ADMIN_PASSWORD_HASH=$2a$10$YourBcryptHashHere...

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
EMAIL_FROM="Surflix <noreply@surdilamak.my.id>"

TELEGRAM_BOT_TOKEN=7891234567:AAFxyzABCDefghijklmnopqrstuvwxyz
TELEGRAM_ADMIN_CHAT_ID=987654321

RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=3600000

WEBHOOK_SECRET=abc123def456...
```

Save & exit (Ctrl+X, Y, Enter di nano).

## 🐳 Step 5: Network Setup (Important!)

Cek network Jellyseerr lo:

```bash
docker inspect jellyseerr | grep -A 5 Networks
```

Lo bakal lihat sesuatu kayak:
```
"Networks": {
    "br0": { ... }
    # atau
    "bridge": { ... }
    # atau custom network
}
```

### Option A: Jellyseerr di network `bridge` atau custom network

Edit `docker-compose.yml`, tambahin network external:

```yaml
networks:
  surflix-net:
    driver: bridge
  # Tambahin network yang sama dengan Jellyseerr
  jellyseerr-net:
    external: true
    name: <nama-network-jellyseerr>  # ganti dengan nama network sebenernya
```

Dan di service `surflix`:

```yaml
services:
  surflix:
    networks:
      - surflix-net
      - jellyseerr-net
```

### Option B: Jellyseerr di network `br0` (bridge custom Unraid)

Lebih simple, ganti `JELLYSEERR_URL` di `.env` jadi IP container Jellyseerr:

```bash
docker inspect jellyseerr | grep IPAddress
# Misal hasilnya 192.168.1.50
```

Update `.env`:
```env
JELLYSEERR_URL=http://192.168.1.50:5055
```

## 🚢 Step 6: Build & Run

```bash
cd /mnt/user/appdata/surflix

# Build & start (first time bakal lama ~3-5 menit)
docker compose up -d --build

# Monitor logs
docker compose logs -f surflix
```

Yang harusnya lo lihat di log:
```
✓ Starting...
✓ Ready in 2.3s
✓ Started server on 0.0.0.0:3000
```

Test internal:
```bash
curl http://localhost:3737/api/health
# Expected: {"status":"healthy","checks":{"db":true,"jellyseerr":true}}
```

Kalau `jellyseerr: false` → cek Step 5 (network setup). Service jalan, tapi gak bisa connect ke Jellyseerr.

## 🔒 Step 7: Reverse Proxy Setup

### SWAG / Linuxserver SWAG

Edit `/mnt/user/appdata/swag/nginx/proxy-confs/`:

```bash
cd /mnt/user/appdata/swag/nginx/proxy-confs
nano surflix.subdomain.conf
```

Paste:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name request.*;

    include /config/nginx/ssl.conf;

    client_max_body_size 10M;

    location / {
        include /config/nginx/proxy.conf;
        include /config/nginx/resolver.conf;
        set $upstream_app surflix;  # atau IP Unraid kalau bukan di network yang sama
        set $upstream_port 3000;
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;
    }

    # Special handling untuk Jellyseerr webhook (bypass CORS issues)
    location /api/webhooks {
        include /config/nginx/proxy.conf;
        set $upstream_app surflix;
        set $upstream_port 3000;
        proxy_pass http://$upstream_app:$upstream_port;
        proxy_buffering off;
    }
}
```

Restart SWAG:
```bash
docker restart swag
```

### Nginx Proxy Manager (NPM)

Lebih simple, lewat UI:

1. Buka NPM (biasanya port 81)
2. Proxy Hosts → Add Proxy Host
3. **Domain Names**: `request.surdilamak.my.id`
4. **Scheme**: `http`
5. **Forward Hostname/IP**: IP Unraid (atau `surflix` kalau di network yang sama)
6. **Forward Port**: `3737`
7. ✅ **Cache Assets**
8. ✅ **Block Common Exploits**
9. ✅ **Websockets Support**
10. **SSL** tab → Request New SSL Cert (Let's Encrypt)
11. Save

## 🪝 Step 8: Setup Jellyseerr Webhook

Jellyseerr akan notify Surflix tiap kali ada status change (downloading → available):

1. Jellyseerr → Settings → Notifications → **Webhook**
2. **Webhook URL**: `https://request.surdilamak.my.id/api/webhooks/jellyseerr`
3. **Authorization Header**: `Bearer YOUR_WEBHOOK_SECRET` (sama dengan WEBHOOK_SECRET di .env)
4. **Notification Types**: ✅ enable:
   - Media Available
   - Media Failed
   - Media Partially Available (kalau lo handle series)
5. **JSON Payload**: pakai default
6. Click "Test" — kalau berhasil, lo dapet 200 OK

## ✅ Step 9: Smoke Test

Buka browser, akses `https://request.surdilamak.my.id`:

### Test 1: Halaman Trending Load
- [ ] Hero banner muncul
- [ ] Grid trending muncul
- [ ] Status badges muncul (In Library, Pending, etc.)

### Test 2: Search
- [ ] Klik tab "Browse"
- [ ] Ketik query (minimal 2 karakter)
- [ ] Hasil search muncul
- [ ] Filter chips kerja (Movies, Series, Hide in library)

### Test 3: Submit Request
- [ ] Klik poster film yang **belum** di library
- [ ] Modal detail muncul
- [ ] Klik "Request"
- [ ] Form muncul (nama + email)
- [ ] Submit → toast "Request lo udah masuk!" muncul
- [ ] **Cek Telegram lo — harusnya dapet notif** 📲

### Test 4: My Requests Flow
- [ ] Klik tab "My Requests"
- [ ] Input email yang lo pake tadi
- [ ] Cek email → harusnya ada magic link dari Surflix
- [ ] Klik link → redirect ke /verify → lalu ke /requests
- [ ] Request lo muncul dengan status "Pending"

### Test 5: Approval (Manual via Jellyseerr buat sekarang)
- [ ] Buka Jellyseerr
- [ ] Approve request manual
- [ ] **Webhook should fire** — cek log Surflix:
  ```bash
  docker compose logs surflix | grep -i webhook
  ```
- [ ] Status di "My Requests" page lo harusnya update jadi "Processing"
- [ ] Setelah film ready di Jellyfin, status jadi "Available"
- [ ] **Cek email lo — dapet notif "Available now!"** 📧

## 🐛 Troubleshooting

### Container gak start / crash
```bash
docker compose logs surflix --tail 50
```

Common issues:
- **"DATABASE_URL not found"** → `.env` belum di-load. Restart: `docker compose down && docker compose up -d`
- **"Cannot find module @prisma/client"** → Build error, rebuild: `docker compose build --no-cache`

### Trending gak muncul / empty
- Cek Jellyseerr connection: `curl http://<unraid-ip>:3737/api/health`
- Kalau `jellyseerr: false`, cek `JELLYSEERR_URL` & network (Step 5)
- Cek API key Jellyseerr valid

### Email gak terkirim
```bash
docker compose logs surflix | grep -i resend
```
- Pastiin domain `surdilamak.my.id` udah verified di Resend
- Atau pake sender `onboarding@resend.dev` sementara

### Telegram gak ada notif
```bash
docker compose logs surflix | grep -i telegram
```
- Pastiin lo udah send `/start` ke bot lo dari Telegram
- Cek `TELEGRAM_ADMIN_CHAT_ID` — harus angka, no @username

### Webhook gak fire
- Cek WEBHOOK_SECRET sama persis di .env Surflix & Jellyseerr config
- Cek URL bisa di-reach dari Jellyseerr:
  ```bash
  docker exec jellyseerr wget -O- https://request.surdilamak.my.id/api/health
  ```

## 🔄 Update / Redeploy

Kalau ada perubahan code:

```bash
cd /mnt/user/appdata/surflix
docker compose down
docker compose up -d --build
```

Database di `./data/surflix.db` gak akan ke-reset karena di-mount sebagai volume.

## 💾 Backup

Backup file:
- `.env` (semua secrets)
- `./data/surflix.db` (database)

Setting di Unraid CA Backup plugin:
- **Source**: `/mnt/user/appdata/surflix/`
- **Frequency**: Daily

## 🎯 Yang Belum Tersedia di Build Ini

> **Note**: Build sekarang **belum punya admin panel UI**. Approve request masih harus dilakukan manual via Jellyseerr. Setelah lo test deployment ini sukses, kita lanjut bikin admin panel-nya.

---

Good luck dengan deploy-nya! Kalau ada error, share output `docker compose logs surflix` dan gw bantu troubleshoot.
