# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/contracts/package*.json ./packages/contracts/
COPY packages/domain/package*.json ./packages/domain/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/contracts/src ./packages/contracts/src
COPY packages/contracts/tsconfig.json ./packages/contracts/
COPY packages/domain/src ./packages/domain/src
COPY packages/domain/tsconfig.json ./packages/domain/
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/
COPY tsconfig.json ./

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install tsx globally
RUN npm install -g tsx

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/tsconfig.json ./
COPY infra/sql/migrations ./infra/sql/migrations

# Set environment
ENV NODE_ENV=production
ENV DAYSI_RUNTIME_PROFILE=cutover
ENV DAYSI_API_HOST=0.0.0.0
ENV DAYSI_API_PORT=4010

# Expose port
EXPOSE 4010

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4010/v1/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the API
CMD ["tsx", "apps/api/src/index.ts"]
