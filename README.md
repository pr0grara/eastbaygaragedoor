> **ARCHIVED** — this is the original single-site Bay Area garage-door prototype the factory grew from. Superseded by the [`lead_gen/`](../lead_gen) factory; kept for history. **Do not build new sites from here.**

# Local Lead-Gen Template (Astro)

A static, **SEO-first local lead-generation** site built with [Astro](https://astro.build).
Pages for every **service × city** are generated from config, so one business can rank for
many "[service] in [city]" searches. Outputs static files to `dist/` — deploys to
**Cloudflare Pages** (or any static host). No backend required.

## Stack & approach

- **Astro** static output (`dist/`) — fast, SEO-friendly, zero client JS except a tiny form/nav script.
- **Programmatic pages** from `src/config/` (services + cities):
  - `/` — home
  - `/[service]/` — service hub (e.g. `/spring-repair/`)
  - `/[service]/[city]/` — service in a city (e.g. `/spring-repair/oakland/`) ← the SEO money pages
  - `/service-area/[city]/` — city hub (e.g. `/service-area/oakland/`)
  - `/terms`, `/privacy`
- **SEO**: per-page `<title>`/description/canonical, `LocalBusiness` + `Service` + `BreadcrumbList`
  JSON-LD, auto `sitemap-index.xml`, and `robots.txt`.
- **Twilio**: treated as **external** call-tracking/forwarding infrastructure. The site just
  displays the (tracked) phone number via click-to-call. No backend/webhooks here — configure
  forwarding in the Twilio console. (Add lead logging / dynamic routing later only if needed.)
- **Lead form**: posts to an **external form service** (Formspree / Web3Forms) — no server.

## Configure

Everything lives in `src/config/`:

- `site.ts` — company, phone, region, production `url`, the **form endpoint**, and the
  **service-area map** (`mapEmbedSrc`).
- `services.ts` — the services offered (each adds a hub page + one page per city).
- `cities.ts` — the service-area cities (each adds a hub page + one page per service).

### Service-area map

The home page's "Serving the {region}" section shows a map next to the city links. By default
it uses a keyless Google Maps embed centered on `SITE.region`. For precise framing, set
`SITE.mapEmbedSrc` to an official embed src (Google Maps → Share → **Embed a map** → copy the
`src`).

**Page count = services × cities + hubs.** With 4 services and 14 cities that's
4×14 + 4 + 14 + 3 ≈ **77 pages**, all from config.

### Lead form

Set `formEndpoint` in `src/config/site.ts`:

- **Formspree**: create a form, set `formEndpoint` to `https://formspree.io/f/xxxxxx`.
- **Web3Forms**: set `formEndpoint` to `https://api.web3forms.com/submit` and `formAccessKey`
  to your access key.

If `formEndpoint` is empty, the form renders but submission shows "please call us" — so
click-to-call still works. The form includes a honeypot field for basic spam protection.

### Site URL

Set the production domain in two places (kept in sync intentionally):
`SITE.url` in `src/config/site.ts` and `site` in `astro.config.mjs` (or `SITE_URL` env var).
This drives canonical URLs, the sitemap, and `robots.txt`.

## Develop & build

Requires Node 18+ (`nvm use 22`).

```bash
npm install
npm run dev       # local dev server
npm run build     # static output → dist/
npm run preview   # preview the built site
```

## Deploy to Cloudflare

This is a pure static site, so either Cloudflare product works. Both serve the built `dist/`.

### Option A — Cloudflare Workers (Static Assets)

Uses `wrangler.jsonc` in the repo (`assets.directory: "./dist"`).

- **Local CLI:** `npm run deploy` (runs `astro build` then `npx wrangler deploy`).
- **Git-connected (Workers Builds):** Cloudflare reads `wrangler.jsonc`. Set:
  - **Build command**: `npm run build`
  - **Deploy command**: `npx wrangler deploy` (or leave default)
  - **Environment variable**: `SITE_URL=https://yourdomain.com`

> **`public/.assetsignore`** must exist — Workers Static Assets expects it, and Astro copies
> it into `dist/` at build. It's empty (we serve everything); don't delete it.

### Option B — Cloudflare Pages (simplest)

- Pages → Create project → connect the repo.
- **Build command**: `npm run build` · **Output directory**: `dist`
- **Environment variable**: `SITE_URL=https://yourdomain.com`
- Pages ignores `wrangler.jsonc`/`.assetsignore` — neither is needed here.

Either way: no server, no functions. Twilio call forwarding is configured separately in the
Twilio console (point your tracked number at the destination/contractor).

## Project layout

```
astro.config.mjs        site URL + sitemap
src/
  config/               site.ts, services.ts, cities.ts  ← edit these
  layouts/BaseLayout.astro   SEO head + JSON-LD + header/footer
  components/           Header, Footer, QuoteForm, ServiceCards, CityLinks, Reviews, FinalCta
  lib/                  urls.ts (route helpers), schema.ts (JSON-LD)
  pages/                index, [service]/index, [service]/[city], service-area/[city], terms, privacy, robots.txt.ts
  styles/global.css
```
