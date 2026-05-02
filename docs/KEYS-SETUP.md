# VoxAID Key Setup Guide

This guide shows where each key comes from and what to click in each provider.

## 1. Supabase database URL

You need the **Postgres connection string**, not the API keys. The API Keys page (Publishable key, Secret key) is for the Supabase REST API — VoxAID doesn't use that. Prisma connects directly to the database.

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click **New Project**.
3. Name it `voxaid` and pick a strong database password. **Save this password** — you'll need it in the connection string.
4. Pick the closest region and click **Create new project**.
5. Wait for the project to finish provisioning.
6. Click the green **Connect** button at the top of the dashboard.
7. Select the **ORMs** tab and copy the URI shown there.
8. Replace `[YOUR-PASSWORD]` with the database password you chose in step 3.

You need two URLs (same password, different ports):

```
# Connection pooler (port 6543) — used by your app at runtime
DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.co:6543/postgres?pgbouncer=true

# Direct connection (port 5432) — used by Prisma migrations
DIRECT_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.co:5432/postgres
```

Use these as `DATABASE_URL` and `DIRECT_URL` in `apps/api/.env`.

## 2. Clerk publishable key and secret key

1. Go to [https://clerk.com](https://clerk.com) and sign in.
2. Click **Add application** or **Create application**.
3. Name the app `VoxAID`.
4. Open the app dashboard.
5. In the left menu, click **API Keys**.
6. Copy the **Publishable key** (starts with `pk_test_`).
7. Copy the **Secret key** (starts with `sk_test_`).

Use these as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

## 3. Twilio account SID, auth token, and phone number

1. Go to [https://console.twilio.com](https://console.twilio.com) and sign in.
2. On the main dashboard, copy **Account SID** and **Auth Token**.
3. In the left sidebar, click **Phone Numbers** → **Manage** → **Buy a number**.
4. Buy a number with Voice and SMS capabilities.
5. Copy the phone number (e.g. `+1234567890`).

### 3.1 Configure webhooks (after deploying the API)

1. Go to **Phone Numbers** → **Manage** → **Active numbers**.
2. Click your number.
3. Under **Voice & Fax**, set "A call comes in" to **Webhook** and enter `https://<your-api-url>/twilio/voice`.
4. Under **Messaging**, set "A message comes in" to **Webhook** and enter `https://<your-api-url>/twilio/whatsapp`.
5. Click **Save**.

Use these as `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`.

## 4. Groq API key (Whisper ASR — free)

Groq provides free access to Whisper large-v3. No credit card required.

1. Go to [https://console.groq.com/keys](https://console.groq.com/keys) and sign in (Google or GitHub login).
2. Click **Create API Key**.
3. Name it `voxaid`.
4. Copy the key (starts with `gsk_`).

Use it as `GROQ_API_KEY`.

## 5. LLM (Llama 3.3 70B via Groq — free)

No extra key needed. The same `GROQ_API_KEY` from step 4 powers both Whisper ASR and Llama 3.3 action plan generation. Skip this step.

## 6. ElevenLabs API key (TTS callbacks)

1. Go to [https://elevenlabs.io/app/api/api-keys](https://elevenlabs.io/app/api/api-keys) and sign in.
2. Click **+ Create Key**.
3. Set Name to `voxaid`.
4. Leave **Restrict Key** OFF.
5. Make sure **Text to Speech** is set to **Access** (the rest don't matter).
6. Click **Create Key** and copy the key.

Use it as `ELEVENLABS_API_KEY`.

## 7. Upstash Redis URL (job queue)

1. Go to [https://console.upstash.com](https://console.upstash.com) and sign in.
2. Click **Create Database**.
3. Name it `voxaid` and pick the closest region.
4. Enable **TLS (SSL)**.
5. Click **Create**.
6. On the database details page, copy the **Redis URL** (starts with `rediss://`).

Use it as `UPSTASH_REDIS_URL`.

## 8. Maps (Leaflet + OpenStreetMap — no key needed)

The patient map uses Leaflet with free OpenStreetMap tiles. No API key, no account, no credit card required. Skip this step.

## 9. Cloudflare R2 (audio storage, optional)

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) and sign in.
2. In the left sidebar, click **R2 Object Storage**.
3. Click **Create bucket** and name it `voxaid-audio`.
4. Go back to R2 and click **Manage R2 API Tokens**.
5. Click **Create API token**.
6. Give it **Object Read & Write** permission for the `voxaid-audio` bucket.
7. Copy the **Access Key ID** and **Secret Access Key**.
8. Copy your **Account ID** from the R2 overview page.

Use these as `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (`voxaid-audio`), and `R2_ENDPOINT` (`https://<account-id>.r2.cloudflarestorage.com`).

## 10. API config (no signup needed)

These tell the NestJS API where to find itself and the ML service. Use the defaults for local development — only change them when deploying to Render.

```
# Local (default — no changes needed)
API_BASE_URL=http://localhost:3001
API_PORT=3001
ML_SERVICE_URL=http://localhost:8001

# Production (set these in Render environment variables)
API_BASE_URL=https://voxaid-api.onrender.com
ML_SERVICE_URL=https://voxaid-ml.onrender.com
```

- `API_BASE_URL` — The public URL of your API. Twilio sends webhook callbacks to this URL.
- `API_PORT` — Which port NestJS listens on. Always `3001`.
- `ML_SERVICE_URL` — Where the API sends audio for biomarker extraction + XGBoost classification.

## 11. API secret key

Generate a shared secret that secures communication between Next.js and NestJS:

```bash
openssl rand -hex 32
```

Copy the output and use it as `API_SECRET_KEY` in **both** `apps/web/.env.local` and `apps/api/.env`.

## 12. Put the values in your env files

1. Run `pnpm setup` — this copies `.env.example` to three locations.
2. Fill in each key in all 3 env files:

| File | Needs |
|---|---|
| `.env.local` | All keys (root reference) |
| `apps/web/.env.local` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `API_URL`, `API_SECRET_KEY` |
| `apps/api/.env` | All backend keys (Twilio, Groq, ElevenLabs, Supabase, Upstash, R2, `API_SECRET_KEY`) |

3. Keep the filled env files local only. Do not commit them.

## Quick checklist

- Supabase: database URL
- Clerk: publishable key + secret key
- Twilio: account SID + auth token + phone number
- Groq: API key (free Whisper)
- LLM: same Groq key (no extra key)
- ElevenLabs: API key
- Upstash: Redis URL
- Maps: Leaflet + OpenStreetMap (no key needed)
- Cloudflare R2: access key + secret + bucket + endpoint (optional)
- API secret: random hex string
