#!/bin/bash

# Initialize Docker Swarm locally if not already initialized
if [ "$(docker info | grep Swarm | awk '{print $2}')" == "inactive" ]; then
  echo "Initializing Docker Swarm locally..."
  docker swarm init
else
  echo "Swarm is already active"
fi

# Create required directories
mkdir -p nginx/conf.d
mkdir -p nginx/ssl

# Build the application image
docker build -t bookmarkeddit:latest .

# Deploy the stack
docker stack deploy -c docker-compose.yml bookmarkeddit

echo "Local swarm deployment complete. Your application should be available at http://localhost"
echo "To view running services: docker service ls"
echo "To view service logs: docker service logs bookmarkeddit_server"
echo "To remove the stack when done: docker stack rm bookmarkeddit"
