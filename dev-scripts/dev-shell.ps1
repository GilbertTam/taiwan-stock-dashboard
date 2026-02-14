[CmdletBinding()]
param (
    [string]$ContainerName = "jpex-dashboard-api"
)

try {
    Write-Host "Opening shell in backend container..." -ForegroundColor Cyan
    docker exec -it $ContainerName /bin/bash
}
catch {
    Write-Host "Error opening shell: $_" -ForegroundColor Red
}
