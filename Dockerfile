# ================================================
# SPPP-MBI Dockerfile for Google Cloud Run
# Multi-stage build with standalone Next.js output
# ================================================
# Usage:
#   docker build --build-arg DOCKER_BUILD=1 -t sppp-mbi .
#   docker run -p 8080:8080 -e DATABASE_URL=... -e JWT_SECRET=... sppp-mbi
# ================================================

# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* bun.lock* ./
COPY prisma ./prisma/

# Install dependencies
RUN if [ -f package-lock.json ]; then \
      npm ci --ignore-scripts; \
    elif [ -f bun.lock ]; then \
      npm install --ignore-scripts; \
    else \
      npm install --ignore-scripts; \
    fi

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Build
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variable to enable standalone output
ARG DOCKER_BUILD=1
ENV DOCKER_BUILD=${DOCKER_BUILD}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Patch next.config.ts to use standalone output for Docker builds
RUN sed -i 's/^};/  output: "standalone",\n};/' next.config.ts

# Build the application
RUN npm run build

# Stage 3: Production runner
FROM node:20-slim AS runner
WORKDIR /app

# Install OpenSSL for Prisma runtime + curl for healthcheck
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files needed for runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Ensure directories exist with proper permissions
RUN mkdir -p /app/upload /app/download && \
    chown -R nextjs:nodejs /app/upload /app/download /app/.next

# Switch to non-root user
USER nextjs

# Expose port (Cloud Run expects 8080 by default)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start the application using the standalone server
CMD ["node", "server.js"]
