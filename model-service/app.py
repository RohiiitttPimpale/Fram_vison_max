from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import logging
import os

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL = None
LABEL_ENCODER_CROP = None
LABEL_ENCODER_STATE = None
FEATURE_COLUMNS = None


def load_model():
    """Load the model and encoders once when the Space starts."""
    global MODEL, LABEL_ENCODER_CROP, LABEL_ENCODER_STATE, FEATURE_COLUMNS

    model_path = os.environ.get("MODEL_PATH", "yield_model.joblib")
    possible_paths = [
        model_path,
        "./yield_model.joblib",
        "/app/yield_model.joblib",
    ]

    model_file = None
    for path in possible_paths:
        if os.path.exists(path):
            model_file = path
            break

    if not model_file:
        logger.error("Model file not found. Tried: %s", possible_paths)
        return False

    try:
        data = joblib.load(model_file)
        logger.info("Model file keys: %s", list(data.keys()))

        MODEL = data.get("model")
        LABEL_ENCODER_CROP = data.get("label_encoder_crop")
        LABEL_ENCODER_STATE = data.get("label_encoder_state")
        FEATURE_COLUMNS = data.get(
            "feature_columns",
            [
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
            ],
        )

        if MODEL is None or LABEL_ENCODER_CROP is None or LABEL_ENCODER_STATE is None:
            logger.error("Model artifact is missing required keys")
            return False

        logger.info("Model loaded successfully from %s", model_file)
        return True
    except Exception as error:
        logger.error("Failed to load model: %s", error, exc_info=True)
        return False


@app.route("/health", methods=["GET"])
def health():
    if MODEL is None:
        return jsonify({"status": "error", "message": "Model not loaded"}), 503
    return jsonify({"status": "ok", "message": "Model service healthy"})


@app.route("/", methods=["GET"])
def home():
    return jsonify(
        {
            "status": "ok",
            "message": "Soil Smart model service is running",
            "endpoints": {
                "health": "/health",
                "inference": "/api/inference",
            },
        }
    )


@app.route("/api/inference", methods=["POST"])
def predict():
    if MODEL is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.get_json(silent=True) or {}
    required = [
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

    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        crop_encoded = LABEL_ENCODER_CROP.transform([data["crop"]])[0]
        state_encoded = LABEL_ENCODER_STATE.transform([data["state"]])[0]
    except Exception as error:
        logger.error("Encoding error: %s", error, exc_info=True)
        return jsonify({"error": f"Encoding failed: {str(error)}"}), 500

    features = pd.DataFrame(
        [[
            crop_encoded,
            state_encoded,
            float(data["area"]),
            float(data["fertilizer"]),
            float(data["pesticide"]),
            float(data["avg_temp_c"]),
            float(data["total_rainfall_mm"]),
            float(data["avg_humidity_percent"]),
            float(data["N"]),
            float(data["P"]),
            float(data["K"]),
            float(data["pH"]),
        ]],
        columns=FEATURE_COLUMNS,
    )

    prediction = MODEL.predict(features)[0]
    return jsonify(
        {
            "predicted_yield": round(float(prediction), 2),
            "unit": "tons/hectare",
            "crop": data["crop"],
            "state": data["state"],
        }
    )


if __name__ == "__main__":
    if load_model():
        port = int(os.environ.get("PORT", 7860))
        logger.info("Starting Model Service on port %s...", port)
        app.run(host="0.0.0.0", port=port, debug=False)
    else:
        raise SystemExit(1)