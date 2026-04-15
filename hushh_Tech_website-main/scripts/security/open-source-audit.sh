#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "Running tracked-file checks..."
if git ls-files | rg -n '(^|/)\.env$|(^|/)vertex-ai-key\.json$|\.p8$|(^|/)private_keys/'; then
  echo
  echo "Tracked secret-bearing files are still present."
  exit 1
fi

echo "Running gitleaks on the current tree..."
bash scripts/security/run-gitleaks.sh

echo "Checking known historical exposure paths..."
if git log --all --name-only --pretty=format: | rg -n '^\.env$|^src/scripts/AuthKey_LK53NZBH4L\.p8$'; then
  echo
  echo "Historical exposures still exist in git history. Rewrite history before making the repo public."
  exit 1
fi

echo "Current-tree audit passed. Historical rewrite is still required before the repo is fully secret-clean."
