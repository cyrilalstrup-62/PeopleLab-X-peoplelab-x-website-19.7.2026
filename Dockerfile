# Multi-stage production Dockerfile for PeopleLab X
# Stage 1: Build static assets and backend server
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files and install all dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build config
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
COPY assets/ ./assets/
COPY server.ts ./

# Run production build
RUN npm run build

# Stage 2: Runtime image
FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Expose port 3000 (standard for the app)
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.cjs"]
