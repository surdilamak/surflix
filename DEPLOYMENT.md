# 🚀 Surflix Deployment Guide — Unraid

A guide to deploying Surflix on an Unraid server. Estimated time: **30-60 minutes** (depending on whether you already have a Telegram bot & Resend account).

## 📋 Pre-flight Checklist

Make sure you already have:

- [ ] **Unraid server** with Docker enabled
- [ ] **Jellyseerr** already running in Docker (with an accessible API key)
- [ ] **Reverse proxy** (SWAG / Nginx Proxy Manager / Traefik) already running
- [ ] **Domain** `surdilamak.my.id` with access to DNS settings
- [ ] **SSH access** to Unraid (or use Docker Manager in the Unraid UI)

## 🎯 Step 1: Setup External Services

### 1.1 Resend Account (for Email)

1. Sign up at [resend.com](https://resend.com) — free, 100 emails/day
2. Verify domain `surdilamak.my.id`:
   - Resend → Domains → Add Domain → `surdilamak.my.id`
   - Resend gives you DNS records (TXT, MX, DKIM) — add them to your DNS provider
   - Wait until the status is "Verified" (usually 5-15 minutes)
3. Resend → API Keys → Create API Key → **copy & save**

> **Tip**: If you don't want to verify a domain, you can use the sender `onboarding@resend.dev` (but it can only send to your own email registered in the Resend account).

### 1.2 Telegram Bot (for Admin Notifications)

1. Chat with **@BotFather** on Telegram
2. Type `/newbot`
3. Give the bot a name (e.g. "Surflix Notifier") and a username (e.g. `surflix_bot`)
4. BotFather gives you a **bot token** — copy & save
5. Chat with **@userinfobot** on Telegram, it gives you **your chat ID** — copy & save
6. **IMPORTANT**: Send a message to your bot first (e.g. "/start") so the bot can message you later

### 1.3 Jellyseerr API Key

1. Open Jellyseerr → Settings → General
2. Scroll to "API Key" → Copy
3. Save it somewhere safe

## 🌐 Step 2: DNS Setup

In the DNS provider for the `surdilamak.my.id` domain:

Add an A record (or CNAME):
- **Name**: `request`
- **Type**: A (or CNAME to jellyfin.surdilamak.my.id)
- **Value**: your Unraid's public IP (or hostname)
- **TTL**: 300 (5 minutes, so it propagates quickly)

Wait 5-10 minutes for propagation, check with:
```bash
nslookup request.surdilamak.my.id
```

## 📦 Step 3: Set Up the Project on Unraid

### 3.1 SSH into Unraid

```bash
ssh root@<unraid-ip>
```

### 3.2 Choose the project location

Recommended: store it on the array (auto-backed-up by Unraid):

```bash
mkdir -p /mnt/user/appdata/surflix
cd /mnt/user/appdata/surflix
```

### 3.3 Extract the zip you downloaded

Upload the zip to Unraid (via SCP, Krusader, or a Windows share), then:

```bash
cd /mnt/user/appdata/surflix
unzip /path/to/surflix-frontend.zip
mv surflix/* surflix/.[!.]* . 2>/dev/null
rmdir surflix
ls -la
```

You should see: `Dockerfile`, `docker-compose.yml`, `package.json`, etc.

## 🔐 Step 4: Configure Environment

### 4.1 Generate session secret

```bash
openssl rand -base64 32
# Copy the output, this is for SESSION_SECRET
```

### 4.2 Generate admin password hash

```bash
# Temporarily install bcryptjs to generate the hash
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm install bcryptjs --silent && node scripts/gen-password.js"
# Type your password, copy the hash that appears
```

### 4.3 Generate webhook secret

```bash
openssl rand -hex 32
# Copy this for WEBHOOK_SECRET
```

### 4.4 Create the .env file

```bash
cp .env.example .env
nano .env  # or use another editor
```

Fill in all values. Example:

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

Save & exit (Ctrl+X, Y, Enter in nano).

## 🐳 Step 5: Network Setup (Important!)

Check your Jellyseerr's network:

```bash
docker inspect jellyseerr | grep -A 5 Networks
```

You'll see something like:
```
"Networks": {
    "br0": { ... }
    # or
    "bridge": { ... }
    # or a custom network
}
```

### Option A: Jellyseerr on the `bridge` network or a custom network

Edit `docker-compose.yml`, add an external network:

```yaml
networks:
  surflix-net:
    driver: bridge
  # Add the same network as Jellyseerr
  jellyseerr-net:
    external: true
    name: <nama-network-jellyseerr>  # replace with the actual network name
```

And in the `surflix` service:

```yaml
services:
  surflix:
    networks:
      - surflix-net
      - jellyseerr-net
```

### Option B: Jellyseerr on the `br0` network (Unraid custom bridge)

Simpler, change `JELLYSEERR_URL` in `.env` to the Jellyseerr container's IP:

```bash
docker inspect jellyseerr | grep IPAddress
# Say the result is 192.168.1.50
```

Update `.env`:
```env
JELLYSEERR_URL=http://192.168.1.50:5055
```

## 🚢 Step 6: Build & Run

```bash
cd /mnt/user/appdata/surflix

# Build & start (the first time will take ~3-5 minutes)
docker compose up -d --build

# Monitor logs
docker compose logs -f surflix
```

What you should see in the logs:
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

If `jellyseerr: false` → check Step 5 (network setup). The service is running, but it can't connect to Jellyseerr.

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
        set $upstream_app surflix;  # or the Unraid IP if not on the same network
        set $upstream_port 3000;
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;
    }

    # Special handling for the Jellyseerr webhook (bypass CORS issues)
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

Simpler, through the UI:

1. Open NPM (usually port 81)
2. Proxy Hosts → Add Proxy Host
3. **Domain Names**: `request.surdilamak.my.id`
4. **Scheme**: `http`
5. **Forward Hostname/IP**: Unraid IP (or `surflix` if on the same network)
6. **Forward Port**: `3737`
7. ✅ **Cache Assets**
8. ✅ **Block Common Exploits**
9. ✅ **Websockets Support**
10. **SSL** tab → Request New SSL Cert (Let's Encrypt)
11. Save

## 🪝 Step 8: Setup Jellyseerr Webhook

Jellyseerr will notify Surflix whenever there is a status change (downloading → available):

1. Jellyseerr → Settings → Notifications → **Webhook**
2. **Webhook URL**: `https://request.surdilamak.my.id/api/webhooks/jellyseerr`
3. **Authorization Header**: `Bearer YOUR_WEBHOOK_SECRET` (same as WEBHOOK_SECRET in .env)
4. **Notification Types**: ✅ enable:
   - Media Available
   - Media Failed
   - Media Partially Available (if you handle series)
5. **JSON Payload**: use the default
6. Click "Test" — if it works, you get 200 OK

## ✅ Step 9: Smoke Test

Open a browser and visit `https://request.surdilamak.my.id`:

### Test 1: Trending Page Loads
- [ ] Hero banner appears
- [ ] Trending grid appears
- [ ] Status badges appear (In Library, Pending, etc.)

### Test 2: Search
- [ ] Click the "Browse" tab
- [ ] Type a query (minimum 2 characters)
- [ ] Search results appear
- [ ] Filter chips work (Movies, Series, Hide in library)

### Test 3: Submit Request
- [ ] Click a film poster that is **not yet** in the library
- [ ] The detail modal appears
- [ ] Click "Request"
- [ ] The form appears (name + email)
- [ ] Submit → the toast "Request lo udah masuk!" appears
- [ ] **Check your Telegram — you should get a notification** 📲

### Test 4: My Requests Flow
- [ ] Click the "My Requests" tab
- [ ] Enter the email you used earlier
- [ ] Check your email → there should be a magic link from Surflix
- [ ] Click the link → redirects to /verify → then to /requests
- [ ] Your request appears with the status "Pending"

### Test 5: Approval (Manual via Jellyseerr for now)
- [ ] Open Jellyseerr
- [ ] Approve the request manually
- [ ] **Webhook should fire** — check the Surflix log:
  ```bash
  docker compose logs surflix | grep -i webhook
  ```
- [ ] The status on your "My Requests" page should update to "Processing"
- [ ] After the film is ready in Jellyfin, the status becomes "Available"
- [ ] **Check your email — you get an "Available now!" notification** 📧

## 🐛 Troubleshooting

### Container won't start / crashes
```bash
docker compose logs surflix --tail 50
```

Common issues:
- **"DATABASE_URL not found"** → `.env` hasn't been loaded. Restart: `docker compose down && docker compose up -d`
- **"Cannot find module @prisma/client"** → Build error, rebuild: `docker compose build --no-cache`

### Trending doesn't show up / empty
- Check the Jellyseerr connection: `curl http://<unraid-ip>:3737/api/health`
- If `jellyseerr: false`, check `JELLYSEERR_URL` & the network (Step 5)
- Check that the Jellyseerr API key is valid

### Email not sent
```bash
docker compose logs surflix | grep -i resend
```
- Make sure the domain `surdilamak.my.id` is verified in Resend
- Or use the sender `onboarding@resend.dev` for now

### No Telegram notifications
```bash
docker compose logs surflix | grep -i telegram
```
- Make sure you've sent `/start` to your bot from Telegram
- Check `TELEGRAM_ADMIN_CHAT_ID` — it must be a number, no @username

### Webhook doesn't fire
- Check that WEBHOOK_SECRET is exactly the same in the Surflix .env & the Jellyseerr config
- Check that the URL is reachable from Jellyseerr:
  ```bash
  docker exec jellyseerr wget -O- https://request.surdilamak.my.id/api/health
  ```

## 🔄 Update / Redeploy

If there are code changes:

```bash
cd /mnt/user/appdata/surflix
docker compose down
docker compose up -d --build
```

The database at `./data/surflix.db` will not be reset because it is mounted as a volume.

## 💾 Backup

Back up these files:
- `.env` (all secrets)
- `./data/surflix.db` (database)

Settings in the Unraid CA Backup plugin:
- **Source**: `/mnt/user/appdata/surflix/`
- **Frequency**: Daily

## 🎯 What Is Not Yet Available in This Build

> **Note**: This build **does not have an admin panel UI yet**. Approving requests must still be done manually via Jellyseerr. After you've tested this deployment successfully, we'll continue building the admin panel.

---

Good luck with the deployment! If there are any errors, share the output of `docker compose logs surflix` and I'll help troubleshoot.
