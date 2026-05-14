# 全新 Mac mini 小白安装说明

这份说明给“不会命令行”的客户使用。推荐流程是：技术人员先打包，客户把压缩包放到 Mac mini，解压后先双击 `INSTALL.command` 安装，再用 `CONTROL.command` 做所有配置、状态查看、日志查看、启动、停止和卸载。

## 0. 安装前准备清单

客户需要准备：

- 一台已联网的 Mac mini。
- Mac 的开机密码，安装 Homebrew 时可能会要求输入。
- 一个新的 OpenAI API Key 或 Gemini API Key。
- 一个 Telegram 账号。
- 一个 Telegram Bot Token，通过 `@BotFather` 创建。
- 负责人自己的 Telegram 账号，用来接收审批和人工打断消息。

技术人员需要提前准备：

- 当前项目打包出的 `.tgz` 文件。
- 客户要使用的模型供应商：OpenAI 或 Gemini。
- 如果客户现场不方便注册 API Key，提前帮客户在供应商控制台创建新的 key。

重要：不要使用出现在聊天记录、截图、文档里的旧 key。上线前请使用新生成的 key。

## 1. 技术人员打包

在当前项目目录运行：

```bash
zsh deploy/macos/package.sh
```

会生成类似下面的文件：

```text
/Users/linlin/Desktop/health-ai-sales-agent-20260514-131226.tgz
```

这个包不会包含：

- `.env`
- API Key
- `node_modules`
- `dist`
- `data`
- `logs`

把这个 `.tgz` 文件传给客户，可用 AirDrop、U 盘、微信文件、网盘、局域网共享或远程工具。

## 2. 客户在 Mac mini 上解压

推荐让客户把压缩包放在“下载”文件夹。

完全不用命令行的方式：

1. 打开“下载”文件夹。
2. 双击 `health-ai-sales-agent-xxxx.tgz`。
3. macOS 会解压出一个文件夹。
4. 把这个文件夹改名为 `health-ai-sales-agent`。
5. 打开 Finder 左侧的个人主目录。
6. 如果没有 `Apps` 文件夹，就新建一个 `Apps` 文件夹。
7. 把 `health-ai-sales-agent` 文件夹拖进 `Apps` 文件夹。
8. 打开 `health-ai-sales-agent` 文件夹，继续下一步双击安装。

技术人员远程操作时，也可以用命令行：

打开“终端”执行以下命令：

```bash
mkdir -p ~/Apps/health-ai-sales-agent
tar -xzf ~/Downloads/health-ai-sales-agent-*.tgz -C ~/Apps/health-ai-sales-agent
open ~/Apps/health-ai-sales-agent
```

如果客户完全不会打开终端，技术人员可以远程帮他执行这一段。执行后 Finder 会打开项目文件夹。

## 3. 双击安装

在打开的项目文件夹里，双击：

```text
INSTALL.command
```

如果 macOS 提示“无法打开，因为来自身份不明的开发者”：

1. 按住 `Control` 键。
2. 点击 `INSTALL.command`。
3. 选择“打开”。
4. 再点一次“打开”。

安装脚本会自动做这些事：

- 检查并安装 Xcode Command Line Tools。
- 检查并安装 Homebrew。
- 检查并安装 Node.js 20+ 和 npm。
- 创建 `.env` 配置文件。
- 引导输入 OpenAI/Gemini Key。
- 引导输入 Telegram Bot Token。
- 安装 Node 依赖。
- 编译 TypeScript 服务。
- 生成本机运行脚本。
- 注册 macOS LaunchAgent。
- 设置登录后自动启动。
- 输出健康检查地址。

安装过程中，如果系统要求输入 Mac 密码，正常输入即可。Terminal 不显示密码字符，这是正常现象。

## 3.1 日常只记住一个入口

安装完成后，客户只需要记住这个文件：

```text
CONTROL.command
```

双击后会出现菜单：

```text
1) 安装/重新安装服务
2) 配置全部信息 (.env)
3) 设置负责人 Telegram Chat ID
4) 启动服务
5) 停止服务
6) 查看状态/进程/日志
7) 打开本地 Web 状态页
8) 查看实时日志
9) 卸载系统服务
0) 退出
```

这个菜单就是本地控制台。以后改 API Key、改模型、改 Telegram、看服务有没有运行，都从这里进。

## 4. 安装向导会问什么

脚本会依次询问：

```text
选择模型供应商：1 OpenAI / 2 Gemini / 3 stub 测试模式
OpenAI 模型
Gemini 模型
OpenAI API Key 或 Gemini API Key
Telegram Bot Token
负责人 Telegram Chat ID
本地服务端口
```

建议先这样填：

OpenAI 方案：

```text
模型供应商：1
OpenAI 模型：gpt-4.1-mini
OpenAI API Key：粘贴新的 OpenAI key
Telegram Bot Token：粘贴 BotFather 给的 token
负责人 Telegram Chat ID：先留空
本地服务端口：直接回车
```

Gemini 方案：

```text
模型供应商：2
Gemini 模型：gemini-2.5-flash
Gemini API Key：粘贴新的 Gemini key
Telegram Bot Token：粘贴 BotFather 给的 token
负责人 Telegram Chat ID：先留空
本地服务端口：直接回车
```

如果 `8787` 端口被占用，脚本会建议其他端口，例如 `8790`。

## 5. 创建 Telegram Bot Token

如果还没有 Telegram Bot Token，按下面做：

1. 打开 Telegram。
2. 搜索 `@BotFather`。
3. 发送 `/newbot`。
4. 按提示输入机器人名称，例如 `Herbaloem Sales Agent`。
5. 按提示输入机器人用户名，必须以 `bot` 结尾，例如 `herbaloem_sales_agent_bot`。
6. BotFather 会返回一串 token。
7. 把 token 粘贴到安装向导的 `Telegram Bot Token`。

这个 token 不要发给无关人员。

## 6. 配置负责人 Chat ID

第一次安装时，`负责人 Telegram Chat ID` 可以先留空。

安装完成后：

1. 用负责人 Telegram 账号打开刚创建的机器人。
2. 给机器人发送：

```text
/whoami
```

3. 机器人会回复：

```text
chat_id: 123456789
```

4. 打开项目文件夹，双击 `CONTROL.command`。

5. 选择：

```text
3) 设置负责人 Telegram Chat ID
```

6. 把 `/whoami` 返回的 `chat_id` 粘贴进去。

7. 脚本会自动写入 `.env` 并重启服务。

也可以直接双击旧的快捷入口：

```text
SET_OPERATOR.command
```

如果技术人员想手动配置，也可以打开项目里的 `.env` 文件：

```bash
open -e ~/Apps/health-ai-sales-agent/.env
```

找到这一行：

```bash
TELEGRAM_OPERATOR_CHAT_ID=
```

改成：

```bash
TELEGRAM_OPERATOR_CHAT_ID=123456789
```

保存文件后重启服务：

```bash
cd ~/Apps/health-ai-sales-agent
zsh deploy/macos/stop.sh
zsh deploy/macos/start.sh
```

## 7. 验证是否安装成功

在项目目录运行：

```bash
zsh deploy/macos/status.sh
```

或者打开浏览器访问：

```text
http://localhost:8787/health
```

如果安装时用了 `8790`，访问：

```text
http://localhost:8790/health
```

成功时会看到类似：

```json
{"ok":true,"nodeEnv":"production","llmProvider":"openai","activeSessions":0,"pendingApprovals":0}
```

然后在负责人 Telegram 里给机器人发送：

```text
/status
```

如果机器人回复运行状态，说明 Telegram 人工工作台可用。

也可以双击 `CONTROL.command`，选择：

```text
6) 查看状态/进程/日志
7) 打开本地 Web 状态页
```

Web 状态页会显示：

- 服务是否在线。
- 运行时长。
- 当前模型供应商。
- OpenAI/Gemini/Telegram/负责人 ID 是否已配置。
- 活跃会话数量。
- 待审批数量。
- 最近会话和审批列表。

## 8. 负责人日常命令

负责人只需要记住这些 Telegram 命令：

```text
/status
/sessions
/pause <sessionId> [reason]
/resume <sessionId>
/takeover <sessionId>
/approve <approvalId>
/reject <approvalId> [reason]
/reply <sessionId> <message>
```

常见操作：

- 客户问价格：AI 自动转审批。
- 点 `Approve`：批准 AI 拟回复并发给客户。
- 点 `Take over`：人工接管该客户。
- 点 `Reject`：拒绝 AI 拟回复，转人工。
- `/pause <sessionId>`：暂停 AI 自动回复。
- `/reply <sessionId> <message>`：负责人直接发消息给客户。
- `/resume <sessionId>`：恢复 AI 自动回复。

## 9. 独立站接入测试

先用下面命令模拟独立站客户消息：

```bash
curl -X POST http://localhost:8787/webhooks/site/message \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"site-user-1","text":"Hello, what is your MOQ?","displayName":"Demo Customer","locale":"en"}'
```

价格询问测试：

```bash
curl -X POST http://localhost:8787/webhooks/site/message \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"site-user-2","text":"What is your best price for 500 units?","displayName":"Buyer","locale":"en"}'
```

价格询问应该进入 `waiting_approval`，负责人 Telegram 应收到审批提醒。

如果端口不是 `8787`，把命令里的 `8787` 改成实际端口。

## 10. 开机自启说明

安装脚本会自动注册 macOS LaunchAgent：

```text
com.herbaloem.agent-gateway
```

Mac mini 重启并登录后，服务会自动启动。

如果客户希望断电恢复后也自动运行，建议：

1. 系统设置。
2. 节能或电池设置。
3. 打开“断电后自动启动”相关选项，如果当前 macOS 版本提供该选项。
4. 保持 Mac mini 登录到运行该服务的用户账号。

## 11. 日常运维

启动：

```bash
cd ~/Apps/health-ai-sales-agent
zsh deploy/macos/start.sh
```

停止：

```bash
cd ~/Apps/health-ai-sales-agent
zsh deploy/macos/stop.sh
```

查看状态：

```bash
cd ~/Apps/health-ai-sales-agent
zsh deploy/macos/status.sh
```

查看日志：

```bash
cd ~/Apps/health-ai-sales-agent
tail -f logs/launchd.out.log
tail -f logs/launchd.err.log
```

重新运行安装向导：

```bash
cd ~/Apps/health-ai-sales-agent
zsh deploy/macos/install.sh
```

## 12. 更新版本

技术人员给客户一个新的 `.tgz` 后，在 Mac mini 上执行：

```bash
cd ~/Apps/health-ai-sales-agent
zsh deploy/macos/stop.sh
cd ..
mv health-ai-sales-agent health-ai-sales-agent-backup-$(date +%Y%m%d-%H%M%S)
mkdir -p health-ai-sales-agent
tar -xzf ~/Downloads/health-ai-sales-agent-*.tgz -C health-ai-sales-agent
cp health-ai-sales-agent-backup-*/.env health-ai-sales-agent/.env
cd health-ai-sales-agent
zsh deploy/macos/install.sh
```

更新不会把旧 `.env` 放进压缩包，所以要从备份目录复制回来。

## 13. 常见问题

### 双击 `INSTALL.command` 没反应

右键或按住 `Control` 点击 `INSTALL.command`，选择“打开”。

如果仍然不行，打开终端运行：

```bash
cd ~/Apps/health-ai-sales-agent
chmod +x INSTALL.command deploy/macos/*.sh
./INSTALL.command
```

### 安装时要求输入密码

这是安装 Homebrew 或 Apple 工具时的正常行为。输入 Mac 开机密码后按回车。Terminal 不显示密码字符。

### `/health` 打不开

先查状态：

```bash
cd ~/Apps/health-ai-sales-agent
zsh deploy/macos/status.sh
```

再看日志：

```bash
tail -n 80 logs/launchd.err.log
```

如果端口被占用，编辑 `.env`：

```bash
open -e .env
```

把：

```bash
PORT=8787
```

改成：

```bash
PORT=8790
```

然后重启：

```bash
zsh deploy/macos/stop.sh
zsh deploy/macos/start.sh
```

### Telegram 没有回复

检查 `.env` 里是否有：

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_OPERATOR_CHAT_ID=...
```

然后重启服务。

### AI 不调用 OpenAI 或 Gemini

检查 `.env`：

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=...
```

或：

```bash
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
```

如果 key 为空，服务会回退到 stub 测试模式。

### 想完全卸载

```bash
cd ~/Apps/health-ai-sales-agent
zsh deploy/macos/stop.sh
launchctl unload ~/Library/LaunchAgents/com.herbaloem.agent-gateway.plist 2>/dev/null || true
rm -f ~/Library/LaunchAgents/com.herbaloem.agent-gateway.plist
cd ~
rm -rf ~/Apps/health-ai-sales-agent
```

## 14. 上线前检查清单

- Mac mini 已联网。
- macOS 已更新。
- FileVault 已开启。
- `.env` 已填写新 API Key。
- `.env` 权限是 `600`。
- `TELEGRAM_BOT_TOKEN` 已填写。
- `TELEGRAM_OPERATOR_CHAT_ID` 已填写。
- `/health` 返回 `ok: true`。
- Telegram `/status` 可用。
- 价格问题会进入审批，不会直接报价。
- 医疗功效、投诉、合同修改会转人工。
- 不把 `8787` 或 `8790` 直接暴露到公网。
- 远程维护建议使用 Tailscale 或 VPN。
- 真实客户上线前，用 20 条普通询盘和 20 条高风险询盘测试。
