# WORKFLOW.md — Surflix Development & Deployment

> Companion to [`CLAUDE.md`](./CLAUDE.md). Practical workflow guide.

## 🎯 Dev Loop

```
┌─────────────────┐
│  Edit di Mac    │  ~/Developer/surflix
│  (or via CLI)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Git commit     │
│  + push         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub Actions │  ~3-5 menit (amd64 only)
│  builds image   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GHCR pushed    │  ghcr.io/surdilamak/surflix:latest
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Unraid SSH     │  docker-compose pull + up -d
│  pull & restart │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Live di        │  https://surflix.my.id (Landing)
│  production     │  → request.surflix.my.id (Hub)
│                 │  → streaming.surflix.my.id (Jellyfin)
└─────────────────┘
```

## 📝 Common Tasks

### 1. Apply Patches from Claude

Pattern yang dipake: Claude bikin file changes di sandbox, bundle ke zip, kasih ke Idrus untuk apply ke Mac.

```bash
# Download zip dari Claude conversation, ke ~/Downloads
cd ~/Developer/surflix
unzip -o ~/Downloads/surflix-batchN.zip -d /tmp/surflix-batchN

# Apply files (sample, sesuaikan dengan instruction Claude)
cp /tmp/surflix-batchN/some-file.tsx 'components/ui/some-file.tsx'
# ... copy lain-lain

# Verify
git status
git diff
```

### 2. Run Locally (Dev Server)

```bash
cd ~/Developer/surflix

# First-time setup
npm install
npx prisma generate

# Run dev server
npm run dev

# Open http://localhost:3000
```

**Note**: Local dev butuh `.env.local` with:
```
DATABASE_URL=file:./prisma/dev.db
JELLYSEERR_URL=http://192.168.68.8:5055
JELLYSEERR_API_KEY=<from-production-env>
SESSION_SECRET=anyrandomstring
ADMIN_USERNAME=test
ADMIN_PASSWORD_HASH=<bcrypt-hash-of-your-test-password>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_JELLYFIN_URL=https://streaming.surflix.my.id
```

### 3. Commit Convention

Format: `<scope>: <description>`

Examples:
- `Fix: search multi-word URL encoding`
- `Feature: add Telegram bot integration`
- `Batch 4a: bug fixes + history page`
- `Cleanup: remove zombie code`
- `Refactor: extract config to runtime endpoint`

Idrus suka batch commits jadi semantically grouped. Jangan commit setiap line change separately.

### 4. Push & Deploy

```bash
# Mac
git add .
git commit -m "..."
git push

# Monitor build
# https://github.com/surdilamak/surflix/actions

# Wait for green ✅ (~3-5 min)

# SSH to Unraid (or use Unraid Terminal in web UI)
ssh root@192.168.68.8

# Pull & restart
cd /mnt/user/appdata/surflix
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Verify logs
docker-compose -f docker-compose.prod.yml logs --tail 20
```

### 5. Database Operations

```bash
# View tables (di Unraid)
docker exec surflix node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.request.count().then(c => { console.log('Total requests:', c); process.exit(); });
"

# Reset DB (HATI-HATI: hapus semua data)
docker exec surflix rm -f /data/surflix.db
docker-compose -f docker-compose.prod.yml restart

# Backup DB
docker cp surflix:/data/surflix.db ~/backup-$(date +%Y%m%d).db

# Restore DB
docker cp ~/backup-20260513.db surflix:/data/surflix.db
docker-compose -f docker-compose.prod.yml restart

# Run Prisma migration (after schema.prisma change)
# Automatic on container startup via Dockerfile CMD
# Manual: docker exec surflix node node_modules/prisma/build/index.js db push --accept-data-loss
```

### 6. Telegram Bot Management

```bash
# Check webhook status via Surflix admin
curl -s https://request.surflix.my.id/api/telegram/setup \
  -H "Cookie: surflix_admin_session=<session-cookie>"

# Re-register webhook (after URL change or token rotation)
curl -X POST https://request.surflix.my.id/api/telegram/setup \
  -H "Cookie: surflix_admin_session=<session-cookie>"

# Or just klik tombol "Register Webhook" di /admin/settings
```

### 7. Reset Admin Password

```bash
cd /mnt/user/appdata/surflix

# Generate new hash inside container
docker exec surflix node -e "
const b = require('bcryptjs');
b.hash('YOUR_NEW_PASSWORD', 10).then(h => {
  console.log('Hash:', h);
  console.log('Escaped:', 'ADMIN_PASSWORD_HASH=' + h.split('\$').join('\$\$'));
});
"

# Copy the "Escaped" line, update .env
nano .env  # paste replace ADMIN_PASSWORD_HASH line

# Reset admin record in DB so bootstrap re-creates
docker exec surflix node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.admin.deleteMany().then(r => { console.log('Deleted', r.count); process.exit(); });
"

# Restart
docker-compose -f docker-compose.prod.yml restart
```

### 8. Debug Production Issues

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Live logs
docker-compose -f docker-compose.prod.yml logs -f --tail 20

# Filter logs for specific keyword
docker-compose -f docker-compose.prod.yml logs --tail 100 | grep -i "error\|jellyseerr\|telegram"

# Inspect env inside container
docker exec surflix env | grep -i "telegram\|jellyseerr\|admin"

# Test API endpoint from container (simulates Surflix→Jellyseerr call)
docker exec surflix sh -c 'curl -s -H "X-Api-Key: $JELLYSEERR_API_KEY" $JELLYSEERR_URL/api/v1/status'

# Restart container
docker-compose -f docker-compose.prod.yml restart

# Full rebuild (rare, kalau image cache corrupted)
docker-compose -f docker-compose.prod.yml down
docker rmi ghcr.io/surdilamak/surflix:latest
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 🚨 Emergency Recovery

### Build Stuck di GitHub Actions

Symptom: Build > 30 menit, stuck di stage tertentu.

```bash
# Cancel di GitHub UI: Actions tab → running workflow → Cancel
# Push fix kalau perlu, atau retry
```

Likely cause: ARM64 build di-enable lagi entah gimana. Verify `.github/workflows/docker-build.yml`:
```yaml
platforms: linux/amd64  # SHOULD BE THIS
# NOT: linux/amd64,linux/arm64
```

### Container Restart Loop

Symptom: `docker-compose ps` shows "Restarting (1)".

```bash
docker-compose -f docker-compose.prod.yml logs --tail 30
```

Common causes:
1. **SQLite permission**: `chown -R 1001:1001 data/`
2. **Prisma migration fail**: schema mismatch, reset DB
3. **Env missing**: check `JELLYSEERR_URL`, `JELLYSEERR_API_KEY` set

### Telegram Webhook Not Firing

```bash
# Check webhook info
curl -s https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Verify:
# - URL points to https://request.surflix.my.id/api/telegram/webhook?secret=...
# - No "last_error_message"
# - "pending_update_count": 0

# Re-register if needed via /admin/settings UI
```

### Jellyseerr Connection Lost

```bash
# Test from Surflix container
docker exec surflix sh -c 'curl -s -o /dev/null -w "%{http_code}\n" $JELLYSEERR_URL/api/v1/status'

# Should return: 200

# If 000 (connection failed): check extra_hosts in docker-compose.prod.yml
# If 403: API key permission issue
# If 401: API key wrong
```

## 🌍 Environment Variables Reference

Lihat `.env.example` di repo.

### Required
- `DATABASE_URL` — SQLite file path
- `JELLYSEERR_URL` — Jellyseerr internal URL
- `JELLYSEERR_API_KEY` — API key (need admin permission for library stats)
- `SESSION_SECRET` — 32+ char random string
- `ADMIN_USERNAME` — bootstrap admin
- `ADMIN_PASSWORD_HASH` — bcrypt hash (escape `$` to `$$` in Docker Compose)
- `NEXT_PUBLIC_APP_URL` — public HTTPS URL (e.g. `https://request.surflix.my.id`)
- `NEXT_PUBLIC_JELLYFIN_URL` — public Jellyfin URL
- `WEBHOOK_SECRET` — for Telegram webhook & Jellyseerr webhook auth

### Optional
- `TELEGRAM_BOT_TOKEN` — bot token from BotFather
- `TELEGRAM_ADMIN_CHAT_ID` — admin Telegram chat ID
- `RESEND_API_KEY` — for email notifications (currently unused)
- `EMAIL_FROM` — sender email
- `RATE_LIMIT_MAX` — requests per window (default 100)
- `RATE_LIMIT_WINDOW_MS` — window duration (default 3600000 / 1 hour)

### Important Escape Rules

In `.env` for Docker Compose:
- Single `$` in values must be escaped to `$$`
- Affects bcrypt hashes (`$2a$10$...` → `$$2a$$10$$...`)
- Container receives un-escaped value (single `$`)

## 🔧 Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Search "Fight Club" returns 0 | URL encoding wrong | Verify `lib/jellyseerr.ts` uses `encodeURIComponent` |
| Modal at bottom on desktop | Mobile detection failing | Check `matchMedia` usage in `detail-modal.tsx` |
| Watch on Surflix link is `/#` | Runtime config not loaded | Verify `/api/config` returns URL, check `useAppConfig` hook |
| Library stats show 0 | API key permission limited | Regenerate API key from Jellyseerr Settings → General |
| Build takes 40+ min | ARM64 build enabled | Disable in `.github/workflows/docker-build.yml` |
| Login admin fails | Hash mismatch | Generate new bcrypt hash, reset Admin table |
| Container won't start | SQLite permission | `chown -R 1001:1001 data/` |
| Telegram notif missing | Webhook not registered | Visit `/admin/settings` → Register Webhook |
| Modal mobile rusak | Flex pattern broken | Check responsive alignment in `detail-modal.tsx` |
