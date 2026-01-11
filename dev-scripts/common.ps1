# Color definitions using Write-Host with colors
function Write-ColorMessage {
    param(
        [string]$Color,
        [string]$Message
    )
    
    switch ($Color) {
        "RED" { Write-Host $Message -ForegroundColor Red }
        "GREEN" { Write-Host $Message -ForegroundColor Green }
        "YELLOW" { Write-Host $Message -ForegroundColor Yellow }
        "BLUE" { Write-Host $Message -ForegroundColor Blue }
        default { Write-Host $Message }
    }
}

# Load environment variables from .env file
if (Test-Path ".\.env") {
    Get-Content ".\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove surrounding quotes if present
            if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Constants
$script:CONTAINER_WEB_NAME = "${env:PROJECT_NAME}-api"
$script:CONTAINER_NGINX_NAME = "${env:PROJECT_NAME}-nginx"
