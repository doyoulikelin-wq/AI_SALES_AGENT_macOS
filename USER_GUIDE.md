# 大健康 AI 销售 Agent — 用户使用说明书

> 适合人群：**Mac mini 的最终使用者（老板 / 销售负责人）**。
> 全程双击鼠标即可，不需要懂命令行。技术人员请额外阅读 [MAC_MINI_INSTALL.md](MAC_MINI_INSTALL.md)。

---

## 目录

1. 它是什么 / 工作原理一图看全
2. 开箱前你要准备什么
3. 第一步：注册你自己的 Telegram Bot（最重要）
4. 第二步：在 Mac mini 上安装
5. 第三步：把"负责人"绑定到机器人
6. 第四步：让真实客户开始用（重点：避免"已读不回"）
7. 日常使用：网页可视化面板
8. 日常使用：Telegram 上的负责人指令
9. 常见问题
10. 你必须遵守的安全准则

---

## 1. 它是什么

一个跑在你 **自己的 Mac mini** 上的 AI 销售客服。客户通过 Telegram 机器人或你的独立站找你询盘，AI 自动用合规话术应答；遇到 **价格、医疗功效、投诉、合同** 等敏感话题时，**不会自作主张**，而是把"建议回复"发到你的 Telegram，你点一下「Approve」才会回给客户。

### 数据流

```
真实客户 ──► Telegram Bot ──► Mac mini 上的 Agent ──► OpenAI / Gemini
                                       │
                                       │ 普通问题：直接回客户
                                       │
                                       └─ 敏感问题 ──► 推送到"负责人 Telegram"
                                                            │
                                                            └─ 你点 Approve / Reject / Take over
                                                                          │
                                                                          ▼
                                                                    回复客户
```

所有会话、消息、审批 **只存在你 Mac mini 的本地磁盘上**（`data/*.jsonl`）。我们不上传任何数据到第三方。

---

## 2. 准备工作

请提前准备好下面这些东西：

| 项目 | 说明 | 哪里拿 |
|---|---|---|
| Mac mini | 已联网，已登录到日常使用账号 | — |
| Mac 开机密码 | 安装 Homebrew 时会问 | — |
| OpenAI API Key（推荐）| 形如 `sk-proj-...` | https://platform.openai.com/api-keys |
| 或 Gemini API Key | 形如 `AIza...` | https://aistudio.google.com/app/apikey |
| 一个 Telegram 账号 | 用来注册机器人 | App Store 下载 Telegram |
| 一个 Telegram Bot Token | 见下一节，**5 分钟即可申请** | BotFather |
| 你本人的 Telegram Chat ID | 安装完成后用 `/whoami` 获取 | 见第 5 节 |
| 安装包 `health-ai-sales-agent-*.tgz` | 技术人员发给你 | — |

> 重要：**不要复用别人给过你的、出现过在聊天/截图/邮件里的 API Key**。每次部署用全新的 key，旧的去控制台 Revoke。

---

## 3. 注册你自己的 Telegram Bot

**这一步只做一次，全程在 Telegram 里完成**。机器人是"你的资产"，token 拿到后请妥善保管。

### 3.1 找到 BotFather

1. 打开 Telegram。
2. 顶部搜索框输入：`@BotFather`
3. 选择**带蓝色对勾**的官方那一个（用户名就是 `BotFather`）。
4. 点击 **Start**。

### 3.2 创建一个新 Bot

1. 在和 BotFather 的对话里发送：

   ```text
   /newbot
   ```

2. BotFather 问 **"Alright, a new bot. How are we going to call it?"** —— 回复一个 **显示名称**，例如：

   ```text
   Herbaloem 销售客服
   ```

   这个名字客户会看到，可以包含中文/空格。

3. BotFather 问 **"Good. Now let's choose a username for your bot."** —— 回复一个 **以 bot 结尾的英文用户名**，例如：

   ```text
   herbaloem_sales_bot
   ```

   - 必须全局唯一，被占用就换一个。
   - 必须以 `bot` 或 `Bot` 结尾。
   - 长度不少于 5 个字符。
   - 客户用 `https://t.me/herbaloem_sales_bot` 这个链接来找你。

4. 创建成功后，BotFather 会发出来一段类似这样的消息：

   ```text
   Done! Congratulations on your new bot.
   ...
   Use this token to access the HTTP API:
   1234567890:ABCDEF_example_replace_with_your_token

   Keep your token secure and store it safely, ...
   ```

   **`1234567890:ABCDEF_example_replace_with_your_token` 这一串就是 Bot Token 示例**；请粘贴 BotFather 给你的真实 Token。

   **复制下来，存到密码管理器里。任何人拿到这个 token 都能冒充你的机器人。**

### 3.3 把机器人调成"接收所有消息"（必做）

默认情况下，群组里的机器人只能看到 `/` 开头的指令；私聊不受影响，但建议立刻切到"全部消息可见"，避免以后拉群时漏消息。

1. 在 BotFather 对话里发送：

   ```text
   /setprivacy
   ```

2. 选刚才创建的机器人。
3. 选 **Disable**。

### 3.4 推荐再做的优化（可选但建议）

在 BotFather 里继续：

| 指令 | 用途 | 建议填写 |
|---|---|---|
| `/setdescription` | 客户在 Telegram 搜到 bot 时看到的简介 | "24×7 AI 询盘助手 - 价格请等待人工审核" |
| `/setabouttext` | bot 资料页"About"栏 | "Herbaloem AI Agent" |
| `/setuserpic` | bot 头像 | 上传你公司 LOGO |
| `/setcommands` | 客户输入 `/` 时弹出的菜单 | 见下方代码块 |

`/setcommands` 推荐发送：

```text
start - 开始咨询
help - 联系人工
```

> 客户面对的是"咨询入口"，不要把 `/approve`、`/reply` 这种 **负责人后台命令** 加到客户菜单里。这些命令的权限由系统在内部自动判断（只允许"负责人 Chat ID"使用）。

---

## 4. 在 Mac mini 上安装

### 4.1 解压

1. 把技术人员发给你的 `health-ai-sales-agent-xxxxxxxx-xxxxxx.tgz` 放到 **下载** 文件夹。
2. 双击它 —— macOS 会自动解压出一个文件夹。
3. 把解压出来的文件夹改名为 `health-ai-sales-agent`，拖到你的"个人主目录 → Apps"下（如果没有 Apps 文件夹，自己新建一个）。
4. 双击 `health-ai-sales-agent` 进去。

### 4.2 第一次安装

双击根目录里的：

```text
INSTALL.command
```

如果系统弹"无法打开，因为来自身份不明的开发者"：

1. **按住 Control 键** 点击 `INSTALL.command`。
2. 选 **打开**。
3. 再次确认 **打开**。

安装窗口里会按顺序问你：

```text
选择模型供应商： 1) OpenAI   2) Gemini   3) 测试模式
OpenAI 模型 [gpt-4.1-mini]：       ← 直接回车用默认
粘贴 OpenAI API Key：              ← 粘贴第 2 节准备好的 key（不会显示在屏幕上）
粘贴 Telegram Bot Token：           ← 粘贴第 3 节 BotFather 给你的 token
负责人 Telegram Chat ID：           ← 第一次先回车跳过，第 5 节再补
本地服务端口 [8787]：               ← 直接回车
```

> 输入 API Key / Token 时屏幕**不会显示**任何字符，这是 macOS 的安全机制，不是卡住，正常粘贴然后回车即可。

安装结束后，浏览器会自动打开 `http://localhost:8787/admin` —— 这是你的 **本地控制台**。

---

## 5. 绑定负责人

> 负责人 = **接收审批通知 + 点 Approve / Reject 的那个 Telegram 账号**，通常就是你自己。

### 5.1 拿到自己的 Chat ID

1. 在 Telegram 搜你刚创建的机器人（用 `@herbaloem_sales_bot` 或你自己起的用户名）。
2. 点 **Start**。
3. 给机器人发送：

   ```text
   /whoami
   ```

4. 机器人秒回：

   ```text
   chat_id: 6103474891
   ```

   这串数字就是 **你的 Chat ID**。

### 5.2 把 Chat ID 写入系统

回到 Mac mini，**双击项目根目录里的**：

```text
CONTROL.command
```

弹出菜单，选：

```text
3) 设置负责人 Telegram Chat ID
```

把刚才那串数字粘贴进去，回车。脚本会自动写入 `.env` 并重启服务。

### 5.3 验证

在 Telegram 里继续给机器人发：

```text
/status
```

如果回复 "Agent status: running ..."，**绑定成功**。

如果回复 "This command is only available to the operator chat."，说明 Chat ID 写错了或服务还没重启完，等 5 秒再试。

---

## 6. 让真实客户开始用

> 这是用户最关心的一节。**前一版有一个 bug：负责人在 Telegram 上点 Approve 时如果遇到独立站客户，机器人会崩溃，导致后续所有客户消息都"已读不回"**。**当前版本已经修复**，但你仍然需要遵守下面的"上线前 5 个检查"，确保上线就稳。

### 6.1 把 bot 链接发给客户

客户访问：

```text
https://t.me/<你的-bot-用户名>
```

例如 `https://t.me/herbaloem_sales_bot`，点 Start，就能开始聊。

你也可以把上面的链接做成二维码、放到独立站底部、邮件签名、名片上。

### 6.2 客户体验

- 客户发"Hi, I want 500 units of turmeric powder to Germany" → AI 几秒内回复，问规格和联系方式。
- 客户发"What's your best price?" → AI **不会自己报价**，会回复 "Let me check with our team and get back to you shortly"，**同时把审批卡推给你**。
- 客户发"Can it cure diabetes?" → AI 不会回答疗效，自动转人工。
- 客户问普通问题（MOQ、包装、产地、认证）→ AI 直接回。

### 6.3 ★ 上线前必做的 5 个检查（防止"已读不回"）

在告诉真实客户之前，**用第二个 Telegram 账号（或同事的账号）跑一遍这个流程**：

| # | 操作 | 期待结果 |
|---|---|---|
| 1 | 用副号/朋友号给 bot 发 "hello" | 副号几秒内收到 AI 英文回复 |
| 2 | 副号继续发 "what is your best price for 1000 units?" | 副号收到 "Let me check with our team..."；同时你的主号收到一张带 [Approve][Take over][Reject] 按钮的审批卡 |
| 3 | **你的主号点 [Approve]** | 主号收到 "Approved ses_xxx. Delivery: sent to customer"；副号收到 AI 拟好的报价回复 |
| 4 | 副号再发 "thanks, can it cure cancer?" | 副号收到 "Let me transfer you to a human"；主号收到"queued for human"提醒 |
| 5 | 主号在 Telegram 发 `/reply <sessionId> Sorry, we can't make medical claims.` | 副号收到这条人工回复 |

如果第 1-5 步全部通过，就可以正式对外。

### 6.4 如果第 3 步副号没收到 Approve 后的内容怎么办

打开 Mac mini 上的 `CONTROL.command` → 选 **8) 查看实时日志**，找下面两类信息：

- 出现 `"customer delivery skipped"` + reason —— 说明审批的会话其实是独立站会话，不是 Telegram；这种情况主号会看到 `Delivery: skipped (channel site has no outbound delivery)` 字样，**这是正常的**，独立站会从 `/webhooks/site/message` 拉走回复。
- 出现 `"telegram handler crashed"` —— 把这一行截图发给技术人员，**已修复后理论上不会再出现**。
- 出现 `"telegram delivery failed"` —— 检查 bot 是否被客户拉黑、token 是否被 BotFather Revoke。

---

## 7. 网页可视化面板

地址：`http://localhost:<端口>/admin`（默认 8787，如果换过端口看 INSTALL 时显示的那个）。

直接双击 `CONTROL.command` 选 **7** 也能一键打开。

六个标签页：

| 标签 | 作用 |
|---|---|
| **概览** | 服务在线状态、运行时长、活跃/总会话/待审批/总消息、近 24 小时趋势曲线、状态分布柱状图 |
| **待审批** | 看到客户原话和 AI 拟回复，**网页上也可以一键 Approve / Reject / Take over / 改写后人工回复**，不必非要用手机 Telegram |
| **会话** | 所有客户列表 + 单会话消息时间线 + 暂停/恢复/接管/回复 |
| **消息流** | 全局最近 100 条消息（客户/AI/人工/系统按颜色区分） |
| **工作流图** | 端到端流程漏斗 + 风险路由规则表 |
| **系统/配置** | PID、端口、模型供应商、各 Key 是否已配置 |

页面每 5 秒自动刷新。

---

## 8. Telegram 负责人指令

只有 **你绑定的那个 Chat ID** 能用这些命令；其他人发完全无效（这是系统的硬规则）。

```text
/whoami            返回当前 chat_id
/status            服务运行状态、活跃会话数、待审批数
/sessions          列出活跃会话
/pause   <sessionId> [reason]   暂停 AI，新消息只转给你
/resume  <sessionId>            恢复 AI 自动接待
/takeover <sessionId>           人工接管，AI 不再自动回复
/approve <approvalId>           批准 AI 拟回复并发给客户
/reject  <approvalId> [reason]  拒绝 AI 拟回复并转人工
/reply   <sessionId> <message>  你直接回客户的内容
```

审批卡上的三个按钮 = `/approve`、`/takeover`、`/reject` 的快捷方式，能用按钮就用按钮，最快。

---

## 9. 常见问题

### Q1：客户给 bot 发消息没反应

按下面顺序排查：

1. `CONTROL.command` → **6) 查看状态** —— 服务必须显示 `running`。
2. 浏览器打开 `http://localhost:<端口>/health` —— 必须返回 `{"ok":true}`。
3. `CONTROL.command` → **8) 查看实时日志**，看有没有 ERROR。
4. 在 BotFather 里发 `/mybots`，确认 bot 没被你不小心删掉。
5. 你自己用手机给 bot 发 `/whoami`，如果连 `/whoami` 都不回，说明 token 错了或服务没启动。
6. 如果上面都正常，重启：`CONTROL.command` → **5 停止** → **4 启动**。

### Q2：审批卡没出现在我的 Telegram

1. `.env` 里的 `TELEGRAM_OPERATOR_CHAT_ID` 必须和你 `/whoami` 拿到的数字完全一致。
2. 用 `CONTROL.command` → **3** 重新设置一次。

### Q3：换了 Bot 怎么办

`CONTROL.command` → **2) 配置全部信息**，重新粘贴新的 Bot Token，回车保留其他设置，脚本会自动重启服务。**记得去 BotFather 上把旧 bot 的 token Revoke**。

### Q4：怎么停止服务 / 怎么重启

`CONTROL.command` 菜单的 **4 启动**、**5 停止** 即可。Mac mini 重启或登录后会**自动启动**（已通过 LaunchAgent 注册）。

### Q5：客户能不能不用 Telegram，直接在我的网站聊？

可以。让你的网站前端把消息 POST 到：

```text
http://<Mac mini 的局域网 IP>:<端口>/webhooks/site/message
```

请求体：

```json
{"customerId":"web-user-001", "text":"Hello", "displayName":"Visitor", "locale":"en"}
```

返回里的 `customerReply` 字段就是要展示给客户的回复。详细字段说明见 README 的"独立站模拟接入"。**注意：不要把这个端口暴露到公网**，前端→Mac mini 之间用 Tailscale / Cloudflare Tunnel 等私网通道。

### Q6：可以让多个负责人一起接单吗

当前版本只支持 **1 个 operator chat**。如果你和同事都要接，把 bot 拉进一个 **Telegram 群**，让所有同事进群，把 `TELEGRAM_OPERATOR_CHAT_ID` 改成这个**群的负数 chat_id**（在群里发 `/whoami` 拿到的就是负数）。这是 Telegram 协议本身的特性。

---

## 10. 安全准则

- 重要：Bot Token 只放在 `.env` 里（已自动 chmod 600）。**不要发给任何人，不要截图发到微信群**。
- 重要：API Key 同上。如果不小心贴到聊天记录、Github、钉钉，立刻去 OpenAI / Gemini 控制台 Revoke 并换新 key。
- 重要：Mac mini **不要把 8787 端口直接暴露到公网**。要远程访问，用 Tailscale、Cloudflare Tunnel 或 VPN。
- 重要：开启 macOS 的 **FileVault 全盘加密**（系统设置 → 隐私与安全 → FileVault）。
- 重要：给 Mac mini 设强开机密码，别贴在屏幕上。
- 备份：`data/` 目录里的 `*.jsonl` 文件就是所有会话历史，定期复制到移动硬盘或 NAS 即可。
- 想完全卸载服务：`CONTROL.command` → **9 卸载系统服务**，然后把整个 `health-ai-sales-agent` 文件夹拖进废纸篓。

---

## 你要记住的"3 个文件"

部署完成后，桌面 / 项目根目录里只需要认这 3 个：

| 双击它 | 用途 |
|---|---|
| `INSTALL.command` | 第一次安装、或想完全重装 |
| `CONTROL.command` | **日常一切操作的入口**（启动/停止/看日志/打开网页面板/换 key） |
| `SET_OPERATOR.command` | 单独修改"负责人 Chat ID"的快捷方式 |

其他文件你都不用碰。

---

如果遇到上面没覆盖的问题，把 `CONTROL.command` → **8 实时日志** 里出错那几行截图给技术支持。
