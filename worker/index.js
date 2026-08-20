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

// Web-form lead → text alert. Fires the SAME A2P path the call alerts use: POST a tiny
// summary to the Twilio Functions `lead-alert` endpoint, which texts Ara. URL + token can be
// overridden per-site via env (LEAD_ALERT_URL / LEAD_ALERT_SECRET); the fallbacks below are
// the shared defaults so no per-site wrangler change is needed. Best-effort — never blocks a lead.
const LEAD_ALERT_URL_DEFAULT = 'https://lead-gen-twilio-6921-dev.twil.io/lead-alert';
const LEAD_ALERT_SECRET_DEFAULT = '2101d6a685caedff82f5512253143de640e17007f85db891';

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

  // Turnstile — verify when configured, but NEVER hard-reject on a missing/failed token
  // (flaky mobile, blocked 3rd-party JS, expired challenge). Flag instead: the lead is still
  // stored + reviewable in D1, and only the email alert is suppressed. Honeypot + per-IP
  // throttle + the junk-phone drop still wall off bot floods.
  let turnstileFail = false;
  if (env.TURNSTILE_SECRET) {
    const tsToken = norm(body['cf-turnstile-response']);
    // No token at all = a bot POSTing straight to /api/lead (the real widget always sends one).
    // Silently drop like the honeypot — store nothing, email nothing. This is the undo of the
    // Aug-2026 "graceful degrade" that let a tokenless bot flood reach the inbox.
    if (!tsToken) return json({ success: true });
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET, tsToken, ip);
    if (!ok) turnstileFail = true;
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

  // --- Spam disposition ---------------------------------------------------
  // DROP (silent success, store nothing): junk phone + empty message. A real customer never
  // types a <7-digit phone AND leaves the message blank. Signature of the Aug-2026 bot
  // ("96"/"1996"/"2029"). Requires a non-empty phone, so a name+email lead is never affected.
  const phoneDigits = phone.replace(/\D/g, '');
  if (phone && phoneDigits.length < 7 && !norm(body.message)) return json({ success: true });

  // FLAG (still stored + reviewable in D1 via `data._spam_flag`, but the email alert is
  // suppressed so the inbox stays clean). Flag — never drop — so nothing debatable is lost.
  let spamFlag = turnstileFail ? 'turnstile-fail' : '';
  // Foreign country code on a US-only local-service site (e.g. +44). A US expat is remotely
  // possible, so flag rather than drop.
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  if (/^\+(?!1)/.test(cleanPhone)) spamFlag = 'intl-phone';
  // Duplicate within 15 min (same email or phone on this site) — likely an accidental
  // double-submit. Flag for review/deletion; do NOT drop (may be an intentional resubmit).
  if (!spamFlag && env.DB && (email || phone)) {
    try {
      const dupSince = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const dup = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM leads WHERE site = ? AND created_at >= ?
           AND ((email != '' AND email = ?) OR (phone != '' AND phone = ?))`
      ).bind(siteSlug, dupSince, email, phone).first();
      if (dup && dup.n > 0) spamFlag = 'duplicate';
    } catch { /* best-effort; a dup-check failure must never block a real lead */ }
  }

  const now = new Date().toISOString();
  const ua = request.headers.get('User-Agent') || '';
  const source = norm(body.source) || 'website';

  if (env.DB) {
    try {
      const dataObj = photo
        ? { ...body, photo: { name: photo.name, size: photo.size, type: photo.type } }
        : { ...body };
      if (spamFlag) dataObj._spam_flag = spamFlag;
      const dataJson = JSON.stringify(dataObj);
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

  // Flagged rows (intl-phone / duplicate) are stored for review but don't ping the inbox/phone.
  if (!spamFlag) {
    ctx.waitUntil(sendEmail(env, body, { email, source, photo }).catch((e) => console.error('lead email failed:', e)));
    ctx.waitUntil(sendLeadText(env, { name: norm(body.name), phone, email, source }).catch((e) => console.error('lead text failed:', e)));
  }
  if (!(request.headers.get('Accept') || '').includes('application/json')) {
    // Native (no-JS) submit — send them back to a real page, not raw JSON.
    const ref = request.headers.get('Referer');
    return Response.redirect(ref || new URL('/', request.url).toString(), 303);
  }
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

async function sendLeadText(env, meta) {
  const url = env.LEAD_ALERT_URL || LEAD_ALERT_URL_DEFAULT;
  const token = env.LEAD_ALERT_SECRET || LEAD_ALERT_SECRET_DEFAULT;
  if (!url || !token) return;
  const form = new URLSearchParams({
    token,
    company: env.COMPANY || env.SITE_SLUG || 'lead-gen site',
    site: env.SITE_SLUG || '',
    name: meta.name || '',
    phone: meta.phone || '',
    email: meta.email || '',
    source: meta.source || '',
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!res.ok) throw new Error('lead-alert ' + res.status);
}
