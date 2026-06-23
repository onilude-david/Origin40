/**
 * Discord integration via incoming webhooks (no bot, no deps — HTTP only).
 *
 * Config in Settings (db setting "discord"):
 *   webhookAnnouncements : #announcements webhook URL (broadcasts, deadlines, welcomes)
 *   webhookLog           : #automation-log webhook URL (app events)
 *   webhookSubmissions   : #submissions webhook URL (optional)
 *   inviteUrl / serverUrl: human links for the Control Center tile
 *
 * Webhooks are write-only. Discord returns 204 No Content on success.
 * To later manage roles / invites / DMs, upgrade to a bot token.
 */

function webhookFor(cfg, channel, strict) {
  cfg = cfg || {};
  const map = {
    announcements: cfg.webhookAnnouncements,
    log: cfg.webhookLog,
    submissions: cfg.webhookSubmissions
  };
  const url = map[channel];
  if (url) return url;
  if (strict) return '';
  // manual sends may fall back to a configured channel
  return cfg.webhookAnnouncements || cfg.webhookLog || cfg.webhookSubmissions || '';
}

async function postWebhook(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body: body.slice(0, 300) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function payloadFor(msg) {
  return {
    username: msg.username || 'Origin40',
    content: msg.content ? String(msg.content).slice(0, 1900) : undefined,
    embeds: msg.embeds,
    allowed_mentions: { parse: [] } // never accidentally @everyone / @here / roles
  };
}

/** Manual send (user-triggered). Falls back to any configured webhook. */
async function send(cfg, msg) {
  if (!cfg) return { ok: false, error: 'Discord not configured.' };
  const url = webhookFor(cfg, msg.channel || 'announcements', false);
  if (!url) return { ok: false, error: 'No Discord webhook URL set. Add one in Settings → Discord.' };
  return postWebhook(url, payloadFor(msg));
}

/** Fire-and-forget app-event notice. Only posts if THAT channel's webhook is set. Never throws. */
function notify(cfg, channel, content) {
  const url = webhookFor(cfg, channel, true);
  if (!url) return Promise.resolve({ ok: false, skipped: true });
  return postWebhook(url, payloadFor({ content: content })).catch(function () { return { ok: false }; });
}

module.exports = { send, notify, postWebhook, webhookFor };
