# ── Stage 1: Build everything ────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better Docker cache)
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/

RUN npm ci

# Copy source and build all packages
COPY tsconfig.base.json ./
COPY packages/engine/ packages/engine/
COPY packages/server/ packages/server/
COPY packages/web/ packages/web/

RUN npm run build --workspace=@lureh/engine && \
    npm run build --workspace=@lureh/server && \
    npm run build --workspace=@lureh/web

# ── Stage 2: Production image ───────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install production deps only
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/

RUN npm ci --omit=dev

# Copy built output from builder
COPY --from=builder /app/packages/engine/dist packages/engine/dist
COPY --from=builder /app/packages/server/dist packages/server/dist
COPY --from=builder /app/packages/server/src/db/schema.sql packages/server/src/db/schema.sql
COPY --from=builder /app/packages/web/dist packages/web/dist

# Database volume — data persists here
VOLUME /app/data
ENV LUREH_DB_PATH=/app/data/lureh.db

EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
