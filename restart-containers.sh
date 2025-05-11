#!/bin/bash
# Stop any running containers
echo "Stopping running containers..."
docker-compose down

# Build containers with detailed output
echo "Building containers..."
docker-compose build

# Check if build was successful before starting
if [ $? -eq 0 ]; then
  echo "Starting containers..."
  docker-compose up -d
  echo "Containers started successfully!"
else
  echo "Build failed. Containers were not started."
  exit 1
fi