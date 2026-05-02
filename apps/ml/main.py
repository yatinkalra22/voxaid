from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from services.feature_extractor import extract_features, VoiceBiomarkers

app = FastAPI(
    title="VoxAID ML",
    description="Voice biomarker extraction and risk classification",
    version="0.1.0",
)

# Allow API server to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
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
