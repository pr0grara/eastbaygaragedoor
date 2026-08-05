import { SITE } from '../config/site';
import { CITIES } from '../config/cities';

// Site-wide LocalBusiness schema (injected on every page by BaseLayout).
export function localBusiness(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE.company,
    description: `${SITE.tagline} serving the ${SITE.region}.`,
    telephone: SITE.phone,
    email: SITE.email,
    url: siteUrl,
    image: SITE.ogImage ? `${siteUrl.replace(/\/$/, '')}${SITE.ogImage}` : undefined,
    logo: `${siteUrl.replace(/\/$/, '')}/favicon.svg`,
    priceRange: SITE.priceRange,
    areaServed: CITIES.map((c) => ({ '@type': 'City', name: c.name })),
  };
}

export function breadcrumb(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqPage(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function serviceSchema(opts: { name: string; description: string; areaName: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: opts.name,
    provider: { '@type': 'LocalBusiness', name: SITE.company, telephone: SITE.phone },
    areaServed: opts.areaName,
    description: opts.description,
  };
}
