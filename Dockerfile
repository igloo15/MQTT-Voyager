# ── Stage 1: Build web frontend ───────────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app

COPY package*.json tsconfig.json webpack.web.config.ts ./
COPY src/ ./src/
COPY shared/ ./shared/

RUN npm ci && npm run build:web

# ── Stage 2: Build Express server ─────────────────────────────────────────────
FROM node:20-alpine AS backend
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY src/services/ ./src/services/
COPY shared/ ./shared/
COPY server/tsconfig.json ./server/tsconfig.json

RUN npm install typescript --save-dev && npm run build:server

# ── Stage 3: Production image ──────────────────────────────────────────────────
FROM node:20-alpine
RUN apk add --no-cache sqlite-libs

WORKDIR /app

# Copy server build
COPY --from=backend /app/dist/server ./dist/server
COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/package*.json ./

# Copy web frontend
COPY --from=frontend /app/dist/web ./dist/web

# Data directory (mount as volume for persistence)
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/app/data

EXPOSE 4000
CMD ["node", "dist/server/server/src/index.js"]
