# VoxAID Key Setup Guide

This guide shows where each key comes from and what to click in each provider.

## 1. Supabase database URL

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click **New Project**.
3. Name it `voxaid` and pick a strong database password.
4. Pick the closest region and click **Create new project**.
5. Wait for the project to finish provisioning.
6. In the left sidebar, click **Project Settings** (gear icon).
7. Click **Database** under Configuration.
8. Scroll to **Connection string** and select the **URI** tab.
9. Copy the connection string and replace `[YOUR-PASSWORD]` with the password you chose.

Use it as both `DATABASE_URL` and `DIRECT_URL` in your env files.

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

## 4. OpenAI API key (Whisper ASR)

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys) and sign in.
2. Click **Create new secret key**.
3. Name it `voxaid-whisper`.
4. Copy the key (starts with `sk-`). You won't see it again.

Use it as `OPENAI_API_KEY`.

## 5. Anthropic API key (Claude action plans)

1. Go to [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) and sign in.
2. Click **Create Key**.
3. Name it `voxaid`.
4. Copy the key (starts with `sk-ant-`).

Use it as `ANTHROPIC_API_KEY`.

## 6. ElevenLabs API key (TTS callbacks)

1. Go to [https://elevenlabs.io](https://elevenlabs.io) and sign in.
2. Click your profile icon in the bottom-left → **Profile + API key**.
3. Copy the API key shown there.

Use it as `ELEVENLABS_API_KEY`.

## 7. Upstash Redis URL (job queue)

1. Go to [https://console.upstash.com](https://console.upstash.com) and sign in.
2. Click **Create Database**.
3. Name it `voxaid` and pick the closest region.
4. Enable **TLS (SSL)**.
5. Click **Create**.
6. On the database details page, copy the **Redis URL** (starts with `rediss://`).

Use it as `UPSTASH_REDIS_URL`.

## 8. Mapbox access token (patient map)

1. Go to [https://account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens) and sign in.
2. Copy the **Default public token** (starts with `pk.eyJ`).

Use it as `NEXT_PUBLIC_MAPBOX_TOKEN`.

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

## 10. API secret key

Generate a shared secret that secures communication between Next.js and NestJS:

```bash
openssl rand -hex 32
```

Copy the output and use it as `API_SECRET_KEY` in **both** `apps/web/.env.local` and `apps/api/.env`.

## 11. Put the values in your env files

1. Run `pnpm setup` — this copies `.env.example` to three locations.
2. Fill in each key in all 3 env files:

| File | Needs |
|---|---|
| `.env.local` | All keys (root reference) |
| `apps/web/.env.local` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `API_URL`, `API_SECRET_KEY` |
| `apps/api/.env` | All backend keys (Twilio, OpenAI, Anthropic, ElevenLabs, Supabase, Upstash, R2, `API_SECRET_KEY`) |

3. Keep the filled env files local only. Do not commit them.

## Quick checklist

- Supabase: database URL
- Clerk: publishable key + secret key
- Twilio: account SID + auth token + phone number
- OpenAI: API key
- Anthropic: API key
- ElevenLabs: API key
- Upstash: Redis URL
- Mapbox: access token
- Cloudflare R2: access key + secret + bucket + endpoint (optional)
- API secret: random hex string
