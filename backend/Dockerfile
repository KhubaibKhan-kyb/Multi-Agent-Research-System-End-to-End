# Multi-Stage Dockerfile for Multi-Agent Research System Backend
# Compatible with: Hugging Face Spaces, Railway, Render, and other platforms

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire backend code
COPY . .

# Expose port (Hugging Face Spaces default: 7860, Railway/others: 8000)
# We'll use 7860 for HF Spaces, but code will use $PORT env var for flexibility
EXPOSE 7860 8000

# Health check (useful for Hugging Face Spaces)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-7860}/health || exit 1

# Run the FastAPI application
# HF Spaces sets PORT=7860, Railway sets PORT=8000, other platforms vary
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
