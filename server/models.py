from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

db = SQLAlchemy()


class User(db.Model):
    """User model."""
    __tablename__ = "users"
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(255))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    seller_phone = db.Column(db.String(30), unique=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    crops = db.relationship("Crop", back_populates="user", cascade="all, delete-orphan")
    marketplace_listings = db.relationship("MarketplaceListing", back_populates="seller", cascade="all, delete-orphan")
    marketplace_orders_as_buyer = db.relationship(
        "MarketplaceOrder",
        back_populates="buyer",
        foreign_keys="MarketplaceOrder.buyer_id",
        cascade="all, delete-orphan",
    )
    marketplace_orders_as_seller = db.relationship(
        "MarketplaceOrder",
        back_populates="seller",
        foreign_keys="MarketplaceOrder.seller_id",
        cascade="all, delete-orphan",
    )
    
    def set_password(self, password: str):
        """Hash and set password."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        """Verify password."""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "name": self.name,
            "location": self.location,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "seller_phone": self.seller_phone,
        }


class Crop(db.Model):
    """Crop model."""
    __tablename__ = "crops"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    crop_id = db.Column(db.String(100), nullable=False)  # Same as frontend crop_id
    selected_crop = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.String(20))
    has_schedule = db.Column(db.Boolean, default=False)
    soil_complete = db.Column(db.Boolean, default=False)
    soil_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship("User", back_populates="crops")
    tasks = db.relationship("Task", back_populates="crop", cascade="all, delete-orphan")
    health_checks = db.relationship(
        "CropHealthCheck",
        back_populates="crop",
        cascade="all, delete-orphan",
        order_by="CropHealthCheck.checked_at.desc()",
    )
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "crop_id": self.crop_id,
            "selected_crop": self.selected_crop,
            "start_date": self.start_date,
            "has_schedule": self.has_schedule,
            "soil_complete": self.soil_complete,
            "soil_data": self.soil_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CropHealthCheck(db.Model):
    """Persisted crop health snapshots for trend tracking."""
    __tablename__ = "crop_health_checks"

    id = db.Column(db.Integer, primary_key=True)
    crop_id = db.Column(db.Integer, db.ForeignKey("crops.id"), nullable=False, index=True)
    score = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, index=True)
    factors = db.Column(db.JSON)
    suggestions = db.Column(db.JSON)
    context_hash = db.Column(db.String(255), nullable=False, index=True)
    checked_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    crop = db.relationship("Crop", back_populates="health_checks")

    def to_dict(self):
        return {
            "id": self.id,
            "crop_id": self.crop_id,
            "score": self.score,
            "status": self.status,
            "factors": self.factors or {},
            "suggestions": self.suggestions or [],
            "context_hash": self.context_hash,
            "checked_at": self.checked_at.isoformat() if self.checked_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Task(db.Model):
    """Task model for crop planner."""
    __tablename__ = "tasks"
    
    id = db.Column(db.Integer, primary_key=True)
    crop_id = db.Column(db.Integer, db.ForeignKey("crops.id"), nullable=False, index=True)
    task_key = db.Column(db.String(255), nullable=False)
    day_start = db.Column(db.Integer, nullable=False)
    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    crop = db.relationship("Crop", back_populates="tasks")
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "task_key": self.task_key,
            "day_start": self.day_start,
            "completed": self.completed,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class MarketplaceListing(db.Model):
    """Farmer marketplace listing model."""
    __tablename__ = "marketplace_listings"

    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False, index=True)
    kind = db.Column(db.String(20), nullable=False, index=True)  # crop | seed
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(50), nullable=False)
    price_per_unit = db.Column(db.Float, nullable=False)
    location = db.Column(db.String(255), index=True)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(1000))  # Single image URL
    status = db.Column(db.String(20), default="active", index=True)  # active | reserved | sold
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seller = db.relationship("User", back_populates="marketplace_listings")
    orders = db.relationship("MarketplaceOrder", back_populates="listing", cascade="all, delete-orphan")

    def to_dict(self):
        """Convert listing to dictionary."""
        return {
            "id": self.id,
            "seller_id": self.seller_id,
            "seller_name": self.seller.name if self.seller else None,
            "title": self.title,
            "kind": self.kind,
            "quantity": self.quantity,
            "unit": self.unit,
            "price_per_unit": self.price_per_unit,
            "location": self.location,
            "description": self.description,
            "image_url": self.image_url,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MarketplaceOrder(db.Model):
    """Order created when a buyer purchases a marketplace listing."""
    __tablename__ = "marketplace_orders"

    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey("marketplace_listings.id"), nullable=False, index=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    seller_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(50), nullable=False)
    price_per_unit = db.Column(db.Float, nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    settlement_mode = db.Column(db.String(30), default="cash_offline")
    status = db.Column(db.String(30), default="pending_confirmation", index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    listing = db.relationship("MarketplaceListing", back_populates="orders")
    buyer = db.relationship("User", back_populates="marketplace_orders_as_buyer", foreign_keys=[buyer_id])
    seller = db.relationship("User", back_populates="marketplace_orders_as_seller", foreign_keys=[seller_id])

    def to_dict(self):
        return {
            "id": self.id,
            "listing_id": self.listing_id,
            "listing_title": self.listing.title if self.listing else None,
            "buyer_id": self.buyer_id,
            "buyer_name": self.buyer.name if self.buyer else None,
            "seller_id": self.seller_id,
            "seller_name": self.seller.name if self.seller else None,
            "quantity": self.quantity,
            "unit": self.unit,
            "price_per_unit": self.price_per_unit,
            "total_price": self.total_price,
            "settlement_mode": self.settlement_mode,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }









