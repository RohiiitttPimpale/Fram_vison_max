"""Flask application factory."""
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from config import config
from models import db
from routes.auth import auth_bp
from routes.crops import crops_bp
from routes.prediction import prediction_bp
from routes.tasks import tasks_bp

# Load environment variables
load_dotenv()


def create_app(config_name=None):
    """Create and configure Flask application."""
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")
    
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["FRONTEND_URL"]}})
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(crops_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(tasks_bp)
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    # Health check endpoint
    @app.route("/api/health", methods=["GET"])
    def health():
        return {"status": "ok"}, 200
    
    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
