# =====================================================
# Surflix Dockerfile (Multi-stage build)
# Base: Node 20 Alpine (lightweight)
# Output: standalone Next.js app (~150MB)
# =====================================================

# ===== Stage 1: Dependencies =====
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files + prisma schema (untuk postinstall)
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# Install deps (npm ci untuk reproducible install)
RUN npm install --omit=dev --no-audit --no-fund

# ===== Stage 2: Builder =====
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Install dev deps untuk build
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build env stubs (real values di-inject di runtime)
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client + build Next.js
RUN npx prisma generate
RUN npm run build

# ===== Stage 3: Runner (production) =====
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl tini
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user untuk security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 surflix

# Copy standalone output + static + prisma
COPY --from=builder --chown=surflix:nodejs /app/.next/standalone ./
COPY --from=builder --chown=surflix:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=surflix:nodejs /app/public ./public
COPY --from=builder --chown=surflix:nodejs /app/prisma ./prisma
COPY --from=builder --chown=surflix:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=surflix:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Data dir untuk SQLite (mounted volume)
RUN mkdir -p /data && chown -R surflix:nodejs /data
VOLUME ["/data"]

USER surflix

EXPOSE 3000

# Tini sebagai PID 1 untuk handle SIGTERM dengan benar
ENTRYPOINT ["/sbin/tini", "--"]

# Run migration + start
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
