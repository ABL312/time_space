#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_PATH="${1:-${ROOT_DIR}/server}"

echo "[build] root: ${ROOT_DIR}"
echo "[build] output: ${OUTPUT_PATH}"

cd "${ROOT_DIR}"
mkdir -p "$(dirname "${OUTPUT_PATH}")"

CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o "${OUTPUT_PATH}" ./cmd/server

echo "[build] done"
