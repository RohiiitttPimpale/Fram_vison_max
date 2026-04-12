"""Standalone model inference worker for yield prediction.

This script is executed as a subprocess by the API route. It isolates
numpy/sklearn runtime issues so the Flask process remains stable.
"""
import json
import os
import pickle
import sys

import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "yield_model.pkl")
FEATURE_COLUMNS = [
    "crop",
    "state",
    "area",
    "fertilizer",
    "pesticide",
    "avg_temp_c",
    "total_rainfall_mm",
    "avg_humidity_percent",
    "N",
    "P",
    "K",
    "pH",
]


def main() -> int:
    payload = json.loads(sys.stdin.read() or "{}")

    with open(MODEL_PATH, "rb") as model_file:
        model_data = pickle.load(model_file)

    model = model_data["model"]
    le_crop = model_data["label_encoder_crop"]
    le_state = model_data["label_encoder_state"]
    model_features = list(model_data.get("feature_columns", FEATURE_COLUMNS))

    encoded_crop = int(le_crop.transform([payload["crop"]])[0])
    encoded_state = int(le_state.transform([payload["state"]])[0])

    row = {
        "crop": encoded_crop,
        "state": encoded_state,
        "area": float(payload["area"]),
        "fertilizer": float(payload["fertilizer"]),
        "pesticide": float(payload["pesticide"]),
        "avg_temp_c": float(payload["avg_temp_c"]),
        "total_rainfall_mm": float(payload["total_rainfall_mm"]),
        "avg_humidity_percent": float(payload["avg_humidity_percent"]),
        "N": float(payload["N"]),
        "P": float(payload["P"]),
        "K": float(payload["K"]),
        "pH": float(payload["pH"]),
    }

    input_df = pd.DataFrame([row])[model_features]
    prediction = model.predict(input_df)

    sys.stdout.write(json.dumps({"predicted_yield": float(prediction[0])}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
