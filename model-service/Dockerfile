FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY service.py .

# Expose port
EXPOSE 5001

# Run service
CMD ["python", "service.py"]
