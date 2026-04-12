# Hugging Face Spaces Deployment

This folder contains the standalone ML inference service that can be deployed to Hugging Face Spaces.

## What the Space Exposes

The service provides the endpoints expected by the Flask backend:

- `GET /health`
- `POST /api/inference`

## Recommended Space Setup

Use a Hugging Face Space that runs the Flask app directly. The runtime payload is the three-file set below; a Dockerfile is only needed if you choose to package it as a Docker Space.

### Space Settings

- Name: `soil-smart-model`
- SDK: `Docker` if you want container control, otherwise use the Space runtime that launches `app.py`
- Hardware: `CPU Basic (Free)`
- Visibility: `Public`

### Files to Include

Upload these three files to the Space:

- `app.py`
- `requirements.txt`
- `yield_model.joblib`

If you want to use the repository version of the model file, copy it from `server/model/yield_model.joblib` into the Space.

## Why the Sample App Needs Adjustment

The model file in this repository is not a plain scikit-learn estimator. It stores:

- the trained model
- `label_encoder_crop`
- `label_encoder_state`
- `feature_columns`

Because of that, the Space must load the artifact and apply the label encoders before prediction. The `app.py` file in this folder does this correctly.

## Build Behavior

The Space should start by loading the model once at startup, then serve requests through Flask.

The app loads the model once at startup before serving requests.

## Backend Integration

After deployment, set the Flask backend environment variable:

- `MODEL_SERVICE_URL=https://<your-space-name>.hf.space`

The backend will call:

- `POST https://<your-space-name>.hf.space/api/inference`

## Quick Verification

Once the Space is running, check:

- `GET /health` returns `{"status":"ok"}`
- `POST /api/inference` returns a JSON prediction
