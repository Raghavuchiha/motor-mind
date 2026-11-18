
import os
import joblib
from functools import lru_cache

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "motormind_models")


@lru_cache(maxsize=1)
def load_models():
    required_files = [
        "failure_models.joblib",
        "failure_mode_model.joblib",
        "health_model.joblib",
    ]

    missing = [
        name for name in required_files
        if not os.path.exists(os.path.join(MODEL_DIR, name))
    ]

    if missing:
        raise FileNotFoundError(
            "Missing model files: " + ", ".join(missing)
        )

    failure_models = joblib.load(
        os.path.join(MODEL_DIR, "failure_models.joblib")
    )

    mode_model = joblib.load(
        os.path.join(MODEL_DIR, "failure_mode_model.joblib")
    )

    health_model = joblib.load(
        os.path.join(MODEL_DIR, "health_model.joblib")
    )

    if isinstance(failure_models, dict):
        failure_model = failure_models.get(
            "Random Forest", health_model
        )
    else:
        failure_model = health_model

    return {
        "failure": failure_model,
        "modes": mode_model,
        "health": health_model,
    }
