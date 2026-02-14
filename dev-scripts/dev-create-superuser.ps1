[CmdletBinding()]
param (
    [string]$ContainerName = "jpex-dashboard-api",
    [string]$Email = "admin@example.com",
    [string]$Username = "admin",
    [string]$Password = "1234"
)

try {
    Write-Host "Creating superuser..." -ForegroundColor Cyan
    docker exec -it $ContainerName python scripts/create_user.py $Username $Email $Password "true"
    Write-Host "Superuser created successfully." -ForegroundColor Green
}
catch {
    Write-Host "Error creating superuser: $_" -ForegroundColor Red
}
