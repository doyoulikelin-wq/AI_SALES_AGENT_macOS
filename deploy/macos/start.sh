#!/bin/zsh
set -euo pipefail

SERVICE_LABEL="${SERVICE_LABEL:-com.herbaloem.agent-gateway}"

launchctl start "$SERVICE_LABEL" >/dev/null 2>&1 || \
  launchctl kickstart -k "gui/$(id -u)/${SERVICE_LABEL}" >/dev/null 2>&1 || true

print -- "Started ${SERVICE_LABEL}."
