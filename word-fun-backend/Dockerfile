# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev) to build
RUN npm install

COPY src ./src

# Build the TypeScript code
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Cloud Run expects the app to listen on port 8080 or the PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
