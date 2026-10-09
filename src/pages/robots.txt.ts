import type { APIRoute } from 'astro';

// Generated at build time → /robots.txt, with an absolute Sitemap URL from `site`.
// Every page is public and written to be quoted, so search engines AND the AI answer engines
// (ChatGPT search, Claude, Perplexity, Gemini, Copilot, Apple) are named and allowed outright.
// A named group replaces `*` for that bot, so a future Disallow must go in BOTH groups.
const AI_AND_SEARCH = [
  'Googlebot', 'Google-Extended', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot',
  'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Perplexity-User',
  'Applebot', 'Applebot-Extended', 'Amazonbot', 'DuckAssistBot', 'meta-externalagent',
  'MistralAI-User', 'CCBot',
];

export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? new URL('sitemap-index.xml', site).href : '/sitemap-index.xml';
  const body = [
    'User-agent: *', 'Allow: /', '',
    ...AI_AND_SEARCH.map((ua) => `User-agent: ${ua}`), 'Allow: /', '',
    `Sitemap: ${sitemap}`, '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
