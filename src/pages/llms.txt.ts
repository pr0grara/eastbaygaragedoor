import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { SERVICES } from '../config/services';
import { CITIES } from '../config/cities';
import { cityUrl, serviceUrl } from '../lib/urls';

// /llms.txt: a plain map of the site for AI assistants (llmstxt.org convention). Built only from
// config, so it never says more than the pages do. A 555 placeholder number stays off it: this
// file is made to be quoted.
export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site ?? SITE.url).href;
  const trade = SITE.trade.charAt(0).toUpperCase() + SITE.trade.slice(1);
  const realPhone = !/\b555-\d{4}\b/.test(SITE.phoneDisplay);
  const lines = [
    `# ${SITE.company}`,
    '',
    `> ${trade} in ${SITE.region}.`,
    '',
    '## Services',
    '',
    ...SERVICES.map((s) => `- [${s.name}](${abs(serviceUrl(s))}): ${s.blurb}`),
    '',
    '## Towns served',
    '',
    ...CITIES.map((c) => `- [${c.name}${c.state ? `, ${c.state}` : ''}](${abs(cityUrl(c))})`),
    '',
    ...(realPhone ? ['## Contact', '', `- Phone: ${SITE.phoneDisplay}`, ''] : []),
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
