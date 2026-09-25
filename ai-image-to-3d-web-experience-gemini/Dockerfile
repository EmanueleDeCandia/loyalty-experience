# Base image with Node.js 22 (required for built-in node:sqlite)
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application files and build client bundle
COPY . .
RUN npm run build

# Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV SERVE_STATIC=1

# Copy built assets and backend
COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/scripts ./scripts

# Ensure data directory exists for SQLite
RUN mkdir -p data

EXPOSE 8080

CMD ["node", "server/api-server.mjs"]
