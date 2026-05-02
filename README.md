# VoxAID

**Voice-first health triage for community health workers in low-resource settings.**

Screen depression, anxiety, and NCD risk in 60 seconds with a phone call. No smartphone, no data plan, no literacy required.

---

## The Problem

1.2 billion people live with mental disorders. 75% receive no treatment — almost entirely in low- and middle-income countries where there are fewer than 1 psychiatrist per 100,000 people. Community health workers (CHWs) see millions of patients but have no diagnostic tools beyond a paper checklist.

## What VoxAID Does

A CHW or patient calls a phone number (or sends a WhatsApp voice note). In under 60 seconds, VoxAID:

1. **Transcribes** speech via Whisper in any language
2. **Extracts vocal biomarkers** — jitter, shimmer, F0, pause ratio, MFCC
3. **Classifies risk** for depression, anxiety, and NCDs via XGBoost
4. **Generates an action plan** in the patient's language via Claude
5. **Calls the patient back** with next steps via ElevenLabs TTS
6. **Flags high-risk patients** on a CHW dashboard with one-click clinic referral

## Why It Matters

- Works on a $20 feature phone — no app, no internet, no literacy required
- $0.03 per screening at scale
- Designed for ASHA workers (India), BRAC volunteers (Bangladesh), Last Mile Health agents (Liberia)
- Direct alignment with SDG 3.1, 3.4, 3.8, and 3.d

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm |
| Web | Next.js 14, TypeScript, Tailwind, shadcn/ui |
| API | NestJS, TypeScript, Prisma, Zod |
| ML | Python, FastAPI, librosa, praat-parselmouth, XGBoost |
| Voice | Twilio (IVR + WhatsApp), OpenAI Whisper, ElevenLabs TTS |
| AI | Anthropic Claude Sonnet |
| Database | Supabase Postgres |
| Maps | Mapbox GL JS |
| Deploy | Vercel + Railway |

## Getting Started

```bash
pnpm install
pnpm dev
```

## License

MIT
