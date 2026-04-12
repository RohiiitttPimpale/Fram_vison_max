"""Prediction routes backed by trained RandomForest model."""
import json
import os
import subprocess
import sys

from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from utils import error_response, success_response

prediction_bp = Blueprint("prediction", __name__, url_prefix="/api/prediction")

# Crop aliases for app labels that differ from model labels.
CROP_ALIASES = {
    "Soybean": "Soyabean",
    "Cotton": "Cotton(lint)",
}

SUPPORTED_CROPS = [
    "Arecanut",
    "Arhar/Tur",
    "Bajra",
    "Banana",
    "Barley",
    "Black pepper",
    "Cardamom",
    "Cashewnut",
    "Castor seed",
    "Coconut ",
    "Coriander",
    "Cotton(lint)",
    "Cowpea(Lobia)",
    "Dry chillies",
    "Garlic",
    "Ginger",
    "Gram",
    "Groundnut",
    "Guar seed",
    "Horse-gram",
    "Jowar",
    "Jute",
    "Khesari",
    "Linseed",
    "Maize",
    "Masoor",
    "Mesta",
    "Moong(Green Gram)",
    "Moth",
    "Niger seed",
    "Oilseeds total",
    "Onion",
    "Other  Rabi pulses",
    "Other Cereals",
    "Other Kharif pulses",
    "Other Summer Pulses",
    "Peas & beans (Pulses)",
    "Potato",
    "Ragi",
    "Rapeseed &Mustard",
    "Rice",
    "Safflower",
    "Sannhamp",
    "Sesamum",
    "Small millets",
    "Soyabean",
    "Sugarcane",
    "Sunflower",
    "Sweet potato",
    "Tapioca",
    "Tobacco",
    "Turmeric",
    "Urad",
    "Wheat",
    "other oilseeds",
]

SUPPORTED_STATES = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jammu and Kashmir",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Puducherry",
    "Punjab",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
]

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

REQUIRED_FIELDS = FEATURE_COLUMNS


@prediction_bp.route("/metadata", methods=["GET"])
@jwt_required()
def prediction_metadata():
    """Return supported crops and states for model prediction."""
    return success_response(
        {
            "crops": SUPPORTED_CROPS,
            "states": SUPPORTED_STATES,
            "feature_columns": FEATURE_COLUMNS,
        }
    )


@prediction_bp.route("/yield", methods=["POST"])
@jwt_required()
def predict_yield():
    """Predict crop yield via isolated subprocess to avoid crashing the API process."""
    payload = request.get_json() or {}
    missing_fields = [field for field in REQUIRED_FIELDS if field not in payload]
    if missing_fields:
        return error_response(f"Missing required fields: {', '.join(missing_fields)}", 400)

    crop_value = str(payload.get("crop", "")).strip()
    state_value = str(payload.get("state", "")).strip()
    model_crop = CROP_ALIASES.get(crop_value, crop_value)

    if model_crop not in SUPPORTED_CROPS:
        return error_response("Unsupported crop for this model.", 400)

    if state_value not in SUPPORTED_STATES:
        return error_response("Unsupported state for this model.", 400)

    script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model_inference.py"))
    request_data = {
        **payload,
        "crop": model_crop,
        "state": state_value,
    }

    completed = subprocess.run(
        [sys.executable, script_path],
        input=json.dumps(request_data),
        capture_output=True,
        text=True,
        check=False,
    )

    if completed.returncode != 0:
        stderr = (completed.stderr or "").strip()
        detail = stderr.splitlines()[-1] if stderr else "Model runtime failed"
        return error_response(f"Prediction runtime error: {detail}", 500)

    try:
        result = json.loads(completed.stdout)
    except json.JSONDecodeError:
        return error_response("Prediction runtime returned invalid response.", 500)

    return success_response(
        {
            "predicted_yield": round(float(result["predicted_yield"]), 2),
            "unit": "per hectare",
            "model_crop": model_crop,
            "model_state": state_value,
        }
    )
