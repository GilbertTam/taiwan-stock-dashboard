# PowerShell version of dev-clean-migrations.sh

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptPath "common.ps1")

Write-ColorMessage "RED" "Deleting migrations files in ${script:CONTAINER_WEB_NAME}..."

# Delete migrations
Get-ChildItem -Path . -Recurse -Filter "*.py" | Where-Object {
    $_.FullName -match "[\\/]migrations[\\/].*\.py$" -and $_.Name -ne "__init__.py"
} | Remove-Item -Force

Get-ChildItem -Path . -Recurse -Filter "*.pyc" | Where-Object {
    $_.FullName -match "[\\/]migrations[\\/].*\.pyc$"
} | Remove-Item -Force
