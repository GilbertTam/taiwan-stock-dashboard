# syntax=docker/dockerfile:1
FROM node:18-alpine AS builder

WORKDIR /app

COPY ./electricity-market-prediction/package*.json ./

# BuildKit cache mount: npm's content-addressable cache persists on the host between builds.
# Packages unchanged in package-lock.json are served from cache, not re-downloaded.
# fetch-retries/timeout make the install resilient to transient registry ECONNRESET.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps \
      --fetch-retries=5 \
      --fetch-retry-mintimeout=20000 \
      --fetch-retry-maxtimeout=120000 \
      --fetch-timeout=600000

COPY ./electricity-market-prediction .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Required for standalone server.js to bind to all interfaces inside Docker
# (without this it only binds to localhost and nginx cannot reach it).
ENV HOSTNAME=0.0.0.0

# Standalone output contains only the modules Next.js actually imports at runtime.
# No npm install needed in the runner stage — eliminates 761 MB of node_modules.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
