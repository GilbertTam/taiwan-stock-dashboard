#!/bin/bash

CONTAINER_NAME="jpex-dashboard-api"

echo "Opening shell in backend container..."
docker exec -it $CONTAINER_NAME /bin/bash