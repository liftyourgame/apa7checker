# ── Stage 1: build ──────────────────────────────────────────────────────────
# Run Vite to produce a static build in dist/
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build        # runs: vite build → outputs to dist/

# ── Stage 2: serve ──────────────────────────────────────────────────────────
# Minimal nginx image — only the compiled static assets are copied across.
FROM nginx:1.27-alpine AS runtime

# Copy the compiled React app
COPY --from=build /app/dist /usr/share/nginx/html

# Our custom nginx config (SPA fallback + /api proxy to backend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
