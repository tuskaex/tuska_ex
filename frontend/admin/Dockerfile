FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Trader app URL is baked into the client bundle at build time (NEXT_PUBLIC_*).
# Left empty in prod so the admin UI auto-derives it from the admin.* hostname;
# the dev override passes http://localhost:3010 (the published trader port).
ARG NEXT_PUBLIC_TRADER_URL
ENV NEXT_PUBLIC_TRADER_URL=$NEXT_PUBLIC_TRADER_URL
# TuskaEx's own admin hostname. Client code compares the current host against
# it to decide whether this panel belongs to a white-label tenant, and
# NEXT_PUBLIC_* is inlined at BUILD time — a runtime env var alone reaches the
# server metadata but never the browser bundle.
ARG NEXT_PUBLIC_PLATFORM_ADMIN_HOST=
ENV NEXT_PUBLIC_PLATFORM_ADMIN_HOST=$NEXT_PUBLIC_PLATFORM_ADMIN_HOST
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
