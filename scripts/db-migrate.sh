#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VoxAID — Database Migration
# Run: ./scripts/db-migrate.sh [dev|deploy]
# =============================================================================

ACTION="${1:-dev}"

cd apps/api

case "$ACTION" in
  dev)
    echo "==> Running Prisma migration (dev)..."
    npx prisma migrate dev
    echo "==> Generating Prisma client..."
    npx prisma generate
    ;;
  deploy)
    echo "==> Running Prisma migration (production)..."
    npx prisma migrate deploy
    echo "==> Generating Prisma client..."
    npx prisma generate
    ;;
  seed)
    echo "==> Seeding database..."
    npx prisma db seed
    ;;
  studio)
    echo "==> Opening Prisma Studio..."
    npx prisma studio
    ;;
  *)
    echo "Usage: ./scripts/db-migrate.sh [dev|deploy|seed|studio]"
    exit 1
    ;;
esac

cd ../..
echo "==> Done!"
