"""Crop routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Crop, User, db
from utils import error_response, success_response, get_current_user_id

crops_bp = Blueprint("crops", __name__, url_prefix="/api/crops")


@crops_bp.route("/", methods=["GET"])
@jwt_required()
def get_crops():
    """Get all crops for the current user."""
    user_id = get_current_user_id()
    crops = Crop.query.filter_by(user_id=user_id).all()
    return success_response([crop.to_dict() for crop in crops])


@crops_bp.route("/", methods=["POST"])
@jwt_required()
def create_crop():
    """Create a new crop."""
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    
    if not user:
        return error_response("User not found.", 404)
    
    data = request.get_json()
    crop = Crop(
        user_id=user_id,
        crop_id=data.get("crop_id"),
        selected_crop=data.get("selected_crop", ""),
        start_date=data.get("start_date"),
        has_schedule=data.get("has_schedule", False),
        soil_complete=data.get("soil_complete", False),
        soil_data=data.get("soil_data"),
    )
    
    db.session.add(crop)
    db.session.commit()
    return success_response(crop.to_dict(), "Crop created successfully.", 201)


@crops_bp.route("/<int:crop_id>", methods=["GET"])
@jwt_required()
def get_crop(crop_id: int):
    """Get a specific crop."""
    user_id = get_current_user_id()
    crop = Crop.query.filter_by(id=crop_id, user_id=user_id).first()
    
    if not crop:
        return error_response("Crop not found.", 404)
    
    return success_response(crop.to_dict())


@crops_bp.route("/<int:crop_id>", methods=["PUT"])
@jwt_required()
def update_crop(crop_id: int):
    """Update a crop."""
    user_id = get_current_user_id()
    crop = Crop.query.filter_by(id=crop_id, user_id=user_id).first()
    
    if not crop:
        return error_response("Crop not found.", 404)
    
    data = request.get_json()
    crop.selected_crop = data.get("selected_crop", crop.selected_crop)
    crop.start_date = data.get("start_date", crop.start_date)
    crop.has_schedule = data.get("has_schedule", crop.has_schedule)
    crop.soil_complete = data.get("soil_complete", crop.soil_complete)
    crop.soil_data = data.get("soil_data", crop.soil_data)
    
    db.session.commit()
    return success_response(crop.to_dict(), "Crop updated successfully.")


@crops_bp.route("/<int:crop_id>", methods=["DELETE"])
@jwt_required()
def delete_crop(crop_id: int):
    """Delete a crop."""
    user_id = get_current_user_id()
    crop = Crop.query.filter_by(id=crop_id, user_id=user_id).first()
    
    if not crop:
        return error_response("Crop not found.", 404)
    
    db.session.delete(crop)
    db.session.commit()
    return success_response(None, "Crop deleted successfully.")
