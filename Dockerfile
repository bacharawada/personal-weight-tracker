# ============================================================
# Weight Tracker — Production Dockerfile
#
# Multi-stage build:
#   Stage 1 (builder): compiles the React/Vite frontend
#   Stage 2 (app):     Python + FastAPI serving the SPA + API
#
# Keycloak connection details are baked into the JS bundle at
# build time via VITE_* ARGs (passed by GitHub Actions).
# ============================================================

# ------------------------------------------------------------
# Stage 1: build the React frontend
# ------------------------------------------------------------
FROM docker.io/library/node:20-alpine AS builder

WORKDIR /app/frontend

# Install dependencies first for better layer caching
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Keycloak connection details are embedded in the JS bundle at build time.
# These must be passed as --build-arg by the CI pipeline.
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

ENV VITE_KEYCLOAK_URL=${VITE_KEYCLOAK_URL}
ENV VITE_KEYCLOAK_REALM=${VITE_KEYCLOAK_REALM}
ENV VITE_KEYCLOAK_CLIENT_ID=${VITE_KEYCLOAK_CLIENT_ID}

RUN npm run build


# ------------------------------------------------------------
# Stage 2: Python backend + pre-built frontend
# ------------------------------------------------------------
FROM docker.io/library/python:3.11-slim AS app

# Prevent .pyc files and force stdout/stderr flushing
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend

WORKDIR /app

# System deps required by psycopg2 and kaleido
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (layer-cached)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend source
COPY backend/ ./backend/

# Pre-built React SPA from Stage 1.
# FastAPI serves this from /app/frontend/dist (see api/__init__.py).
COPY --from=builder /app/frontend/dist ./frontend/dist/

# Entrypoint: runs alembic migrations then starts the server
COPY backend/entrypoint.sh ./backend/entrypoint.sh
RUN chmod +x ./backend/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./backend/entrypoint.sh"]
