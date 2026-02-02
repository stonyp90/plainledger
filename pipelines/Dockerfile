# ============================================
# PlainLedger ETL Pipeline Runner
# ============================================
# For local development and E2E testing
# Simulates AWS Glue environment locally

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pipelines/requirements.txt /app/pipelines/requirements.txt
RUN pip install --no-cache-dir -r /app/pipelines/requirements.txt

# Copy pipeline code
COPY pipelines/ /app/pipelines/
COPY scripts/ /app/scripts/

# Set Python path
ENV PYTHONPATH=/app

# Default command (override in docker-compose)
CMD ["python", "-m", "pipelines.orchestration.glue_jobs.bronze_to_silver"]
