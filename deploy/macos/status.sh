#!/bin/zsh
set -euo pipefail

SERVICE_LABEL="${SERVICE_LABEL:-com.herbaloem.agent-gateway}"
SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h:h}"
ENV_FILE="$PROJECT_DIR/.env"

port_from_env() {
  if [[ -f "$ENV_FILE" ]]; then
    awk -F= '/^PORT=/{gsub(/"/, "", $2); print $2}' "$ENV_FILE" | tail -n 1
  fi
}

PORT_VALUE="$(port_from_env)"
PORT_VALUE="${PORT_VALUE:-8787}"

print -- "Service label: ${SERVICE_LABEL}"
launchctl list | grep "$SERVICE_LABEL" || print -- "LaunchAgent is not loaded."

print -- "Health check: http://localhost:${PORT_VALUE}/health"
curl -sS "http://localhost:${PORT_VALUE}/health" || print -- "Health check failed."
print -- ""

if [[ -f "$PROJECT_DIR/logs/launchd.err.log" ]]; then
  print -- "Recent stderr log:"
  tail -n 30 "$PROJECT_DIR/logs/launchd.err.log"
fi
