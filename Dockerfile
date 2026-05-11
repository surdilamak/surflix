# Surflix Dockerfile - Multi-stage build
# Base: Node 20 Alpine

# ===== Stage 1: Dependencies =====
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --omit=dev --no-audit --no-fund

# ===== Stage 2: Builder =====
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
RUN npm install --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ===== Stage 3: Runner =====
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl tini
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 surflix

# Copy standalone build
COPY --from=builder --chown=surflix:nodejs /app/.next/standalone ./
COPY --from=builder --chown=surflix:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=surflix:nodejs /app/public ./public

# Copy Prisma schema, generated client, AND prisma binary
COPY --from=builder --chown=surflix:nodejs /app/prisma ./prisma
COPY --from=builder --chown=surflix:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=surflix:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=surflix:nodejs /app/node_modules/prisma ./node_modules/prisma

# Data dir for SQLite
RUN mkdir -p /data && chown -R surflix:nodejs /data
VOLUME ["/data"]

USER surflix
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]

# Run prisma db push (uses local prisma binary, not download new version) then start server
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --accept-data-loss && node server.js"]
