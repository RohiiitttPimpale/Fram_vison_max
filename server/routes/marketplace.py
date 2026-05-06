"""Marketplace routes for simple farmer buy/sell listings."""
import os
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, request, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from models import MarketplaceListing, MarketplaceOrder, User, db
from utils import error_response, success_response, get_current_user_id

marketplace_bp = Blueprint("marketplace", __name__, url_prefix="/api/marketplace")

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024
UPLOAD_DIR = Path("instance") / "marketplace_uploads"


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


@marketplace_bp.route("/listings", methods=["POST"])
@jwt_required()
def create_marketplace_listing():
    """Create a new listing."""
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    if not user:
        return error_response("User not found.", 404)

    data = request.get_json() or {}

    # Validate required fields
    title = (data.get("title") or "").strip()
    kind = (data.get("kind") or "").strip().lower()
    quantity = data.get("quantity")
    unit = (data.get("unit") or "").strip()
    price_per_unit = data.get("price_per_unit")
    location = (data.get("location") or "").strip()
    description = (data.get("description") or "").strip()
    image_url = (data.get("image_url") or "").strip()

    if not title:
        return error_response("Title is required.", 400)
    if kind not in {"crop", "seed"}:
        return error_response("Kind must be 'crop' or 'seed'.", 400)
    if not quantity or quantity <= 0:
        return error_response("Quantity must be positive.", 400)
    if not unit:
        return error_response("Unit is required.", 400)
    if not price_per_unit or price_per_unit <= 0:
        return error_response("Price per unit must be positive.", 400)

    listing = MarketplaceListing(
        seller_id=user_id,
        title=title,
        kind=kind,
        quantity=quantity,
        unit=unit,
        price_per_unit=price_per_unit,
        location=location,
        description=description,
        image_url=image_url,
        status="active",
    )

    db.session.add(listing)
    db.session.commit()

    return success_response(listing.to_dict(), "Listing created.", 201)


@marketplace_bp.route("/listings/mine", methods=["GET"])
@jwt_required()
def get_my_listings():
    """Get current user's listings."""
    user_id = get_current_user_id()
    listings = MarketplaceListing.query.filter_by(seller_id=user_id).order_by(
        MarketplaceListing.created_at.desc()
    ).all()
    return success_response({"items": [l.to_dict() for l in listings]})


@marketplace_bp.route("/listings/<int:listing_id>", methods=["GET"])
def get_listing(listing_id: int):
    """Get a specific listing."""
    listing = MarketplaceListing.query.get(listing_id)
    if not listing or listing.status != "active":
        return error_response("Listing not found.", 404)
    return success_response(listing.to_dict())


@marketplace_bp.route("/listings/<int:listing_id>", methods=["PUT"])
@jwt_required()
def update_marketplace_listing(listing_id: int):
    """Update a listing (seller only)."""
    user_id = get_current_user_id()
    listing = MarketplaceListing.query.get(listing_id)

    if not listing:
        return error_response("Listing not found.", 404)
    if listing.seller_id != user_id:
        return error_response("Unauthorized.", 403)

    data = request.get_json() or {}

    if "title" in data:
        listing.title = (data.get("title") or "").strip()
    if "quantity" in data:
        q = data.get("quantity")
        if q and q > 0:
            listing.quantity = q
    if "price_per_unit" in data:
        p = data.get("price_per_unit")
        if p and p > 0:
            listing.price_per_unit = p
    if "location" in data:
        listing.location = (data.get("location") or "").strip()
    if "description" in data:
        listing.description = (data.get("description") or "").strip()
    if "image_url" in data:
        listing.image_url = (data.get("image_url") or "").strip()
    if "status" in data and data.get("status") in {"active", "reserved", "sold"}:
        listing.status = data.get("status")

    db.session.commit()
    return success_response(listing.to_dict(), "Listing updated.")


@marketplace_bp.route("/listings/<int:listing_id>", methods=["DELETE"])
@jwt_required()
def delete_marketplace_listing(listing_id: int):
    """Delete a listing (seller only)."""
    user_id = get_current_user_id()
    listing = MarketplaceListing.query.get(listing_id)

    if not listing:
        return error_response("Listing not found.", 404)
    if listing.seller_id != user_id:
        return error_response("Unauthorized.", 403)

    db.session.delete(listing)
    db.session.commit()

    return success_response(None, "Listing deleted.")


@marketplace_bp.route("/listings/<int:listing_id>/buy", methods=["POST"])
@jwt_required()
def buy_marketplace_listing(listing_id: int):
    """Create an order when a buyer purchases a listing."""
    user_id = get_current_user_id()
    buyer = User.query.get(user_id)
    listing = MarketplaceListing.query.get(listing_id)

    if not listing:
        return error_response("Listing not found.", 404)
    if listing.status != "active":
        return error_response("Listing is not available.", 400)
    if listing.seller_id == user_id:
        return error_response("You cannot buy your own listing.", 400)

    # Require buyer phone number to place orders
    if not buyer or not buyer.seller_phone or not buyer.seller_phone.strip():
        return error_response("A phone number is required on your profile to place orders. Please add your phone in profile.", 403)

    existing_open = MarketplaceOrder.query.filter(
        MarketplaceOrder.listing_id == listing.id,
        MarketplaceOrder.status.in_(["pending_confirmation", "confirmed"]),
    ).first()
    if existing_open:
        return error_response("Listing is already reserved by another order.", 409)

    order = MarketplaceOrder(
        listing_id=listing.id,
        buyer_id=user_id,
        seller_id=listing.seller_id,
        quantity=listing.quantity,
        unit=listing.unit,
        price_per_unit=listing.price_per_unit,
        total_price=listing.quantity * listing.price_per_unit,
        settlement_mode="cash_offline",
        status="pending_confirmation",
    )

    listing.status = "reserved"
    db.session.add(order)
    db.session.commit()

    return success_response(order.to_dict(), "Order placed. Awaiting seller confirmation.")


@marketplace_bp.route("/orders/mine", methods=["GET"])
@jwt_required()
def get_my_orders():
    """Get marketplace orders for buyer and seller roles."""
    user_id = get_current_user_id()

    as_buyer = MarketplaceOrder.query.filter_by(buyer_id=user_id).order_by(
        MarketplaceOrder.created_at.desc()
    ).all()
    as_seller = MarketplaceOrder.query.filter_by(seller_id=user_id).order_by(
        MarketplaceOrder.created_at.desc()
    ).all()

    return success_response(
        {
            "as_buyer": [item.to_dict() for item in as_buyer],
            "as_seller": [item.to_dict() for item in as_seller],
        }
    )


@marketplace_bp.route("/orders/<int:order_id>/status", methods=["PATCH"])
@jwt_required()
def update_order_status(order_id: int):
    """Update marketplace order status by role-safe transitions."""
    user_id = get_current_user_id()
    order = MarketplaceOrder.query.get(order_id)

    if not order:
        return error_response("Order not found.", 404)

    data = request.get_json() or {}
    next_status = (data.get("status") or "").strip().lower()
    if next_status not in {"confirmed", "cancelled", "completed"}:
        return error_response("Invalid order status update.", 400)

    listing = MarketplaceListing.query.get(order.listing_id)
    if not listing:
        return error_response("Listing not found.", 404)

    if next_status in {"confirmed", "cancelled"}:
        if order.seller_id != user_id:
            return error_response("Only seller can confirm or cancel this order.", 403)
        if order.status != "pending_confirmation":
            return error_response("Order is not awaiting confirmation.", 400)

        order.status = next_status
        listing.status = "reserved" if next_status == "confirmed" else "active"

    elif next_status == "completed":
        if order.buyer_id != user_id:
            return error_response("Only buyer can complete this order.", 403)
        if order.status != "confirmed":
            return error_response("Only confirmed orders can be completed.", 400)

        order.status = "completed"
        listing.status = "sold"

    db.session.commit()
    return success_response(order.to_dict(), "Order updated.")


@marketplace_bp.route("/uploads", methods=["POST"])
@jwt_required()
def upload_marketplace_image():
    """Upload a listing image."""
    if "image" not in request.files:
        return error_response("image file is required", 400)

    image = request.files["image"]
    filename = secure_filename(image.filename or "")
    if not filename:
        return error_response("Invalid file name", 400)

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return error_response("Only jpg, jpeg, png, and webp images are allowed", 400)

    image.seek(0, 2)
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
    """Serve marketplace listing image."""
    _ensure_upload_dir()
    safe_name = secure_filename(filename)
    return send_from_directory(UPLOAD_DIR, safe_name)
