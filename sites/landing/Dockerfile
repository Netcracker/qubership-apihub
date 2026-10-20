# ──────────────────────────────────────────────
# Stage 1: Build the Astro static site
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leverages Docker layer cache)
COPY package.json ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy source and build
COPY . .
RUN npm run build

# ──────────────────────────────────────────────
# Stage 2: Serve with nginx
# ──────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/landing.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
