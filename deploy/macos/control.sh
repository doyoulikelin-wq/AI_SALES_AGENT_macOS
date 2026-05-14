#!/bin/zsh
set -euo pipefail

SERVICE_LABEL="${SERVICE_LABEL:-com.herbaloem.agent-gateway}"
SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h:h}"
ENV_FILE="$PROJECT_DIR/.env"

cd "$PROJECT_DIR"

env_value() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 0
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); gsub(/^"|"$/, ""); print; exit }' "$ENV_FILE"
}

port_from_env() {
  local port
  port="$(env_value PORT || true)"
  print -- "${port:-8787}"
}

configured_flag() {
  local key="$1"
  local value
  value="$(env_value "$key" || true)"
  if [[ -n "$value" ]]; then print -- "yes"; else print -- "no"; fi
}

service_loaded() {
  launchctl list | grep -q "$SERVICE_LABEL"
}

show_status() {
  local port provider node_env
  port="$(port_from_env)"
  provider="$(env_value LLM_PROVIDER || true)"
  node_env="$(env_value NODE_ENV || true)"

  print -- "状态面板"
  print -- "--------"
  print -- "项目目录: $PROJECT_DIR"
  print -- ".env: $([[ -f "$ENV_FILE" ]] && print yes || print no)"
  print -- "LaunchAgent: $(service_loaded && print loaded || print not-loaded)"
  print -- "端口: $port"
  print -- "运行环境: ${node_env:-unknown}"
  print -- "模型供应商: ${provider:-unknown}"
  print -- "OpenAI Key: $(configured_flag OPENAI_API_KEY)"
  print -- "Gemini Key: $(configured_flag GEMINI_API_KEY)"
  print -- "Telegram Bot Token: $(configured_flag TELEGRAM_BOT_TOKEN)"
  print -- "负责人 Chat ID: $(configured_flag TELEGRAM_OPERATOR_CHAT_ID)"
  print -- ""
  print -- "相关进程:"
  pgrep -af 'health-ai-sales-agent|dist/index.js|agent-gateway' || print -- "none"
  print -- ""
  print -- "健康检查: http://localhost:${port}/health"
  curl -sS "http://localhost:${port}/health" 2>/dev/null || print -- "health check failed"
  print -- ""
  print -- ""
  print -- "最近错误日志:"
  if [[ -f logs/launchd.err.log ]]; then
    tail -n 30 logs/launchd.err.log
  else
    print -- "no log file"
  fi
}

open_dashboard() {
  local port
  port="$(port_from_env)"
  open "http://localhost:${port}/admin"
}

pause() {
  print -- ""
  print -n -- "按回车继续..."
  read -r _
}

while true; do
  clear
  print -- "大健康 AI 销售 Agent 控制台"
  print -- "============================"
  print -- "★ 推荐：日常请打开网页可视化面板，所有数据/审批/会话/工作流一目了然。"
  print -- ""
  print -- "1) 安装/重新安装服务"
  print -- "2) 配置全部信息 (.env)"
  print -- "3) 设置负责人 Telegram Chat ID"
  print -- "4) 启动服务"
  print -- "5) 停止服务"
  print -- "6) 查看状态/进程/日志"
  print -- "7) ★ 打开网页可视化面板（概览/审批/会话/消息流/工作流图/系统）"
  print -- "8) 查看实时日志"
  print -- "9) 卸载系统服务"
  print -- "0) 退出"
  print -- ""
  print -n -- "请选择："
  read -r choice

  case "$choice" in
    1)
      zsh deploy/macos/install.sh
      pause
      ;;
    2)
      zsh deploy/macos/configure.sh
      print -- "如服务正在运行，建议重启：先选 5，再选 4。"
      pause
      ;;
    3)
      zsh deploy/macos/set-operator-chat.sh
      pause
      ;;
    4)
      zsh deploy/macos/start.sh
      pause
      ;;
    5)
      zsh deploy/macos/stop.sh
      pause
      ;;
    6)
      show_status
      pause
      ;;
    7)
      open_dashboard
      pause
      ;;
    8)
      print -- "按 Control+C 退出日志。"
      mkdir -p logs
      touch logs/launchd.out.log logs/launchd.err.log
      tail -f logs/launchd.out.log logs/launchd.err.log
      ;;
    9)
      zsh deploy/macos/uninstall.sh
      pause
      ;;
    0)
      exit 0
      ;;
    *)
      print -- "无效选择。"
      pause
      ;;
  esac
done
