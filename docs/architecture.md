# VoxAID — System Architecture

## High-Level Flow

```
Patient (Feature Phone)
    │
    ├── Calls Twilio Number ──────────────┐
    │                                      │
    └── WhatsApp Voice Note ──────────────┐│
                                          ││
                                          ▼▼
                                    ┌──────────┐
                                    │  NestJS   │
                                    │   API     │
                                    │ (Render) │
                                    └────┬─────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                     │
                    ▼                    ▼                     ▼
            ┌──────────┐      ┌──────────────┐      ┌──────────────┐
            │  Whisper  │      │   FastAPI ML  │      │    Claude     │
            │   (ASR)   │      │   (Render)   │      │   Sonnet      │
            │           │      │               │      │               │
            │ Transcribe│      │ Extract       │      │ Generate      │
            │ 99+ langs │      │ Biomarkers    │      │ Action Plan   │
            └──────────┘      │ Classify Risk │      │ (Multilingual)│
                               └──────────────┘      └──────────────┘
                                         │
                                         ▼
                              ┌──────────────────┐
                              │  Supabase        │
                              │  Postgres        │
                              │  (Patient +      │
                              │   Screening data)│
                              └──────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                     │
                    ▼                    ▼                     ▼
            ┌──────────┐      ┌──────────────┐      ┌──────────────┐
            │ElevenLabs│      │  CHW Dashboard │      │   Twilio SMS  │
            │   TTS    │      │  (Next.js on   │      │   (Clinic     │
            │ Callback │      │   Vercel)      │      │    Referral)  │
            └──────────┘      └──────────────┘      └──────────────┘
```

## Services

### 1. Web — CHW Dashboard (`apps/web`)
- **Runtime:** Next.js 14 (App Router) on Vercel
- **Auth:** Clerk (middleware-protected `/dashboard/*` routes)
- **Pages:**
  - `/` — Landing page (marketing, pitch site)
  - `/story` — "Priya in Bihar" narrative demo
  - `/dashboard` — Patient list with risk badges, stat cards
  - `/dashboard/map` — Mapbox GL JS geographic view
  - `/dashboard/patient/[id]` — Detail view with transcript, biomarkers, action plan, referral
  - `/sign-in`, `/sign-up` — Clerk auth pages
- **Design:** Inter + Sora fonts, teal-700 primary, mobile-first (360px)

### 2. API — Orchestration (`apps/api`)
- **Runtime:** NestJS 11 on Render (Docker)
- **Modules:**
  - `TwilioModule` — IVR voice webhook + WhatsApp webhook + recording callback
  - `QueueModule` — BullMQ queue backed by Upstash Redis
  - `WhisperModule` — OpenAI Whisper transcription service + BullMQ worker
  - `ClaudeModule` — Anthropic Claude Sonnet action plan generation
  - `TtsModule` — ElevenLabs TTS + Twilio outbound call
  - `ReferralModule` — SMS referral to clinic + CHW notification
- **Database:** Prisma ORM → Supabase Postgres
- **Port:** 3001

### 3. ML — Voice Analysis (`apps/ml`)
- **Runtime:** FastAPI (Python) on Render (Docker)
- **Endpoints:**
  - `GET /health` — health check
  - `POST /extract-features` — audio file → 32 vocal biomarkers
  - `POST /classify` — audio file → biomarkers + depression risk score
- **Libraries:** librosa (MFCCs, spectral), praat-parselmouth (jitter, shimmer, F0, HNR), XGBoost
- **Model:** Synthetic XGBoost classifier (auto-generated on first run from DAIC-WOZ literature distributions)
- **Port:** 8001

## Data Flow — Screening Pipeline

```
1. Patient calls Twilio number
2. TwilioController returns TwiML → records 30s of speech
3. Twilio POSTs recording callback → RecordingUrl
4. Controller enqueues transcription job to BullMQ
5. WhisperProcessor picks up job:
   a. Fetches audio from Twilio URL
   b. Sends to Whisper API → transcript + language
6. API calls ML service POST /classify with audio
   a. librosa + parselmouth extract 32 features
   b. XGBoost predicts depression score (0-1)
7. API calls ClaudeService.generateActionPlan()
   a. Sends biomarkers + transcript + language
   b. Returns action plan in patient's language
8. API calls TtsService.speakAndCall()
   a. ElevenLabs generates speech audio
   b. Twilio calls patient back with TwiML
9. Results stored in Postgres (Screening record)
10. CHW sees flagged patient on dashboard
11. CHW clicks "Refer to Clinic" → SMS sent
```

## Database Schema

```
Patient
  ├── id (cuid)
  ├── name
  ├── phone (unique)
  ├── language (default: "en")
  ├── latitude, longitude
  ├── assignedChwId
  ├── createdAt, updatedAt
  └── screenings[] ──→ Screening

Screening
  ├── id (cuid)
  ├── patientId → Patient
  ├── audioUrl
  ├── transcript
  ├── language
  ├── depressionScore (0-1)
  ├── depressionRisk (low | moderate | high | critical)
  ├── biomarkers (JSON)
  ├── actionPlan
  ├── source (ivr | whatsapp)
  ├── callSid
  └── createdAt
```

## Infrastructure

| Service | Platform | Cost (Free Tier) | Production Est. |
|---|---|---|---|
| Web (Next.js) | Vercel | Free (Hobby) | $20/mo (Pro) |
| API (NestJS) | Render | $5 credit/mo | $10-20/mo |
| ML (FastAPI) | Render | $5 credit/mo | $10-20/mo |
| Database | Supabase | Free (500MB) | $25/mo (Pro) |
| Redis | Upstash | Free (10K cmds/day) | $10/mo |
| Auth | Clerk | Free (10K MAU) | $25/mo |
| Voice | Twilio | ~$1 trial credit | $0.013/call |
| ASR | OpenAI | Pay-per-use | $0.006/min |
| LLM | Anthropic | Pay-per-use | $0.002/call |
| TTS | ElevenLabs | Free (10K chars/mo) | $0.01/call |
| Maps | Mapbox | Free (50K loads/mo) | Free tier sufficient |
| **Total (hackathon)** | | **~$0** | |
| **Total (production)** | | | **~$100-150/mo** |
