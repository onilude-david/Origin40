/**
 * WhatsApp integration. Two providers (no deps, HTTP only):
 *  - 'meta'   : WhatsApp Cloud API  (config: { token, phoneNumberId })
 *  - 'twilio' : Twilio WhatsApp     (config: { accountSid, authToken, from })
 *
 * Note: WhatsApp only allows free-form text within a 24h customer-service window;
 * otherwise you must send an approved template. For broadcasts (announcements,
 * deadline push) you'll typically use an approved template — pass { template, params }.
 */

async function send(cfg, msg) {
  if (!cfg) return { ok: false, error: 'WhatsApp not configured.' };
  const provider = (cfg.provider || 'meta').toLowerCase();
  try {
    if (provider === 'meta') return await meta(cfg, msg);
    if (provider === 'twilio') return await twilio(cfg, msg);
    return { ok: false, error: 'Unknown WhatsApp provider: ' + provider };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function meta(cfg, m) {
  if (!cfg.token || !cfg.phoneNumberId) return { ok: false, error: 'Meta WhatsApp needs token + phoneNumberId.' };
  const to = String(m.to).replace(/[^0-9]/g, '');
  let payload;
  if (m.template) {
    payload = { messaging_product: 'whatsapp', to: to, type: 'template',
      template: { name: m.template, language: { code: m.lang || 'en' },
        components: m.params ? [{ type: 'body', parameters: m.params.map(function (p) { return { type: 'text', text: String(p) }; }) }] : [] } };
  } else {
    payload = { messaging_product: 'whatsapp', to: to, type: 'text', text: { body: m.text || '' } };
  }
  const res = await fetch('https://graph.facebook.com/v20.0/' + cfg.phoneNumberId + '/messages', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return { ok: res.ok, status: res.status, body: (await res.text()).slice(0, 300) };
}

async function twilio(cfg, m) {
  if (!cfg.accountSid || !cfg.authToken || !cfg.from) return { ok: false, error: 'Twilio needs accountSid + authToken + from.' };
  const auth = Buffer.from(cfg.accountSid + ':' + cfg.authToken).toString('base64');
  const form = new URLSearchParams({ From: 'whatsapp:' + cfg.from, To: 'whatsapp:' + m.to, Body: m.text || '' });
  const res = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + cfg.accountSid + '/Messages.json', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });
  return { ok: res.ok, status: res.status, body: (await res.text()).slice(0, 300) };
}

module.exports = { send };
