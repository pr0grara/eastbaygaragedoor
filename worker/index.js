/**
 * Lead-gen site Worker entry (Workers Static Assets + a lead endpoint). PORTABLE — identical
 * across every site; per-site values come from wrangler.jsonc `vars` (SITE_SLUG, COMPANY,
 * ALERT_TO, ALERT_FROM) + secrets (RESEND_API_KEY, TURNSTILE_SECRET).
 *
 * Asset-first: static pages are served directly by the ASSETS layer and never invoke this
 * Worker; only POST /api/lead (and true 404s) reach the code below — a bug here can't take
 * the marketing pages down.
 *
 * POST /api/lead → honeypot → Turnstile (if configured) → validation + spam flags → photo to R2
 * → POST to arabuilds /api/lead-intake, which owns the per-IP throttle, the duplicate check and
 * the write to the central `leads` table (attributed by `site`) → best-effort Resend email
 * (optional customer photo delivered as an attachment). The photo is ALSO stored in the private
 * R2 bucket `arabuilds-lead-files` (binding LEAD_FILES) with its key on the lead row
 * (data.photo.key), so /admin/leads in arabuilds can show it inline.
 *
 * Since 2026-10-06 this Worker has NO D1 binding: the intake database also carries the tunnel's
 * control tables, so only arabuilds writes to it. Secrets: LEAD_INTAKE_SECRET (required to store),
 * LEAD_ALERT_SECRET (required to text/push), RESEND_API_KEY, TURNSTILE_SECRET — all `wrangler
 * secret put`, none in code.
 */
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const norm = (v) => (v == null ? '' : String(v)).trim();

// Web-form lead → text/push alert. Fires the SAME A2P path the call alerts use: POST a tiny
// summary to the Twilio Functions `lead-alert` endpoint. The URL may be overridden per-site via
// LEAD_ALERT_URL; the token is the LEAD_ALERT_SECRET Worker secret (a hardcoded default used to
// live here and sat in 16 public repos; removed 2026-10-06). Best-effort — never blocks a lead.
const LEAD_ALERT_URL_DEFAULT = 'https://lead-gen-twilio-6921-dev.twil.io/lead-alert';
// Where leads are stored: arabuilds owns the write (see header). Overridable via LEAD_INTAKE_URL.
const LEAD_INTAKE_URL_DEFAULT = 'https://arabuilds.com/api/lead-intake';

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

  // Turnstile: verify when configured, but never drop a lead over a missing or failed token.
  // Every outcome is stored; only a verified token fires the email and the text/push alert.
  // (LEADFIX-2026-10-05)
  //   verified token                 clean lead, alerts fire.
  //   token that siteverify rejects  flagged 'turnstile-fail', stored, no alert.
  //   no token, ts=blocked|unsolved  the form's own JS waited for the check, it never finished
  //                                  (blocked script, unticked box), and it sent anyway. Almost
  //                                  always a real person: flagged 'unverified', stored visible
  //                                  in /admin/leads and counted, no alert.
  //   no token, no ts marker         a POST that never ran the page (the Aug-2026 bot flood):
  //                                  flagged 'no-token', stored hidden (spam=1, so it is out of
  //                                  the leads view and every count), no alert. Kept, not lost.
  // Until 2026-10-05 a missing token was dropped silently while the page said "Thanks!", which
  // ate any real lead that tapped Send before the lazily loaded check had finished.
  let tsFlag = '';
  let hideRow = 0;
  if (env.TURNSTILE_SECRET) {
    const tsToken = norm(body['cf-turnstile-response']);
    if (!tsToken) {
      if (norm(body.ts)) tsFlag = 'unverified';
      else { tsFlag = 'no-token'; hideRow = 1; }
    } else if (!(await verifyTurnstile(env.TURNSTILE_SECRET, tsToken, ip))) {
      tsFlag = 'turnstile-fail';
    }
  }

  // Per-IP throttle (max 5 per 10 min per site) now runs inside arabuilds /api/lead-intake, which
  // answers 429 and we pass that through below.

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
  let spamFlag = tsFlag;
  // Foreign country code on a US-only local-service site (e.g. +44). A US expat is remotely
  // possible, so flag rather than drop.
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  if (/^\+(?!1)/.test(cleanPhone)) spamFlag = 'intl-phone';
  // Duplicate within 15 min (same email or phone on this site) is flagged by /api/lead-intake,
  // which returns the final spam_flag; it is never dropped (may be an intentional resubmit).

  const now = new Date().toISOString();
  const ua = request.headers.get('User-Agent') || '';
  const source = norm(body.source) || 'website';

  // Optional photo → private R2 so the arabuilds admin leads view can display it. The key is
  // stored on the lead row (data.photo.key); the email attachment further down is unchanged.
  // Best-effort: an upload failure still stores the lead with the photo's metadata.
  let photoKey = null;
  if (photo && env.LEAD_FILES && photo.size <= 10 * 1024 * 1024 && (photo.type || '').startsWith('image/')) {
    try {
      const safeName = (photo.name || 'photo.jpg').replace(/[^A-Za-z0-9._-]/g, '_').slice(-80) || 'photo.jpg';
      const key = `${siteSlug}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}/${safeName}`;
      await env.LEAD_FILES.put(key, await photo.arrayBuffer(), { httpMetadata: { contentType: photo.type } });
      photoKey = key;
    } catch (e) { console.error('lead photo R2 put failed:', e); }
  }

  // Store via arabuilds. It applies the throttle (429 → passed through), adds the 'duplicate'
  // flag when it sees one, and writes the row. On any other failure the lead is NOT lost: the
  // email and the text/push alert below are the safety net, exactly as when the old direct
  // D1 insert failed.
  // The form body is public input: a submitter must not be able to plant the review flag or point
  // the photo key at someone else's object, so those two keys are ours alone.
  const { _spam_flag: _clientFlag, photo: _clientPhoto, ...fields } = body;
  const dataObj = photo
    ? { ...fields, photo: { name: photo.name, size: photo.size, type: photo.type, key: photoKey } }
    : { ...fields };
  let storeFailed = false;
  try {
    const stored = await storeLead(env, {
      site: siteSlug, ip, ua, created_at: now,
      name: norm(body.name), phone, email, message: norm(body.message), source,
      data: dataObj, spam_flag: spamFlag, hide: hideRow,
    });
    if (stored && stored.throttled) {
      if (photoKey && env.LEAD_FILES) ctx.waitUntil(env.LEAD_FILES.delete(photoKey).catch(() => {}));
      return json({ success: false, message: 'Too many submissions — please try again shortly.' }, 429);
    }
    // arabuilds may ESCALATE the flag (it sees duplicates), never clear one we set ourselves.
    if (!spamFlag && stored && stored.ok && typeof stored.spam_flag === 'string' && stored.spam_flag) spamFlag = stored.spam_flag;
  } catch (e) {
    storeFailed = true;
    console.error(`lead-intake store failed (site=${siteSlug} flag=${spamFlag || 'none'} name=${norm(body.name)}):`, e);
    // No row exists to point at the photo; the email below still carries it as an attachment.
    if (photoKey && env.LEAD_FILES) ctx.waitUntil(env.LEAD_FILES.delete(photoKey).catch(() => {}));
  }

  // Flagged rows (turnstile-fail, unverified, no-token, intl-phone, duplicate) are stored but
  // don't ping the inbox or the phone.
  if (!spamFlag) {
    ctx.waitUntil(sendEmail(env, body, { email, source, photo }).catch((e) => console.error('lead email failed:', e)));
    ctx.waitUntil(sendLeadText(env, { name: norm(body.name), phone, email, source }).catch((e) => console.error('lead text failed:', e)));
  } else if (storeFailed) {
    // A flagged lead normally lives only as a row for review. With no row it would vanish, so the
    // email (not the text) carries it, marked, until arabuilds is reachable again.
    ctx.waitUntil(sendEmail(env, body, { email, source, photo, note: `⚠ NOT STORED (arabuilds unreachable) — flagged ${spamFlag}; review by hand.` })
      .catch((e) => console.error('lead email failed:', e)));
  }
  if (!(request.headers.get('Accept') || '').includes('application/json')) {
    // Native (no-JS) submit — send them back to a real page, not raw JSON.
    const ref = request.headers.get('Referer');
    return Response.redirect(ref || new URL('/', request.url).toString(), 303);
  }
  return json({ success: true });
}

// POST the lead to arabuilds /api/lead-intake. Resolves { ok, spam_flag } on 200, { throttled: true }
// on 429, throws on anything else (the caller logs and falls back to the alerts).
async function storeLead(env, payload) {
  const url = env.LEAD_INTAKE_URL || LEAD_INTAKE_URL_DEFAULT;
  const secret = env.LEAD_INTAKE_SECRET;
  if (!secret) throw new Error('LEAD_INTAKE_SECRET not set');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Lead-Intake-Secret': secret },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 429) return { ok: false, throttled: true };
  if (!res.ok) throw new Error('lead-intake ' + res.status);
  return await res.json();
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
  if (meta.note) lines.push('', meta.note);

  const payload = {
    from: env.ALERT_FROM || `${company} <onboarding@resend.dev>`,
    to: [env.ALERT_TO],
    reply_to: meta.email || undefined,
    subject: `${meta.note ? '[not stored] ' : ''}New lead — ${siteSlug} — ${norm(body.name) || 'unknown'}`,
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
  const token = env.LEAD_ALERT_SECRET;
  if (!url || !token) { console.error('LEAD_ALERT_SECRET not set; lead text/push skipped'); return; }
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
