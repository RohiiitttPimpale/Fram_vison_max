"""Prediction routes backed by trained RandomForest model."""
import os
import requests
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from utils import error_response, success_response

prediction_bp = Blueprint("prediction", __name__, url_prefix="/api/prediction")

# Model service URL - can be overridden via environment variable
MODEL_SERVICE_URL = os.environ.get('MODEL_SERVICE_URL', 'http://localhost:5001')

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
    """Predict crop yield by calling Model Service."""
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

    # Prepare request for Model Service
    request_data = {
        "crop": model_crop,
        "state": state_value,
        "area": float(payload.get("area", 0)),
        "fertilizer": float(payload.get("fertilizer", 0)),
        "pesticide": float(payload.get("pesticide", 0)),
        "avg_temp_c": float(payload.get("avg_temp_c", 0)),
        "total_rainfall_mm": float(payload.get("total_rainfall_mm", 0)),
        "avg_humidity_percent": float(payload.get("avg_humidity_percent", 0)),
        "N": float(payload.get("N", 0)),
        "P": float(payload.get("P", 0)),
        "K": float(payload.get("K", 0)),
        "pH": float(payload.get("pH", 0)),
    }

    # Call Model Service
    try:
        response = requests.post(
            f'{MODEL_SERVICE_URL}/api/inference',
            json=request_data,
            timeout=30
        )

        if response.status_code != 200:
            return error_response(f"Model service error: {response.text}", 500)

        result = response.json()

    except requests.exceptions.Timeout:
        return error_response("Model service timeout (too slow)", 504)
    except requests.exceptions.ConnectionError:
        return error_response("Cannot connect to model service", 503)
    except Exception as e:
        return error_response(f"Model service error: {str(e)}", 500)

    return success_response(
        {
            "predicted_yield": round(float(result["predicted_yield"]), 2),
            "unit": result.get("unit", "tons/hectare"),
            "model_crop": model_crop,
            "model_state": state_value,
        }
    )
