#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h:h}"
ENV_FILE="$PROJECT_DIR/.env"

cd "$PROJECT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  print -- "没有找到 .env。" >&2
  print -- "当前目录：$PROJECT_DIR" >&2
  print -- "请确认你打开的是已经运行过 INSTALL.command 的安装目录。" >&2
  print -- "如果这是第一次安装，请先双击同一文件夹里的 INSTALL.command。" >&2
  print -- "如果你之前是从 tgz 解压到另一个目录测试，请去那个目录里双击 SET_OPERATOR.command。" >&2
  exit 1
fi

print -n -- "请粘贴 /whoami 返回的 chat_id："
read -r chat_id
chat_id="${chat_id#chat_id:}"
chat_id="${chat_id//[[:space:]]/}"

if [[ -z "$chat_id" ]]; then
  print -- "chat_id 不能为空。" >&2
  exit 1
fi

if [[ ! "$chat_id" =~ '^-?[0-9]+$' ]]; then
  print -- "chat_id 看起来不正确。它通常是一串数字，例如 123456789。" >&2
  exit 1
fi

tmp_file="$(mktemp)"
awk -v value="$chat_id" '
  BEGIN { updated = 0 }
  /^TELEGRAM_OPERATOR_CHAT_ID=/ {
    print "TELEGRAM_OPERATOR_CHAT_ID=" value
    updated = 1
    next
  }
  { print }
  END {
    if (!updated) print "TELEGRAM_OPERATOR_CHAT_ID=" value
  }
' "$ENV_FILE" > "$tmp_file"
mv "$tmp_file" "$ENV_FILE"
chmod 600 "$ENV_FILE"

zsh deploy/macos/stop.sh >/dev/null 2>&1 || true
zsh deploy/macos/start.sh >/dev/null 2>&1 || true

print -- "已写入 TELEGRAM_OPERATOR_CHAT_ID=${chat_id}"
print -- "服务已重启。现在可以给机器人发送 /status 测试。"
