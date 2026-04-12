# Soil Smart Pilot Backend

Flask-based backend API for the Soil Smart Pilot application.

## Setup

### Prerequisites
- Python 3.8+
- PostgreSQL (optional, uses SQLite by default in development)

### Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create .env file:
```bash
cp .env.example .env
```

5. Configure environment variables in `.env` if needed (defaults work for local development)

### Running the Server

**Option 1: Run Flask directly**
```bash
python app.py
```
Server will start on `http://localhost:5000`

**Option 2: Run both frontend and backend**
From the root directory:
```bash
bash dev.sh
```
This starts:
- Backend: http://localhost:5000
- Frontend: http://localhost:4174

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile (requires token)
- `PUT /api/auth/profile` - Update user profile (requires token)

### Crops
- `GET /api/crops/` - Get all crops (requires token)
- `POST /api/crops/` - Create a new crop (requires token)
- `GET /api/crops/<crop_id>` - Get a specific crop (requires token)
- `PUT /api/crops/<crop_id>` - Update a crop (requires token)
- `DELETE /api/crops/<crop_id>` - Delete a crop (requires token)

### Tasks
- `GET /api/tasks/crop/<crop_id>` - Get tasks for a crop (requires token)
- `POST /api/tasks/` - Create a task (requires token)
- `GET /api/tasks/<task_id>` - Get a specific task (requires token)
- `PUT /api/tasks/<task_id>` - Update a task (requires token)
- `DELETE /api/tasks/<task_id>` - Delete a task (requires token)

## Database Models

### User
- id, email (unique), password_hash, name, location, farm_size, preferred_crop

### Crop
- id, user_id, crop_id, selected_crop, start_date, has_schedule, soil_complete, soil_data

### Task
- id, crop_id, task_key, day_start, completed, completed_at

## Development Notes

- Uses SQLAlchemy ORM for database operations
- JWT tokens for authentication
- CORS enabled for frontend communication
- Standardized JSON response format for all endpoints

## Next Steps

1. Migrate frontend from localStorage to backend API
2. Add database migrations support
3. Add input validation and error handling
4. Add tests
5. Deploy to production with PostgreSQL
