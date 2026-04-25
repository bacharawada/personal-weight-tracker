# ============================================================
# Weight Tracker — Backend Dockerfile
# Base image: Python 3.11 slim (matches pyproject.toml target)
# ============================================================

FROM docker.io/library/python:3.11-slim

# Build-time arg: don't write .pyc files, don't buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend

WORKDIR /app

# Install system deps required by psycopg2 and kaleido
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY backend/ ./backend/

EXPOSE 8000

# Default command (overridden in docker-compose for dev with --reload)
CMD ["uvicorn", "api:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
