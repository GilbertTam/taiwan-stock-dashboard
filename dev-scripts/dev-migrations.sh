#!/bin/bash

CONTAINER_NAME="jpex-dashboard-api"

echo "Running migrations..."
docker exec -it $CONTAINER_NAME alembic upgrade head