# SPEC — Local-Service Lead-Gen Site Template

> **Audience:** an AI agent (or developer) using this repo as a template to build a new
> local-service website for **any trade in any region** — e.g. well repair in Maine, pest
> control in Kona, roofing in Tucson. This is the single source of truth for how the template
> is built and how to spin up a new site from it.
>
> **Golden rule:** new sites are produced by **editing config + swapping assets**, not by
> rewriting components or routing. If you find yourself editing `src/pages`, `src/layouts`,
> `src/components`, or `src/lib` to launch a new site, stop — the answer is almost always in
> `src/config/`.

---

## 1. TL;DR — what this is

A **static, config-driven, SEO-first lead-gen site generator** for a single-trade local
business. You describe the business once (`site.ts`), list the **services** it offers
(`services.ts`) and the **cities** it serves (`cities.ts`), and Astro programmatically builds:

- a homepage,
- an authority **hub page per service**,
- a **service × city** page for every matrix service in every city,
- a **city hub** page per city,
- legal pages + `robots.txt` + sitemap.

Every page ships hand-tuned local copy, JSON-LD schema, canonical/OG tags, a lead-capture form,
and dense internal linking. Output is plain static HTML/CSS deployed to a CDN. No database, no
server runtime, no client framework.

---

## 2. Design philosophy & brand vibe (READ FIRST — load-bearing)

The look must read as **a real local tradesman's website**: trustworthy, plain, and practical.
The mental model is a **yard sign, a service-truck decal, or a business card** — not a SaaS
landing page, not a venture-backed startup.

This is the most-violated rule when AI builds these sites. Hold the line:

**Aim for:**
- Plain simplicity and legibility over cleverness. If a choice is between "simple" and
  "modern/conventional," **pick simple.**
- An obvious phone number and "get a quote" CTA, always within reach (sticky header, hero,
  repeated CTAs).
- Real, local proof: real job photos, real city/neighborhood names, specific local problems.
- Calm, solid color blocks; generous text; clear headings; one accent color for action.

**Avoid — "scammy" signals:**
- Fake urgency/countdowns, "Act now!!", blinking badges, invented award seals.
- Stock-photo clutter, giant unrelated hero collages, mismatched logos.
- Walls of keyword-stuffed text that don't say anything specific or local.

**Avoid — "techy / startup" signals:**
- Gradient-on-gradient, glassmorphism, neon, dark-mode-by-default, heavy shadows everywhere.
- Big scroll animations, parallax, motion for motion's sake.
- Trend-driven ultra-minimalism (huge whitespace, 3-word hero, mystery-meat nav). Tradesmen
  sites should over-explain, not under-explain.

**Defaults that encode the vibe (don't drift without reason):**
- Palette: navy + green + white/soft-gray (see §9 tokens). One green accent for all primary
  actions.
- Type: Inter, self-hosted. Generous line-height (1.65 body). No display/novelty fonts.
- **Light mode only.** Do not add dark mode (a lone dark section on an otherwise-light site
  looks broken; the whole-site theme isn't built for it).
- Modest radii (12px) and one soft shadow token. No glass, no blur.

When in doubt, make it look like it was built by a competent local contractor who cares about
being found and called — not by a design agency.

---

## 3. Tech stack & runtime

| Concern | Choice |
|---|---|
| Framework | **Astro `^5`**, static output (no SSR adapter, no `output` set → static) |
| Language | TypeScript, `extends: astro/tsconfigs/strict` |
| UI/CSS framework | **None.** Hand-written `src/styles/global.css` + Astro scoped `<style>` |
| Fonts | `@fontsource-variable/inter` (self-hosted, imported in `BaseLayout.astro`) |
| Sitemap | `@astrojs/sitemap` (`^3`) |
| Images | Astro built-in `astro:assets` (`<Image>`, `getImage`) |
| Package manager | **npm** (`package-lock.json`) |
| Node | `>=18.20.8` (engines); **`.nvmrc` = 22** (use Node 22 to build) |
| Host | Cloudflare (static) — Workers Static Assets or Pages |

`package.json` dependencies (only three) and scripts:

```jsonc
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "deploy": "astro build && npx wrangler deploy"
},
"dependencies": {
  "@astrojs/sitemap": "^3.7.3",
  "@fontsource-variable/inter": "^5.2.8",
  "astro": "^5.0.0"
}
```

`astro.config.mjs`:

```js
export default defineConfig({
  site: process.env.SITE_URL || 'https://eastbaygaragedoorrepair.com',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'always' },   // inline CSS → no render-blocking request
  integrations: [
    sitemap({ filter: (page) => !/\/(terms|privacy)\/?$/.test(page) }), // exclude legal pages
  ],
});
```

**Env:** `SITE_URL` overrides the production domain at build time (CI/deploy). That's the only
env var read.

---

## 4. Repo map

```
.
├─ astro.config.mjs         # site URL, sitemap, inline CSS
├─ wrangler.jsonc           # Cloudflare deploy (assets.directory = ./dist), project name
├─ tsconfig.json            # strict + path aliases @config/@components/@layouts
├─ package.json             # 3 deps, scripts
├─ .nvmrc                   # 22
├─ public/                  # served as-is
│  ├─ _headers              # Cloudflare cache rules (_astro immutable 1y, webp 7d)
│  ├─ .assetsignore         # (empty — pure static)
│  └─ favicon.ico, favicon.png, favicon-32.png, apple-touch-icon.png
└─ src/
   ├─ config/               # ◀ EDIT HERE FOR NEW SITES
   │  ├─ site.ts            # SiteConfig singleton + tel()
   │  ├─ services.ts        # Service/ServiceSection/Faq + SERVICES + getService/MATRIX_SERVICES
   │  └─ cities.ts          # City/CityIssue + CITIES + getCity/nearbyCities
   ├─ lib/
   │  ├─ urls.ts            # serviceUrl / cityServiceUrl / cityUrl
   │  ├─ schema.ts          # localBusiness / breadcrumb / faqPage / serviceSchema (JSON-LD)
   │  └─ images.ts          # getHeroUrl (optimized WebP for CSS hero) + defaultHero
   ├─ layouts/
   │  └─ BaseLayout.astro   # <head>, SEO, schema injection, Header+Footer wrapper
   ├─ components/           # ~12 reusable sections (see §8)
   ├─ pages/                # routing (see §6)
   ├─ styles/global.css     # design system (see §9)
   └─ assets/               # hero/  services/  real_photos/  maps/  (+ README.md)
```

Path aliases (from `tsconfig.json`): `@config/*`, `@components/*`, `@layouts/*` →
`src/config/*`, `src/components/*`, `src/layouts/*`.

---

## 5. Data model (canonical — the heart of the template)

Three config files drive everything. Interfaces below are quoted verbatim; respect them.

### 5.1 `src/config/site.ts` — the business (singleton `SITE`)

```ts
export interface SiteConfig {
  company: string;
  tagline: string;
  /** What the business does, lowercase, for prose: "garage door repair" */
  trade: string;
  phone: string;          // dialable, E.164
  phoneDisplay: string;   // shown to visitors
  email: string;
  /** Service-area region name shown in headlines, e.g. "Bay Area" */
  region: string;
  /** Production URL — keep in sync with `site` in astro.config.mjs (or set SITE_URL). */
  url: string;
  /** External form handler (Formspree/Web3Forms). "" → call-only mode (submit disabled). */
  formEndpoint: string;
  /** Web3Forms access key, if using Web3Forms (otherwise leave ""). */
  formAccessKey: string;
  /** Unused by default — service-area renders two keyless county Google embeds. */
  mapEmbedSrc: string;
  priceRange: string;     // e.g. "$$"  → schema
  ratingValue: string;    // e.g. "4.9" → AggregateRating
  reviewCount: string;    // e.g. "127" → AggregateRating
}
export const tel = (phone: string = SITE.phone): string => `tel:${phone}`;
```

`trade` and `region` are interpolated into many titles/descriptions/headings — set them
carefully; they carry the SEO.

### 5.2 `src/config/services.ts` — what the business does

```ts
export interface Faq { q: string; a: string; }

export interface ServiceSection { h: string; body: string; }

export interface Service {
  slug: string;
  name: string;        // Full service name, e.g. "Garage Door Spring Repair"
  short: string;       // Short label for nav, cards, breadcrumbs
  blurb: string;       // One-line summary
  description: string; // Intro paragraph (hub + city combo pages)
  sections: ServiceSection[]; // Deeper authority sections, rendered on the hub page
  points: string[];    // What's included / bullet points
  faqs: Faq[];         // Service-level FAQs (rendered + FAQ schema on the hub)
  image: ImageMetadata;
  imageAlt: string;
  hubOnly?: boolean;   // do not generate per-city combo pages
  emergency?: boolean; // flagged as emergency/urgent (affects copy)
}

export const getService = (slug) => SERVICES.find((s) => s.slug === slug);
export const MATRIX_SERVICES = SERVICES.filter((s) => !s.hubOnly);
```

- **`hubOnly`**: a broad "catch-all" service (in the example, `garage-door-repair`) that gets its
  own hub but **no** per-city pages, because the city hub already serves that intent. Keep ~1.
- **`emergency`**: light copy flag for urgent services.
- `image` is a static `import` of an `ImageMetadata` asset at the top of the file.
- Content guidance: `description` ~1 paragraph; 2–3 `sections`; 4–5 `points`; 2–4 `faqs`.

Example instance: **7 services** — `garage-door-repair` (hubOnly), `spring-repair`,
`opener-repair`, `cable-repair`, `off-track-repair`, `new-door-installation`,
`emergency-repair` (emergency). → 6 matrix services.

### 5.3 `src/config/cities.ts` — where the business operates

```ts
export interface CityIssue { title: string; body: string; }

export interface City {
  slug: string;
  name: string;
  state?: string;
  /** Localized intro, ~150–250 words for priority cities. */
  intro: string;
  neighborhoods: string[];
  landmarks: string[];
  issues: CityIssue[];
  /** 3 nearby city slugs (must exist in this list). */
  nearby: string[];
  faqs: Faq[];                 // Faq reused from services.ts
  /** Optional per-city hero background; falls back to the site default. */
  heroImage?: ImageMetadata;
  /** Optional per-city service-photo overrides, keyed by service slug. */
  serviceImages?: Partial<Record<string, ImageMetadata>>;
}

export const getCity = (slug) => CITIES.find((c) => c.slug === slug);
export const nearbyCities = (city) => city.nearby.map(getCity).filter(Boolean);
```

- **Localization is the moat.** Each city's `intro`, `neighborhoods`, `landmarks`, `issues`, and
  `faqs` should be genuinely specific to that place — not a name-swapped template. This is what
  makes 14 city pages rank instead of read as doorway spam.
- `nearby` must reference **existing slugs** in `CITIES` (used for internal-linking cards).
- Array order = display order.

Example instance: **14 cities** (Berkeley, Oakland, Alameda, Orinda, Lafayette, Moraga,
Walnut Creek, Concord, Pleasanton, Livermore, Dublin, Richmond, Castro Valley, Union City).

### 5.4 `src/lib/` helpers (reuse — don't reinvent)

- `urls.ts`: `serviceUrl(s)→/{slug}/`, `cityServiceUrl(s,c)→/{s}/{c}/`,
  `cityUrl(c)→/service-area/{c}/`. All accept a `{slug}` object **or** a raw slug string.
- `schema.ts`: `localBusiness(siteUrl)`, `breadcrumb(items)`, `faqPage(faqs)`,
  `serviceSchema({name,description,areaName})` — return plain JSON-LD objects.
- `images.ts`: `getHeroUrl(img?)` → optimized WebP (width 1280, quality 58) URL for CSS
  `background-image` (hero is under a navy overlay + is the LCP, so small/low-q is fine).
  `<Image>` from `astro:assets` is used for in-flow images (service photos).

---

## 6. Routing & page types

All routing is fixed; you never edit it for a new site. Files in `src/pages/`:

| File | Route | Count (example) | Generated from |
|---|---|---|---|
| `index.astro` | `/` | 1 | — |
| `[service]/index.astro` | `/{service}/` | S = 7 | `SERVICES` |
| `[service]/[city].astro` | `/{service}/{city}/` | M×C = 6×14 = 84 | `MATRIX_SERVICES` × `CITIES` |
| `service-area/[city].astro` | `/service-area/{city}/` | C = 14 | `CITIES` |
| `privacy.astro`, `terms.astro` | `/privacy/`, `/terms/` | 2 | — (noindex) |
| `robots.txt.ts` | `/robots.txt` | 1 | API route |
| (sitemap) | `/sitemap-index.xml` | 1 | `@astrojs/sitemap` |

### Page-count is a FORMULA, not a fixed number

```
total ≈ 1 (home)
      + S        (service hubs)            S = SERVICES.length
      + (M × C)  (service × city combos)   M = MATRIX_SERVICES.length (non-hubOnly)
      + C        (city hubs)               C = CITIES.length
      + ~4       (privacy, terms, robots.txt, sitemap)
```

- **Example (garage):** S=7, M=6, C=14 → 1 + 7 + 84 + 14 + 3 = **108** pages.
- **Small site:** a trade with S=2 (M=2) and C=4 → 1 + 2 + 8 + 4 + 3 = **18** pages.

Scale up by adding cities/services to the arrays; nothing else changes. (Watch combo count:
M×C grows fast — 8 services × 30 cities = 240 combos.)

The three `getStaticPaths` patterns:

```ts
// [service]/index.astro
export function getStaticPaths() {
  return SERVICES.map((s) => ({ params: { service: s.slug }, props: { service: s } }));
}
// [service]/[city].astro
export function getStaticPaths() {
  const paths = [];
  for (const service of MATRIX_SERVICES)
    for (const city of CITIES)
      paths.push({ params: { service: service.slug, city: city.slug }, props: { service, city } });
  return paths;
}
// service-area/[city].astro
export function getStaticPaths() {
  return CITIES.map((c) => ({ params: { city: c.slug }, props: { city: c } }));
}
```

What each page type renders + its SEO (titles/descriptions are built from `SITE.trade`,
`region`, service/city names):

- **Home** — hero, services grid, service-area section (`ServiceAreaMap`), reviews, final CTA,
  quote form. Schema: `LocalBusiness`.
- **Service hub** `/{service}/` — hero, description, authority `sections`, `points` checklist,
  FAQs, quote form. Schema: `LocalBusiness` + `breadcrumb` + `serviceSchema` + `faqPage`.
- **Service × city** `/{service}/{city}/` — service intro + city intro, neighborhoods, common
  issues, FAQs (city + service), quote form; uses `city.serviceImages?.[service.slug] ??
  service.image`. Schema: `LocalBusiness` + 3-level `breadcrumb` + `serviceSchema` (localized) +
  `faqPage`.
- **City hub** `/service-area/{city}/` — city intro, neighborhoods, landmarks, common issues,
  service cards (all matrix services), nearby-city links (`nearbyCities`), FAQs, quote form.
  Schema: `LocalBusiness` + 2-level `breadcrumb` + `faqPage`.
- **Legal** — `noindex` via BaseLayout prop; excluded from sitemap.

---

## 7. SEO system

- **`BaseLayout.astro`** owns `<head>`: `<title>`, meta description, **canonical** (computed from
  `Astro.url.pathname` + `Astro.site`), `og:title/description/type/url`, `theme-color #0f2741`,
  favicons, optional hero `<link rel="preload" as="image" fetchpriority="high">` (LCP), and
  JSON-LD injection.
- **JSON-LD:** `localBusiness(siteBase)` is injected on **every** page; pages pass extra schema
  via the `jsonLd` prop (object or array). `localBusiness` includes `areaServed` = all cities and
  `aggregateRating` from `SITE`.
- **Sitemap:** auto-generated; `filter` drops `/privacy` and `/terms`.
- **robots.txt:** `src/pages/robots.txt.ts` emits `User-agent: * / Allow: /` + absolute
  `Sitemap:` URL from `site`.
- **Internal linking** (key for ranking): home → services + cities; service hub → its city
  combos; city hub → all matrix services in that city + nearby cities; footer → all services +
  first 8 cities. Dense, slug-driven, automatic.
- **Per-page titles/descriptions** are unique and interpolate `trade`/`region`/names — keep them
  unique when you add services/cities.

---

## 8. Components reference

All in `src/components/`. Props shown where they matter. Reused across page types; you rarely
edit these for a new site (copy lives in config).

| Component | Purpose | Props |
|---|---|---|
| `QuoteForm.astro` | Lead-capture form (primary conversion) | `source?`, `heading?`, `sub?` |
| `Header.astro` | Sticky top bar + nav + mobile burger; phone CTA | — (reads `SITE`) |
| `Footer.astro` | Service links, first 8 city links, legal, phone | — (reads config) |
| `ServiceCards.astro` | Grid of service cards | `city?`, `title?`, `sub?` |
| `CityLinks.astro` | Full city list (links to city or combo pages) | `service?`, `exclude?`, `title?`, `sub?` |
| `NearbyCities.astro` | Nearby-city cards (internal linking) | `cities`, `service?`, `cityName` |
| `FaqSection.astro` | Accordion FAQs via native `<details>` | `faqs`, `title?` |
| `Neighborhoods.astro` | Neighborhood chips | `cityName`, `neighborhoods` |
| `CommonIssues.astro` | Local issue cards | `cityName`, `issues` |
| `Reviews.astro` | Testimonials (internal array) | — |
| `FinalCta.astro` | Bottom call/quote CTA band | `heading?`, `sub?` |
| `ServiceAreaMap.astro` | Two keyless county Google Maps embeds + city list | — (internal `COUNTIES`) |

**QuoteForm submission flow** (`src/components/QuoteForm.astro`):
- Renders hidden fields: `access_key` (only if `SITE.formAccessKey` set → Web3Forms),
  `source`, `subject`; honeypot `company_website` (`.hp`, hidden, `aria-hidden`).
- Visible fields: `name*` (required), `phone`, `email*` (required), `message`.
- Client JS: blocks honeypot, validates name + email regex, then `fetch(endpoint, {POST, body:
  FormData})` where `endpoint = SITE.formEndpoint`. Disables button while submitting; shows
  status via `#form-status` (`role=status aria-live=polite`).
- **Form backends (pick one via `site.ts`):**
  - **Web3Forms:** `formEndpoint = "https://api.web3forms.com/submit"` + `formAccessKey = "<key>"`.
  - **Formspree:** `formEndpoint = "https://formspree.io/f/xxxx"`, leave `formAccessKey = ""`.
  - **Custom:** any endpoint accepting `multipart/form-data` POST and returning `2xx`.
  - **Call-only:** `formEndpoint = ""` → submit shows "call us instead" (no backend needed).

---

## 9. Styling system

Single global stylesheet `src/styles/global.css` (inlined at build). Design tokens:

```css
:root {
  --ink: #1f2937;        /* body text */
  --ink-soft: #6b7280;   /* muted text */
  --navy: #0f2741;       /* brand / headings / dark CTAs */
  --green: #16a34a;      /* primary action accent */
  --green-dark: #15803d; /* hover / links on light */
  --line: #e5e7eb;       /* borders */
  --bg-soft: #f7f8fa;    /* alt section background */
  --radius: 12px;
  --shadow: 0 16px 40px -16px rgba(15, 39, 65, 0.3);
  --container: 1140px;
}
```

Typography: `'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif`; body
`line-height: 1.65`; headings `1.15`, colored `--navy`.

Buttons:

```css
.btn { display:inline-flex; align-items:center; gap:8px; border:none; border-radius:8px;
       padding:12px 20px; font-weight:700; text-decoration:none; cursor:pointer; }
.btn-lg { padding:15px 26px; font-size:1.05rem; }
.btn-sm { padding:9px 16px; font-size:.9rem; }
.btn-block { width:100%; }
.btn-call, .btn-primary { background:var(--green); color:#fff; }     /* hover → --green-dark */
.btn-dark { background:var(--navy); color:#fff; }                    /* hover → #0a1c30 */
.btn:disabled { opacity:.6; cursor:not-allowed; }
```

Layout/section classes: `.container` (max 1140px, 24px gutters), `.section` (76px y),
`.section-sm` (56px y), `.section-soft` (soft bg + hairline borders), `.card` (white + shadow +
28px pad), `.hero`/`.hero-single` (bg image + navy gradient overlay), `.prose` (≤760px reading
column), `.crumbs`, `.chips`, `.checklist`, `.trust-row`. Grids: `.svc-grid` (services),
`.issue-grid` (3-col), `.cities` (4-col city links), `.testimonials` (3-col), `.srow`
(alternating service rows with `.reverse`).

**Breakpoints:** `920px` (nav → burger, 2-col → 1-col), `600px` (hero/typography shrink),
`480px` (tightest mobile). **Light-only — no dark mode** (see §2).

**Images:** heroes via `getHeroUrl()` (CSS background, optimized WebP); in-flow images via
`<Image>` from `astro:assets` (auto WebP + responsive `widths`/`sizes`). Per-city service-photo
overrides via `city.serviceImages`. Source assets live in `src/assets/{hero,services,real_photos}`
and are re-optimized at build, so large source files are fine.

---

## 10. Deployment

- **Host:** Cloudflare, pure static (`dist/`). `wrangler.jsonc` sets `name` and
  `assets.directory = "./dist"`; no worker script.
- **Two paths:**
  - **Workers Static Assets:** `npm run deploy` (= `astro build && npx wrangler deploy`).
  - **Cloudflare Pages:** connect git; build command `npm run build`, output dir `dist`.
- **Caching:** `public/_headers` — `/_astro/*` immutable 1y (content-hashed), `*.webp` 7d.
- **Domain:** set `SITE_URL` (and/or `astro.config.mjs` `site`) to the real domain — it drives
  canonicals, OG URLs, sitemap, and `robots.txt`.
- **Build with Node 22** (`.nvmrc`). `npm run build` → static output, then deploy.

---

## 11. New-site playbook (trade-agnostic)

Goal: launch a site for **any** trade/region by editing config + assets. Do these in order.

**Step 0 — name the project.** Pick `company`, `trade` (lowercase prose, e.g. `"well repair"`,
`"pest control"`), `region`, domain, phone.

**Step 1 — rename the shell.**
- `package.json` → `name`, `description`.
- `wrangler.jsonc` → `name` (Cloudflare project).
- `astro.config.mjs` → `site` (or set `SITE_URL` at deploy).

**Step 2 — `src/config/site.ts`.** Fill `SITE`: `company`, `tagline`, `trade`, `phone` (E.164) +
`phoneDisplay`, `email`, `region`, `url`, ratings (`priceRange`/`ratingValue`/`reviewCount`), and
the form fields (`formEndpoint` + `formAccessKey`, or leave `formEndpoint=""` for call-only).

**Step 3 — `src/config/services.ts`.** Replace `SERVICES` for the new trade. For each service:
`slug`, `name`, `short`, `blurb`, `description`, 2–3 `sections`, 4–5 `points`, 2–4 `faqs`,
`image` (+ `imageAlt`). Mark ~1 broad catch-all service `hubOnly: true`; flag urgent ones
`emergency: true`. Import service photos at the top from `src/assets/services/` (or
`real_photos/`).

**Step 4 — `src/config/cities.ts`.** Replace `CITIES` for the new region. For each city:
`slug`, `name`, `state?`, a genuinely local `intro` (~150–250 words), `neighborhoods`,
`landmarks`, 3 `issues`, 4–5 `faqs`, and `nearby` (3 **existing** slugs). Keep content specific
to each place. Optional `heroImage` / `serviceImages` overrides.

**Step 5 — assets & local touches.**
- Swap `src/assets/hero/*`, service images, and `real_photos/*` for the new trade.
- Replace favicons in `public/`.
- `ServiceAreaMap.astro`: update the internal `COUNTIES` array (names + Google query strings) to
  the new region — or swap it for the simpler approach if the area isn't two clean counties.
- Adjust `--green`/`--navy` only if the brand truly needs it (keep §2 vibe).

**Step 6 — verify & ship.** `nvm use 22 && npm install && npm run build` (expect a clean build;
page count = the §6 formula). Then `npm run deploy` (or push to Pages).

### Rebrand checklist (where trade/region/brand strings live)
- `SITE.company / trade / region / tagline / phone / email / url` (`site.ts`) — **drives most
  titles, descriptions, headings, schema.**
- `SERVICES` copy + slugs (`services.ts`); `CITIES` copy + slugs (`cities.ts`).
- `wrangler.jsonc` name, `package.json` name, `astro.config.mjs` site.
- Favicons + `public/` assets; hero/service/photo assets.
- `ServiceAreaMap.astro` `COUNTIES`.
- Spot-check `index.astro`, `privacy.astro`, `terms.astro` for any hard-coded copy.

### Gotchas / invariants
- `nearby` slugs **must** exist in `CITIES` (else dropped silently by `nearbyCities`).
- Keep ~1 `hubOnly` service; `hubOnly` services are excluded from `MATRIX_SERVICES` (no combos).
- Combo pages = M × C — keep an eye on the count when adding many of each.
- **Don't add dark mode**; **don't** redesign toward SaaS/startup aesthetics (§2).
- Don't hand-edit routing/layout/components to launch — edit config.
- Titles/descriptions should stay unique per page (they interpolate names; keep names distinct).

### Worked micro-examples (illustrative shapes, not full content)

**A. Pest Control — Kona, HI**
```ts
// site.ts
export const SITE = {
  company: 'Kona Pest Control', tagline: 'Island Pest Control & Removal',
  trade: 'pest control', phone: '+18085551234', phoneDisplay: '(808) 555-1234',
  email: 'hello@konapest.com', region: 'Big Island', url: 'https://konapest.com',
  formEndpoint: 'https://api.web3forms.com/submit', formAccessKey: 'xxxx-xxxx',
  mapEmbedSrc: '', priceRange: '$$', ratingValue: '4.8', reviewCount: '96',
};
// services.ts (one entry)
{ slug: 'pest-control', name: 'Pest Control', short: 'Pest Control', hubOnly: true,
  blurb: 'Recurring and one-time pest control for Big Island homes.',
  description: 'From coqui frogs to centipedes and ants…',
  sections: [{ h: 'What we treat', body: '…' }], points: ['Licensed & insured', '…'],
  faqs: [{ q: 'Do you offer same-week service?', a: '…' }], image: pestImg, imageAlt: '…' }
// + matrix services e.g. 'ant-control', 'termite-treatment', 'rodent-removal', 'coqui-frog-control'
// cities.ts (one entry)
{ slug: 'kailua-kona', name: 'Kailua-Kona', state: 'HI',
  intro: 'Kailua-Kona's humidity and lava-rock lots create…(~150–250 words)',
  neighborhoods: ['Keauhou', 'Holualoa', 'Kahaluu'], landmarks: ['Aliʻi Drive', '…'],
  issues: [{ title: 'Coqui frogs in catchment-watered yards', body: '…' }],
  nearby: ['captain-cook', 'waikoloa', 'holualoa'],
  faqs: [{ q: 'Can you treat for coqui frogs?', a: '…' }] }
```

**B. Well Repair — Midcoast Maine**
```ts
// site.ts (key fields)
{ company: 'Midcoast Well & Pump', trade: 'well repair', region: 'Midcoast Maine',
  phone: '+12075550199', phoneDisplay: '(207) 555-0199', priceRange: '$$',
  ratingValue: '4.9', reviewCount: '74', formEndpoint: 'https://formspree.io/f/abcd',
  formAccessKey: '' /* Formspree needs no key */ }
// services.ts: 'well-pump-repair' (hubOnly), 'pressure-tank-replacement',
//              'well-water-testing', 'pump-replacement', 'frozen-line-thaw' (emergency:true)
// cities.ts: { slug: 'rockland', name: 'Rockland', state: 'ME', intro: 'Rockland's coastal
//   wells and winter freeze-ups…', neighborhoods:['…'], issues:[{title:'Winter freeze-ups',…}],
//   nearby:['camden','thomaston','owls-head'], faqs:[…] }
```

---

## 12. Conventions & invariants (quick reference)

- **Slug-keyed everything.** Slugs are the join keys for URLs, lookups, `nearby`, and
  `serviceImages`. Keep them kebab-case and stable.
- **Config-only edits for new sites.** Components/layouts/lib are trade-agnostic; leave them.
- **Reuse the helpers**: `urls.ts`, `schema.ts`, `images.ts`, `getCity/getService/nearbyCities/
  MATRIX_SERVICES` — don't duplicate their logic.
- **Static + free**: no API keys required to run (maps use keyless embeds; form is optional).
- **Performance defaults to keep**: inline CSS, self-hosted font, hero preload + low-q WebP,
  lazy in-flow images, immutable asset caching.
- **Accessibility defaults to keep**: labeled inputs, honeypot (not a CAPTCHA wall), `aria-live`
  status, `<details>` FAQs, real link text, visible focus.
- **Aesthetic guardrail**: §2 is a requirement, not a suggestion. Plain tradesman > modern.
```
