# Backend Setup Complete ✅

A complete Flask backend has been scaffolded for Soil Smart Pilot.

## What's Included

```
server/
├── app.py                 # Main Flask app factory
├── config.py             # Configuration (dev/prod)
├── models.py             # SQLAlchemy models (User, Crop, Task)
├── utils.py              # Helpers (JWT decorator, response formatters)
├── requirements.txt      # Python dependencies
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── README.md             # Backend documentation
└── routes/
    ├── __init__.py
    ├── auth.py           # Auth endpoints (signup, login, profile)
    ├── crops.py          # Crop CRUD endpoints
    └── tasks.py          # Task management endpoints
```

## Quick Start

### 1. Install Backend Dependencies
```bash
cd server
pip install -r requirements.txt
```

### 2. Create Environment File
```bash
cp .env.example .env
```
(Default SQLite is used for local development—no PostgreSQL needed initially)

### 3. Run Backend Only
```bash
cd server
python app.py
```
Backend runs on `http://localhost:5000`

### 4. Run Frontend + Backend Together
From root directory:
```bash
bash dev.sh
```

## Database Models

**User:**
- Email, password, name, location, farm_size, preferred_crop

**Crop:**
- Linked to User, has crop_id, selected_crop, start_date, soil_data, status flags

**Task:**
- Linked to Crop, tracks individual task completion per crop

## All API Endpoints

**Auth (no token required for signup/login):**
- POST `/api/auth/signup`
- POST `/api/auth/login`
- GET `/api/auth/me` (requires token)
- PUT `/api/auth/profile` (requires token)

**Crops (all require token):**
- GET `/api/crops/`
- POST `/api/crops/`
- GET `/api/crops/<id>`
- PUT `/api/crops/<id>`
- DELETE `/api/crops/<id>`

**Tasks (all require token):**
- GET `/api/tasks/crop/<crop_id>`
- POST `/api/tasks/`
- GET `/api/tasks/<id>`
- PUT `/api/tasks/<id>`
- DELETE `/api/tasks/<id>`

## Next: Connect Frontend to Backend

The frontend currently uses localStorage. To connect:

1. Replace localStorage calls with API requests
2. Store JWT token in frontend after login
3. Pass token in Authorization headers for protected routes
4. Update auth context in `src/contexts/AuthContext.tsx`

## Database Persistence

- **Local dev:** Uses SQLite file (`soil_smart_pilot.db`)
- **Production:** Update `DATABASE_URL` in `.env` to point to PostgreSQL

No migrations needed yet—Flask-SQLAlchemy creates tables automatically on startup.

---

Backend is ready to serve your frontend! Start it and integrate gradually. 🚀
