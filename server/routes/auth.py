"""Authentication routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import User, db
from utils import error_response, success_response, get_current_user_id

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Register a new user."""
    data = request.get_json()
    
    # Validate input
    if not data or not data.get("email") or not data.get("password"):
        return error_response("Email and password are required.")
    
    if User.query.filter_by(email=data["email"]).first():
        return error_response("User already exists.", 409)
    
    # Create user
    user = User(
        email=data["email"],
        name=data.get("name", ""),
        location=data.get("location"),
        farm_size=data.get("farm_size"),
        preferred_crop=data.get("preferred_crop"),
    )
    user.set_password(data["password"])
    
    db.session.add(user)
    db.session.commit()
    
    # JWT subject must be a string for newer PyJWT versions.
    access_token = create_access_token(identity=str(user.id))
    return success_response(
        {
            "user": user.to_dict(),
            "access_token": access_token,
        },
        "User created successfully.",
        201,
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login user."""
    data = request.get_json()
    
    if not data or not data.get("email") or not data.get("password"):
        return error_response("Email and password are required.")
    
    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return error_response("Invalid email or password.", 401)
    
    # JWT subject must be a string for newer PyJWT versions.
    access_token = create_access_token(identity=str(user.id))
    return success_response(
        {
            "user": user.to_dict(),
            "access_token": access_token,
        },
        "Logged in successfully.",
    )


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current user profile."""
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    
    if not user:
        return error_response("User not found.", 404)
    
    return success_response(user.to_dict())


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """Update user profile."""
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    
    if not user:
        return error_response("User not found.", 404)
    
    data = request.get_json()
    user.name = data.get("name", user.name)
    user.location = data.get("location", user.location)
    user.farm_size = data.get("farm_size", user.farm_size)
    user.preferred_crop = data.get("preferred_crop", user.preferred_crop)
    
    db.session.commit()
    return success_response(user.to_dict(), "Profile updated successfully.")
