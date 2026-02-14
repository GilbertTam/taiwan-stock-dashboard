[CmdletBinding()]
param (
    [string]$ContainerName = "jpex-dashboard-api"
)

try {
    Write-Host "Running migrations..." -ForegroundColor Cyan
    docker exec -it $ContainerName alembic upgrade head
    Write-Host "Migrations completed successfully." -ForegroundColor Green
}
catch {
    Write-Host "Error running migrations: $_" -ForegroundColor Red
}
