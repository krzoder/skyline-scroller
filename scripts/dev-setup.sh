#!/usr/bin/env bash
# One-shot setup for a fresh clone: preflight env, install deps, register Obsidian vault.
set -eu
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

REQUIRED_NODE_MAJOR=24

if ! command -v node >/dev/null 2>&1; then
    echo "✗ node not found on PATH. Install Node ${REQUIRED_NODE_MAJOR}.x first (https://nodejs.org/)."
    exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "${NODE_MAJOR}" -lt "${REQUIRED_NODE_MAJOR}" ]; then
    echo "✗ Node ${NODE_MAJOR}.x is too old. This project requires Node ${REQUIRED_NODE_MAJOR}+ (Active LTS)."
    echo "  Tip: use nvm/fnm/mise: 'nvm install ${REQUIRED_NODE_MAJOR} && nvm use ${REQUIRED_NODE_MAJOR}'"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "✗ npm not found on PATH. Reinstall Node so it ships npm together."
    exit 1
fi

echo "→ Installing npm dependencies (Node $(node -v))"
npm ci

echo "→ Registering wiki/ with Obsidian (if installed)"
bash "${REPO_ROOT}/scripts/setup-vault.sh"

echo ""
echo "✓ Setup complete. Run 'npm run dev' to start the local dev server,"
echo "  or 'npm run build && npx vitest run' to verify the project."
