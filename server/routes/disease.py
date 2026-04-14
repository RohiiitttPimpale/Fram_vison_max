"""Disease detection routes backed by Hugging Face model."""
import os
import requests
from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from utils import error_response, success_response

disease_bp = Blueprint("disease", __name__, url_prefix="/api/disease-detection")

# Disease model service URL - Hugging Face Space
DISEASE_MODEL_URL = os.environ.get(
    'DISEASE_MODEL_URL',
    'https://rohit-pimpale-crop-disease-api.hf.space/predict'
)

# Allowed file extensions for image upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@disease_bp.route("/upload", methods=["POST"])
@jwt_required()
def detect_disease():
    """
    Detect crop disease from uploaded leaf image.
    
    Expected request:
    - multipart/form-data with 'file' key containing the image
    
    Returns:
    - disease: string (e.g., 'Tomato_Late_blight')
    - confidence: float (0.0-1.0)
    - severity: string ('low', 'medium', 'high') based on confidence
    """
    # Check if request has file
    if 'file' not in request.files:
        return error_response("No file part in the request", 400)

    file = request.files['file']

    if file.filename == '':
        return error_response("No file selected", 400)

    if not allowed_file(file.filename):
        return error_response(
            f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}", 400
        )

    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > MAX_FILE_SIZE:
        return error_response(f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB", 400)

    # Prepare multipart form data for the model service
    try:
        files = {'file': (secure_filename(file.filename), file.stream, file.content_type)}

        # Call the disease detection model service
        response = requests.post(
            DISEASE_MODEL_URL,
            files=files,
            timeout=30
        )

        if response.status_code != 200:
            return error_response(
                f"Disease model service error: {response.text}",
                500
            )

        result = response.json()

        # Validate response structure
        if 'disease' not in result or 'confidence' not in result:
            return error_response(
                "Invalid response from disease model service",
                500
            )

        disease = str(result.get('disease', '')).strip()
        confidence = float(result.get('confidence', 0))

        # Determine severity based on confidence
        if confidence >= 0.8:
            severity = "high"
        elif confidence >= 0.6:
            severity = "medium"
        else:
            severity = "low"

        return success_response(
            {
                "disease": disease,
                "confidence": round(confidence, 4),
                "severity": severity,
            }
        )

    except requests.exceptions.Timeout:
        return error_response("Disease model service timeout", 504)
    except requests.exceptions.ConnectionError:
        return error_response("Cannot connect to disease model service", 503)
    except ValueError as e:
        return error_response(f"Invalid model response format: {str(e)}", 500)
    except Exception as e:
        return error_response(f"Disease detection error: {str(e)}", 500)


@disease_bp.route("/metadata", methods=["GET"])
@jwt_required()
def disease_metadata():
    """Return metadata about supported disease types."""
    return success_response(
        {
            "supported_crops": [
                "Tomato", "Pepper", "Potato", "Wheat", "Rice", "Corn",
                "Soybean", "Apple", "Orange", "Grape"
            ],
            "max_file_size_mb": MAX_FILE_SIZE / 1024 / 1024,
            "allowed_formats": list(ALLOWED_EXTENSIONS),
            "confidence_range": [0.0, 1.0],
            "severity_levels": ["low", "medium", "high"]
        }
    )
