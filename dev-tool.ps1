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
$remainingArgs = $args[1..($args.Length - 1)]

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
    "supervisorctl" {
        Execute-Script "dev-supervisorctl" $remainingArgs
    }
    "migration" {
        Execute-Script "dev-migrations" $remainingArgs
    }
    "backend-debug" {
        Execute-Script "dev-backend-debug" $remainingArgs
    }
    "collect-static" {
        Execute-Script "dev-collect-statics" $remainingArgs
    }
    "django-startapp" {
        Execute-Script "dev-startapp" $remainingArgs
    }
    "reload-nginx" {
        Execute-Script "dev-reload-nginx" $remainingArgs
    }
    "clean-migrations" {
        Execute-Script "dev-clean-migrations" $remainingArgs
    }
    default {
        Write-ColorMessage "YELLOW" "Usage: .\dev-tool.ps1 sub-command [args]"
        Write-ColorMessage "BLUE" "Sub-commands:"
        Write-ColorMessage "GREEN" "  create-superuser: Create an admin account for management."
        Write-ColorMessage "GREEN" "  shell: Create a shell to run arbitrary command."
        Write-ColorMessage "GREEN" "  ipython: Create a shell to run ipython."
        Write-ColorMessage "GREEN" "  supervisorctl: Attach to supervisor control shell."
        Write-ColorMessage "GREEN" "  migration: Run migration process."
        Write-ColorMessage "GREEN" "  backend-debug: Recreate and attach to backend container."
        Write-ColorMessage "GREEN" "  collect-static: Collect static files to increase rendering speed."
        Write-ColorMessage "GREEN" "  django-startapp: Create a new Django app."
        Write-ColorMessage "GREEN" "  reload-nginx: Reload Nginx configuration."
        Write-ColorMessage "GREEN" "  clean-migrations: Clean up migration files."
    }
}
