#!/bin/zsh
set -euo pipefail

cd "${0:A:h}"
clear

print -- "设置负责人 Telegram Chat ID"
print -- "----------------------------"
print -- "请先给 Telegram 机器人发送 /whoami。"
print -- "机器人会回复类似：chat_id: 123456789"
print -- ""

chmod +x deploy/macos/*.sh >/dev/null 2>&1 || true

if zsh deploy/macos/set-operator-chat.sh; then
  print -- ""
  print -- "负责人 Chat ID 已设置，服务已重启。"
else
  exit_code=$?
  print -- ""
  print -- "设置没有完成，退出码：${exit_code}"
  print -- "请把这个窗口里的错误信息发给技术人员。"
fi

print -- ""
print -n -- "按回车关闭窗口..."
read -r _
