# VoxAID

**Voice-first health triage for community health workers in low-resource settings.**

Screen depression, anxiety, and NCD risk in 60 seconds with a phone call. No smartphone, no data plan, no literacy required.

---

## The Problem

1.2 billion people live with mental disorders. 75% receive no treatment — almost entirely in low- and middle-income countries where there are fewer than 1 psychiatrist per 100,000 people. Community health workers (CHWs) see millions of patients but have no diagnostic tools beyond a paper checklist.

Every existing voice-biomarker company (Kintsugi, Ellipsis, Sonde) targets US clinical workflows requiring smartphones, broadband, and EHR integration. The bottom 4 billion of the global population are completely locked out of voice-AI health screening.

## What VoxAID Does

A CHW or patient calls a phone number (or sends a WhatsApp voice note). In under 60 seconds, VoxAID:

1. **Transcribes** speech via Whisper in 99+ languages
2. **Extracts vocal biomarkers** — jitter, shimmer, F0, HNR, pause ratio, MFCCs (32 features)
3. **Classifies risk** for depression via XGBoost trained on DAIC-WOZ literature distributions
4. **Generates an action plan** in the patient's language via Claude Sonnet
5. **Calls the patient back** with next steps via ElevenLabs TTS
6. **Flags high-risk patients** on a CHW dashboard with one-click clinic referral via SMS

## SDG Alignment

- **SDG 3.1** — Maternal mortality (pre-eclampsia voice screening)
- **SDG 3.4** — Mental health and NCDs (depression, anxiety)
- **SDG 3.8** — Universal health coverage (CHW empowerment)
- **SDG 3.d** — Early warning capacity

---

## Architecture

```
Patient (Feature Phone)
  ├── Calls Twilio Number
  └── WhatsApp Voice Note
          │
          ▼
    NestJS API (Railway)
      ├── Whisper ASR (99+ languages)
      ├── FastAPI ML (Railway) → librosa + Praat → XGBoost
      ├── Claude Sonnet → Multilingual action plan
      ├── ElevenLabs TTS → Patient callback
      └── Twilio SMS → Clinic referral
          │
          ▼
    CHW Dashboard (Next.js on Vercel)
      ├── Patient list with risk badges
      ├── Biomarker detail view
      ├── Mapbox geographic view
      └── One-click clinic referral
```

See [docs/architecture.md](docs/architecture.md) for the full system design, data flow, and database schema.

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm |
| Web | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| API | NestJS 11, TypeScript, Prisma, Zod |
| ML | Python 3.11+, FastAPI, librosa, praat-parselmouth, XGBoost |
| Voice Ingest | Twilio Programmable Voice + WhatsApp Sandbox |
| ASR | OpenAI Whisper API |
| LLM | Anthropic Claude Sonnet 4.6 |
| TTS | ElevenLabs Multilingual v2 |
| Database | Supabase Postgres + Prisma ORM |
| Queue | Upstash Redis + BullMQ |
| Auth | Clerk |
| Maps | Mapbox GL JS |
| Deploy | Vercel (web) + Railway (api, ml) |

## Repo Structure

```
voxaid/
├── apps/
│   ├── web/          # Next.js 14 — CHW dashboard + landing
│   ├── api/          # NestJS — webhooks, orchestration, Postgres
│   └── ml/           # FastAPI — voice biomarker extraction + XGBoost
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared shadcn components
│   └── config/       # Shared eslint, tsconfig, prettier
├── scripts/          # Setup, dev, deploy, migration scripts
├── docs/             # Architecture, deployment docs
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+ and pnpm 10+
- Python 3.11+
- Accounts: Twilio, OpenAI, Anthropic, ElevenLabs, Supabase, Clerk, Mapbox, Upstash

### Quick Start

```bash
# 1. Clone and setup
git clone <repo-url> && cd voxaid
pnpm setup            # Installs deps, creates Python venv, copies .env

# 2. Configure environment
# Edit .env.local with your API keys (see .env.example for all required vars)

# 3. Setup database
pnpm db:migrate       # Runs Prisma migrations against Supabase

# 4. Start all services
pnpm dev:all          # Web :3000, API :3001, ML :8001
```

### Individual Services

```bash
pnpm dev:web          # Next.js on http://localhost:3000
pnpm dev:api          # NestJS on http://localhost:3001

# ML service (Python — requires venv)
cd apps/ml
source .venv/bin/activate
uvicorn main:app --reload --port 8001
```

### Available Scripts

| Script | Description |
|---|---|
| `pnpm setup` | First-time setup (install deps, create venv, copy env) |
| `pnpm dev:all` | Start all 3 services (web + api + ml) |
| `pnpm dev:web` | Start web only |
| `pnpm dev:api` | Start API only |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm deploy` | Deploy all to production (Vercel + Railway) |
| `pnpm deploy:web` | Deploy web to Vercel |
| `pnpm deploy:api` | Deploy API to Railway |
| `pnpm deploy:ml` | Deploy ML to Railway |
| `pnpm db:migrate` | Run Prisma migrations (dev) |
| `pnpm db:deploy` | Run Prisma migrations (production) |
| `pnpm db:studio` | Open Prisma Studio |

---

## Deployment

### Web (Next.js) — Vercel

```bash
pnpm deploy:web
```

Set these env vars in the Vercel dashboard:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

### API (NestJS) — Railway

```bash
pnpm deploy:api
```

Set these env vars in Railway:
- `DATABASE_URL`, `DIRECT_URL`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY`
- `UPSTASH_REDIS_URL`
- `API_BASE_URL` (your Railway API URL)
- `ML_SERVICE_URL` (your Railway ML URL)

### ML (FastAPI) — Railway

```bash
pnpm deploy:ml
```

No env vars required — stateless service.

### Post-Deploy

1. Set Twilio voice webhook: `https://<api-url>/twilio/voice`
2. Set Twilio WhatsApp webhook: `https://<api-url>/twilio/whatsapp`
3. Run production migration: `pnpm db:deploy`

---

## Cost Analysis

### Per-Screening Cost at Scale

| Component | Cost | Notes |
|---|---|---|
| Twilio voice (60s call) | $0.013 | India via Exotel: $0.005 |
| Whisper API (60s audio) | $0.006 | Self-hosted: $0.001 |
| Biomarker extraction | $0.0005 | CPU-only, negligible |
| XGBoost inference | $0.0001 | Negligible |
| Claude Sonnet | $0.002 | Haiku fallback: $0.0005 |
| ElevenLabs TTS | $0.01 | Optional, Coqui fallback: free |
| **Total per screening** | **$0.03** | **At 1M/month: $25-30K COGS** |

### Infrastructure (Monthly)

| Tier | Cost | Supports |
|---|---|---|
| Hackathon/Demo | ~$0 | Free tiers only |
| Early Pilot (100 CHWs) | ~$100-150 | 5K screenings/month |
| Growth (1,000 CHWs) | ~$500-800 | 50K screenings/month |
| Scale (10,000 CHWs) | ~$3,000-5,000 | 500K screenings/month |

---

## Market

### Target Users

- **ASHA Workers** — India's 1M community health workers
- **BRAC Health Workers** — Bangladesh, 100K volunteers
- **Last Mile Health** — Liberia, community health programs
- **UNFPA/UNICEF** — Maternal health programs globally

### Revenue Model

1. **NGO Licensing** — $1/CHW/month (100K CHWs = $1.2M ARR)
2. **Government Contracts** — State-level health ministry deals ($1-2M ARR for 5 Indian states)
3. **Pharma Partnerships** — Medication adherence post-screening
4. **Grants** — WHO, Gates Foundation, Wellcome Trust ($500K-$5M typical)

### Competitive Landscape

| Company | Market | Limitation |
|---|---|---|
| Kintsugi Health | US payers/clinicians | English-only, smartphone-only |
| Ellipsis Health | US clinical workflows | FDA-track, closed ecosystem |
| Sonde Health | DTC wellness apps | US/UK only |
| Ada Health | Symptom checkers | Text-based, smartphone required |

**VoxAID whitespace:** No one combines voice biomarkers + IVR/WhatsApp + LMIC + multilingual + CHW workflow.

---

## The Science

Voice biomarkers used for depression screening:

| Biomarker | What it measures | In depression |
|---|---|---|
| F0 (fundamental frequency) | Pitch | Lower |
| Jitter | Pitch perturbation | Higher |
| Shimmer | Amplitude perturbation | Higher |
| HNR | Harmonics-to-noise ratio | Lower (breathier) |
| Pause ratio | Silence vs speech | Higher |
| Speech rate | Voiced frames/second | Lower |
| MFCCs (13) | Spectral envelope | Flatter |

References:
- Cummins et al. (2015) "A review of depression and suicide risk assessment using speech analysis"
- Low et al. (2020) "Automated assessment of psychiatric disorders using speech"
- DAIC-WOZ dataset (Gratch et al., 2014)

**Regulatory note:** VoxAID is a screening tool, not a diagnostic device. It triggers human follow-up, not clinical decisions. This positions it below the FDA SaMD 510(k) threshold for initial deployment.

---

## License

MIT
