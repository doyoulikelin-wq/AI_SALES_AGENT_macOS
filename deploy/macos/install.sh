#!/bin/zsh
set -euo pipefail

SERVICE_LABEL="${SERVICE_LABEL:-com.herbaloem.agent-gateway}"
SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h:h}"
PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_LABEL}.plist"
RUNNER_PATH="$PROJECT_DIR/deploy/macos/run-agent.local.sh"
BREW_PATHS=(/opt/homebrew/bin/brew /usr/local/bin/brew)

cd "$PROJECT_DIR"

info() {
  print -- "[install] $*"
}

warn() {
  print -- "[install:warn] $*" >&2
}

fail() {
  print -- "[install:error] $*" >&2
  exit 1
}

has_tty() {
  [[ -t 0 && -t 1 ]]
}

pause_for_user() {
  local message="$1"
  if has_tty; then
    print -n -- "$message"
    read -r _
  fi
}

prompt_value() {
  local message="$1"
  local default_value="${2:-}"
  local answer
  if [[ -n "$default_value" ]]; then
    print -n -- "$message [$default_value]: " >&2
  else
    print -n -- "$message: " >&2
  fi
  read -r answer
  print -r -- "${answer:-$default_value}"
}

prompt_secret() {
  local message="$1"
  local answer
  print -n -- "$message: " >&2
  read -rs answer
  print -- "" >&2
  print -r -- "$answer"
}

env_value() {
  local key="$1"
  [[ -f .env ]] || return 0
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); gsub(/^"|"$/, ""); print; exit }' .env
}

is_port_busy() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

default_port() {
  local port
  for port in 8787 8790 8791 8792; do
    if ! is_port_busy "$port"; then
      print -- "$port"
      return 0
    fi
  done
  print -- "8787"
}

xml_escape() {
  print -r -- "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'
}

ensure_command_line_tools() {
  if xcode-select -p >/dev/null 2>&1; then
    info "Xcode Command Line Tools found."
    return
  fi

  warn "Xcode Command Line Tools is required. macOS will open an installer window."
  xcode-select --install >/dev/null 2>&1 || true
  pause_for_user "请在弹出的窗口里点安装；安装完成后回到这里按回车继续..."

  if ! xcode-select -p >/dev/null 2>&1; then
    fail "Xcode Command Line Tools is still missing. Please finish the Apple installer, then rerun INSTALL.command."
  fi
}

activate_homebrew_path() {
  local brew_path
  for brew_path in "${BREW_PATHS[@]}"; do
    if [[ -x "$brew_path" ]]; then
      eval "$("$brew_path" shellenv)"
      return 0
    fi
  done
  return 1
}

ensure_homebrew() {
  if command -v brew >/dev/null 2>&1 || activate_homebrew_path; then
    info "Homebrew found: $(command -v brew)"
    return
  fi

  if ! command -v curl >/dev/null 2>&1; then
    fail "curl is required to install Homebrew, but it was not found."
  fi

  warn "Homebrew was not found. The installer will install Homebrew now."
  warn "If macOS asks for your password, type the Mac login password and press Enter."
  pause_for_user "准备安装 Homebrew，按回车继续..."

  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  activate_homebrew_path || fail "Homebrew installed but is not available in PATH. Restart Terminal and rerun INSTALL.command."

  local shellenv_line
  if [[ -x /opt/homebrew/bin/brew ]]; then
    shellenv_line='eval "$(/opt/homebrew/bin/brew shellenv)"'
  else
    shellenv_line='eval "$(/usr/local/bin/brew shellenv)"'
  fi

  touch "$HOME/.zprofile"
  if ! grep -Fq "$shellenv_line" "$HOME/.zprofile"; then
    print -- "$shellenv_line" >> "$HOME/.zprofile"
  fi
}

ensure_node() {
  ensure_homebrew

  if ! command -v node >/dev/null 2>&1; then
    info "Node.js not found. Installing node with Homebrew."
    brew install node
  fi

  if ! command -v npm >/dev/null 2>&1; then
    fail "npm not found. Reinstall Node.js 20+ and rerun this script."
  fi

  local major
  major="$(node -p 'Number(process.versions.node.split(".")[0])')"
  if (( major < 20 )); then
    info "Node.js $(node --version) is too old. Upgrading node with Homebrew."
    brew upgrade node || brew install node
    major="$(node -p 'Number(process.versions.node.split(".")[0])')"
    if (( major < 20 )); then
      fail "Node.js 20+ is required. Current version: $(node --version)"
    fi
  fi

  info "Node.js ready: $(node --version), npm $(npm --version)"
}

write_env_file() {
  local provider="$1"
  local openai_key="$2"
  local openai_model="$3"
  local gemini_key="$4"
  local gemini_model="$5"
  local telegram_token="$6"
  local operator_chat_id="$7"
  local port="$8"

  cat > .env <<EOF
NODE_ENV=production
PORT=${port}
DATA_DIR=./data
PROMPT_PATH=./prompts/sales-agent-system.md

LLM_PROVIDER=${provider}
OPENAI_API_KEY=${openai_key}
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=${openai_model}
GEMINI_API_KEY=${gemini_key}
GEMINI_MODEL=${gemini_model}
TEMPERATURE=0.3
MAX_TOKENS=1200

TELEGRAM_BOT_TOKEN=${telegram_token}
TELEGRAM_OPERATOR_CHAT_ID=${operator_chat_id}
CUSTOMER_TELEGRAM_ENABLED=true

REQUIRE_PRICE_APPROVAL=true
PUBLIC_DISCOUNT_LIMIT=0
DEFAULT_CURRENCY=USD
COMPANY_SITE_URL=https://herbaloem.com/
APPROVAL_SLA_HOURS=4
EOF
  chmod 600 .env
}

configure_env_interactive() {
  if ! has_tty; then
    cp .env.example .env
    chmod 600 .env
    fail ".env was created. Edit .env, then rerun deploy/macos/install.sh."
  fi

  print -- ""
  print -- "配置 AI 和 Telegram"
  print -- "------------------"
  print -- "这里输入的 key 只会写入本机 .env 文件，不会写入聊天页面或文档。"
  print -- "如果暂时没有某项，可以直接按回车跳过，之后再编辑 .env。"
  print -- ""

  local current_provider current_openai current_openai_model current_gemini current_gemini_model current_token current_operator current_port
  current_provider="$(env_value LLM_PROVIDER)"
  current_openai="$(env_value OPENAI_API_KEY)"
  current_openai_model="$(env_value OPENAI_MODEL)"
  current_gemini="$(env_value GEMINI_API_KEY)"
  current_gemini_model="$(env_value GEMINI_MODEL)"
  current_token="$(env_value TELEGRAM_BOT_TOKEN)"
  current_operator="$(env_value TELEGRAM_OPERATOR_CHAT_ID)"
  current_port="$(env_value PORT)"

  local provider_choice provider
  print -- "选择模型供应商："
  print -- "1) OpenAI（推荐先用）"
  print -- "2) Gemini"
  print -- "3) 先不填 key，用 stub 测试模式"
  provider_choice="$(prompt_value "输入 1/2/3" "${current_provider:-1}")"
  case "$provider_choice" in
    1|openai|OpenAI) provider="openai" ;;
    2|gemini|Gemini) provider="gemini" ;;
    3|stub|Stub) provider="stub" ;;
    *) provider="openai" ;;
  esac

  local openai_key openai_model gemini_key gemini_model telegram_token operator_chat_id port
  openai_key="$current_openai"
  gemini_key="$current_gemini"
  openai_model="$(prompt_value "OpenAI 模型" "${current_openai_model:-gpt-4.1-mini}")"
  gemini_model="$(prompt_value "Gemini 模型" "${current_gemini_model:-gemini-2.5-flash}")"

  if [[ "$provider" == "openai" ]]; then
    local new_openai
    new_openai="$(prompt_secret "粘贴 OpenAI API Key（已有则回车保留）")"
    openai_key="${new_openai:-$current_openai}"
  elif [[ "$provider" == "gemini" ]]; then
    local new_gemini
    new_gemini="$(prompt_secret "粘贴 Gemini API Key（已有则回车保留）")"
    gemini_key="${new_gemini:-$current_gemini}"
  fi

  local new_token
  new_token="$(prompt_secret "粘贴 Telegram Bot Token（BotFather 提供，已有则回车保留）")"
  telegram_token="${new_token:-$current_token}"
  operator_chat_id="$(prompt_value "负责人 Telegram Chat ID（不知道就先留空，稍后发 /whoami 获取）" "$current_operator")"

  local suggested_port
  suggested_port="${current_port:-$(default_port)}"
  if is_port_busy "$suggested_port"; then
    warn "Port ${suggested_port} is already in use. A different port is recommended."
    suggested_port="$(default_port)"
  fi
  port="$(prompt_value "本地服务端口" "$suggested_port")"

  write_env_file "$provider" "$openai_key" "$openai_model" "$gemini_key" "$gemini_model" "$telegram_token" "$operator_chat_id" "$port"
  info ".env saved."
}

env_needs_configuration() {
  [[ -f .env ]] || return 0
  local provider telegram_token openai_key gemini_key
  provider="$(env_value LLM_PROVIDER)"
  telegram_token="$(env_value TELEGRAM_BOT_TOKEN)"
  openai_key="$(env_value OPENAI_API_KEY)"
  gemini_key="$(env_value GEMINI_API_KEY)"

  [[ -z "$provider" ]] && return 0
  [[ -z "$telegram_token" ]] && return 0
  [[ "$provider" == "openai" && -z "$openai_key" ]] && return 0
  [[ "$provider" == "gemini" && -z "$gemini_key" ]] && return 0
  return 1
}

ensure_env() {
  if env_needs_configuration; then
    configure_env_interactive
  fi

  chmod 600 .env

  if ! grep -Eq '^TELEGRAM_BOT_TOKEN=.+$' .env; then
    warn "TELEGRAM_BOT_TOKEN is empty. Telegram bot will not run until you fill it."
  fi

  if ! grep -Eq '^OPENAI_API_KEY=.+$|^GEMINI_API_KEY=.+$' .env; then
    warn "No LLM API key found. Service will fall back to stub mode if provider key is missing."
  fi
}

install_dependencies() {
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  npm run build
}

write_runner() {
  local node_dir npm_bin project_quoted node_dir_quoted npm_quoted
  node_dir="$(dirname "$(command -v node)")"
  npm_bin="$(command -v npm)"
  project_quoted="${(q)PROJECT_DIR}"
  node_dir_quoted="${(q)node_dir}"
  npm_quoted="${(q)npm_bin}"

  cat > "$RUNNER_PATH" <<EOF
#!/bin/zsh
set -euo pipefail
cd ${project_quoted}
export PATH=${node_dir_quoted}:/opt/homebrew/bin:/usr/local/bin:\$PATH
exec ${npm_quoted} start
EOF
  chmod +x "$RUNNER_PATH"
}

write_launch_agent() {
  mkdir -p "$HOME/Library/LaunchAgents" "$PROJECT_DIR/logs" "$PROJECT_DIR/data"

  local runner_xml stdout_xml stderr_xml
  runner_xml="$(xml_escape "$RUNNER_PATH")"
  stdout_xml="$(xml_escape "$PROJECT_DIR/logs/launchd.out.log")"
  stderr_xml="$(xml_escape "$PROJECT_DIR/logs/launchd.err.log")"

  cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${SERVICE_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
      <string>${runner_xml}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(xml_escape "$PROJECT_DIR")</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${stdout_xml}</string>
    <key>StandardErrorPath</key>
    <string>${stderr_xml}</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>NODE_ENV</key>
      <string>production</string>
    </dict>
  </dict>
</plist>
EOF
}

load_launch_agent() {
  launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
  launchctl load "$PLIST_PATH"
  launchctl start "$SERVICE_LABEL" >/dev/null 2>&1 || true
}

port_from_env() {
  awk -F= '/^PORT=/{gsub(/"/, "", $2); print $2}' .env | tail -n 1
}

main() {
  info "Installing from $PROJECT_DIR"
  ensure_command_line_tools
  ensure_node
  ensure_env
  install_dependencies
  write_runner
  write_launch_agent
  load_launch_agent

  local port
  port="$(port_from_env)"
  port="${port:-8787}"

  info "Installed launch agent: $PLIST_PATH"
  info "Service label: $SERVICE_LABEL"
  info "Health check: curl http://localhost:${port}/health"
  info "Web 控制台: http://localhost:${port}/admin"
  info "Status: zsh deploy/macos/status.sh"
  print -- ""
  print -- "下一步："
  print -- "1. 双击 CONTROL.command。"
  print -- "2. ★ 推荐先选 7 打开网页可视化面板（概览 / 待审批 / 会话 / 消息流 / 工作流图 / 系统配置）。"
  print -- "3. 如果负责人 Chat ID 还没填：给机器人发送 /whoami，再在 CONTROL.command 里选 3 粘贴 chat_id。"
  print -- "4. 给机器人发送 /status，确认 Telegram 工作台在线。"

  if command -v open >/dev/null 2>&1; then
    open "http://localhost:${port}/admin" >/dev/null 2>&1 || true
  fi
}

main "$@"
