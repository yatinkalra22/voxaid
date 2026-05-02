#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VoxAID — Start All Services (Dev)
# Run: ./scripts/dev.sh
# =============================================================================

# Sync env to sub-apps
cp .env.local apps/web/.env.local 2>/dev/null || true
cp .env.local apps/api/.env 2>/dev/null || true

echo "==> Starting VoxAID services..."
echo "  Web:  http://localhost:3000"
echo "  API:  http://localhost:3001"
echo "  ML:   http://localhost:8001"
echo ""

# Start ML service in background
echo "==> Starting ML service..."
cd apps/ml
source .venv/bin/activate
uvicorn main:app --reload --port 8001 &
ML_PID=$!
cd ../..

# Start API + Web via turbo (parallel)
echo "==> Starting API + Web..."
pnpm dev &
TURBO_PID=$!

# Trap to kill all on exit
trap "kill $ML_PID $TURBO_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
