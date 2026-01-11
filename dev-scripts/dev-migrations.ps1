# PowerShell version of dev-migrations.sh

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptPath "common.ps1")

Write-ColorMessage "BLUE" "Running database migrations in ${script:CONTAINER_WEB_NAME}..."
docker exec -it ${script:CONTAINER_WEB_NAME} bash -c 'python manage.py makemigrations && python manage.py migrate'
Write-ColorMessage "GREEN" "Database migrations completed."
