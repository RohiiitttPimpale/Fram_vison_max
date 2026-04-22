"""Crop routes."""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Crop, CropHealthCheck, User, db
from utils import error_response, success_response, get_current_user_id

crops_bp = Blueprint("crops", __name__, url_prefix="/api/crops")

ALLOWED_HEALTH_STATUSES = {"good", "moderate", "risk"}


def _get_user_crop_or_404(crop_id: int, user_id: int):
    crop = Crop.query.filter_by(id=crop_id, user_id=user_id).first()
    if not crop:
        return None, error_response("Crop not found.", 404)
    return crop, None


def _validate_health_payload(data):
    if not isinstance(data, dict):
        return None, error_response("Invalid health payload.", 400)

    score = data.get("score")
    status = data.get("status")
    context_hash = data.get("context_hash")

    if not isinstance(score, int) or score < 0 or score > 100:
        return None, error_response("Health score must be an integer between 0 and 100.", 400)

    if status not in ALLOWED_HEALTH_STATUSES:
        return None, error_response("Health status must be one of: good, moderate, risk.", 400)

    if not isinstance(context_hash, str) or not context_hash.strip():
        return None, error_response("context_hash is required.", 400)

    factors = data.get("factors")
    if factors is not None and not isinstance(factors, dict):
        return None, error_response("factors must be an object.", 400)

    suggestions = data.get("suggestions")
    if suggestions is not None and not isinstance(suggestions, list):
        return None, error_response("suggestions must be an array.", 400)

    checked_at = None
    checked_at_raw = data.get("checked_at")
    if checked_at_raw:
        try:
            checked_at = datetime.fromisoformat(str(checked_at_raw).replace("Z", "+00:00"))
        except ValueError:
            return None, error_response("checked_at must be a valid ISO date-time string.", 400)

    return {
        "score": score,
        "status": status,
        "context_hash": context_hash.strip(),
        "factors": factors or {},
        "suggestions": suggestions or [],
        "checked_at": checked_at,
    }, None


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


@crops_bp.route("/<int:crop_id>/health", methods=["GET"])
@jwt_required()
def get_crop_health(crop_id: int):
    """Get latest health snapshot and recent history for a crop."""
    user_id = get_current_user_id()
    crop, err = _get_user_crop_or_404(crop_id, user_id)
    if err:
        return err

    limit_raw = request.args.get("limit", "10")
    try:
        limit = max(1, min(int(limit_raw), 100))
    except ValueError:
        return error_response("limit must be a number between 1 and 100.", 400)

    snapshots = (
        CropHealthCheck.query.filter_by(crop_id=crop.id)
        .order_by(CropHealthCheck.checked_at.desc(), CropHealthCheck.id.desc())
        .limit(limit)
        .all()
    )

    latest = snapshots[0].to_dict() if len(snapshots) > 0 else None
    previous = snapshots[1].to_dict() if len(snapshots) > 1 else None

    return success_response(
        {
            "latest": latest,
            "previous": previous,
            "history": [item.to_dict() for item in snapshots],
        }
    )


@crops_bp.route("/<int:crop_id>/health", methods=["POST"])
@jwt_required()
def create_crop_health(crop_id: int):
    """Create a health snapshot for a crop if context changed."""
    user_id = get_current_user_id()
    crop, err = _get_user_crop_or_404(crop_id, user_id)
    if err:
        return err

    payload, payload_err = _validate_health_payload(request.get_json())
    if payload_err:
        return payload_err

    latest = (
        CropHealthCheck.query.filter_by(crop_id=crop.id)
        .order_by(CropHealthCheck.checked_at.desc(), CropHealthCheck.id.desc())
        .first()
    )

    if latest and latest.context_hash == payload["context_hash"]:
        return success_response(latest.to_dict(), "Health snapshot unchanged.")

    snapshot = CropHealthCheck(
        crop_id=crop.id,
        score=payload["score"],
        status=payload["status"],
        factors=payload["factors"],
        suggestions=payload["suggestions"],
        context_hash=payload["context_hash"],
        checked_at=payload["checked_at"] or datetime.utcnow(),
    )

    db.session.add(snapshot)
    db.session.commit()
    return success_response(snapshot.to_dict(), "Health snapshot saved.", 201)


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
