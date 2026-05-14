#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h:h}"
ENV_FILE="$PROJECT_DIR/.env"

cd "$PROJECT_DIR"

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
  local existing="${2:-}"
  local answer
  if [[ -n "$existing" ]]; then
    print -n -- "$message [已存在，回车保留]: " >&2
  else
    print -n -- "$message: " >&2
  fi
  read -rs answer
  print -- "" >&2
  print -r -- "${answer:-$existing}"
}

env_value() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 0
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); gsub(/^"|"$/, ""); print; exit }' "$ENV_FILE"
}

write_env_file() {
  local node_env="$1"
  local port="$2"
  local data_dir="$3"
  local prompt_path="$4"
  local provider="$5"
  local openai_key="$6"
  local openai_base_url="$7"
  local openai_model="$8"
  local gemini_key="$9"
  local gemini_model="${10}"
  local temperature="${11}"
  local max_tokens="${12}"
  local telegram_token="${13}"
  local operator_chat_id="${14}"
  local customer_telegram_enabled="${15}"
  local require_price_approval="${16}"
  local public_discount_limit="${17}"
  local default_currency="${18}"
  local company_site_url="${19}"
  local approval_sla_hours="${20}"

  cat > "$ENV_FILE" <<EOF
NODE_ENV=${node_env}
PORT=${port}
DATA_DIR=${data_dir}
PROMPT_PATH=${prompt_path}

LLM_PROVIDER=${provider}
OPENAI_API_KEY=${openai_key}
OPENAI_BASE_URL=${openai_base_url}
OPENAI_MODEL=${openai_model}
GEMINI_API_KEY=${gemini_key}
GEMINI_MODEL=${gemini_model}
TEMPERATURE=${temperature}
MAX_TOKENS=${max_tokens}

TELEGRAM_BOT_TOKEN=${telegram_token}
TELEGRAM_OPERATOR_CHAT_ID=${operator_chat_id}
CUSTOMER_TELEGRAM_ENABLED=${customer_telegram_enabled}

REQUIRE_PRICE_APPROVAL=${require_price_approval}
PUBLIC_DISCOUNT_LIMIT=${public_discount_limit}
DEFAULT_CURRENCY=${default_currency}
COMPANY_SITE_URL=${company_site_url}
APPROVAL_SLA_HOURS=${approval_sla_hours}
EOF
  chmod 600 "$ENV_FILE"
}

print -- "配置中心"
print -- "--------"
print -- "这里可以调整当前服务的全部 .env 配置。Key 不会显示，回车会保留已有 key。"
print -- ""

node_env="$(prompt_value "NODE_ENV" "$(env_value NODE_ENV || true || print production)")"
node_env="${node_env:-production}"
port="$(prompt_value "本地服务端口 PORT" "$(env_value PORT || true || print 8787)")"
port="${port:-8787}"
data_dir="$(prompt_value "数据目录 DATA_DIR" "$(env_value DATA_DIR || true || print ./data)")"
data_dir="${data_dir:-./data}"
prompt_path="$(prompt_value "系统提示词 PROMPT_PATH" "$(env_value PROMPT_PATH || true || print ./prompts/sales-agent-system.md)")"
prompt_path="${prompt_path:-./prompts/sales-agent-system.md}"

print -- ""
print -- "模型供应商：1 OpenAI / 2 Gemini / 3 stub 测试模式"
provider_current="$(env_value LLM_PROVIDER || true)"
provider_choice="$(prompt_value "选择供应商" "${provider_current:-openai}")"
case "$provider_choice" in
  1|openai|OpenAI) provider="openai" ;;
  2|gemini|Gemini) provider="gemini" ;;
  3|stub|Stub) provider="stub" ;;
  *) provider="openai" ;;
esac

openai_key="$(prompt_secret "OpenAI API Key" "$(env_value OPENAI_API_KEY || true)")"
openai_base_url="$(prompt_value "OpenAI Base URL" "$(env_value OPENAI_BASE_URL || true || print https://api.openai.com/v1)")"
openai_base_url="${openai_base_url:-https://api.openai.com/v1}"
openai_model="$(prompt_value "OpenAI 模型" "$(env_value OPENAI_MODEL || true || print gpt-4.1-mini)")"
openai_model="${openai_model:-gpt-4.1-mini}"
gemini_key="$(prompt_secret "Gemini API Key" "$(env_value GEMINI_API_KEY || true)")"
gemini_model="$(prompt_value "Gemini 模型" "$(env_value GEMINI_MODEL || true || print gemini-2.5-flash)")"
gemini_model="${gemini_model:-gemini-2.5-flash}"
temperature="$(prompt_value "Temperature" "$(env_value TEMPERATURE || true || print 0.3)")"
temperature="${temperature:-0.3}"
max_tokens="$(prompt_value "Max Tokens" "$(env_value MAX_TOKENS || true || print 1200)")"
max_tokens="${max_tokens:-1200}"

print -- ""
telegram_token="$(prompt_secret "Telegram Bot Token" "$(env_value TELEGRAM_BOT_TOKEN || true)")"
operator_chat_id="$(prompt_value "负责人 Telegram Chat ID" "$(env_value TELEGRAM_OPERATOR_CHAT_ID || true)")"
customer_telegram_enabled="$(prompt_value "允许客户直接发 Telegram 给机器人 CUSTOMER_TELEGRAM_ENABLED" "$(env_value CUSTOMER_TELEGRAM_ENABLED || true || print true)")"
customer_telegram_enabled="${customer_telegram_enabled:-true}"

print -- ""
require_price_approval="$(prompt_value "价格必须审批 REQUIRE_PRICE_APPROVAL" "$(env_value REQUIRE_PRICE_APPROVAL || true || print true)")"
require_price_approval="${require_price_approval:-true}"
public_discount_limit="$(prompt_value "AI 可自行承诺折扣上限 PUBLIC_DISCOUNT_LIMIT" "$(env_value PUBLIC_DISCOUNT_LIMIT || true || print 0)")"
public_discount_limit="${public_discount_limit:-0}"
default_currency="$(prompt_value "默认币种 DEFAULT_CURRENCY" "$(env_value DEFAULT_CURRENCY || true || print USD)")"
default_currency="${default_currency:-USD}"
company_site_url="$(prompt_value "公司网站 COMPANY_SITE_URL" "$(env_value COMPANY_SITE_URL || true || print https://herbaloem.com/)")"
company_site_url="${company_site_url:-https://herbaloem.com/}"
approval_sla_hours="$(prompt_value "审批 SLA 小时 APPROVAL_SLA_HOURS" "$(env_value APPROVAL_SLA_HOURS || true || print 4)")"
approval_sla_hours="${approval_sla_hours:-4}"

write_env_file \
  "$node_env" "$port" "$data_dir" "$prompt_path" "$provider" \
  "$openai_key" "$openai_base_url" "$openai_model" "$gemini_key" "$gemini_model" \
  "$temperature" "$max_tokens" "$telegram_token" "$operator_chat_id" "$customer_telegram_enabled" \
  "$require_price_approval" "$public_discount_limit" "$default_currency" "$company_site_url" "$approval_sla_hours"

print -- ""
print -- "配置已保存到 .env。"
