#!/bin/bash

# Use same container name as dev-tool (PROJECT_NAME from .env)
CONTAINER_NAME="${PROJECT_NAME:-jpex-dashboard}-api"
USERNAME="admin"
EMAIL="admin@example.com"
PASSWORD="1234"

echo "Resetting users and creating superuser (username=$USERNAME, password=$PASSWORD)..."
docker exec -it "$CONTAINER_NAME" python scripts/reset_users.py "$USERNAME" "$EMAIL" "$PASSWORD" "true"
echo "Done."