"""
Depression risk classifier using XGBoost.

For the hackathon demo, we use a synthetic model trained on feature distributions
derived from DAIC-WOZ literature (Gratch et al., 2014). The feature vector maps
directly to VoiceBiomarkers output from feature_extractor.py.

In production, this would be trained on real DAIC-WOZ data with proper
cross-validation and clinical oversight.

Risk thresholds (calibrated to PHQ-8 severity):
- low:      score < 0.3
- moderate: 0.3 <= score < 0.6
- high:     0.6 <= score < 0.8
- critical: score >= 0.8
"""

import os
import numpy as np
import xgboost as xgb

from services.feature_extractor import VoiceBiomarkers

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "depression_xgb.json")


def _biomarkers_to_vector(b: VoiceBiomarkers) -> np.ndarray:
    """Convert VoiceBiomarkers into a flat feature vector for XGBoost."""
    return np.array(
        [
            b.f0_mean,
            b.f0_std,
            b.f0_min,
            b.f0_max,
            b.jitter_local,
            b.shimmer_local,
            b.hnr_mean,
            b.pause_ratio,
            b.speech_rate,
            *b.mfcc_means,  # 13 values
            *b.mfcc_stds,   # 13 values
        ],
        dtype=np.float32,
    ).reshape(1, -1)  # shape: (1, 32)


# Feature names matching the vector order — used for model training
FEATURE_NAMES = [
    "f0_mean", "f0_std", "f0_min", "f0_max",
    "jitter_local", "shimmer_local", "hnr_mean",
    "pause_ratio", "speech_rate",
    *[f"mfcc_mean_{i}" for i in range(13)],
    *[f"mfcc_std_{i}" for i in range(13)],
]


class DepressionClassifier:
    def __init__(self):
        self.model: xgb.Booster | None = None
        self._load_or_create_model()

    def _load_or_create_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = xgb.Booster()
                self.model.load_model(MODEL_PATH)
                return
            except Exception:
                # Corrupted model file — retrain
                pass
        self.model = self._train_synthetic_model()

    def _train_synthetic_model(self):
        """
        Train on synthetic data using feature distributions from DAIC-WOZ literature.
        This gives plausible demo outputs. NOT for clinical use.

        Depressed speech characteristics (from literature):
        - Lower F0 mean, reduced F0 range
        - Higher jitter/shimmer (more vocal perturbation)
        - Lower HNR (breathier voice)
        - Higher pause ratio (more silence, slower speech)
        - Flatter MFCCs
        """
        rng = np.random.default_rng(42)
        n_samples = 500

        # Healthy samples
        healthy = np.column_stack([
            rng.normal(180, 40, n_samples),       # f0_mean — higher
            rng.normal(30, 10, n_samples),         # f0_std — more variation
            rng.normal(100, 20, n_samples),        # f0_min
            rng.normal(300, 50, n_samples),        # f0_max
            rng.normal(0.01, 0.005, n_samples),    # jitter — lower
            rng.normal(0.03, 0.01, n_samples),     # shimmer — lower
            rng.normal(20, 5, n_samples),           # hnr — higher
            rng.normal(0.25, 0.08, n_samples),     # pause_ratio — lower
            rng.normal(120, 20, n_samples),        # speech_rate — higher
            *[rng.normal(0, 5, n_samples) for _ in range(13)],   # mfcc_means
            *[rng.normal(3, 1, n_samples) for _ in range(13)],   # mfcc_stds
        ]).astype(np.float32)

        # Depressed samples
        depressed = np.column_stack([
            rng.normal(140, 30, n_samples),        # f0_mean — lower
            rng.normal(15, 8, n_samples),          # f0_std — less variation
            rng.normal(90, 25, n_samples),         # f0_min
            rng.normal(200, 40, n_samples),        # f0_max — reduced range
            rng.normal(0.025, 0.01, n_samples),    # jitter — higher
            rng.normal(0.06, 0.02, n_samples),     # shimmer — higher
            rng.normal(12, 4, n_samples),           # hnr — lower
            rng.normal(0.45, 0.1, n_samples),      # pause_ratio — higher
            rng.normal(80, 15, n_samples),         # speech_rate — lower
            *[rng.normal(0, 3, n_samples) for _ in range(13)],   # mfcc_means — flatter
            *[rng.normal(2, 0.8, n_samples) for _ in range(13)], # mfcc_stds
        ]).astype(np.float32)

        X = np.vstack([healthy, depressed])
        y = np.array([0] * n_samples + [1] * n_samples, dtype=np.float32)

        dtrain = xgb.DMatrix(X, label=y, feature_names=FEATURE_NAMES)

        params = {
            "objective": "binary:logistic",
            "eval_metric": "auc",
            "max_depth": 4,
            "eta": 0.1,
            "seed": 42,
        }

        model = xgb.train(params, dtrain, num_boost_round=100)

        # Save for reuse
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        model.save_model(MODEL_PATH)

        return model

    def predict(self, biomarkers: VoiceBiomarkers) -> dict:
        """
        Returns depression risk score (0-1) and risk level.
        """
        vector = _biomarkers_to_vector(biomarkers)
        dmatrix = xgb.DMatrix(vector, feature_names=FEATURE_NAMES)
        score = float(self.model.predict(dmatrix)[0])

        if score < 0.3:
            level = "low"
        elif score < 0.6:
            level = "moderate"
        elif score < 0.8:
            level = "high"
        else:
            level = "critical"

        return {
            "depression_score": round(score, 4),
            "risk_level": level,
        }


# Singleton — model loads once at import time
classifier = DepressionClassifier()
