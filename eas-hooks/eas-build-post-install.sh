#!/usr/bin/env bash

# EAS Build Hook: Copy mapping.txt to artifacts directory
# This makes the R8 mapping file available for download

set -e

echo "📦 Copying R8 mapping file to artifacts..."

# Find the mapping file (it's generated during the build)
MAPPING_FILE=""
if [ -f "android/app/build/outputs/mapping/release/mapping.txt" ]; then
  MAPPING_FILE="android/app/build/outputs/mapping/release/mapping.txt"
elif [ -f "app/build/outputs/mapping/release/mapping.txt" ]; then
  MAPPING_FILE="app/build/outputs/mapping/release/mapping.txt"
fi

if [ -n "$MAPPING_FILE" ] && [ -f "$MAPPING_FILE" ]; then
  # Create artifacts directory if it doesn't exist
  mkdir -p artifacts
  cp "$MAPPING_FILE" artifacts/mapping.txt
  echo "✅ Mapping file copied to artifacts/mapping.txt"
  ls -lh artifacts/mapping.txt
else
  echo "⚠️  Mapping file not found. R8 might not have generated it."
  echo "   This is normal if minification is disabled."
fi








