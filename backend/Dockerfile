# syntax=docker/dockerfile:1

# ---- Build stage: compile C extensions, install all deps ----
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# gcc + libpq-dev are needed to compile C extensions (argon2-cffi, cryptography).
# They are only needed at build time; the runtime stage does not include them.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# BuildKit cache mount: pip's HTTP/wheel cache persists on the host between builds.
# On warm builds with no requirements.txt changes, completes in ~5-10 sec instead of ~90 sec.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools && \
    pip install -r requirements.txt

# ---- Runtime stage: lean image without build tools ----
FROM python:3.11-slim-bookworm AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy only the installed packages from the builder — no gcc or libpq-dev in the final image.
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy source code last so source-only changes don't invalidate the pip install layer above.
COPY . .

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
