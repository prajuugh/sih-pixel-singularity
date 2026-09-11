# Stage 1: Build production React Vite bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications and install cleanly
COPY package*.json ./
RUN npm ci

# Pass build-time environment arguments (defaults to relative /api for reverse proxy)
ARG VITE_API_BASE_URL=/api
ARG VITE_AGENT_BASE_URL=http://localhost:5001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AGENT_BASE_URL=$VITE_AGENT_BASE_URL

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Nginx web server
FROM nginx:alpine

# Copy built static files to Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for SPA routing & API reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
