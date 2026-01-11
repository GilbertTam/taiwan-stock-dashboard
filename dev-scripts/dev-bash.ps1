# PowerShell version of dev-bash.sh

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptPath "common.ps1")

Write-ColorMessage "BLUE" "Executing command in ${script:CONTAINER_WEB_NAME}..."

# 如果有傳遞參數，則執行這些參數作為命令
if ($args.Count -gt 0) {
    docker exec -it ${script:CONTAINER_WEB_NAME} $args
} else {
    # 如果沒有參數，則只是進入容器的 bash shell
    docker exec -it ${script:CONTAINER_WEB_NAME} bash
}
