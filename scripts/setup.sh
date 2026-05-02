#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VoxAID — Local Development Setup
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh
# =============================================================================

echo "==> VoxAID Local Setup"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: node is required (v20+). Install via nvm."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required (v10+). Run: npm i -g pnpm"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Error: python3 is required (v3.11+)."; exit 1; }

echo "  Node:   $(node --version)"
echo "  pnpm:   $(pnpm --version)"
echo "  Python: $(python3 --version)"
echo ""

# Install JS dependencies
echo "==> Installing JS dependencies..."
pnpm install

# Setup Python virtual environment for ML service
echo "==> Setting up Python venv for ML service..."
cd apps/ml
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
deactivate
cd ../..

# Copy env files
echo "==> Setting up environment files..."

# Root .env.local
if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo "  Created .env.local from .env.example"
else
  echo "  .env.local already exists, skipping"
fi

# Web app needs its own .env.local
if [ ! -f "apps/web/.env.local" ]; then
  cp .env.example apps/web/.env.local
  echo "  Created apps/web/.env.local"
else
  echo "  apps/web/.env.local already exists, skipping"
fi

# API app needs .env
if [ ! -f "apps/api/.env" ]; then
  cp .env.example apps/api/.env
  echo "  Created apps/api/.env"
else
  echo "  apps/api/.env already exists, skipping"
fi

echo ""
echo "==> Setup complete!"
echo ""
echo "================================================================"
echo "NEXT: Fill in your API keys in these 3 files:"
echo "  1. .env.local           (root — shared reference)"
echo "  2. apps/web/.env.local  (Next.js needs NEXT_PUBLIC_* + CLERK_*)"
echo "  3. apps/api/.env        (NestJS needs all backend keys)"
echo ""
echo "See docs/env-setup.md for where to get each key."
echo "================================================================"
echo ""
echo "Then run:"
echo "  pnpm dev:all          # Start all services"
echo "  Web:  http://localhost:3000"
echo "  API:  http://localhost:3001"
echo "  ML:   http://localhost:8001"
