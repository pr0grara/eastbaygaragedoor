/**
 * Lead-gen site Worker entry (Workers Static Assets + a lead endpoint). PORTABLE — identical
 * across every site; per-site values come from wrangler.jsonc `vars` (SITE_SLUG, COMPANY,
 * ALERT_TO, ALERT_FROM) + secrets (RESEND_API_KEY, TURNSTILE_SECRET).
 *
 * Asset-first: static pages are served directly by the ASSETS layer and never invoke this
 * Worker; only POST /api/lead (and true 404s) reach the code below — a bug here can't take
 * the marketing pages down.
 *
 * POST /api/lead → honeypot → Turnstile (if configured) → per-IP throttle → store in the
 * central `leads` D1 (arabuilds-intake, attributed by `site`) → best-effort Resend email
 * (optional customer photo delivered as an attachment).
 */
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const norm = (v) => (v == null ? '' : String(v)).trim();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/lead') {
      if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);
      return handleLead(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleLead(request, env, ctx) {
  const siteSlug = env.SITE_SLUG || 'unknown-site';

  let body = {};
  let photo = null; // optional uploaded image (File), delivered as an email attachment
  const ct = request.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      body = await request.json();
    } else {
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) {
        if (v instanceof File) { if (k === 'photo' && v.size > 0) photo = v; }
        else body[k] = v;
      }
    }
  } catch { return json({ success: false, message: 'Invalid request' }, 400); }
  if (!body || typeof body !== 'object') return json({ success: false, message: 'Invalid request' }, 400);

  // Honeypot — real people leave company_website empty. Silently accept, store nothing.
  if (norm(body.company_website) || norm(body.botcheck)) return json({ success: true });

  // Oversized text body (flood / storage abuse) — a real lead is a few KB.
  if (JSON.stringify(body).length > 20000) return json({ success: false, message: 'Submission too large.' }, 413);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Turnstile — enforced only when a secret is configured.
  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET, norm(body['cf-turnstile-response']), ip);
    if (!ok) return json({ success: false, message: 'Verification failed — please retry.' }, 403);
  }

  // Per-IP throttle: max 5 per 10 min (via the same D1).
  if (env.DB) {
    try {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM leads WHERE ip = ? AND site = ? AND created_at >= ?`
      ).bind(ip, siteSlug, since).first();
      if (row && row.n >= 5)
        return json({ success: false, message: 'Too many submissions — please try again shortly.' }, 429);
    } catch { /* throttle is best-effort; never block a real lead on it */ }
  }

  if (!norm(body.name)) return json({ success: false, message: 'Please add your name.' }, 400);
  const phone = norm(body.phone), email = norm(body.email);
  if (!phone && !email) return json({ success: false, message: 'Add a phone or email so we can reach you.' }, 400);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return json({ success: false, message: 'Please enter a valid email.' }, 400);

  const now = new Date().toISOString();
  const ua = request.headers.get('User-Agent') || '';
  const source = norm(body.source) || 'website';

  if (env.DB) {
    try {
      const dataJson = JSON.stringify(
        photo ? { ...body, photo: { name: photo.name, size: photo.size, type: photo.type } } : body
      );
      await env.DB.prepare(
        `INSERT INTO leads (created_at, site, name, phone, email, message, source, ip, ua, data)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      ).bind(now, siteSlug, norm(body.name), phone, email, norm(body.message),
             source, ip, ua, dataJson).run();
    } catch (e) {
      // Don't lose the lead on a storage hiccup — the email alert is the safety net.
      console.error('leads D1 insert failed:', e);
    }
  }

  ctx.waitUntil(sendEmail(env, body, { email, source, photo }).catch((e) => console.error('lead email failed:', e)));
  return json({ success: true });
}

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'unknown') form.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const out = await res.json();
    return !!out.success;
  } catch { return false; }
}

async function sendEmail(env, body, meta) {
  if (!env.RESEND_API_KEY || !env.ALERT_TO) return;
  const company = env.COMPANY || 'Lead-gen site';
  const siteSlug = env.SITE_SLUG || 'site';
  const FIELDS = ['name', 'phone', 'email', 'address', 'message', 'source'];
  const lines = [`NEW LEAD — ${company} (${meta.source})`, ''];
  for (const f of FIELDS) { const v = norm(body[f]); if (v) lines.push(`${f}: ${v}`); }

  const payload = {
    from: env.ALERT_FROM || `${company} <onboarding@resend.dev>`,
    to: [env.ALERT_TO],
    reply_to: meta.email || undefined,
    subject: `New lead — ${siteSlug} — ${norm(body.name) || 'unknown'}`,
  };

  // Optional photo → email attachment (best-effort; skip non-images or >10MB).
  const photo = meta.photo;
  if (photo && photo.size > 0 && photo.size <= 10 * 1024 * 1024 && (photo.type || '').startsWith('image/')) {
    try {
      const buf = new Uint8Array(await photo.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      payload.attachments = [{ filename: photo.name || 'photo.jpg', content: btoa(bin) }];
      lines.push('', '📎 Customer photo attached.');
    } catch (e) {
      console.error('photo attach failed:', e);
    }
  }
  payload.text = lines.join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Resend ' + res.status);
}
