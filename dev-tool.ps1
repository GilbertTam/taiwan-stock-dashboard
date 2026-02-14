# PowerShell version of dev-tool.sh

# Load common functions
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptRoot "dev-scripts\common.ps1")

# Function to execute scripts
function Execute-Script {
    param(
        [string]$ScriptName,
        [string[]]$Arguments
    )
    
    $scriptFilePath = Join-Path $scriptRoot "dev-scripts\$ScriptName.ps1"
    
    if (Test-Path $scriptFilePath) {
        & $scriptFilePath @Arguments
    } else {
        Write-ColorMessage "RED" "Error: Script $ScriptName not found."
        exit 1
    }
}

# Main script logic
$subCommand = $args[0]
if ($args.Count -gt 1) {
    $remainingArgs = $args[1..($args.Count - 1)]
} else {
    $remainingArgs = @()
}

switch ($subCommand) {
    "create-superuser" {
        Execute-Script "dev-create-superuser" $remainingArgs
    }
    "shell" {
        Write-ColorMessage "YELLOW" "Starting Web Server container shell..."
        Execute-Script "dev-bash" $remainingArgs
    }
    "ipython" {
        Execute-Script "dev-shell" $remainingArgs
    }
    "migration" {
        Execute-Script "dev-migrations" $remainingArgs
    }
    "backend-debug" {
        Execute-Script "dev-backend-debug" $remainingArgs
    }
    "reload-nginx" {
        Execute-Script "dev-reload-nginx" $remainingArgs
    }
    default {
        Write-ColorMessage "YELLOW" "Usage: .\dev-tool.ps1 sub-command [args]"
        Write-ColorMessage "BLUE" "Sub-commands:"
        Write-ColorMessage "GREEN" "  create-superuser: Create an admin account for management."
        Write-ColorMessage "GREEN" "  shell: Create a shell to run arbitrary command."
        Write-ColorMessage "GREEN" "  ipython: Create a shell to run ipython."
        Write-ColorMessage "GREEN" "  migration: Run migration process."
        Write-ColorMessage "GREEN" "  backend-debug: Recreate and attach to backend container."
        Write-ColorMessage "GREEN" "  reload-nginx: Reload Nginx configuration."
    }
}
