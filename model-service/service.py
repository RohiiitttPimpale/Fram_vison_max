from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import logging
import os

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model and encoders loaded once on startup
MODEL = None
ENCODERS = None
FEATURE_COLUMNS = None

def load_model():
    """Load model and encoders once at service startup"""
    global MODEL, ENCODERS, FEATURE_COLUMNS
    try:
        model_path = os.environ.get('MODEL_PATH', '../server/model/yield_model.pkl')
        
        # Try multiple possible paths
        possible_paths = [
            model_path,
            './server/model/yield_model.pkl',
            '../server/model/yield_model.pkl',
            '/app/model/yield_model.pkl'
        ]
        
        model_file = None
        for path in possible_paths:
            if os.path.exists(path):
                model_file = path
                break
        
        if not model_file:
            logger.error(f"Model file not found. Tried: {possible_paths}")
            return False
        
        with open(model_file, 'rb') as f:
            data = pickle.load(f)
            MODEL = data['model']
            ENCODERS = data.get('encoders', {})
            FEATURE_COLUMNS = data.get('feature_columns', [
                'area', 'fertilizer', 'pesticide', 'avg_temp_c',
                'total_rainfall_mm', 'avg_humidity_percent',
                'N', 'P', 'K', 'pH', 'crop', 'state'
            ])
        logger.info(f"✓ Model loaded successfully from {model_file}")
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
        crop_encoded = ENCODERS['crop'].transform([data['crop']])[0]
        state_encoded = ENCODERS['state'].transform([data['state']])[0]
        
        # Build feature array in model's expected order
        features = pd.DataFrame([[
            data['area'],
            data['fertilizer'],
            data['pesticide'],
            data['avg_temp_c'],
            data['total_rainfall_mm'],
            data['avg_humidity_percent'],
            data['N'],
            data['P'],
            data['K'],
            data['pH'],
            crop_encoded,
            state_encoded
        ]], columns=FEATURE_COLUMNS)
        
        # Run prediction
        prediction = MODEL.predict(features)[0]
        
        logger.info(f"Prediction: {data['crop']} in {data['state']} → {prediction:.2f}")
        
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
