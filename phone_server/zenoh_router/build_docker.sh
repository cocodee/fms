#!/bin/bash

# Set the image name and tag
IMAGE_NAME="zenoh-router"
IMAGE_TAG="latest"

# Build the Docker image
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo "Docker image ${IMAGE_NAME}:${IMAGE_TAG} built successfully."
