# ==============================================================================
# Katalog Backend — Multi-stage Production Dockerfile
# ==============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client & build TypeScript
RUN npx prisma generate
RUN npm run build

# --- Stage 2: Production ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy package info and built assets
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
