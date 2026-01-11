# PowerShell version of dev-supervisorctl.sh

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptPath "common.ps1")

Write-ColorMessage "BLUE" "Starting Supervisor control shell in ${script:CONTAINER_WEB_NAME}..."
docker exec -it ${script:CONTAINER_WEB_NAME} supervisorctl -c /etc/supervisor/conf.d/supervisord.conf
