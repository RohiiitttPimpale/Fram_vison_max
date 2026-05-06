"""Authentication routes."""
import os

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import User, db
from utils import error_response, success_response, get_current_user_id

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _admin_emails() -> set[str]:
    return {
        item.strip().lower()
        for item in os.environ.get("VITE_MARKETPLACE_ADMIN_EMAILS", "").split(",")
        if item.strip()
    }


def _normalize_phone(phone: str | None) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit())


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Register a new user."""
    data = request.get_json()
    
    # Validate input
    if not data or not data.get("email") or not data.get("password") or not data.get("username") or not data.get("phone"):
        return error_response("Email, username, password, and phone are required.")
    
    if User.query.filter_by(email=data["email"]).first():
        return error_response("Email already exists.", 409)
    
    if User.query.filter_by(username=data["username"]).first():
        return error_response("Username already exists.", 409)
    
    # Validate phone format (7-15 digits)
    phone = (data.get("phone") or "").strip()
    phone_digits = _normalize_phone(phone)
    if not phone_digits.isdigit() or len(phone_digits) < 7 or len(phone_digits) > 15:
        return error_response("Phone must be 7-15 digits.")

    if User.query.filter_by(seller_phone=phone_digits).first():
        return error_response("Phone already exists.", 409)
    
    # Create user
    user = User(
        email=data["email"],
        username=data["username"],
        name=data.get("name", ""),
        location=data.get("location"),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        seller_phone=phone_digits,
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
    """Login user with email or phone."""
    data = request.get_json()
    
    if not data or not data.get("identifier") or not data.get("password"):
        return error_response("Identifier (email or phone) and password are required.")
    
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password")
    
    # Try to find user by email first, then by normalized phone
    user = User.query.filter_by(email=identifier).first()
    if not user:
        user = User.query.filter_by(seller_phone=_normalize_phone(identifier)).first()
    
    if not user or not user.check_password(password):
        return error_response("Invalid identifier or password.", 401)
    
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
    user.latitude = data.get("latitude", user.latitude)
    user.longitude = data.get("longitude", user.longitude)
    if "username" in data:
        username = (data.get("username") or "").strip()
        if not username:
            return error_response("Username is required.", 400)
        existing_user = User.query.filter(User.username == username, User.id != user.id).first()
        if existing_user:
            return error_response("Username already exists.", 409)
        user.username = username
    # Allow updating phone / seller_phone from profile
    if "seller_phone" in data:
        phone_val = (data.get("seller_phone") or "").strip()
        normalized_phone = _normalize_phone(phone_val)
        if normalized_phone:
            existing_phone = User.query.filter(User.seller_phone == normalized_phone, User.id != user.id).first()
            if existing_phone:
                return error_response("Phone already exists.", 409)
            if len(normalized_phone) < 7 or len(normalized_phone) > 15:
                return error_response("Phone must be 7-15 digits.", 400)
            user.seller_phone = normalized_phone
        else:
            user.seller_phone = None
    elif "phone" in data:
        phone_val = (data.get("phone") or "").strip()
        normalized_phone = _normalize_phone(phone_val)
        if normalized_phone:
            existing_phone = User.query.filter(User.seller_phone == normalized_phone, User.id != user.id).first()
            if existing_phone:
                return error_response("Phone already exists.", 409)
            if len(normalized_phone) < 7 or len(normalized_phone) > 15:
                return error_response("Phone must be 7-15 digits.", 400)
            user.seller_phone = normalized_phone
        else:
            user.seller_phone = None
    
    db.session.commit()
    return success_response(user.to_dict(), "Profile updated successfully.")



