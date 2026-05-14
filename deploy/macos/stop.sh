#!/bin/zsh
set -euo pipefail

SERVICE_LABEL="${SERVICE_LABEL:-com.herbaloem.agent-gateway}"

launchctl stop "$SERVICE_LABEL" >/dev/null 2>&1 || true
print -- "Stopped ${SERVICE_LABEL}."
