# 大健康 AI 客服销售 Agent 实施计划

## 1. 目标定位

目标不是先做一个“能聊天的机器人”，而是做一个可控的外贸销售助理：能接待、询盘、资格判断、收集报价要素、多语言回复、沉淀客户资料、生成报价/合同草稿，并在价格、特殊承诺、投诉、合同变更等关键点强制转人工审批。

适用渠道：

- 独立站：https://herbaloem.com/
- WhatsApp Business / Email / Telegram
- 阿里巴巴国际站：优先做“话术建议 + 客户信息归档 + 人工确认发送”。若没有官方开放接口，不建议用自动化绕过平台规则。

大健康行业额外约束：

- 不主动承诺疾病治疗、治愈、诊断效果。
- 所有功效、认证、成分、检测报告、适用人群、禁忌说明必须来自已审核物料。
- 客户要求非标功效宣称、医学背书、当地法规承诺时，必须转人工。

## 2. OpenClaw / Hermes 选型建议

建议不要一开始把业务绑定死在某一个 Agent 框架上，而是先在 Mac mini 上搭一个“本地 Agent 网关 + 可配置 LLM Provider + 审批工作流”。OpenClaw 或 Hermes 作为运行时插件接入。

选型验证标准：

| 能力 | 必须满足的标准 |
| --- | --- |
| 对话编排 | 支持多轮状态、客户阶段、工具调用、失败重试 |
| 审批控制 | 价格、合同、特殊承诺能暂停并等待人工批准 |
| API 兼容性 | 最好支持 OpenAI-compatible API 或清晰 REST/Webhook |
| 日志审计 | 每次报价、改价、转人工、合同草稿都能留痕 |
| 多语言 | 支持日语、韩语、英语、阿语等目标市场语言 |
| 本地部署 | 能在 Mac mini 上用 Docker/Node/Python 稳定运行 |
| 可维护性 | 配置、提示词、知识库、渠道接口可独立更新 |

推荐策略：

- 若 Hermes 更适合 LLM 对话编排、工具调用和多 Agent 流程，优先用于客服销售主链路。
- 若 OpenClaw 更偏网页操作、浏览器自动化或任务执行，可用于网页优化、资料整理、后台辅助录入。
- 第一阶段只要求接入一个 OpenAI-compatible 模型接口，后续再替换/并联 OpenClaw 或 Hermes，避免客户现场部署被框架限制。

## 3. Mac mini 本地部署架构

建议组件：

- `local-agent-config.html`：本地配置页，双击浏览器打开，用于设置 API base URL、API key、模型、渠道、审批策略、转人工规则，并导出 JSON。
- Agent Gateway：本地服务，读取配置，统一连接 LLM、知识库、CRM、渠道 Webhook。
- LLM Provider：可接 OpenAI-compatible API、本地 Ollama、Hermes/OpenClaw 暴露的接口，或其他供应商。
- Knowledge Base：产品目录、MOQ、价格规则、证书、检测报告、合同模板、物流说明、常见问答。
- Approval Queue：价格审批、合同审批、非标问题审批。可先用 Email/Telegram/飞书/企业微信 Webhook，后续做管理后台。
- Customer Store：客户、询盘、报价、订单、物流、反馈记录。POC 可用 SQLite，正式可用 PostgreSQL。
- Vector DB：POC 可用 Chroma/Qdrant，本地保存物料向量索引。

建议 Mac mini 基础环境：

- macOS 开启 FileVault。
- 安装 Homebrew、Git、Node.js LTS、Docker Desktop 或 OrbStack。
- 可选安装 Ollama，用于本地低风险测试；正式销售回复建议接稳定 API 模型。
- 使用 LaunchAgent 或 Docker Compose 设置开机自启。
- 使用 Tailscale/VPN 做远程维护，不直接暴露管理端口到公网。
- API key 进入 macOS Keychain 或服务端 `.env`，HTML 中的 localStorage 只适合初始化和测试。

## 4. 销售工作流

### 4.1 询盘接待

AI 首轮目标：识别语言、产品兴趣、客户身份、国家/地区、采购数量、用途、是否 OEM/ODM、是否需要私标、目标交付时间、联系方式。

标准字段：

- 客户姓名 / 公司 / 国家地区
- 新客户或老客户
- 产品名称 / SKU / 规格
- 采购数量
- 目标价格或预算
- 交付地、贸易条款、物流偏好
- 是否需要证书、样品、定制包装、配方调整
- 私域联系方式：WhatsApp、Email、Telegram

### 4.2 MOQ / 价格问题

客户常问 MOQ 和价格，但系统规则应为：

- MOQ 可以从已审核产品资料直接回答。
- 标准公开价可以按配置策略回复；如果公司规定“所有价格必须审批”，AI 只能说“我先为您确认最优报价”。
- 折扣、阶梯价、低于底价、非标付款条款、特殊物流承担方式，一律创建审批请求。
- 审批通过后，AI 才能把最终报价发给客户。

### 4.3 讨价还价

AI 可以做：

- 解释价值点：产能、认证、交期、包装、质量控制、复购支持。
- 询问对方目标数量和目标价。
- 生成内部审批单：客户背景、订单量、目标价格、建议价格、预计毛利、风险点。
- 审批前给客户使用缓冲话术：`I will check the best available offer with our manager based on your quantity and destination.`

AI 不可以做：

- 未经审批承诺最终价格。
- 未经审批承诺独家代理、账期、补偿、退款、特殊认证。
- 编造库存、证书、检测结果、物流时效。

### 4.4 合同与下单

流程：

1. AI 根据已审批报价生成 PI/合同草稿。
2. 人工确认价格、付款方式、交期、规格、收货信息。
3. 客户确认并支付定金。
4. AI 生成工厂下单信息并同步给负责人。
5. 生产/备货期间按节点提醒客户进度。
6. 发货前提醒客户付尾款。
7. 尾款到账后安排发货并发送 tracking number。
8. 客户收货后自动追踪反馈、复购机会和售后问题。

### 4.5 转人工规则

以下情况必须转人工：

- 任何价格、折扣、付款条款需要审批。
- 客户要求低于底价、赊账、独家代理、赔偿、退款。
- 涉及法规、医学功效、质量投诉、不良反应、清关争议。
- 客户情绪强烈、威胁投诉、要求负责人。
- 合同条款修改、非标包装/配方/认证。
- AI 检索不到可靠物料，或知识库内容冲突。

## 5. 多语言策略

优先语言：英语、日语、韩语、阿语，可扩展西语、法语、德语、俄语。

规则：

- 先检测客户语言，再用同语言回复。
- 合同、价格、付款条款优先用英语正式版本，必要时附客户语言解释。
- 小语种回复必须保持简短、明确、无夸大承诺。
- 对高风险内容，先转人工审核再发送。

## 6. 物料准备清单

必须先整理这些资料，否则 AI 容易无法稳定销售：

- 产品目录：SKU、规格、图片、MOQ、箱规、毛重、净重、交期。
- 价格策略：公开价、阶梯价、底价、币种、有效期、审批人。
- 客户分层：新客户、老客户、样品客户、复购客户、代理客户。
- 证书/检测报告：COA、MSDS、FDA/CE/ISO/HACCP/GMP 等实际拥有的材料。
- FAQ：MOQ、样品、定制、付款、物流、交期、售后。
- 话术：询盘、催回复、议价、转私域、催尾款、发货通知、收货反馈。
- 合同/PI 模板：公司抬头、付款条款、交期、违约、质检、收货信息。
- 工厂下单模板：产品、数量、包装、标签、交期、质检要求。

## 7. 分阶段落地

### 第 1 阶段：POC，1-2 周

- 在 Mac mini 上准备基础环境。
- 用本地 HTML 完成配置导出。
- 接入一个 LLM API 和一个测试知识库。
- 做独立站询盘/Email/Telegram 的模拟接待。
- 输出 30 条典型话术和 20 条高风险转人工测试用例。

验收：AI 能回答 MOQ、收集报价要素、识别转人工、生成审批单，且不会擅自报价。

### 第 2 阶段：试运行，2-4 周

- 接 WhatsApp Business、Email、Telegram。
- 建立客户资料和询盘记录。
- 上线审批队列。
- 导入产品、证书、FAQ、合同模板。
- 让销售人员每天复盘 AI 回复，修正知识库和话术。

验收：80% 常规询盘可由 AI 完成前置沟通，价格和合同仍由人工批准。

### 第 3 阶段：半自动销售，4-8 周

- 对接订单进度、发货单号、尾款提醒。
- 自动生成 PI/合同草稿。
- 接入独立站表单/聊天组件。
- 对阿里巴巴国际站做人工辅助工作台。
- 建立新老客户差异化话术和复购提醒。

验收：形成从询盘到转私域、报价审批、合同草稿、下单跟进、发货通知、收货反馈的闭环。

## 8. 风险与控制

- 价格风险：所有最终报价必须审批，审批记录可追溯。
- 合规风险：健康功效只引用审核资料，不做医疗承诺。
- 渠道风险：阿里巴巴国际站避免违规自动化。
- 数据风险：API key 不写入代码仓库，正式环境使用 Keychain/环境变量。
- 质量风险：AI 不处理投诉结论，只收集证据并转人工。
- 客户体验风险：AI 不能假装真人；建议在独立站声明由 AI 助手协助接待，复杂问题会转人工。

## 9. 本地 HTML 配置页

已提供：`local-agent-config.html`

使用方式：

1. 在 Mac mini 上双击打开，或右键选择浏览器打开。
2. 填写 Runtime、API Base URL、API Key、模型、渠道、审批规则。
3. 点击“保存到本机浏览器”。
4. 点击“导出 JSON”，把配置交给 Agent Gateway 或部署脚本读取。
5. “测试 API”仅适用于支持浏览器 CORS 的 OpenAI-compatible 接口；正式部署建议由本地后端代理测试。

注意：浏览器 localStorage 不是生产级密钥库。正式上线时，API key 应迁移到 macOS Keychain、Docker secret 或服务端 `.env`。

## 10. 已包装的 Agent Gateway 服务包

当前 workspace 已补充一个可运行的服务骨架：

- `src/index.ts`：启动 HTTP 服务、Agent、Telegram Bot、事件存储。
- `src/agent/sales-agent.ts`：销售状态机、风险识别、审批创建、暂停/接管/恢复。
- `src/channels/telegram-bot.ts`：Telegram 长轮询、负责人命令、审批按钮、人工回复。
- `src/llm/llm-client.ts`：OpenAI-compatible、Gemini、Stub 三种 Provider。
- `src/store/jsonl-store.ts`：会话、消息、审批记录写入本地 JSONL，支持重启恢复。
- `README.md`：本地启动、Telegram 配置、Docker Compose、launchd 说明。
- `compose.yaml`：24 小时运行的容器编排，包含 `restart: unless-stopped` 和健康检查。

### 10.1 Telegram 人工打断闭环

客户消息进入 Telegram Bot 后：

1. AI 先判断是否命中价格、合同、医疗功效、投诉、认证、定制等高风险规则。
2. 常规询盘由 AI 自动回复，并继续收集产品、数量、目的国、包装、交期和联系方式。
3. 价格和特殊情况自动创建审批单，并推送到负责人 Telegram chat。
4. 负责人可点按钮 `Approve`、`Take over`、`Reject`，也可用 `/reply <sessionId> <message>` 改写并发送。
5. 负责人可随时 `/pause <sessionId>` 或 `/takeover <sessionId>`，之后客户新消息只转发给人工，不再由 AI 自动回复。
6. 问题处理完后，用 `/resume <sessionId>` 恢复 AI 接待。

### 10.2 24 小时运行方式

建议正式部署使用 Docker Compose：

```bash
cp .env.example .env
npm install
npm run build
docker compose up -d --build
```

Mac mini 开机自启可选两种方式：

- 让 Docker Desktop/OrbStack 登录后自动启动，Compose 服务因 `restart: unless-stopped` 自动恢复。
- 使用 `deploy/macos/com.herbaloem.agent-gateway.plist.template` 做 launchd 启动模板。

### 10.3 密钥与配置

- 本地 HTML 配置页用于初始化和导出，不作为生产密钥库。
- `.env` 已被 `.gitignore` 忽略，真实 key 不进入仓库。
- Telegram Bot Token、OpenAI/Gemini Key 上线时建议放入 Keychain、Docker secret 或受控 `.env`。
- 如果密钥出现在聊天记录、截图或日志中，应立即轮换。
