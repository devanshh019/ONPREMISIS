#!/bin/bash
# ONPREMISIS Sovereign Industrial Workbench Launcher
cd "$(dirname "$0")"

echo "================================================================="
echo "  ONPREMISIS: Sovereign Air-Gapped Industrial & PSU Workbench    "
echo "  Foundation Model: Qwen 2.5 3B Sovereign / Gemma 3 4B           "
echo "  Air-Gap Security: Strict Local Loopback (127.0.0.1) Only       "
echo "================================================================="

source .venv/bin/activate
export PYTHONUNBUFFERED=1

PORT="${PORT:-8000}"
echo "Starting Sovereign Gateway at http://127.0.0.1:${PORT} ..."
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port "$PORT" --reload
