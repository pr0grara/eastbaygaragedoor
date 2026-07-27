// ---------------------------------------------------------------------------
// Site-wide business config. Edit these to rebrand the template.
// ---------------------------------------------------------------------------
export interface SiteConfig {
  company: string;
  tagline: string;
  /** What the business does, lowercase, for prose: "garage door repair" */
  trade: string;
  phone: string; // dialable, E.164
  phoneDisplay: string; // shown to visitors
  email: string;
  /** Service-area region name shown in headlines, e.g. "Bay Area" */
  region: string;
  /** Production URL — keep in sync with `site` in astro.config.mjs (or set SITE_URL). */
  url: string;
  /** Social-share card for og:image / twitter:image. 1200×630 file in public/, e.g. "/og-image.jpg". */
  ogImage: string;
  /**
   * External form handler (e.g. Formspree "https://formspree.io/f/xxxx" or
   * Web3Forms "https://api.web3forms.com/submit"). Leave "" to render the form
   * in call-only mode (submit is disabled with a notice). No backend required.
   */
  formEndpoint: string;
  /** Web3Forms access key, if using Web3Forms (otherwise leave ""). */
  formAccessKey: string;
  /**
   * Unused by default — the service-area section renders two keyless county
   * Google Maps embeds (see ServiceAreaMap.astro). Kept for sites that want a
   * single custom map instead: paste a Google Maps "Embed a map" src here.
   */
  mapEmbedSrc: string;
  priceRange: string;
  ratingValue: string;
  reviewCount: string;
}

export const SITE: SiteConfig = {
  company: 'Garage Door Repairs',
  tagline: 'Garage Door Repair & Installation',
  trade: 'garage door repair',
  phone: '+15106942210',
  phoneDisplay: '(510) 694-2210',
  email: 'hello@eastbaygaragedoorrepair.com',
  region: 'East Bay',
  url: 'https://eastbaygaragedoorrepair.com',
  ogImage: '/og-image.jpg',
  formEndpoint: 'https://api.web3forms.com/submit',
  formAccessKey: 'e3cc242b-9bf1-4322-af8a-6f64a8e780ac',
  mapEmbedSrc: '',
  priceRange: '$$',
  ratingValue: '4.9',
  reviewCount: '127',
};

export const tel = (phone: string = SITE.phone): string => `tel:${phone}`;
