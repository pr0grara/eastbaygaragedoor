// Ping IndexNow (Bing, Yandex, Seznam, Naver) with every URL in the live sitemap. Bing's index
// feeds ChatGPT search and Copilot, so this is the fast lane into AI answers after a deploy.
// The key is the public/<32-hex>.txt file; IndexNow fetches it to prove we own the host.
// Usage: npm run indexnow   (after npm run deploy)
import fs from 'node:fs';

const cfg = fs.readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
const host = new URL(cfg.match(/site:[^'"]*['"](https?:\/\/[^'"]+)['"]/)[1]).host;
const key = fs.readdirSync(new URL('../public/', import.meta.url)).find((f) => /^[0-9a-f]{32}\.txt$/.test(f)).slice(0, 32);
const index = await (await fetch(`https://${host}/sitemap-index.xml`)).text();
const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const urlList = [];
for (const m of maps) urlList.push(...[...(await (await fetch(m)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]));
const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList }),
});
console.log(`IndexNow ${host}: ${urlList.length} URLs, HTTP ${r.status} ${await r.text()}`);
