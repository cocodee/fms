IMAGE_NAME="phone_server"
IMAGE_TAG="latest"
CONTAINER_NAME="phone-server-container"

# Stop and remove any existing container with the same name
docker stop "${CONTAINER_NAME}" >/dev/null 2>&1
docker rm "${CONTAINER_NAME}" >/dev/null 2>&1
docker run -it -p 8765:8765 -v /Users/kdi/workspace/gitprj/fms/phone_server:/app --name $CONTAINER_NAME $IMAGE_NAME:$IMAGE_TAG  /bin/bash