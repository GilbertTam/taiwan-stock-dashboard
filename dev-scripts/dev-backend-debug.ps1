# PowerShell version of dev-backend-debug.sh

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptPath "common.ps1")

Write-ColorMessage "BLUE" "Starting backend debug process..."

# 檢查 supervisor 是否正在運行 Django
$supervisorStatus = docker exec ${script:CONTAINER_WEB_NAME} bash -c "supervisorctl -c /etc/supervisor/conf.d/supervisord.conf status django"

if ($supervisorStatus -match "RUNNING") {
    Write-ColorMessage "YELLOW" "Supervisor is running Django, stopping it..."
    docker exec ${script:CONTAINER_WEB_NAME} bash -c "supervisorctl -c /etc/supervisor/conf.d/supervisord.conf stop django"
} else {
    Write-ColorMessage "YELLOW" "Supervisor is not running Django, checking for manually started Django..."
    $djangoPid = docker exec ${script:CONTAINER_WEB_NAME} bash -c "ps aux | grep 'python manage.py runserver' | grep -v grep | awk '{print `$2}'"
    
    if ($djangoPid) {
        Write-ColorMessage "YELLOW" "Found manually started Django (PID: $djangoPid), stopping it..."
        docker exec ${script:CONTAINER_WEB_NAME} bash -c "kill $djangoPid"
    } else {
        Write-ColorMessage "YELLOW" "No running Django instance found."
    }
}

Write-ColorMessage "BLUE" "Waiting for Django to stop completely..."
Start-Sleep -Seconds 5

Write-ColorMessage "GREEN" "Starting new Django instance..."
docker exec -it ${script:CONTAINER_WEB_NAME} bash -c "python manage.py runserver 0.0.0.0:8000"
