#!/bin/zsh
set -euo pipefail

SERVICE_LABEL="${SERVICE_LABEL:-com.herbaloem.agent-gateway}"
SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h:h}"
PLIST="$HOME/Library/LaunchAgents/${SERVICE_LABEL}.plist"

print -- "卸载系统服务"
print -- "------------"
launchctl stop "$SERVICE_LABEL" >/dev/null 2>&1 || true
if [[ -f "$PLIST" ]]; then
  launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || launchctl unload "$PLIST" >/dev/null 2>&1 || true
  rm -f "$PLIST"
  print -- "已移除 LaunchAgent。"
else
  print -- "没有找到 LaunchAgent plist。"
fi

pkill -f 'health-ai-sales-agent.*/dist/index.js' >/dev/null 2>&1 || true
pkill -f 'node dist/index.js' >/dev/null 2>&1 || true
print -- "已停止可能的服务进程。"

print -- ""
print -- "项目文件夹仍保留在：$PROJECT_DIR"
print -- "如需删除整个文件夹，请在 Finder 中手动移到废纸篓。"
