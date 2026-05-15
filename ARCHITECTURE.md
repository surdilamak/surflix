# ARCHITECTURE.md — Surflix Technical Deep Dive

> Companion to [`CLAUDE.md`](./CLAUDE.md). Detail teknis untuk Claude Code.

## 🧱 Stack Decisions

### Why Next.js 14 (App Router)?
- Full-stack di satu codebase (frontend + API routes)
- Server components reduce JS bundle
- Built-in image optimization (`<Image>`)
- Standalone output mode buat lean Docker images

### Why SQLite (not Postgres)?
- Single-file DB, mounted via Docker volume (`/data/surflix.db`)
- Zero external dependency (no DB container)
- Sufficient untuk ~thousand requests/day scale
- Easy backup (just copy the .db file)
- Trade-off: no concurrent writes (acceptable untuk this use case)

### Why Prisma?
- Type-safe DB queries
- Auto-generated client
- Schema migration via `prisma db push` (no manual SQL)
- Catch: enum types **NOT** supported di SQLite — pakai `String` dengan documented values

### Why Iron Session (not JWT)?
- Cookie-based, server-side validated
- Encrypted (no need to trust client)
- Stateless dari server perspective
- HttpOnly, Secure flags by default

### Why No external Telegram lib?
Avoid `node-telegram-bot-api` dependency:
- Library bawa `polling` mode yang gak kita pake
- Library install size ~10MB
- Pure HTTP fetch lebih simple dan reliable

## 📊 Database Schema

```prisma
model Guest {
  id          String   @id @default(cuid())
  name        String
  email       String   @unique  // Dummy "guest-XXX@cookie.local" for cookie-based users
  createdAt   DateTime @default(now())
  lastActive  DateTime @default(now())
  requests    Request[]
}

model Request {
  id           String   @id @default(cuid())
  guestId      String
  guest        Guest    @relation(fields: [guestId], references: [id])

  tmdbId       Int
  mediaType    String   // "movie" | "tv"
  title        String
  posterPath   String?
  backdropPath String?
  overview     String?
  releaseDate  String?
  rating       Float?

  // Status: PENDING_ADMIN | REJECTED | APPROVED | ON_SCHEDULE |
  //         PROCESSING | PARTIALLY_AVAILABLE | AVAILABLE | FAILED
  status       String   @default("PENDING_ADMIN")
  adminNote    String?
  guestNote    String?  // Optional guest note (subtitle request, file quality complaint)

  jellyseerrRequestId Int?
  jellyseerrMediaId   Int?

  requestedAt DateTime  @default(now())
  approvedAt  DateTime?
  rejectedAt  DateTime?
  availableAt DateTime?

  @@unique([guestId, tmdbId, mediaType])
  @@index([status])
}

model Admin {
  id            String   @id @default(cuid())
  username      String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  lastLoginAt   DateTime?
}

model RateLimit {
  id          String   @id @default(cuid())
  ipAddress   String
  endpoint    String
  count       Int      @default(1)
  windowStart DateTime @default(now())

  @@unique([ipAddress, endpoint, windowStart])
}

model EventLog {
  id        String   @id @default(cuid())
  type      String   // "request.created", "request.approved", "admin.login", etc.
  payload   String   // JSON stringified
  createdAt DateTime @default(now())
}
```

## 🔌 API Routes Reference

### Public (Guest) Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/config` | Runtime config (`force-dynamic`, evaluates env on every request) |
| GET | `/api/health` | DB + Jellyseerr connection check |
| GET | `/api/trending?page=N` | TMDB trending with pagination |
| GET | `/api/upcoming` | TMDB upcoming movies (30min cache) |
| GET | `/api/discover?type=&genre=&year=&network=&page=` | Filter-based discovery |
| GET | `/api/search?q=&page=` | Jellyseerr search (uses `encodeURIComponent`) |
| GET | `/api/detail?type=&id=` | Rich metadata (director, cast, genres, runtime) |
| POST | `/api/request` | Submit new request |
| GET | `/api/requests/by-guest?id=` | List request by guestId (cookie-based) |
| GET | `/api/library?email=` | Library: personal + community split |
| GET | `/api/library-stats` | Movies/series count (Jellyseerr or local DB fallback) |
| GET | `/api/most-requested` | Aggregate request counts (10min cache) |

### Admin Endpoints (Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/login` | Login (bcrypt verify) |
| DELETE | `/api/admin/login` | Logout |
| GET | `/api/admin/requests?status=&limit=` | Admin view requests |
| GET | `/api/admin/stats` | Dashboard stats + top requesters + recent events |
| POST | `/api/admin/approve` | Approve request → forward to Jellyseerr |
| POST | `/api/admin/reject` | Reject with optional reason |

### Webhook Endpoints (External Caller)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/telegram/webhook?secret=` | Telegram callback (button clicks) |
| GET | `/api/telegram/setup` | Get webhook status (admin only) |
| POST | `/api/telegram/setup` | Register webhook URL (admin only) |
| POST | `/api/webhooks/jellyseerr` | Jellyseerr → Surflix status updates |

## 🔐 Auth & Security

### Admin Session
- Cookie name: `surflix_admin_session`
- Encryption: Iron Session (AES-256-GCM)
- HttpOnly, Secure, SameSite=lax
- Expiry: 7 days
- Cleared on logout (`DELETE /api/admin/login`)

### Telegram Webhook Verification
- `?secret=<WEBHOOK_SECRET>` query param (must match `.env`)
- Sender verification: `callback_query.from.id === TELEGRAM_ADMIN_CHAT_ID`
- Reject if either fails

### Rate Limiting
Per-IP, per-endpoint, sliding window:
- `/api/request`: configurable via `RATE_LIMIT_MAX` env (default 100/hour)
- Storage: `RateLimit` table (auto-cleanup via window expiry)

### CORS
Same-origin only (no `Access-Control-Allow-Origin` set). Reverse proxy handles HTTPS termination.

## 🎯 Caching Strategy

### Server-Side (in-memory Map)
- `/api/trending` → 1 hour per page
- `/api/upcoming` → 30 minutes
- `/api/detail` → 30 minutes per item
- `/api/most-requested` → 10 minutes
- `/api/library-stats` → 10 minutes

### Browser-Side
- `localStorage` untuk `surflix_guest_info` (name, guestId) — persistent
- No service worker, no PWA caching (yet)

### Important Note
`/api/config` uses **`export const dynamic = 'force-dynamic'`** untuk solve Next.js standalone yang cache route at build time (env vars empty at build). Set `revalidate = 0` juga.

## 🌐 Network & Deployment

### Docker Compose
```yaml
services:
  surflix:
    image: ghcr.io/surdilamak/surflix:latest
    container_name: surflix
    ports:
      - "3737:3000"
    extra_hosts:
      - "host.docker.internal:host-gateway"  # buat akses Jellyseerr di host
    volumes:
      - ./data:/data  # SQLite persistent
    environment:
      JELLYSEERR_URL: http://host.docker.internal:5055
      # ... env from .env file
```

### Reverse Proxy (Nginx Proxy Manager on Unraid)
- `https://request.surflix.my.id` → Unraid `192.168.68.8:3737` (Surflix)
- `https://www.surflix.my.id` → Unraid `192.168.68.8:8096` (Jellyfin, whitelabeled)
- All `/api/*` paths exposed (including `/api/telegram/webhook`)
- HTTPS termination at NPM (apps run HTTP internally)
- Legacy `*.surdilamak.my.id` subdomains: keep as 301 redirects in NPM if still in DNS

### Docker Image Build
- Multi-stage: deps → builder → runner
- Base: `node:20-alpine`
- Output: standalone Next.js
- Critical deps explicitly copied to runner stage:
  - `node_modules/bcryptjs` (Next.js standalone tracer misses it)
  - `node_modules/sharp` + `node_modules/@img` (image optimization)
  - `node_modules/prisma` + `node_modules/.prisma` + `node_modules/@prisma`
- ARM64 build disabled (Unraid is amd64)

### Build Pipeline
```
git push → GitHub Actions trigger
  ↓
Build amd64 image (~3-5 min)
  ↓
Push to GHCR (ghcr.io/surdilamak/surflix:latest)
  ↓
Manual: docker-compose pull && up -d
```

## 🎨 Frontend Patterns

### Route Groups
- `(guest)` — public pages, shared layout dengan TopNav + Footer + BottomTabBar
- `(admin)` — admin pages, terpisah dari guest layout

### Responsive Strategy
- **Mobile-first**: default styles untuk small screens
- **Breakpoint**: `md:` (768px+) untuk desktop overrides
- **Navigation**: BottomTabBar di mobile, TopNav di desktop
- **Modals**: bottom sheet di mobile, centered di desktop (via `matchMedia` detection)

### Component Patterns
- All client components marked `'use client'`
- Server components default (untuk API routes & data fetching)
- Framer Motion untuk animations
- Lucide React icons (re-exported via `components/ui/icons.tsx`)

### State Management
- **No Redux/Zustand** — local component state cukup
- **React Query / SWR**: NOT used — useEffect + fetch
- **Form state**: useState (no Formik/RHF)
- **Routing**: Next.js App Router built-in

## 🔄 External Integrations

### Jellyseerr API
Base: `http://host.docker.internal:5055/api/v1`

Common endpoints used:
- `GET /search?query=&page=&language=en` — search media
- `GET /discover/trending?page=` — trending
- `GET /discover/movies?genre=&year=` — discover with filters
- `GET /discover/tv?network=` — TV with network filter
- `GET /discover/movies/upcoming` — upcoming
- `GET /media/movie/<tmdb_id>` — detail with credits
- `POST /request` — create request (forwards to Radarr/Sonarr)

**Auth**: `X-Api-Key` header

**Known limitation**: API key di .env current adalah user-level (gak punya akses `/media` filter endpoint). Library stats fallback ke local DB.

### Telegram Bot API
Base: `https://api.telegram.org/bot<TOKEN>`

Methods used:
- `sendPhoto` — kirim notif dengan poster + caption + inline buttons
- `sendMessage` — text message (untuk overview reply)
- `editMessageCaption` — update caption setelah approve/reject
- `answerCallbackQuery` — acknowledge button click
- `setWebhook` — register webhook URL
- `getWebhookInfo` — check webhook status

**Pattern**: Pure HTTP fetch, JSON body, parse_mode HTML untuk formatting.

### TMDB Images
Images served direct dari TMDB CDN (Surflix never proxy):
- Poster: `https://image.tmdb.org/t/p/w500<path>`
- Backdrop: `https://image.tmdb.org/t/p/w780<path>`
- Profile: `https://image.tmdb.org/t/p/w185<path>`

Next.js `<Image>` configured untuk remote pattern:
```js
remotePatterns: [
  { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' }
]
```

## 🧪 Testing Approach

**Currently**: Manual testing only.

**Future considerations**:
- E2E with Playwright (admin flow approve/reject)
- Unit tests untuk lib functions (jellyseerr, utils)
- API contract tests

## 📈 Performance Notes

### Bundle Size
- Standalone build: ~150MB Docker image (compressed)
- First load JS: ~200KB (gzipped) on guest pages
- Static assets: Next.js handles optimization

### Database Queries
- Most queries use `findMany` with `take` limits
- Indexed on `status` and `requestedAt` for fast filtering
- `groupBy` queries cached aggressively

### Image Optimization
- Sharp enabled (explicitly bundled in Docker)
- Next.js `<Image>` lazy-loads + responsive sizes
- TMDB CDN handles delivery

## 🐛 Common Pitfalls

1. **`NEXT_PUBLIC_*` env stripped at build time** in standalone mode → use runtime `/api/config` + `useAppConfig()` hook.

2. **`URLSearchParams` encodes spaces as `+`** but Jellyseerr requires `%20` → use `encodeURIComponent()` directly.

3. **Docker Compose dollar sign escape** — bcrypt hash `$2a$10$...` becomes empty string unless escaped to `$$2a$$10$$...` in `.env`.

4. **SQLite + Prisma enum**: not supported, use String + documented values.

5. **Next.js standalone tracer** sometimes misses runtime deps (sharp, bcryptjs) → explicitly COPY in Dockerfile.

6. **Telegram webhook** must be HTTPS — use public URL via reverse proxy, not internal IP.
