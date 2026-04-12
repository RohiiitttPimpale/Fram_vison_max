# Soil Smart Pilot

Soil Smart Pilot is a crop-planning and yield-prediction app with a Vite + React frontend, a Flask backend, and a separate model service for inference.

## Deployment Overview

The current codebase already supports a split deployment:

- Frontend: Vercel
- Backend API: Render
- Model service: Hugging Face Spaces or another HTTP-hosted Flask service
- Database: SQLAlchemy-backed database, currently SQLite locally and PostgreSQL in production-ready setups

Important note: the backend is not wired for MongoDB Atlas today. It uses Flask-SQLAlchemy models in [server/models.py](server/models.py), so switching to MongoDB would require a data-layer rewrite.

## Recommended Free Stack

### 1. Model Service
Host the trained model behind an HTTP API. The backend expects `MODEL_SERVICE_URL` to point at a `/api/inference` endpoint.

Suggested environment:

- `MODEL_PATH` when running the model service locally or in Docker

For a Hugging Face Spaces walkthrough, see [model-service/README.md](model-service/README.md).

### 2. Backend API
Deploy the Flask app from [server/app.py](server/app.py).

Suggested Render settings:

- Build command: `pip install -r server/requirements.txt`
- Start command: `gunicorn app:app`
- Environment variables:
	- `FLASK_ENV=production`
	- `DATABASE_URL=<your production database URL>`
	- `JWT_SECRET_KEY=<strong secret>`
	- `SECRET_KEY=<strong secret>`
	- `MODEL_SERVICE_URL=<your model service URL>`
	- `FRONTEND_URL=<your Vercel domain>`

### 3. Frontend
Deploy the Vite app to Vercel.

Suggested environment:

- `VITE_API_URL=<your Render backend URL>/api`

## Data Flow

The deployed request path is:

$$\text{User Browser} \xrightarrow{\text{Vercel}} \xrightarrow{\text{POST JSON}} \text{Render (Flask)} \xrightarrow{\text{Fetch Prediction}} \text{Hugging Face (Model)}$$

## Local Development

For the local microservices setup, see [README-MICROSERVICES.md](README-MICROSERVICES.md).
