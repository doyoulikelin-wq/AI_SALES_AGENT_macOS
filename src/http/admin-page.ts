export function renderAdminPage(): string {
  return PAGE;
}

const PAGE = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI 销售 Agent 控制台</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f6f7;
      --panel: #ffffff;
      --text: #14201d;
      --muted: #6b7775;
      --line: #d8e1de;
      --line-soft: #e8eeec;
      --ok: #177245;
      --warn: #a45b14;
      --bad: #a93636;
      --primary: #16675d;
      --primary-soft: #e3f0ee;
      --header: #143d38;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-size: 14px; }
    a { color: var(--primary); text-decoration: none; }
    header {
      background: var(--header); color: #fff; padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    }
    header h1 { margin: 0; font-size: 18px; letter-spacing: 0.2px; }
    header .meta { font-size: 12px; opacity: 0.8; }
    nav { background: #1d524b; padding: 0 12px; display: flex; gap: 4px; flex-wrap: wrap; }
    nav button {
      background: transparent; border: 0; color: #cfe1de; padding: 12px 14px; cursor: pointer;
      font-size: 14px; border-bottom: 2px solid transparent;
    }
    nav button.active { color: #fff; border-bottom-color: #fff; }
    main { padding: 20px; display: grid; gap: 16px; max-width: 1400px; margin: 0 auto; }
    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
    .panel h2 { margin: 0 0 12px; font-size: 15px; letter-spacing: 0.2px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .metric { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
    .metric .label { color: var(--muted); font-size: 12px; }
    .metric .value { font-size: 26px; font-weight: 700; margin-top: 4px; }
    .metric.ok .value { color: var(--ok); }
    .metric.warn .value { color: var(--warn); }
    .metric.bad .value { color: var(--bad); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; border-bottom: 1px solid var(--line-soft); padding: 8px 8px; vertical-align: top; }
    th { color: #33403d; font-weight: 600; background: #f6f9f8; position: sticky; top: 0; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    .pill {
      display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
      background: var(--primary-soft); color: var(--primary);
    }
    .pill.warn { background: #fdf1de; color: var(--warn); }
    .pill.bad { background: #fbe1e1; color: var(--bad); }
    .pill.ok { background: #defaea; color: var(--ok); }
    .pill.muted { background: #ecefee; color: var(--muted); }
    button.action {
      border: 1px solid var(--primary); background: var(--primary); color: #fff;
      border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; margin-right: 4px;
    }
    button.action.ghost { background: #fff; color: var(--primary); }
    button.action.bad { background: var(--bad); border-color: var(--bad); }
    button.action.warn { background: var(--warn); border-color: var(--warn); }
    button.action:disabled { opacity: 0.5; cursor: not-allowed; }
    .scroll { max-height: 480px; overflow: auto; }
    .row-flex { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    textarea { width: 100%; min-height: 70px; padding: 8px; border: 1px solid var(--line); border-radius: 6px; font: inherit; }
    select, input[type=text] { padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; font: inherit; }
    .chart { width: 100%; height: 160px; }
    .legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--muted); margin-top: 6px; }
    .legend .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
    details { border: 1px solid var(--line-soft); border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; background: #fbfdfc; }
    details summary { cursor: pointer; font-weight: 600; }
    .msg { padding: 8px 10px; border-radius: 6px; margin: 4px 0; max-width: 80%; }
    .msg.customer { background: #eef3f6; }
    .msg.agent { background: var(--primary-soft); }
    .msg.human { background: #fff5db; }
    .msg.system { background: #f4f4f4; color: var(--muted); font-size: 12px; max-width: 100%; }
    .msg .role { font-size: 11px; color: var(--muted); margin-bottom: 2px; }
    .toast {
      position: fixed; bottom: 16px; right: 16px; background: #14201d; color: #fff;
      padding: 10px 14px; border-radius: 6px; font-size: 13px; opacity: 0;
      transition: opacity 0.2s; pointer-events: none; max-width: 360px;
    }
    .toast.show { opacity: 0.95; }
    .toast.bad { background: var(--bad); }
    .empty { color: var(--muted); padding: 12px 0; text-align: center; }
    .flow-step {
      display: flex; align-items: center; gap: 12px; padding: 10px 12px;
      border: 1px solid var(--line); border-radius: 8px; background: #fff;
    }
    .flow-arrow { color: var(--muted); font-size: 18px; }
    .flow-row { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr; gap: 8px; align-items: center; }
    @media (max-width: 1100px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } .flow-row { grid-template-columns: 1fr; } .flow-arrow { display: none; } }
    @media (max-width: 700px) { .grid-2 { grid-template-columns: 1fr; } main { padding: 12px; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1 data-i18n="appTitle">AI 销售 Agent 控制台</h1>
      <div class="meta" id="header-meta">加载中…</div>
    </div>
    <div class="row-flex">
      <label class="meta"><span data-i18n="language">语言</span> <select id="language-select"><option value="zh">中文</option><option value="en">English</option></select></label>
      <label class="meta"><input type="checkbox" id="auto-refresh" checked> <span data-i18n="autoRefresh">自动刷新</span></label>
      <button class="action ghost" id="refresh-now" data-i18n="refresh">刷新</button>
    </div>
  </header>
  <nav id="tabs">
    <button data-tab="overview" class="active" data-i18n="tabOverview">概览</button>
    <button data-tab="approvals" data-i18n="tabApprovals">待审批</button>
    <button data-tab="sessions" data-i18n="tabSessions">会话</button>
    <button data-tab="messages" data-i18n="tabMessages">消息流</button>
    <button data-tab="workflow" data-i18n="tabWorkflow">工作流图</button>
    <button data-tab="system" data-i18n="tabSystem">系统/配置</button>
  </nav>
  <main>
    <section id="tab-overview"></section>
    <section id="tab-approvals" hidden></section>
    <section id="tab-sessions" hidden></section>
    <section id="tab-messages" hidden></section>
    <section id="tab-workflow" hidden></section>
    <section id="tab-system" hidden></section>
  </main>
  <div class="toast" id="toast"></div>

  <script>
  (function () {
    const $ = (id) => document.getElementById(id);
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const STATIC_I18N = {
      zh: { appTitle: "AI 销售 Agent 控制台", loading: "加载中…", language: "语言", autoRefresh: "自动刷新", refresh: "刷新", tabOverview: "概览", tabApprovals: "待审批", tabSessions: "会话", tabMessages: "消息流", tabWorkflow: "工作流图", tabSystem: "系统/配置" },
      en: { appTitle: "AI Sales Agent Console", loading: "Loading...", language: "Language", autoRefresh: "Auto refresh", refresh: "Refresh", tabOverview: "Overview", tabApprovals: "Approvals", tabSessions: "Sessions", tabMessages: "Message Stream", tabWorkflow: "Workflow", tabSystem: "System / Config" }
    };
    const EN_TEXT = {
      "加载中…": "Loading...",
      "暂无数据": "No data",
      "暂无审批记录": "No approval records",
      "暂无会话": "No sessions",
      "无消息": "No messages",
      "无审批": "No approvals",
      "运行状态": "Service status",
      "运行时长": "Uptime",
      "活跃会话": "Active sessions",
      "待审批": "Pending approvals",
      "总会话": "Total sessions",
      "总审批": "Total approvals",
      "总消息": "Total messages",
      "最老待审批 (分钟)": "Oldest pending approval (min)",
      "每小时消息量 (近 24h)": "Hourly messages (last 24h)",
      "每小时审批触发 (近 24h)": "Hourly approval triggers (last 24h)",
      "会话状态分布": "Session status distribution",
      "客户渠道分布": "Customer channel distribution",
      "审批类型分布": "Approval type distribution",
      "风险类型分布": "Risk type distribution",
      "峰值": "Peak",
      "审批工作流": "Approval workflow",
      "原因：": "Reason: ",
      "客户消息：": "Customer message: ",
      "建议回复：": "Proposed reply: ",
      "批准并发送": "Approve and send",
      "拒绝": "Reject",
      "人工接管": "Take over",
      "人工回复并发送": "Send human reply",
      "或者在这里改写后直接以人工身份回复客户…": "Or rewrite here and send as a human reply...",
      "所有会话": "All sessions",
      "ID": "ID",
      "状态": "Status",
      "渠道": "Channel",
      "客户": "Customer",
      "阶段": "Stage",
      "消息": "Messages",
      "更新": "Updated",
      "操作": "Actions",
      "详情": "Details",
      "恢复": "Resume",
      "暂停": "Pause",
      "接管": "Take over",
      "会话详情": "Session detail",
      "关闭": "Close",
      "客户：": "Customer: ",
      "渠道：": "Channel: ",
      "状态：": "Status: ",
      "阶段：": "Stage: ",
      "摘要：": "Summary: ",
      "创建：": "Created: ",
      "更新：": "Updated: ",
      "操作": "Actions",
      "关联审批": "Related approvals",
      "人工回复内容…": "Human reply...",
      "发送给客户": "Send to customer",
      "实时消息流（最近 100 条）": "Live message stream (latest 100)",
      "时间": "Time",
      "角色": "Role",
      "内容": "Content",
      "主流程概览": "Main workflow overview",
      "客户消息": "Customer message",
      "AI 自动回复": "AI auto reply",
      "触发审批": "Approval triggered",
      "人工回复 / 已发送": "Human reply / sent",
      "AI 自动": "AI automated",
      "需要人工": "Human required",
      "风险路由规则": "Risk routing rules",
      "客户消息触发条件": "Customer message trigger",
      "系统动作": "System action",
      "价格 / 折扣 / 付款条款": "Price / discount / payment terms",
      "需要审批 (REQUIRE_PRICE_APPROVAL)": "Requires approval (REQUIRE_PRICE_APPROVAL)",
      "医疗 / 疾病 / 治愈宣称": "Medical / disease / cure claims",
      "强制人工，禁止 AI 自动回复": "Force human review; AI auto reply disabled",
      "合同 / 独家 / 退款 / 赔偿": "Contract / exclusivity / refund / compensation",
      "人工审批合同条款": "Human approval for contract terms",
      "投诉 / 质量问题 / 副作用": "Complaint / quality issue / side effect",
      "转人工处理": "Route to human",
      "定制配方 / OEM / 认证": "Custom formula / OEM / certification",
      "人工审批商务条件": "Human approval for business terms",
      "其他普通询盘": "Other standard inquiries",
      "AI 自动回复，落库消息与摘要": "AI auto replies; messages and summary are stored",
      "当前会话状态分布": "Current session status distribution",
      "当前审批状态分布": "Current approval status distribution",
      "当前配置": "Current configuration",
      "Node 环境": "Node environment",
      "本地端口": "Local port",
      "LLM 供应商": "LLM provider",
      "OpenAI Key 已配置": "OpenAI key configured",
      "OpenAI 模型": "OpenAI model",
      "Gemini Key 已配置": "Gemini key configured",
      "Gemini 模型": "Gemini model",
      "Telegram Bot Token 已配置": "Telegram bot token configured",
      "负责人 Chat ID 已配置": "Operator chat ID configured",
      "客户可直接发 Telegram": "Telegram customer intake enabled",
      "价格强制审批": "Price approval required",
      "AI 折扣上限": "AI discount limit",
      "默认币种": "Default currency",
      "官网": "Company website",
      "审批 SLA (小时)": "Approval SLA (hours)",
      "是": "Yes",
      "否": "No",
      "常用提示": "Useful tips",
      "修改配置：双击桌面/项目里的 CONTROL.command，选择「2 配置全部信息」。": "Change configuration: double-click CONTROL.command and choose '2 Configure all settings'.",
      "修改后请重启服务：选 5 停止，再选 4 启动。": "Restart after changes: choose 5 Stop, then 4 Start.",
      "健康检查：": "Health check: ",
      "Telegram 命令：/whoami /status /sessions /approve /reject /reply <sessionId> <message>": "Telegram commands: /whoami /status /sessions /approve /reject /reply <sessionId> <message>",
      "日志位置：": "Log files: ",
      "刷新失败：": "Refresh failed: ",
      "加载会话失败: ": "Failed to load session: ",
      "已批准。投递：": "Approved. Delivery: ",
      "成功": "success",
      "失败": "failed",
      "已拒绝": "Rejected",
      "已暂停": "Paused",
      "已恢复": "Resumed",
      "已接管": "Taken over",
      "请输入回复内容": "Please enter a reply",
      "已发送。投递：": "Sent. Delivery: ",
      "操作失败：": "Action failed: "
    };
    let lang = new URLSearchParams(location.search).get("lang") || localStorage.getItem("adminLang") || "zh";
    if (lang !== "en") lang = "zh";

    function applyStaticLanguage() {
      const dict = STATIC_I18N[lang] || STATIC_I18N.zh;
      document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
      document.title = dict.appTitle;
      const select = $("language-select");
      if (select) select.value = lang;
      if (state.status) {
        const status = state.status;
        $("header-meta").innerHTML = lang === 'en'
          ? 'PID ' + status.pid + ' · Port ' + status.config.port + ' · LLM ' + status.config.llmProvider + ' · Uptime ' + fmtUptime(status.uptimeSeconds)
          : 'PID ' + status.pid + ' · 端口 ' + status.config.port + ' · LLM ' + status.config.llmProvider + ' · 运行 ' + fmtUptime(status.uptimeSeconds);
      } else {
        $("header-meta").textContent = dict.loading;
      }
      document.querySelectorAll("[data-i18n]").forEach((node) => {
        const key = node.getAttribute("data-i18n");
        if (key && dict[key]) node.textContent = dict[key];
      });
    }

    function uiText(zhText) {
      return lang === "en" ? (EN_TEXT[zhText] || zhText) : zhText;
    }

    function translateTextNode(node) {
      if (lang !== "en") return;
      const text = node.nodeValue || "";
      const trimmed = text.trim();
      if (!trimmed) return;
      const replacement = EN_TEXT[trimmed];
      if (replacement) node.nodeValue = text.replace(trimmed, replacement);
    }

    function translateDom(root) {
      if (lang !== "en" || !root) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest("script,style,textarea,code,.msg,.user-content")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(translateTextNode);
      document.querySelectorAll("[placeholder]").forEach((node) => {
        const value = node.getAttribute("placeholder") || "";
        if (EN_TEXT[value]) node.setAttribute("placeholder", EN_TEXT[value]);
      });
    }

    function applyLanguage() {
      applyStaticLanguage();
      translateDom(document.querySelector("main"));
    }
    let state = { status: null, dashboard: null, approvals: [], sessions: [], messages: [], openSessionId: null };
    let activeTab = "overview";

    function toast(text, bad) {
      const t = $("toast");
      t.textContent = text;
      t.className = "toast show" + (bad ? " bad" : "");
      setTimeout(() => { t.className = "toast" + (bad ? " bad" : ""); }, 2400);
    }

    async function api(path, options) {
      const response = await fetch(path, options || {});
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || ("HTTP " + response.status));
      }
      return data;
    }

    function pillForStatus(status) {
      const map = { ai_active: "ok", waiting_approval: "warn", paused: "muted", human_takeover: "warn", closed: "muted",
        pending: "warn", approved: "ok", rejected: "bad", revised: "ok" };
      return '<span class="pill ' + (map[status] || "muted") + '">' + escapeHtml(status) + '</span>';
    }

    function fmtTime(iso) {
      if (!iso) return "";
      try {
        const d = new Date(iso);
        return d.toLocaleString();
      } catch { return iso; }
    }

    function bar(map, total) {
      const entries = Object.entries(map || {});
      if (!entries.length) return '<div class="empty">暂无数据</div>';
      const max = Math.max(...entries.map(([, v]) => v), 1);
      return '<table>' + entries.map(([k, v]) => {
        const pct = Math.round((v / max) * 100);
        return '<tr><td style="width:30%">' + escapeHtml(k) + '</td><td>' +
          '<div style="background:#e3f0ee;border-radius:4px;overflow:hidden;height:14px;width:100%"><div style="width:' + pct + '%;height:100%;background:#16675d"></div></div>' +
          '</td><td style="width:60px;text-align:right"><strong>' + v + '</strong></td></tr>';
      }).join('') + '</table>';
    }

    function sparkline(points, color) {
      if (!points || !points.length) return '<div class="empty">暂无数据</div>';
      const w = 600, h = 140, pad = 24;
      const max = Math.max(...points.map((p) => p.count), 1);
      const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
      const coords = points.map((p, i) => {
        const x = pad + i * stepX;
        const y = h - pad - (p.count / max) * (h - pad * 2);
        return [x, y];
      });
      const path = coords.map((c, i) => (i === 0 ? "M" : "L") + c[0] + "," + c[1]).join(" ");
      const area = "M" + coords[0][0] + "," + (h - pad) + " " + coords.map((c) => "L" + c[0] + "," + c[1]).join(" ") + " L" + coords[coords.length - 1][0] + "," + (h - pad) + " Z";
      const labels = points.map((p, i) => i % Math.ceil(points.length / 6 || 1) === 0 ?
        '<text x="' + (pad + i * stepX) + '" y="' + (h - 6) + '" font-size="10" text-anchor="middle" fill="#6b7775">' + escapeHtml(p.bucket.slice(11, 16)) + '</text>' : '').join('');
      return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
        '<path d="' + area + '" fill="' + color + '" opacity="0.18"/>' +
        '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2"/>' +
        '<text x="' + pad + '" y="14" font-size="10" fill="#6b7775">' + escapeHtml(uiText("峰值")) + ' ' + max + '</text>' +
        labels +
        '</svg>';
    }

    function renderOverview() {
      const s = state.status, d = state.dashboard;
      if (!s || !d) { $("tab-overview").innerHTML = '<div class="panel">加载中…</div>'; return; }
      const onlineTone = s.ok ? "ok" : "bad";
      const pendingTone = d.totals.approvalsPending ? "warn" : "ok";
      const slaTone = d.oldestPendingApprovalMinutes && d.oldestPendingApprovalMinutes > s.config.approvalSlaHours * 60 ? "bad" : "ok";
      const html = [
        '<div class="grid-4">',
          metric("运行状态", s.ok ? "online" : "offline", onlineTone),
          metric("运行时长", fmtUptime(s.uptimeSeconds), "ok"),
          metric("活跃会话", d.totals.sessionsActive, "ok"),
          metric("待审批", d.totals.approvalsPending, pendingTone),
        '</div>',
        '<div class="grid-4" style="margin-top:12px">',
          metric("总会话", d.totals.sessionsAll),
          metric("总审批", d.totals.approvalsAll),
          metric("总消息", d.totals.messages),
          metric("最老待审批 (分钟)", d.oldestPendingApprovalMinutes ?? 0, slaTone),
        '</div>',
        '<div class="grid-2" style="margin-top:12px">',
          '<div class="panel"><h2>每小时消息量 (近 24h)</h2>' + sparkline(d.messagesPerHour, "#16675d") + '</div>',
          '<div class="panel"><h2>每小时审批触发 (近 24h)</h2>' + sparkline(d.approvalsPerHour, "#a45b14") + '</div>',
        '</div>',
        '<div class="grid-2" style="margin-top:12px">',
          '<div class="panel"><h2>会话状态分布</h2>' + bar(d.sessionStatus) + '</div>',
          '<div class="panel"><h2>客户渠道分布</h2>' + bar(d.channels) + '</div>',
        '</div>',
        '<div class="grid-2" style="margin-top:12px">',
          '<div class="panel"><h2>审批类型分布</h2>' + bar(d.approvalTypes) + '</div>',
          '<div class="panel"><h2>风险类型分布</h2>' + bar(d.riskTypes) + '</div>',
        '</div>'
      ].join('');
      $("tab-overview").innerHTML = html;
    }

    function metric(label, value, tone) {
      return '<div class="metric ' + (tone || '') + '"><div class="label">' + escapeHtml(label) + '</div><div class="value">' + escapeHtml(value) + '</div></div>';
    }

    function fmtUptime(seconds) {
      const s = Math.round(seconds || 0);
      if (s < 60) return s + "s";
      if (s < 3600) return Math.round(s / 60) + "m";
      if (s < 86400) return (s / 3600).toFixed(1) + "h";
      return (s / 86400).toFixed(1) + "d";
    }

    function renderApprovals() {
      const items = state.approvals;
      if (!items.length) { $("tab-approvals").innerHTML = '<div class="panel"><div class="empty">暂无审批记录</div></div>'; return; }
      const rows = items.map((a) => {
        const sessionLabel = a.session ? (escapeHtml(a.session.displayName || a.session.channelUserId) + ' <code>' + escapeHtml(a.session.id.slice(-8)) + '</code>') : escapeHtml(a.sessionId);
        const isPending = a.status === "pending";
        return [
          '<details ' + (isPending ? 'open' : '') + '>',
            '<summary>',
              pillForStatus(a.status), ' ',
              '<span class="pill muted">' + escapeHtml(a.type) + '</span> ',
              '<span class="pill ' + (a.risk === 'price' ? 'warn' : 'muted') + '">risk: ' + escapeHtml(a.risk || 'none') + '</span> ',
              ' &mdash; ', sessionLabel, ' &mdash; <span class="meta">' + fmtTime(a.requestedAt) + '</span>',
            '</summary>',
            '<div style="margin-top:8px">',
              '<div><strong>原因：</strong>' + escapeHtml(a.reason) + '</div>',
              '<div style="margin-top:6px"><strong>客户消息：</strong><div class="msg customer">' + escapeHtml(a.customerText) + '</div></div>',
              '<div style="margin-top:6px"><strong>建议回复：</strong><div class="msg agent">' + escapeHtml(a.proposedReply) + '</div></div>',
              isPending ? approvalActions(a) : ('<div class="meta" style="margin-top:6px">已由 ' + escapeHtml(a.resolvedBy || '?') + ' 于 ' + fmtTime(a.resolvedAt) + ' 处理。' + (a.resolutionNote ? ' 备注：' + escapeHtml(a.resolutionNote) : '') + '</div>'),
            '</div>',
          '</details>'
        ].join('');
      }).join('');
      $("tab-approvals").innerHTML = '<div class="panel"><h2>审批工作流</h2>' + rows + '</div>';
    }

    function approvalActions(a) {
      return [
        '<div class="row-flex" style="margin-top:8px">',
          '<button class="action" data-act="approve" data-id="' + a.id + '">批准并发送</button>',
          '<button class="action bad" data-act="reject" data-id="' + a.id + '">拒绝</button>',
          '<button class="action warn" data-act="takeover" data-sid="' + a.sessionId + '">人工接管</button>',
        '</div>',
        '<div class="row-flex" style="margin-top:6px">',
          '<textarea data-reply-for="' + a.sessionId + '" placeholder="或者在这里改写后直接以人工身份回复客户…"></textarea>',
        '</div>',
        '<div class="row-flex" style="margin-top:6px">',
          '<button class="action ghost" data-act="reply" data-sid="' + a.sessionId + '">人工回复并发送</button>',
        '</div>'
      ].join('');
    }

    function renderSessions() {
      const list = state.sessions;
      const rows = list.length ? list.map((s) => {
        return '<tr>' +
          '<td><a href="#" data-open-session="' + s.id + '"><code>' + escapeHtml(s.id.slice(-10)) + '</code></a></td>' +
          '<td>' + pillForStatus(s.status) + '</td>' +
          '<td>' + escapeHtml(s.channel) + '</td>' +
          '<td>' + escapeHtml(s.displayName || s.channelUserId || '') + '</td>' +
          '<td>' + escapeHtml(s.salesStage || '') + '</td>' +
          '<td>' + (s.messageCount || 0) + '</td>' +
          '<td>' + escapeHtml(fmtTime(s.updatedAt)) + '</td>' +
          '<td>' + sessionRowActions(s) + '</td>' +
          '</tr>';
      }).join('') : '<tr><td colspan="8" class="empty">暂无会话</td></tr>';

      const detail = state.openSessionId ? renderSessionDetail() : '';

      $("tab-sessions").innerHTML =
        '<div class="panel"><h2>所有会话</h2><div class="scroll"><table>' +
        '<thead><tr><th>ID</th><th>状态</th><th>渠道</th><th>客户</th><th>阶段</th><th>消息</th><th>更新</th><th>操作</th></tr></thead><tbody>' +
        rows + '</tbody></table></div></div>' + detail;
    }

    function sessionRowActions(s) {
      return [
        '<button class="action ghost" data-open-session="' + s.id + '">详情</button>',
        s.status === 'paused' ? '<button class="action" data-act="resume" data-sid="' + s.id + '">恢复</button>' : '<button class="action ghost" data-act="pause" data-sid="' + s.id + '">暂停</button>',
        '<button class="action warn" data-act="takeover" data-sid="' + s.id + '">接管</button>'
      ].join('');
    }

    function renderSessionDetail() {
      const detail = state.openSessionDetail;
      if (!detail) return '<div class="panel">加载会话详情中…</div>';
      const s = detail.session;
      const messages = (detail.messages || []).map((m) => {
        const cls = m.role === 'customer' ? 'customer' : m.role === 'agent' ? 'agent' : m.role === 'human' ? 'human' : 'system';
        return '<div class="msg ' + cls + '"><div class="role">' + escapeHtml(m.role) + ' · ' + fmtTime(m.createdAt) + '</div>' + escapeHtml(m.text) + '</div>';
      }).join('') || '<div class="empty">无消息</div>';
      const approvals = (detail.approvals || []).map((a) => {
        return '<div class="row-flex" style="margin:4px 0">' + pillForStatus(a.status) + ' <code>' + escapeHtml(a.id.slice(-8)) + '</code> ' + escapeHtml(a.type) + ' · ' + escapeHtml(a.reason) + '</div>';
      }).join('') || '<div class="empty">无审批</div>';
      return [
        '<div class="panel">',
          '<div class="row-flex" style="justify-content:space-between">',
            '<h2>会话详情 <code>' + escapeHtml(s.id) + '</code></h2>',
            '<button class="action ghost" id="close-session">关闭</button>',
          '</div>',
          '<div class="grid-2">',
            '<div>',
              '<div><strong>客户：</strong>' + escapeHtml(s.displayName || s.channelUserId || '') + '</div>',
              '<div><strong>渠道：</strong>' + escapeHtml(s.channel) + '</div>',
              '<div><strong>状态：</strong>' + pillForStatus(s.status) + '</div>',
              '<div><strong>阶段：</strong>' + escapeHtml(s.salesStage || '') + '</div>',
              '<div><strong>摘要：</strong>' + escapeHtml(s.summary || '') + '</div>',
              '<div><strong>创建：</strong>' + fmtTime(s.createdAt) + '</div>',
              '<div><strong>更新：</strong>' + fmtTime(s.updatedAt) + '</div>',
              '<div style="margin-top:8px"><strong>操作</strong></div>',
              '<div class="row-flex" style="margin-top:4px">',
                (s.status === 'paused'
                  ? '<button class="action" data-act="resume" data-sid="' + s.id + '">恢复</button>'
                  : '<button class="action ghost" data-act="pause" data-sid="' + s.id + '">暂停</button>'),
                '<button class="action warn" data-act="takeover" data-sid="' + s.id + '">人工接管</button>',
              '</div>',
              '<div style="margin-top:8px"><textarea data-reply-for="' + s.id + '" placeholder="人工回复内容…"></textarea></div>',
              '<div style="margin-top:6px"><button class="action" data-act="reply" data-sid="' + s.id + '">发送给客户</button></div>',
              '<div style="margin-top:12px"><strong>关联审批</strong>' + approvals + '</div>',
            '</div>',
            '<div><div class="scroll" style="max-height:560px">' + messages + '</div></div>',
          '</div>',
        '</div>'
      ].join('');
    }

    function renderMessages() {
      const list = state.messages;
      if (!list.length) { $("tab-messages").innerHTML = '<div class="panel"><div class="empty">暂无消息</div></div>'; return; }
      const rows = list.map((m) => {
        const cls = m.role === 'customer' ? 'customer' : m.role === 'agent' ? 'agent' : m.role === 'human' ? 'human' : 'system';
        return '<tr>' +
          '<td>' + fmtTime(m.createdAt) + '</td>' +
          '<td><span class="pill ' + (cls === 'customer' ? 'muted' : cls === 'agent' ? 'ok' : cls === 'human' ? 'warn' : 'muted') + '">' + escapeHtml(m.role) + '</span></td>' +
          '<td>' + escapeHtml(m.channel) + '</td>' +
          '<td><a href="#" data-open-session="' + m.sessionId + '">' + escapeHtml(m.sessionDisplay || m.sessionId.slice(-8)) + '</a></td>' +
          '<td class="user-content">' + escapeHtml(m.text) + '</td>' +
          '</tr>';
      }).join('');
      $("tab-messages").innerHTML = '<div class="panel"><h2>实时消息流（最近 100 条）</h2><div class="scroll"><table>' +
        '<thead><tr><th>时间</th><th>角色</th><th>渠道</th><th>会话</th><th>内容</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    }

    function renderWorkflow() {
      const d = state.dashboard || { sessionStatus: {}, approvalStatus: {} };
      const flow = [
        { label: '客户消息', value: d.totals ? d.totals.messages : 0, tone: 'muted' },
        { label: 'AI 自动回复', value: d.messageRoles ? (d.messageRoles.agent || 0) : 0, tone: 'ok' },
        { label: '触发审批', value: d.totals ? d.totals.approvalsAll : 0, tone: 'warn' },
        { label: '人工回复 / 已发送', value: (d.messageRoles ? (d.messageRoles.human || 0) : 0) + (d.approvalStatus ? (d.approvalStatus.approved || 0) : 0), tone: 'ok' }
      ];
      const flowHtml = '<div class="flow-row">' + flow.map((step, i) => {
        const cell = '<div class="flow-step"><div><div class="meta">' + escapeHtml(step.label) + '</div><div style="font-size:22px;font-weight:700">' + step.value + '</div></div></div>';
        return cell + (i < flow.length - 1 ? '<div class="flow-arrow">→</div>' : '');
      }).join('') + '</div>';

      const rules = [
        { name: '价格 / 折扣 / 付款条款', action: '需要审批 (REQUIRE_PRICE_APPROVAL)' },
        { name: '医疗 / 疾病 / 治愈宣称', action: '强制人工，禁止 AI 自动回复' },
        { name: '合同 / 独家 / 退款 / 赔偿', action: '人工审批合同条款' },
        { name: '投诉 / 质量问题 / 副作用', action: '转人工处理' },
        { name: '定制配方 / OEM / 认证', action: '人工审批商务条件' },
        { name: '其他普通询盘', action: 'AI 自动回复，落库消息与摘要' }
      ];
      const rulesHtml = '<table><thead><tr><th>客户消息触发条件</th><th>系统动作</th></tr></thead><tbody>' +
        rules.map((r) => '<tr><td>' + escapeHtml(r.name) + '</td><td>' + escapeHtml(r.action) + '</td></tr>').join('') + '</tbody></table>';

      $("tab-workflow").innerHTML = [
        '<div class="panel"><h2>主流程概览</h2>', flowHtml,
          '<div class="legend"><span><span class="dot" style="background:#16675d"></span>AI 自动</span><span><span class="dot" style="background:#a45b14"></span>需要人工</span></div>',
        '</div>',
        '<div class="panel"><h2>风险路由规则</h2>', rulesHtml, '</div>',
        '<div class="panel"><h2>当前会话状态分布</h2>', bar(state.dashboard ? state.dashboard.sessionStatus : {}), '</div>',
        '<div class="panel"><h2>当前审批状态分布</h2>', bar(state.dashboard ? state.dashboard.approvalStatus : {}), '</div>'
      ].join('');
    }

    function renderSystem() {
      const s = state.status;
      if (!s) { $("tab-system").innerHTML = '<div class="panel">加载中…</div>'; return; }
      const c = s.config;
      const rows = [
        ['Process PID', s.pid],
        ['Node 环境', s.nodeEnv],
        ['本地端口', c.port],
        ['LLM 供应商', c.llmProvider],
        ['OpenAI Key 已配置', c.openaiKeyConfigured ? uiText('是') : uiText('否')],
        ['OpenAI 模型', c.openaiModel],
        ['Gemini Key 已配置', c.geminiKeyConfigured ? uiText('是') : uiText('否')],
        ['Gemini 模型', c.geminiModel],
        ['Telegram Bot Token 已配置', c.telegramBotConfigured ? uiText('是') : uiText('否')],
        ['负责人 Chat ID 已配置', c.operatorChatConfigured ? uiText('是') : uiText('否')],
        ['客户可直接发 Telegram', c.customerTelegramEnabled ? uiText('是') : uiText('否')],
        ['价格强制审批', c.requirePriceApproval ? uiText('是') : uiText('否')],
        ['AI 折扣上限', c.publicDiscountLimit + '%'],
        ['默认币种', c.defaultCurrency],
        ['官网', c.companySiteUrl],
        ['审批 SLA (小时)', c.approvalSlaHours]
      ];
      const tbl = '<table><tbody>' + rows.map((r) => '<tr><th style="width:200px">' + escapeHtml(r[0]) + '</th><td>' + escapeHtml(r[1]) + '</td></tr>').join('') + '</tbody></table>';
      const tips = [
        '修改配置：双击桌面/项目里的 CONTROL.command，选择「2 配置全部信息」。',
        '修改后请重启服务：选 5 停止，再选 4 启动。',
        '健康检查：<code>http://localhost:' + c.port + '/health</code>',
        'Telegram 命令：/whoami /status /sessions /approve /reject /reply <sessionId> <message>',
        '日志位置：<code>logs/launchd.out.log</code> 与 <code>logs/launchd.err.log</code>'
      ];
      $("tab-system").innerHTML =
        '<div class="panel"><h2>当前配置</h2>' + tbl + '</div>' +
        '<div class="panel"><h2>常用提示</h2><ul>' + tips.map((t) => '<li>' + t + '</li>').join('') + '</ul></div>';
    }

    async function refresh() {
      try {
        const [status, dashboard, approvals, sessions, messages] = await Promise.all([
          api('/admin/status'),
          api('/admin/dashboard'),
          api('/admin/approvals?limit=200'),
          api('/admin/sessions?limit=200'),
          api('/admin/messages?limit=100')
        ]);
        state.status = status;
        state.dashboard = dashboard;
        state.approvals = approvals.approvals || [];
        state.sessions = sessions.sessions || [];
        state.messages = messages.messages || [];

        $("header-meta").innerHTML = lang === 'en'
          ? 'PID ' + status.pid + ' · Port ' + status.config.port + ' · LLM ' + status.config.llmProvider + ' · Uptime ' + fmtUptime(status.uptimeSeconds)
          : 'PID ' + status.pid + ' · 端口 ' + status.config.port + ' · LLM ' + status.config.llmProvider + ' · 运行 ' + fmtUptime(status.uptimeSeconds);

        if (state.openSessionId) {
          state.openSessionDetail = await api('/admin/sessions/' + encodeURIComponent(state.openSessionId)).catch(() => null);
        }

        renderActive();
      } catch (error) {
        toast(uiText('刷新失败：') + error.message, true);
      }
    }

    function renderActive() {
      if (activeTab === 'overview') renderOverview();
      else if (activeTab === 'approvals') renderApprovals();
      else if (activeTab === 'sessions') renderSessions();
      else if (activeTab === 'messages') renderMessages();
      else if (activeTab === 'workflow') renderWorkflow();
      else if (activeTab === 'system') renderSystem();
      applyLanguage();
    }

    function switchTab(tab) {
      activeTab = tab;
      Array.from(document.querySelectorAll('nav button')).forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
      ['overview','approvals','sessions','messages','workflow','system'].forEach((name) => {
        $('tab-' + name).hidden = name !== tab;
      });
      renderActive();
    }

    document.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.tab) { switchTab(target.dataset.tab); return; }
      if (target.id === 'refresh-now') { refresh(); return; }
      if (target.id === 'close-session') { state.openSessionId = null; state.openSessionDetail = null; renderActive(); return; }

      const openSid = target.dataset.openSession;
      if (openSid) {
        event.preventDefault();
        state.openSessionId = openSid;
        switchTab('sessions');
        try { state.openSessionDetail = await api('/admin/sessions/' + encodeURIComponent(openSid)); renderActive(); }
        catch (e) { toast(uiText('加载会话失败: ') + e.message, true); }
        return;
      }

      const act = target.dataset.act;
      if (!act) return;
      const id = target.dataset.id;
      const sid = target.dataset.sid;
      target.disabled = true;
      try {
        if (act === 'approve') {
          const r = await api('/admin/approvals/' + encodeURIComponent(id) + '/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          toast(uiText('已批准。投递：') + (r.delivery && r.delivery.delivered ? uiText('成功') : (r.delivery && r.delivery.reason) || uiText('失败')));
        } else if (act === 'reject') {
          await api('/admin/approvals/' + encodeURIComponent(id) + '/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          toast(uiText('已拒绝'));
        } else if (act === 'pause') {
          await api('/admin/sessions/' + encodeURIComponent(sid) + '/pause', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          toast(uiText('已暂停'));
        } else if (act === 'resume') {
          await api('/admin/sessions/' + encodeURIComponent(sid) + '/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          toast(uiText('已恢复'));
        } else if (act === 'takeover') {
          await api('/admin/sessions/' + encodeURIComponent(sid) + '/takeover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          toast(uiText('已接管'));
        } else if (act === 'reply') {
          const ta = document.querySelector('textarea[data-reply-for="' + sid + '"]');
          const text = ta ? ta.value.trim() : '';
          if (!text) { toast(uiText('请输入回复内容'), true); target.disabled = false; return; }
          const r = await api('/admin/sessions/' + encodeURIComponent(sid) + '/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
          toast(uiText('已发送。投递：') + (r.delivery && r.delivery.delivered ? uiText('成功') : (r.delivery && r.delivery.reason) || uiText('失败')));
          if (ta) ta.value = '';
        }
        await refresh();
      } catch (e) {
        toast(uiText('操作失败：') + e.message, true);
      } finally {
        target.disabled = false;
      }
    });

    let timer = null;
    function startTimer() { if (!timer) timer = setInterval(refresh, 5000); }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    $("auto-refresh").addEventListener('change', (e) => { if (e.target.checked) startTimer(); else stopTimer(); });
    $("language-select").addEventListener('change', (e) => {
      lang = e.target.value === 'en' ? 'en' : 'zh';
      localStorage.setItem('adminLang', lang);
      applyStaticLanguage();
      renderActive();
    });

    applyStaticLanguage();
    refresh();
    startTimer();
  })();
  </script>
</body>
</html>`;
