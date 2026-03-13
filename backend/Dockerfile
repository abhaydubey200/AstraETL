# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY backend/requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY backend/ ./backend/
COPY core/ ./core/

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
# We will use environment variables to determine if it runs as API, Worker, or Scheduler
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
