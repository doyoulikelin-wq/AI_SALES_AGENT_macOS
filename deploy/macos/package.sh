#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h:h}"
ARCHIVE_DIR="${PROJECT_DIR:h}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_PATH="$ARCHIVE_DIR/health-ai-sales-agent-${STAMP}.tgz"

cd "$PROJECT_DIR"

tar \
  --exclude='./node_modules' \
  --exclude='./dist' \
  --exclude='./data' \
  --exclude='./logs' \
  --exclude='./.env' \
  --exclude='./.DS_Store' \
  --exclude='./release' \
  --exclude='./deploy/macos/run-agent.local.sh' \
  -czf "$ARCHIVE_PATH" .

print -- "$ARCHIVE_PATH"
