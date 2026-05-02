from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from services.feature_extractor import extract_features, VoiceBiomarkers
from services.classifier import classifier

app = FastAPI(
    title="VoxAID ML",
    description="Voice biomarker extraction and risk classification",
    version="0.1.0",
)

# Restrict CORS to the NestJS API server only
import os

_allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "voxaid-ml"}


@app.post("/extract-features", response_model=VoiceBiomarkers)
async def extract_voice_features(audio: UploadFile = File(...)):
    """
    Accept an audio file upload, extract vocal biomarkers.
    NestJS API calls this after fetching audio from Twilio/R2.
    """
    contents = await audio.read()

    if len(contents) < 1000:
        raise HTTPException(status_code=400, detail="Audio file too small")

    try:
        features = extract_features(contents)
    except Exception as e:
        raise HTTPException(
            status_code=422, detail=f"Feature extraction failed: {str(e)}"
        )

    return features


@app.post("/classify")
async def classify_depression(audio: UploadFile = File(...)):
    """
    Full pipeline: audio -> features -> depression risk score.
    Single endpoint for the NestJS API to call.
    """
    contents = await audio.read()

    if len(contents) < 1000:
        raise HTTPException(status_code=400, detail="Audio file too small")

    try:
        features = extract_features(contents)
        result = classifier.predict(features)
    except Exception as e:
        raise HTTPException(
            status_code=422, detail=f"Classification failed: {str(e)}"
        )

    return {
        "biomarkers": features.model_dump(),
        **result,
    }
