#!/bin/bash
# Start both frontend and backend servers

echo "Starting Soil Smart Pilot..."

# Check if both are running
(
  echo "Starting backend (Flask)..."
  cd server
  python app.py &
  BACKEND_PID=$!
) &

(
  echo "Starting frontend (Vite)..."
  npm run dev -- --host 0.0.0.0 --port 4174 &
  FRONTEND_PID=$!
) &

echo "Backend running on http://localhost:5000"
echo "Frontend running on http://localhost:4174"
echo "Press Ctrl+C to stop both servers."

# Keep script running
wait
