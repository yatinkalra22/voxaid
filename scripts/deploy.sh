#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VoxAID — Production Deployment
# Deploys all three services:
#   - Web (Next.js)  → Vercel
#   - API (NestJS)   → Render (via git push — configured in Render dashboard)
#   - ML  (FastAPI)  → Render (via git push — configured in Render dashboard)
#
# Prerequisites:
#   - Vercel CLI: npm i -g vercel
#   - Logged in: vercel login
#   - Render services created at render.com with GitHub repo connected
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

deploy_backend() {
  echo "==> Deploying API + ML to Render..."
  echo ""
  echo "  Render deploys automatically on git push to main."
  echo "  If you haven't set up Render yet:"
  echo ""
  echo "  1. Go to https://render.com → New → Web Service"
  echo "  2. Connect your GitHub repo"
  echo ""
  echo "  API Service:"
  echo "    Root Directory:  apps/api"
  echo "    Build Command:   pnpm install && pnpm build"
  echo "    Start Command:   node dist/main.js"
  echo "    Instance Type:   Free"
  echo ""
  echo "  ML Service:"
  echo "    Root Directory:  apps/ml"
  echo "    Build Command:   pip install -r requirements.txt"
  echo "    Start Command:   uvicorn main:app --host 0.0.0.0 --port \$PORT"
  echo "    Instance Type:   Free"
  echo ""
  echo "  3. Add env vars from .env.example in each service's Environment tab"
  echo ""
  echo "  Pushing to main now triggers auto-deploy on Render."

  git push origin main 2>/dev/null && echo "  Pushed to main — Render will auto-deploy." || echo "  Push failed or nothing to push. Deploy manually from Render dashboard."
}

case "$DEPLOY_TARGET" in
  web)  deploy_web ;;
  api|ml|backend)  deploy_backend ;;
  all)
    deploy_web
    deploy_backend
    ;;
  *)
    echo "Usage: ./scripts/deploy.sh [web|backend|all]"
    exit 1
    ;;
esac

echo ""
echo "==> Deployment complete!"
echo ""
echo "Post-deploy checklist:"
echo "  1. Set env vars in Vercel dashboard for web"
echo "  2. Set env vars in Render dashboard for api + ml"
echo "  3. Update API_BASE_URL to your Render API URL (https://voxaid-api.onrender.com)"
echo "  4. Update ML_SERVICE_URL to your Render ML URL (https://voxaid-ml.onrender.com)"
echo "  5. Set Twilio webhook URLs to your Render API:"
echo "     Voice:    https://<api-url>/twilio/voice"
echo "     WhatsApp: https://<api-url>/twilio/whatsapp"
