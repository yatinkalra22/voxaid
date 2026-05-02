#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VoxAID — Local Development Setup
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh
# =============================================================================

echo "==> VoxAID Local Setup"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: node is required. Install via nvm."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required. Run: npm i -g pnpm"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Error: python3 is required."; exit 1; }

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

# Copy env file if not exists
if [ ! -f ".env.local" ]; then
  echo "==> Copying .env.example to .env.local"
  cp .env.example .env.local
  echo "  IMPORTANT: Fill in all values in .env.local before running dev"
else
  echo "==> .env.local already exists, skipping"
fi

# Copy env to sub-apps that need it
echo "==> Syncing env files to apps..."
cp .env.local apps/web/.env.local 2>/dev/null || true
cp .env.local apps/api/.env 2>/dev/null || true

echo ""
echo "==> Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Fill in .env.local with your API keys"
echo "  2. Run: pnpm dev:all"
echo "  3. Web:  http://localhost:3000"
echo "  4. API:  http://localhost:3001"
echo "  5. ML:   http://localhost:8001"
