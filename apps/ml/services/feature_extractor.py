"""
Voice biomarker feature extraction using librosa + parselmouth.
Extracts clinically relevant acoustic features from speech audio:
- Jitter (pitch perturbation) — elevated in depression, anxiety
- Shimmer (amplitude perturbation) — elevated in depression
- F0 stats (fundamental frequency) — lower in depression
- Pause ratio — higher in depression, cognitive load
- MFCCs — general speech quality representation
- HNR (harmonics-to-noise) — lower in pathological voice

References:
- Cummins et al. (2015) "A review of depression and suicide risk assessment using speech analysis"
- Low et al. (2020) "Automated assessment of psychiatric disorders using speech"
"""

import io
import math
import numpy as np
import librosa
import parselmouth
from parselmouth.praat import call
from pydantic import BaseModel


class VoiceBiomarkers(BaseModel):
    # Pitch (F0) statistics
    f0_mean: float
    f0_std: float
    f0_min: float
    f0_max: float

    # Perturbation measures
    jitter_local: float
    shimmer_local: float

    # Voice quality
    hnr_mean: float

    # Temporal features
    pause_ratio: float  # fraction of silence in the recording
    speech_rate: float  # voiced frames per second

    # Spectral features (13 MFCCs — mean + std = 26 values)
    mfcc_means: list[float]
    mfcc_stds: list[float]


def _safe_float(value, default: float = 0.0) -> float:
    """Sanitize Praat output — replace NaN/infinity with a safe default."""
    if value is None or math.isnan(value) or math.isinf(value):
        return default
    return float(value)


def extract_features(audio_bytes: bytes, sr: int = 16000) -> VoiceBiomarkers:
    """
    Extract vocal biomarkers from raw audio bytes.
    Expects WAV or any format librosa can decode.
    """
    # Load audio into numpy array
    y, sr = librosa.load(io.BytesIO(audio_bytes), sr=sr, mono=True)

    if len(y) < sr * 0.5:
        # Less than 0.5 seconds of audio — not enough for analysis
        return _empty_biomarkers()

    # --- Parselmouth (Praat) for pitch + perturbation ---
    sound = parselmouth.Sound(y, sampling_frequency=sr)

    # Pitch extraction with sensible defaults for speech (75-500 Hz)
    # https://www.fon.hum.uva.nl/praat/manual/Sound__To_Pitch___.html
    pitch = call(sound, "To Pitch", 0.0, 75, 500)
    f0_values = pitch.selected_array["frequency"]
    f0_voiced = f0_values[f0_values > 0]  # filter unvoiced frames

    if len(f0_voiced) < 5:
        # Not enough voiced speech — return zeroed features
        return _empty_biomarkers()

    f0_mean = float(np.mean(f0_voiced))
    f0_std = float(np.std(f0_voiced))
    f0_min = float(np.min(f0_voiced))
    f0_max = float(np.max(f0_voiced))

    # Jitter and shimmer via point process
    # https://www.fon.hum.uva.nl/praat/manual/Voice_2__Jitter.html
    try:
        point_process = call(sound, "To PointProcess (periodic, cc)", 75, 500)

        jitter_local = _safe_float(call(
            point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3
        ))
        shimmer_local = _safe_float(call(
            [sound, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6
        ))

        # HNR (Harmonics-to-Noise Ratio)
        harmonicity = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
        hnr_mean = _safe_float(call(harmonicity, "Get mean", 0, 0))
    except Exception:
        # Praat can fail on edge-case audio — degrade gracefully
        jitter_local = 0.0
        shimmer_local = 0.0
        hnr_mean = 0.0

    # --- Temporal: pause ratio ---
    total_frames = len(f0_values)
    voiced_frames = len(f0_voiced)
    pause_ratio = 1.0 - (voiced_frames / total_frames) if total_frames > 0 else 0.0
    duration_sec = len(y) / sr
    speech_rate = min(voiced_frames / duration_sec, 300.0) if duration_sec > 0 else 0.0

    # --- Librosa: MFCCs ---
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_means = np.mean(mfccs, axis=1).tolist()[:13]
    mfcc_stds = np.std(mfccs, axis=1).tolist()[:13]

    # Pad if somehow fewer than 13 (shouldn't happen with n_mfcc=13)
    mfcc_means += [0.0] * (13 - len(mfcc_means))
    mfcc_stds += [0.0] * (13 - len(mfcc_stds))

    return VoiceBiomarkers(
        f0_mean=f0_mean,
        f0_std=f0_std,
        f0_min=f0_min,
        f0_max=f0_max,
        jitter_local=jitter_local,
        shimmer_local=shimmer_local,
        hnr_mean=hnr_mean,
        pause_ratio=pause_ratio,
        speech_rate=speech_rate,
        mfcc_means=mfcc_means,
        mfcc_stds=mfcc_stds,
    )


def _empty_biomarkers() -> VoiceBiomarkers:
    """Return zeroed features when audio has insufficient voiced speech."""
    return VoiceBiomarkers(
        f0_mean=0.0,
        f0_std=0.0,
        f0_min=0.0,
        f0_max=0.0,
        jitter_local=0.0,
        shimmer_local=0.0,
        hnr_mean=0.0,
        pause_ratio=1.0,
        speech_rate=0.0,
        mfcc_means=[0.0] * 13,
        mfcc_stds=[0.0] * 13,
    )
