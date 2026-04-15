#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks is not installed."
  echo "Install it first, then re-run: npm run security:gitleaks"
  exit 1
fi

gitleaks dir . --config .gitleaks.toml --redact --no-banner --max-target-megabytes 10
