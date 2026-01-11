# PowerShell version of dev-create-superuser.sh

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptPath "common.ps1")

# Function to prompt for input with a default value
function Prompt-WithDefault {
    param(
        [string]$Prompt,
        [string]$Default
    )
    
    $input = Read-Host "$Prompt [$Default]"
    if ([string]::IsNullOrWhiteSpace($input)) {
        return $Default
    }
    return $input
}

# Get user input
$USERNAME = Prompt-WithDefault "Enter username" "admin"
$EMAIL = Prompt-WithDefault "Enter email" "admin@admin.com"
$PASSWORD = Prompt-WithDefault "Enter password" "1234"

# Create superuser
Write-ColorMessage "BLUE" "Creating superuser..."
docker exec -it ${script:CONTAINER_WEB_NAME} bash -c "DJANGO_SUPERUSER_PASSWORD='$PASSWORD' python manage.py createsuperuser --noinput --username '$USERNAME' --email '$EMAIL'"

Write-ColorMessage "GREEN" "Superuser created successfully."
