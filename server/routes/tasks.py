"""Task routes for crop planner."""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Task, Crop, User, db
from utils import error_response, success_response, get_current_user_id

tasks_bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")


@tasks_bp.route("/crop/<int:crop_id>", methods=["GET"])
@jwt_required()
def get_crop_tasks(crop_id: int):
    """Get all tasks for a crop."""
    user_id = get_current_user_id()
    crop = Crop.query.filter_by(id=crop_id, user_id=user_id).first()
    
    if not crop:
        return error_response("Crop not found.", 404)
    
    tasks = Task.query.filter_by(crop_id=crop_id).all()
    return success_response([task.to_dict() for task in tasks])


@tasks_bp.route("/", methods=["POST"])
@jwt_required()
def create_task():
    """Create a new task."""
    user_id = get_current_user_id()
    data = request.get_json()
    
    crop_id = data.get("crop_id")
    crop = Crop.query.filter_by(id=crop_id, user_id=user_id).first()
    
    if not crop:
        return error_response("Crop not found.", 404)
    
    task = Task(
        crop_id=crop_id,
        task_key=data.get("task_key"),
        day_start=data.get("day_start", 0),
        completed=data.get("completed", False),
    )
    
    db.session.add(task)
    db.session.commit()
    return success_response(task.to_dict(), "Task created successfully.", 201)


@tasks_bp.route("/<int:task_id>", methods=["GET"])
@jwt_required()
def get_task(task_id: int):
    """Get a specific task."""
    user_id = get_current_user_id()
    task = Task.query.get(task_id)
    
    if not task:
        return error_response("Task not found.", 404)
    
    # Verify user owns this task's crop
    crop = Crop.query.get(task.crop_id)
    if not crop or crop.user_id != user_id:
        return error_response("Unauthorized.", 403)
    
    return success_response(task.to_dict())


@tasks_bp.route("/<int:task_id>", methods=["PUT"])
@jwt_required()
def update_task(task_id: int):
    """Update a task (mark as complete)."""
    user_id = get_current_user_id()
    task = Task.query.get(task_id)
    
    if not task:
        return error_response("Task not found.", 404)
    
    # Verify user owns this task's crop
    crop = Crop.query.get(task.crop_id)
    if not crop or crop.user_id != user_id:
        return error_response("Unauthorized.", 403)
    
    data = request.get_json()
    task.completed = data.get("completed", task.completed)
    if task.completed and not task.completed_at:
        task.completed_at = datetime.utcnow()
    
    db.session.commit()
    return success_response(task.to_dict(), "Task updated successfully.")


@tasks_bp.route("/<int:task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(task_id: int):
    """Delete a task."""
    user_id = get_current_user_id()
    task = Task.query.get(task_id)
    
    if not task:
        return error_response("Task not found.", 404)
    
    # Verify user owns this task's crop
    crop = Crop.query.get(task.crop_id)
    if not crop or crop.user_id != user_id:
        return error_response("Unauthorized.", 403)
    
    db.session.delete(task)
    db.session.commit()
    return success_response(None, "Task deleted successfully.")
