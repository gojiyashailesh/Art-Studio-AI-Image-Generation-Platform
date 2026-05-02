#!/usr/bin/env bash
# Run FastAPI and Vite dev server (5173) together.
# Uses PORT=8001 by default so an old server on 8000 does not block (override with PORT=8000).
# Requires: Python venv with deps, `npm install` in ./frontend

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PORT="${PORT:-8001}"
export BACKEND_ORIGIN="${BACKEND_ORIGIN:-http://127.0.0.1:${PORT}}"
if [[ -f .venv/bin/activate ]]; then
  # shellcheck source=/dev/null
  source .venv/bin/activate
fi
python main.py &
PY_PID=$!
cleanup() { kill "$PY_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
cd "$ROOT/frontend"
BACKEND_ORIGIN="$BACKEND_ORIGIN" npm run dev
cleanup
