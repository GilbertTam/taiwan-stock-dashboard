#!/bin/bash

CONTAINER_NAME="jpex-dashboard-api"
EMAIL="admin@example.com"
USERNAME="admin"
PASSWORD="1234"

echo "Creating superuser..."
docker exec -it $CONTAINER_NAME python scripts/create_user.py $USERNAME $EMAIL $PASSWORD "true"