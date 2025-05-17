#!/bin/bash

# Initialize Docker Swarm if not already initialized
if [ "$(docker info | grep Swarm | awk '{print $2}')" == "inactive" ]; then
  echo "Initializing Docker Swarm..."
  docker swarm init
fi

# Create required directories
mkdir -p nginx/conf.d
mkdir -p nginx/ssl

# Build the application image
docker build -t bookmarkeddit:latest .

# Deploy the stack
docker stack deploy -c docker-compose.yml bookmarkeddit

echo "Deployment complete. Your application should be available soon."
