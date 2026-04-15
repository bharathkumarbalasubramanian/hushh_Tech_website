#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "History rewrite requires a clean working tree. Commit or stash your changes first."
  exit 1
fi

if ! git filter-repo --version >/dev/null 2>&1; then
  echo "git-filter-repo is not installed."
  echo "Install it first, then re-run: npm run security:rewrite-history"
  exit 1
fi

cat <<'EOF'
This operation is destructive and should be run only after:
1. exposed credentials have been rotated
2. a short merge freeze has been announced
3. deploy automation has been temporarily disabled for the rewrite window
4. branch protection has been relaxed only as much as needed for the force-push

Run this from a clean disposable clone, not your daily working checkout.
EOF

echo
echo "Rewriting history to remove known secret-bearing files..."
git filter-repo \
  --force \
  --sensitive-data-removal \
  --invert-paths \
  --path .env \
  --path src/scripts/AuthKey_LK53NZBH4L.p8

cat <<'EOF'

History rewrite completed for the known secret-bearing files.

Next steps:
1. Run: npm run security:audit
2. Force-push rewritten branches and tags.
3. Re-enable deploy automation.
4. Restore branch protection.
5. Ask GitHub Support to purge cached PR refs and SHA-addressable history views.
6. Have all collaborators re-clone or hard reset to the rewritten history.
EOF
