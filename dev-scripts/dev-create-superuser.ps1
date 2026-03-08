[CmdletBinding()]
param (
    [string]$Username = "admin",
    [string]$Email = "admin@example.com",
    [string]$Password = "1234"
)

# Load common.ps1 for CONTAINER_WEB_NAME (PROJECT_NAME from .env)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDir "common.ps1")
$ContainerName = $script:CONTAINER_WEB_NAME
if (-not $ContainerName) { $ContainerName = "jpex-dashboard-api" }

try {
    Write-Host "Resetting users and creating superuser (username=$Username, password=$Password)..." -ForegroundColor Cyan
    docker exec -it $ContainerName python scripts/reset_users.py $Username $Email $Password "true"
    Write-Host "Done." -ForegroundColor Green
}
catch {
    Write-Host "Error creating superuser: $_" -ForegroundColor Red
}
