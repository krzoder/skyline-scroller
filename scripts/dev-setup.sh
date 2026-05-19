#!/usr/bin/env bash
# One-shot setup for a fresh clone: install deps + register Obsidian vault.
set -eu
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

echo "→ Installing npm dependencies"
npm ci

echo "→ Registering wiki/ with Obsidian (if installed)"
bash "${REPO_ROOT}/scripts/setup-vault.sh"

echo ""
echo "✓ Setup complete. Run 'npm run dev' to start the local dev server,"
echo "  or 'npm run build && npx vitest run' to verify the project."
