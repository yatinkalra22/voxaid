# VoxAID — Environment Variable Setup Guide

Every variable in `.env.example` explained — where to get it, which service needs it, and what tier/plan to use.

---

## Quick Setup

```bash
pnpm setup                  # Copies .env.example to all the right places
# Then edit these 3 files:
#   .env.local              (root reference)
#   apps/web/.env.local     (Next.js — only needs NEXT_PUBLIC_* and CLERK_*)
#   apps/api/.env           (NestJS — needs all backend keys)
```

---

## 1. Supabase Postgres (Database)

| Var | Where |
|---|---|
| `DATABASE_URL` | `apps/api/.env` |
| `DIRECT_URL` | `apps/api/.env` |

**Steps:**
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" — pick a name and strong password
3. Wait for project to provision (~30 seconds)
4. Go to **Settings > Database > Connection string**
5. Copy the **URI** connection string
6. Replace `[YOUR-PASSWORD]` with your project password

```
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Tier:** Free (500MB, 50K rows) — sufficient for hackathon and pilot.

---

## 2. Clerk (Auth)

| Var | Where |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `apps/web/.env.local` |
| `CLERK_SECRET_KEY` | `apps/web/.env.local` |

**Steps:**
1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and sign up
2. Create a new application — name it "VoxAID"
3. Pick sign-in methods (Email + Google recommended for demo)
4. Go to **API Keys** in the left sidebar
5. Copy the Publishable Key (`pk_test_...`) and Secret Key (`sk_test_...`)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

**Tier:** Free (10,000 MAU) — more than enough.

---

## 3. Twilio (Voice + WhatsApp + SMS)

| Var | Where |
|---|---|
| `TWILIO_ACCOUNT_SID` | `apps/api/.env` |
| `TWILIO_AUTH_TOKEN` | `apps/api/.env` |
| `TWILIO_PHONE_NUMBER` | `apps/api/.env` |

**Steps:**
1. Go to [twilio.com/try-twilio](https://www.twilio.com/try-twilio) and create a free trial
2. Verify your phone number
3. From the **Console Dashboard**, copy Account SID and Auth Token
4. Go to **Phone Numbers > Manage > Buy a Number** — get a US number with Voice + SMS
5. Configure the phone number:
   - Voice webhook: `https://<your-api-url>/twilio/voice` (POST)
   - Messaging webhook: `https://<your-api-url>/twilio/whatsapp` (POST)

```
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**For local dev:** Use [ngrok](https://ngrok.com) to expose localhost:
```bash
ngrok http 3001
# Copy the https URL and set as API_BASE_URL + Twilio webhook URLs
```

**WhatsApp Sandbox:**
1. Go to **Messaging > Try it out > Send a WhatsApp message**
2. Follow the sandbox instructions (send "join xxx" to the Twilio number)
3. Set sandbox webhook to `https://<your-api-url>/twilio/whatsapp`

**Tier:** Free trial ($15 credit) — enough for ~1,000 calls.

---

## 4. OpenAI (Whisper ASR)

| Var | Where |
|---|---|
| `OPENAI_API_KEY` | `apps/api/.env` |

**Steps:**
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)

```
OPENAI_API_KEY=sk-xxxxx
```

**Cost:** $0.006/minute of audio. A 30-second screening = $0.003.

---

## 5. Anthropic (Claude LLM)

| Var | Where |
|---|---|
| `ANTHROPIC_API_KEY` | `apps/api/.env` |

**Steps:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up and add billing (pay-as-you-go)
3. Go to **Settings > API Keys**
4. Create a new key

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**Cost:** ~$0.002 per action plan generation (Claude Sonnet).

---

## 6. ElevenLabs (TTS)

| Var | Where |
|---|---|
| `ELEVENLABS_API_KEY` | `apps/api/.env` |

**Steps:**
1. Go to [elevenlabs.io](https://elevenlabs.io) and create a free account
2. Go to **Profile Settings > API Keys** (or click your avatar > Profile + API key)
3. Copy the API key

```
ELEVENLABS_API_KEY=xxxxx
```

**Tier:** Free (10,000 characters/month) — enough for ~50 callbacks. Paid: $5/mo for 30K chars.

---

## 7. Cloudflare R2 (Audio Storage)

| Var | Where |
|---|---|
| `R2_ACCESS_KEY_ID` | `apps/api/.env` |
| `R2_SECRET_ACCESS_KEY` | `apps/api/.env` |
| `R2_BUCKET_NAME` | `apps/api/.env` |
| `R2_ENDPOINT` | `apps/api/.env` |

**Steps:**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up
2. In the sidebar, click **R2 Object Storage**
3. Click "Create bucket" — name it `voxaid-audio`
4. Go to **R2 > Manage R2 API Tokens > Create API Token**
5. Give it Object Read & Write permissions for `voxaid-audio`
6. Copy the Access Key ID, Secret Access Key, and your account endpoint

```
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=voxaid-audio
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

**Tier:** Free (10GB storage, 10M reads/month) — more than enough.

**Note:** R2 storage is wired but not yet actively used in the pipeline. Audio is currently fetched directly from Twilio URLs. R2 integration is a production upgrade for long-term audio archival.

---

## 8. Upstash Redis (Queue)

| Var | Where |
|---|---|
| `UPSTASH_REDIS_URL` | `apps/api/.env` |

**Steps:**
1. Go to [console.upstash.com](https://console.upstash.com) and sign up
2. Click "Create Database"
3. Pick a region close to your Railway deployment (e.g., us-east-1)
4. Enable TLS (default)
5. Go to **Details** tab and copy the Redis URL (starts with `rediss://`)

```
UPSTASH_REDIS_URL=rediss://default:xxxxx@us1-xxxxx-xxxxx.upstash.io:6379
```

**Tier:** Free (10K commands/day) — sufficient for dev. Paid: $0.20/100K commands.

---

## 9. Mapbox (Maps)

| Var | Where |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `apps/web/.env.local` |

**Steps:**
1. Go to [account.mapbox.com](https://account.mapbox.com) and sign up
2. Your default public token is shown on the dashboard
3. Copy it (starts with `pk.eyJ`)

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJxxxxx
```

**Tier:** Free (50K map loads/month) — more than enough.

---

## 10. Resend (Email)

| Var | Where |
|---|---|
| `RESEND_API_KEY` | `apps/api/.env` |

**Steps:**
1. Go to [resend.com](https://resend.com) and sign up
2. Go to **API Keys** and create a new key

```
RESEND_API_KEY=re_xxxxx
```

**Tier:** Free (100 emails/day). Currently optional — only needed if email notifications are added.

---

## 11. API Config

| Var | Where | Description |
|---|---|---|
| `API_BASE_URL` | `apps/api/.env` | Public URL of your API (ngrok for local, Railway URL for prod) |
| `API_PORT` | `apps/api/.env` | Default: `3001` |
| `ML_SERVICE_URL` | `apps/api/.env` | URL of the ML service (default: `http://localhost:8001`) |

```
API_BASE_URL=http://localhost:3001
API_PORT=3001
ML_SERVICE_URL=http://localhost:8001
```

For production:
```
API_BASE_URL=https://voxaid-api.up.railway.app
ML_SERVICE_URL=https://voxaid-ml.up.railway.app
```

---

## 12. Security

| Var | Where | Description |
|---|---|---|
| `API_SECRET_KEY` | `apps/api/.env` + `apps/web/.env.local` | Shared secret for API authentication. Next.js sends this in `x-api-key` header. |
| `CORS_ORIGINS` | `apps/api/.env` + `apps/ml/.env` | Comma-separated list of allowed CORS origins. |

**Generate a secret key:**
```bash
openssl rand -hex 32
```

**Local dev:**
```
API_SECRET_KEY=dev-secret-change-in-production
CORS_ORIGINS=http://localhost:3000
```

**Production:**
```
API_SECRET_KEY=<generated-hex-string>
CORS_ORIGINS=https://voxaid.vercel.app,https://voxaid-api.up.railway.app
```

**How auth works:**
- `/patients` and `/referral` endpoints require `x-api-key` header matching `API_SECRET_KEY`
- `/twilio/*` endpoints validate Twilio webhook signatures using `TWILIO_AUTH_TOKEN` (already configured in section 3)
- The Next.js server sends `API_SECRET_KEY` server-side only — it is never exposed to the browser
- The ML service CORS is restricted to the NestJS API origin only

---

## Summary: Which File Gets What

### `apps/web/.env.local` (Next.js — 4 vars)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
API_SECRET_KEY=<same-as-api>
```

### `apps/api/.env` (NestJS — 16 vars)

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=voxaid-audio
R2_ENDPOINT=https://...
UPSTASH_REDIS_URL=rediss://...
API_BASE_URL=http://localhost:3001
ML_SERVICE_URL=http://localhost:8001
RESEND_API_KEY=re_...
API_SECRET_KEY=<generated-hex>
CORS_ORIGINS=http://localhost:3000
```

### `apps/ml/` (FastAPI — 1 var)

```
CORS_ORIGINS=http://localhost:3001
```

---

## Total Cost to Get Started

| Service | Signup | Cost |
|---|---|---|
| Supabase | Free | $0 |
| Clerk | Free | $0 |
| Twilio | Free trial | $0 ($15 credit) |
| OpenAI | Pay-as-you-go | ~$0.01 per test |
| Anthropic | Pay-as-you-go | ~$0.01 per test |
| ElevenLabs | Free | $0 |
| Cloudflare R2 | Free | $0 |
| Upstash | Free | $0 |
| Mapbox | Free | $0 |
| Resend | Free | $0 |
| **Total to start** | | **~$0** (need credit card for OpenAI + Anthropic) |
