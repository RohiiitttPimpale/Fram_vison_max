"""Flask application factory."""
import os
import re
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from sqlalchemy import inspect, text

from config import config
from models import db
from routes.auth import auth_bp
from routes.crops import crops_bp
from routes.prediction import prediction_bp
from routes.tasks import tasks_bp
from routes.disease import disease_bp
from routes.content import content_bp
from routes.marketplace import marketplace_bp

# Load environment variables
load_dotenv()


def get_cors_origins():
    """Build CORS origins from env, supporting CSV and wildcard hosts."""
    raw_origins = os.environ.get("FRONTEND_URLS") or os.environ.get("FRONTEND_URL", "http://localhost:4174")
    raw_origins = raw_origins.strip()

    if raw_origins == "*":
        return "*"

    origins = []
    for item in raw_origins.split(","):
        origin = item.strip().rstrip("/")
        if not origin:
            continue

        if "*" in origin:
            pattern = "^" + re.escape(origin).replace("\\*", ".*") + "$"
            origins.append(re.compile(pattern))
        else:
            origins.append(origin)

    if not origins:
        return "http://localhost:4174"

    return origins


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
    CORS(app, resources={r"/api/*": {"origins": get_cors_origins()}})
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(crops_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(disease_bp)
    app.register_blueprint(content_bp)
    app.register_blueprint(marketplace_bp)
    
    # Create tables
    with app.app_context():
        db.create_all()

        inspector = inspect(db.engine)
        if inspector.has_table("marketplace_listings"):
            columns = {column["name"] for column in inspector.get_columns("marketplace_listings")}
            if "image_url" not in columns:
                with db.engine.begin() as connection:
                    connection.execute(text("ALTER TABLE marketplace_listings ADD COLUMN image_url VARCHAR(1000)"))

        if inspector.has_table("users"):
            user_columns = {column["name"] for column in inspector.get_columns("users")}
            with db.engine.begin() as connection:
                if "username" not in user_columns:
                    connection.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(100)"))
                    # Generate unique usernames for existing users
                    result = connection.execute(text("SELECT id FROM users WHERE username IS NULL"))
                    for row in result:
                        user_id = row[0]
                        connection.execute(text(f"UPDATE users SET username = 'user_{user_id}' WHERE id = {user_id}"))
                if "seller_phone" not in user_columns:
                    connection.execute(text("ALTER TABLE users ADD COLUMN seller_phone VARCHAR(30)"))
                duplicate_phones = connection.execute(
                    text(
                        "SELECT seller_phone FROM users WHERE seller_phone IS NOT NULL AND seller_phone <> '' "
                        "GROUP BY seller_phone HAVING COUNT(*) > 1"
                    )
                ).fetchall()
                for (phone_value,) in duplicate_phones:
                    duplicate_ids = connection.execute(
                        text(
                            "SELECT id FROM users WHERE seller_phone = :phone ORDER BY id ASC"
                        ),
                        {"phone": phone_value},
                    ).fetchall()
                    for duplicate_id in duplicate_ids[1:]:
                        connection.execute(
                            text("UPDATE users SET seller_phone = NULL WHERE id = :user_id"),
                            {"user_id": duplicate_id[0]},
                        )
                connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_seller_phone ON users (seller_phone)"))
                if "latitude" not in user_columns:
                    connection.execute(text("ALTER TABLE users ADD COLUMN latitude FLOAT"))
                if "longitude" not in user_columns:
                    connection.execute(text("ALTER TABLE users ADD COLUMN longitude FLOAT"))
    
    # Health check endpoint
    @app.route("/api/health", methods=["GET"])
    def health():
        return {"status": "ok"}, 200
    
    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
