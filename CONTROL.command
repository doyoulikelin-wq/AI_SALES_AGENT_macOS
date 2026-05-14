#!/bin/zsh
set -euo pipefail

cd "${0:A:h}"
clear

chmod +x deploy/macos/*.sh >/dev/null 2>&1 || true

zsh deploy/macos/control.sh
