/**
 * Email integration. Provider-flexible via HTTP APIs (no SMTP, no deps).
 * Configure in Settings: { provider, apiKey, fromEmail, fromName }
 * Supported providers: 'brevo' (default), 'sendgrid', 'resend'.
 */

async function send(cfg, msg) {
  if (!cfg || !cfg.apiKey) return { ok: false, error: 'Email not configured (add an API key in Settings).' };
  const provider = (cfg.provider || 'brevo').toLowerCase();
  try {
    if (provider === 'brevo') return await brevo(cfg, msg);
    if (provider === 'sendgrid') return await sendgrid(cfg, msg);
    if (provider === 'resend') return await resend(cfg, msg);
    return { ok: false, error: 'Unknown email provider: ' + provider };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function brevo(cfg, m) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': cfg.apiKey, 'Content-Type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify({
      sender: { email: cfg.fromEmail, name: cfg.fromName || 'Origin40' },
      to: [{ email: m.to }],
      subject: m.subject,
      htmlContent: m.html || ('<p>' + (m.text || '') + '</p>')
    })
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 300) };
}

async function sendgrid(cfg, m) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: m.to }] }],
      from: { email: cfg.fromEmail, name: cfg.fromName || 'Origin40' },
      subject: m.subject,
      content: [{ type: 'text/html', value: m.html || m.text || '' }]
    })
  });
  return { ok: res.ok, status: res.status, body: (await res.text()).slice(0, 300) };
}

async function resend(cfg, m) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: (cfg.fromName ? cfg.fromName + ' <' + cfg.fromEmail + '>' : cfg.fromEmail),
      to: [m.to], subject: m.subject, html: m.html || m.text || ''
    })
  });
  return { ok: res.ok, status: res.status, body: (await res.text()).slice(0, 300) };
}

module.exports = { send };
