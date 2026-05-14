# 大健康 AI 销售 Agent Gateway

这是给 Mac mini 本地部署的 AI 销售客服骨架，目标是 24 小时运行，并通过 Telegram 机器人 + 本地网页可视化控制台实现人工审批、人工打断、接管和回复。

- **最终用户/老板请先看**：[USER_GUIDE.md](USER_GUIDE.md) / [USER_GUIDE.pdf](USER_GUIDE.pdf)（双击安装、注册自己的 Telegram Bot、防"已读不回"、网页面板、负责人指令）
- **English user guide**: [USER_GUIDE_EN.md](USER_GUIDE_EN.md) / [USER_GUIDE_EN.pdf](USER_GUIDE_EN.pdf)
- **技术人员部署请看**：[MAC_MINI_INSTALL.md](MAC_MINI_INSTALL.md)
- 客户如果不会命令行，解压后先双击根目录的 `INSTALL.command`，日常配置和状态查看统一双击 `CONTROL.command`。

## 一图看全：本地网页可视化控制台

服务启动后，浏览器打开 `http://localhost:<PORT>/admin` 即可看到：

控制台右上角有语言切换，可在 **中文 / English** 之间切换，选择会保存到当前浏览器。

- **概览**：在线状态、运行时长、活跃会话/总会话/待审批/总消息、最老待审批分钟数、近 24 小时消息与审批趋势曲线、会话状态/渠道/审批类型/风险类型分布柱状图。
- **待审批**：每条审批展开看客户原话与建议回复，一键“批准并发送 / 拒绝 / 人工接管 / 改写后人工回复”。
- **会话**：所有会话列表 + 单会话详情面板（消息时间线 + 关联审批 + 暂停/恢复/接管/人工回复操作）。
- **消息流**：跨会话最近 100 条消息（客户/AI/人工/系统按颜色区分），点击会话名跳转详情。
- **工作流图**：客户消息 → AI 自动 → 触发审批 → 人工回复 的端到端漏斗 + 风险路由规则表。
- **系统/配置**：当前 PID、端口、LLM 供应商、各 Key 是否已配置、价格审批/折扣上限/币种/SLA 等。

无需再开终端。控制台菜单第 7 项可一键打开。


## 能力范围

- Telegram 客户接待：客户给 Bot 发消息，Agent 自动回复或进入审批。
- Telegram 人工工作台：负责人在指定 operator chat 中审批、拒绝、接管、暂停、恢复、人工回复。
- 价格强审批：价格、折扣、付款条款默认必须人工审批。
- 大健康合规保护：医疗功效、疾病治疗、投诉、证书、合同等自动转人工。
- 事件持久化：会话、消息、审批记录写入 `data/*.jsonl`，服务重启后可恢复。
- 本地 HTTP API：独立站可先调用 `/webhooks/site/message` 做模拟接入。
- 24 小时部署：支持 Docker Compose `restart: unless-stopped`，并提供 macOS launchd 模板。

## 快速启动

1. 安装 Node.js 20+。
2. 创建配置文件：

```bash
cp .env.example .env
```

3. 填写 `.env`：

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
TELEGRAM_BOT_TOKEN=
TELEGRAM_OPERATOR_CHAT_ID=
```

也可以用 Gemini：

```bash
LLM_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

4. 安装并运行：

```bash
npm install
npm run dev
```

5. 检查健康状态：

```bash
curl http://localhost:8787/health
```

如果客户 Mac mini 上 `8787` 已被占用，把 `.env` 里的 `PORT` 改成例如 `8790`。使用 Docker Compose 时，也要同步修改 `compose.yaml` 的端口映射，例如 `8790:8790`。

## Telegram 设置

1. 在 Telegram 找 `@BotFather` 创建机器人，拿到 `TELEGRAM_BOT_TOKEN`。
2. 先只填 `TELEGRAM_BOT_TOKEN`，启动服务。
3. 用负责人账号给机器人发送 `/whoami`。
4. 把返回的 `chat_id` 填入 `.env` 的 `TELEGRAM_OPERATOR_CHAT_ID`。
5. 重启服务。

常用命令：

```text
/whoami
/status
/sessions
/pause <sessionId> [reason]
/resume <sessionId>
/takeover <sessionId>
/approve <approvalId>
/reject <approvalId> [reason]
/reply <sessionId> <message>
```

人工打断逻辑：

- `/pause <sessionId>`：暂停 AI，客户新消息只转发给负责人。
- `/takeover <sessionId>`：人工接管，AI 不再自动回复。
- `/reply <sessionId> <message>`：负责人直接发给客户，并清掉待审批状态。
- `/resume <sessionId>`：恢复 AI 自动接待。
- 审批消息里也有 `Approve`、`Take over`、`Reject` 按钮。

## 24 小时运行

Docker Compose：

```bash
docker compose up -d --build
docker compose logs -f
```

服务配置了：

```yaml
restart: unless-stopped
```

所以 Docker 启动后会自动拉起服务。Mac mini 重启后，如果 Docker Desktop/OrbStack 会自动启动，容器也会继续运行。

launchd 模板在：

```text
deploy/macos/com.herbaloem.agent-gateway.plist.template
```

使用时复制到 `~/Library/LaunchAgents/com.herbaloem.agent-gateway.plist`，把 `/ABSOLUTE/PATH/TO/fde2` 改成项目绝对路径，然后执行：

```bash
launchctl load ~/Library/LaunchAgents/com.herbaloem.agent-gateway.plist
launchctl start com.herbaloem.agent-gateway
```

## 独立站模拟接入

```bash
curl -X POST http://localhost:8787/webhooks/site/message \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"site-user-1","text":"Hello, what is your MOQ?","displayName":"Demo Customer","locale":"en"}'
```

返回里如果有 `customerReply`，独立站可以直接展示；如果状态是 `waiting_approval`，负责人会在 Telegram 收到审批请求。

## 密钥原则

- 不要把真实 key 写入代码、HTML、README 或截图。
- `.env` 已被 `.gitignore` 忽略。
- 正式部署建议把 key 放到 macOS Keychain、Docker secret、1Password CLI 或受控的部署系统。
- 如果 key 出现在聊天或日志中，立即去供应商控制台轮换。
