#!/usr/bin/env bash
# Register the in-repo wiki/ folder as an Obsidian vault on the host machine.
# Idempotent — safe to run on every clone, every `npm ci`, every session-start.
# Skips silently if Obsidian isn't installed.
set -eu

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VAULT_PATH="${REPO_ROOT}/wiki"

if [ ! -d "${VAULT_PATH}" ]; then
    echo "✗ ${VAULT_PATH} not found — nothing to register."
    exit 0
fi

case "$(uname -s)" in
    Darwin*) OBSIDIAN_CFG="${HOME}/Library/Application Support/obsidian/obsidian.json" ;;
    Linux*)  OBSIDIAN_CFG="${HOME}/.config/obsidian/obsidian.json" ;;
    *)       echo "Unsupported OS for auto vault registration; skipping."; exit 0 ;;
esac

if [ ! -f "${OBSIDIAN_CFG}" ]; then
    echo "ℹ Obsidian config not found at ${OBSIDIAN_CFG} — skipping vault registration."
    echo "  (Install Obsidian and re-run this script to register the wiki as a vault.)"
    exit 0
fi

# Use python3 for safe JSON edit. Every recent macOS + most linuxes ship it.
if ! command -v python3 >/dev/null 2>&1; then
    echo "ℹ python3 not available — skipping vault registration."
    exit 0
fi

python3 - "${OBSIDIAN_CFG}" "${VAULT_PATH}" <<'PY'
import json
import os
import random
import sys
import time

cfg_path, vault_path = sys.argv[1], sys.argv[2]

with open(cfg_path) as f:
    cfg = json.load(f)

vaults = cfg.setdefault("vaults", {})

# Already registered?
for vid, entry in vaults.items():
    if os.path.abspath(entry.get("path", "")) == os.path.abspath(vault_path):
        print(f"✓ Wiki vault already registered (id={vid}).")
        sys.exit(0)

# Register fresh
new_id = f"{random.getrandbits(64):016x}"
vaults[new_id] = {
    "path": vault_path,
    "ts": int(time.time() * 1000),
    "open": True,
}
with open(cfg_path, "w") as f:
    json.dump(cfg, f, separators=(",", ":"))
print(f"✓ Wiki vault registered (id={new_id}). Open Obsidian and you'll see 'wiki'.")
PY
