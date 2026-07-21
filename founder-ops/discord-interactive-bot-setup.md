# Origin40 Discord Interactive Bot Setup

The cPanel now includes a zero-dependency Discord comms assistant that can answer founder questions
in approved cohort channels.

## What it can answer

- Today's schedule
- Next session / class
- Meeting link
- Founder portal / LMS link
- Submission guidance
- MVP build guidance
- Founder MVP-support group
- Founders with MVP/product/prototype
- Programme structure
- Communication flow
- Attendance reminder
- Basic Origin40 website link

It should not answer private grading, admissions/rejection explanations, sensitive founder feedback,
payment, passwords, tokens, or personal support matters. Those stay with the programme team.

## Required Discord setup

1. Open Discord Developer Portal.
2. Select the Origin40 application.
3. Go to **Bot**.
4. Click **Reset Token** and copy the new bot token.
5. Enable **Privileged Gateway Intents**:
   - Server Members Intent: optional for member audits.
   - Message Content Intent: required for the bot to read founder questions.
6. Confirm the bot is invited into the Origin40 server with:
   - View Channels
   - Send Messages
   - Read Message History
   - Use Slash Commands, optional

## cPanel setup

1. Open the local Origin40 cPanel.
2. Go to **Settings & Integrations → Discord**.
3. Paste the new bot token.
4. Save.
5. Click **Start responder**.
6. Use **Refresh status** to confirm it is running.

## Default channels

If no channel IDs are configured, the responder auto-enables these channels when they exist:

- `general`
- `cohort-lounge`
- `ask-the-team`
- `week-2-build`
- `stuck`
- `book-office-hours`

## Testing

Ask in an enabled channel:

> What is today's schedule?

or:

> Origin40 portal link?

The bot should reply with the current programme information from the cPanel data.

Other useful tests:

> Who needs MVP build support?

> Who already has an MVP?

> How does Origin40 work?

> Where do we submit assignments?
