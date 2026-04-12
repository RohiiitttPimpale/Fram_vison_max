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
