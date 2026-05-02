<p align="center">
  <h1 align="center">VoxAID</h1>
  <p align="center"><strong>Call. Analyze. Refer.</strong></p>
  <p align="center">Voice-first mental health screening for community health workers in low-resource settings.<br/>25 seconds of speech. 32 vocal biomarkers. $0.03 per screening.</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Whisper-ASR_99%2B_Languages-74aa9c?style=for-the-badge" alt="Whisper" />
  <img src="https://img.shields.io/badge/Llama_3.3-Action_Plans-d97706?style=for-the-badge" alt="Llama" />
  <img src="https://img.shields.io/badge/XGBoost-Depression_Classifier-306998?style=for-the-badge" alt="XGBoost" />
  <img src="https://img.shields.io/badge/Twilio-IVR_%2B_WhatsApp-f22f46?style=for-the-badge" alt="Twilio" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

<p align="center">
  <a href="#the-problem">The Problem</a> &bull;
  <a href="#the-solution">The Solution</a> &bull;
  <a href="#sdg-3-alignment">SDG 3</a> &bull;
  <a href="#the-science">The Science</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#impact--scalability">Impact</a> &bull;
  <a href="#getting-started">Getting Started</a>
</p>

---

## The Problem

**1.2 billion people** live with mental disorders. **75% receive no treatment** — almost entirely in low- and middle-income countries where there are fewer than 1 psychiatrist per 100,000 people.

Community health workers (CHWs) see millions of patients every month. India alone has **1 million ASHA workers** visiting homes in rural villages. They carry paper checklists for nutrition and immunization — but **zero diagnostic tools for mental health**.

Every existing solution targets the developed world:

| Solution | Market | Why It Fails for 4B People |
|---|---|---|
| **Kintsugi Health** | US payers & clinicians | English-only, smartphone-only |
| **Ellipsis Health** | US clinical workflows | FDA-track, closed ecosystem |
| **Sonde Health** | DTC wellness apps | US/UK only, app-based |
| **Ada Health** | Symptom checkers | Text-based, smartphone required |

**The bottom 4 billion are completely locked out of voice-AI health screening.**

---

## The Solution

A CHW hands a patient a basic phone and dials the VoxAID number. The patient speaks for 25 seconds about how they've been feeling. No smartphone. No internet. No literacy required.

```
    CALL                    ANALYZE                   REFER
  ┌────────┐            ┌────────────┐           ┌──────────┐
  │        │            │            │           │          │
  │  25s   │  ────────► │  32 Vocal  │ ────────► │  CHW     │
  │  Voice │            │  Biomarkers│           │  Dashboard│
  │  Call  │            │  + XGBoost │           │  + SMS   │
  │        │            │            │           │  Referral│
  └────────┘            └────────────┘           └──────────┘
  Feature phone          AI pipeline              One-click
  or WhatsApp            < 60 seconds             clinic referral
```

**In under 60 seconds, VoxAID:**

1. **Transcribes** speech via Whisper in 99+ languages
2. **Extracts vocal biomarkers** — jitter, shimmer, F0, HNR, pause ratio, MFCCs (32 features)
3. **Classifies risk** for depression via XGBoost trained on DAIC-WOZ clinical literature
4. **Generates an action plan** in the patient's language via Llama 3.3 70B
5. **Calls the patient back** with next steps via ElevenLabs TTS
6. **Flags the patient** on a CHW dashboard with one-click clinic referral via SMS

---

## SDG 3 Alignment

VoxAID directly addresses **UN Sustainable Development Goal 3 — Good Health & Well-being**:

| SDG Target | How VoxAID Addresses It |
|---|---|
| **3.4** Mental health & NCDs | Voice-based depression screening for populations with zero access to psychiatrists |
| **3.8** Universal health coverage | Empowers 1M+ community health workers with diagnostic tools that work on feature phones |
| **3.1** Maternal mortality | Pre-eclampsia detection via vocal biomarkers (roadmap) |
| **3.d** Early warning capacity | Real-time geographic risk mapping across entire CHW networks |

---

## The Science

Voice biomarkers are **clinically validated markers** that correlate with depression. This is real signal processing — not a ChatGPT wrapper.

| Biomarker | What It Measures | In Depression |
|---|---|---|
| **F0** (fundamental frequency) | Pitch | Lower |
| **Jitter** | Pitch perturbation | Higher |
| **Shimmer** | Amplitude perturbation | Higher |
| **HNR** | Harmonics-to-noise ratio | Lower (breathier) |
| **Pause ratio** | Silence vs speech | Higher (more pauses) |
| **Speech rate** | Voiced frames/second | Lower (slower) |
| **MFCCs** (13 coefficients) | Spectral envelope | Flatter |

**References:**
- Cummins et al. (2015) — *A review of depression and suicide risk assessment using speech analysis*
- Low et al. (2020) — *Automated assessment of psychiatric disorders using speech*
- DAIC-WOZ dataset (Gratch et al., 2014)

> VoxAID is a **screening tool**, not a diagnostic device. It triggers human follow-up, not clinical decisions — positioning it below the FDA SaMD 510(k) threshold.

---

## Architecture

```
Patient (any phone)
  ├── Calls Twilio IVR
  └── WhatsApp voice note
          │
          ▼
┌──────────────────────────────────────────────────────┐
│                    NestJS API (Render)                │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Whisper    │  │  FastAPI ML  │  │   Llama 3.3  │ │
│  │   ASR        │  │  librosa +   │  │   Sonnet     │ │
│  │   99+ langs  │  │  Praat +     │  │   Action     │ │
│  │              │  │  XGBoost     │  │   Plans      │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  ElevenLabs │  │   Supabase   │  │   Twilio     │ │
│  │  TTS        │  │   Postgres   │  │   SMS        │ │
│  │  Callback   │  │   + Prisma   │  │   Referral   │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
└──────────────────────┬────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│              CHW Dashboard (Next.js on Vercel)        │
│                                                       │
│  Patient list       Biomarker        Leaflet          │
│  + risk badges      detail view      geographic view  │
│                                                       │
│  Animated risk      Transcript +     One-click        │
│  score reveal       action plan      clinic referral  │
└──────────────────────────────────────────────────────┘
```

---

## Features

### Screening Pipeline
- **IVR + WhatsApp ingest** — Works on any phone, no app or internet on patient side
- **32 vocal biomarkers** — Jitter, shimmer, F0, HNR, pause ratio, MFCCs via librosa + Praat
- **XGBoost classifier** — Depression risk scored 0-100% from DAIC-WOZ literature distributions
- **Multilingual** — Whisper ASR in 99+ languages, action plans generated in patient's language
- **Patient callback** — ElevenLabs TTS calls patient back with next steps in their language

### CHW Dashboard
- **Patient list** with color-coded risk badges (critical / high / moderate / low)
- **Biomarker detail view** with flagged abnormal values highlighted in red
- **Transcript + AI action plan** for every screening
- **Geographic view** — see all patients on an OpenStreetMap-powered map by risk level
- **One-click clinic referral** — SMS sent to clinic admin with patient details and urgency
- **Animated risk score** — Framer Motion reveal on patient detail page

### Platform
- **Clerk authentication** — Secure CHW login with middleware-protected routes
- **Mobile-first design** — Built for $50 Android tablets (360px breakpoint first)
- **BullMQ job queue** — Async transcription and analysis via Upstash Redis
- **Zod validation** — Every API input validated, rate-limited, helmet-secured
- **Live data indicator** — Dashboard shows when connected to live API vs mock data

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Monorepo** | Turborepo + pnpm |
| **Web** | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| **API** | NestJS 11, TypeScript, Prisma ORM, Zod, BullMQ |
| **ML** | Python 3.11, FastAPI, librosa, praat-parselmouth, XGBoost |
| **Voice** | Twilio Programmable Voice + WhatsApp Sandbox |
| **ASR** | Whisper large-v3 via Groq (99+ languages, free) |
| **LLM** | Anthropic Claude Sonnet / Llama 3.3 via Groq (free fallback) |
| **TTS** | ElevenLabs Multilingual v2 |
| **Database** | Supabase Postgres + Prisma ORM |
| **Queue** | Upstash Redis + BullMQ |
| **Auth** | Clerk |
| **Maps** | Leaflet + OpenStreetMap (free, no key) |
| **Deploy** | Vercel (web) + Render (api + ml) |

---

## Impact & Scalability

### $0.03 per screening

| Component | Cost | Notes |
|---|---|---|
| Twilio voice (60s call) | $0.013 | India via Exotel: $0.005 |
| Whisper via Groq (60s audio) | $0.00 | Free tier, no credit card |
| Biomarker extraction | $0.0005 | CPU-only, negligible |
| XGBoost inference | $0.0001 | Negligible |
| LLM (action plans) | $0.00 | Groq free; or Claude $0.002/call |
| ElevenLabs TTS | $0.01 | Optional, Coqui fallback: free |
| **Total** | **$0.03** | **At 1M/month: $25-30K** |

### Scale Path

| Stage | CHWs | Screenings/mo | Cost/mo |
|---|---|---|---|
| Hackathon demo | 1 | 50 | ~$0 (free tiers) |
| Pilot (Bihar, India) | 100 | 5,000 | ~$150 |
| State rollout (UP + Bihar) | 1,000 | 50,000 | ~$800 |
| National (ASHA network) | 10,000 | 500,000 | ~$5,000 |

### Target Deployment Partners

- **ASHA Workers** — India's 1 million community health workers
- **BRAC** — Bangladesh, 100K health volunteers
- **Last Mile Health** — Liberia, community health programs
- **UNFPA / UNICEF** — Maternal health programs globally

---

## Project Structure

```
voxaid/
├── apps/
│   ├── web/          # Next.js 14 — CHW dashboard, landing page, Priya's Story
│   ├── api/          # NestJS — Twilio webhooks, orchestration, Prisma, referral
│   └── ml/           # FastAPI — voice biomarker extraction + XGBoost classifier
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared shadcn components
│   └── config/       # Shared eslint, tsconfig, prettier
├── docs/             # Architecture, research, deployment
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

---

## Getting Started

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| pnpm | 10+ | `npm i -g pnpm` |
| Python | 3.11+ | [python.org](https://www.python.org/downloads/) |

### Local Setup

```bash
# Clone and install
git clone https://github.com/yatinkalra22/voxaid.git
cd voxaid
pnpm setup              # installs deps, creates Python venv, copies .env files

# Configure environment
cp .env.example .env.local
```

Open `.env.local` and fill in your API keys. See **[docs/KEYS-SETUP.md](docs/KEYS-SETUP.md)** for step-by-step instructions on where to get each key (all services have free tiers).

`pnpm setup` copies your env to three locations automatically:

| File | Keys needed |
|---|---|
| `.env.local` | All keys (root reference) |
| `apps/web/.env.local` | Clerk, `API_URL`, `API_SECRET_KEY` |
| `apps/api/.env` | Twilio, Groq, ElevenLabs, Supabase, Upstash, R2, `API_SECRET_KEY` |

Generate a shared API secret for secure web-to-API communication:

```bash
openssl rand -hex 32
# paste as API_SECRET_KEY in both apps/web/.env.local and apps/api/.env
```

```bash
# Database
pnpm db:migrate         # run Prisma migrations
pnpm db:seed            # seed 6 demo patients

# Start all services
pnpm dev:all
```

```
Web       → http://localhost:3000
API       → http://localhost:3001
ML        → http://localhost:8001
```

---

## Deployment

### Web (Next.js) → Vercel

```bash
npm i -g vercel
vercel login
cd apps/web && vercel --prod
```

Set these env vars in the Vercel dashboard:
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `API_URL`, `API_SECRET_KEY`

### API (NestJS) → Render

1. Push your code to GitHub.
2. Go to [dashboard.render.com](https://dashboard.render.com).
3. Click **+ New** (top right) → **Web Service**.
4. Connect your GitHub account and select the `voxaid` repo.
5. Fill in these settings:

| Setting | Value |
|---|---|
| Name | `voxaid-api` |
| Region | Pick closest to you (e.g. Oregon US West) |
| Branch | `main` |
| Root Directory | `apps/api` |
| Runtime | **Node** |
| Build Command | `pnpm install && npx prisma generate && pnpm build` |
| Start Command | `node dist/src/main.js` |
| Instance Type | **Free** |

6. Click **Advanced** → **Add Environment Variable** and add each variable from `apps/api/.env`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase pooler URL (port 6543) |
| `DIRECT_URL` | Your Supabase direct URL (port 5432) |
| `TWILIO_ACCOUNT_SID` | `AC...` |
| `TWILIO_AUTH_TOKEN` | Your Twilio auth token |
| `TWILIO_PHONE_NUMBER` | `+1...` |
| `GROQ_API_KEY` | `gsk_...` |
| `ELEVENLABS_API_KEY` | Your ElevenLabs key |
| `UPSTASH_REDIS_URL` | `rediss://...` |
| `API_BASE_URL` | `https://voxaid-api.onrender.com` |
| `API_PORT` | `3001` |
| `ML_SERVICE_URL` | `https://voxaid-ml.onrender.com` |
| `API_SECRET_KEY` | Same key you generated with `openssl rand -hex 32` |
| `CORS_ORIGINS` | `https://your-app.vercel.app` (update after Vercel deploy) |

7. Click **Deploy Web Service**. Wait for the build to finish (~2-3 min).

### ML (FastAPI) → Render

1. Go to [dashboard.render.com](https://dashboard.render.com).
2. Click **+ New** → **Web Service**.
3. Select the same `voxaid` repo.
4. Fill in these settings:

| Setting | Value |
|---|---|
| Name | `voxaid-ml` |
| Region | Same region as API |
| Branch | `main` |
| Root Directory | `apps/ml` |
| Runtime | **Python 3** |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | **Free** |

5. Click **Advanced** → **Add Environment Variable**:

| Variable | Value |
|---|---|
| `CORS_ORIGINS` | `https://voxaid-api.onrender.com` |

6. Click **Deploy Web Service**. Wait for the build to finish (~3-5 min).

### Post-deploy checklist

After both Render services are live, you'll see their URLs on the dashboard (e.g. `https://voxaid-api.onrender.com`).

**1. Update Vercel env vars** (after deploying web):
```
API_URL=https://voxaid-api.onrender.com
```

**2. Update Render API env vars** with the actual URLs:
```
API_BASE_URL=https://voxaid-api.onrender.com
ML_SERVICE_URL=https://voxaid-ml.onrender.com
CORS_ORIGINS=https://your-app.vercel.app
```

**3. Set Twilio webhooks** (in Twilio console → Phone Numbers → your number):
```
Voice webhook (POST):    https://voxaid-api.onrender.com/twilio/voice
WhatsApp webhook (POST): https://voxaid-api.onrender.com/twilio/whatsapp
```

**4. Verify everything works:**
- Visit `https://voxaid-api.onrender.com/health` — should return `{ "status": "ok" }`
- Visit `https://voxaid-ml.onrender.com/health` — should return `{ "status": "ok" }`
- Visit your Vercel URL — dashboard should load with live data

---

## GNEC Hackathon 2026 Spring

VoxAID was built for the **GNEC Hackathon 2026 Spring** (March 12 - May 3, 2026).

**Theme:** UN SDG 3 — Good Health & Well-being

| Criterion | How VoxAID Delivers |
|---|---|
| **Impact** | Addresses untreated mental health for 1.2B people across LMICs with direct SDG 3.4, 3.8, 3.1, 3.d alignment |
| **Innovation** | First voice-biomarker system designed for feature phones + IVR — no existing competitor serves this market |
| **Feasibility** | Full working pipeline at $0.03/screening, deployed on free tiers, scales to national CHW networks |
| **Design** | Mobile-first CHW dashboard, clinical UI with Lucide icons, animated biomarker cards |
| **Presentation** | "Priya in Bihar" narrative — real story, live demo, working end-to-end system |

---

## Documentation

- **[Architecture](docs/architecture.md)** — Full system design, data flow, database schema, infrastructure costs
- **[Key Setup Guide](docs/KEYS-SETUP.md)** — Step-by-step instructions for obtaining all API keys

---

## Team

**Yatin Kalra** — Full-stack engineer & architect

---

## License

MIT
