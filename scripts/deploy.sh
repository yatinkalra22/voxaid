#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VoxAID — Production Deployment
# Deploys all three services:
#   - Web (Next.js)  → Vercel
#   - API (NestJS)   → Railway
#   - ML  (FastAPI)  → Railway
#
# Prerequisites:
#   - Vercel CLI: npm i -g vercel
#   - Railway CLI: npm i -g @railway/cli
#   - Logged in: vercel login && railway login
# =============================================================================

DEPLOY_TARGET="${1:-all}"

echo "==> VoxAID Production Deployment"
echo "  Target: $DEPLOY_TARGET"
echo ""

deploy_web() {
  echo "==> Deploying Web (Next.js) to Vercel..."
  cd apps/web
  vercel --prod --yes
  cd ../..
  echo "  Web deployed!"
}

deploy_api() {
  echo "==> Deploying API (NestJS) to Railway..."
  cd apps/api
  railway up --detach
  cd ../..
  echo "  API deployed!"
}

deploy_ml() {
  echo "==> Deploying ML (FastAPI) to Railway..."
  cd apps/ml
  railway up --detach
  cd ../..
  echo "  ML deployed!"
}

case "$DEPLOY_TARGET" in
  web)  deploy_web ;;
  api)  deploy_api ;;
  ml)   deploy_ml ;;
  all)
    deploy_web
    deploy_api
    deploy_ml
    ;;
  *)
    echo "Usage: ./scripts/deploy.sh [web|api|ml|all]"
    exit 1
    ;;
esac

echo ""
echo "==> Deployment complete!"
echo ""
echo "Post-deploy checklist:"
echo "  1. Set env vars in Vercel dashboard for web"
echo "  2. Set env vars in Railway dashboard for api + ml"
echo "  3. Update API_BASE_URL to your Railway API URL"
echo "  4. Update ML_SERVICE_URL to your Railway ML URL"
echo "  5. Set Twilio webhook URLs to your Railway API:"
echo "     Voice:    https://<api-url>/twilio/voice"
echo "     WhatsApp: https://<api-url>/twilio/whatsapp"
