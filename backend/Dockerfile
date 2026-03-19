# ── Stage 1: build ──────────────────────────────────────────────────────────
# Install ALL deps (including devDeps) so tsc is available, then compile.
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build        # runs: tsc → outputs to dist/

# ── Stage 2: runtime ────────────────────────────────────────────────────────
# Fresh image with production deps only — no TypeScript toolchain in the final image.
FROM node:20-alpine AS runtime

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Non-root user for security
RUN addgroup -S apa7 && adduser -S apa7 -G apa7
USER apa7

EXPOSE 3001

# Runs: node dist/server.js
CMD ["node", "dist/server.js"]
