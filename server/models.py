from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """User model."""
    __tablename__ = "users"
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(255))
    farm_size = db.Column(db.String(100))
    preferred_crop = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    crops = db.relationship("Crop", back_populates="user", cascade="all, delete-orphan")
    marketplace_listings = db.relationship("MarketplaceListing", back_populates="seller", cascade="all, delete-orphan")
    sent_marketplace_inquiries = db.relationship(
        "MarketplaceInquiry",
        foreign_keys="MarketplaceInquiry.buyer_id",
        back_populates="buyer",
        cascade="all, delete-orphan",
    )
    received_marketplace_inquiries = db.relationship(
        "MarketplaceInquiry",
        foreign_keys="MarketplaceInquiry.seller_id",
        back_populates="seller",
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
            "name": self.name,
            "location": self.location,
            "farm_size": self.farm_size,
            "preferred_crop": self.preferred_crop,
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
    status = db.Column(db.String(20), default="pending", index=True)  # pending | active | sold | blocked | rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seller = db.relationship("User", back_populates="marketplace_listings")
    inquiries = db.relationship("MarketplaceInquiry", back_populates="listing", cascade="all, delete-orphan")
    images = db.relationship(
        "MarketplaceListingImage",
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="MarketplaceListingImage.id.asc()",
    )
    moderation_actions = db.relationship(
        "MarketplaceModerationAction",
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="MarketplaceModerationAction.id.desc()",
    )

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
            "status": self.status,
            "images": [image.to_dict() for image in self.images],
            "primary_image_url": self.images[0].image_url if self.images else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MarketplaceListingImage(db.Model):
    """Image references for a marketplace listing."""
    __tablename__ = "marketplace_listing_images"

    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey("marketplace_listings.id"), nullable=False, index=True)
    image_url = db.Column(db.String(1000), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    listing = db.relationship("MarketplaceListing", back_populates="images")

    def to_dict(self):
        """Convert listing image to dictionary."""
        return {
            "id": self.id,
            "listing_id": self.listing_id,
            "image_url": self.image_url,
        }


class MarketplaceInquiry(db.Model):
    """Buyer inquiry on a marketplace listing."""
    __tablename__ = "marketplace_inquiries"

    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey("marketplace_listings.id"), nullable=False, index=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    seller_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="open", index=True)  # open | responded | closed
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    listing = db.relationship("MarketplaceListing", back_populates="inquiries")
    buyer = db.relationship("User", foreign_keys=[buyer_id], back_populates="sent_marketplace_inquiries")
    seller = db.relationship("User", foreign_keys=[seller_id], back_populates="received_marketplace_inquiries")

    def to_dict(self):
        """Convert inquiry to dictionary."""
        return {
            "id": self.id,
            "listing_id": self.listing_id,
            "listing_title": self.listing.title if self.listing else None,
            "buyer_id": self.buyer_id,
            "buyer_name": self.buyer.name if self.buyer else None,
            "seller_id": self.seller_id,
            "seller_name": self.seller.name if self.seller else None,
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class MarketplaceModerationAction(db.Model):
    """Admin moderation actions captured for marketplace listings."""
    __tablename__ = "marketplace_moderation_actions"

    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey("marketplace_listings.id"), nullable=False, index=True)
    admin_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    action = db.Column(db.String(20), nullable=False, index=True)  # approve | block | reject
    reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    listing = db.relationship("MarketplaceListing", back_populates="moderation_actions")

    def to_dict(self):
        """Convert moderation action to dictionary."""
        return {
            "id": self.id,
            "listing_id": self.listing_id,
            "admin_user_id": self.admin_user_id,
            "action": self.action,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
