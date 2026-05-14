# Health AI Sales Agent Gateway for macOS

A beginner-friendly AI sales support gateway designed to run 24/7 on a local Mac mini. It combines Telegram customer intake, operator approval workflows, human takeover, local JSONL persistence, and a bilingual web dashboard.

The project is packaged for non-technical users: unpack the archive, double-click `INSTALL.command`, then use `CONTROL.command` for daily operations.

## Download / Installer

The ready-to-send macOS package is included in this repository:

```text
release/health-ai-sales-agent-macos-latest.tgz
```

This package includes the source code, double-click macOS scripts, user guides, and PDFs. It does not include `.env`, API keys, runtime logs, local data, `node_modules`, or build output.

## Documentation

- End-user guide in English: [USER_GUIDE_EN.md](USER_GUIDE_EN.md) / [USER_GUIDE_EN.pdf](USER_GUIDE_EN.pdf)
- End-user guide in Chinese: [USER_GUIDE.md](USER_GUIDE.md) / [USER_GUIDE.pdf](USER_GUIDE.pdf)
- Technical Mac mini installation guide: [MAC_MINI_INSTALL.md](MAC_MINI_INSTALL.md)

## What It Does

- Receives customer messages from Telegram Bot chats.
- Uses OpenAI or Gemini to answer normal sales inquiries.
- Routes risky messages to a human operator before replying.
- Requires human approval for price, discount, payment, refund, compensation, contract, medical, complaint, and custom commercial terms.
- Lets the operator approve, reject, pause, resume, take over, or send a human reply from Telegram or the web dashboard.
- Stores sessions, messages, and approval records locally in `data/*.jsonl`.
- Provides a website/webhook simulation endpoint at `/webhooks/site/message`.
- Runs persistently on macOS using launchd.

## Web Dashboard

After the service starts, open:

```text
http://localhost:<PORT>/admin
```

The dashboard has a language selector in the top-right corner and supports **English** and **Chinese**. The selected language is saved in the current browser.

Dashboard tabs:

- **Overview**: service status, uptime, active sessions, pending approvals, total messages, 24-hour trends, channel distribution, approval/risk distribution.
- **Approvals**: view customer text and the proposed AI reply, then approve, reject, take over, or send a custom human reply.
- **Sessions**: browse all sessions, open a message timeline, pause/resume AI, take over, or reply manually.
- **Message Stream**: latest cross-session customer, AI, human, and system messages.
- **Workflow**: end-to-end routing view and risk rules.
- **System / Config**: PID, port, LLM provider, configured key status, Telegram status, approval settings, currency, SLA, and common tips.

`CONTROL.command` option 7 opens the dashboard automatically.

## Beginner macOS Flow

For a non-technical user:

1. Download or receive `health-ai-sales-agent-macos-latest.tgz`.
2. Double-click it to unpack.
3. Rename the folder to `health-ai-sales-agent` and move it to `~/Apps/`.
4. Open the folder.
5. Double-click `INSTALL.command`.
6. Follow the prompts for OpenAI/Gemini key, Telegram Bot Token, and local port.
7. Send `/whoami` to the bot from the operator Telegram account.
8. Double-click `CONTROL.command` and choose option 3 to set the operator Chat ID.
9. Test with a second Telegram account before sending the bot link to real customers.

For detailed screenshots and wording, use [USER_GUIDE_EN.md](USER_GUIDE_EN.md).

## Create a Telegram Bot

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`.
3. Choose a display name, for example `Herbaloem Sales Agent`.
4. Choose a username ending in `bot`, for example `herbaloem_sales_bot`.
5. Copy the Bot Token returned by BotFather.
6. Send `/setprivacy` to BotFather, select the bot, and choose **Disable**.
7. Paste the Bot Token into the installer or `.env`.

Recommended customer-facing commands in BotFather:

```text
start - Start inquiry
help - Contact a human
```

Do not publish operator commands such as `/approve`, `/reply`, or `/sessions` in the customer command menu.

## Quick Development Start

Install Node.js 20+ first.

```bash
cp .env.example .env
npm install
npm run dev
```

Minimal OpenAI configuration:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
TELEGRAM_BOT_TOKEN=
TELEGRAM_OPERATOR_CHAT_ID=
```

Minimal Gemini configuration:

```bash
LLM_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
TELEGRAM_BOT_TOKEN=
TELEGRAM_OPERATOR_CHAT_ID=
```

Health check:

```bash
curl http://localhost:8787/health
```

If port `8787` is busy, set another port such as `8790` in `.env`.

## Telegram Operator Setup

1. Fill `TELEGRAM_BOT_TOKEN` and start the service.
2. From the operator Telegram account, send `/whoami` to the bot.
3. Copy the returned `chat_id`.
4. Set `TELEGRAM_OPERATOR_CHAT_ID` in `.env`, or run `SET_OPERATOR.command`.
5. Restart the service.
6. Send `/status` to the bot. It should reply with running status.

Operator commands:

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

Approval cards also include **Approve**, **Take over**, and **Reject** buttons.

## Avoiding "Seen but No Reply" Issues

Before real customers use the bot, test with a second Telegram account:

1. Second account sends `hello`; it should receive an AI reply.
2. Second account asks for best price; the operator should receive an approval card.
3. Operator clicks **Approve**; the second account should receive the approved reply.
4. Second account sends a medical-claim question; the session should route to human review.
5. Operator sends `/reply <sessionId> ...`; the second account should receive the human reply.

The current version includes safeguards for Telegram polling:

- Telegraf handlers have a global catch handler.
- Non-Telegram sessions no longer throw during outbound delivery.
- Customer message handling sends a safe fallback reply if processing fails.
- Operator replies show delivery status, such as `sent to customer` or `skipped (reason)`.

## Website / Site Chat Simulation

```bash
curl -X POST http://localhost:8787/webhooks/site/message \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"site-user-1","text":"Hello, what is your MOQ?","displayName":"Demo Customer","locale":"en"}'
```

If the response contains `customerReply`, the website can show it directly. If the session enters `waiting_approval`, the operator receives an approval request in Telegram.

Do not expose the local port directly to the public internet. Use Tailscale, Cloudflare Tunnel, VPN, or a controlled backend proxy.

## macOS 24/7 Runtime

The installer registers a launchd service:

```text
com.herbaloem.agent-gateway
```

Useful scripts:

```bash
zsh deploy/macos/install.sh
zsh deploy/macos/start.sh
zsh deploy/macos/stop.sh
zsh deploy/macos/status.sh
zsh deploy/macos/uninstall.sh
```

Double-click shortcuts:

- `INSTALL.command`: first install or full reinstall.
- `CONTROL.command`: daily menu for configuration, start/stop, logs, dashboard, and uninstall.
- `SET_OPERATOR.command`: update the operator Telegram Chat ID.

## Docker Option

```bash
docker compose up -d --build
docker compose logs -f
```

The Compose file uses:

```yaml
restart: unless-stopped
```

For Mac mini production users, the launchd installer is the preferred path.

## Packaging

Create a clean macOS archive:

```bash
zsh deploy/macos/package.sh
```

The script excludes:

- `.env`
- `data/`
- `logs/`
- `node_modules/`
- `dist/`
- `release/`
- `.DS_Store`

## Security

- Never commit real API keys or Telegram Bot Tokens.
- `.env` is ignored by git and should remain local.
- Rotate any OpenAI, Gemini, or Telegram token that appears in chat, screenshots, logs, or GitHub.
- Keep the Mac mini protected with a strong login password and FileVault.
- Do not expose the local HTTP port directly to the public internet.
- Back up `data/*.jsonl` if you need to keep customer conversation history.
