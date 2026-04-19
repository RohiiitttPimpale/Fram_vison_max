"""Marketplace routes for farmer-to-farmer listings and inquiries."""
import os
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, request, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from models import (
    MarketplaceInquiry,
    MarketplaceListing,
    MarketplaceListingImage,
    MarketplaceModerationAction,
    User,
    db,
)
from utils import error_response, success_response, get_current_user_id

marketplace_bp = Blueprint("marketplace", __name__, url_prefix="/api/marketplace")

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024
UPLOAD_DIR = Path("instance") / "marketplace_uploads"


def _get_admin_emails() -> set[str]:
    raw = os.environ.get("MARKETPLACE_ADMIN_EMAILS", "")
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def _is_marketplace_admin(user_id: int) -> bool:
    admin_emails = _get_admin_emails()
    if not admin_emails:
        return False

    user = User.query.get(user_id)
    if not user or not user.email:
        return False

    return user.email.strip().lower() in admin_emails


def _parse_image_urls(payload: dict) -> tuple[list[str], str | None]:
    image_urls = payload.get("image_urls") or []
    if not isinstance(image_urls, list):
        return [], "image_urls must be an array of URLs"

    cleaned: list[str] = []
    for raw_url in image_urls:
        url = str(raw_url or "").strip()
        if not url:
            continue
        if not (url.startswith("http://") or url.startswith("https://") or url.startswith("/")):
            return [], "Each image URL must start with http://, https://, or /"
        cleaned.append(url)

    unique = list(dict.fromkeys(cleaned))
    if len(unique) > 5:
        return [], "You can attach up to 5 images per listing"

    return unique, None


def _ensure_upload_dir() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@marketplace_bp.route("/listings", methods=["GET"])
def get_marketplace_listings():
    """Fetch public listings with optional filters and pagination."""
    page = max(int(request.args.get("page", 1)), 1)
    limit = min(max(int(request.args.get("limit", 10)), 1), 50)
    kind = (request.args.get("kind") or "").strip().lower()
    location = (request.args.get("location") or "").strip()
    search = (request.args.get("search") or "").strip()

    query = MarketplaceListing.query.filter_by(status="active")

    if kind in {"crop", "seed"}:
        query = query.filter(MarketplaceListing.kind == kind)

    if location:
        query = query.filter(MarketplaceListing.location.ilike(f"%{location}%"))

    if search:
        query = query.filter(MarketplaceListing.title.ilike(f"%{search}%"))

    total = query.count()
    items = (
        query.order_by(MarketplaceListing.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return success_response(
        {
            "items": [item.to_dict() for item in items],
            "page": page,
            "limit": limit,
            "total": total,
            "has_more": page * limit < total,
        }
    )


@marketplace_bp.route("/uploads", methods=["POST"])
@jwt_required()
def upload_marketplace_image():
    """Upload listing image and return a server-hosted URL."""
    if "image" not in request.files:
        return error_response("image file is required", 400)

    image = request.files["image"]
    filename = secure_filename(image.filename or "")
    if not filename:
        return error_response("Invalid file name", 400)

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return error_response("Only jpg, jpeg, png, and webp images are allowed", 400)

    image.seek(0, os.SEEK_END)
    image_size = image.tell()
    image.seek(0)
    if image_size > MAX_IMAGE_BYTES:
        return error_response("Image size must be 5MB or less", 400)

    _ensure_upload_dir()
    stored_name = f"{uuid4().hex}{ext}"
    image.save(UPLOAD_DIR / stored_name)

    image_url = f"/api/marketplace/uploads/{stored_name}"
    return success_response({"image_url": image_url}, "Image uploaded.", 201)


@marketplace_bp.route("/uploads/<path:filename>", methods=["GET"])
def get_marketplace_image(filename: str):
    """Serve marketplace listing image by filename."""
    _ensure_upload_dir()
    safe_name = secure_filename(filename)
    return send_from_directory(UPLOAD_DIR, safe_name)


@marketplace_bp.route("/listings", methods=["POST"])
@jwt_required()
def create_marketplace_listing():
    """Create a listing for the authenticated user."""
    user_id = get_current_user_id()
    payload = request.get_json() or {}

    required = ["title", "kind", "quantity", "unit", "price_per_unit"]
    missing = [field for field in required if payload.get(field) in (None, "")]
    if missing:
        return error_response(f"Missing required fields: {', '.join(missing)}", 400)

    accepted_policy = bool(payload.get("accepted_policy"))
    if not accepted_policy:
        return error_response("You must accept marketplace policy before publishing.", 400)

    kind = str(payload.get("kind", "")).strip().lower()
    if kind not in {"crop", "seed"}:
        return error_response("kind must be either 'crop' or 'seed'", 400)

    try:
        quantity = float(payload.get("quantity"))
        price_per_unit = float(payload.get("price_per_unit"))
    except (TypeError, ValueError):
        return error_response("quantity and price_per_unit must be numeric values", 400)

    if quantity <= 0 or price_per_unit <= 0:
        return error_response("quantity and price_per_unit must be greater than zero", 400)

    image_urls, image_error = _parse_image_urls(payload)
    if image_error:
        return error_response(image_error, 400)

    listing = MarketplaceListing(
        seller_id=user_id,
        title=str(payload.get("title", "")).strip(),
        kind=kind,
        quantity=quantity,
        unit=str(payload.get("unit", "")).strip(),
        price_per_unit=price_per_unit,
        location=str(payload.get("location", "")).strip() or None,
        description=str(payload.get("description", "")).strip() or None,
        status="pending",
    )

    db.session.add(listing)
    db.session.flush()

    for image_url in image_urls:
        db.session.add(MarketplaceListingImage(listing_id=listing.id, image_url=image_url))

    db.session.commit()

    return success_response(
        listing.to_dict(),
        "Listing created successfully and submitted for moderation.",
        201,
    )


@marketplace_bp.route("/listings/mine", methods=["GET"])
@jwt_required()
def get_my_marketplace_listings():
    """Fetch authenticated seller's own listings."""
    user_id = get_current_user_id()

    items = (
        MarketplaceListing.query.filter_by(seller_id=user_id)
        .order_by(MarketplaceListing.created_at.desc())
        .all()
    )

    return success_response({"items": [item.to_dict() for item in items]})


@marketplace_bp.route("/listings/<int:listing_id>", methods=["PUT"])
@jwt_required()
def update_marketplace_listing(listing_id: int):
    """Update a seller-owned listing."""
    user_id = get_current_user_id()
    payload = request.get_json() or {}

    listing = MarketplaceListing.query.get(listing_id)
    if not listing:
        return error_response("Listing not found.", 404)

    if listing.seller_id != user_id:
        return error_response("You can only update your own listings.", 403)

    if listing.status == "sold":
        return error_response("Sold listings cannot be edited.", 400)

    accepted_policy = bool(payload.get("accepted_policy"))
    if not accepted_policy:
        return error_response("You must accept marketplace policy before saving changes.", 400)

    if "title" in payload:
        title = str(payload.get("title", "")).strip()
        if not title:
            return error_response("title cannot be empty", 400)
        listing.title = title

    if "kind" in payload:
        kind = str(payload.get("kind", "")).strip().lower()
        if kind not in {"crop", "seed"}:
            return error_response("kind must be either 'crop' or 'seed'", 400)
        listing.kind = kind

    if "quantity" in payload:
        try:
            quantity = float(payload.get("quantity"))
        except (TypeError, ValueError):
            return error_response("quantity must be numeric", 400)
        if quantity <= 0:
            return error_response("quantity must be greater than zero", 400)
        listing.quantity = quantity

    if "price_per_unit" in payload:
        try:
            price_per_unit = float(payload.get("price_per_unit"))
        except (TypeError, ValueError):
            return error_response("price_per_unit must be numeric", 400)
        if price_per_unit <= 0:
            return error_response("price_per_unit must be greater than zero", 400)
        listing.price_per_unit = price_per_unit

    if "unit" in payload:
        unit = str(payload.get("unit", "")).strip()
        if not unit:
            return error_response("unit cannot be empty", 400)
        listing.unit = unit

    if "location" in payload:
        listing.location = str(payload.get("location", "")).strip() or None

    if "description" in payload:
        listing.description = str(payload.get("description", "")).strip() or None

    if "image_urls" in payload:
        image_urls, image_error = _parse_image_urls(payload)
        if image_error:
            return error_response(image_error, 400)
        MarketplaceListingImage.query.filter_by(listing_id=listing.id).delete()
        for image_url in image_urls:
            db.session.add(MarketplaceListingImage(listing_id=listing.id, image_url=image_url))

    # Edited listings are re-reviewed before becoming public.
    listing.status = "pending"

    db.session.commit()
    return success_response(listing.to_dict(), "Listing updated and submitted for moderation.")


@marketplace_bp.route("/listings/<int:listing_id>", methods=["DELETE"])
@jwt_required()
def delete_marketplace_listing(listing_id: int):
    """Delete a seller-owned listing."""
    user_id = get_current_user_id()

    listing = MarketplaceListing.query.get(listing_id)
    if not listing:
        return error_response("Listing not found.", 404)

    if listing.seller_id != user_id:
        return error_response("You can only delete your own listings.", 403)

    db.session.delete(listing)
    db.session.commit()

    return success_response(None, "Listing deleted successfully.")


@marketplace_bp.route("/listings/<int:listing_id>/mark-sold", methods=["POST"])
@jwt_required()
def mark_listing_sold(listing_id: int):
    """Mark a seller-owned listing as sold."""
    user_id = get_current_user_id()

    listing = MarketplaceListing.query.get(listing_id)
    if not listing:
        return error_response("Listing not found.", 404)

    if listing.seller_id != user_id:
        return error_response("You can only update your own listings.", 403)

    if listing.status != "active":
        return error_response("Only active listings can be marked sold.", 400)

    listing.status = "sold"
    db.session.commit()

    return success_response(listing.to_dict(), "Listing marked as sold.")


@marketplace_bp.route("/listings/<int:listing_id>/inquiries", methods=["POST"])
@jwt_required()
def create_listing_inquiry(listing_id: int):
    """Create an inquiry against an active listing."""
    buyer_id = get_current_user_id()
    payload = request.get_json() or {}
    message = str(payload.get("message", "")).strip()

    if not message:
        return error_response("message is required", 400)

    listing = MarketplaceListing.query.get(listing_id)
    if not listing:
        return error_response("Listing not found.", 404)

    if listing.status != "active":
        return error_response("Listing is not active.", 400)

    if listing.seller_id == buyer_id:
        return error_response("You cannot send an inquiry to your own listing.", 400)

    inquiry = MarketplaceInquiry(
        listing_id=listing.id,
        buyer_id=buyer_id,
        seller_id=listing.seller_id,
        message=message,
        status="open",
    )

    db.session.add(inquiry)
    db.session.commit()

    return success_response(inquiry.to_dict(), "Inquiry sent successfully.", 201)


@marketplace_bp.route("/inquiries/mine", methods=["GET"])
@jwt_required()
def get_my_marketplace_inquiries():
    """Fetch inquiries for current user as buyer and seller."""
    user_id = get_current_user_id()

    as_buyer = (
        MarketplaceInquiry.query.filter_by(buyer_id=user_id)
        .order_by(MarketplaceInquiry.created_at.desc())
        .all()
    )
    as_seller = (
        MarketplaceInquiry.query.filter_by(seller_id=user_id)
        .order_by(MarketplaceInquiry.created_at.desc())
        .all()
    )

    return success_response(
        {
            "as_buyer": [item.to_dict() for item in as_buyer],
            "as_seller": [item.to_dict() for item in as_seller],
        }
    )


@marketplace_bp.route("/inquiries/<int:inquiry_id>/status", methods=["PATCH"])
@jwt_required()
def update_inquiry_status(inquiry_id: int):
    """Update inquiry status based on role-specific transitions."""
    user_id = get_current_user_id()
    payload = request.get_json() or {}
    status = str(payload.get("status", "")).strip().lower()

    if status not in {"open", "responded", "closed"}:
        return error_response("status must be one of: open, responded, closed", 400)

    inquiry = MarketplaceInquiry.query.get(inquiry_id)
    if not inquiry:
        return error_response("Inquiry not found.", 404)

    is_seller = inquiry.seller_id == user_id
    is_buyer = inquiry.buyer_id == user_id
    if not (is_seller or is_buyer):
        return error_response("You do not have permission to update this inquiry.", 403)

    if is_seller and status not in {"responded", "closed"}:
        return error_response("Sellers can set inquiry status to responded or closed only.", 400)

    if is_buyer and status != "closed":
        return error_response("Buyers can only close inquiries.", 400)

    inquiry.status = status
    db.session.commit()

    return success_response(inquiry.to_dict(), "Inquiry status updated.")


@marketplace_bp.route("/admin/listings", methods=["GET"])
@jwt_required()
def get_admin_marketplace_listings():
    """Fetch listings for admins with optional status filtering."""
    user_id = get_current_user_id()
    if not _is_marketplace_admin(user_id):
        return error_response("Admin access required.", 403)

    status = str(request.args.get("status", "")).strip().lower()
    query = MarketplaceListing.query
    if status:
        query = query.filter(MarketplaceListing.status == status)

    items = query.order_by(MarketplaceListing.created_at.desc()).limit(100).all()
    return success_response({"items": [item.to_dict() for item in items]})



@marketplace_bp.route("/admin/listings/<int:listing_id>/moderate", methods=["PATCH"])
@jwt_required()
def moderate_marketplace_listing(listing_id: int):
    """Moderate listing visibility and capture reason."""
    user_id = get_current_user_id()
    if not _is_marketplace_admin(user_id):
        return error_response("Admin access required.", 403)

    payload = request.get_json() or {}
    action = str(payload.get("action", "")).strip().lower()
    reason = str(payload.get("reason", "")).strip() or None

    status_map = {
        "approve": "active",
        "block": "blocked",
        "reject": "rejected",
    }

    if action not in status_map:
        return error_response("action must be one of: approve, block, reject", 400)

    listing = MarketplaceListing.query.get(listing_id)
    if not listing:
        return error_response("Listing not found.", 404)

    listing.status = status_map[action]
    db.session.add(
        MarketplaceModerationAction(
            listing_id=listing.id,
            admin_user_id=user_id,
            action=action,
            reason=reason,
        )
    )
    db.session.commit()

    return success_response(listing.to_dict(), "Listing moderation updated.")
