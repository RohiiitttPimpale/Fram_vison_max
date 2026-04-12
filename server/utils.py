from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity


def get_current_user_id() -> int:
    """Read JWT identity and normalize it to an integer user id."""
    return int(get_jwt_identity())


def token_required(f):
    """Decorator to require JWT token for route access."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_current_user_id()
            return f(user_id, *args, **kwargs)
        except Exception as e:
            return jsonify({"error": "Unauthorized", "message": str(e)}), 401
    
    return decorated_function


def error_response(message: str, status_code: int = 400):
    """Standardized error response."""
    return jsonify({"error": message}), status_code


def success_response(data=None, message: str = "Success", status_code: int = 200):
    """Standardized success response."""
    response = {"message": message}
    if data is not None:
        response["data"] = data
    return jsonify(response), status_code
