import { SITE_URL } from "~/data/site"

// Resource route — see sitemap[.]xml.tsx for why there's no default export.
export function loader() {
  const body = `User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: bingbot
Allow: /

User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`

  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  })
}
