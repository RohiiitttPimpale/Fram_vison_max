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

# Global model and encoders loaded once on startup
MODEL = None
LABEL_ENCODER_CROP = None
LABEL_ENCODER_STATE = None
FEATURE_COLUMNS = None

def load_model():
    """Load model and encoders once at service startup"""
    global MODEL, LABEL_ENCODER_CROP, LABEL_ENCODER_STATE, FEATURE_COLUMNS
    try:
        model_path = os.environ.get('MODEL_PATH', '../server/model/yield_model.joblib')
        
        # Try multiple possible paths
        possible_paths = [
            model_path,
            './server/model/yield_model.joblib',
            '../server/model/yield_model.joblib',
            '/app/model/yield_model.joblib'
        ]
        
        model_file = None
        for path in possible_paths:
            if os.path.exists(path):
                model_file = path
                break
        
        if not model_file:
            logger.error(f"Model file not found. Tried: {possible_paths}")
            return False
        
        data = joblib.load(model_file)
        logger.info(f"Model file keys: {list(data.keys())}")
        
        MODEL = data.get('model')
        LABEL_ENCODER_CROP = data.get('label_encoder_crop')
        LABEL_ENCODER_STATE = data.get('label_encoder_state')
        FEATURE_COLUMNS = data.get('feature_columns', [
                'area', 'fertilizer', 'pesticide', 'avg_temp_c',
                'total_rainfall_mm', 'avg_humidity_percent',
                'N', 'P', 'K', 'pH', 'crop', 'state'
            ])
        
        if MODEL is None:
            logger.error("✗ Model key not found in model file")
            return False
        
        if LABEL_ENCODER_CROP is None:
            logger.error("✗ label_encoder_crop not found in model file")
            return False
            
        if LABEL_ENCODER_STATE is None:
            logger.error("✗ label_encoder_state not found in model file")
            return False
            
        logger.info(f"✓ Model loaded successfully from {model_file}")
        logger.info(f"✓ Encoders available: crop and state")
        logger.info(f"✓ Feature columns: {FEATURE_COLUMNS}")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to load model: {e}")
        return False

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    if MODEL is None:
        return jsonify({"status": "error", "message": "Model not loaded"}), 503
    return jsonify({"status": "ok", "message": "Model service healthy"})

@app.route('/api/inference', methods=['POST'])
def predict():
    """
    Inference endpoint
    
    Expected JSON:
    {
        "crop": "Rice",
        "state": "Uttar Pradesh",
        "area": 10000,
        "fertilizer": 150000,
        "pesticide": 500,
        "avg_temp_c": 25,
        "total_rainfall_mm": 1200,
        "avg_humidity_percent": 75,
        "N": 80,
        "P": 40,
        "K": 30,
        "pH": 6.5
    }
    """
    try:
        if MODEL is None:
            return jsonify({"error": "Model not loaded"}), 503
        
        data = request.json
        
        # Validate required fields
        required = ['crop', 'state', 'area', 'fertilizer', 'pesticide',
                   'avg_temp_c', 'total_rainfall_mm', 'avg_humidity_percent',
                   'N', 'P', 'K', 'pH']
        for field in required:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400
        
        # Encode categorical features
        try:
            if LABEL_ENCODER_CROP is None:
                logger.error("✗ 'crop' encoder not loaded")
                return jsonify({"error": "'crop' encoder not available"}), 500
            
            if LABEL_ENCODER_STATE is None:
                logger.error("✗ 'state' encoder not loaded")
                return jsonify({"error": "'state' encoder not available"}), 500
            
            crop_encoded = LABEL_ENCODER_CROP.transform([data['crop']])[0]
            state_encoded = LABEL_ENCODER_STATE.transform([data['state']])[0]
        except Exception as e:
            logger.error(f"✗ Encoding error: {e}", exc_info=True)
            return jsonify({"error": f"Encoding failed: {str(e)}"}), 500
        
        # Build feature array in model's expected order: crop, state, area, fertilizer, ...
        features = pd.DataFrame([[
            crop_encoded,
            state_encoded,
            data['area'],
            data['fertilizer'],
            data['pesticide'],
            data['avg_temp_c'],
            data['total_rainfall_mm'],
            data['avg_humidity_percent'],
            data['N'],
            data['P'],
            data['K'],
            data['pH']
        ]], columns=FEATURE_COLUMNS)
        
        # Run prediction
        prediction = MODEL.predict(features)[0]
        
        logger.info(f"✓ Prediction: {data['crop']} in {data['state']} → {prediction:.2f}")
        
        return jsonify({
            "predicted_yield": round(float(prediction), 2),
            "unit": "tons/hectare",
            "crop": data['crop'],
            "state": data['state']
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    if load_model():
        logger.info("Starting Model Service on port 5001...")
        app.run(host='0.0.0.0', port=5001, debug=False)
    else:
        logger.error("Failed to start service: model could not be loaded")
        exit(1)
