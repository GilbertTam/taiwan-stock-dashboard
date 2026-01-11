# PowerShell version of dev-startapp.sh

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptPath "common.ps1")

if ($args.Count -eq 0) {
    Write-ColorMessage "RED" "Error: App name is required."
    Write-ColorMessage "YELLOW" "Usage: .\dev-startapp.ps1 <app_name>"
    exit 1
}

$APP_NAME = $args[0]

Write-ColorMessage "BLUE" "Creating new Django app '${APP_NAME}' in ${script:CONTAINER_WEB_NAME}..."
docker exec -it ${script:CONTAINER_WEB_NAME} bash -c "python manage.py startapp ${APP_NAME}"

if (-not (Test-Path ".\backend\${APP_NAME}")) {
    Write-ColorMessage "RED" "Error: Folder not created."
    exit 1
}

Write-ColorMessage "YELLOW" "Adjusting permissions for the new app folder..."

# On Windows, we set ownership to root in container (for Linux compatibility)
docker exec -it ${script:CONTAINER_WEB_NAME} bash -c "chown -R root:root /app/${APP_NAME}"

# Ensure the current user has read and write permissions on Windows
$appPath = Join-Path (Get-Location) "backend\$APP_NAME"
if (Test-Path $appPath) {
    Get-ChildItem -Path $appPath -Recurse -File | ForEach-Object {
        $_.IsReadOnly = $false
    }
}

Write-ColorMessage "GREEN" "New Django app '${APP_NAME}' created successfully."
