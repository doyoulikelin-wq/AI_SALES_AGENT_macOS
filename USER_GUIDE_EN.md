# Health AI Sales Agent - User Guide

> Audience: end users who operate the Mac mini deployment, such as the owner, sales manager, or customer support lead.
> You do not need command-line experience. Technical installers should also read [MAC_MINI_INSTALL.md](MAC_MINI_INSTALL.md).

---

## Table of Contents

1. What this system does
2. What you need before installation
3. Create your own Telegram Bot
4. Install on a Mac mini
5. Bind the operator Telegram account
6. Put real customers on the bot without "seen but no reply" issues
7. Web dashboard
8. Telegram operator commands
9. Troubleshooting
10. Security rules

---

## 1. What this system does

This is a local AI sales support gateway running on your own Mac mini. Customers can message your Telegram Bot or your website chat integration. The AI replies to normal sales inquiries automatically and routes sensitive topics to a human operator.

Sensitive topics include:

- Price, discount, payment terms, refund, compensation, or contract wording.
- Medical claims, disease treatment, cure claims, side effects, or complaints.
- OEM, custom formulas, certificates, exclusive agency, or unusual commercial terms.

For these cases, the AI does not make final decisions. It sends a proposed reply to the operator account in Telegram. The operator can approve, reject, take over, or send a custom human reply.

### Basic flow

```text
Real customer -> Telegram Bot -> Agent on Mac mini -> OpenAI / Gemini
                                   |
                                   | Normal inquiry: reply to customer
                                   |
                                   +-> Sensitive inquiry -> Operator Telegram
                                                            |
                                                            +-> Approve / Reject / Take over
                                                                        |
                                                                        v
                                                                  Customer reply
```

All sessions, messages, and approval records are stored locally on the Mac mini in `data/*.jsonl`.

---

## 2. What you need before installation

Prepare these items first:

| Item | Description | Where to get it |
|---|---|---|
| Mac mini | Online and logged into the user account that will run the service | - |
| Mac login password | Required when macOS installs developer tools or Homebrew | - |
| OpenAI API Key | Recommended model provider | https://platform.openai.com/api-keys |
| Or Gemini API Key | Alternative model provider | https://aistudio.google.com/app/apikey |
| Telegram account | Used to create and operate the bot | Telegram app |
| Telegram Bot Token | Created with BotFather | See section 3 |
| Operator Telegram Chat ID | The account or group that receives approvals | See section 5 |
| Installer archive | `health-ai-sales-agent-*.tgz` | Provided by your technical installer |

Important: do not reuse keys that have appeared in chat messages, screenshots, emails, or shared documents. Use fresh keys for production and revoke leaked keys immediately.

---

## 3. Create your own Telegram Bot

This step is done once inside Telegram. The bot belongs to you, and the bot token must be kept private.

### 3.1 Open BotFather

1. Open Telegram.
2. Search for `@BotFather`.
3. Choose the official verified BotFather account.
4. Click **Start**.

### 3.2 Create the bot

1. Send this command to BotFather:

   ```text
   /newbot
   ```

2. BotFather asks: **"Alright, a new bot. How are we going to call it?"**

   Reply with a display name, for example:

   ```text
   Herbaloem Sales Agent
   ```

   Customers will see this display name.

3. BotFather asks: **"Good. Now let's choose a username for your bot."**

   Reply with a globally unique username ending in `bot`, for example:

   ```text
   herbaloem_sales_bot
   ```

   Rules:

   - The username must be unique.
   - It must end with `bot` or `Bot`.
   - It must be at least 5 characters long.
   - Customers will use a link like `https://t.me/herbaloem_sales_bot`.

4. BotFather returns a token like this:

   ```text
   Done! Congratulations on your new bot.
   ...
   Use this token to access the HTTP API:
   1234567890:ABCDEF_example_replace_with_your_token

   Keep your token secure and store it safely, ...
   ```

   The string after **Use this token** is your Telegram Bot Token. Paste your real token into the installer later.

   Store it in a password manager. Anyone with this token can control your bot.

### 3.3 Disable privacy mode

Private 1-to-1 chats work without this step, but disabling privacy mode avoids missed messages if you later use the bot in a group.

1. Send this to BotFather:

   ```text
   /setprivacy
   ```

2. Select your new bot.
3. Choose **Disable**.

### 3.4 Recommended optional settings

You can also set these in BotFather:

| Command | Purpose | Suggested value |
|---|---|---|
| `/setdescription` | Bot search description | `24/7 AI sales inquiry assistant. Prices require human approval.` |
| `/setabouttext` | Bot profile About text | `Health product AI sales agent` |
| `/setuserpic` | Bot avatar | Upload your company logo |
| `/setcommands` | Customer-facing slash command menu | See below |

Recommended `/setcommands` value:

```text
start - Start inquiry
help - Contact a human
```

Do not add operator commands such as `/approve`, `/reply`, or `/sessions` to the customer command menu. Those commands are protected internally and only work for the configured operator chat.

---

## 4. Install on a Mac mini

### 4.1 Unpack the archive

1. Put `health-ai-sales-agent-xxxxxxxx-xxxxxx.tgz` in the Downloads folder.
2. Double-click the archive. macOS will create a folder.
3. Rename the folder to `health-ai-sales-agent`.
4. Move it to `~/Apps/health-ai-sales-agent`. If the `Apps` folder does not exist, create it.
5. Open the folder.

### 4.2 Run the installer

Double-click:

```text
INSTALL.command
```

If macOS says the file cannot be opened because it is from an unidentified developer:

1. Hold the Control key.
2. Click `INSTALL.command`.
3. Choose **Open**.
4. Confirm **Open** again.

The installer asks for:

```text
Model provider: 1 OpenAI / 2 Gemini / 3 stub test mode
OpenAI model [gpt-4.1-mini]
OpenAI API Key
Telegram Bot Token
Operator Telegram Chat ID
Local service port [8787]
```

Recommended first setup:

```text
Model provider: 1
OpenAI model: press Enter to use gpt-4.1-mini
OpenAI API Key: paste your fresh OpenAI key
Telegram Bot Token: paste the BotFather token
Operator Telegram Chat ID: leave empty for now
Local service port: press Enter
```

When you paste API keys or tokens, the terminal may show nothing. This is normal for hidden password input. Paste, then press Enter.

When installation finishes, the browser opens the local dashboard:

```text
http://localhost:8787/admin
```

If port 8787 is already used, the installer may choose another port such as 8790.

---

## 5. Bind the operator Telegram account

The operator is the Telegram account or group that receives approval cards and can approve, reject, take over, or send human replies.

### 5.1 Get your Chat ID

1. In Telegram, open your new bot.
2. Click **Start**.
3. Send:

   ```text
   /whoami
   ```

4. The bot replies:

   ```text
   chat_id: 6103474891
   ```

   This number is your operator Chat ID.

### 5.2 Save the Chat ID

On the Mac mini, double-click:

```text
CONTROL.command
```

Choose:

```text
3) Set operator Telegram Chat ID
```

Paste the Chat ID and press Enter. The script saves it to `.env` and restarts the service.

### 5.3 Verify

Send this to the bot from the operator account:

```text
/status
```

If it replies with `Agent status: running`, the operator account is correctly bound.

If it says `This command is only available to the operator chat`, the Chat ID is wrong or the service has not finished restarting. Wait a few seconds and try again.

---

## 6. Put real customers on the bot without "seen but no reply" issues

Before sending the bot link to real customers, run the full test below using a second Telegram account or a colleague's account.

### 6.1 Customer link

Send customers this link:

```text
https://t.me/<your-bot-username>
```

Example:

```text
https://t.me/herbaloem_sales_bot
```

Customers click **Start** and begin chatting.

### 6.2 Expected customer experience

- Customer says: `Hi, I want 500 units of turmeric powder to Germany.`
  - AI replies and asks for specification, quantity, packaging, destination, delivery time, and contact details.

- Customer says: `What is your best price?`
  - AI does not quote a final price automatically.
  - Customer receives a holding message.
  - Operator receives an approval card in Telegram.

- Customer says: `Can it cure diabetes?`
  - AI does not make a medical claim.
  - The session is routed to human review.

### 6.3 Mandatory go-live test

Run this test before real traffic:

| Step | Action | Expected result |
|---|---|---|
| 1 | Second account sends `hello` to the bot | Second account receives an AI reply within a few seconds |
| 2 | Second account sends `what is your best price for 1000 units?` | Second account receives a holding message; operator receives an approval card with Approve / Take over / Reject |
| 3 | Operator clicks **Approve** | Operator sees `Delivery: sent to customer`; second account receives the proposed AI reply |
| 4 | Second account sends `thanks, can it cure cancer?` | The case is routed to human review; operator gets a queue notification |
| 5 | Operator sends `/reply <sessionId> Sorry, we cannot make medical claims.` | Second account receives the human reply |

If all five steps pass, the bot is ready for real customers.

### 6.4 If the customer does not receive the approved reply

Open `CONTROL.command`, choose **8) View live logs**, and check for:

- `customer delivery skipped`
  - The session is probably a website channel session, not a Telegram session. The operator will see a message such as `Delivery: skipped (channel site has no outbound delivery)`. This is expected for website integrations.

- `telegram handler crashed`
  - This should not happen in the current version. If it appears, send the log line to technical support.

- `telegram delivery failed`
  - The customer may have blocked the bot, the token may have been revoked, or Telegram rejected delivery.

The current version includes protection against the previous issue where approving a non-Telegram session could stop Telegram polling. The handler now catches errors globally and sends a safe fallback reply if customer processing fails.

---

## 7. Web dashboard

Open:

```text
http://localhost:<port>/admin
```

Default port is 8787. You can also double-click `CONTROL.command` and choose option 7.

The dashboard supports Chinese and English. Use the language selector in the top-right corner.

Tabs:

| Tab | Purpose |
|---|---|
| Overview | Status, uptime, active sessions, approvals, message counts, 24-hour trends, channel and risk distribution |
| Approvals | Review customer text and proposed replies; approve, reject, take over, or send a custom human reply |
| Sessions | View all sessions, open a session timeline, pause, resume, take over, or reply |
| Message Stream | Latest 100 cross-session messages |
| Workflow | End-to-end routing view and risk rules |
| System / Config | PID, port, model provider, key configuration status, approval settings, SLA |

The page refreshes automatically every 5 seconds.

---

## 8. Telegram operator commands

Only the configured operator Chat ID can use these commands.

```text
/whoami                         Show current chat_id
/status                         Show service status
/sessions                       List active sessions
/pause <sessionId> [reason]     Pause AI for a session
/resume <sessionId>             Resume AI for a session
/takeover <sessionId>           Enable human takeover
/approve <approvalId>           Approve the proposed AI reply
/reject <approvalId> [reason]   Reject the proposed AI reply
/reply <sessionId> <message>    Send a human reply to the customer
```

Approval cards also include **Approve**, **Take over**, and **Reject** buttons.

---

## 9. Troubleshooting

### Q1: Customer messages are seen but not answered

Check in this order:

1. Double-click `CONTROL.command` and choose **6) Status / process / logs**. The service must be running.
2. Open `http://localhost:<port>/health`. It must return `{"ok":true}`.
3. Choose **8) View live logs** and look for errors.
4. In BotFather, use `/mybots` and confirm the bot still exists.
5. Send `/whoami` to the bot. If even `/whoami` does not reply, the token is wrong or the service is not running.
6. Restart the service: `CONTROL.command` -> option 5 Stop -> option 4 Start.

### Q2: Approval cards do not arrive in the operator Telegram

1. Send `/whoami` from the operator account to the bot.
2. Copy the returned `chat_id`.
3. Run `CONTROL.command` -> option 3.
4. Paste the Chat ID and restart.

### Q3: How do I switch to a new bot?

Run `CONTROL.command` -> option 2, paste the new Telegram Bot Token, and keep other settings by pressing Enter. Revoke the old bot token in BotFather.

### Q4: How do I stop or restart the service?

Use `CONTROL.command`:

```text
4) Start service
5) Stop service
6) View status / process / logs
```

The service is registered with macOS LaunchAgent and starts automatically after login.

### Q5: Can customers chat on my website instead of Telegram?

Yes. Your website can POST messages to:

```text
http://<Mac-mini-LAN-IP>:<port>/webhooks/site/message
```

Example request body:

```json
{"customerId":"web-user-001", "text":"Hello", "displayName":"Visitor", "locale":"en"}
```

The response field `customerReply` is the message to show to the website visitor. Do not expose this port directly to the public internet. Use Tailscale, Cloudflare Tunnel, VPN, or a controlled backend proxy.

### Q6: Can multiple operators work together?

The current version supports one operator chat. To let multiple people operate together, create a Telegram group, add the bot and all operators to that group, send `/whoami` in the group, and set `TELEGRAM_OPERATOR_CHAT_ID` to the negative group chat ID returned by the bot.

---

## 10. Security rules

- Keep the Telegram Bot Token only in `.env`. Do not share it in chat or screenshots.
- Keep OpenAI and Gemini API keys private. Revoke and rotate any key that appears in chat, GitHub, email, or screenshots.
- Do not expose port 8787 or 8790 directly to the public internet.
- Use Tailscale, Cloudflare Tunnel, or VPN for remote access.
- Enable macOS FileVault full-disk encryption.
- Use a strong Mac login password.
- Back up the `data/` folder regularly. It contains all local session history.
- To uninstall, run `CONTROL.command` -> option 9, then delete the `health-ai-sales-agent` folder.

---

## The three files operators need to know

| File | Purpose |
|---|---|
| `INSTALL.command` | First installation or full reinstall |
| `CONTROL.command` | Daily control menu: start, stop, logs, dashboard, configuration, key changes |
| `SET_OPERATOR.command` | Quick shortcut to update the operator Chat ID |

If something is not covered here, open `CONTROL.command`, choose **8) View live logs**, and send the relevant error lines to technical support.
