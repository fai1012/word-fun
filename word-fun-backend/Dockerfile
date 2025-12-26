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

# Install Python and build dependencies for spaCy/pyspellchecker
RUN apk add --no-cache python3 py3-pip g++ make python3-dev

# Create a virtual environment to avoid PEP 668 and install requirements
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download en_core_web_sm

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY validate_word.py ./

# Cloud Run expects the app to listen on port 8080 or the PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
