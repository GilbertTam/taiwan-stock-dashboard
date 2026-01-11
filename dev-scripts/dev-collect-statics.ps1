# PowerShell version of dev-collect-statics.sh

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptPath "common.ps1")

Write-ColorMessage "BLUE" "Collecting static files in ${script:CONTAINER_WEB_NAME}..."
docker exec -it ${script:CONTAINER_WEB_NAME} bash -c "python manage.py collectstatic --noinput"
Write-ColorMessage "GREEN" "Static files collected successfully."
