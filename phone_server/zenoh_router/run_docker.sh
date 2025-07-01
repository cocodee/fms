#!/bin/bash

# Set the image name and tag
IMAGE_NAME="zenoh-router"
IMAGE_TAG="latest"
CONTAINER_NAME="zenoh-router-container"

# Stop and remove any existing container with the same name
docker stop "${CONTAINER_NAME}" >/dev/null 2>&1
docker rm "${CONTAINER_NAME}" >/dev/null 2>&1

# Run the Docker container
docker run -d --name "${CONTAINER_NAME}" -p 7447:7447/tcp -p 7447:7447/udp --restart always "${IMAGE_NAME}:${IMAGE_TAG}"

echo "Zenoh router container '${CONTAINER_NAME}' started successfully."
