#!/usr/bin/env bash
# Compress hero assets that currently dominate page weight.
# Requires: ImageMagick (convert)
# Run from repo root: bash scripts/optimize-public-images.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUB="$ROOT/public"

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick 'convert' required" >&2
  exit 1
fi

logo="$PUB/neparena-logo.png"
cover="$PUB/neparena-cover.png"

if [[ -f "$logo" ]]; then
  convert "$logo" -strip -resize '512x512>' -quality 85 "$PUB/neparena-logo.png"
  convert "$logo" -strip -resize '512x512>' "$PUB/neparena-logo.webp" 2>/dev/null || true
  convert "$logo" -strip -resize '192x192>' "$PUB/pwa-192x192.png"
  convert "$logo" -strip -resize '180x180>' "$PUB/apple-touch-icon.png"
  echo "Logo optimized"
fi

if [[ -f "$cover" ]]; then
  # Prefer WebP; keep a light JPEG fallback as cover.png replacement if needed
  convert "$cover" -strip -resize '1600x>' "$PUB/neparena-cover.webp" 2>/dev/null || true
  convert "$cover" -strip -resize '1600x>' -quality 82 "$PUB/neparena-cover.jpg"
  # Replace heavy PNG with much smaller JPEG bytes under same basename is not ideal;
  # keep PNG only if still needed by crawlers — overwrite with resized PNG:
  convert "$cover" -strip -resize '1600x>' -quality 85 "$PUB/neparena-cover.png"
  echo "Cover optimized"
fi

ls -lh "$PUB"/neparena-logo.* "$PUB"/neparena-cover.* "$PUB"/pwa-192x192.png "$PUB"/apple-touch-icon.png 2>/dev/null || true
