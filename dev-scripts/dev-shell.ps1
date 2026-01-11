# PowerShell version of dev-shell.sh

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptPath "common.ps1")

Write-ColorMessage "BLUE" "Starting IPython shell in ${script:CONTAINER_WEB_NAME}..."
docker exec -it ${script:CONTAINER_WEB_NAME} bash -c 'python manage.py shell'
