# PowerShell version of dev-reload-nginx.sh

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptPath "common.ps1")

Write-ColorMessage "BLUE" "Reloading Nginx in ${script:CONTAINER_NGINX_NAME}..."
docker exec -it $script:CONTAINER_NGINX_NAME nginx -s reload
