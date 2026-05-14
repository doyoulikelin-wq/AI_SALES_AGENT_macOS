#!/bin/zsh
set -euo pipefail

cd "${0:A:h}"
clear

print -- "大健康 AI 销售 Agent 安装向导"
print -- "--------------------------------"
print -- "这个窗口会自动安装运行所需组件，并设置开机自启。"
print -- "中途如果系统要求输入 Mac 开机密码，请正常输入；Terminal 不会显示密码字符。"
print -- ""

chmod +x deploy/macos/*.sh >/dev/null 2>&1 || true

if zsh deploy/macos/install.sh; then
  print -- ""
  print -- "安装流程结束。你可以把这个窗口里的最后几行结果发给技术人员确认。"
  print -- "以后要配置、查看状态、看日志、启动/停止服务，请双击 CONTROL.command。"
else
  exit_code=$?
  print -- ""
  print -- "安装没有完成，退出码：${exit_code}"
  print -- "请把这个窗口里的错误信息发给技术人员。"
fi

print -- ""
print -n -- "按回车关闭窗口..."
read -r _
