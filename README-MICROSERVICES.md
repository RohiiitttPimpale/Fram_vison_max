# Microservices Architecture - Local Development Guide

## Architecture Overview

This project now uses a **microservices-based architecture** with separate services for different concerns:

```
Frontend (React) :5173
    ↓
Backend API (Flask) :5000
    ↓
Model Service (Flask) :5001
    ↓
ML Model (yield_model.joblib)
```

## Services

### 1. Frontend (React)
- **Port**: 5173 (dev) 
- **Role**: User interface only, no business logic
- **Status**: Unchanged from before
- **Run**: `npm run dev`

### 2. Backend API (Flask) :5000
- **Port**: 5000
- **Role**: 
  - Authentication (JWT)
  - Request validation
  - Orchestrates calls to Model Service
  - Database operations
- **Does NOT load**: ML model, NumPy, scikit-learn
- **Dependencies**: Flask, SQLAlchemy, JWT, requests
- **Run**: `python app.py` or via docker-compose

### 3. Model Service (Flask) :5001 [NEW]
- **Port**: 5001
- **Role**: ML inference only
- **Loads model ONCE at startup**: Efficient memory usage
- **Dependencies**: Flask, pandas, numpy, scikit-learn
- **Run**: `python model-service/service.py` or via docker-compose
- **Deployment**: Can also run on Hugging Face Spaces as documented in [model-service/README.md](model-service/README.md)

## Quick Local Setup

### Option A: Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up --build

# In another terminal, test the system
curl http://localhost:5000/api/health

# Stop all services
docker-compose down
```

### Option B: Manual Local Run (Python only)

```bash
# Terminal 1: Start Model Service
cd model-service
python service.py

# Terminal 2: Start Backend
cd server
python app.py

# Terminal 3: Start Frontend
npm run dev

# Access: http://localhost:5173
```

## Data Flow Example

1. **User submits prediction form** (Frontend)
   ```
   POST /api/prediction/yield
   {
     crop: "Rice",
     state: "Uttar Pradesh",
     area: 10000,
     fertilizer: 150000,
     ... (other fields)
   }
   ```

2. **Backend validates and forwards** (Flask :5000)
   - Validates crop is in SUPPORTED_CROPS
   - Validates state is in SUPPORTED_STATES
   - Converts crop names (Soybean → Soyabean)
   - Calls Model Service

3. **Model Service infers** (Flask :5001)
   - Loads model from memory (pre-loaded)
   - Encodes categorical features
   - Runs prediction
   - Returns: `{ predicted_yield: 26.88, unit: "tons/hectare" }`

4. **Backend wraps response** (Flask :5000)
   - Formats response
   - Returns to frontend

5. **Frontend displays result** (React)
   - Shows predicted yield

## Database & Files

- **SQLite Database**: `server/instance/soil_smart_pilot.db`
- **Model File**: `server/model/yield_model.joblib`
- **Frontend Build**: `dist/`

## Environment Configuration

### Backend (.env or docker-compose)
```
FLASK_ENV=development
DATABASE_URL=sqlite:///soil_smart_pilot.db
JWT_SECRET_KEY=dev-jwt-secret
MODEL_SERVICE_URL=http://localhost:5001
```

### Model Service
```
MODEL_PATH=/app/model/yield_model.joblib
```

## Key Benefits of This Architecture

✅ **Separation of Concerns**
- Frontend = UI only
- Backend = Orchestration + validation
- Model Service = Inference only

✅ **Low Memory Backend**
- Backend ~50MB (no ML libraries)
- Model Service ~500MB (ML libraries)
- Each service can run on appropriate hardware

✅ **Scalability**
- Backend can scale independently
- Model Service can run on GPU hardware
- Can run multiple model service replicas

✅ **Resilience**
- Model Service failure doesn't crash Backend
- Each service has health check
- Backend implements retry logic

✅ **Production Ready**
- Docker containerized
- Easy to deploy to K8s, AWS, GCP, etc.
- Environment-based configuration

## Troubleshooting

### Model Service fails to start
```
Error: Model file not found
Solution: Ensure server/model/yield_model.joblib exists
```

### Backend cannot reach Model Service
```
Error: Cannot connect to model service
Solution: Check MODEL_SERVICE_URL env var, ensure model-service is running
```

### Port already in use
```
Error: Address already in use
Solution: docker-compose down && docker-compose up
```

## What's New vs Old

| Aspect | Old | New |
|--------|-----|-----|
| Model Loading | Subprocess per request | Loaded once at startup |
| Backend Size | 900MB (with ML libs) | 50MB (slim) |
| Model Updates | Restart backend | Restart model-service only |
| Scaling | Coupled | Independent |
| Deployment | Complex | Docker-compose |

## Next Steps

1. ✅ Test locally with docker-compose
2. ✅ Verify predictions still work correctly
3. Future: Deployment to production (K8s/cloud)

## Files Structure

```
.
├── frontend/
│   ├── src/
│   ├── package.json
│   └── (no changes)
├── backend/
│   ├── app.py
│   ├── routes/
│   │   └── prediction.py (UPDATED: calls model service)
│   ├── requirements.txt (UPDATED: removed ML libs, added requests)
│   └── Dockerfile (NEW)
├── model-service/ (NEW)
│   ├── service.py
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml (NEW)
└── README-MICROSERVICES.md (this file)
```
